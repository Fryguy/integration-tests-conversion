require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(2),
  test_requirements.custom_button,
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.provider([ContainersProvider], {selector: ONE_PER_TYPE})
];

const CONTAINER_OBJECTS = [
  "PROVIDER",
  "CONTAINER_IMAGES",
  "CONTAINER_NODES",
  "CONTAINER_PODS",
  "CONTAINER_PROJECTS",
  "CONTAINER_TEMPLATES",
  "CONTAINER_VOLUMES"
];

const DISPLAY_NAV = {
  "Single entity": ["Details"],
  List: ["All"],
  "Single and list": ["All", "Details"]
};

function button_group(appliance, request) {
  let collection = appliance.collections.button_groups;

  let button_gp = collection.create({
    text: fauxfactory.gen_alphanumeric({start: "grp_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "grp_hvr_"}),
    type: collection.getattr(request.param)
  });

  yield([button_gp, request.param]);
  button_gp.delete_if_exists()
};

function setup_obj(appliance, provider, button_group) {
  //  Setup object for specific custom button object type.
  let obj_type = button_group[1];

  try {
    if (obj_type == "PROVIDER") {
      let obj = provider
    } else {
      let obj = appliance.collections.getattr(obj_type.downcase()).all()[0]
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof IndexError) {
      pytest.skip(`Object not found for ${obj_type} type`)
    } else {
      throw $EXCEPTION
    }
  };

  if (is_bool(!obj.exists)) pytest.skip(`${obj_type} object not exist`);
  return obj
};

function test_custom_button_display_container_obj(request, display, setup_obj, button_group) {
  //  Test custom button display on a targeted page
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       caseimportance: critical
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.9
  //       casecomponent: CustomButton
  //       tags: custom_button
  //       testSteps:
  //           1. Create custom button group with the Object type
  //           2. Create a custom button with specific display
  //           3. Navigate to object type page as per display selected
  //           4. Single entity: Details page of the entity
  //           5. List: All page of the entity
  //           6. Single and list: Both All and Details page of the entity
  //           7. Check for button group and button
  //   
  let [group, obj_type] = button_group;

  let button = group.buttons.create({
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_grp_"}),
    display_for: display,
    system: "Request",
    request: "InspectMe"
  });

  request.addfinalizer(button.delete_if_exists);

  for (let destination in DISPLAY_NAV[display]) {
    let obj = (destination == "All" ? setup_obj.parent : setup_obj);
    let view = navigate_to(obj, destination);
    let custom_button_group = Dropdown(view, group.hover);
    if (!custom_button_group.is_displayed) throw new ();
    if (!custom_button_group.has_item(button.text)) throw new ()
  }
};

function test_custom_button_dialog_container_obj(appliance, dialog, request, setup_obj, button_group) {
  //  Test custom button with dialog and InspectMe method
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       caseimportance: high
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.9
  //       casecomponent: CustomButton
  //       tags: custom_button
  //       testSteps:
  //           1. Create custom button group with the Object type
  //           2. Create a custom button with service dialog
  //           3. Navigate to object Details page
  //           4. Check for button group and button
  //           5. Select/execute button from group dropdown for selected entities
  //           6. Fill dialog and submit
  //           7. Check for the proper flash message related to button execution
  //           8. Check request in automation log
  // 
  //   Bugzilla:
  //       1729903
  //       1732489
  //   
  let [group, obj_type] = button_group;

  let button = group.buttons.create({
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
    dialog,
    system: "Request",
    request: "InspectMe"
  });

  request.addfinalizer(button.delete_if_exists);
  let view = navigate_to(setup_obj, "Details");
  let custom_button_group = Dropdown(view, group.hover);
  if (!custom_button_group.has_item(button.text)) throw new ();
  custom_button_group.item_select(button.text);

  let dialog_view = view.browser.create_view(
    TextInputDialogView,
    {wait: "10s"}
  );

  if (!dialog_view.service_name.fill("Custom Button Execute")) throw new ();

  if (!appliance.ssh_client.run_command("echo -n \"\" > /var/www/miq/vmdb/log/automation.log")) {
    throw new ()
  };

  dialog_view.submit.click();

  if (is_bool(!BZ(1732489, {forced_streams: ["5.10", "5.11"]}).blocks && obj_type == "PROVIDER")) {
    view.flash.assert_message("Order Request was Submitted")
  };

  try {
    wait_for(log_request_check, [appliance, 1], {
      timeout: 300,
      message: "Check for expected request count",
      delay: 20
    })
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      if (!false) throw "Expected 1 requests not found in automation log"
    } else {
      throw $EXCEPTION
    }
  }
};

function test_custom_button_expression_container_obj(appliance, request, setup_obj, button_group, expression) {
  //  Test custom button as per expression enablement/visibility.
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.9
  //       casecomponent: CustomButton
  //       tags: custom_button
  //       testSteps:
  //           1. Create custom button group with the Object type
  //           2. Create a custom button with expression (Tag)
  //               a. Enablement Expression
  //               b. Visibility Expression
  //           3. Navigate to object Detail page
  //           4. Check: button should not enable/visible without tag
  //           5. Check: button should enable/visible with tag
  //   
  let [group, obj_type] = button_group;

  let exp = {expression: {
    tag: "My Company Tags : Department",
    value: "Engineering"
  }};

  let disabled_txt = "Tag - My Company Tags : Department : Engineering";

  let button = group.buttons.create({
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
    display_for: "Single entity",
    system: "Request",
    request: "InspectMe",
    None: exp
  });

  request.addfinalizer(button.delete_if_exists);

  let tag_cat = appliance.collections.categories.instantiate({
    name: "department",
    display_name: "Department"
  });

  let tag = tag_cat.collections.tags.instantiate({
    name: "engineering",
    display_name: "Engineering"
  });

  let view = navigate_to(setup_obj, "Details");
  let custom_button_group = Dropdown(view, group.text);

  if (setup_obj.get_tags().include(tag)) {
    if (expression == "enablement") {
      if (!custom_button_group.item_enabled(button.text)) throw new ();
      setup_obj.remove_tag(tag);
      if (!!custom_button_group.is_enabled) throw new ();
      if (!re.search(disabled_txt, custom_button_group.hover)) throw new ()
    } else if (expression == "visibility") {
      if (!custom_button_group.to_a.include(button.text)) throw new ();
      setup_obj.remove_tag(tag);
      if (!!custom_button_group.is_displayed) throw new ()
    }
  } else if (expression == "enablement") {
    if (!!custom_button_group.is_enabled) throw new ();
    if (!re.search(disabled_txt, custom_button_group.hover)) throw new ();
    setup_obj.add_tag(tag);
    if (!custom_button_group.item_enabled(button.text)) throw new ()
  } else if (expression == "visibility") {
    if (!!custom_button_group.is_displayed) throw new ();
    setup_obj.add_tag(tag);
    if (!custom_button_group.to_a.include(button.text)) throw new ()
  }
}
