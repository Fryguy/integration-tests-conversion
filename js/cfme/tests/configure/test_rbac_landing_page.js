const ALL_FEATURES_LST = new Set([
  ...FEATURES_IN_510,
  ...FEATURES_IN_511
]);

const DIFFERENT_VALUE_LST = [
  "chargeback",
  "dashboard",
  "miq_report",
  "utilization"
];

function setup_user(appliance, feature) {
  let uid = fauxfactory.gen_alpha({length: 4});

  let role = appliance.rest_api.collections.roles.action.create({
    name: `test_role_${uid}`,
    settings: {restrictions: {vms: "user"}},
    features: [{identifier: feature}, {identifier: "my_settings"}]
  })[0];

  let group = appliance.rest_api.collections.groups.action.create({
    description: `test_group_${uid}`,
    role: {id: role.id},
    tenant: {href: appliance.rest_api.collections.tenants.all[0].href}
  })[0];

  let user = appliance.rest_api.collections.users.action.create({
    userid: `test_user_${uid}`,
    password: "smartvm",
    name: `${group.description} User`,
    group: {id: group.id}
  })[0];

  yield(appliance.collections.users.instantiate({
    name: user.name,
    credential: Credential(user.userid, "smartvm")
  }));

  user.action.delete();
  group.action.delete();
  role.action.delete()
};

function test_validate_landing_pages_for_rbac(appliance, feature, setup_user) {
  // 
  //   Bugzilla:
  //       1450012
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/5h
  //       setup:
  //           1. Create a new role by selecting a few product features.
  //           2. Create a group with the new role.
  //           3. Create a new user with the new group.
  //           4. Logout.
  //           5. Login back with the new user.
  //           6. Navigate to My Settings > Visual.
  //       testSteps:
  //           1.Check the start page entries in `Show at login` dropdown list
  //       expectedResults:
  //           1. Landing pages which user has access to must be present in the dropdown list.
  //   
  let expected = (appliance.version > "5.11" ? FEATURES_IN_511[feature] : FEATURES_IN_510[feature]);

  setup_user(() => {
    let view = navigate_to(appliance.user.my_settings, "Visual");

    let all_options = view.tabs.visual.start_page.show_at_login.all_options.map(option => (
      option.text
    ));

    if (new Set(all_options) != new Set(expected)) throw new ()
  })
}
