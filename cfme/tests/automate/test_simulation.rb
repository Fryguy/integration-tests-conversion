require_relative 'cfme'
include Cfme
require_relative 'cfme/automate/simulation'
include Cfme::Automate::Simulation
require_relative 'cfme/base/ui'
include Cfme::Base::Ui
require_relative 'cfme/control/explorer/actions'
include Cfme::Control::Explorer::Actions
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
pytestmark = [test_requirements.automate, pytest.mark.tier(2)]
def test_object_attributes(appliance)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/16h
  # 
  #   Bugzilla:
  #       1719322
  #   
  view = navigate_to(appliance.server, "AutomateSimulation")
  for object_type in view.target_type.all_options[1..-1]
    view.reset_button.click()
    if is_bool(BZ(1719322, forced_streams: ["5.10", "5.11"]).blocks && ["Group", "EVM Group", "Tenant"].include?(object_type.text))
      next
    else
      view.target_type.select_by_visible_text(object_type.text)
      raise unless view.target_object.all_options.size > 0
    end
  end
end
def copy_class(domain)
  domain.parent.instantiate(name: "ManageIQ").namespaces.instantiate(name: "System").classes.instantiate(name: "Request").copy_to(domain.name)
  klass = domain.namespaces.instantiate(name: "System").classes.instantiate(name: "Request")
  return klass
end
def test_assert_failed_substitution(copy_class)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       caseposneg: negative
  #       tags: automate
  # 
  #   Bugzilla:
  #       1335669
  #   
  instance = copy_class.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), fields: {"guard" => {"value" => "${/#this_value_does_not_exist}"}})
  pytest.raises(RuntimeError, match: "Automation Error: Attribute this_value_does_not_exist not found") {
    simulate(appliance: copy_class.appliance, attributes_values: {"namespace" => copy_class.namespace.name, "class" => copy_class.name, "instance" => instance.name}, message: "create", request: "Call_Instance", execute_methods: true)
  }
end
def test_automate_simulation_result_has_hash_data(custom_instance)
  # 
  #   The UI should display the result objects if the Simulation Result has
  #   hash data.
  # 
  #   Bugzilla:
  #       1445089
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       tags: automate
  #       testSteps:
  #           1. Create a Instance under /System/Request called ListUser, update it so that it points
  #              to a ListUser Method
  #           2. Create ListUser Method under /System/Request, paste the Attached Method
  #           3. Run Simulation
  #       expectedResults:
  #           1.
  #           2.
  #           3. The UI should display the result objects
  #   
  instance = custom_instance.(ruby_code: user_list_hash_data)
  (LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*User List.*:id=>1, :name=>\"Fred\".*"])).waiting(timeout: 120) {
    simulate(appliance: instance.appliance, attributes_values: {"namespace" => instance.klass.namespace.name, "class" => instance.klass.name, "instance" => instance.name}, message: "create", request: "Call_Instance", execute_methods: true)
  }
  view = instance.create_view(AutomateSimulationView)
  raise unless view.result_tree.click_path(, , , "values", "Hash", "Key").text == "Key"
end
def test_simulation_copy_button(appliance)
  # 
  #   Bugzilla:
  #       1630800
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       startsin: 5.10
  #       casecomponent: Automate
  #       testSteps:
  #           1. Go to Automation > Automate > Simulation
  #           2. Fill in any required fields to enable submit button and click on 'Submit'
  #           4. Change any field - for example 'Object Attribute'
  #           5. Select Copy button
  #       expectedResults:
  #           1. Copy button should be disabled
  #           2. Copy button should be enabled
  #           3.
  #           4.
  #           5. Copy button should be disabled until form is submitted
  #   
  view = navigate_to(appliance.server, "AutomateSimulation")
  raise unless !view.copy.is_enabled
  view.fill({"instance" => "Request", "message" => "Hello", "request" => "InspectMe", "execute_methods" => true, "target_type" => "EVM User", "target_object" => "Administrator"})
  view.submit_button.click()
  raise unless view.copy.is_enabled
  view.target_type.select_by_visible_text("Provider")
  raise unless !view.copy.is_enabled
end
def test_attribute_value_message(custom_instance)
  # 
  #   Bugzilla:
  #       1753523
  #       1740761
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       casecomponent: Automate
  #       setup:
  #           1. Create domain, namespace, class and instance pointing to method
  #       testSteps:
  #           1. Navigate to automate > automation > simulation page
  #           2. Fill values for attribute/value pairs of namespace, class, instance and add message
  #              attribute with any value and click on submit.
  #           3. See automation.log
  #       expectedResults:
  #           1.
  #           2.
  #           3. Custom message attribute should be considered with instance in logs
  #   
  instance = custom_instance.(ruby_code: nil)
  msg = fauxfactory.gen_alphanumeric()
  (LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [])).waiting(timeout: 120) {
    simulate(appliance: instance.appliance, attributes_values: {"namespace" => instance.klass.namespace.name, "class" => instance.klass.name, "instance" => instance.name, "message" => msg}, message: "create", request: "call_instance_with_message", execute_methods: true)
  }
end
def test_action_invoke_custom_automation(request, appliance)
  # 
  #   Bugzilla:
  #       1672007
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       casecomponent: Automate
  #       testSteps:
  #           1. Navigate to Control > explorer > actions
  #           2. Select 'add a new action' from configuration dropdown
  #           3. Add description and select 'Action Type' - Invoke custom automation
  #           4. Fill attribute value pairs and click on add
  #           5. Edit the created action and add new attribute value pair
  #           6. Remove that newly added attribute value pair before clicking on save and then click
  #              on save
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5. Save button should enabled
  #           6. Action should be saved successfully
  #   
  attr_val = 2.times.map{|_| 1.upto(6-1).map{|num|[, fauxfactory.gen_alpha()]}.to_h}
  automation_action = appliance.collections.actions.create(fauxfactory.gen_alphanumeric(), "Invoke a Custom Automation", {})
  request.addfinalizer(automation_action.delete_if_exists)
  view = navigate_to(automation_action, "Edit")
  view.attribute_value_pair.fill(attr_val[1])
  raise unless view.save_button.is_enabled
  view.attribute_value_pair.clear()
  view.save_button.click()
  view = automation_action.create_view(ActionDetailsView, wait: "10s")
  view.flash.assert_success_message()
end
