require("None");
require_relative("datetime");
include(Datetime);
require_relative("widgetastic/widget");
include(Widgetastic.Widget);
require_relative("cfme");
include(Cfme);
require_relative("cfme/control/explorer");
include(Cfme.Control.Explorer);
require_relative("cfme/control/explorer");
include(Cfme.Control.Explorer);
require_relative("cfme/control/explorer/alert_profiles");
include(Cfme.Control.Explorer.Alert_profiles);
require_relative("cfme/control/explorer/policies");
include(Cfme.Control.Explorer.Policies);
require_relative("cfme/control/explorer/policies");
include(Cfme.Control.Explorer.Policies);
require_relative("cfme/exceptions");
include(Cfme.Exceptions);
require_relative("cfme/tests/control/test_basic");
include(Cfme.Tests.Control.Test_basic);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.control, pytest.mark.tier(3)];

const BAD_CONDITIONS = [
  conditions.ReplicatorCondition,
  conditions.PodCondition,
  conditions.ContainerNodeCondition,
  conditions.ContainerImageCondition,
  conditions.ProviderCondition
];

const BREADCRUMB_LOCATIONS = {};

function create_policy(request, collection) {
  let args = [VMControlPolicy, fauxfactory.gen_alpha()];
  let kwargs = {};
  let policy = collection.create(...args);

  let _delete = () => {
    while (policy.exists) {
      policy.delete()
    }
  };

  return [args, kwargs]
};

function create_condition(request, collection) {
  let args = [
    conditions.VMCondition,
    fauxfactory.gen_alpha(),
    "fill_field(VM and Instance : Boot Time, BEFORE, Today)"
  ];

  let kwargs = {};
  let condition = collection.create(...args);

  let _delete = () => {
    while (condition.exists) {
      condition.delete()
    }
  };

  return [args, kwargs]
};

function create_action(request, collection) {
  let args = [fauxfactory.gen_alpha()];

  let kwargs = {
    action_type: "Tag",
    action_values: {tag: ["My Company Tags", "Department", "Accounting"]}
  };

  let action = collection.create(...args, {None: kwargs});

  let _delete = () => {
    while (action.exists) {
      action.delete()
    }
  };

  return [args, kwargs]
};

function create_alert(request, collection) {
  let args = [fauxfactory.gen_alpha()];
  let kwargs = {timeline_event: true, driving_event: "Hourly Timer"};
  let alert = collection.create(...args, {None: kwargs});

  let _delete = () => {
    while (alert.exists) {
      alert.delete()
    }
  };

  return [args, kwargs]
};

const ProfileCreateFunction = namedtuple(
  "ProfileCreateFunction",
  ["name", "fn"]
);

let items = [
  ProfileCreateFunction.call("Policies", method("create_policy")),
  ProfileCreateFunction.call("Conditions", method("create_condition")),
  ProfileCreateFunction.call("Actions", method("create_action")),
  ProfileCreateFunction.call("Alerts", method("create_alert"))
];

function collections(appliance) {
  return {
    Policies: appliance.collections.policies,
    Conditions: appliance.collections.conditions,
    Actions: appliance.collections.actions,
    Alerts: appliance.collections.alerts
  }
};

function vmware_vm(request, virtualcenter_provider) {
  let vm = virtualcenter_provider.appliance.collections.infra_vms.instantiate(
    random_vm_name("control"),
    virtualcenter_provider
  );

  vm.create_on_provider({find_in_cfme: true});
  request.addfinalizer(vm.cleanup_on_provider);
  return vm
};

function hardware_reconfigured_alert(appliance) {
  let alert = appliance.collections.alerts.create(
    fauxfactory.gen_alpha(),

    {
      evaluate: ["Hardware Reconfigured", {hardware_attribute: "RAM"}],
      timeline_event: true
    }
  );

  yield(alert);
  alert.delete()
};

function setup_disk_usage_alert(appliance) {
  let timestamp = Datetime.now();
  let table = appliance.db.client.miq_alert_statuses;

  let query = appliance.db.client.session.query(
    table.description,
    table.evaluated_on
  );

  appliance.update_advanced_settings({server: {events: {disk_usage_gt_percent: 1}}});
  let result = appliance.ssh_client.run_command("dd if=/dev/zero of=/var/www/miq/vmdb/log/delete_me.txt count=1024 bs=1048576");
  if (!!result.failed) throw new ();
  let expression = {expression: "fill_count(Server.EVM Workers, >, 0)"};

  let alert = appliance.collections.alerts.create(
    fauxfactory.gen_alpha(),

    {
      based_on: "Server",
      evaluate: ["Expression (Custom)", expression],
      driving_event: "Appliance Operation: Server High /var/www/miq/vmdb/log Disk Usage",
      notification_frequency: "1 Minute"
    }
  );

  let alert_profile = appliance.collections.alert_profiles.create(
    ServerAlertProfile,
    `Alert profile for ${alert.description}`,
    {alerts: [alert]}
  );

  alert_profile.assign_to(
    "Selected Servers",
    {selections: ["Servers", "EVM"]}
  );

  yield([alert, timestamp, query]);
  alert_profile.delete();
  alert.delete();
  appliance.update_advanced_settings({server: {events: {disk_usage_gt_percent: "<<reset>>"}}});
  result = appliance.ssh_client.run_command("rm /var/www/miq/vmdb/log/delete_me.txt");
  if (!!result.failed) throw new ()
};

