//  Tests checking the basic functionality of the Control/Explorer section.
// 
// Whether we can create/update/delete/assign/... these objects. Nothing with deep meaning.
// Can be also used as a unit-test for page model coverage.
// 
// 
require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/control/explorer");
include(Cfme.Control.Explorer);
require_relative("cfme/control/explorer");
include(Cfme.Control.Explorer);
require_relative("cfme/control/explorer");
include(Cfme.Control.Explorer);
require_relative("cfme/control/explorer/alert_profiles");
include(Cfme.Control.Explorer.Alert_profiles);
require_relative("cfme/control/explorer/policies");
include(Cfme.Control.Explorer.Policies);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.long_running,
  test_requirements.control
];

const EXPRESSIONS_TO_TEST = [
  [
    "Field",
    "fill_field({} : Last Compliance Timestamp, BEFORE, 03/04/2014)",
    "{} : Last Compliance Timestamp BEFORE \"03/04/2014 00:00\""
  ],

  [
    "Count",
    "fill_count({}.Compliance History, >, 0)",
    "COUNT OF {}.Compliance History > 0"
  ],

  [
    "Tag",
    "fill_tag({}.User.My Company Tags : Location, Chicago)",
    "{}.User.My Company Tags : Location CONTAINS 'Chicago'"
  ],

  [
    "Find",
    "fill_find({}.Compliance History : Event Type, INCLUDES, some_string, Check Any,Resource Type, =, another_string)",
    "FIND {}.Compliance History : Event Type INCLUDES \"some_string\" CHECK ANY Resource Type = \"another_string\""
  ]
];

const COMPLIANCE_POLICIES = [
  policies.HostCompliancePolicy,
  policies.VMCompliancePolicy,
  policies.ReplicatorCompliancePolicy,
  policies.PodCompliancePolicy,
  policies.ContainerNodeCompliancePolicy,
  policies.ContainerImageCompliancePolicy,
  policies.ProviderCompliancePolicy,
  policies.PhysicalInfrastructureCompliancePolicy
];

const CONTROL_POLICIES = [
  policies.HostControlPolicy,
  policies.VMControlPolicy,
  policies.ReplicatorControlPolicy,
  policies.PodControlPolicy,
  policies.ContainerNodeControlPolicy,
  policies.ContainerImageControlPolicy,
  policies.ProviderControlPolicy,
  policies.PhysicalInfrastructureControlPolicy
];

const POLICIES = COMPLIANCE_POLICIES + CONTROL_POLICIES;

const PHYS_POLICIES = [
  policies.PhysicalInfrastructureCompliancePolicy,
  policies.PhysicalInfrastructureControlPolicy
];

const CONDITIONS = [
  conditions.HostCondition,
  conditions.VMCondition,
  conditions.ReplicatorCondition,
  conditions.PodCondition,
  conditions.ContainerNodeCondition,
  conditions.ContainerImageCondition,
  conditions.ProviderCondition
];

const PolicyAndCondition = namedtuple(
  "PolicyAndCondition",
  ["name", "policy", "condition"]
);

const POLICIES_AND_CONDITIONS = zip_p(CONTROL_POLICIES, CONDITIONS).map(obj => (
  PolicyAndCondition.call({
    name: obj[0].__name__,
    policy: obj[0],
    condition: obj[1]
  })
));

