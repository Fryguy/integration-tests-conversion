require_relative 'widgetastic/exceptions'
include Widgetastic::Exceptions
require_relative 'widgetastic/exceptions'
include Widgetastic::Exceptions
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/fixtures/v2v_fixtures'
include Cfme::Fixtures::V2v_fixtures
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.v2v, pytest.mark.customer_scenario, pytest.mark.provider(classes: [RHEVMProvider, OpenStackProvider], selector: ONE_PER_VERSION, required_flags: ["v2v"], scope: "module"), pytest.mark.provider(classes: [VMwareProvider], selector: ONE_PER_TYPE, fixture_name: "source_provider", required_flags: ["v2v"], scope: "module"), pytest.mark.usefixtures("v2v_provider_setup")]
def infra_map(appliance, source_provider, provider)
  # Fixture to create infrastructure mapping
  infra_mapping_data = infra_mapping_default_data(source_provider, provider)
  infra_mapping_collection = appliance.collections.v2v_infra_mappings
  mapping = infra_mapping_collection.create(None: infra_mapping_data)
  yield mapping
  infra_mapping_collection.delete(mapping)
end
def migration_plan(appliance, infra_map, csv: true)
  # Function to create migration plan and select csv import option
  if is_bool(csv)
    import_btn = "Import a CSV file with a list of VMs to be migrated"
  else
    import_btn = "Choose from a list of VMs discovered in the selected infrastructure mapping"
  end
  plan_obj = appliance.collections.v2v_migration_plans
  view = navigate_to(plan_obj, "Add")
  view.general.fill({"infra_map" => infra_map.name, "name" => fauxfactory.gen_alpha(10), "description" => fauxfactory.gen_alpha(10), "choose_vm" => import_btn})
  return view
end
def check_vm_status(appliance, infra_map, filetype: "csv", content: false, table_hover: false, alert: false, security_group: false)
  # Function to import csv, select vm and return hover error from migration plan table
  plan_view = migration_plan(appliance, infra_map)
  temp_file = tempfile.NamedTemporaryFile(suffix: )
  if is_bool(content)
    open(temp_file.name, "w") {|f|
      f.write(content)
    }
  end
  begin
    plan_view.vms.hidden_field.fill(temp_file.name)
  rescue UnexpectedAlertPresentException
    # pass
  end
  if is_bool(table_hover)
    wait_for(lambda{|| plan_view.vms.is_displayed}, timeout: 60, message: "Wait for VMs view", delay: 5)
    if table_hover == "duplicate"
      plan_view.vms.table[0][1].widget.click()
    else
      plan_view.vms.table[0][1].widget.click()
    end
    if is_bool(!security_group)
      error_msg = plan_view.vms.popover_text.read()
    end
  else
    if is_bool(alert)
      error_msg = plan_view.browser.get_alert().text
      begin
        plan_view.browser.handle_alert()
      rescue NoSuchElementException
        # pass
      end
    else
      error_msg = plan_view.vms.error_text.text
    end
  end
  if is_bool(security_group)
    plan_view.next_btn.click()
    plan_view.instance_properties.table.wait_displayed()
    table_data = plan_view.instance_properties.table.read()[0]
    error_msg = {"security_group" => table_data["OpenStack Security Group"].to_s, "flavor" => table_data["OpenStack Flavor"].to_s}
  end
  plan_view.cancel_btn.click()
  return error_msg
end
def valid_vm(appliance, infra_map)
  # Fixture to get valid vm name from discovery
  plan_view = migration_plan(appliance, infra_map, csv: false)
  wait_for(lambda{|| plan_view.vms.is_displayed}, timeout: 60, delay: 5, message: "Wait for VMs view")
  vm_name = plan_view.vms.table.rows().map{|row| row.vm_name.text}[0]
  plan_view.cancel_btn.click()
  return vm_name
end
def archived_vm(appliance, source_provider)
  # Fixture to create archived vm
  vm_obj = appliance.collections.infra_vms.instantiate(random_vm_name(context: "v2v-auto"), source_provider)
  if is_bool(!source_provider.mgmt.does_vm_exist(vm_obj.name))
    vm_obj.create_on_provider(find_in_cfme: true, allow_skip: "default")
  end
  vm_obj.mgmt.delete()
  vm_obj.wait_for_vm_state_change(desired_state: "archived", timeout: 900, from_details: false, from_any_provider: true)
  return vm_obj.name
