# This module contains tests that test the universally applicable canned methods in Automate.
require_relative 'datetime'
include Datetime
require_relative 'datetime'
include Datetime
require_relative 'textwrap'
include Textwrap
require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/automate/simulation'
include Cfme::Automate::Simulation
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/infrastructure/virtual_machines'
include Cfme::Infrastructure::Virtual_machines
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/provisioning'
include Cfme::Provisioning
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'widgetastic_manageiq'
include Widgetastic_manageiq
pytestmark = [test_requirements.automate, pytest.mark.meta(server_roles: "+automate"), pytest.mark.provider([InfraProvider], required_fields: [["provisioning", "template"], ["provisioning", "host"], ["provisioning", "datastore"]], scope: "module")]
def generate_retirement_date(delta: nil)
  gen_date = date.today()
  if is_bool(delta)
    gen_date += timedelta(days: delta)
  end
  return gen_date
end
def test_vm_retire_extend(appliance, request, create_vm, soft_assert)
  #  Tests extending a retirement using an AE method.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       initialEstimate: 1/3h
  #       setup:
  #           1. A running VM on any provider.
  #       testSteps:
  #           1. It creates a button pointing to ``Request/vm_retire_extend`` instance. The button
  #              should live in the VM and Instance button group.
  #           2. Then it sets a retirement date for the VM
  #           3. Then it waits until the retirement date is set
  #           4. Then it clicks the button that was created and it waits for the retirement date to
  #              extend.
  # 
  #   Bugzilla:
  #       1627758
  #   
  num_days = 5
  soft_assert.(create_vm.retirement_date == "Never", "The retirement date is not 'Never'!")
  retirement_date = generate_retirement_date(delta: num_days)
  create_vm.set_retirement_date(when: retirement_date)
  wait_for(lambda{|| create_vm.retirement_date != "Never"}, message: "retirement date set")
  set_date = create_vm.retirement_date
  vm_retire_date_fmt = create_vm.RETIRE_DATE_FMT
  soft_assert.(set_date == retirement_date.strftime(vm_retire_date_fmt), "The retirement date '{}' did not match expected date '{}'".format(set_date, retirement_date.strftime(vm_retire_date_fmt)))
  grp_name = fauxfactory.gen_alphanumeric(start: "grp_")
  grp = appliance.collections.button_groups.create(text: grp_name, hover: grp_name, type: appliance.collections.button_groups.VM_INSTANCE)
  request.addfinalizer(lambda{|| grp.delete_if_exists()})
  btn_name = fauxfactory.gen_alphanumeric(start: "btn_")
  button = grp.buttons.create(text: btn_name, hover: btn_name, system: "Request", request: "vm_retire_extend")
  request.addfinalizer(lambda{|| button.delete_if_exists()})
  navigate_to(create_vm, "Details")
  class TestDropdownView < InfraVmSummaryView
    @@group = Dropdown(grp.text)
    def self.group; @@group; end
    def self.group=(val); @@group=val; end
    def group; @group = @@group if @group.nil?; @group; end
    def group=(val); @group=val; end
  end
  view = appliance.browser.create_view(TestDropdownView)
  view.group.item_select(button.text)
  extend_duration_days = 14
  extended_retirement_date = retirement_date + timedelta(days: extend_duration_days)
  wait_for(lambda{|| create_vm.retirement_date >= extended_retirement_date.strftime(vm_retire_date_fmt)}, num_sec: 60, message: "Check for extension of the VM retirement date by {} days".format(extend_duration_days))
end
def test_miq_password_decrypt(appliance, klass)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       initialEstimate: 1/3h
  # 
  #   Bugzilla:
  #       1720432
  #   
  script = "require \"manageiq-password\"
