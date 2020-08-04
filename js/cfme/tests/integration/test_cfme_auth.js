require_relative("fauxfactory");
include(Fauxfactory);
require_relative("cfme");
include(Cfme);
require_relative("cfme/base/credential");
include(Cfme.Base.Credential);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/auth");
include(Cfme.Utils.Auth);
require_relative("cfme/utils/auth");
include(Cfme.Utils.Auth);
require_relative("cfme/utils/auth");
include(Cfme.Utils.Auth);
require_relative("cfme/utils/auth");
include(Cfme.Utils.Auth);
require_relative("cfme/utils/auth");
include(Cfme.Utils.Auth);
require_relative("cfme/utils/auth");
include(Cfme.Utils.Auth);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.uncollectif(
    temp_appliance_preconfig_long => temp_appliance_preconfig_long.is_pod,
    {reason: "Tests not valid for podified"}
  ),

  pytest.mark.meta({blockers: [
    GH("ManageIQ/integration_tests:6465", {unblock(auth_mode, prov_key) {
      return !["external", "ldaps"].include(auth_mode) && auth_data.auth_providers[prov_key].type == "openldaps"
    }}),

    BZ(1593171)
  ]}),

  pytest.mark.browser_isolation,
  pytest.mark.long_running,
  pytest.mark.serial,

  pytest.mark.usefixtures(
    "prov_key",
    "auth_mode",
    "auth_provider",
    "configure_auth",
    "auth_user"
  ),

  test_requirements.auth
];

let test_param_maps = {
  amazon: {[AmazonAuthProvider.auth_type]: {user_types: ["username"]}},

  ldap: {
    [ActiveDirectoryAuthProvider.auth_type]: {user_types: [
      "cn",
      "email",
      "uid",
      "upn"
    ]},

    [FreeIPAAuthProvider.auth_type]: {user_types: ["cn", "uid"]},
    [OpenLDAPAuthProvider.auth_type]: {user_types: ["cn", "uid"]}
  },

  external: {
    [FreeIPAAuthProvider.auth_type]: {user_types: ["uid"]},
    [OpenLDAPSAuthProvider.auth_type]: {user_types: ["uid"]}
  }
};

function pytest_generate_tests(metafunc) {
  //  zipper auth_modes and auth_prov together and drop the nonsensical combos 
  let argnames = ["auth_mode", "prov_key", "user_type", "auth_user"];
  let argvalues = [];
  let idlist = [];

  if (!auth_data.include("auth_providers")) {
    metafunc.parametrize(argnames, [pytest.param(
      null,
      null,
      null,
      null,
      {marks: pytest.mark.uncollect({reason: "auth providers data missing"})}
    )]);

    return
  };

  for (let mode in test_param_maps.keys()) {
    for (let auth_type in test_param_maps.get(mode, {})) {
      let eligible_providers = auth_data.auth_providers.to_a().select((key, prov_dict) => (
        prov_dict.type == auth_type
      )).map((key, prov_dict) => [key, prov_dict]).to_h;

      for (let user_type in test_param_maps[mode][auth_type].user_types) {
        for (let [key, prov_dict] in eligible_providers.to_a()) {
          for (let user_dict in auth_user_data(key, user_type) || [].map(u => u)) {
            if (prov_dict.get("user_types", []).include(user_type)) {
              argvalues.push([mode, key, user_type, user_dict]);
              idlist.push([mode, key, user_type, user_dict.username].join("-"))
            }
          }
        }
      }
    }
  };

  metafunc.parametrize(argnames, argvalues, {ids: idlist})
};

function user_obj(temp_appliance_preconfig_long, auth_user, user_type) {
  // return a simple user object, see if it exists and delete it on teardown
  let username = (user_type == "upn" ? auth_user.username.gsub(
    " ",
    "-"
  ) : auth_user.username);

  let user = temp_appliance_preconfig_long.collections.users.simple_user(
    username,
    credentials[auth_user.password].password,
    {fullname: auth_user.fullname || auth_user.username}
  );

  yield(user);
  temp_appliance_preconfig_long.browser.widgetastic.refresh();
  temp_appliance_preconfig_long.server.login_admin();
  if (is_bool(user.exists)) user.delete()
};

function log_monitor(user_obj, temp_appliance_preconfig_long) {
  // Search evm.log for any plaintext password
  let result = LogValidator("/var/www/miq/vmdb/log/evm.log", {
    failure_patterns: [`${user_obj.credential.secret}`],
    hostname: temp_appliance_preconfig_long.hostname
  });

  result.start_monitoring();
  yield(result)
};

