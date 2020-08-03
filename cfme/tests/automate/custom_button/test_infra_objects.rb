require_relative 'textwrap'
include Textwrap
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/tests/automate/custom_button'
include Cfme::Tests::Automate::Custom_button
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(2), test_requirements.custom_button, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([VMwareProvider], selector: ONE_PER_TYPE)]
INFRA_OBJECTS = ["PROVIDER", "HOSTS", "VM_INSTANCE", "TEMPLATE_IMAGE", "DATASTORES", "CLUSTERS", "SWITCH"]
DISPLAY_NAV = {"Single entity" => ["Details"], "List" => ["All"], "Single and list" => ["All", "Details"]}
SUBMIT = ["Submit all", "One by one"]
def cls(appliance)
  domain = appliance.collections.domains.create(name: fauxfactory.gen_alphanumeric(12, start: "domain_"), enabled: true)
  original_class = domain.parent.instantiate(name: "ManageIQ").namespaces.instantiate(name: "System").classes.instantiate(name: "Request")
  original_class.copy_to(domain: domain)
  yield(domain.namespaces.instantiate(name: "System").classes.instantiate(name: "Request"))
  if is_bool(domain.exists)
    domain.delete()
  end
end
def method(cls)
  meth = cls.methods.create(name: fauxfactory.gen_alphanumeric(start: "meth_"), script: dedent("
            # add google url to open
            vm = $evm.root[\'vm\']
            $evm.log(:info, \"Opening url\")
            vm.remote_console_url = \"http://example.com\"
            "))
  instance = cls.instances.create(name: fauxfactory.gen_alphanumeric(start: "inst_"), fields: {"meth1" => {"value" => meth.name}})
  yield(instance)
  meth.delete_if_exists()
  instance.delete_if_exists()
end
def button_group(appliance, request)
  collection = appliance.collections.button_groups
  button_gp = collection.create(text: fauxfactory.gen_alphanumeric(start: "grp_"), hover: fauxfactory.gen_alphanumeric(15, start: "grp_hvr_"), type: collection.getattr(request.param))
  yield([button_gp, request.param])
  button_gp.delete_if_exists()
end
def setup_obj(button_group, provider)
  #  Setup object for specific custom button object type.
  obj_type = button_group[1]
  begin
    if obj_type == "PROVIDER"
      obj = provider
    else
      if obj_type == "VM_INSTANCE"
        obj = provider.appliance.provider_based_collection(provider).all()[0]
      else
        if obj_type == "TEMPLATE_IMAGE"
          obj = provider.appliance.collections.infra_templates.all()[0]
        else
          if obj_type == "SWITCH"
            obj = provider.appliance.collections.infra_switches.all()[0]
          else
            obj = provider.appliance.collections.getattr(obj_type.downcase()).all()[0]
          end
        end
      end
    end
  rescue IndexError
    pytest.skip("Object not found for #{obj_type} type")
  end
  return obj
end
def test_custom_button_display_infra_obj(request, display, setup_obj, button_group)
  #  Test custom button display on a targeted page
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/4h
  #       caseimportance: critical
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.8
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       testSteps:
  #           1. Create custom button group with the Object type
  #           2. Create a custom button with specific display
  #           3. Navigate to object type page as per display selected
  #           4. Single entity: Details page of the entity
  #           5. List: All page of the entity
  #           6. Single and list: Both All and Details page of the entity
  #           7. Check for button group and button
  #   
  group,obj_type = button_group
  button = group.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_hvr_"), display_for: display, system: "Request", request: "InspectMe")
  request.addfinalizer(button.delete_if_exists)
  for destination in DISPLAY_NAV[display]
    obj = (destination == "All") ? setup_obj.parent : setup_obj
    if is_bool(obj_type == "VM_INSTANCE" && destination == "All")
      destination = "VMsOnly"
    end
    if is_bool(obj_type == "TEMPLATE_IMAGE" && destination == "All")
      destination = "TemplatesOnly"
    end
    view = navigate_to(obj, destination)
    custom_button_group = Dropdown(view, group.hover)
    raise unless custom_button_group.is_displayed
    raise unless custom_button_group.has_item(button.text)
  end
end
def test_custom_button_automate_infra_obj(appliance, request, submit, setup_obj, button_group)
  #  Test custom button for automate and requests count as per submit
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/4h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       testSteps:
  #           1. Create custom button group with the Object type
  #           2. Create a custom button with specific submit option and Single and list display
  #           3. Navigate to object type pages (All and Details)
  #           4. Check for button group and button
  #           5. Select/execute button from group dropdown for selected entities
  #           6. Check for the proper flash message related to button execution
  #           7. Check automation log requests. Submitted as per selected submit option or not.
  #           8. Submit all: single request for all entities execution
  #           9. One by one: separate requests for all entities execution
  # 
  #   Bugzilla:
  #       1628224
  #   
  group,obj_type = button_group
  button = group.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_hvr_"), display_for: "Single and list", submit: submit, system: "Request", request: "InspectMe")
  request.addfinalizer(button.delete_if_exists)
  for destination in ["All", "Details"]
    obj = (destination == "All") ? setup_obj.parent : setup_obj
    if is_bool(obj_type == "VM_INSTANCE" && destination == "All")
      destination = "VMsOnly"
    end
    if is_bool(obj_type == "TEMPLATE_IMAGE" && destination == "All")
      destination = "TemplatesOnly"
    end
    view = navigate_to(obj, destination)
    custom_button_group = Dropdown(view, group.hover)
    raise unless custom_button_group.has_item(button.text)
    if ["All", "VMsOnly", "TemplatesOnly"].include?(destination)
      begin
        paginator = view.paginator
      rescue NoMethodError
        paginator = view.entities.paginator
      end
      entity_count = paginator.items_amount, paginator.items_per_page.min
      paginator.check_all()
    else
      entity_count = 1
    end
    request_pattern = "Attributes - Begin"
    log = LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [request_pattern])
    log.start_monitoring()
    custom_button_group.item_select(button.text)
    diff = (appliance.version < "5.10") ? "executed" : "launched"
    view.flash.assert_message("\"#{button.text}\" was #{diff}")
    expected_count = (submit == "Submit all") ? 1 : entity_count
    begin
      wait_for(lambda{|| log.matches[request_pattern] == expected_count}, timeout: 300, message: "wait for expected match count", delay: 5)
    rescue TimedOutError
      raise "Expected '{}' requests and '{}' requests found in automation log".format(expected_count, log.matches[request_pattern]) unless false
    end
  end
end
def test_custom_button_dialog_infra_obj(appliance, dialog, request, setup_obj, button_group)
  #  Test custom button with dialog and InspectMe method
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/4h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       testSteps:
  #           1. Create custom button group with the Object type
  #           2. Create a custom button with service dialog
  #           3. Navigate to object Details page
  #           4. Check for button group and button
  #           5. Select/execute button from group dropdown for selected entities
  #           6. Fill dialog and submit
  #           7. Check for the proper flash message related to button execution
  # 
  #   Bugzilla:
  #       1635797
  #       1555331
  #       1574403
  #       1640592
  #       1641669
  #       1685555
  #   
  group,obj_type = button_group
  button = group.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_hvr_"), dialog: dialog, system: "Request", request: "InspectMe")
  request.addfinalizer(button.delete_if_exists)
  view = navigate_to(setup_obj, "Details")
  custom_button_group = Dropdown(view, group.hover)
  raise unless custom_button_group.has_item(button.text)
  custom_button_group.item_select(button.text)
  dialog_view = view.browser.create_view(TextInputDialogView, wait: "10s")
  raise unless dialog_view.service_name.fill("Custom Button Execute")
  request_pattern = "Attributes - Begin"
  log = LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [request_pattern])
  log.start_monitoring()
  dialog_view.submit.click()
  view.flash.assert_message("Order Request was Submitted")
  begin
    wait_for(lambda{|| log.matches[request_pattern] == 1}, timeout: 180, message: "wait for expected match count", delay: 5)
  rescue TimedOutError
    raise "Expected '1' requests and '{}' requests found in automation log".format(log.matches[request_pattern]) unless false
  end
end
def test_custom_button_expression_infra_obj(appliance, request, setup_obj, button_group, expression)
  #  Test custom button as per expression enablement/visibility.
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/4h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       testSteps:
  #           1. Create custom button group with the Object type
  #           2. Create a custom button with expression (Tag)
  #               a. Enablement Expression
  #               b. Visibility Expression
  #           3. Navigate to object Detail page
  #           4. Check: button should not enable/visible without tag
  #           5. Check: button should enable/visible with tag
  # 
  #   Bugzilla:
  #       1705141
  #   
  group,obj_type = button_group
  exp = {"expression" => {"tag" => "My Company Tags : Department", "value" => "Engineering"}}
  disabled_txt = "Tag - My Company Tags : Department : Engineering"
  button = group.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_hvr_"), display_for: "Single entity", system: "Request", request: "InspectMe", None: exp)
  request.addfinalizer(button.delete_if_exists)
  tag_cat = appliance.collections.categories.instantiate(name: "department", display_name: "Department")
  tag = tag_cat.collections.tags.instantiate(name: "engineering", display_name: "Engineering")
  view = navigate_to(setup_obj, "Details")
  custom_button_group = Dropdown(view, group.text)
  if setup_obj.get_tags().include?(tag)
    if expression == "enablement"
      raise unless custom_button_group.item_enabled(button.text)
      setup_obj.remove_tag(tag)
      raise unless !custom_button_group.is_enabled
      raise unless re.search(disabled_txt, custom_button_group.hover)
    else
      if expression == "visibility"
        raise unless custom_button_group.to_a.include?(button.text)
        setup_obj.remove_tag(tag)
        raise unless !custom_button_group.is_displayed
      end
    end
  else
    if expression == "enablement"
      raise unless !custom_button_group.is_enabled
      raise unless re.search(disabled_txt, custom_button_group.hover)
      setup_obj.add_tag(tag)
      raise unless custom_button_group.item_enabled(button.text)
    else
      if expression == "visibility"
        raise unless !custom_button_group.is_displayed
        setup_obj.add_tag(tag)
        raise unless custom_button_group.to_a.include?(button.text)
      end
    end
  end
end
def test_custom_button_open_url_infra_obj(request, setup_obj, button_group, method)
  #  Test Open url functionality of custom button.
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/2h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       testSteps:
  #           1. Appliance with Infra provider
  #           2. Create ruby method for url functionality
  #           3. Create custom button group with the Object type
  #           4. Create a custom button with open_url option and respective method
  #           5. Navigate to object Detail page
  #           6. Execute custom button
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5.
  #           6. New tab should open with respective url
  #   
  group,obj_type = button_group
  button = group.buttons.create(text: fauxfactory.gen_alphanumeric(start: "grp_"), hover: fauxfactory.gen_alphanumeric(15, start: "grp_hvr_"), open_url: true, display_for: "Single entity", system: "Request", request: method.name)
  request.addfinalizer(button.delete_if_exists)
  view = navigate_to(setup_obj, "Details")
  custom_button_group = Dropdown(view, group.hover)
  raise unless custom_button_group.has_item(button.text)
  initial_count = view.browser.selenium.window_handles.size
  main_window = view.browser.selenium.current_window_handle
  custom_button_group.item_select(button.text)
  wait_for(lambda{|| view.browser.selenium.window_handles.size > initial_count}, timeout: 120, message: "Check for window open")
  open_url_window = Set.new(view.browser.selenium.window_handles) - Set.new([main_window])
  view.browser.selenium.switch_to_window(open_url_window.pop())
  _reset_window = lambda do
    if view.browser.selenium.current_window_handle != main_window
      view.browser.selenium.close()
      view.browser.selenium.switch_to_window(main_window)
    end
  end
  raise unless view.browser.url.include?("example.com")
end
def test_custom_button_events_infra_obj(request, dialog, setup_obj, button_group, btn_dialog)
  # Test custom button events
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       testSteps:
  #           1. Create a Button Group
  #           2. Create custom button [with dialog/ without dialog]
  #           2. Execute button from respective location
  #           3. Assert event count
  # 
  #   Bugzilla:
  #       1668023
  #       1702490
  #       1685555
  #   
  group,obj_type = button_group
  dialog_ = is_bool(btn_dialog) ? dialog : nil
  button = group.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_hvr_"), dialog: dialog_, system: "Request", request: "InspectMe")
  request.addfinalizer(button.delete_if_exists)
  initial_count = setup_obj.get_button_events().size
  view = navigate_to(setup_obj, "Details")
  custom_button_group = Dropdown(view, group.hover)
  custom_button_group.item_select(button.text)
  if is_bool(btn_dialog)
    dialog_view = view.browser.create_view(TextInputDialogView, wait: "10s")
    dialog_view.submit.click()
  end
  view.browser.refresh()
  current_count = setup_obj.get_button_events().size
  raise unless current_count == initial_count + 1
end
