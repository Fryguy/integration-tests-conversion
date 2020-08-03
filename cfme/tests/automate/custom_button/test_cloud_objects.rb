require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
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
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(2), test_requirements.custom_button, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([OpenStackProvider], selector: ONE_PER_TYPE)]
CLOUD_OBJECTS = ["PROVIDER", "VM_INSTANCE", "TEMPLATE_IMAGE", "AZONE", "CLOUD_NETWORK", "CLOUD_SUBNET", "SECURITY_GROUP", "ROUTER", "CLOUD_OBJECT_STORE_CONTAINER"]
DISPLAY_NAV = {"Single entity" => ["Details"], "List" => ["All"], "Single and list" => ["All", "Details"]}
SUBMIT = ["Submit all", "One by one"]
def button_group(appliance, request)
  collection = appliance.collections.button_groups
  button_gp = collection.create(text: fauxfactory.gen_alphanumeric(start: "grp_"), hover: fauxfactory.gen_alphanumeric(15, start: "grp_hvr_"), type: collection.getattr(request.param))
  yield [button_gp, request.param]
  button_gp.delete_if_exists()
end
def setup_objs(button_group, provider)
  #  Setup object for specific custom button object type.
  obj_type = button_group[1]
  if obj_type == "PROVIDER"
    block_coll = provider.appliance.collections.block_managers.filter({"provider" => provider})
    block_manager = block_coll.all()[0]
    object_coll = provider.appliance.collections.object_managers.filter({"provider" => provider})
    object_manager = object_coll.all()[0]
    network_manager = provider.appliance.collections.network_providers.all()[0]
    obj = [provider, network_manager, block_manager, object_manager]
  else
    if obj_type == "VM_INSTANCE"
      obj = [provider.appliance.provider_based_collection(provider).all()[0]]
    else
      if obj_type == "TEMPLATE_IMAGE"
        obj = [provider.appliance.collections.cloud_images.all()[0]]
      else
        if obj_type == "AZONE"
          obj = [provider.appliance.collections.cloud_av_zones.filter({"provider" => provider}).all()[0]]
        else
          if obj_type == "CLOUD_SUBNET"
            obj = [provider.appliance.collections.network_subnets.all()[0]]
          else
            if obj_type == "SECURITY_GROUP"
              obj = [provider.appliance.collections.network_security_groups.all()[0]]
            else
              if obj_type == "ROUTER"
                obj = [provider.appliance.collections.network_routers.all()[0]]
              else
                if obj_type == "CLOUD_OBJECT_STORE_CONTAINER"
                  obj = [provider.appliance.collections.object_store_containers.filter({"provider" => provider}).all()[0]]
                else
                  if obj_type == "CLOUD_NETWORK"
                    obj = [provider.appliance.collections.cloud_networks.all()[0]]
                  else
                    logger.error()
                  end
                end
              end
            end
          end
        end
      end
    end
  end
  return obj
end
def test_custom_button_display_cloud_obj(appliance, request, display, setup_objs, button_group)
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
  for setup_obj in setup_objs
    for destination in DISPLAY_NAV[display]
      obj = (destination == "All") ? setup_obj.parent : setup_obj
      view = navigate_to(obj, destination)
      custom_button_group = Dropdown(view, group.hover)
      raise unless custom_button_group.is_displayed
      raise unless custom_button_group.has_item(button.text)
    end
  end
end
def test_custom_button_dialog_cloud_obj(appliance, dialog, request, setup_objs, button_group)
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
  #           1. Simple TextInput service dialog
  #           2. Create custom button group with the Object type
  #           3. Create a custom button with service dialog
  #           4. Navigate to object Details page
  #           5. Check for button group and button
  #           6. Select/execute button from group dropdown for selected entities
  #           7. Fill dialog and submit
  #           8. Check for the proper flash message related to button execution
  # 
  #   Bugzilla:
  #       1635797
  #       1555331
  #       1574403
  #       1640592
  #       1710350
  #       1732436
  #   
  group,obj_type = button_group
  button = group.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_hvr_"), dialog: dialog, system: "Request", request: "InspectMe")
  request.addfinalizer(button.delete_if_exists)
  for setup_obj in setup_objs
    view = navigate_to(setup_obj, "Details")
    custom_button_group = Dropdown(view, group.hover)
    raise unless custom_button_group.has_item(button.text)
    custom_button_group.item_select(button.text)
    dialog_view = view.browser.create_view(TextInputDialogView, wait: "10s")
    dialog_view.service_name.fill("Custom Button Execute")
    raise unless appliance.ssh_client.run_command("echo -n \"\" > /var/www/miq/vmdb/log/automation.log")
    dialog_view.submit.click()
    if is_bool(!BZ(1732436, forced_streams: ["5.10", "5.11"]).blocks && obj_type == "PROVIDER")
      view.flash.assert_message("Order Request was Submitted")
    end
    begin
      wait_for(log_request_check, [appliance, 1], timeout: 300, message: "Check for expected request count", delay: 20)
    rescue TimedOutError
      raise "Expected 1 requests not found in automation log" unless false
    end
  end
end
def test_custom_button_automate_cloud_obj(appliance, request, submit, setup_objs, button_group)
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
  #           9 One by one: separate requests for all entities execution
  # 
  #   Bugzilla:
  #       1628224
  #       1642147
  #   
  group,obj_type = button_group
  button = group.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_hvr_"), display_for: "Single and list", submit: submit, system: "Request", request: "InspectMe")
  request.addfinalizer(button.delete_if_exists)
  for setup_obj in setup_objs
    for destination in ["All", "Details"]
      obj = (destination == "All") ? setup_obj.parent : setup_obj
      view = navigate_to(obj, destination)
      custom_button_group = Dropdown(view, group.hover)
      raise unless custom_button_group.has_item(button.text)
      if destination == "All"
        begin
          paginator = view.paginator
        rescue NoMethodError
          paginator = view.entities.paginator
        end
        entity_count = paginator.items_amount, paginator.items_per_page.min
        begin
          if setup_obj.name.include?("Manager")
            entity_count = 1
          end
        rescue NoMethodError
          # pass
        end
        paginator.check_all()
      else
        entity_count = 1
      end
      raise unless appliance.ssh_client.run_command("echo -n \"\" > /var/www/miq/vmdb/log/automation.log")
      custom_button_group.item_select(button.text)
      diff = (appliance.version < "5.10") ? "executed" : "launched"
      view.flash.assert_message()
      expected_count = (submit == "Submit all") ? 1 : entity_count
      begin
        wait_for(log_request_check, [appliance, expected_count], timeout: 300, message: "Check for expected request count", delay: 10)
      rescue TimedOutError
        raise "Expected {} requests not found in automation log".format(expected_count.to_s) unless false
      end
    end
  end
end
def test_custom_button_expression_cloud_obj(appliance, request, setup_objs, button_group, expression)
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
  for setup_obj in setup_objs
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
end
def test_custom_button_events_cloud_obj(request, dialog, setup_objs, button_group, btn_dialog)
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
  #       1680525
  #   
  group,obj_type = button_group
  dialog_ = is_bool(btn_dialog) ? dialog : nil
  button = group.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_hvr_"), dialog: dialog_, system: "Request", request: "InspectMe")
  request.addfinalizer(button.delete_if_exists)
  for setup_obj in setup_objs
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
end