function test_login_evm_group(temp_appliance_preconfig_long, auth_user, user_obj, soft_assert, log_monitor) {
  // This test checks whether a user can login while assigned a default EVM group
  //       Prerequisities:
  //           * ``auth_data.yaml`` file
  //           * auth provider configured with user as a member of a group matching default EVM group
  //       Test will configure auth and login
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Auth
  //       initialEstimate: 1/4h
  //   
  let evm_group_names = auth_user.groups.select(group => (
    group.downcase().include("evmgroup")
  )).map(group => group);

  user_obj(() => {
    logger.info(
      "Logging in as user %s, member of groups %s",
      user_obj,
      evm_group_names
    );

    let view = navigate_to(
      temp_appliance_preconfig_long.server,
      "LoggedIn"
    );

    if (!view.is_displayed) throw `user ${user_obj} failed login`;

    soft_assert.call(
      user_obj.name == view.current_fullname,
      `user ${user_obj} is not in view fullname`
    );

    for (let name in evm_group_names) {
      soft_assert.call(
        view.group_names.include(name),
        `user ${user_obj} evm group ${name} not in view group_names`
      )
    }
  });

  temp_appliance_preconfig_long.server.login_admin();

  if (!user_obj.exists) {
    throw `user record should have been created for \"${user_obj}\"`
  };

  if (!log_monitor.validate()) throw new ()
};

function retrieve_group(temp_appliance_preconfig_long, auth_mode, username, groupname, auth_provider, { tenant = null }) {
  // Retrieve group from ext/ldap auth provider through UI
  // 
  //   Args:
  //       temp_appliance_preconfig_long: temp_appliance_preconfig_long object
  //       auth_mode: key from cfme.configure.configuration.server_settings.AUTH_MODES, parametrization
  //       user_data: user_data AttrDict from yaml, with username, groupname, password fields
  // 
  //   
  let group = temp_appliance_preconfig_long.collections.groups.instantiate({
    description: groupname,
    role: "EvmRole-user",
    tenant,
    user_to_lookup: username,

    ldap_credentials: Credential({
      principal: auth_provider.bind_dn,
      secret: auth_provider.bind_password
    })
  });

  let add_method = (auth_mode == "external" ? "add_group_from_ext_auth_lookup" : "add_group_from_ldap_lookup");

  if (is_bool(!group.exists)) {
    group.getattr(add_method).call();
    wait_for(() => group.exists)
  } else {
    logger.info("User Group exists, skipping create: %r", group)
  };

  return group
};

function test_login_retrieve_group(temp_appliance_preconfig_long, request, log_monitor, auth_mode, auth_provider, soft_assert, auth_user, user_obj) {
  // This test checks whether different cfme auth modes are working correctly.
  //      authmodes tested as part of this test: ext_ipa, ext_openldap, miq_openldap
  //      e.g. test_auth[ext-ipa_create-group]
  //       Prerequisities:
  //           * ``auth_data.yaml`` file
  //       Steps:
  //           * Make sure corresponding auth_modes data is updated to ``auth_data.yaml``
  //           * this test fetches the auth_modes from yaml and generates tests per auth_mode.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Auth
  //       initialEstimate: 1/4h
  //   
  let non_evm_group = auth_user.groups || [].select(g => (
    !g.downcase().include("evmgroup")
  )).map(g => g)[0];

  let group = retrieve_group(
    temp_appliance_preconfig_long,
    auth_mode,
    auth_user.username,
    non_evm_group,
    auth_provider,
    {tenant: "My Company"}
  );

  user_obj(() => {
    let view = navigate_to(
      temp_appliance_preconfig_long.server,
      "LoggedIn"
    );

    soft_assert.call(
      view.current_fullname == user_obj.name,

      "user full name \"{}\" did not match UI display name \"{}\"".format(
        user_obj.name,
        view.current_fullname
      )
    );

    soft_assert.call(
      view.group_names.include(group.description),

      "user group \"{}\" not displayed in UI groups list \"{}\"".format(
        group.description,
        view.group_names
      )
    )
  });

  temp_appliance_preconfig_long.server.login_admin();

  if (!user_obj.exists) {
    throw `User record for \"${user_obj}\" should exist after login`
  };

  if (!log_monitor.validate()) throw new ();

  let _cleanup = () => {
    if (is_bool(user_obj.exists)) user_obj.delete();
    if (is_bool(group.exists)) return group.delete()
  }
};

function format_user_principal(username, user_type, auth_provider) {
  // Format CN/UID/UPN usernames for authentication with locally created groups
  if (user_type == "upn") {
    return "{}@{}".format(
      username.gsub(" ", "-"),
      auth_provider.user_types[user_type].user_suffix
    )
  } else if (["uid", "cn"].include(user_type)) {
    return "{}={},{}".format(
      user_type,
      username,
      auth_provider.user_types[user_type].user_suffix
    )
  } else {
    pytest.skip(`No user formatting for ${auth_provider} and user type ${user_type}`)
  }
};

