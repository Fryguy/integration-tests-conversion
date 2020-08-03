require_relative 'textwrap'
include Textwrap
require_relative 'riggerlib'
include Riggerlib
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
alias Check_tree CheckableBootstrapTreeview
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils'
include Cfme::Utils
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
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.meta(server_roles: "+automate +notifier"), test_requirements.provision, pytest.mark.tier(2), pytest.mark.provider(gen_func: providers, filters: [ProviderFilter(classes: [CloudProvider, InfraProvider], required_flags: ["provision"])], scope: "function"), pytest.mark.usefixtures("setup_provider")]
def vm_name()
  return random_vm_name(context: "prov", max_length: 12)
end
def instance_args(request, provider, provisioning, vm_name)
  #  Fixture to prepare instance parameters for provisioning
  #   
  inst_args = {}
  if is_bool(!inst_args.get("template_name"))
    pytest.skip(reason: "template name not specified in the provisioning in config")
  end
  inst_args["request"] = {"notes" => "Testing provisioning from image {} to vm {} on provider {}".format(inst_args.get("template_name"), vm_name, provider.key)}
  auto = false
  begin
    parameter = request.param
    auto = parameter
  rescue NoMethodError
    # pass
  end
  if is_bool(auto)
    inst_args.update({"environment" => {"automatic_placement" => auto}})
  end
  yield [vm_name, inst_args]
end
def provisioned_instance(provider, instance_args, appliance)
  #  Checks provisioning status for instance 
  vm_name,inst_args = instance_args
  collection = appliance.provider_based_collection(provider)
  instance = collection.create(method(:vm_name), provider, form_values: inst_args)
  if is_bool(!instance)
    raise Exception, "instance returned by collection.create is 'None'"
  end
  yield instance
  logger.info("Instance cleanup, deleting %s", instance.name)
  begin
    instance.cleanup_on_provider()
  rescue Exception => ex
    logger.warning("Exception while deleting instance fixture, continuing: {}".format(ex.message))
  end
end
def test_provision_from_template(provider, provisioned_instance)
  #  Tests instance provision from template via CFME UI
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: critical
  #       casecomponent: Provisioning
  #       initialEstimate: 1/4h
  #   
  raise "Instance wasn't provisioned successfully" unless provisioned_instance.exists_on_provider
end
def test_gce_preemptible_provision(appliance, provider, instance_args, soft_assert)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/6h
  #   
  vm_name,inst_args = instance_args
  inst_args["properties"]["is_preemptible"] = true
  instance = appliance.collections.cloud_instances.create(method(:vm_name), provider, form_values: inst_args)
  view = navigate_to(instance, "Details")
  preemptible = view.entities.summary("Properties").get_text_of("Preemptible")
  soft_assert.(preemptible.include?("Yes"), "GCE Instance isn't Preemptible")
  soft_assert.(instance.exists_on_provider, "Instance wasn't provisioned successfully")
end
def _post_approval(smtp_test, provision_request, vm_type, requester, provider, approved_vm_names)
  approved_subject = normalize_text()
  approved_from = normalize_text()
  wait_for_messages_with_subjects(smtp_test, , num_sec: 90)
  smtp_test.clear_database()
  logger.info("Waiting for vms %s to appear on provider %s", approved_vm_names.join(", "), provider.key)
  wait_for(lambda{|| approved_vm_names.map{|_| provider.mgmt.does_vm_exist(_)}.is_all?}, handle_exception: true, num_sec: 600)
  provision_request.wait_for_request(method: "ui")
  msg = 
  raise msg unless provision_request.is_succeeded(method: "ui")
  completed_subjects = 
  wait_for_messages_with_subjects(smtp_test, completed_subjects, num_sec: 90)
