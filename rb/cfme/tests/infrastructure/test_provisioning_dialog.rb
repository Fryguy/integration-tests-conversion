# This module tests various ways how to set up the provisioning using the provisioning dialog.
require_relative 'datetime'
include Datetime
require_relative 'datetime'
include Datetime
require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
alias CbTree CheckableBootstrapTreeview
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/common'
include Cfme::Common
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
not_scvmm = ProviderFilter(classes: [SCVMMProvider], inverted: true)
all_infra = ProviderFilter(classes: [InfraProvider], required_fields: [["provisioning", "template"], ["provisioning", "host"], ["provisioning", "datastore"]])
pytestmark = [pytest.mark.meta(server_roles: "+automate"), pytest.mark.usefixtures("uses_infra_providers"), pytest.mark.long_running, test_requirements.provision, pytest.mark.tier(3), pytest.mark.provider(gen_func: providers, scope: "module")]
def prov_source(provider)
  if is_bool(provider.one_of(CloudProvider))
    return provider.data["provisioning"]["image"]["name"]
  else
    return provider.data["provisioning"]["template"]
  end
end
def vm_name()
  vm_name = random_vm_name("provd")
  return vm_name
end
def prov_data(provisioning, provider)
  data = provisioning.dup
  mgmt_system = provider.mgmt
  if is_bool(provider.one_of(InfraProvider))
    data["network"] = {"vlan" => partial_match(provisioning.get("vlan"))}
    data["environment"] = {"datastore_name" => {"name" => provisioning["datastore"]}, "host_name" => {"name" => provisioning["host"]}}
  else
    if is_bool(provider.one_of(AzureProvider))
      data["environment"] = {"public_ip_address" => "New"}
    else
      if is_bool(provider.one_of(OpenStackProvider))
        ip_pool = provider.data["public_network"]
        floating_ip = mgmt_system.get_first_floating_ip(pool: ip_pool)
        provider.refresh_provider_relationships()
        data["environment"] = {"public_ip_address" => floating_ip}
        props = data.setdefault("properties", {})
        props["instance_type"] = partial_match(provisioning["ci-flavor-name"])
      end
    end
  end
  if is_bool(provider.one_of(RHEVMProvider))
    data["catalog"]["provision_type"] = "Native Clone"
  else
    if is_bool(provider.one_of(VMwareProvider))
      data["catalog"]["provision_type"] = "VMware"
    end
  end
  return data
end
def provisioner(appliance, request, setup_provider, provider, vm_name)
  _provisioner = lambda do |template, provisioning_data, delayed: nil|
    collection = appliance.provider_based_collection(provider)
    provisioning_data["template_name"] = template
    provisioning_data["provider_name"] = provider.name
    vm = collection.create(method(:vm_name), provider, form_values: provisioning_data)
    base_view = vm.appliance.browser.create_view(BaseLoggedInPage)
    base_view.flash.assert_no_error()
    request.addfinalizer(lambda{|| vm.cleanup_on_provider()})
    request_description = "Provision from [#{template}] to [#{vm_name}]"
    provision_request = appliance.collections.requests.instantiate(description: request_description)
    check_all_tabs(provision_request, provider)
    if !delayed.equal?(nil)
      total_seconds = (delayed - Datetime::utcnow()).total_seconds()
      begin
        wait_for(provision_request.is_finished, fail_func: provision_request.update, num_sec: total_seconds, delay: 5)
        pytest.fail("The provisioning was not postponed")
      rescue TimedOutError
        # pass
      end
    end
    logger.info("Waiting for vm %s to appear on provider %s", method(:vm_name), provider.key)
    wait_for(provider.mgmt.does_vm_exist, [vm_name], fail_func: provider.refresh_provider_relationships, handle_exception: true, num_sec: 600)
    logger.info("Waiting for cfme provision request for vm %s", method(:vm_name))
    provision_request.wait_for_request()
    msg = "Provisioning failed with the message #{provision_request.rest.message}"
    raise msg unless provision_request.is_succeeded()
    return vm
  end
  return _provisioner
end
def check_all_tabs(provision_request, provider)
  view = navigate_to(provision_request, "Details")
  for name in provider.provisioning_dialog_widget_names
    widget = view.getattr(name)
    widget.click()
    if is_bool(BZ(1797706).blocks && provider.one_of(RHEVMProvider))
      pytest.skip("Skipping as this fails due to BZ 1797706")
    end
    raise unless widget.is_displayed
  end