const EVENTS = [
  "Login failed",
  "Host Auth Changed",
  "Host Auth Error",
  "Host Auth Incomplete Credentials",
  "Host Auth Invalid",
  "Host Auth Unreachable",
  "Host Auth Valid",
  "Provider Auth Changed",
  "Provider Auth Error",
  "Provider Auth Incomplete Credentials",
  "Provider Auth Invalid",
  "Provider Auth Unreachable",
  "Provider Auth Valid",
  "Tag Complete",
  "Tag Parent Cluster Complete",
  "Tag Parent Datastore Complete",
  "Tag Parent Host Complete",
  "Tag Parent Resource Pool Complete",
  "Tag Request",
  "Un-Tag Complete",
  "Un-Tag Parent Cluster Complete",
  "Un-Tag Parent Datastore Complete",
  "Un-Tag Parent Host Complete",
  "Un-Tag Parent Resource Pool Complete",
  "Un-Tag Request",
  "Container Image Compliance Failed",
  "Container Image Compliance Passed",
  "Container Node Compliance Failed",
  "Container Node Compliance Passed",
  "Host Compliance Failed",
  "Host Compliance Passed",
  "Pod Compliance Failed",
  "Pod Compliance Passed",
  "Provider Compliance Failed",
  "Provider Compliance Passed",
  "Replicator Compliance Failed",
  "Replicator Compliance Passed",
  "VM Compliance Failed",
  "VM Compliance Passed",
  "Container Image Analysis Complete",
  "Container Image Analysis Failure",
  "Container Image Analysis Request",
  "Container Image Discovered",
  "Container Node Failed Mount",
  "Container Node Invalid Disk Capacity",
  "Container Node Not Ready",
  "Container Node Not Schedulable",
  "Container Node Ready",
  "Container Node Rebooted",
  "Container Node Schedulable",
  "Container Project Discovered",
  "Pod Container Created",
  "Pod Container Failed",
  "Pod Container Killing",
  "Pod Container Started",
  "Pod Container Stopped",
  "Pod Container Unhealthy",
  "Pod Deadline Exceeded",
  "Pod Failed Scheduling",
  "Pod Failed Validation",
  "Pod Insufficient Free CPU",
  "Pod Insufficient Free Memory",
  "Pod Out of Disk",
  "Pod Scheduled",
  "Pod hostPort Conflict",
  "Pod nodeSelector Mismatching",
  "Replicator Failed Creating Pod",
  "Replicator Successfully Created Pod",
  "Database Failover Executed",
  "Datastore Analysis Complete",
  "Datastore Analysis Request",
  "Host Added to Cluster",
  "Host Analysis Complete",
  "Host Analysis Request",
  "Host Connect",
  "Host Disconnect",
  "Host Failure",
  "Host Maintenance Enter Request",
  "Host Maintenance Exit Request",
  "Host Reboot Request",
  "Host Removed from Cluster",
  "Host Reset Request",
  "Host Shutdown Request",
  "Host Standby Request",
  "Host Start Request",
  "Host Stop Request",
  "Host Vmotion Disable Request",
  "Host Vmotion Enable Request",
  "Orchestration Stack Retire Request",
  "Physical Server Reset",
  "Physical Server Shutdown",
  "Physical Server Start",
  "Service Provision Complete",
  "Service Retire Request",
  "Service Retired",
  "Service Retirement Warning",
  "Service Start Request",
  "Service Started",
  "Service Stop Request",
  "Service Stopped",
  "VM Renamed Event",
  "VM Settings Change",
  "VM Create Complete",
  "VM Delete (from Disk)",
  "VM Delete (from Disk) Request",
  "VM Provision Complete",
  "VM Retire Request",
  "VM Retired",
  "VM Retirement Warning",
  "VM Template Create Complete",
  "VM Analysis Complete",
  "VM Analysis Failure",
  "VM Analysis Request",
  "VM Analysis Start",
  "VM Clone Complete",
  "VM Clone Start",
  "VM Guest Reboot",
  "VM Guest Reboot Request",
  "VM Guest Shutdown",
  "VM Guest Shutdown Request",
  "VM Live Migration (VMOTION)",
  "VM Pause",
  "VM Pause Request",
  "VM Power Off",
  "VM Power Off Request",
  "VM Power On",
  "VM Power On Request",
  "VM Remote Console Connected",
  "VM Removal from Inventory",
  "VM Removal from Inventory Request",
  "VM Reset",
  "VM Reset Request",
  "VM Resume",
  "VM Shelve",
  "VM Shelve Offload",
  "VM Shelve Offload Request",
  "VM Shelve Request",
  "VM Snapshot Create Complete",
  "VM Snapshot Create Request",
  "VM Snapshot Create Started",
  "VM Standby of Guest",
  "VM Standby of Guest Request",
  "VM Suspend",
  "VM Suspend Request"
];