end
def wait_for_messages_with_subjects(smtp_test, expected_subjects_substrings, num_sec)
  #  This waits for all the expected subjects to be present the list of received
  #   mails with partial match.
  #   
  expected_subjects_substrings = Set.new(expected_subjects_substrings)
  _check_subjects = lambda do
    subjects = 
    found_subjects_substrings = Set.new()
    for expected_substring in expected_subjects_substrings
      __dummy0__ = false
      for subject in subjects
        if subject.include?(expected_substring)
          found_subjects_substrings.add(expected_substring)
          break
        end
        if subject == subjects[-1]
          __dummy0__ = true
        end
      end
      if __dummy0__
        logger.info("No emails with subjects containing \"%s\" found.", expected_substring)
      end
    end
    if is_bool(expected_subjects_substrings - found_subjects_substrings)
      return false
    end
    logger.info("Found all expected emails.")
    return true
  end
  wait_for(method(:_check_subjects), num_sec: num_sec, delay: 3, message: "Some expected subjects not found in the received emails subjects.")
end
def test_provision_approval(appliance, provider, vm_name, smtp_test, request, action, soft_assert)
  #  Tests provisioning approval. Tests couple of things.
  # 
  #   * Approve manually
  #   * Approve by editing the request to conform
  # 
  #   Prerequisities:
  #       * A provider that can provision.
  #       * Automate role enabled
  #       * User with e-mail set so you can receive and view them
  # 
  #   Steps:
  #       * Create a provisioning request that does not get automatically approved (eg. ``num_vms``
  #           bigger than 1)
  #       * Wait for an e-mail to come, informing you that approval is pending
  #       * Depending on whether you want to do:
  #           * approve: manually approve the request in UI
  #           * edit: Edit the request in UI so it conforms the rules for auto-approval.
  #           * deny: Deny the request in UI.
  #       * Wait for an e-mail with approval
  #       * Wait until the request finishes
  #       * Wait until an email with provisioning complete
  # 
  #   Metadata:
  #       test_flag: provision
  #       suite: infra_provisioning
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/8h
  # 
  #   Bugzilla:
  #       1472844
  #       1676910
  #       1380197
  #       1818172
  #   
  vm_names = [vm_name + "001", vm_name + "002"]
  requester = "vm_provision@cfmeqe.com "
  if is_bool(provider.one_of(CloudProvider))
    requester = is_bool(BZ(1818172).blocks) ? "" : requester
    vm_type = "instance"
  else
    vm_type = "virtual machine"
  end
  collection = appliance.provider_based_collection(provider)
  inst_args = {"catalog" => {"vm_name" => vm_name, "num_vms" => "2"}}
  vm = collection.create(vm_name, provider, form_values: inst_args, wait: false)
  pending_subject = normalize_text()
  pending_from = normalize_text()
  wait_for_messages_with_subjects(smtp_test, , num_sec: 90)
  smtp_test.clear_database()
  cells = {"Description" => }
  _action_edit = lambda do
    new_vm_name = 
    modifications = {"catalog" => {"num_vms" => "1", "vm_name" => new_vm_name}, "Description" => }
    provision_request = appliance.collections.requests.instantiate(cells: cells)
    provision_request.edit_request(values: modifications)
    vm_names = [new_vm_name]
    request.addfinalizer(lambda{|| collection.instantiate(new_vm_name, provider).cleanup_on_provider()})
    _post_approval(smtp_test, provision_request, vm_type, requester, provider, vm_names)
  end
  _action_approve = lambda do
    provision_request = appliance.collections.requests.instantiate(cells: cells)
    provision_request.approve_request(method: "ui", reason: "Approved")
    for v_name in vm_names
      request.addfinalizer(lambda{|| appliance.collections.infra_vms.instantiate(v_name, provider).cleanup_on_provider()})
    end
    _post_approval(smtp_test, provision_request, vm_type, requester, provider, vm_names)
  end
  _action_deny = lambda do
    provision_request = appliance.collections.requests.instantiate(cells: cells)
    provision_request.deny_request(method: "ui", reason: "You stink!")
    denied_subject = normalize_text()
    denied_from = normalize_text()
    wait_for_messages_with_subjects(smtp_test, [denied_subject, denied_from], num_sec: 90)
  end
  action_callable = locals().get()
  if is_bool(!action_callable)
    raise NotImplementedError, 
  end
  action_callable.()
