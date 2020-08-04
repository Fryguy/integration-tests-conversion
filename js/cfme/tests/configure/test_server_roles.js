require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);

let server_roles_conf = cfme_data.get(
  "server_roles",
  {all: [], sets: {}}
);

function all_possible_roles(appliance) {
  let roles = server_roles_conf.all;

  if (roles == []) {
    pytest.skip("Empty server roles in cfme_data, cannot generate tests")
  };

  if (appliance.version < "5.11") {
    roles.remove("internet_connectivity");
    roles.remove("remote_console")
  } else {
    roles.remove("websocket")
  };

  return roles
};

function roles(request, all_possible_roles) {
  let result = {};

  try {
    for (let role in all_possible_roles) {
      result[role] = cfme_data.get("server_roles", {}).sets[request.param].include(role)
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof [KeyError, NoMethodError]) {
      pytest.skip(`Failed looking up role '${role}' in cfme_data['server_roles']['sets']['${request.param}']`)
    } else {
      throw $EXCEPTION
    }
  };

  result.user_interface = true;
  return result
};

function test_server_roles_changing(request, roles, appliance) {
  //  Test that sets and verifies the server roles in configuration.
  // 
  //   If there is no forced interrupt, it cleans after, so the roles are intact after the testing.
  //   Note:
  //     TODO:
  //     - Use for parametrization on more roles set?
  //     - Change the yaml role list to dict.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //   
  let server_settings = appliance.server.settings;
  let original_roles = server_settings.server_roles_db;

  request.addfinalizer(() => (
    server_settings.update_server_roles_db(original_roles)
  ));

  server_settings.update_server_roles_ui(roles);

  for (let [role, is_enabled] in server_settings.server_roles_ui.to_a()) {
    if (is_bool(is_enabled)) {
      if (!roles[role]) throw `Role '${role}' is selected but should not be`
    } else if (!!roles[role]) {
      throw `Role '${role}' is not selected but should be`
    }
  }
}
