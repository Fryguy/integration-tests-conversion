require 'None'
require_relative 'datetime'
include Datetime
require_relative 'widgetastic/widget'
include Widgetastic::Widget
require_relative 'cfme'
include Cfme
require_relative 'cfme/control/explorer'
include Cfme::Control::Explorer
require_relative 'cfme/control/explorer'
include Cfme::Control::Explorer
require_relative 'cfme/control/explorer/alert_profiles'
include Cfme::Control::Explorer::Alert_profiles
require_relative 'cfme/control/explorer/policies'
include Cfme::Control::Explorer::Policies
require_relative 'cfme/control/explorer/policies'
include Cfme::Control::Explorer::Policies
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/tests/control/test_basic'
include Cfme::Tests::Control::Test_basic
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.control, pytest.mark.tier(3)]
BAD_CONDITIONS = [conditions.ReplicatorCondition, conditions.PodCondition, conditions.ContainerNodeCondition, conditions.ContainerImageCondition, conditions.ProviderCondition]
BREADCRUMB_LOCATIONS = {}
def create_policy(request, collection)
  args = [VMControlPolicy, fauxfactory.gen_alpha()]
  kwargs = {}
  policy = collection.create(*args)
  _delete = lambda do
    while policy.exists
      policy.delete()
    end
  end
  return [args, kwargs]
end
def create_condition(request, collection)
  args = [conditions.VMCondition, fauxfactory.gen_alpha(), "fill_field(VM and Instance : Boot Time, BEFORE, Today)"]
  kwargs = {}
  condition = collection.create(*args)
  _delete = lambda do
    while condition.exists
      condition.delete()
    end
  end
  return [args, kwargs]
end
def create_action(request, collection)
  args = [fauxfactory.gen_alpha()]
  kwargs = {"action_type" => "Tag", "action_values" => {"tag" => ["My Company Tags", "Department", "Accounting"]}}
  action = collection.create(*args, None: kwargs)
  _delete = lambda do
    while action.exists
      action.delete()
    end
  end
  return [args, kwargs]
end
def create_alert(request, collection)
  args = [fauxfactory.gen_alpha()]
  kwargs = {"timeline_event" => true, "driving_event" => "Hourly Timer"}
  alert = collection.create(*args, None: kwargs)
  _delete = lambda do
    while alert.exists
      alert.delete()
    end
  end
  return [args, kwargs]
end
ProfileCreateFunction = namedtuple("ProfileCreateFunction", ["name", "fn"])
items = [ProfileCreateFunction.("Policies", method(:create_policy)), ProfileCreateFunction.("Conditions", method(:create_condition)), ProfileCreateFunction.("Actions", method(:create_action)), ProfileCreateFunction.("Alerts", method(:create_alert))]
def collections(appliance)
  return {"Policies" => appliance.collections.policies, "Conditions" => appliance.collections.conditions, "Actions" => appliance.collections.actions, "Alerts" => appliance.collections.alerts}
end
def vmware_vm(request, virtualcenter_provider)
  vm = virtualcenter_provider.appliance.collections.infra_vms.instantiate(random_vm_name("control"), virtualcenter_provider)
  vm.create_on_provider(find_in_cfme: true)
  request.addfinalizer(vm.cleanup_on_provider)
  return vm
end
def hardware_reconfigured_alert(appliance)
  alert = appliance.collections.alerts.create(fauxfactory.gen_alpha(), evaluate: ["Hardware Reconfigured", {"hardware_attribute" => "RAM"}], timeline_event: true)
  yield(alert)
  alert.delete()
end
def setup_disk_usage_alert(appliance)
  timestamp = Datetime::now()
  table = appliance.db.client["miq_alert_statuses"]
  query = appliance.db.client.session.query(table.description, table.evaluated_on)
  appliance.update_advanced_settings({"server" => {"events" => {"disk_usage_gt_percent" => 1}}})
  result = appliance.ssh_client.run_command("dd if=/dev/zero of=/var/www/miq/vmdb/log/delete_me.txt count=1024 bs=1048576")
  raise unless !result.failed
  expression = {"expression" => "fill_count(Server.EVM Workers, >, 0)"}
  alert = appliance.collections.alerts.create(fauxfactory.gen_alpha(), based_on: "Server", evaluate: ["Expression (Custom)", expression], driving_event: "Appliance Operation: Server High /var/www/miq/vmdb/log Disk Usage", notification_frequency: "1 Minute")
  alert_profile = appliance.collections.alert_profiles.create(ServerAlertProfile, "Alert profile for #{alert.description}", alerts: [alert])
  alert_profile.assign_to("Selected Servers", selections: ["Servers", "EVM"])
  yield([alert, timestamp, query])
  alert_profile.delete()
  alert.delete()
  appliance.update_advanced_settings({"server" => {"events" => {"disk_usage_gt_percent" => "<<reset>>"}}})
  result = appliance.ssh_client.run_command("rm /var/www/miq/vmdb/log/delete_me.txt")
  raise unless !result.failed
