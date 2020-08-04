require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/services/myservice");
include(Cfme.Services.Myservice);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance/implementations/ssui");
include(Cfme.Utils.Appliance.Implementations.Ssui);
var ssui_nav = navigate_to.bind(this);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
var ui_nav = navigate_to.bind(this);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(2),
  test_requirements.custom_button
];

const GENERIC_SSUI_UNCOLLECT = "Generic object custom button not supported by SSUI";
const OBJECTS = ["SERVICE", "GENERIC"];

const DISPLAY_NAV = {
  "Single entity": ["Details"],
  List: ["All"],
  "Single and list": ["All", "Details"]
};

const SUBMIT = ["Submit all", "One by one"];

const TEXT_DISPLAY = {
  group: {group_display: false, btn_display: true},
  button: {group_display: true, btn_display: false}
};

function objects(appliance, add_generic_object_to_service) {
  let instance = add_generic_object_to_service;

  let obj_dest = {
    GENERIC: {
      All: [instance.my_service, "GenericObjectInstance"],
      Details: [instance, "MyServiceDetails"]
    },

    SERVICE: {
      All: [instance.my_service, "All"],
      Details: [instance.my_service, "Details"]
    }
  };

  yield(obj_dest)
};

function button_group(appliance, request) {
  appliance.context.use(ViaUI, () => {
    let collection = appliance.collections.button_groups;

    let button_gp = collection.create({
      text: fauxfactory.gen_alphanumeric({start: "grp_"}),
      hover: fauxfactory.gen_alphanumeric(15, {start: "grp_hvr_"}),
      type: collection.getattr(request.param)
    });

    yield([button_gp, request.param]);
    button_gp.delete_if_exists()
  })
};

function serv_button_group(appliance, request) {
  appliance.context.use(ViaUI, () => {
    let collection = appliance.collections.button_groups;

    let button_gp = collection.create({
      text: fauxfactory.gen_numeric_string({start: "grp_"}),
      hover: fauxfactory.gen_alphanumeric(15, {start: "grp_hvr_"}),
      display: TEXT_DISPLAY[request.param].group_display,
      type: collection.getattr("SERVICE")
    });

    let button = button_gp.buttons.create({
      text: fauxfactory.gen_numeric_string({start: "btn_"}),
      hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
      display: TEXT_DISPLAY[request.param].btn_display,
      display_for: "Single and list",
      system: "Request",
      request: "InspectMe"
    });

    yield([button, button_gp]);
    button.delete_if_exists();
    button_gp.delete_if_exists()
  })
};

function service_button_group(appliance) {
  appliance.context.use(ViaUI, () => {
    let collection = appliance.collections.button_groups;

    let button_gp = collection.create({
      text: fauxfactory.gen_alphanumeric({start: "group_"}),
      hover: fauxfactory.gen_alphanumeric({start: "hover_"}),
      type: collection.getattr("SERVICE")
    });

    yield(button_gp);
    button_gp.delete_if_exists()
  })
};

function vis_enb_button_service(request, appliance, service_button_group) {
  // Create custom button on service type object with enablement/visibility expression
  let exp = {[request.param]: {
    tag: "My Company Tags : Department",
    value: "Engineering"
  }};

  appliance.context.use(ViaUI, () => {
    let button = service_button_group.buttons.create({
      text: fauxfactory.gen_alphanumeric({start: "btn_"}),
      hover: fauxfactory.gen_alphanumeric({start: "hover_"}),
      display_for: "Single entity",
      system: "Request",
      request: "InspectMe",
      None: exp
    });

    yield([service_button_group, button, request.param]);
    button.delete_if_exists()
  })
};

function test_custom_button_display_service_obj(request, appliance, context, display, objects, button_group) {
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
  //           3. Navigate to object type page as per display selected [For service SSUI]
  //           4. Single entity: Details page of the entity
  //           5. List: All page of the entity
  //           6. Single and list: Both All and Details page of the entity
  //           7. Check for button group and button
  // 
  //   Bugzilla:
  //       1650066
  //   
  let [group, obj_type] = button_group;

  appliance.context.use(ViaUI, () => {
    let button = group.buttons.create({
      text: fauxfactory.gen_alphanumeric({start: "btn_"}),
      hover: fauxfactory.gen_alphanumeric({start: "btn_hvr_"}),
      display_for: display,
      system: "Request",
      request: "InspectMe"
    });

    request.addfinalizer(button.delete_if_exists)
  });

  appliance.context.use(context, () => {
    let navigate_to = (context === ViaSSUI ? ssui_nav : ui_nav);

    for (let destination in DISPLAY_NAV[display]) {
      let obj = objects[obj_type][destination][0];
      let dest_name = objects[obj_type][destination][1];
      let view = navigate_to.call(obj, dest_name);
      let custom_button_group = Dropdown(view, group.text);
      if (!custom_button_group.is_displayed) throw new ();
      if (!custom_button_group.has_item(button.text)) throw new ()
    }
  })
};

