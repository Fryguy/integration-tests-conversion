require_relative("cfme");
include(Cfme);
require_relative("cfme/common");
include(Cfme.Common);
require_relative("cfme/generic_objects/definition/definition_views");
include(Cfme.Generic_objects.Definition.Definition_views);
require_relative("cfme/generic_objects/definition/definition_views");
include(Cfme.Generic_objects.Definition.Definition_views);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(2),
  test_requirements.custom_button,
  test_requirements.generic_objects
];

function generic_object_button(appliance, generic_object_button_group, generic_definition) {
  let _generic_object_button = (button_group) => {
    appliance.context.use(ViaUI, () => {
      let button_parent = (is_bool(button_group) ? generic_object_button_group(button_group) : generic_definition);

      let button_name = fauxfactory.gen_alphanumeric(
        12,
        {start: "button_"}
      );

      let button_desc = fauxfactory.gen_alphanumeric(
        23,
        {start: "Button_description_"}
      );

      let generic_object_button = button_parent.collections.generic_object_buttons.create({
        name: button_name,
        description: button_desc,
        image: "fa-home",
        request: fauxfactory.gen_alphanumeric()
      });

      let view = appliance.browser.create_view(BaseLoggedInPage);
      view.flash.assert_no_error()
    });

    return generic_object_button
  };

  return _generic_object_button
};

function generic_object_button_group(appliance, generic_definition) {
  let _generic_object_button_group = ({ create_action = true }) => {
    if (is_bool(create_action)) {
      appliance.context.use(ViaUI, () => {
        let group_name = fauxfactory.gen_alphanumeric(
          15,
          {start: "button_group_"}
        );

        let group_desc = fauxfactory.gen_alphanumeric(
          28,
          {start: "Group_button_description_"}
        );

        let groups_buttons = generic_definition.collections.generic_object_groups_buttons;

        let generic_object_button_group = groups_buttons.create({
          name: group_name,
          description: group_desc,
          image: "fa-user"
        });

        let view = appliance.browser.create_view(BaseLoggedInPage);
        view.flash.assert_no_error()
      });

      return generic_object_button_group
    }
  };

  return _generic_object_button_group
};

function button_group(appliance, generic_definition) {
  appliance.context.use(ViaUI, () => {
    let group = generic_definition.collections.generic_object_groups_buttons.create({
      name: fauxfactory.gen_numeric_string(
        13,
        {start: "btn_group", separator: "-"}
      ),

      description: fauxfactory.gen_alphanumeric({
        start: "disc",
        separator: "-"
      }),

      image: "fa-user"
    });

    yield(group);
    group.delete_if_exists()
  })
};

function button_without_group(appliance, generic_definition) {
  appliance.context.use(ViaUI, () => {
    let button = generic_definition.add_button({
      name: fauxfactory.gen_alphanumeric({start: "btn", separator: "-"}),
      description: fauxfactory.gen_alphanumeric(),
      request: fauxfactory.gen_alphanumeric()
    });

    yield(button);
    button.delete_if_exists()
  })
};

function test_custom_group_on_generic_class_crud(appliance, generic_definition) {
  //  Test custom button group crud operation on generic class definition
  // 
  //   Bugzilla:
  //       1744478
  //       1753289
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/8h
  //       caseimportance: critical
  //       startsin: 5.10
  //       casecomponent: CustomButton
  //       testSteps:
  //           1. Create custom button group on generic class
  //           2. Update custom button group by editing
  //           3. Delete custom button group
  //   
  appliance.context.use(ViaUI, () => {
    let group = generic_definition.collections.generic_object_groups_buttons.create({
      name: fauxfactory.gen_numeric_string(
        13,
        {start: "btn_group", separator: "-"}
      ),

      description: fauxfactory.gen_alphanumeric({
        start: "disc",
        separator: "-"
      }),

      image: "fa-user"
    });

    let view = appliance.browser.create_view(GenericObjectDefinitionDetailsView);
    view.flash.assert_success_message(`Custom Button Group \"${group.name}\" has been successfully added.`);
    if (!group.exists) throw new ();

    update(group, () => {
      group.name = fauxfactory.gen_numeric_string(
        13,
        {start: "btn_group", separator: "-"}
      );

      group.description = fauxfactory.gen_alphanumeric({
        start: "disc",
        separator: "-"
      })
    });

    view.flash.assert_success_message(`Custom Button Group \"${group.name}\" has been successfully saved.`);
    if (!group.exists) throw new ();
    group.delete();

    if (is_bool(!BZ(1744478).blocks || BZ(1773666).blocks)) {
      view.flash.assert_success_message(`CustomButtonSet: \"${group.name}\" was successfully deleted`)
    } else {
      view.flash.assert_success_message("Button Group:\"undefined\" was successfully deleted")
    };

    if (!!group.exists) throw new ()
  })
};