end
def action_for_testing(appliance)
  action_ = appliance.collections.actions.create(fauxfactory.gen_alphanumeric(), action_type: "Tag", action_values: {"tag" => ["My Company Tags", "Department", "Accounting"]})
  yield(action_)
  action_.delete()
end
def compliance_condition(appliance, virtualcenter_provider)
  begin
    vm_name = virtualcenter_provider.data["cap_and_util"]["capandu_vm"]
  rescue KeyError
    pytest.skip("Missing 'cap_and_util' field in {} provider data.".format(virtualcenter_provider.key))
  end
  expression = "fill_field(VM and Instance : Name, =, {}); select_expression_text; click_or; fill_field(VM and Instance : Name, =, {}); select_expression_text; click_or; fill_field(VM and Instance : Name, =, {}); ".format(vm_name, fauxfactory.gen_alphanumeric(), fauxfactory.gen_alphanumeric())
  condition = appliance.collections.conditions.create(conditions.VMCondition, fauxfactory.gen_alphanumeric(12, start: "vm-name-"), expression: expression)
  yield(condition)
  condition.delete()
end
def vm_compliance_policy_profile(appliance, compliance_condition)
  policy = appliance.collections.policies.create(VMCompliancePolicy, fauxfactory.gen_alphanumeric(20, start: "vm-compliance-"))
  policy.assign_conditions(compliance_condition)
  profile = appliance.collections.policy_profiles.create(fauxfactory.gen_alphanumeric(26, start: "VM Compliance Profile "), [policy])
  yield(profile)
  profile.delete()
  policy.delete()
end
def test_scope_windows_registry_stuck(request, appliance, infra_provider)
  # If you provide Scope checking windows registry, it messes CFME up. Recoverable.
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Control
  #       caseimportance: low
  #       initialEstimate: 1/6h
  # 
  #   Bugzilla:
  #       1155284
  #   
  policy = appliance.collections.policies.create(VMCompliancePolicy, "Windows registry scope glitch testing Compliance Policy", active: true, scope: "fill_registry(HKLM\\SOFTWARE\\Microsoft\\CurrentVersion\\Uninstall\\test, some value, INCLUDES, some content)")
  request.addfinalizer(lambda{|| is_bool(policy.exists) ? policy.delete() : nil})
  profile = appliance.collections.policy_profiles.create("Windows registry scope glitch testing Compliance Policy", policies: [policy])
  request.addfinalizer(lambda{|| is_bool(profile.exists) ? profile.delete() : nil})
  vm = infra_provider.appliance.collections.infra_vms.all()[0]
  vm.assign_policy_profiles(profile.description)
  navigate_to(appliance.server, "Dashboard")
  view = navigate_to(appliance.collections.infra_vms, "All")
  raise unless !view.entities.title.text.downcase().include?("except")
  vm.unassign_policy_profiles(profile.description)
end
def test_invoke_custom_automation(request, appliance)
  # This test tests a bug that caused the ``Invoke Custom Automation`` fields to disappear.
  # 
  #   Steps:
  #       * Go create new action, select Invoke Custom Automation
  #       * The form with additional fields should appear
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Control
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  # 
  #   Bugzilla:
  #       1243357
  #   
  action = appliance.collections.actions.create(fauxfactory.gen_alpha(), "Invoke a Custom Automation", {})
  request.addfinalizer(lambda{|| is_bool(action.exists) ? action.delete() : nil})