function action_for_testing(appliance) {
  let action_ = appliance.collections.actions.create(
    fauxfactory.gen_alphanumeric(),

    {
      action_type: "Tag",
      action_values: {tag: ["My Company Tags", "Department", "Accounting"]}
    }
  );

  yield(action_);
  action_.delete()
};

function compliance_condition(appliance, virtualcenter_provider) {
  try {
    let vm_name = virtualcenter_provider.data.cap_and_util.capandu_vm
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip("Missing 'cap_and_util' field in {} provider data.".format(virtualcenter_provider.key))
    } else {
      throw $EXCEPTION
    }
  };

  let expression = "fill_field(VM and Instance : Name, =, {}); select_expression_text; click_or; fill_field(VM and Instance : Name, =, {}); select_expression_text; click_or; fill_field(VM and Instance : Name, =, {}); ".format(
    vm_name,
    fauxfactory.gen_alphanumeric(),
    fauxfactory.gen_alphanumeric()
  );

  let condition = appliance.collections.conditions.create(
    conditions.VMCondition,
    fauxfactory.gen_alphanumeric(12, {start: "vm-name-"}),
    {expression}
  );

  yield(condition);
  condition.delete()
};

function vm_compliance_policy_profile(appliance, compliance_condition) {
  let policy = appliance.collections.policies.create(
    VMCompliancePolicy,
    fauxfactory.gen_alphanumeric(20, {start: "vm-compliance-"})
  );

  policy.assign_conditions(compliance_condition);

  let profile = appliance.collections.policy_profiles.create(
    fauxfactory.gen_alphanumeric(26, {start: "VM Compliance Profile "}),
    [policy]
  );

  yield(profile);
  profile.delete();
  policy.delete()
};

function test_scope_windows_registry_stuck(request, appliance, infra_provider) {
  // If you provide Scope checking windows registry, it messes CFME up. Recoverable.
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Control
  //       caseimportance: low
  //       initialEstimate: 1/6h
  // 
  //   Bugzilla:
  //       1155284
  //   
  let policy = appliance.collections.policies.create(
    VMCompliancePolicy,
    "Windows registry scope glitch testing Compliance Policy",

    {
      active: true,
      scope: "fill_registry(HKLM\\SOFTWARE\\Microsoft\\CurrentVersion\\Uninstall\\test, some value, INCLUDES, some content)"
    }
  );

  request.addfinalizer(() => (is_bool(policy.exists) ? policy.delete() : null));

  let profile = appliance.collections.policy_profiles.create(
    "Windows registry scope glitch testing Compliance Policy",
    {policies: [policy]}
  );

  request.addfinalizer(() => (is_bool(profile.exists) ? profile.delete() : null));
  let vm = infra_provider.appliance.collections.infra_vms.all()[0];
  vm.assign_policy_profiles(profile.description);
  navigate_to(appliance.server, "Dashboard");
  let view = navigate_to(appliance.collections.infra_vms, "All");
  if (!!view.entities.title.text.downcase().include("except")) throw new ();
  vm.unassign_policy_profiles(profile.description)
};

function test_invoke_custom_automation(request, appliance) {
  // This test tests a bug that caused the ``Invoke Custom Automation`` fields to disappear.
  // 
  //   Steps:
  //       * Go create new action, select Invoke Custom Automation
  //       * The form with additional fields should appear
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  // 
  //   Bugzilla:
  //       1243357
  //   
  let action = appliance.collections.actions.create(
    fauxfactory.gen_alpha(),
    "Invoke a Custom Automation",
    {}
  );

  request.addfinalizer(() => (is_bool(action.exists) ? action.delete() : null))
};