const ALERT_PROFILES = [
  alert_profiles.ClusterAlertProfile,
  alert_profiles.DatastoreAlertProfile,
  alert_profiles.HostAlertProfile,
  alert_profiles.ProviderAlertProfile,
  alert_profiles.ServerAlertProfile,
  alert_profiles.VMInstanceAlertProfile
];

function two_random_policies(appliance) {
  let policy_collection = appliance.collections.policies;
  let policies = POLICIES;

  let policy_1 = policy_collection.create(
    random.choice(policies),
    fauxfactory.gen_alphanumeric()
  );

  let policy_2 = policy_collection.create(
    random.choice(policies),
    fauxfactory.gen_alphanumeric()
  );

  yield([policy_1, policy_2]);
  policy_collection.delete(policy_1, policy_2)
};

function policy_class(request) {
  return request.param
};

function alert_profile_class(request) {
  return request.param
};

function policy(appliance, policy_class) {
  let policy_ = appliance.collections.policies.create(
    policy_class,
    fauxfactory.gen_alphanumeric()
  );

  yield(policy_);
  policy_.delete()
};

function policy_for_event_test(appliance) {
  let policy_ = appliance.collections.policies.create(
    policies.VMControlPolicy,
    fauxfactory.gen_alphanumeric()
  );

  yield(policy_);
  policy_.delete()
};

function condition_for_expressions(request, appliance) {
  let condition_class = request.param;

  let condition = appliance.collections.conditions.create(
    condition_class,
    fauxfactory.gen_alphanumeric(),

    {
      expression: "fill_field({} : Name, IS NOT EMPTY)".format(condition_class.FIELD_VALUE),

      scope: "fill_field({} : Name, INCLUDES, {})".format(
        condition_class.FIELD_VALUE,
        fauxfactory.gen_alpha()
      )
    }
  );

  yield(condition);
  condition.delete()
};

function condition_prerequisites(request, appliance) {
  let condition_class = request.param;

  let expression = "fill_field({} : Name, =, {})".format(
    condition_class.FIELD_VALUE,
    fauxfactory.gen_alphanumeric()
  );

  let scope = "fill_field({} : Name, =, {})".format(
    condition_class.FIELD_VALUE,
    fauxfactory.gen_alphanumeric()
  );

  return [condition_class, scope, expression]
};

function control_policy_class(request) {
  return request.param
};

function control_policy(appliance, control_policy_class) {
  let policy = appliance.collections.policies.create(
    control_policy_class,
    fauxfactory.gen_alphanumeric()
  );

  yield(policy);
  policy.delete()
};

function action(appliance) {
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

function alert(appliance) {
  let alert_ = appliance.collections.alerts.create(
    fauxfactory.gen_alphanumeric(),

    {
      based_on: random.choice(ALERT_PROFILES).TYPE,
      timeline_event: true,
      driving_event: "Hourly Timer"
    }
  );

  yield(alert_);
  alert_.delete()
};

function alert_profile(appliance, alert_profile_class) {
  let alert = appliance.collections.alerts.create(
    fauxfactory.gen_alphanumeric(),

    {
      based_on: alert_profile_class.TYPE,
      timeline_event: true,
      driving_event: "Hourly Timer"
    }
  );

  let alert_profile_ = appliance.collections.alert_profiles.create(
    alert_profile_class,
    fauxfactory.gen_alphanumeric(),
    {alerts: [alert.description]}
  );

  yield(alert_profile_);
  alert_profile_.delete();
  alert.delete()
};

function policy_and_condition(request, appliance) {
  let condition_class = request.param.condition;
  let policy_class = request.param.policy;

  let expression = "fill_field({} : Name, =, {})".format(
    condition_class.FIELD_VALUE,
    fauxfactory.gen_alphanumeric()
  );

  let condition = appliance.collections.conditions.create(
    condition_class,
    fauxfactory.gen_alphanumeric(),
    {expression}
  );

  let policy = appliance.collections.policies.create(
    policy_class,
    fauxfactory.gen_alphanumeric()
  );

  yield([policy, condition]);
  policy.delete_if_exists();
  condition.delete_if_exists()
};

function setup_for_monitor_alerts(appliance) {
  //  Insert a fired alert into the db if none is present. This is done
  //       for tests involving the Monitor->Alerts pages.
  //   
  let query_str = "SELECT * FROM miq_alert_statuses";
  let delete_str = "DELETE FROM miq_alert_statuses";

  if (appliance.db.client.engine.execute(query_str).rowcount > 0) {
    logger.info("Deleting all fired alerts from the appliance.");
    appliance.db.engine.execute(delete_str)
  };

  let table = appliance.db.client.ems_clusters;
  let ems_id_column = table.getattr("ems_id");
  let ems_id = appliance.db.client.session.query(ems_id_column)[0].ems_id;
  logger.info("Injecting a fired alert into the appliance DB.");
  let description = "a fake fired alert";

  let insert_str = "INSERT INTO miq_alert_statuses (id, miq_alert_id, resource_id, resource_type, result, description, ems_id) VALUES ('100', '1', '1', 'VmOrTemplate', 'f', '{}', '{}')".format(
    description,
    ems_id.to_i
  );

  delete_str += " WHERE id='100'";
  appliance.db.client.engine.execute(insert_str);
  yield(description);
  logger.info("Deleting fired alert from appliance DB.");
  appliance.db.client.engine.execute(delete_str)
};

function test_condition_crud(appliance, condition_prerequisites) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let [condition_class, scope, expression] = condition_prerequisites;

  let condition = appliance.collections.conditions.create(
    condition_class,
    fauxfactory.gen_alphanumeric(),
    {scope, expression}
  );

  update(condition, () => condition.notes = "Modified!");
  condition.delete()
};