end
def test_change_cpu_ram(provisioner, soft_assert, provider, prov_data, vm_name)
  #  Tests change RAM and CPU in provisioning dialog.
  # 
  #   Prerequisites:
  #       * A provider set up, supporting provisioning in CFME
  # 
  #   Steps:
  #       * Open the provisioning dialog.
  #       * Apart from the usual provisioning settings, set number of CPUs and amount of RAM.
  #       * Submit the provisioning request and wait for it to finish.
  #       * Visit the page of the provisioned VM. The summary should state correct values for CPU&RAM.
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/6h
  #   
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["hardware"]["num_sockets"] = "4"
  prov_data["hardware"]["cores_per_socket"] = is_bool(!provider.one_of(SCVMMProvider)) ? "1" : nil
  prov_data["hardware"]["memory"] = "2048"
  vm = provisioner.(prov_source(provider), prov_data)
  view = navigate_to(vm, "Details")
  data = view.entities.summary("Properties").get_text_of("Container").strip()
  regexes = ["^[^(]*(\\d+) CPUs?.*, ([^)]+)[^)]*$", "^[^(]*\\((\\d+) CPUs?, ([^)]+)\\)[^)]*$", "^.*?(\\d+) CPUs? .*?(\\d+ MB)$"].map{|_| re.compile(_)}.to_a
  __dummy0__ = false
  for regex in regexes
    match = regex.match(data)
    if !match.equal?(nil)
      num_cpus,memory = match.groups()
      break
    end
    if regex == regexes[-1]
      __dummy0__ = true
    end
  end
  if __dummy0__
    raise TypeError, "Could not parse string {}".format(repr(data))
  end
  soft_assert.(num_cpus == "4", "num_cpus should be {}, is {}".format("4", num_cpus))
  soft_assert.(memory == "2048 MB", "memory should be {}, is {}".format("2048 MB", memory))
end
def test_disk_format_select(provisioner, disk_format, provider, prov_data, vm_name)
  #  Tests disk format selection in provisioning dialog.
  # 
  #   Prerequisites:
  #       * A provider set up, supporting provisioning in CFME
  # 
  #   Steps:
  #       * Open the provisioning dialog.
  #       * Apart from the usual provisioning settings, set the disk format to be thick or thin.
  #       * Submit the provisioning request and wait for it to finish.
  #       * Visit the page of the provisioned VM.
  #       * The ``Thin Provisioning Used`` field should state true of false according to the selection
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Provisioning
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #   
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["hardware"]["disk_format"] = disk_format
  vm = provisioner.(prov_source(provider), prov_data)
  view = navigate_to(vm, "Details")
  thin = view.entities.summary("Datastore Allocation Summary").get_text_of("Thin Provisioning Used").strip().downcase()
  vm.load_details(refresh: true)
  if disk_format == "Thin"
    raise "The disk format should be Thin" unless thin == "true"
  else
    raise "The disk format should not be Thin" unless thin != "true"
  end
end
def test_power_on_or_off_after_provision(provisioner, prov_data, provider, started, vm_name)
  #  Tests setting the desired power state after provisioning.
  # 
  #   Prerequisites:
  #       * A provider set up, supporting provisioning in CFME
  # 
  #   Steps:
  #       * Open the provisioning dialog.
  #       * Apart from the usual provisioning settings, set whether you want or not the VM to be
  #           powered on after provisioning.
  #       * Submit the provisioning request and wait for it to finish.
  #       * The VM should become steady in the desired VM power state.
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/4h
  #   
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["schedule"]["power_on"] = started
  vm = provisioner.(prov_source(provider), prov_data)
  wait_for(lambda{|| vm.exists_on_provider && is_bool(started) ? vm.mgmt.is_running : vm.mgmt.is_stopped}, num_sec: 240, delay: 5)
end
def test_tag(provisioner, prov_data, provider, vm_name)
  #  Tests tagging VMs using provisioning dialogs.
  # 
  #   Prerequisites:
  #       * A provider set up, supporting provisioning in CFME
  # 
  #   Steps:
  #       * Open the provisioning dialog.
  #       * Apart from the usual provisioning settings, pick a tag.
  #       * Submit the provisioning request and wait for it to finish.
  #       * Visit th page of VM, it should display the selected tags
  # 
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/8h
  #   
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["purpose"]["apply_tags"] = CbTree.CheckNode(path: ["Service Level *", "Gold"])
  vm = provisioner.(prov_source(provider), prov_data)
  tags = vm.get_tags()
  raise "Service Level: Gold not in tags (#{tags})" unless tags.map{|tag| tag.category.display_name == "Service Level" && tag.display_name == "Gold"}.is_any?