function test_check_compliance_history(request, virtualcenter_provider, vmware_vm, appliance) {
  // This test checks if compliance history link in a VM details screen work.
  // 
  //   Steps:
  //       * Create any VM compliance policy
  //       * Assign it to a policy profile
  //       * Assign the policy profile to any VM
  //       * Perform the compliance check for the VM
  //       * Go to the VM details screen
  //       * Click on \"History\" row in Compliance InfoBox
  // 
  //   Result:
  //       Compliance history screen with last 10 checks should be opened
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Control
  // 
  //   Bugzilla:
  //       1375093
  //   
  let policy = appliance.collections.policies.create(
    VMCompliancePolicy,

    fauxfactory.gen_alpha(
      36,
      {start: "Check compliance history policy "}
    ),

    {
      active: true,
      scope: `fill_field(VM and Instance : Name, INCLUDES, ${vmware_vm.name})`
    }
  );

  request.addfinalizer(() => (is_bool(policy.exists) ? policy.delete() : null));

  let policy_profile = appliance.collections.policy_profiles.create(
    policy.description,
    {policies: [policy]}
  );

  request.addfinalizer(() => (
    (is_bool(policy_profile.exists) ? policy_profile.delete() : null)
  ));

  virtualcenter_provider.assign_policy_profiles(policy_profile.description);

  request.addfinalizer(() => (
    virtualcenter_provider.unassign_policy_profiles(policy_profile.description)
  ));

  vmware_vm.check_compliance();
  vmware_vm.open_details(["Compliance", "History"]);

  let history_screen_title = (Text(
    appliance.browser.widgetastic,
    "//span[@id='explorer_title_text']"
  )).text;

  if (history_screen_title != "\"Compliance History\" for Virtual Machine \"{}\"".format(vmware_vm.name)) {
    throw new ()
  }
};

function test_delete_all_actions_from_compliance_policy(request, appliance) {
  // We should not allow a compliance policy to be saved
  //   if there are no actions on the compliance event.
  // 
  //   Steps:
  //       * Create a compliance policy
  //       * Remove all actions
  // 
  //   Result:
  //       The policy shouldn't be saved.
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Control
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/12h
  // 
  //   Bugzilla:
  //       1395965
  //       1491576
  //   
  let policy = appliance.collections.policies.create(
    VMCompliancePolicy,
    fauxfactory.gen_alphanumeric()
  );

  request.addfinalizer(() => (is_bool(policy.exists) ? policy.delete() : null));

  pytest.raises(
    RuntimeError,
    () => policy.assign_actions_to_event("VM Compliance Check", [])
  )
};

function test_control_identical_descriptions(request, create_function, collections, appliance) {
  // CFME should not allow to create policy, alerts, profiles, actions and others to be created
  //   if the item with the same description already exists.
  // 
  //   Steps:
  //       * Create an item
  //       * Create the same item again
  // 
  //   Result:
  //       The item shouldn't be created.
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Control
  //       caseimportance: low
  //       initialEstimate: 1/12h
  //   
  let [args, kwargs] = create_function.fn(
    request,
    collections[create_function.name]
  );

  let flash = appliance.browser.create_view(ControlExplorerView).flash;

  try {
    collections[create_function.name].create(...args, {None: kwargs})
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof [TimedOutError, RuntimeError]) {
      flash.assert_message("Description has already been taken");
      navigate_to(appliance.server, "ControlExplorer", {force: true})
    } else {
      throw $EXCEPTION
    }
  }
};

function test_vmware_alarm_selection_does_not_fail(request, appliance) {
  // Test the bug that causes CFME UI to explode when VMware Alarm type is selected.
  //       We assert that the alert using this type is simply created. Then we destroy
  //       the alert.
  // 
  //   Metadata:
  //       test_flag: alerts
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Control
  //       caseimportance: low
  //       initialEstimate: 1/12h
  //   
  try {
    let alert = appliance.collections.alerts.create(
      fauxfactory.gen_alpha({length: 20, start: "Trigger by CPU "}),

      {
        active: true,
        based_on: "VM and Instance",
        evaluate: ["VMware Alarm", {}],
        notification_frequency: "5 Minutes"
      }
    );

    request.addfinalizer(() => (is_bool(alert.exists) ? alert.delete() : null))
  } catch (e) {
    if (e instanceof CFMEExceptionOccured) {
      pytest.fail("CFME has thrown an error: {}".format(e.to_s))
    } else {
      throw e
    }
  }
};

function test_alert_ram_reconfigured(hardware_reconfigured_alert) {
  // Tests the bug when it was not possible to save an alert with RAM option in hardware
  //   attributes.
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let view = navigate_to(hardware_reconfigured_alert, "Details");
  let attr = view.hardware_reconfigured_parameters.get_text_of("Hardware Attribute");
  if (attr != "RAM Increased") throw new ()
};