end
def test_provision_from_template_using_rest(appliance, request, provider, vm_name, auto)
  #  Tests provisioning from a template using the REST API.
  # 
  #   Metadata:
  #       test_flag: provision, rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Provisioning
  #       caseimportance: high
  #       initialEstimate: 1/30h
  #   
  if is_bool(auto)
    form_values = {"vm_fields" => {"placement_auto" => true}}
  else
    form_values = nil
  end
  collection = appliance.provider_based_collection(provider)
  instance = collection.create_rest(vm_name, provider, form_values: form_values)
  wait_for(lambda{|| instance.exists}, num_sec: 1000, delay: 5, message: )
  _cleanup = lambda do
    logger.info("Instance cleanup, deleting %s", instance.name)
    begin
      instance.cleanup_on_provider()
    rescue Exception => ex
      logger.warning("Exception while deleting instance fixture, continuing: {}".format(ex.message))
    end
  end
end
def original_request_class(appliance)
  return appliance.collections.domains.instantiate(name: "ManageIQ").namespaces.instantiate(name: "Cloud").namespaces.instantiate(name: "VM").namespaces.instantiate(name: "Provisioning").namespaces.instantiate(name: "StateMachines").classes.instantiate(name: "Methods")
end
def modified_request_class(request, domain, original_request_class)
  original_request_class.copy_to(domain)
  klass = domain.namespaces.instantiate(name: "Cloud").namespaces.instantiate(name: "VM").namespaces.instantiate(name: "Provisioning").namespaces.instantiate(name: "StateMachines").classes.instantiate(name: "Methods")
  request.addfinalizer(klass.delete_if_exists)
  return klass
end
def copy_domains(original_request_class, domain)
  methods = ["openstack_PreProvision", "openstack_CustomizeRequest"]
  for method in methods
    original_request_class.methods.instantiate(name: method).copy_to(domain)
  end
