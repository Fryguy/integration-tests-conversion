require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
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
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(2),
  test_requirements.custom_button,
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.provider([OpenStackProvider], {selector: ONE_PER_TYPE})
];

const CLOUD_OBJECTS = [
  "PROVIDER",
  "VM_INSTANCE",
  "TEMPLATE_IMAGE",
  "AZONE",
  "CLOUD_NETWORK",
  "CLOUD_SUBNET",
  "SECURITY_GROUP",
  "ROUTER",
  "CLOUD_OBJECT_STORE_CONTAINER"
];

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

function setup_objs(button_group, provider) {
  let obj;

  //  Setup object for specific custom button object type.
  let obj_type = button_group[1];

  if (obj_type == "PROVIDER") {
    let block_coll = provider.appliance.collections.block_managers.filter({provider: provider});
    let block_manager = block_coll.all()[0];
    let object_coll = provider.appliance.collections.object_managers.filter({provider: provider});
    let object_manager = object_coll.all()[0];
    let network_manager = provider.appliance.collections.network_providers.all()[0];
    obj = [provider, network_manager, block_manager, object_manager]
  } else if (obj_type == "VM_INSTANCE") {
    obj = [provider.appliance.provider_based_collection(provider).all()[0]]
  } else if (obj_type == "TEMPLATE_IMAGE") {
    obj = [provider.appliance.collections.cloud_images.all()[0]]
  } else if (obj_type == "AZONE") {
    obj = [provider.appliance.collections.cloud_av_zones.filter({provider: provider}).all()[0]]
  } else if (obj_type == "CLOUD_SUBNET") {
    obj = [provider.appliance.collections.network_subnets.all()[0]]
  } else if (obj_type == "SECURITY_GROUP") {
    obj = [provider.appliance.collections.network_security_groups.all()[0]]
  } else if (obj_type == "ROUTER") {
    obj = [provider.appliance.collections.network_routers.all()[0]]
  } else if (obj_type == "CLOUD_OBJECT_STORE_CONTAINER") {
    obj = [provider.appliance.collections.object_store_containers.filter({provider: provider}).all()[0]]
  } else if (obj_type == "CLOUD_NETWORK") {
    obj = [provider.appliance.collections.cloud_networks.all()[0]]
  } else {
    logger.error(`No object collected for custom button object type '${obj_type}'`)
  };

  return obj
};

function test_custom_button_display_cloud_obj(appliance, request, display, setup_objs, button_group) {
  //  Test custom button display on a targeted page
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       caseimportance: critical
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.8
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

  for (let setup_obj in setup_objs) {
    for (let destination in DISPLAY_NAV[display]) {
      let obj = (destination == "All" ? setup_obj.parent : setup_obj);
      let view = navigate_to(obj, destination);
      let custom_button_group = Dropdown(view, group.hover);
      if (!custom_button_group.is_displayed) throw new ();
      if (!custom_button_group.has_item(button.text)) throw new ()
    }
  }
};

function test_custom_button_dialog_cloud_obj(appliance, dialog, request, setup_objs, button_group) {
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
  //           1. Simple TextInput service dialog
  //           2. Create custom button group with the Object type
  //           3. Create a custom button with service dialog
  //           4. Navigate to object Details page
  //           5. Check for button group and button
  //           6. Select/execute button from group dropdown for selected entities
  //           7. Fill dialog and submit
  //           8. Check for the proper flash message related to button execution
  // 
  //   Bugzilla:
  //       1635797
  //       1555331
  //       1574403
  //       1640592
  //       1710350
  //       1732436
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

  for (let setup_obj in setup_objs) {
    let view = navigate_to(setup_obj, "Details");
    let custom_button_group = Dropdown(view, group.hover);
    if (!custom_button_group.has_item(button.text)) throw new ();
    custom_button_group.item_select(button.text);

    let dialog_view = view.browser.create_view(
      TextInputDialogView,
      {wait: "10s"}
    );

    dialog_view.service_name.fill("Custom Button Execute");

    if (!appliance.ssh_client.run_command("echo -n \"\" > /var/www/miq/vmdb/log/automation.log")) {
      throw new ()
    };

    dialog_view.submit.click();

    if (is_bool(!BZ(1732436, {forced_streams: ["5.10", "5.11"]}).blocks && obj_type == "PROVIDER")) {
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
  }
};

function test_custom_button_automate_cloud_obj(appliance, request, submit, setup_objs, button_group) {
  //  Test custom button for automate and requests count as per submit
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
  //           2. Create a custom button with specific submit option and Single and list display
  //           3. Navigate to object type pages (All and Details)
  //           4. Check for button group and button
  //           5. Select/execute button from group dropdown for selected entities
  //           6. Check for the proper flash message related to button execution
  //           7. Check automation log requests. Submitted as per selected submit option or not.
  //           8. Submit all: single request for all entities execution
  //           9 One by one: separate requests for all entities execution
  // 
  //   Bugzilla:
  //       1628224
  //       1642147
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

  for (let setup_obj in setup_objs) {
    for (let destination in ["All", "Details"]) {
      let entity_count;
      let obj = (destination == "All" ? setup_obj.parent : setup_obj);
      let view = navigate_to(obj, destination);
      let custom_button_group = Dropdown(view, group.hover);
      if (!custom_button_group.has_item(button.text)) throw new ();

      if (destination == "All") {
        try {
          let paginator = view.paginator
        } catch ($EXCEPTION) {
          if ($EXCEPTION instanceof NoMethodError) {
            let paginator = view.entities.paginator
          } else {
            throw $EXCEPTION
          }
        };

        entity_count = [paginator.items_amount, paginator.items_per_page.min];

        // pass
        try {
          if (setup_obj.name.include("Manager")) entity_count = 1
        } catch ($EXCEPTION) {
          if ($EXCEPTION instanceof NoMethodError) {

          } else {
            throw $EXCEPTION
          }
        };

        paginator.check_all()
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
          timeout: 300,
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
  }
};

function test_custom_button_expression_cloud_obj(appliance, request, setup_objs, button_group, expression) {
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

  for (let setup_obj in setup_objs) {
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
};

function test_custom_button_events_cloud_obj(request, dialog, setup_objs, button_group, btn_dialog) {
  // Test custom button events
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: CustomButton
  //       tags: custom_button
  //       testSteps:
  //           1. Create a Button Group
  //           2. Create custom button [with dialog/ without dialog]
  //           2. Execute button from respective location
  //           3. Assert event count
  // 
  //   Bugzilla:
  //       1668023
  //       1702490
  //       1680525
  //   
  let [group, obj_type] = button_group;
  let dialog_ = (is_bool(btn_dialog) ? dialog : null);

  let button = group.buttons.create({
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
    dialog: dialog_,
    system: "Request",
    request: "InspectMe"
  });

  request.addfinalizer(button.delete_if_exists);

  for (let setup_obj in setup_objs) {
    let initial_count = setup_obj.get_button_events().size;
    let view = navigate_to(setup_obj, "Details");
    let custom_button_group = Dropdown(view, group.hover);
    custom_button_group.item_select(button.text);

    if (is_bool(btn_dialog)) {
      let dialog_view = view.browser.create_view(
        TextInputDialogView,
        {wait: "10s"}
      );

      dialog_view.submit.click()
    };

    view.browser.refresh();
    let current_count = setup_obj.get_button_events().size;
    if (current_count != initial_count + 1) throw new ()
  }
}