end
def test_provisioning_schedule(provisioner, provider, prov_data, vm_name)
  #  Tests provision scheduling.
  # 
  #   Prerequisites:
  #       * A provider set up, supporting provisioning in CFME
  # 
  #   Steps:
  #       * Open the provisioning dialog.
  #       * Apart from the usual provisioning settings, set a scheduled provision and pick a time.
  #       * Submit the provisioning request, it should not start before the scheduled time.
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/4h
  #   
  now = Datetime::utcnow()
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["schedule"]["schedule_type"] = "Schedule"
  prov_data["schedule"]["provision_date"] = now.strftime("%m/%d/%Y")
  STEP = 5
  minutes_diff = STEP - (now.minute % STEP)
  if minutes_diff <= 3
    minutes_diff += 5
  end
  provision_time = timedelta(minutes: minutes_diff) + now
  prov_data["schedule"]["provision_start_hour"] = provision_time.hour.to_s
  prov_data["schedule"]["provision_start_min"] = provision_time.minute.to_s
  provisioner.(prov_source(provider), prov_data, delayed: provision_time)
end
def test_provisioning_vnic_profiles(provisioner, provider, prov_data, vm_name, vnic_profile)
  #  Tests provision VM with other than specific vnic profile selected - <No Profile>
  #       and <Use template nics>.
  # 
  #   Prerequisites:
  #       * A provider set up, supporting provisioning in CFME
  # 
  #   Steps:
  #       * Open the provisioning dialog.
  #       * Apart from the usual provisioning settings, set vlan
  #         to values <No Profile>/<Use template nics>
  #       * Submit the provisioning request, it should provision the vm successfully.
  #       * Check NIC configuration of provisioned VM
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/4h
  #   
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["network"] = {"vlan" => vnic_profile}
  vm = provisioner.(prov_source(provider), prov_data)
  wait_for(lambda{|| vm.exists_on_provider}, num_sec: 300, delay: 5)
  if vnic_profile == "<No Profile>"
    nics = vm.mgmt.get_nics()
    raise "The VM should have a NIC attached." unless nics
    profile = nics[0].vnic_profile
    raise "The vNIC profile should be empty." unless !profile
  end
end
def test_provision_vm_with_2_nics(provisioner, provisioning, prov_data, vm_name)
  #  Tests provision VM from a template configured with 2 NICs.
  # 
  #   Prerequisites:
  #       * A provider set up, supporting provisioning in CFME, template with 2 NICs
  # 
  #   Steps:
  #       * Open the provisioning dialog.
  #       * Apart from the usual provisioning settings, select template with 2 NICs.
  #       * Submit the provisioning request, it should provision the vm successfully.
  #       * Check NIC configuration of provisioned VM - it should have 2 NICs attached.
  # 
  #   Bugzilla:
  #       1625139
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Open the provisioning dialog.
  #           2. Apart from the usual provisioning settings, select template with 2 NICs.
  #           3. Submit the provisioning request, it should provision the vm successfully.
  #           4. Check NIC configuration of provisioned VM - it should have 2 NICs attached.
  #   
  template_name = provisioning.get("template_2_nics", nil)
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["network"]["vlan"] = "<Use template nics>"
  vm = provisioner.(template_name, prov_data)
  nics = vm.mgmt.get_nics()
  raise "The VM should have 2 NICs attached." unless nics.size == 2
end
def test_vmware_default_placement(provisioner, prov_data, provider, setup_provider, vm_name)
  #  Tests whether vm placed in Datacenter root after the provisioning.
  # 
  #   Prerequisites:
  #       * A provider set up, supporting provisioning in CFME
  # 
  #   Steps:
  #       * Open the provisioning dialog.
  #       * Apart from the usual provisioning settings, set \"Choose automatically\"
  #       * Submit the provisioning request and wait for it to finish.
  #       * The VM should be placed in the Datacenter root folder (that\'s two levels up in API).
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/4h
  #   
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["environment"] = {"automatic_placement" => true}
  vm = provisioner.(prov_source(provider), prov_data)
  wait_for(lambda{|| vm.exists_on_provider}, num_sec: 240, delay: 5, message: "VM #{vm_name} exists on provider.")
  raise "The new vm is not placed in the Datacenter root directory!" unless "Datacenter" == provider.mgmt.get_vm(vm_name).raw.parent.parent.name
end
def test_linked_clone_default(provisioner, provisioning, provider, prov_data, vm_name)
  #  Tests provision VM from a template with the selected \"Linked Clone\" option.
  #   The template must have preallocated disks (at least one) for this test.
  # 
  #   Required_fields is set to [[\'cap_and_util\', \'capandu_vm\']] because template for this VM has
  #   a preallocated disk for sure.
  # 
  #   Bugzilla:
  #       1726590
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: anikifor
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/4h
  #   
  template_name = provider.data["provisioning"]["template_false_sparse"]
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["catalog"]["linked_clone"] = true
  prov_data["environment"] = {"automatic_placement" => true}
  provisioner.(template_name, prov_data)
end