function test_custom_button_on_generic_class_crud(appliance, button_group, is_undefined) {
  // Test custom button crud operation on generic class definition
  // 
  //   Bugzilla:
  //       1534539
  //       1744478
  //       1753289
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       caseimportance: critical
  //       startsin: 5.10
  //       casecomponent: CustomButton
  //       testSteps:
  //           1. Create custom button on generic class (with group and undefined)
  //           2. Update custom button by editing
  //           3. Delete custom button
  //   
  let parent = (is_bool(is_undefined) ? button_group.parent.parent : button_group);

  appliance.context.use(ViaUI, () => {
    let msg;

    let button = parent.collections.generic_object_buttons.create({
      name: fauxfactory.gen_numeric_string({start: "btn", separator: "-"}),

      description: fauxfactory.gen_numeric_string({
        start: "disc",
        separator: "-"
      }),

      image: "fa-home",
      request: "InspectMe"
    });

    let view = appliance.browser.create_view(GenericObjectDefinitionDetailsView);

    if (is_bool(is_undefined)) {
      msg = `Custom Button \"${button.name}\" has been successfully added.`
    } else {
      msg = `Custom Button \"${button.name}\" has been successfully added under the selected button group.`
    };

    view.flash.assert_success_message(msg);
    if (!button.exists) throw new ();

    update(button, () => {
      button.name = fauxfactory.gen_numeric_string({
        start: "btn",
        separator: "-"
      });

      button.description = fauxfactory.gen_alphanumeric({
        start: "disc",
        separator: "-"
      })
    });

    view.flash.assert_success_message(`Custom Button \"${button.name}\" has been successfully saved.`);
    if (!button.exists) throw new ();
    button.delete();

    if (is_bool(!BZ(1744478).blocks || BZ(1773666).blocks)) {
      view.flash.assert_success_message(`CustomButton: \"${button.name}\" was successfully deleted`)
    } else {
      view.flash.assert_success_message("Button:\"undefined\" was successfully deleted")
    };

    if (!!button.exists) throw new ()
  })
};

function test_generic_objects_with_buttons_ui(appliance, add_generic_object_to_service, button_group, generic_object_button) {
  // 
  //       Tests buttons ui visibility assigned to generic object
  // 
  //       Metadata:
  //           test_flag: ui
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: GenericObjects
  //   
  let instance = add_generic_object_to_service;
  let generic_button = generic_object_button.call(button_group);
  let generic_button_group = generic_button.parent.parent;

  appliance.context.use(ViaUI, () => {
    let view = navigate_to(instance, "MyServiceDetails");

    if (is_bool(button_group)) {
      if (!view.toolbar.group(generic_button_group.name).custom_button.has_item(generic_button.name)) {
        throw new ()
      }
    } else if (!view.toolbar.button(generic_button.name).custom_button.is_displayed) {
      throw new ()
    }
  })
};

function test_ansible_playbook_generic_object_button(appliance, generic_definition) {
  // 
  //   For this test we don't have to actually create the button, just verify that the
  //   fields are properly displayed.
  // 
  //   Bugzilla:
  //       1650559
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: GenericObjects
  //       testSteps:
  //           1. Go to Automation->Automate->Generic Objects
  //           2. Create Generic Objects Class
  //           3. Go Add New button
  //           4. Change button type to Ansible Playbook
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4. Ansible playbook fields should be displayed
  //   
  appliance.context.use(ViaUI, () => {
    let view = navigate_to(
      generic_definition.generic_object_buttons,
      "Add"
    );

    view.button_type.fill("Ansible Playbook");

    try {
      view.form.playbook_cat_item.wait_displayed({timeout: "2s"});
      view.form.inventory.wait_displayed({timeout: "2s"})
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof TimedOutError) {
        pytest.fail("Ansible button fields did not appear")
      } else {
        throw $EXCEPTION
      }
    };

    view.form.inventory.fill("Specific Hosts");

    try {
      view.form.hosts.wait_displayed({timeout: "5s"})
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof TimedOutError) {
        pytest.fail("Ansible hosts did not appear")
      } else {
        throw $EXCEPTION
      }
    };

    view.cancel.click()
  })
};