function test_custom_button_automate_service_obj(request, appliance, context, submit, objects, button_group) {
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
  //           9. One by one: separate requests for all entities execution
  // 
  //   Bugzilla:
  //       1650066
  //   
  let [group, obj_type] = button_group;

  appliance.context.use(ViaUI, () => {
    let button = group.buttons.create({
      text: fauxfactory.gen_alphanumeric({start: "btn_"}),
      hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
      display_for: "Single and list",
      submit,
      system: "Request",
      request: "InspectMe"
    });

    request.addfinalizer(button.delete_if_exists)
  });

  appliance.context.use(context, () => {
    let navigate_to = (context === ViaSSUI ? ssui_nav : ui_nav);

    let destinations = (is_bool(context == ViaSSUI && BZ(
      1650066,
      {forced_streams: ["5.11"]}
    ).blocks) ? ["Details"] : ["All", "Details"]);

    for (let destination in destinations) {
      let entity_count;
      let obj = objects[obj_type][destination][0];
      let dest_name = objects[obj_type][destination][1];
      let view = navigate_to.call(obj, dest_name);
      let custom_button_group = Dropdown(view, group.text);
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
        view.entities.paginator.check_all()
      } else {
        entity_count = 1
      };

      if (!appliance.ssh_client.run_command("echo -n \"\" > /var/www/miq/vmdb/log/automation.log")) {
        throw new ()
      };

      custom_button_group.item_select(button.text);

      if (context === ViaUI) {
        let diff = (appliance.version < "5.10" ? "executed" : "launched");
        view.flash.assert_message(`\"${button.text}\" was ${diff}`)
      };

      let expected_count = (submit == "Submit all" ? 1 : entity_count);

      try {
        wait_for(log_request_check, [appliance, expected_count], {
          timeout: 600,
          message: "Check for expected request count",
          delay: 20
        })
      } catch ($EXCEPTION) {
        if ($EXCEPTION instanceof TimedOutError) {
          if (!false) {
            throw "Expected {count} requests not found in automation log".format({count: expected_count.to_s})
          }
        } else {
          throw $EXCEPTION
        }
      }
    }
  })
};

function test_custom_button_text_display(appliance, context, serv_button_group, gen_rest_service) {
  //  Test custom button text display on option
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/6h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.9
  //       casecomponent: CustomButton
  //       tags: custom_button
  //       testSteps:
  //           1. Appliance with Service
  //           2. Create custom button `Group` or `Button` without display option
  //           3. Check Group/Button text display or not on UI and SSUI.
  // 
  //   Bugzilla:
  //       1650066
  //       1659452
  //       1745492
  //   
  let my_service = MyService(appliance, {name: gen_rest_service.name});
  let [button, group] = serv_button_group;

  appliance.context.use(context, () => {
    let navigate_to = (context === ViaSSUI ? ssui_nav : ui_nav);

    let destinations = (is_bool(BZ(1650066, {forced_streams: ["5.11"]}).blocks && context === ViaSSUI) ? ["Details"] : [
      "All",
      "Details"
    ]);

    for (let destination in destinations) {
      let view = navigate_to.call(my_service, destination);

      let custom_button_group = Dropdown(
        view,
        (context === ViaUI ? group.hover : group.text)
      );

      if (group.display === true) {
        if (!custom_button_group.to_a.include("")) throw new ()
      } else if (custom_button_group.read() != "") {
        throw new ()
      }
    }
  })
};

function vis_enb_button(request, appliance, button_group) {
  // Create custom button with enablement/visibility expression
  let [group, _] = button_group;

  let exp = {[request.param]: {
    tag: "My Company Tags : Department",
    value: "Engineering"
  }};

  appliance.context.use(ViaUI, () => {
    let button = group.buttons.create({
      text: fauxfactory.gen_alphanumeric({start: "btn_"}),
      hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
      display_for: "Single entity",
      system: "Request",
      request: "InspectMe",
      None: exp
    })
  });

  yield([button, request.param]);
  button.delete_if_exists()
};

