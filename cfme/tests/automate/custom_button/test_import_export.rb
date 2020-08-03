require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(2), test_requirements.custom_button, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([VMwareProvider], selector: ONE_PER_TYPE)]
def setup_groups_buttons(appliance, provider)
  collection = appliance.collections.button_groups
  gp_buttons = {}
  for obj_type in ["PROVIDER", "VM_INSTANCE"]
    gp = collection.create(text: fauxfactory.gen_alphanumeric(start: "grp_"), hover: fauxfactory.gen_alphanumeric(15, start: "grp_hvr_"), type: collection.getattr(obj_type, nil))
    button = gp.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_hvr_"), display_for: "Single and list", system: "Request", request: "InspectMe")
    if obj_type == "PROVIDER"
      obj = provider
    else
      begin
        obj = appliance.provider_based_collection(provider).all()[0]
      rescue IndexError
        pytest.skip("VM object not collected")
      end
    end
    gp_buttons[obj_type] = [gp, button, obj]
  end
  yield gp_buttons
  for button_group in gp_buttons.values()
    grp_,button_,_ = button_group
    button_.delete_if_exists()
    grp_.delete_if_exists()
  end
end
def checks(obj_type_conf)
  for (obj_type, conf) in obj_type_conf.to_a()
    gp,button,obj = conf
    obj.browser.refresh()
    raise unless gp.exists
    raise unless button.exists
    view = navigate_to(button, "Details")
    raise unless view.text.text == button.text
    raise unless view.hover.text == button.hover
    for destination in ["All", "Details"]
      nav_obj = (destination == "All") ? obj.parent : obj
      if is_bool(obj_type == "VM_INSTANCE" && destination == "All")
        destination = "VMsOnly"
      end
      view = navigate_to(nav_obj, destination)
      custom_button_group = Dropdown(view, gp.hover)
      raise unless custom_button_group.is_displayed
      raise unless custom_button_group.has_item(button.text)
    end
  end
end
def test_custom_button_import_export(appliance, setup_groups_buttons)
  #  Test custom button display on a targeted page
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/2h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       testSteps:
  #           1. Create custom buttons and groups
  #           2. Check for custom buttons in respective implementation location
  #           3. Export created custom buttons using rake command
  #               `rake evm:export:custom_buttons -- --directory /tmp/custom_buttons`
  #           4. Clean all created buttons and groups
  #           5. Check properly clean up or not
  #           6. Import exported custom button yaml file using import rake command
  #               `rake evm:import:custom_buttons -- --source /tmp/custom_buttons`
  #           7. Check for custom buttons and groups which was exported comes back to UI or not
  #           8. Check for custom buttons in respective implementation location
  #   
  checks(setup_groups_buttons)
  dir_ = appliance.ssh_client.run_command("mkdir /tmp/custom_buttons")
  raise unless dir_.success
  export = appliance.ssh_client.run_command("cd /var/www/miq/vmdb/; rake evm:export:custom_buttons -- --directory /tmp/custom_buttons")
  raise unless export.success
  for conf in setup_groups_buttons.values()
    gp,button,_ = conf
    button.delete()
    raise unless !button.exists
    gp.delete()
    raise unless !gp.exists
  end
  import_ = appliance.ssh_client.run_command("cd /var/www/miq/vmdb/; rake evm:import:custom_buttons -- --source /tmp/custom_buttons")
  raise unless import_.success
  checks(setup_groups_buttons)
end
