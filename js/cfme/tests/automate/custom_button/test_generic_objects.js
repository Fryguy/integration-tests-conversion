require_relative("textwrap");
include(Textwrap);
require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(2),
  test_requirements.custom_button
];

const OBJECTS = ["USER", "GROUP", "TENANT"];

const DISPLAY_NAV = {
  "Single entity": ["Details"],
  List: ["All"],
  "Single and list": ["All", "Details"]
};

const SUBMIT = ["Submit all", "One by one"];

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

function setup_obj(appliance, button_group) {
  let obj;

  //  Setup object for specific custom button object type.
  let obj_type = button_group[1];

  if (obj_type == "USER") {
    obj = appliance.collections.users.instantiate({name: "Administrator"})
  } else if (obj_type == "GROUP") {
    obj = appliance.collections.groups.instantiate({description: "EvmGroup-super_administrator"})
  } else if (obj_type == "TENANT") {
    obj = appliance.collections.tenants.get_root_tenant()
  } else {
    logger.error(`No object collected for custom button object type '${obj_type}'`)
  };

  return obj
};

function method(custom_instance, button_group) {
  let [_, obj_type] = button_group;

  let target_obj_map = {
    USER: "$evm.root['user']",
    GROUP: "$evm.root['miq_group']",
    TENANT: "$evm.vmdb($evm.root['vmdb_object_type']).find_by(:id=>$evm.root['tenant_id'])"
  };

  let ruby_code = dedent(`
        # open external url with target object
        target_obj = ${target_obj_map[obj_type]}
        $evm.log(:info, \"Opening url\")
        target_obj.external_url = \"https://example.com\"
        `);
  yield(custom_instance.call(ruby_code))
};

function test_custom_button_display_evm_obj(request, display, setup_obj, button_group) {
  //  Test custom button display on a targeted page
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       caseimportance: critical
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
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
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
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

function test_custom_button_automate_evm_obj(appliance, request, submit, setup_obj, button_group) {
  //  Test custom button for automate and requests count as per submit
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       caseimportance: high
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: CustomButton
  //       tags: custom_button
  //       testSteps:
  //           1. Create custom button group with the Object type
  //           2. Create a custom button with specific submit option and Single and list display
  //           3. Navigate to object type pages (All and Details)
  //           4. Check for button group and button
  //           5. Select/execute button from group dropdown for selected entities
  //           6. Check for the proper flash message related to button execution
  //           7. Check automation log requests. Submitted as per selected submit option or not.
  //           8. Submit all: single request for all entities execution
  //           9. One by one: separate requests for all entities execution
  // 
  //   Bugzilla:
  //       1628224
  //       1642939
  //   
  let [group, obj_type] = button_group;

  let button = group.buttons.create({
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
    display_for: "Single and list",
    submit,
    system: "Request",
    request: "InspectMe"
  });

  request.addfinalizer(button.delete_if_exists);

  for (let destination in ["All", "Details"]) {
    let entity_count;
    let obj = (destination == "All" ? setup_obj.parent : setup_obj);
    let view = navigate_to(obj, destination);
    let custom_button_group = Dropdown(view, group.hover);
    if (!custom_button_group.has_item(button.text)) throw new ();

    if (destination == "All") {
      entity_count = [
        view.paginator.items_amount,
        view.paginator.items_per_page.min
      ];

      view.paginator.check_all()
    } else {
      entity_count = 1
    };

    if (!appliance.ssh_client.run_command("echo -n \"\" > /var/www/miq/vmdb/log/automation.log")) {
      throw new ()
    };

    custom_button_group.item_select(button.text);
    let diff = (appliance.version < "5.10" ? "executed" : "launched");
    view.flash.assert_message(`\"${button.text}\" was ${diff}`);
    let expected_count = (submit == "Submit all" ? 1 : entity_count);

    try {
      wait_for(log_request_check, [appliance, expected_count], {
        timeout: 120,
        message: "Check for expected request count",
        delay: 10
      })
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof TimedOutError) {
        if (!false) {
          throw "Expected {} requests not found in automation log".format(expected_count.to_s)
        }
      } else {
        throw $EXCEPTION
      }
    }
  }
};

function test_custom_button_dialog_evm_obj(appliance, dialog, request, setup_obj, button_group) {
  //  Test custom button with dialog and InspectMe method
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       caseimportance: high
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
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
  view.wait_displayed("60s");
  view.flash.assert_message("Order Request was Submitted");

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

function test_custom_button_expression_evm_obj(appliance, request, setup_obj, button_group, expression) {
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
};

function test_custom_button_open_url_evm_obj(request, setup_obj, button_group, method) {
  //  Test Open url functionality of custom button.
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/2h
  //       caseimportance: high
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.11
  //       casecomponent: CustomButton
  //       tags: custom_button
  //       testSteps:
  //           1. Create ruby method for url functionality
  //           2. Create custom button group with the Object type
  //           3. Create a custom button with open_url option and respective method
  //           4. Navigate to object Detail page
  //           5. Execute custom button
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5. New tab should open with respective url
  // 
  //   Bugzilla:
  //       1550002
  //   
  let [group, obj_type] = button_group;

  let button = group.buttons.create({
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
    open_url: true,
    system: "Request",
    request: method.name
  });

  request.addfinalizer(button.delete_if_exists);
  let view = navigate_to(setup_obj, "Details");
  let custom_button_group = Dropdown(view, group.hover);
  if (!custom_button_group.has_item(button.text)) throw new ();
  let initial_count = view.browser.window_handles.size;
  let main_window = view.browser.current_window_handle;
  custom_button_group.item_select(button.text);

  wait_for(
    () => view.browser.window_handles.size > initial_count,
    {timeout: 30, message: "Check for window open"}
  );

  let open_url_window = (new Set(view.browser.window_handles) - new Set([main_window])).pop();
  view.browser.switch_to_window(open_url_window);

  let _reset_window = () => {
    view.browser.close_window(open_url_window);
    return view.browser.switch_to_window(main_window)
  };

  if (!view.browser.url.include("example.com")) throw new ()
}