function test_custom_button_expression_service_obj(appliance, context, objects, button_group, vis_enb_button) {
  //  Test custom button as per expression enablement/visibility.
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       casecomponent: CustomButton
  //       startsin: 5.9
  //       testSteps:
  //           1. Create custom button group with the Object type
  //           2. Create a custom button with expression (Tag)
  //               a. Enablement Expression
  //               b. Visibility Expression
  //           3. Navigate to object Detail page
  //           4. Check: button should not enable/visible without tag
  //           5. Check: button should enable/visible with tag
  // 
  //   Bugzilla:
  //       1509959
  //       1513498
  //   
  let [group, obj_type] = button_group;
  let [button, expression] = vis_enb_button;
  let obj = objects[obj_type].Details[0];
  let dest_name = objects[obj_type].Details[1];
  let navigate_to = (context === ViaSSUI ? ssui_nav : ui_nav);

  let tag_cat = appliance.collections.categories.instantiate({
    name: "department",
    display_name: "Department"
  });

  let tag = tag_cat.collections.tags.instantiate({
    name: "engineering",
    display_name: "Engineering"
  });

  appliance.context.use(ViaUI, () => {
    if (obj.get_tags().include(tag)) obj.remove_tag(tag)
  });

  appliance.context.use(context, () => {
    let view = navigate_to.call(obj, dest_name, {wait_for_view: 15});

    let custom_button_group = (context === ViaSSUI ? CustomButtonSSUIDropdwon(
      view,
      group.text
    ) : Dropdown(view, group.text));

    if (expression == "enablement") {
      if (is_bool(appliance.version < "5.10" || context === ViaSSUI)) {
        if (!!custom_button_group.item_enabled(button.text)) throw new ()
      } else if (!!custom_button_group.is_enabled) {
        throw new ()
      }
    } else if (expression == "visibility") {
      if (!!custom_button_group.is_displayed) throw new ()
    }
  });

  appliance.context.use(ViaUI, () => obj.add_tag(tag));

  appliance.context.use(context, () => {
    let view = navigate_to.call(obj, dest_name);

    let custom_button_group = (context === ViaSSUI ? CustomButtonSSUIDropdwon(
      view,
      group.text
    ) : Dropdown(view, group.text));

    if (expression == "enablement") {
      if (!custom_button_group.item_enabled(button.text)) throw new ()
    } else if (expression == "visibility") {
      if (!custom_button_group.to_a.include(button.text)) throw new ()
    }
  })
};

function test_custom_button_role_access_service(context, request, appliance, user_self_service_role, gen_rest_service, service_button_group) {
  // Test custom button for role access of SSUI
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
  //           1. Create role by copying EvmRole-user_self_service
  //           2. Create Group and respective user for role
  //           3. Create custom button group
  //           4. Create custom button with role
  //           5. Check use able to access custom button or not
  //   
  let [usr, role] = user_self_service_role;
  let service = MyService(appliance, {name: gen_rest_service.name});

  appliance.context.use(ViaUI, () => {
    let btn = service_button_group.buttons.create({
      text: fauxfactory.gen_alphanumeric({start: "btn_"}),
      hover: fauxfactory.gen_alphanumeric({start: "hvr_"}),
      system: "Request",
      request: "InspectMe",
      roles: [role.name]
    });

    request.addfinalizer(btn.delete_if_exists)
  });

  for (let user in [usr, appliance.user]) {
    user(() => (
      appliance.context.use(context, () => {
        let navigate_to, group_class;
        let logged_in_page = appliance.server.login(user);

        if (context === ViaSSUI) {
          navigate_to = ssui_nav;
          group_class = CustomButtonSSUIDropdwon
        } else {
          navigate_to = ui_nav;
          group_class = Dropdown
        };

        let view = navigate_to.call(service, "Details");
        let cb_group = group_class.call(view, service_button_group.text);

        if (user == usr) {
          if (!cb_group.is_displayed) throw new ();
          if (!cb_group.has_item(btn.text)) throw new ()
        } else {
          if (!(context === ViaUI ? !cb_group.is_displayed : cb_group.is_displayed)) {
            throw new ()
          };

          if (context === ViaSSUI) if (!!cb_group.has_item(btn.text)) throw new ()
        };

        logged_in_page.logout()
      })
    ))
  }
};

