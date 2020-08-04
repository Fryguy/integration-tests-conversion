require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/ssh");
include(Cfme.Utils.Ssh);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(2),
  test_requirements.custom_button,
  pytest.mark.usefixtures("setup_provider_modscope"),

  pytest.mark.provider(
    [VMwareProvider],
    {selector: ONE, scope: "module"}
  )
];

const INFRA_OBJECTS = [
  "PROVIDER",
  "HOSTS",
  "VM_INSTANCE",
  "TEMPLATE_IMAGE",
  "DATASTORES",
  "CLUSTERS",
  "SWITCH"
];

const INVENTORY = ["Localhost", "Target Machine", "Specific Hosts"];
const ANSIBLE_FILE = "~/test_ansible_file";

function button_group(appliance, request) {
  let collection = appliance.collections.button_groups;

  let button_gp = collection.create({
    text: fauxfactory.gen_alphanumeric({start: "grp_"}),
    hover: fauxfactory.gen_alphanumeric({start: "hvr_"}),
    type: collection.getattr(request.param)
  });

  yield([button_gp, request.param]);
  button_gp.delete_if_exists()
};

function setup_obj(button_group, provider) {
  //  Setup object for specific custom button object type.
  let obj_type = button_group[1];

  try {
    if (obj_type == "PROVIDER") {
      let obj = provider
    } else if (obj_type == "VM_INSTANCE") {
      let obj = provider.appliance.provider_based_collection(provider).all()[0]
    } else if (obj_type == "TEMPLATE_IMAGE") {
      let obj = provider.appliance.collections.infra_templates.all()[0]
    } else if (obj_type == "SWITCH") {
      let obj = provider.appliance.collections.infra_switches.all()[0]
    } else {
      let obj = provider.appliance.collections.getattr(obj_type.downcase()).all()[0]
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof IndexError) {
      pytest.skip(`Object not found for ${obj_type} type`)
    } else {
      throw $EXCEPTION
    }
  };

  return obj
};

function test_custom_button_ansible_automate_infra_obj(request, appliance, inventory, setup_obj, button_group, ansible_catalog_item_create_empty_file, target_machine, target_machine_ansible_creds) {
  let cred_name, hostname, username, password;

  //  Test ansible custom button for with specific inventory execution
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       startsin: 5.9
  //       casecomponent: CustomButton
  //       tags: custom_button
  //       setup:
  //           1. Setup Target Machine with pingable hostname
  //           2. Create catalog with ansible catalog item
  //       testSteps:
  //           1. Create custom button group with the Object type
  //           2. Create a custom button with specific inventory
  //              (localhost/ Target Machine/ Specific Host)
  //           3. Navigate to object Details page
  //           4. Check for button group and button
  //           5. Select/execute button from group dropdown for selected entities
  //           6. Fill dialog with proper credentials and hostname
  //           7. Check for the proper flash message
  //           8. Check operation perform on target machine or not (here create test file).
  //   
  let [group, obj_type] = button_group;

  if (inventory == "Localhost") {
    cred_name = "CFME Default Credential";
    hostname = appliance.hostname;
    username = credentials.ssh.username;
    password = credentials.ssh.password
  } else {
    cred_name = target_machine_ansible_creds.name;
    hostname = target_machine.hostname;
    username = target_machine.username;
    password = target_machine.password
  };

  let button = group.buttons.create({
    type: "Ansible Playbook",
    playbook_cat_item: ansible_catalog_item_create_empty_file.name,
    inventory,
    hosts: (inventory == "Specific Hosts" ? target_machine.hostname : null),
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric({start: "hover_"})
  });

  request.addfinalizer(button.delete_if_exists);
  let entity = (inventory == "Target Machine" ? target_machine.vm : setup_obj);
  let view = navigate_to(entity, "Details");
  let custom_button_group = Dropdown(view, group.hover);
  if (!custom_button_group.has_item(button.text)) throw new ();
  custom_button_group.item_select(button.text);

  let dialog_view = view.browser.create_view(
    CredsHostsDialogView,
    {wait: "20s"}
  );

  dialog_view.fill({machine_credential: cred_name});

  SSHClient({hostname, username, password}, (client) => {
    client.remove_file(ANSIBLE_FILE);
    dialog_view.submit.click();
    view.flash.assert_success_message("Order Request was Submitted");

    try {
      wait_for(client.is_file_available, {
        func_args: [ANSIBLE_FILE],
        delay: 5,
        timeout: 240,
        message: `Waiting for ${ANSIBLE_FILE} file`
      })
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof TimedOutError) {
        pytest.fail(`Waiting timeout: unable to locate ${ANSIBLE_FILE} on host ${hostname}`)
      } else {
        throw $EXCEPTION
      }
    }
  })
}