function test_alert_for_disk_usage(setup_disk_usage_alert) {
  // 
  //   Bugzilla:
  //       1658670
  //       1672698
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       testSteps:
  //           1. Go to Control > Explorer > Alerts
  //           2. Configuration > Add new alert
  //           3. Based on = Server
  //           4. What to evaluate = Expression (Custom)
  //           5. Driving Event =
  //               \"Appliance Operation: Server High /var/www/miq/vmdb/log Disk Usage\"
  //           6. Assign the alert to a Alert Profile
  //           7. Assign the Alert Profile to the Server
  //           8. In advanced config, change:
  //               events:
  //                 :disk_usage_gt_percent: 80
  //               to:
  //                 events:
  //                 :disk_usage_gt_percent: 1
  //           9. dd a file in /var/www/miq/vmdb/log large enough to trigger 1% disk usage
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5.
  //           6.
  //           7.
  //           8.
  //           9. the alert should fire, and the event of type
  //               \"evm_server_log_disk_usage\" should trigger
  //   
  let [alert, timestamp, query] = setup_disk_usage_alert;

  let _check_query = () => {
    let query_result = query.all();

    if (is_bool(query_result)) {
      return alert.description == query_result[0][0] && timestamp < query_result[0][1]
    } else {
      return false
    }
  };

  wait_for(method("_check_query"), {
    delay: 5,
    num_sec: 600,
    message: `Waiting for alert ${alert.description} to appear in DB`
  })
};

function test_accordion_after_condition_creation(appliance, condition_class) {
  // 
  //   Bugzilla:
  //       1683697
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  // 
  //   For this test, we must make a condition 'manually' and so that we can access the view
  //   during the condition creation.
  //   
  if (is_bool(BZ(1683697).blocks && BAD_CONDITIONS.include(condition_class))) {
    pytest.skip("Skipping because {} conditions are impacted by BZ 1683697".format(condition_class.__name__))
  };

  let condition = appliance.collections.conditions.create(
    condition_class,
    fauxfactory.gen_alpha(),
    {expression: "fill_field({} : Name, IS NOT EMPTY)".format(condition_class.FIELD_VALUE)}
  );

  let view = condition.create_view(
    conditions.ConditionDetailsView,
    {wait: "10s"}
  );

  if (view.conditions.tree.currently_selected != [
    "All Conditions",
    `${condition_class.TREE_NODE} Conditions`,
    condition.description
  ]) throw new ()
};

function test_edit_action_buttons(action_for_testing) {
  // 
  //   This tests the bug where the save/reset button are always enabled, even on initial load.
  // 
  //   Bugzilla:
  //       1708434
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/30h
  //   
  let view = navigate_to(action_for_testing, "Edit");
  if (!view.save_button.disabled) throw new ();
  if (!view.reset_button.disabled) throw new ();
  view.cancel_button.click();
  navigate_to(action_for_testing, "Details")
};

function test_policy_condition_multiple_ors(appliance, virtualcenter_provider, vm_compliance_policy_profile) {
  // 
  //   Tests to make sure that policy conditions with multiple or statements work properly
  // 
  //   Bugzilla:
  //       1711352
  //       1717483
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       caseimportance: low
  //       casecomponent: Control
  //       initialEstimate: 1/12h
  //   
  let collection = appliance.provider_based_collection(virtualcenter_provider);
  let all_vms = collection.all();
  let all_vm_names = all_vms.map(vm => vm.name);
  let vm_name = virtualcenter_provider.data.cap_and_util.capandu_vm;

  if (is_bool(!virtualcenter_provider.mgmt.does_vm_exist(vm_name))) {
    pytest.skip(`No capandu_vm available on virtualcenter_provider of name ${vm_name}`)
  };

  let vms = [all_vms.pop(all_vm_names.index(vm_name))];
  TypeError;
  pytest.skip("No other vms exist on provider to run policy simulation against.");
  let filtered_collection = collection.filter({names: vms.map(vm => vm.name)});
  let view = navigate_to(filtered_collection, "PolicySimulation");
  view.fill({form: {policy_profile: `${vm_compliance_policy_profile.description}`}});

  for (let entity in view.form.entities.get_all()) {
    let state = entity.data.quad.bottomRight.tooltip;

    if (entity.name == vm_name) {
      if (state != "Policy simulation successful.") throw new ()
    } else if (state != "Policy simulation failed with: false") {
      throw new ()
    }
  }
};

function test_control_breadcrumbs(appliance, page) {
  // 
  //   Test to make sure breadcrumbs are visible and properly displayed
  // 
  //   Bugzilla:
  //       1740290
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       caseimportance: high
  //       casecomponent: Control
  //       initialEstimate: 1/30h
  //       startsin: 5.11
  //   
  let view = navigate_to(appliance.server, "ControlExplorer");

  if (view.breadcrumb.locations != BREADCRUMB_LOCATIONS.ControlExplorer) {
    throw new ()
  };

  if (!view.breadcrumb.is_displayed) throw new ();
  view = navigate_to(appliance.server, page);
  if (!view.breadcrumb.is_displayed) throw new ();
  if (view.breadcrumb.locations != BREADCRUMB_LOCATIONS[page]) throw new ()
}