root_password = #{appliance.password_gem}.encrypt(\"abc\")
$evm.log(\"info\", \"Root Password is \#{root_password}\")
root_password_decrypted = #{appliance.password_gem}.decrypt(root_password)
$evm.log(\"info\", \"Decrypted password is \#{root_password_decrypted}\")"
  klass.schema.add_fields({"name" => "execute", "type" => "Method", "data_type" => "String"})
  method = klass.methods.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), location: "inline", script: script)
  instance = klass.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), fields: {"execute" => {"value" => method.name}})
  result = LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*Decrypted password is abc.*"])
  result.start_monitoring()
  simulate(appliance: klass.appliance, attributes_values: {"namespace" => klass.namespace.name, "class" => klass.name, "instance" => instance.name}, message: "create", request: "Call_Instance", execute_methods: true)
  raise unless result.validate()
end
def test_service_retirement_from_automate_method(request, generic_catalog_item, custom_instance)
  # 
  #   Bugzilla:
  #       1700524
  #       1753669
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       startsin: 5.11
  #       casecomponent: Automate
  #       testSteps:
  #           1. Create service catalog item and order
  #           2. Create a writeable domain and copy ManageIQ/System/Request to this domain
  #           3. Create retire_automation_service instance and set meth5 to retire_automation_service.
  #           4. Create retire_automation_service method with sample code given below:
  #              > service = $evm.root[\'service\']
  #              > $evm.log(:info, \"create_retire_request for  service \#{service}\")
  #              > request = $evm.execute(:create_retire_request, service)
  #              > $evm.log(:info, \"Create request for create_retire_request \#{request}\")
  #           5. Execute this method using simulation
  #       expectedResults:
  #           1. Service provision request should be provisioned successfully
  #           2.
  #           3.
  #           4.
  #           5. Service should be retired successfully
  #   
  service_request = generic_catalog_item.appliance.rest_api.collections.service_templates.get(name: generic_catalog_item.name).action.order()
  request.addfinalizer(lambda{|| service_request.action.delete()})
  wait_for(lambda{|| service_request.request_state == "finished"}, fail_func: service_request.reload, timeout: 180, delay: 10)
  script = dedent("
        service = $evm.root['service']
        $evm.log(:info, 'create_retire_request for service \#{service}')
        request = $evm.execute(:create_retire_request, service)
        $evm.log(:info, 'Create request for create_retire_request \#{request}')
        ")
  instance = custom_instance.(ruby_code: script)
  (LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*Create request for create_retire_request.*"])).waiting(timeout: 120) {
    simulate(appliance: generic_catalog_item.appliance, target_type: "Service", target_object: "#{generic_catalog_item.name}", message: "create", request: "#{instance.name}", execute_methods: true)
  }
  retire_request = generic_catalog_item.appliance.rest_api.collections.requests.get(description: "Service Retire for: #{generic_catalog_item.name}")
  wait_for(lambda{|| retire_request.request_state == "finished"}, fail_func: retire_request.reload, timeout: 180, delay: 10)
end
def set_root_tenant_quota(request, appliance)
  field,value = request.param
  root_tenant = appliance.collections.tenants.get_root_tenant()
  view = navigate_to(root_tenant, "ManageQuotas")
  reset_data = view.form.read()
  root_tenant.set_quota(None: {"#{field}_cb" => true, "field" => value})
  yield
  root_tenant.set_quota(None: reset_data)
end
def test_automate_quota_units(setup_provider, provider, request, appliance, set_root_tenant_quota, provisioning)
  # 
  #   Bugzilla:
  #       1334318
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #       tags: automate
  #   
  vm_name = random_vm_name(context: "quota")
  prov_data = {"catalog" => {"vm_name" => vm_name}, "environment" => {"automatic_placement" => true}, "network" => {"vlan" => partial_match(provisioning["vlan"])}, "hardware" => {"memory" => "2048"}}
  _finalize = lambda do
    collection = appliance.provider_based_collection(provider)
    vm_obj = collection.instantiate(vm_name, provider, provisioning["template"])
    begin
      vm_obj.cleanup_on_provider()
    rescue Exception
      logger.warning("Failed deleting VM from provider: %s", vm_name)
    end
  end
  (LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*Getting Tenant Quota Values for:.*.memory=>1073741824000.*"])).waiting(timeout: 120) {
    do_vm_provisioning(appliance, template_name: provisioning["template"], provider: provider, vm_name: vm_name, provisioning_data: prov_data, wait: false, request: nil)
    request_description = "Provision from [#{provisioning["template"]}] to [#{vm_name}]"
    provision_request = appliance.collections.requests.instantiate(request_description)
    provision_request.wait_for_request(method: "ui")
    raise "Provisioning failed: #{provision_request.row.last_message.text}" unless provision_request.is_succeeded(method: "ui")
  }
end
def vm_folder(provider)
  # Create Vm folder on VMWare provider
  folder = provider.mgmt.create_folder(fauxfactory.gen_alphanumeric(start: "test_folder_", length: 20))
  yield(folder)
  fd = folder.Destroy()
  wait_for(lambda{|| fd.info.state == "success"}, delay: 10, timeout: 150)
end
def test_move_vm_into_folder(appliance, vm_folder, create_vm, custom_instance)
  # 
  #    Bugzilla:
  #        1716858
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       initialEstimate: 1/4h
  #       tags: automate
  #   
  script = dedent("
        vm = $evm.vmdb('vm').find_by_name('#{create_vm.name}')
        folder = $evm.vmdb('EmsFolder').find_by(:name => '#{vm_folder.name}')
        vm.move_into_folder(folder) unless folder.nil?
        ")
  instance = custom_instance.(ruby_code: script)
  view = navigate_to(create_vm, "Details")
  tree_path = view.sidebar.vmstemplates.tree.currently_selected
  simulate(appliance: appliance, attributes_values: {"namespace" => instance.klass.namespace.name, "class" => instance.klass.name, "instance" => instance.name}, message: "create", request: "Call_Instance", execute_methods: true)
  tree_path.pop()
  tree_path.push(vm_folder.name)
  view = navigate_to(create_vm, "Details")
  _check = lambda do
    begin
      view.sidebar.vmstemplates.tree.fill(tree_path)
      return true
    rescue CandidateNotFound
      return false
    end
  end
  wait_for(lambda{|| _check}, fail_func: view.browser.refresh, timeout: 600, delay: 5, message: "Waiting for vm folder name to appear")
end
def test_list_of_diff_vm_storages_via_rails(appliance, setup_provider, provider, testing_vm, custom_instance)
  # 
  #   Bugzilla:
  #       1574444
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: Automate
  #       testSteps:
  #           1. vmware = $evm.vmdb('ems').find_by_name('vmware 6.5 (nested)') ;
  #           2. vm = vmware.vms.select { |v| v.name == 'dgaikwad-cfme510' }.first ;
  #           3. vm.storage
  #           4. vm.storages
  #       expectedResults:
  #           1.
  #           2.
  #           3. Returns only one storage
  #           4. Returns available storages
  #   
  list_storages = dedent("vmware = $evm.vmdb(\"ems\").find_by_name(\"#{provider.name}\")
vm = vmware.vms.select {|v| v.name == \"#{testing_vm.name}\"}.first
storage = vm.storage
storage_name = storage.name
$evm.log(:info, \"storage name: \#{storage_name}\")
storages = vm.storages
storage_name = storages[0].name
$evm.log(:info, \"storages name: \#{storage_name}\")
")
  instance = custom_instance.(ruby_code: list_storages)
  (LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*storage name: #{testing_vm.datastore.name}.*", ".*storages name: #{testing_vm.datastore.name}.*"])).waiting(timeout: 120) {
    simulate(appliance: appliance, message: "create", request: "Call_Instance", execute_methods: true, attributes_values: {"namespace" => instance.klass.namespace.name, "class" => instance.klass.name, "instance" => instance.name})
  }
end