function test_action_crud(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: critical
  //       initialEstimate: 1/12h
  //   
  let action = appliance.collections.actions.create(
    fauxfactory.gen_alphanumeric(),

    {
      action_type: "Tag",
      action_values: {tag: ["My Company Tags", "Department", "Accounting"]}
    }
  );

  update(action, () => action.description = "w00t w00t");
  action.delete()
};

function test_policy_crud(appliance, policy_class) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       initialEstimate: 1/4h
  //   
  let policy = appliance.collections.policies.create(
    policy_class,
    fauxfactory.gen_alphanumeric()
  );

  update(policy, () => policy.notes = "Modified!");
  policy.delete()
};

function test_policy_copy(policy_class, policy) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let random_policy_copy = policy.copy();
  if (!random_policy_copy.exists) throw new ();
  random_policy_copy.delete()
};

function test_assign_two_random_events_to_control_policy(control_policy, control_policy_class, soft_assert) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       initialEstimate: 1/4h
  //   
  let random_events = random.sample(EVENTS, 2);
  control_policy.assign_events(...random_events);
  soft_assert.call(control_policy.is_event_assigned(random_events[0]));
  soft_assert.call(control_policy.is_event_assigned(random_events[1]))
};

function test_control_assign_actions_to_event(request, policy_class, policy, action) {
  let event;

  // 
  //   Bugzilla:
  //       1700070
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: critical
  //       initialEstimate: 1/12h
  //   
  if (CONTROL_POLICIES.include(policy.class)) {
    event = random.choice(EVENTS);
    policy.assign_events(event);
    let _cleanup = () => policy.unassign_events(event)
  } else {
    let prefix = (is_bool(!policy.TREE_NODE == "Vm") ? policy.TREE_NODE : policy.TREE_NODE.upcase());

    if (is_bool(policy.TREE_NODE == "Physical Infrastructure" && BZ(1700070).blocks)) {
      prefix = policy.PRETTY
    };

    event = `${prefix} Compliance Check`;

    request.addfinalizer(() => (
      policy.assign_actions_to_event(
        event,
        {"Mark as Non-Compliant": false}
      )
    ))
  };

  policy.assign_actions_to_event(event, method("action"));

  if (method("action").to_s != policy.assigned_actions_to_event(event)[0]) {
    throw new ()
  }
};

function test_assign_condition_to_control_policy(request, policy_and_condition) {
  // This test checks if a condition is assigned to a control policy.
  //   Steps:
  //       * Create a control policy.
  //       * Assign a condition to the created policy.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let [policy, condition] = policy_and_condition;
  policy.assign_conditions(condition);
  request.addfinalizer(policy.assign_conditions);
  if (!policy.is_condition_assigned(condition)) throw new ()
};