function test_custom_button_dialog_service_archived(request, appliance, provider, setup_provider, service_vm, button_group, dialog) {
  //  From Service OPS check if archive vms\"s dialog invocation via custom button. ref: BZ1439883
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/8h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.9
  //       casecomponent: CustomButton
  //       tags: custom_button
  //       testSteps:
  //           1. Create a button at the service level with InspectMe method
  //           2. Create a service that contains 1 VM
  //           3. Remove this VM from the provider, resulting in a VM state of \'Archived\'
  //           4. Go to the service and try to execute the button
  // 
  //   Bugzilla:
  //       1439883
  //   
  let [service, vm] = service_vm;
  let [group, obj_type] = button_group;

  appliance.context.use(ViaUI, () => {
    let button = group.buttons.create({
      text: fauxfactory.gen_alphanumeric({start: "btn_"}),
      hover: fauxfactory.gen_alphanumeric({start: "hover_"}),
      dialog,
      system: "Request",
      request: "InspectMe"
    })
  });

  request.addfinalizer(button.delete_if_exists);

  for (let with_vm in [true, false]) {
    if (is_bool(!with_vm)) {
      vm.mgmt.delete();

      vm.wait_for_vm_state_change({
        desired_state: "archived",
        timeout: 720,
        from_details: false,
        from_any_provider: true
      })
    };

    for (let context in [ViaUI, ViaSSUI]) {
      appliance.context.use(context, () => {
        let navigate_to = (context === ViaSSUI ? ssui_nav : ui_nav);
        let view = navigate_to.call(service, "Details");
        let custom_button_group = Dropdown(view, group.text);
        custom_button_group.item_select(button.text);
        let _dialog_view = (context === ViaUI ? TextInputDialogView : TextInputDialogSSUIView);

        let dialog_view = view.browser.create_view(
          _dialog_view,
          {wait: "10s"}
        );

        let request_pattern = "Attributes - Begin";

        let log = LogValidator(
          "/var/www/miq/vmdb/log/automation.log",
          {matched_patterns: [request_pattern]}
        );

        log.start_monitoring();
        dialog_view.submit.click();

        if (context === ViaUI) {
          view.flash.assert_message("Order Request was Submitted")
        };

        try {
          wait_for(
            () => log.matches[request_pattern] == 1,
            {timeout: 180, message: "wait for expected match count", delay: 5}
          )
        } catch ($EXCEPTION) {
          if ($EXCEPTION instanceof TimedOutError) {
            pytest.fail(`Expected '1' requests; found '${log.matches[request_pattern]}'`)
          } else {
            throw $EXCEPTION
          }
        }
      })
    }
  }
};

function test_custom_button_dialog_service_obj(appliance, dialog, request, context, objects, button_group) {
  //  Test custom button with dialog and InspectMe method
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
  //           2. Create a custom button with service dialog
  //           3. Navigate to object Details page
  //           4. Check for button group and button
  //           5. Select/execute button from group dropdown for selected entities
  //           6. Fill dialog and submit
  //           7. Check for the proper flash message related to button execution
  // 
  //   Bugzilla:
  //       1574774
  //   
  let [group, obj_type] = button_group;

  appliance.context.use(ViaUI, () => {
    let button = group.buttons.create({
      text: fauxfactory.gen_alphanumeric({start: "btn_"}),
      hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
      dialog,
      system: "Request",
      request: "InspectMe"
    });

    request.addfinalizer(button.delete_if_exists)
  });

  appliance.context.use(context, () => {
    let navigate_to = (context === ViaSSUI ? ssui_nav : ui_nav);
    let obj = objects[obj_type].Details[0];
    let dest_name = objects[obj_type].Details[1];
    let view = navigate_to.call(obj, dest_name);
    let custom_button_group = Dropdown(view, group.text);
    if (!custom_button_group.has_item(button.text)) throw new ();

    if (!appliance.ssh_client.run_command("echo -n \"\" > /var/www/miq/vmdb/log/automation.log")) {
      throw new ()
    };

    custom_button_group.item_select(button.text);
    let _dialog_view = (context === ViaUI ? TextInputDialogView : TextInputDialogSSUIView);

    let dialog_view = view.browser.create_view(
      _dialog_view,
      {wait: "10s"}
    );

    if (!dialog_view.service_name.fill("Custom Button Execute")) throw new ();
    dialog_view.submit.click();

    if (context === ViaUI) {
      view.flash.assert_message("Order Request was Submitted")
    };

    try {
      wait_for(log_request_check, [appliance, 1], {
        timeout: 600,
        message: "Check for expected request count",
        delay: 20
      })
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof TimedOutError) {
        if (!false) {
          throw "Expected {count} requests not found in automation log".format({count: (1).to_s})
        }
      } else {
        throw $EXCEPTION
      }
    }
  })
};