end
def test_non_csv(appliance, infra_map)
  # Test non-csv file import
  #   Polarion:
  #       assignee: sshveta
  #       caseposneg: negative
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/8h
  #   
  error_text = "Invalid file extension. Only .csv files are accepted."
  hover_error = check_vm_status(appliance, infra_map, filetype: "txt", alert: true)
  raise unless error_text == hover_error
end
def test_blank_csv(appliance, infra_map)
  # Test csv with blank file
  #   Polarion:
  #       assignee: sshveta
  #       caseposneg: negative
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/8h
  #   
  error_msg = "Error: Possibly a blank .CSV file"
  hover_error = check_vm_status(appliance, infra_map)
  raise unless error_msg == hover_error
end
def test_column_headers(appliance, infra_map)
  # Test csv with unsupported column header
  #   Polarion:
  #       assignee: sshveta
  #       caseposneg: positive
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/8h
  #   
  content = fauxfactory.gen_alpha(10)
  error_msg = "Error: Required column 'Name' does not exist in the .CSV file"
  hover_error = check_vm_status(appliance, infra_map, content: content)
  raise unless error_msg == hover_error
end
def test_inconsistent_columns(appliance, infra_map)
  # Test csv with extra inconsistent column value
  #   Polarion:
  #       assignee: sshveta
  #       caseposneg: negative
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/8h
  #   
  content = "Name
{}, {}".format(fauxfactory.gen_alpha(10), fauxfactory.gen_alpha(10))
  error_msg = "Error: Number of columns is inconsistent on line 2"
  hover_error = check_vm_status(appliance, infra_map, content: content)
  raise unless error_msg == hover_error
end
def test_csv_empty_vm(appliance, infra_map)
  # Test csv with empty column value
  #   Polarion:
  #       assignee: sshveta
  #       caseposneg: positive
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/8h
  #   
  content = "Name

"
  error_msg = "Empty name specified"
  hover_error = check_vm_status(appliance, infra_map, content: content, table_hover: true)
  raise unless error_msg == hover_error
end
def test_csv_invalid_vm(appliance, infra_map)
  # Test csv with invalid vm name
  #   Polarion:
  #       assignee: sshveta
  #       caseposneg: negative
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/8h
  #   
  content = "Name
{}".format(fauxfactory.gen_alpha(10))
  error_msg = "VM does not exist"
  hover_error = check_vm_status(appliance, infra_map, content: content, table_hover: true)
  raise unless error_msg == hover_error
end
def test_csv_valid_vm(appliance, infra_map, valid_vm)
  # Test csv with valid vm name
  #   Polarion:
  #       assignee: sshveta
  #       caseposneg: positive
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/8h
  #   
  content = 
  error_msg = "VM available for migration"
  hover_error = check_vm_status(appliance, infra_map, content: content, table_hover: true)
  raise unless error_msg == hover_error
end
def test_csv_duplicate_vm(appliance, infra_map, valid_vm)
  # Test csv with duplicate vm name
  #   Polarion:
  #       assignee: sshveta
  #       caseposneg: positive
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/8h
  #   
  content = 
  error_msg = "Duplicate VM"
  hover_error = check_vm_status(appliance, infra_map, content: content, table_hover: "duplicate")
  raise unless error_msg == hover_error
end
def test_csv_archived_vm(appliance, infra_map, archived_vm)
  # Test csv with archived vm name
  #   Polarion:
  #       assignee: sshveta
  #       caseposneg: positive
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/8h
  #   
  content = 
  error_msg = "VM is inactive"
  hover_error = check_vm_status(appliance, infra_map, content: content, table_hover: true)
  raise unless error_msg == hover_error
end
def test_csv_security_group_flavor(appliance, soft_assert, infra_map, valid_vm, provider)
  # Test csv with secondary openstack security group and flavor
  #   Polarion:
  #       assignee: mnadeem
  #       caseposneg: positive
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/4h
  #   
  begin
    security_group = provider.data.security_groups.admin[1]
    flavor = provider.data.flavors[1]
  rescue [NoMethodError, KeyError]
    pytest.skip("No provider data found.")
  end
  content = 
  expected_attributes = check_vm_status(appliance, infra_map, content: content, table_hover: true, security_group: true)
  soft_assert.(expected_attributes["security_group"] == security_group)
  raise unless [flavor, ].include?(expected_attributes["flavor"])
end