function test_policy_profile_crud(appliance, two_random_policies) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: critical
  //       initialEstimate: 1/12h
  //   
  let profile = appliance.collections.policy_profiles.create(
    fauxfactory.gen_alphanumeric(),
    {policies: two_random_policies}
  );

  update(profile, () => profile.notes = "Modified!");
  profile.delete()
};

function test_modify_condition_expression(condition_for_expressions, fill_type, expression, verify) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: low
  //       initialEstimate: 1/12h
  //   
  update(condition_for_expressions, () => (
    condition_for_expressions.expression = expression.format(condition_for_expressions.FIELD_VALUE)
  ));

  if (condition_for_expressions.read_expression() != verify.format(condition_for_expressions.FIELD_VALUE)) {
    throw new ()
  }
};

function test_alert_crud(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       initialEstimate: 1/12h
  //   
  let alert = appliance.collections.alerts.create(fauxfactory.gen_alphanumeric());
  update(alert, () => alert.notification_frequency = "2 Hours");
  alert.delete()
};

function test_control_alert_copy(alert) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let alert_copy = alert.copy({description: fauxfactory.gen_alphanumeric()});
  if (!alert_copy.exists) throw new ();
  alert_copy.delete()
};

function test_alert_profile_crud(request, appliance, alert_profile_class) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: critical
  //       initialEstimate: 1/12h
  // 
  //   Bugzilla:
  //       1723815
  //   
  let alert = appliance.collections.alerts.create(
    fauxfactory.gen_alphanumeric(),

    {
      based_on: alert_profile_class.TYPE,
      timeline_event: true,
      driving_event: "Hourly Timer"
    }
  );

  request.addfinalizer(alert.delete);

  let alert_profile = appliance.collections.alert_profiles.create(
    alert_profile_class,
    fauxfactory.gen_alphanumeric(),
    {alerts: [alert.description]}
  );

  update(alert_profile, () => alert_profile.notes = "Modified!");
  alert_profile.delete()
};

function test_alert_profile_assigning(alert_profile, appliance) {
  let options;

  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       initialEstimate: 1/12h
  //   
  let view = appliance.browser.create_view(AlertProfileDetailsView);

  if (is_bool(alert_profile.is_a(alert_profiles.ServerAlertProfile))) {
    options = {}
  } else {
    options = {}
  };

  let first_change = alert_profile.assign_to({None: options});
  if (!first_change) throw new ();
  view.flash.assert_success_message("Alert Profile \"{}\" assignments successfully saved".format(alert_profile.description));
  let second_change = alert_profile.assign_to({None: options});
  if (!!second_change) throw new ();
  view.flash.assert_success_message("Edit Alert Profile assignments cancelled by user")
};

function test_control_is_ansible_playbook_available_in_actions_dropdown(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       initialEstimate: 1/12h
  //   
  let view = navigate_to(appliance.collections.actions, "Add");

  if (!view.action_type.all_options.map(option => option.text).include("Run Ansible Playbook")) {
    throw new ()
  }
};

function test_alerts_monitor_overview_page(appliance, virtualcenter_provider, setup_for_monitor_alerts) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let view = navigate_to(
    appliance.collections.alerts,
    "MonitorOverview"
  );

  let status_card = view.status_card(virtualcenter_provider.name);

  wait_for({
    func() {
      return status_card.notifications[0].text.to_i == 1
    },

    num_sec: 20,
    handle_exception: true
  });

  status_card.click();

  if (view.navigation.currently_selected != [
    "Monitor",
    "Alerts",
    "All Alerts"
  ]) throw new ()
};

function test_default_policy_events(policy_for_event_test, soft_assert) {
  // 
  //   Test to ensure that the events listed on the Event Assignment page for policies do not change
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let view = navigate_to(policy_for_event_test, "Details");
  view.configuration.item_select("Edit this Policy's Event assignments");
  view = policy_for_event_test.create_view(EditPolicyEventAssignments);

  soft_assert.call(
    sorted(view.events.all_labels) == sorted(EVENTS),
    "Policy events do not match!"
  );

  view.cancel_button.click()
}