function unassigned_btn_setup(request, appliance, provider, gen_rest_service) {
  let obj, destinations;

  if (request.param == "Service") {
    obj = MyService(appliance, {name: gen_rest_service.name});
    destinations = [ViaUI, ViaSSUI]
  } else {
    obj = provider;
    destinations = [ViaUI]
  };

  let gp = appliance.collections.button_groups.instantiate({
    text: "[Unassigned Buttons]",
    hover: "Unassigned buttons",
    type: request.param
  });

  yield([obj, gp, destinations])
};

function test_custom_button_unassigned_behavior_objs(appliance, setup_provider, unassigned_btn_setup, request) {
  //  Test unassigned custom button behavior
  // 
  //   Note: Service unassigned custom button should display on SSUI but not OPS UI.
  //   For other than service objects also follows same behaviour i.e. not display on OPS UI.
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/6h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.8
  //       casecomponent: CustomButton
  //       testSteps:
  //           1. Create unassigned custom button on service and one other custom button object.
  //           2. Check destinations OPS UI should not display unassigned button but SSUI should.
  // 
  //   Bugzilla:
  //       1653195
  //   
  let [obj, gp, destinations] = unassigned_btn_setup;

  appliance.context.use(ViaUI, () => {
    let button = gp.buttons.create({
      text: fauxfactory.gen_alphanumeric({start: "btn_"}),
      hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
      system: "Request",
      request: "InspectMe"
    });

    if (!button.exists) throw new ();
    request.addfinalizer(button.delete_if_exists)
  });

  for (let dest in destinations) {
    let navigate_to = (dest === ViaSSUI ? ssui_nav : ui_nav);

    appliance.context.use(dest, () => {
      let view = navigate_to.call(obj, "Details");
      let btn = Button(view, button.text);
      if (!(dest === ViaSSUI ? btn.is_displayed : !btn.is_displayed)) throw new ()
    })
  }
};

function test_custom_button_expression_ansible_service(appliance, context, vis_enb_button_service, order_ansible_service_in_ops_ui) {
  //  Test custom button on ansible service as per expression enablement/visibility.
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       caseimportance: medium
  //       casecomponent: CustomButton
  //       startsin: 5.9
  //       testSteps:
  //           1. Create custom button group on Service object type
  //           2. Create a custom button with expression (Tag)
  //               a. Enablement Expression
  //               b. Visibility Expression
  //           3. Navigate to object Detail page
  //           4. Check: button should not enable/visible without tag
  //           5. Check: button should enable/visible with tag
  // 
  //   Bugzilla:
  //       1628727
  //       1509959
  //       1513498
  //       1755229
  //   
  let [group, button, expression] = vis_enb_button_service;
  let service = MyService(appliance, order_ansible_service_in_ops_ui);
  let navigate_to = (context === ViaSSUI ? ssui_nav : ui_nav);

  let tag_cat = appliance.collections.categories.instantiate({
    name: "department",
    display_name: "Department"
  });

  let engineering_tag = tag_cat.collections.tags.instantiate({
    name: "engineering",
    display_name: "Engineering"
  });

  for (let tag in [false, true]) {
    appliance.context.use(ViaUI, () => {
      let current_tag_status = service.get_tags().include(engineering_tag);

      if (tag != current_tag_status) {
        if (is_bool(tag)) {
          service.add_tag(engineering_tag)
        } else {
          service.remove_tag(engineering_tag)
        }
      }
    });

    appliance.context.use(context, () => {
      let view = navigate_to.call(service, "Details", {wait_for_view: 15});

      let custom_button_group = (context === ViaSSUI ? CustomButtonSSUIDropdwon(
        view,
        group.text
      ) : Dropdown(view, group.text));

      if (is_bool(tag)) {
        if (expression == "enablement") {
          if (!custom_button_group.item_enabled(button.text)) throw new ()
        } else if (!custom_button_group.to_a.include(button.text)) {
          throw new ()
        }
      } else if (expression == "enablement") {
        if (context === ViaSSUI) {
          if (!!custom_button_group.item_enabled(button.text)) throw new ()
        } else if (!!custom_button_group.is_enabled) {
          throw new ()
        }
      } else if (!!custom_button_group.is_displayed) {
        throw new ()
      }
    })
  }
}