end
def test_check_compliance_history(request, virtualcenter_provider, vmware_vm, appliance)
  # This test checks if compliance history link in a VM details screen work.
  # 
  #   Steps:
  #       * Create any VM compliance policy
  #       * Assign it to a policy profile
  #       * Assign the policy profile to any VM
  #       * Perform the compliance check for the VM
  #       * Go to the VM details screen
  #       * Click on \"History\" row in Compliance InfoBox
  # 
  #   Result:
  #       Compliance history screen with last 10 checks should be opened
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       initialEstimate: 1/4h
  #       casecomponent: Control
  # 
  #   Bugzilla:
  #       1375093
  #   
  policy = appliance.collections.policies.create(VMCompliancePolicy, fauxfactory.gen_alpha(36, start: "Check compliance history policy "), active: true, scope: "fill_field(VM and Instance : Name, INCLUDES, #{vmware_vm.name})")
  request.addfinalizer(lambda{|| is_bool(policy.exists) ? policy.delete() : nil})
  policy_profile = appliance.collections.policy_profiles.create(policy.description, policies: [policy])
  request.addfinalizer(lambda{|| is_bool(policy_profile.exists) ? policy_profile.delete() : nil})
  virtualcenter_provider.assign_policy_profiles(policy_profile.description)
  request.addfinalizer(lambda{|| virtualcenter_provider.unassign_policy_profiles(policy_profile.description)})
  vmware_vm.check_compliance()
  vmware_vm.open_details(["Compliance", "History"])
  history_screen_title = (Text(appliance.browser.widgetastic, "//span[@id='explorer_title_text']")).text
  raise unless history_screen_title == "\"Compliance History\" for Virtual Machine \"{}\"".format(vmware_vm.name)
end
def test_delete_all_actions_from_compliance_policy(request, appliance)
  # We should not allow a compliance policy to be saved
  #   if there are no actions on the compliance event.
  # 
  #   Steps:
  #       * Create a compliance policy
  #       * Remove all actions
  # 
  #   Result:
  #       The policy shouldn't be saved.
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Control
  #       caseimportance: medium
  #       caseposneg: negative
  #       initialEstimate: 1/12h
  # 
  #   Bugzilla:
  #       1395965
  #       1491576
  #   
  policy = appliance.collections.policies.create(VMCompliancePolicy, fauxfactory.gen_alphanumeric())
  request.addfinalizer(lambda{|| is_bool(policy.exists) ? policy.delete() : nil})
  pytest.raises(RuntimeError) {
    policy.assign_actions_to_event("VM Compliance Check", [])
  }
end
def test_control_identical_descriptions(request, create_function, collections, appliance)
  # CFME should not allow to create policy, alerts, profiles, actions and others to be created
  #   if the item with the same description already exists.
  # 
  #   Steps:
  #       * Create an item
  #       * Create the same item again
  # 
  #   Result:
  #       The item shouldn't be created.
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Control
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #   
  args,kwargs = create_function.fn(request, collections[create_function.name])
  flash = appliance.browser.create_view(ControlExplorerView).flash
  begin
    collections[create_function.name].create(*args, None: kwargs)
  rescue [TimedOutError, RuntimeError]
    flash.assert_message("Description has already been taken")
    navigate_to(appliance.server, "ControlExplorer", force: true)
  end
end
def test_vmware_alarm_selection_does_not_fail(request, appliance)
  # Test the bug that causes CFME UI to explode when VMware Alarm type is selected.
  #       We assert that the alert using this type is simply created. Then we destroy
  #       the alert.
  # 
  #   Metadata:
  #       test_flag: alerts
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Control
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #   
  begin
    alert = appliance.collections.alerts.create(fauxfactory.gen_alpha(length: 20, start: "Trigger by CPU "), active: true, based_on: "VM and Instance", evaluate: ["VMware Alarm", {}], notification_frequency: "5 Minutes")
    request.addfinalizer(lambda{|| is_bool(alert.exists) ? alert.delete() : nil})
  rescue CFMEExceptionOccured => e
    pytest.fail("CFME has thrown an error: {}".format(e.to_s))
  end
end
def test_alert_ram_reconfigured(hardware_reconfigured_alert)
  # Tests the bug when it was not possible to save an alert with RAM option in hardware
  #   attributes.
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Control
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #   
  view = navigate_to(hardware_reconfigured_alert, "Details")
  attr = view.hardware_reconfigured_parameters.get_text_of("Hardware Attribute")
  raise unless attr == "RAM Increased"
