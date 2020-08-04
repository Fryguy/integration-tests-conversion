require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.tier(2),
  test_requirements.custom_button,
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.provider([VMwareProvider], {selector: ONE_PER_TYPE})
];

function setup_groups_buttons(appliance, provider) {
  let collection = appliance.collections.button_groups;
  let gp_buttons = {};

  for (let obj_type in ["PROVIDER", "VM_INSTANCE"]) {
    let obj;

    let gp = collection.create({
      text: fauxfactory.gen_alphanumeric({start: "grp_"}),
      hover: fauxfactory.gen_alphanumeric(15, {start: "grp_hvr_"}),
      type: collection.getattr(obj_type, null)
    });

    let button = gp.buttons.create({
      text: fauxfactory.gen_alphanumeric({start: "btn_"}),
      hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
      display_for: "Single and list",
      system: "Request",
      request: "InspectMe"
    });

    if (obj_type == "PROVIDER") {
      obj = provider
    } else {
      try {
        obj = appliance.provider_based_collection(provider).all()[0]
      } catch ($EXCEPTION) {
        if ($EXCEPTION instanceof IndexError) {
          pytest.skip("VM object not collected")
        } else {
          throw $EXCEPTION
        }
      }
    };

    gp_buttons[obj_type] = [gp, button, obj]
  };

  yield(gp_buttons);

  for (let button_group in gp_buttons.values()) {
    let [grp_, button_, _] = button_group;
    button_.delete_if_exists();
    grp_.delete_if_exists()
  }
};

function checks(obj_type_conf) {
  for (let [obj_type, conf] in obj_type_conf.to_a()) {
    let [gp, button, obj] = conf;
    obj.browser.refresh();
    if (!gp.exists) throw new ();
    if (!button.exists) throw new ();
    let view = navigate_to(button, "Details");
    if (view.text.text != button.text) throw new ();
    if (view.hover.text != button.hover) throw new ();

    for (let destination in ["All", "Details"]) {
      let nav_obj = (destination == "All" ? obj.parent : obj);

      if (is_bool(obj_type == "VM_INSTANCE" && destination == "All")) {
        destination = "VMsOnly"
      };

      view = navigate_to(nav_obj, destination);
      let custom_button_group = Dropdown(view, gp.hover);
      if (!custom_button_group.is_displayed) throw new ();
      if (!custom_button_group.has_item(button.text)) throw new ()
    }
  }
};

function test_custom_button_import_export(appliance, setup_groups_buttons) {
  //  Test custom button display on a targeted page
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/2h
  //       caseimportance: high
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: CustomButton
  //       tags: custom_button
  //       testSteps:
  //           1. Create custom buttons and groups
  //           2. Check for custom buttons in respective implementation location
  //           3. Export created custom buttons using rake command
  //               `rake evm:export:custom_buttons -- --directory /tmp/custom_buttons`
  //           4. Clean all created buttons and groups
  //           5. Check properly clean up or not
  //           6. Import exported custom button yaml file using import rake command
  //               `rake evm:import:custom_buttons -- --source /tmp/custom_buttons`
  //           7. Check for custom buttons and groups which was exported comes back to UI or not
  //           8. Check for custom buttons in respective implementation location
  //   
  checks(setup_groups_buttons);
  let dir_ = appliance.ssh_client.run_command("mkdir /tmp/custom_buttons");
  if (!dir_.success) throw new ();
  let export = appliance.ssh_client.run_command("cd /var/www/miq/vmdb/; rake evm:export:custom_buttons -- --directory /tmp/custom_buttons");
  if (!export.success) throw new ();

  for (let conf in setup_groups_buttons.values()) {
    let [gp, button, _] = conf;
    button.delete();
    if (!!button.exists) throw new ();
    gp.delete();
    if (!!gp.exists) throw new ()
  };

  let import_ = appliance.ssh_client.run_command("cd /var/www/miq/vmdb/; rake evm:import:custom_buttons -- --source /tmp/custom_buttons");
  if (!import_.success) throw new ();
  checks(setup_groups_buttons)
}