function test_generic_object_button_edited_request(button_without_group) {
  // 
  //   Bugzilla:
  //       1753237
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/6h
  //       casecomponent: GenericObjects
  //       testSteps:
  //           1. Create a \"Generic Object Class\"
  //           2. Create a custom button that has the \"Request\" as \"ca\"
  //           3. Edit the custom button request to \"call_instance\"
  //           4. Click to edit the custom button again
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4. The request field should say \"call_instance\"
  //   
  update(
    button_without_group,
    () => button_without_group.request = "call_instance"
  );

  let view = navigate_to(button_without_group, "Edit");
  if (view.request.read() != button_without_group.request) throw new ()
};

function test_generic_object_button_delete_flash(button_without_group) {
  // 
  //   Bugzilla:
  //       1744478
  //       1753289
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/6h
  //       casecomponent: GenericObjects
  //       testSteps:
  //           1. Add a generic object class
  //           2. Create a button under the class
  //           3. Delete the button
  //       expectedResults:
  //           1.
  //           2.
  //           3. Assert that the button name is in the flash message
  //   
  let view = navigate_to(button_without_group, "Details");

  view.configuration.item_select(
    "Remove this Custom Button from Inventory",
    {handle_alert: true}
  );

  view = button_without_group.create_view(GenericObjectDefinitionAllView);
  if (!view.is_displayed) throw new ();
  view.flash.assert_success_message(`CustomButton: \"${button_without_group.name}\" was successfully deleted`)
};

// 
//   Bugzilla:
//       1753281
//       1753388
// 
//   Polarion:
//       assignee: tpapaioa
//       initialEstimate: 1/30h
//       casecomponent: GenericObjects
//       testSteps:
//           1. Create a generic object class
//           2. Create a custom button under this class
//           3. Create a second button
//           4. Delete the second button
//       expectedResults:
//           1.
//           2.
//           3.
//           4. The second button should be deleted, not both, no 404 error
//   
// pass
function test_generic_object_button_delete_multiple() {};

// 
//   Bugzilla:
//       1753338
// 
//   Polarion:
//       assignee: tpapaioa
//       initialEstimate: 1/30h
//       casecomponent: GenericObjects
//       testSteps:
//           1. Enable embedded ansible role
//           2. Add a repo with some playbooks
//               (e.g. https://github.com/ManageIQ/integration_tests_playbooks.git)
//           3. Add some Ansible credentials for a VMware provider
//           4. Create a catalog named \"Catalog VMware\"
//           5. Create a catalog item \"VMware Catalog Item\" under this catalog that executes
//               a playbook, if you\'re using the above repo you can use
//               e.g. \"gather_all_vms_from_vmware.yml\"
//           6. Order the service catalog and ensure that the playbook runs successfully
//           7. Now create a separate catalog \"Test Custom Button\"
//           8. Create a \"generic\" catalog item under this catalog \"test custom button\"
//           9. Order this service and ensure that the service appears under My Services
//           10. Create a generic object class \"Test class\"
//           11. Create a custom button of type \"Ansible Playbook\" that uses the catalog item
//               \"VMware Catalog Item\", with \"Request\" -> \"Order_Ansible_Playbook\"
//           12. Create a generic object instance under \"Test class\"
//           13. Associate the generic object instance with the service \"Test Custom Button\"
//               This can be done by REST action \"add_resource\" or by the rails console
//           14. Navigate to Services > My services > Services > Active Services > Test Custom Button
//           15. In the generic objects summary table, there should be one instance
//               associated with the service, click this instance
//           16. Click the generic object quadicon
//           17. The custom button you created in step 11 should be displayed, click that button.
//           18. Hit submit
//       expectedResults:
//           1.
//           2.
//           3.
//           4.
//           5.
//           6.
//           7.
//           8.
//           9.
//           10.
//           11.
//           12.
//           13.
//           14.
//           15.
//           16.
//           17.
//           18. The playbook should execute successfully
//   
// pass
function test_generic_object_button_execute_playbook() {}