function local_group(temp_appliance_preconfig_long) {
  // Helper method to check for existance of a group and delete if need be
  let group_name = gen_alphanumeric({length: 15, start: "test-group-"});

  let group = temp_appliance_preconfig_long.collections.groups.create({
    description: group_name,
    role: "EvmRole-desktop"
  });

  if (!group.exists) throw new ();
  yield(group);
  if (is_bool(group.exists)) group.delete()
};

function local_user(temp_appliance_preconfig_long, auth_user, user_type, auth_provider, local_group) {
  let user = temp_appliance_preconfig_long.collections.users.create({
    name: auth_user.fullname || auth_user.username,

    credential: Credential({
      principal: format_user_principal(
        auth_user.username,
        user_type,
        auth_provider
      ),

      secret: credentials[auth_user.password].password
    }),

    groups: [local_group]
  });

  yield(user);
  if (is_bool(user.exists)) user.delete()
};

function do_not_fetch_remote_groups(temp_appliance_preconfig_long) {
  temp_appliance_preconfig_long.server.authentication.auth_settings = {auth_settings: {get_groups: false}};
  time.sleep(30);
  yield
};

function test_login_local_group(temp_appliance_preconfig_long, local_user, local_group, soft_assert, do_not_fetch_remote_groups) {
  // 
  //   Test remote authentication with a locally created group.
  //   Group is NOT retrieved from or matched to those on authentication provider
  // 
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/4h
  //       casecomponent: Auth
  //   
  local_user(() => {
    let view = navigate_to(
      temp_appliance_preconfig_long.server,
      "LoggedIn"
    );

    soft_assert.call(
      view.current_fullname == local_user.name,

      "user full name \"{}\" did not match UI display name \"{}\"".format(
        local_user.name,
        view.current_fullname
      )
    );

    soft_assert.call(
      view.group_names.include(local_group.description),

      "local group \"{}\" not displayed in UI groups list \"{}\"".format(
        local_group.description,
        view.group_names
      )
    )
  })
};

function test_user_group_switching(temp_appliance_preconfig_long, auth_user, auth_mode, auth_provider, soft_assert, request, user_obj, log_monitor) {
  // Test switching groups on a single user, between retreived group and built-in group
  // 
  //   Bugzilla:
  //       1759291
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/4h
  //       casecomponent: Auth
  //   
  let retrieved_groups = [];
  let __dummy0__ = false;

  for (let group in auth_user.groups) {
    if (!group.downcase().include("evmgroup")) {
      logger.info(`Retrieving a user group that is non evm built-in: ${group}`);

      retrieved_groups.push(retrieve_group(
        temp_appliance_preconfig_long,
        auth_mode,
        auth_user.username,
        group,
        auth_provider,
        {tenant: "My Company"}
      ))
    };

    if (group == auth_user.groups[-1]) __dummy0__ = true
  };

  if (__dummy0__) {
    logger.info(("All user groups for group switching are evm built-in: {}").format(auth_user.groups))
  };

  user_obj(() => {
    let view = navigate_to(
      temp_appliance_preconfig_long.server,
      "LoggedIn"
    );

    if (view.group_names.size <= 1) {
      throw "Only a single group is displayed for the user"
    };

    let display_other_groups = view.group_names.select(g => (
      g != view.current_groupname
    )).map(g => g);

    soft_assert.call(
      view.current_fullname == user_obj.name,

      "user full name \"{}\" did not match UI display name \"{}\"".format(
        auth_user,
        view.current_fullname
      )
    );

    for (let group in retrieved_groups) {
      soft_assert.call(
        view.group_names.include(group.description),

        "user group \"{}\" not displayed in UI groups list \"{}\"".format(
          group,
          view.group_names
        )
      )
    };

    for (let other_group in display_other_groups) {
      soft_assert.call(
        auth_user.groups.include(other_group),

        "Group {} in UI not expected for user {}".format(
          other_group,
          auth_user
        )
      );

      view.change_group(other_group);

      if (!view.is_displayed) {
        throw "Not logged in after switching to group {} for {}".format(
          other_group,
          auth_user
        )
      };

      soft_assert.call(
        other_group == view.current_groupname,
        "After switching to group {}, its not displayed as active".format(other_group)
      )
    }
  });

  temp_appliance_preconfig_long.server.login_admin();

  if (!user_obj.exists) {
    throw `User record for \"${auth_user}\" should exist after login`
  };

  if (!log_monitor.validate()) throw new ();

  let _cleanup = () => {
    for (let group in retrieved_groups) {
      if (is_bool(group.exists)) group.delete()
    }
  }
}
