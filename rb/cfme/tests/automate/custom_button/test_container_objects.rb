require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/tests/automate/custom_button'
include Cfme::Tests::Automate::Custom_button
require_relative 'cfme/tests/automate/custom_button'
include Cfme::Tests::Automate::Custom_button
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(2), test_requirements.custom_button, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([ContainersProvider], selector: ONE_PER_TYPE)]
CONTAINER_OBJECTS = ["PROVIDER", "CONTAINER_IMAGES", "CONTAINER_NODES", "CONTAINER_PODS", "CONTAINER_PROJECTS", "CONTAINER_TEMPLATES", "CONTAINER_VOLUMES"]
DISPLAY_NAV = {"Single entity" => ["Details"], "List" => ["All"], "Single and list" => ["All", "Details"]}
def button_group(appliance, request)
  collection = appliance.collections.button_groups
  button_gp = collection.create(text: fauxfactory.gen_alphanumeric(start: "grp_"), hover: fauxfactory.gen_alphanumeric(15, start: "grp_hvr_"), type: collection.getattr(request.param))
  yield([button_gp, request.param])
  button_gp.delete_if_exists()
end
def setup_obj(appliance, provider, button_group)
  #  Setup object for specific custom button object type.
  obj_type = button_group[1]
  begin
    if obj_type == "PROVIDER"
      obj = provider
    else
      obj = appliance.collections.getattr(obj_type.downcase()).all()[0]
    end
  rescue IndexError
    pytest.skip("Object not found for #{obj_type} type")
  end
  if is_bool(!obj.exists)
    pytest.skip("#{obj_type} object not exist")
  end
  return obj
end
def test_custom_button_display_container_obj(request, display, setup_obj, button_group)
  #  Test custom button display on a targeted page
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/4h
  #       caseimportance: critical
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
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
  button = group.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_grp_"), display_for: display, system: "Request", request: "InspectMe")
  request.addfinalizer(button.delete_if_exists)
  for destination in DISPLAY_NAV[display]
    obj = (destination == "All") ? setup_obj.parent : setup_obj
    view = navigate_to(obj, destination)
    custom_button_group = Dropdown(view, group.hover)
    raise unless custom_button_group.is_displayed
    raise unless custom_button_group.has_item(button.text)
  end
end
def test_custom_button_dialog_container_obj(appliance, dialog, request, setup_obj, button_group)
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
  #           8. Check request in automation log
  # 
  #   Bugzilla:
  #       1729903
  #       1732489
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
  raise unless appliance.ssh_client.run_command("echo -n \"\" > /var/www/miq/vmdb/log/automation.log")
  dialog_view.submit.click()
  if is_bool(!BZ(1732489, forced_streams: ["5.10", "5.11"]).blocks && obj_type == "PROVIDER")
    view.flash.assert_message("Order Request was Submitted")
  end
  begin
    wait_for(log_request_check, [appliance, 1], timeout: 300, message: "Check for expected request count", delay: 20)
  rescue TimedOutError
    raise "Expected 1 requests not found in automation log" unless false
  end
end
def test_custom_button_expression_container_obj(appliance, request, setup_obj, button_group, expression)
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
