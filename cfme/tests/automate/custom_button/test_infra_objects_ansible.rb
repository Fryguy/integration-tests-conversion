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
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/ssh'
include Cfme::Utils::Ssh
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(2), test_requirements.custom_button, pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([VMwareProvider], selector: ONE, scope: "module")]
INFRA_OBJECTS = ["PROVIDER", "HOSTS", "VM_INSTANCE", "TEMPLATE_IMAGE", "DATASTORES", "CLUSTERS", "SWITCH"]
INVENTORY = ["Localhost", "Target Machine", "Specific Hosts"]
ANSIBLE_FILE = "~/test_ansible_file"
def button_group(appliance, request)
  collection = appliance.collections.button_groups
  button_gp = collection.create(text: fauxfactory.gen_alphanumeric(start: "grp_"), hover: fauxfactory.gen_alphanumeric(start: "hvr_"), type: collection.getattr(request.param))
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
def test_custom_button_ansible_automate_infra_obj(request, appliance, inventory, setup_obj, button_group, ansible_catalog_item_create_empty_file, target_machine, target_machine_ansible_creds)
  #  Test ansible custom button for with specific inventory execution
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/4h
  #       startsin: 5.9
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       setup:
  #           1. Setup Target Machine with pingable hostname
  #           2. Create catalog with ansible catalog item
  #       testSteps:
  #           1. Create custom button group with the Object type
  #           2. Create a custom button with specific inventory
  #              (localhost/ Target Machine/ Specific Host)
  #           3. Navigate to object Details page
  #           4. Check for button group and button
  #           5. Select/execute button from group dropdown for selected entities
  #           6. Fill dialog with proper credentials and hostname
  #           7. Check for the proper flash message
  #           8. Check operation perform on target machine or not (here create test file).
  #   
  group,obj_type = button_group
  if inventory == "Localhost"
    cred_name = "CFME Default Credential"
    hostname = appliance.hostname
    username = credentials["ssh"]["username"]
    password = credentials["ssh"]["password"]
  else
    cred_name = target_machine_ansible_creds.name
    hostname = target_machine.hostname
    username = target_machine.username
    password = target_machine.password
  end
  button = group.buttons.create(type: "Ansible Playbook", playbook_cat_item: ansible_catalog_item_create_empty_file.name, inventory: inventory, hosts: (inventory == "Specific Hosts") ? target_machine.hostname : nil, text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(start: "hover_"))
  request.addfinalizer(button.delete_if_exists)
  entity = (inventory == "Target Machine") ? target_machine.vm : setup_obj
  view = navigate_to(entity, "Details")
  custom_button_group = Dropdown(view, group.hover)
  raise unless custom_button_group.has_item(button.text)
  custom_button_group.item_select(button.text)
  dialog_view = view.browser.create_view(CredsHostsDialogView, wait: "20s")
  dialog_view.fill({"machine_credential" => cred_name})
  SSHClient(hostname: hostname, username: username, password: password) {|client|
    client.remove_file(ANSIBLE_FILE)
    dialog_view.submit.click()
    view.flash.assert_success_message("Order Request was Submitted")
    begin
      wait_for(client.is_file_available, func_args: [ANSIBLE_FILE], delay: 5, timeout: 240, message: "Waiting for #{ANSIBLE_FILE} file")
    rescue TimedOutError
      pytest.fail("Waiting timeout: unable to locate #{ANSIBLE_FILE} on host #{hostname}")
    end
  }
end