end
def test_cloud_provision_from_template_with_attached_disks(appliance, request, instance_args, provider, disks, soft_assert, domain, modified_request_class, copy_domains, provisioning)
  #  Tests provisioning from a template and attaching disks
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
  #   Bugzilla:
  #       1713632
  #   
  vm_name,inst_args = instance_args
  if is_bool(provider.one_of(AzureProvider))
    recursive_update(inst_args, {"environment" => {"availability_zone" => provisioning.("av_set")}})
  end
  device_name = "vd{}"
  device_mapping = []
  volumes = provider.mgmt.volume_configurations(1, n: disks)
  delete_volumes = lambda do
    for volume in volumes
      provider.mgmt.delete_volume(volume)
    end
  end
  for (i, volume) in enumerate(volumes, 0)
    device_mapping.push({"boot_index" => (i == 0) ? 0 : -1, "uuid" => volume, "device_name" => device_name.format(chr(ord("a") + i))})
    if i == 0
      provider.mgmt.capi.volumes.set_bootable(volume, true)
    end
  end
  method = modified_request_class.methods.instantiate(name: "openstack_PreProvision")
  view = navigate_to(method, "Details")
  former_method_script = view.script.get_value()
  disk_mapping = []
  for mapping in device_mapping
    one_field = dedent("{{
            :boot_index => {boot_index},
            :uuid => \"{uuid}\",
            :device_name => \"{device_name}\",
            :source_type => \"volume\",
            :destination_type => \"volume\",
            :volume_size => 1,
            :delete_on_termination => false
        }}")
    disk_mapping.push(one_field.format(None: mapping))
  end
  volume_method = dedent("
        clone_options = {{
        :image_ref => nil,
        :block_device_mapping_v2 => [
            {}
        ]
        }}

        prov = $evm.root[\"miq_provision\"]
        prov.set_option(:clone_options, clone_options)
    ")
  update(method) {
    method.script = volume_method.format(disk_mapping.join(",
"))
  }
  _finish_method = lambda do
    update(method) {
      method.script = former_method_script
    }
  end
  instance = appliance.collections.cloud_instances.create(method(:vm_name), provider, form_values: inst_args)
  delete_vm_and_wait_for_gone = lambda do
    instance.cleanup_on_provider()
    wait_for(lambda{|| !instance.exists_on_provider}, num_sec: 180, delay: 5)
  end
  for volume_id in volumes
    attachments = provider.mgmt.volume_attachments(volume_id)
    soft_assert(attachments.include?(vm_name), "The vm {} not found among the attachemnts of volume {}:".format(method(:vm_name), volume_id, attachments))
  end
  for device in device_mapping
    provider_devpath = provider.mgmt.volume_attachments(device["uuid"])[vm_name]
    expected_devpath = ("/dev/{}").format(device["device_name"])
    soft_assert(provider_devpath == expected_devpath, "Device {} is not attached to expected path: {} but to: {}".format(device["uuid"], expected_devpath, provider_devpath))
  end
end
def test_provision_with_boot_volume(request, instance_args, provider, soft_assert, modified_request_class, appliance, copy_domains)
  #  Tests provisioning from a template and attaching one booting volume.
  # 
  #   Metadata:
  #       test_flag: provision, volumes
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/4h
  #   
  vm_name,inst_args = instance_args
  image = inst_args.get("template_name")
  volume = provider.mgmt.create_volume(1, imageRef: provider.mgmt.get_template(image).uuid)
  request.addfinalizer(lambda{|| provider.mgmt.delete_volume(volume)})
  method = modified_request_class.methods.instantiate(name: "openstack_CustomizeRequest")
  view = navigate_to(method, "Details")
  former_method_script = view.script.get_value()
  update(method) {
    method.script = dedent("            $evm.root[\"miq_provision\"].set_option(
                :clone_options, {{
                    :image_ref => nil,
                    :block_device_mapping_v2 => [{{
                        :boot_index => 0,
                        :uuid => \"{}\",
                        :device_name => \"vda\",
                        :source_type => \"volume\",
                        :destination_type => \"volume\",
                        :volume_size => 1,
                        :delete_on_termination => false
                    }}]
                }}
            )
        ".format(volume))
  }
  _finish_method = lambda do
    update(method) {
      method.script = former_method_script
    }
  end
  instance = appliance.collections.cloud_instances.create(method(:vm_name), provider, form_values: inst_args)
  delete_vm_and_wait_for_gone = lambda do
    instance.cleanup_on_provider()
    wait_for(lambda{|| !instance.exists_on_provider}, num_sec: 180, delay: 5)
  end
  request_description = 
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  msg = "Provisioning failed with the message {}".format(provision_request.row.last_message.text)
  raise msg unless provision_request.is_succeeded(method: "ui")
  soft_assert(provider.mgmt.volume_attachments(volume).include?(instance.name))
  soft_assert(provider.mgmt.volume_attachments(volume)[instance.name] == "/dev/vda")
end
def test_provision_with_additional_volume(request, instance_args, provider, small_template, soft_assert, modified_request_class, appliance, copy_domains)
  #  Tests provisioning with setting specific image from AE and then also making it create and
  #   attach an additional 3G volume.
  # 
  #   Metadata:
  #       test_flag: provision, volumes
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/4h
  #   
  vm_name,inst_args = instance_args
  method = modified_request_class.methods.instantiate(name: "openstack_CustomizeRequest")
  begin
    image_id = provider.mgmt.get_template(small_template.name).uuid
  rescue KeyError
    pytest.skip("No small_template in provider data!")
  end
  view = navigate_to(method, "Details")
  former_method_script = view.script.get_value()
  update(method) {
    method.script = dedent("            $evm.root[\"miq_provision\"].set_option(
              :clone_options, {{
                :image_ref => nil,
                :block_device_mapping_v2 => [{{
                  :boot_index => 0,
                  :uuid => \"{}\",
                  :device_name => \"vda\",
                  :source_type => \"image\",
                  :destination_type => \"volume\",
                  :volume_size => 3,
                  :delete_on_termination => false
                }}]
              }}
        )
        ".format(image_id))
  }
  _finish_method = lambda do
    update(method) {
      method.script = former_method_script
    }
  end
  cleanup_and_wait_for_instance_gone = lambda do
    instance.mgmt.refresh()
    prov_instance_raw = instance.mgmt.raw
    instance_volumes = prov_instance_raw.getattr("os-extended-volumes:volumes_attached")
    instance.cleanup_on_provider()
    wait_for(lambda{|| !instance.exists_on_provider}, num_sec: 180, delay: 5)
    for volume in instance_volumes
      provider.mgmt.delete_volume(volume["id"])
    end
  end
  instance = appliance.collections.cloud_instances.create(method(:vm_name), provider, form_values: inst_args)
  request.addfinalizer(method(:cleanup_and_wait_for_instance_gone))
  request_description = 
  provision_request = appliance.collections.requests.instantiate(request_description)
  begin
    provision_request.wait_for_request(method: "ui")
  rescue Exception => e
    logger.info()
    raise
  end
  raise "Provisioning failed with the message {}".format(provision_request.row.last_message.text) unless provision_request.is_succeeded(method: "ui")
  instance.mgmt.refresh()
  prov_instance_raw = instance.mgmt.raw
  raise unless prov_instance_raw.instance_variable_defined? :@os-extended-volumes:volumes_attached
  volumes_attached = prov_instance_raw.getattr("os-extended-volumes:volumes_attached")
  raise unless volumes_attached.size == 1
  volume_id = volumes_attached[0]["id"]
  raise unless provider.mgmt.volume_exists(volume_id)
  volume = provider.mgmt.get_volume(volume_id)
  raise unless volume.size == 3
end
def test_provision_with_tag(appliance, vm_name, tag, provider, request)
  #  Tests tagging instance using provisioning dialogs.
  # 
  #   Steps:
  #       * Open the provisioning dialog.
  #       * Apart from the usual provisioning settings, pick a tag.
  #       * Submit the provisioning request and wait for it to finish.
  #       * Visit instance page, it should display the selected tags
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/4h
  #   
  inst_args = {"purpose" => {"apply_tags" => Check_tree.CheckNode([, tag.display_name])}}
  collection = appliance.provider_based_collection(provider)
  instance = collection.create(vm_name, provider, form_values: inst_args)
  request.addfinalizer(instance.cleanup_on_provider)
  raise "Provisioned instance does not have expected tag" unless instance.get_tags().include?(tag)
end
def test_provision_from_template_from_global_region(setup_multi_region_cluster, multi_region_cluster, activate_global_appliance, setup_remote_provider, provisioned_instance)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: high
  #       casecomponent: Provisioning
  #       initialEstimate: 1/10h
  #   
  raise "Instance wasn't provisioned successfully" unless provisioned_instance.exists_on_provider
end
def test_provision_service_dialog_details()
  #  Test whether the details of provision request can be displayed.
  # 
  #   Prerequisities:
  #       * A Local/Global replicated CFMEs.
  #       * A provider that can provision.
  # 
  #   Steps:
  #       * Add repository and create a service catalog with a dialog at remote region
  #       * Try provisioning the catalog from Global Region
  #       * You can see the dialog details in Services -> Requests page
  # 
  #   Expected results:
  #       The dialog details at Services -> Requests should be displayed when
  #       ordering the catalog from the Global Region
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: medium
  #       casecomponent: Provisioning
  #       initialEstimate: 1/6h
  #   
  # pass
end