end
def test_alert_for_disk_usage(setup_disk_usage_alert)
  # 
  #   Bugzilla:
  #       1658670
  #       1672698
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Control
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. Go to Control > Explorer > Alerts
  #           2. Configuration > Add new alert
  #           3. Based on = Server
  #           4. What to evaluate = Expression (Custom)
  #           5. Driving Event =
  #               \"Appliance Operation: Server High /var/www/miq/vmdb/log Disk Usage\"
  #           6. Assign the alert to a Alert Profile
  #           7. Assign the Alert Profile to the Server
  #           8. In advanced config, change:
  #               events:
  #                 :disk_usage_gt_percent: 80
  #               to:
  #                 events:
  #                 :disk_usage_gt_percent: 1
  #           9. dd a file in /var/www/miq/vmdb/log large enough to trigger 1% disk usage
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5.
  #           6.
  #           7.
  #           8.
  #           9. the alert should fire, and the event of type
  #               \"evm_server_log_disk_usage\" should trigger
  #   
  alert,timestamp,query = setup_disk_usage_alert
  _check_query = lambda do
    query_result = query.all()
    if is_bool(query_result)
      return alert.description == query_result[0][0] && timestamp < query_result[0][1]
    else
      return false
    end
  end
  wait_for(method(:_check_query), delay: 5, num_sec: 600, message: "Waiting for alert #{alert.description} to appear in DB")
end
def test_accordion_after_condition_creation(appliance, condition_class)
  # 
  #   Bugzilla:
  #       1683697
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Control
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  # 
  #   For this test, we must make a condition 'manually' and so that we can access the view
  #   during the condition creation.
  #   
  if is_bool(BZ(1683697).blocks && BAD_CONDITIONS.include?(condition_class))
    pytest.skip("Skipping because {} conditions are impacted by BZ 1683697".format(condition_class.__name__))
  end
  condition = appliance.collections.conditions.create(condition_class, fauxfactory.gen_alpha(), expression: "fill_field({} : Name, IS NOT EMPTY)".format(condition_class.FIELD_VALUE))
  view = condition.create_view(conditions.ConditionDetailsView, wait: "10s")
  raise unless view.conditions.tree.currently_selected == ["All Conditions", "#{condition_class.TREE_NODE} Conditions", condition.description]
end
def test_edit_action_buttons(action_for_testing)
  # 
  #   This tests the bug where the save/reset button are always enabled, even on initial load.
  # 
  #   Bugzilla:
  #       1708434
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Control
  #       caseimportance: medium
  #       initialEstimate: 1/30h
  #   
  view = navigate_to(action_for_testing, "Edit")
  raise unless view.save_button.disabled
  raise unless view.reset_button.disabled
  view.cancel_button.click()
  navigate_to(action_for_testing, "Details")
end
def test_policy_condition_multiple_ors(appliance, virtualcenter_provider, vm_compliance_policy_profile)
  # 
  #   Tests to make sure that policy conditions with multiple or statements work properly
  # 
  #   Bugzilla:
  #       1711352
  #       1717483
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       caseimportance: low
  #       casecomponent: Control
  #       initialEstimate: 1/12h
  #   
  collection = appliance.provider_based_collection(virtualcenter_provider)
  all_vms = collection.all()
  all_vm_names = all_vms.map{|vm| vm.name}
  vm_name = virtualcenter_provider.data["cap_and_util"]["capandu_vm"]
  if is_bool(!virtualcenter_provider.mgmt.does_vm_exist(vm_name))
    pytest.skip("No capandu_vm available on virtualcenter_provider of name #{vm_name}")
  end
  vms = [all_vms.pop(all_vm_names.index(vm_name))]
  begin
    vms.concat(all_vms[0...random.randint(1]. all_vms.size))
  rescue TypeError
    pytest.skip("No other vms exist on provider to run policy simulation against.")
  end
  filtered_collection = collection.filter({"names" => vms.map{|vm| vm.name}})
  view = navigate_to(filtered_collection, "PolicySimulation")
  view.fill({"form" => {"policy_profile" => "#{vm_compliance_policy_profile.description}"}})
  for entity in view.form.entities.get_all()
    state = entity.data["quad"]["bottomRight"]["tooltip"]
    if entity.name == vm_name
      raise unless state == "Policy simulation successful."
    else
      raise unless state == "Policy simulation failed with: false"
    end
  end
end
def test_control_breadcrumbs(appliance, page)
  # 
  #   Test to make sure breadcrumbs are visible and properly displayed
  # 
  #   Bugzilla:
  #       1740290
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       caseimportance: high
  #       casecomponent: Control
  #       initialEstimate: 1/30h
  #       startsin: 5.11
  #   
  view = navigate_to(appliance.server, "ControlExplorer")
  raise unless view.breadcrumb.locations == BREADCRUMB_LOCATIONS["ControlExplorer"]
  raise unless view.breadcrumb.is_displayed
  view = navigate_to(appliance.server, page)
  raise unless view.breadcrumb.is_displayed
  raise unless view.breadcrumb.locations == BREADCRUMB_LOCATIONS[page]
end
