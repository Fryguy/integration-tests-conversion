require_relative("cfme");
include(Cfme);
require_relative("cfme/base/credential");
include(Cfme.Base.Credential);
require_relative("cfme/common/provider");
include(Cfme.Common.Provider);
require_relative("cfme/configure/access_control");
include(Cfme.Configure.Access_control);
require_relative("cfme/configure/tasks");
include(Cfme.Configure.Tasks);
require_relative("cfme/containers/provider/openshift");
include(Cfme.Containers.Provider.Openshift);
require_relative("cfme/exceptions");
include(Cfme.Exceptions);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/services/myservice");
include(Cfme.Services.Myservice);
require_relative("cfme/tests/integration/test_cfme_auth");
include(Cfme.Tests.Integration.Test_cfme_auth);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/auth");
include(Cfme.Utils.Auth);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);
let pytestmark = [test_requirements.rbac];

const ACCESS_RULES_VMS = VersionPicker({
  LOWEST: "Access Rules for all Virtual Machines",
  "5.11": "All VM and Instance Access Rules"
});

const SETTINGS = VersionPicker({
  LOWEST: "Settings",
  "5.11": "User Settings"
});

function new_credential() {
  return Credential({
    principal: fauxfactory.gen_alphanumeric({start: "uid"}),
    secret: "redhat"
  })
};

function new_user(appliance, groups, { name = null, credential = null }) {
  name = name || fauxfactory.gen_alphanumeric({start: "user_"});
  credential = credential || new_credential();

  let user = appliance.collections.users.create({
    name,
    credential,
    email: "xyz@redhat.com",
    groups,
    cost_center: "Workload",
    value_assign: "Database"
  });

  return user
};

function new_role(appliance, { name = null }) {
  name = name || fauxfactory.gen_alphanumeric({start: "role_"});

  return appliance.collections.roles.create({
    name,
    vm_restriction: "None"
  })
};

function two_child_tenants(appliance) {
  let child_tenant1 = appliance.collections.tenants.create({
    name: "marketing",
    description: "marketing",
    parent: appliance.collections.tenants.get_root_tenant()
  });

  let child_tenant2 = appliance.collections.tenants.create({
    name: "finance",
    description: "finance",
    parent: appliance.collections.tenants.get_root_tenant()
  });

  yield([child_tenant1, child_tenant2]);
  child_tenant1.delete_if_exists();
  child_tenant2.delete_if_exists()
};

function setup_openldap_user_group(appliance, two_child_tenants, openldap_auth_provider) {
  let auth_provider = openldap_auth_provider;
  let ldap_user = auth_user_data(auth_provider.key, "uid")[0];
  let retrieved_groups = [];

  for (let group in ldap_user.groups) {
    if (!group.downcase().include("evmgroup")) {
      logger.info(`Retrieving a user group that is non evm built-in: ${group}`);
      let tenant = (group == "marketing" ? "My Company/marketing" : "My Company/finance");

      retrieved_groups.push(retrieve_group(
        appliance,
        "ldap",
        ldap_user.username,
        group,
        auth_provider,
        {tenant}
      ))
    } else {
      logger.info(("All user groups for group switching are evm built-in: {}").format(ldap_user.groups))
    }
  };

  let user = appliance.collections.users.simple_user(
    ldap_user.username,
    credentials[ldap_user.password].password,

    {
      groups: ldap_user.groups,
      fullname: ldap_user.fullname || ldap_user.username
    }
  );

  yield([user, retrieved_groups]);
  user.delete_if_exists();

  for (let group in retrieved_groups) {
    group.delete_if_exists()
  }
};

function check_item_visibility(tag) {
  let _check_item_visibility = (item, user_restricted) => {
    item.add_tag(tag);

    user_restricted(() => {
      if (!item.exists) throw new ()
    });

    item.remove_tag(tag);

    return user_restricted(() => {
      if (!!item.exists) throw new ()
    })
  };

  return _check_item_visibility
};

function tag_value(appliance, category, tag, request) {
  let tag_for_create, tag_for_update;
  let tag_type = request.param;

  if (tag_type == "tag") {
    tag_for_create = [[category.display_name, tag.display_name], true];
    tag_for_update = [[category.display_name, tag.display_name], false]
  } else {
    tag_for_create = "fill_tag(My Company Tags : {}, {})".format(
      category.display_name,
      tag.display_name
    );

    tag_for_update = "delete_whole_expression"
  };

  return [tag_for_create, tag_for_update]
};

function catalog_obj(appliance) {
  let catalog_name = fauxfactory.gen_alphanumeric({start: "cat_"});
  let catalog_desc = "My Catalog";

  let cat = appliance.collections.catalogs.create({
    name: catalog_name,
    description: catalog_desc
  });

  yield(cat);
  if (is_bool(cat.exists)) cat.delete()
};

function test_user_crud(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let user = new_user(appliance, [group]);
  update(user, () => user.name = `${user.name}edited`);
  let copied_user = user.copy();
  copied_user.delete();
  user.delete()
};

function test_user_assign_multiple_groups(appliance, request) {
  // Assign a user to multiple groups
  // 
  //   Steps:
  //       * Create a user and assign them to multiple groups
  //       * Login as the user
  //       * Confirm that the user has each group visible in the Settings menu
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_names = [
    "EvmGroup-user",
    "EvmGroup-administrator",
    "EvmGroup-user_self_service",
    "EvmGroup-desktop"
  ];

  let group_collection = appliance.collections.groups;

  let group_list = group_names.map(name => (
    group_collection.instantiate({description: name})
  ));

  let user = new_user(appliance, {groups: group_list});
  request.addfinalizer(user.delete);
  request.addfinalizer(user.appliance.server.login_admin);

  user(() => {
    let view = navigate_to(appliance.server, "LoggedIn");
    let assigned_groups = view.group_names;

    if (new Set(assigned_groups) != new Set(group_names)) {
      throw "User {} assigned groups {} are different from expected groups {}".format(
        user,
        view.group_names,
        group_names
      )
    }
  })
};

function test_user_change_groups(appliance) {
  // Assign a user to multiple groups and confirm that the user can successfully change groups
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/4h
  //       casecomponent: Configuration
  //   
  let group_names = [
    "EvmGroup-super_administrator",
    "EvmGroup-administrator",
    "EvmGroup-approver",
    "EvmGroup-auditor",
    "EvmGroup-desktop",
    "EvmGroup-operator",
    "EvmGroup-security",
    "EvmGroup-user",
    "EvmGroup-vm_user"
  ];

  let group_collection = appliance.collections.groups;

  let group_list = group_names.map(name => (
    group_collection.instantiate({description: name})
  ));

  let test_user = new_user(appliance, {groups: group_list});

  test_user(() => {
    let view = navigate_to(appliance.server, "LoggedIn");
    let orig_group = view.current_groupname;

    let group_test_list = group_names.select(name => name != orig_group).map(name => (
      name
    )) + [orig_group];

    for (let group in group_test_list) {
      view.change_group(group);

      if (group != view.current_groupname) {
        throw "User failed to change current group from {} to {}".format(
          view.current_groupname,
          group
        )
      }
    }
  })
};

function test_user_login(appliance) {
  // 
  //   Bugzilla:
  //       1035399
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let user = new_user(appliance, [group]);

  try {
    user(() => navigate_to(appliance.server, "LoggedIn"))
  } finally {
    user.appliance.server.login_admin()
  }
};

function test_user_duplicate_username(appliance) {
  //  Tests that creating user with existing username is forbidden.
  // 
  //   Steps:
  //       * Generate some credential
  //       * Create a user with this credential
  //       * Create another user with same credential
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let credential = new_credential();
  let nu = new_user(appliance, [group], {credential});

  pytest.raises(RBACOperationBlocked, () => {
    nu = new_user(appliance, [group], {credential})
  });

  navigate_to(nu.appliance.server, "Dashboard")
};

function test_user_allow_duplicate_name(appliance) {
  //  Tests that creating user with existing full name is allowed.
  // 
  //   Steps:
  //       * Generate full name
  //       * Create a user with this full name
  //       * Create another user with same full name
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let name = fauxfactory.gen_alphanumeric({start: "user_"});
  new_user(appliance, [group], {name});
  let nu = new_user(appliance, [group], {name});
  if (!nu.exists) throw new ()
};

function test_username_required_error_validation(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});

  pytest.raises(Exception, {match: "Name can't be blank"}, () => (
    appliance.collections.users.create({
      name: "",
      credential: new_credential(),
      email: "xyz@redhat.com",
      groups: [group]
    })
  ))
};

function test_userid_required_error_validation(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});

  pytest.raises(Exception, {match: "Userid can't be blank"}, () => (
    appliance.collections.users.create({
      name: fauxfactory.gen_alphanumeric({start: "user_"}),
      credential: Credential({principal: "", secret: "redhat"}),
      email: "xyz@redhat.com",
      groups: [group]
    })
  ));

  navigate_to(appliance.server, "Dashboard")
};

function test_user_password_required_error_validation(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let check = "Password can't be blank";

  pytest.raises(Exception, {match: check}, () => (
    appliance.collections.users.create({
      name: fauxfactory.gen_alphanumeric({start: "user_"}),

      credential: Credential({
        principal: fauxfactory.gen_alphanumeric({start: "uid"}),
        secret: null
      }),

      email: "xyz@redhat.com",
      groups: [group]
    })
  ));

  navigate_to(appliance.server, "Dashboard")
};

function test_user_group_error_validation(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  pytest.raises(
    Exception,
    {match: "A User must be assigned to a Group"},

    () => (
      appliance.collections.users.create({
        name: fauxfactory.gen_alphanumeric({start: "user_"}),
        credential: new_credential(),
        email: "xyz@redhat.com",
        groups: [""]
      })
    )
  )
};

function test_user_email_error_validation(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: "EvmGroup-user"});

  pytest.raises(
    Exception,
    {match: "Email must be a valid email address"},

    () => (
      appliance.collections.users.create({
        name: fauxfactory.gen_alphanumeric({start: "user_"}),
        credential: new_credential(),
        email: "xyzdhat.com",
        groups: group
      })
    )
  )
};

function test_user_edit_tag(appliance, tag) {
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let user = new_user(appliance, [group]);
  user.add_tag(tag);

  if (!user.get_tags().map(tag_available => (
    tag_available.category.display_name == tag.category.display_name && tag_available.display_name == tag.display_name
  )).is_any) throw "Assigned tag was not found on the details page";

  user.delete()
};

function test_user_remove_tag(appliance) {
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/8h
  //       casecomponent: Tagging
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let user = new_user(appliance, [group]);
  let added_tag = user.add_tag();
  user.remove_tag(added_tag);
  navigate_to(user, "Details");

  if (!!user.get_tags().map(tag => (
    tag.category.display_name == added_tag.category.display_name && tag.display_name == added_tag.display_name
  )).is_any) throw "Remove User tag failed";

  user.delete()
};

function test_delete_default_user(appliance) {
  // Test for deleting default user Administrator.
  // 
  //   Steps:
  //       * Login as Administrator user
  //       * Try deleting the user
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let user = appliance.collections.users.instantiate({name: "Administrator"});
  pytest.raises(RBACOperationBlocked, () => user.delete())
};

function test_current_user_login_delete(appliance, request) {
  // Test for deleting current user login.
  // 
  //   Steps:
  //       * Login as Admin user
  //       * Create a new user
  //       * Login with the new user
  //       * Try deleting the user
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_name = "EvmGroup-super_administrator";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let user = new_user(appliance, [group]);
  request.addfinalizer(user.delete);
  request.addfinalizer(user.appliance.server.login_admin);
  user(() => pytest.raises(RBACOperationBlocked, () => user.delete()))
};

function test_tagvis_user(user_restricted, check_item_visibility) {
  //  Tests if group honour tag visibility feature
  //   Prerequirement:
  //       Catalog, tag, role, group and restricted user should be created
  // 
  //   Steps:
  //       1. As admin add tag to group
  //       2. Login as restricted user, group is visible for user
  //       3. As admin remove tag from group
  //       4. Login as restricted user, group is not visible for user
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/8h
  //       casecomponent: Tagging
  //   
  check_item_visibility.call(user_restricted, user_restricted)
};

function test_group_crud(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let role = "EvmRole-administrator";
  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: fauxfactory.gen_alphanumeric({start: "grp_"}),
    role
  });

  update(group, () => group.description = `${group.description}edited`);
  group.delete()
};

function test_group_crud_with_tag(appliance, provider, setup_provider, tag_value) {
  // Test for verifying group create with tag defined
  // 
  //   Steps:
  //       * Login as Admin user
  //       * Navigate to add group page
  //       * Fill all fields
  //       * Set tag
  //       * Save group
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/8h
  //       casecomponent: Tagging
  //   
  let [tag_for_create, tag_for_update] = tag_value;
  let path = "Discovered virtual machine";
  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: fauxfactory.gen_alphanumeric({start: "grp_"}),
    role: "EvmRole-approver",
    tag: tag_for_create,
    host_cluster: [[provider.data.name], true],

    vm_template: [
      [provider.data.name, provider.data.datacenters[0], path],
      true
    ]
  });

  update(group, () => {
    group.tag = tag_for_update;
    group.host_cluster = [[provider.data.name], false];

    group.vm_template = [
      [provider.data.name, provider.data.datacenters[0], path],
      false
    ]
  });

  group.delete()
};

function test_group_duplicate_name(appliance) {
  //  Verify that two groups can't have the same name
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       tags: rbac
  //       casecomponent: Configuration
  //   
  let role = "EvmRole-approver";
  let group_description = fauxfactory.gen_alphanumeric({start: "grp_"});
  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: group_description,
    role
  });

  pytest.raises(RBACOperationBlocked, () => {
    group = group_collection.create({
      description: group_description,
      role
    })
  });

  navigate_to(group.appliance.server, "Dashboard")
};

function test_group_edit_tag(appliance) {
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/8h
  //       casecomponent: Tagging
  //   
  let role = "EvmRole-approver";
  let group_description = fauxfactory.gen_alphanumeric({start: "grp_"});
  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: group_description,
    role
  });

  let added_tag = group.add_tag();

  if (!group.get_tags().map(tag => (
    tag.category.display_name == added_tag.category.display_name && tag.display_name == added_tag.display_name
  )).is_any) throw "Group edit tag failed";

  group.delete()
};

function test_group_remove_tag(appliance) {
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/8h
  //       casecomponent: Tagging
  //   
  let role = "EvmRole-approver";
  let group_description = fauxfactory.gen_alphanumeric({start: "grp_"});
  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: group_description,
    role
  });

  navigate_to(group, "Edit");
  let added_tag = group.add_tag();
  group.remove_tag(added_tag);

  if (!!group.get_tags().map(tag => (
    tag.category.display_name == added_tag.category.display_name && tag.display_name == added_tag.display_name
  )).is_any) throw "Remove Group User tag failed";

  group.delete()
};

function test_group_description_required_error_validation(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let error_text = "Description can't be blank";
  let group_collection = appliance.collections.groups;

  pytest.raises(
    Exception,
    {match: error_text},
    () => group_collection.create({description: null, role: "EvmRole-approver"})
  );

  navigate_to(group_collection.parent.server, "Dashboard")
};

function test_delete_default_group(appliance) {
  // Test for deleting default group EvmGroup-administrator.
  // 
  //   Steps:
  //       * Login as Administrator user
  //       * Try deleting the group EvmGroup-adminstrator
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: "EvmGroup-administrator"});
  pytest.raises(RBACOperationBlocked, () => group.delete())
};

function test_delete_group_with_assigned_user(appliance) {
  // Test that CFME prevents deletion of a group that has users assigned
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let role = "EvmRole-approver";
  let group_description = fauxfactory.gen_alphanumeric({start: "grp_"});
  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: group_description,
    role
  });

  new_user(appliance, [group]);
  pytest.raises(RBACOperationBlocked, () => group.delete())
};

function test_edit_default_group(appliance) {
  // Test that CFME prevents a user from editing a default group
  // 
  //   Steps:
  //       * Login as Administrator user
  //       * Try editing the group EvmGroup-adminstrator
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: "EvmGroup-approver"});
  let group_updates = {};

  pytest.raises(
    RBACOperationBlocked,
    () => group.update(group_updates)
  )
};

function test_edit_sequence_usergroups(appliance, request) {
  // Test for editing the sequence of user groups for LDAP lookup.
  // 
  //   Steps:
  //       * Login as Administrator user
  //       * create a new group
  //       * Edit the sequence of the new group
  //       * Verify the changed sequence
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       initialEstimate: 1/8h
  //       tags: rbac
  //   
  let role_name = "EvmRole-approver";
  let group_description = fauxfactory.gen_alphanumeric({start: "grp_"});
  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: group_description,
    role: role_name
  });

  request.addfinalizer(group.delete);
  group.set_group_order(group.description)
};

function test_tagvis_group(user_restricted, group_with_tag, check_item_visibility) {
  //  Tests if group honour tag visibility feature
  //   Prerequirement:
  //       Catalog, tag, role, group and restricted user should be created
  // 
  //   Steps:
  //       1. As admin add tag to group
  //       2. Login as restricted user, group is visible for user
  //       3. As admin remove tag from group
  //       4. Login as restricted user, group is not visible for user
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Tagging
  //       initialEstimate: 1/8h
  //   
  check_item_visibility.call(group_with_tag, user_restricted)
};

function test_role_crud(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let product_feature = (appliance.version > "5.11" ? [
    "Everything",
    "Configuration"
  ] : ["Everything", "Settings", "Configuration"]);

  let role = _mk_role(
    appliance,

    {name: null, vm_restriction: null, product_features: [
      [["Everything"], false],
      [product_feature, true],
      [["Everything", "Services", "Catalogs Explorer"], true]
    ]}
  );

  update(role, () => role.name = `${role.name}edited`);
  let copied_role = role.copy();
  copied_role.delete();
  role.delete()
};

function test_rolename_required_error_validation(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let view = navigate_to(appliance.collections.roles, "Add");
  view.fill({name_txt: "", vm_restriction_select: "Only User Owned"});
  if (!view.add_button.disabled) throw new ();
  view.fill({name_txt: "test-required-name"});
  if (!!view.add_button.disabled) throw new ();
  view.cancel_button.click()
};

function test_rolename_duplicate_validation(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       initialEstimate: 1/8h
  //       tags: rbac
  //   
  let name = fauxfactory.gen_alphanumeric({start: "role_"});
  let role = appliance.collections.roles.create({name});
  if (!role.exists) throw new ();
  let view = navigate_to(appliance.collections.roles, "Add");
  view.fill({name_txt: name});
  view.add_button.click();
  view.flash.assert_message("Name has already been taken", "error");
  view.cancel_button.click()
};

function test_delete_default_roles(appliance) {
  // Test that CFME prevents a user from deleting a default role
  //   when selecting it from the Access Control EVM Role checklist
  // 
  //   Steps:
  //       * Login as Administrator user
  //       * Navigate to Configuration -> Role
  //       * Try editing the group EvmRole-approver
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let role = appliance.collections.roles.instantiate({name: "EvmRole-approver"});
  pytest.raises(RBACOperationBlocked, () => role.delete())
};

function test_edit_default_roles(appliance) {
  // Test that CFME prevents a user from editing a default role
  //   when selecting it from the Access Control EVM Role checklist
  // 
  //   Steps:
  //       * Login as Administrator user
  //       * Navigate to Configuration -> Role
  //       * Try editing the group EvmRole-auditor
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let role = appliance.collections.roles.instantiate({name: "EvmRole-auditor"});

  let newrole_name = fauxfactory.gen_alphanumeric(
    20,
    {start: role.name}
  );

  let role_updates = {name: newrole_name};
  pytest.raises(RBACOperationBlocked, () => role.update(role_updates))
};

function test_delete_roles_with_assigned_group(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let role = new_role(appliance);
  let group_description = fauxfactory.gen_alphanumeric({start: "grp_"});
  let group_collection = appliance.collections.groups;

  group_collection.create({
    description: group_description,
    role: role.name
  });

  pytest.raises(RBACOperationBlocked, () => role.delete())
};

function test_assign_user_to_new_group(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let role = new_role(appliance);
  let group_description = fauxfactory.gen_alphanumeric({start: "grp_"});
  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: group_description,
    role: role.name
  });

  new_user(appliance, [group])
};

function _test_vm_provision(appliance) {
  logger.info("Checking for provision access");
  let view = navigate_to(appliance.collections.infra_vms, "VMsOnly");
  view.toolbar.lifecycle.item_enabled("Provision VMs")
};

function _test_vm_removal(appliance, provider) {
  logger.info("Testing for VM removal permission");
  let vm = appliance.collections.infra_vms.all()[0];
  logger.debug(`VM ${vm.name} selected`);
  vm.delete({cancel: true})
};

function test_permission_edit(appliance, request, product_features) {
  // 
  //   Ensures that changes in permissions are enforced on next login by attempting to navigate to
  //   a page with and without permissions to access that page
  // 
  //   Args:
  //       appliance: cfme appliance fixture
  //       request: pytest request fixture
  //       product_features: product features to set for test role
  //       action: reference to a function to execute under the test user context
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: medium
  //       casecomponent: Configuration
  //       initialEstimate: 1h
  //       tags: rbac
  //   
  let role_name = fauxfactory.gen_alphanumeric({start: "role_"});

  let role = appliance.collections.roles.create({
    name: role_name,
    vm_restriction: null,

    product_features: [[["Everything"], false]] + product_features.map(k => (
      [k, true]
    ))
  });

  let group_description = fauxfactory.gen_alphanumeric({start: "grp_"});
  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: group_description,
    role: role.name
  });

  let user = new_user(appliance, [group]);
  user(() => navigate_to(appliance.collections.infra_vms, "VMsOnly"));
  appliance.server.login_admin();

  role.update({product_features: [[["Everything"], true]] + product_features.map(k => (
    [k, false]
  ))});

  user(() => (
    pytest.raises(
      Exception,
      {match: "Could not find an element"},
      () => navigate_to(appliance.collections.infra_vms, "VMsOnly")
    )
  ));

  let _delete_user_group_role = () => {
    for (let item in [user, group, role]) {
      item.delete()
    }
  }
};

function _mk_role(appliance, { name = null, vm_restriction = null, product_features = null }) {
  // Create a thunk that returns a Role object to be used for perm
  //      testing.  name=None will generate a random name
  // 
  //   
  name = name || fauxfactory.gen_alphanumeric({start: "role_"});

  return appliance.collections.roles.create({
    name,
    vm_restriction,
    product_features
  })
};

function _go_to(cls_or_obj, { dest = "All" }) {
  // Create a thunk that navigates to the given destination
  let nav = appliance => (
    (cls_or_obj == "server" ? navigate_to(appliance.server, dest) : navigate_to(
      cls_or_obj,
      dest
    ))
  );

  return nav
};

function test_permissions(appliance, product_features, allowed_actions, disallowed_actions) {
  //  Test that that under the specified role the allowed acctions succeed
  //       and the disallowed actions fail
  // 
  //       Args:
  //           appliance: cfme_test appliance fixture
  //           role: reference to a function that will create a role object
  //           allowed_actions: Action(s) that should succeed under given roles
  //                            permission
  //           disallowed_actions: Action(s) that should fail under given roles
  //                               permission
  // 
  //       *_actions are a list of actions with each item consisting of a dictionary
  //           object: [ { \"Action Name\": function_reference_action }, ...]
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: medium
  //       casecomponent: Configuration
  //       initialEstimate: 1h
  //       tags: rbac
  //   
  let role = _mk_role(appliance, {product_features});
  let group_description = fauxfactory.gen_alphanumeric({start: "grp_"});
  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: group_description,
    role: role.name
  });

  let user = new_user(appliance, [group]);
  let fails = {};

  try {
    user(() => {
      navigate_to(appliance.server, "LoggedIn");

      for (let [name, action_thunk] in sorted(allowed_actions.to_a())) {
        try {
          action_thunk(appliance)
        } catch ($EXCEPTION) {
          if ($EXCEPTION instanceof Exception) {
            fails[name] = `${name}: ${traceback.format_exc()}`
          } else {
            throw $EXCEPTION
          }
        }
      };

      for (let [name, action_thunk] in sorted(disallowed_actions.to_a())) {
        try {
          pytest.raises(Exception, () => action_thunk(appliance))
        } catch ($EXCEPTION) {
          if ($EXCEPTION instanceof pytest.fail.Exception) {
            fails[name] = `${name}: ${traceback.format_exc()}`
          } else {
            throw $EXCEPTION
          }
        }
      };

      if (is_bool(fails)) {
        let message = "";

        for (let failure in fails.values()) {
          message = `${message}\n\n${failure}`
        };

        throw new Exception(message)
      }
    })
  } finally {
    appliance.server.login_admin()
  }
};

function single_task_permission_test(appliance, product_features, actions) {
  // Tests that action succeeds when product_features are enabled, and
  //      fail when everything but product_features are enabled
  let test_prod_features = [[["Everything"], false]] + product_features.map(f => (
    [f, true]
  ));

  test_permissions(appliance, test_prod_features, actions, {});

  test_prod_features = [[["Everything"], true]] + product_features.map(f => (
    [f, false]
  ));

  test_permissions(appliance, test_prod_features, {}, actions)
};

function test_permissions_role_crud(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/5h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let configuration = (appliance.version < "5.11" ? [
    "Everything",
    "Settings",
    "Configuration"
  ] : ["Everything", "Main Configuration"]);

  single_task_permission_test(
    appliance,
    [configuration, ["Everything", "Services", "Catalogs Explorer"]],
    {"Role CRUD": test_role_crud}
  )
};

function test_permissions_vm_provisioning(appliance, provider, setup_provider) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: medium
  //       casecomponent: Configuration
  //       initialEstimate: 1/5h
  //       tags: rbac
  //   
  let features = [
    [
      "Everything",
      "Compute",
      "Infrastructure",
      "Virtual Machines",
      "Accordions"
    ],

    [
      "Everything",
      ACCESS_RULES_VMS,
      "VM Access Rules",
      "Modify",
      "Provision VMs"
    ]
  ];

  single_task_permission_test(
    appliance,
    features,
    {"Provision VM": _test_vm_provision}
  )
};

function test_user_change_password(appliance, request) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Configuration
  //       tags: rbac
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let user = new_user(appliance, [group]);
  request.addfinalizer(user.delete);
  request.addfinalizer(appliance.server.login_admin);

  user(() => {
    appliance.server.logout();
    navigate_to(appliance.server, "LoggedIn");
    if (appliance.server.current_full_name() != user.name) throw new ()
  });

  appliance.server.login_admin();

  update(user, () => (
    user.credential = Credential({
      principal: user.credential.principal,
      secret: "another_very_secret",
      verify_secret: "another_very_secret"
    })
  ));

  user(() => {
    appliance.server.logout();
    navigate_to(appliance.server, "LoggedIn");
    if (appliance.server.current_full_name() != user.name) throw new ()
  })
};

function test_copied_user_password_inheritance(appliance, request) {
  // Test to verify that dialog for copied user should appear and password field should be
  //   empty
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: WebUI
  //       caseimportance: high
  //       initialEstimate: 1/15h
  //   
  let group_name = "EvmGroup-user";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let user = new_user(appliance, [group]);
  request.addfinalizer(user.delete);
  let view = navigate_to(user, "Details");
  view.toolbar.configuration.item_select("Copy this User to a new User");
  view = user.create_view(AddUserView, {wait: "10s"});

  if (view.password_txt.value != "" || view.password_verify_txt.value != "") {
    throw new ()
  };

  view.cancel_button.click()
};

function test_delete_default_tenant(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: low
  //       tags: cfme_tenancy
  //       initialEstimate: 1/20h
  //       testSteps:
  //           1. Login as an 'Administrator' user
  //           2. Navigate to configuration > access control > tenants
  //           3. Select default tenant('My Company') from tenants table
  //           4. Delete using 'configuration > Delete selected items'
  //           5. Check whether default tenant is deleted or not
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5. Default tenant('My Company') must not be deleted
  //   
  let view = navigate_to(appliance.collections.tenants, "All");
  let roottenant = appliance.collections.tenants.get_root_tenant();
  let msg = `Default Tenant \"${roottenant.name}\" can not be deleted`;
  let tenant = appliance.collections.tenants.instantiate({name: roottenant.name});
  appliance.collections.tenants.delete(tenant);
  if (!view.flash.assert_message(msg)) throw new ();
  if (!roottenant.exists) throw new ()
};

function test_superadmin_tenant_crud(request, appliance) {
  // Test suppose to verify CRUD operations for CFME tenants
  // 
  //   Prerequisities:
  //       * This test is not depending on any other test and can be executed against fresh appliance.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: low
  //       tags: cfme_tenancy
  //       initialEstimate: 1/4h
  //       testSteps:
  //           1. Create tenant
  //           2. Update description of tenant
  //           3. Update name of tenant
  //           4. Delete tenant
  //   
  let tenant_collection = appliance.collections.tenants;

  let tenant = tenant_collection.create({
    name: fauxfactory.gen_alphanumeric({start: "tenant1"}),
    description: "tenant1 description",
    parent: tenant_collection.get_root_tenant()
  });

  let _delete_tenant = () => {
    if (is_bool(tenant.exists)) return tenant.delete()
  };

  update(
    tenant,
    () => tenant.description = `${tenant.description}edited`
  );

  update(tenant, () => tenant.name = `${tenant.name}edited`);
  tenant.delete()
};

function test_superadmin_tenant_project_crud(request, appliance) {
  // Test suppose to verify CRUD operations for CFME projects
  // 
  //   Prerequisities:
  //       * This test is not depending on any other test and can be executed against fresh appliance.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: high
  //       tags: cfme_tenancy
  //       initialEstimate: 1/4h
  //       testSteps:
  //           1. Create tenant
  //           2. Create project as child to tenant
  //           3. Update description of project
  //           4. Update name of project
  //           5. Delete project
  //           6. Delete tenant
  //   
  let tenant_collection = appliance.collections.tenants;
  let project_collection = appliance.collections.projects;

  let tenant = tenant_collection.create({
    name: fauxfactory.gen_alphanumeric({start: "tenant1"}),
    description: "tenant1 description",
    parent: tenant_collection.get_root_tenant()
  });

  let project = project_collection.create({
    name: fauxfactory.gen_alphanumeric(12, {start: "project1"}),
    description: "project1 description",
    parent: project_collection.get_root_tenant()
  });

  let _delete_tenant_and_project = () => {
    for (let item in [project, tenant]) {
      if (is_bool(item.exists)) item.delete()
    }
  };

  update(
    project,
    () => project.description = `${project.description}edited`
  );

  update(project, () => project.name = `${project.name}_edited`);
  project.delete();
  tenant.delete()
};

function test_superadmin_child_tenant_crud(request, appliance, number_of_childrens) {
  // Test CRUD operations for CFME child tenants, where several levels of tenants are created.
  // 
  //   Prerequisities:
  //       * This test is not depending on any other test and can be executed against fresh appliance.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: high
  //       tags: cfme_tenancy
  //       initialEstimate: 1h
  //       testSteps:
  //           1. Create 5 tenants where the next tenant is always child to the previous one
  //           2. Update description of tenant(N-1)_* in the tree
  //           3. Update name of tenant(N-1)_*
  //           4. Delete all created tenants in reversed order
  //   
  let tenant_collection = appliance.collections.tenants;
  let tenant_list = [];

  let _delete_tenants = () => {
    for (let tenant in reversed(tenant_list)) {
      if (is_bool(tenant.exists)) tenant.delete()
    }
  };

  let tenant = tenant_collection.get_root_tenant();

  for (let i in (1).upto((number_of_childrens + 1) - 1)) {
    let new_tenant = tenant_collection.create({
      name: fauxfactory.gen_alpha(15, {start: `tenant_${i}_`}),
      description: fauxfactory.gen_alphanumeric(16),
      parent: tenant
    });

    tenant_list.push(new_tenant);
    tenant = new_tenant
  };

  let tenant_update = tenant.parent_tenant;

  update(
    tenant_update,
    () => tenant_update.description = `${tenant_update.description}edited`
  );

  update(
    tenant_update,
    () => tenant_update.name = `${tenant_update.name}edited`
  )
};

function test_unique_name_on_parent_level(request, appliance, collection_name) {
  // Tenant or Project has always unique name on parent level. Same name cannot be used twice.
  // 
  //   Prerequisities:
  //       * This test is not depending on any other test and can be executed against fresh appliance.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: high
  //       tags: cfme_tenancy
  //       initialEstimate: 1/20h
  //       testSteps:
  //           1. Create tenant/project
  //           2. Create another tenant/project with the same name
  //           3. Creation will fail because object with the same name exists
  //           4. Delete created objects
  //   
  let object_collection = appliance.collections.getattr(collection_name);

  let name_of_tenant = fauxfactory.gen_alphanumeric(
    15,
    {start: "tenant_"}
  );

  let tenant_description = "description";

  let tenant = object_collection.create({
    name: name_of_tenant,
    description: tenant_description,
    parent: object_collection.get_root_tenant()
  });

  pytest.raises(
    Exception,
    {match: "Failed to add a new tenant resource - Tenant: Name should be unique per parent"},

    () => {
      let tenant2 = object_collection.create({
        name: name_of_tenant,
        description: tenant_description,
        parent: object_collection.get_root_tenant()
      })
    }
  );

  tenant.delete();
  tenant.delete_if_exists();

  // pass
  try {
    tenant2.delete_if_exists()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NameError) {

    } else {
      throw $EXCEPTION
    }
  }
};

function test_superadmin_tenant_admin_crud(appliance) {
  // 
  //   Super admin is able to create new tenant administrator
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: high
  //       tags: cfme_tenancy
  //       initialEstimate: 1/4h
  //       startsin: 5.5
  //       testSteps:
  //           1. Create new tenant admin user and assign him into group EvmGroup-tenant_administrator
  //           2. Update the user details and delete the user.
  //   
  let group_name = "EvmGroup-tenant_administrator";
  let group_collection = appliance.collections.groups;
  let group = group_collection.instantiate({description: group_name});
  let user = new_user(appliance, [group]);
  if (!user.exists) throw new ();
  update(user, () => user.name = `${user.name}_edited`);
  user.delete();
  if (!!user.exists) throw new ()
};

function test_tenantadmin_group_crud(child_tenant_admin_user, tenant_role, child_tenant, request, appliance) {
  // 
  //   Perform CRUD operations on groups as Tenant administrator.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: high
  //       tags: cfme_tenancy
  //       initialEstimate: 1/4h
  //       startsin: 5.5
  //       testSteps:
  //           1. Create new tenant admin user and assign user to group EvmGroup-tenant_administrator
  //           2. As Tenant administrator, create new group, update group and delete group.
  //   
  child_tenant_admin_user(() => {
    navigate_to(appliance.server, "LoggedIn");

    if (appliance.server.current_full_name() != child_tenant_admin_user.name) {
      throw new ()
    };

    let group_collection = appliance.collections.groups;

    let group = group_collection.create({
      description: fauxfactory.gen_alphanumeric(15, "tenantgrp_"),
      role: tenant_role.name,
      tenant: `My Company/${child_tenant.name}`
    });

    request.addfinalizer(group.delete_if_exists);
    if (!group.exists) throw new ();
    update(group, () => group.description = `${group.description}edited`);
    group.delete();
    if (!!group.exists) throw new ()
  })
};

function test_tenant_unique_catalog(appliance, request, catalog_obj) {
  // 
  //   Catalog name is unique per tenant. Every tenant can have catalog with
  //   name \"catalog\" defined.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: high
  //       tags: cfme_tenancy
  //       caseposneg: negative
  //       initialEstimate: 1/2h
  //       startsin: 5.5
  //   
  let msg = "Name has already been taken";
  let view = navigate_to(appliance.collections.catalogs, "Add");

  view.fill({
    name: catalog_obj.name,
    description: catalog_obj.description
  });

  if (appliance.version > "5.11") {
    if (view.name.help_block != msg) throw new ()
  } else {
    view.add_button.click();
    view.flash.wait_displayed({timeout: 20});
    view.flash.assert_message(msg)
  }
};

function test_tenantadmin_user_crud(child_tenant_admin_user, tenant_role, child_tenant, request, appliance) {
  // 
  //   As a Tenant Admin, I want to be able to create users in my tenant.
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: high
  //       tags: cfme_tenancy
  //       initialEstimate: 1/4h
  //       startsin: 5.5
  //       testSteps:
  //           1. Login as super admin and create new tenant
  //           2. Create new role by copying EvmRole-tenant_administrator
  //           3. Create new group and choose role created in previous step and your
  //           tenant
  //           4. Create new tenant admin user and assign him into group created in
  //           previous step
  //           5. login as tenant admin
  //           6. Perform crud operations
  //           Note: BZ 1278484 - tenant admin role has no permissions to create new roles,
  //           Workaround is to add modify permissions to tenant_administrator role or Roles
  //           must be created by superadministrator. In 5.5.0.13 after giving additional permissions
  //           to tenant_admin,able to create new roles
  //   
  child_tenant_admin_user(() => {
    navigate_to(appliance.server, "LoggedIn");

    if (appliance.server.current_full_name() != child_tenant_admin_user.name) {
      throw new ()
    };

    let user = new_user(appliance, child_tenant_admin_user.groups[0]);
    request.addfinalizer(user.delete_if_exists);
    if (!user.exists) throw new ();
    update(user, () => user.name = `${user.name}_edited`);
    user.delete();
    if (!!user.exists) throw new ()
  })
};

// 
//   Members of child tenants can see service templates which are visible
//   in parent tenants.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       tags: cfme_tenancy
//       initialEstimate: 1/2h
//       startsin: 5.5
//   
// pass
function test_tenant_visibility_service_template_catalogs_all_parents() {};

// 
//   Members of parent tenant can see services of all child tenants.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       tags: cfme_tenancy
//       initialEstimate: 1h
//       startsin: 5.5
//   
// pass
function test_tenant_visibility_services_all_childs() {};

// 
//   There is new feature in 5.7, mapping of Openstack tenants to CFME
//   tenants.
// 
//   Polarion:
//       assignee: dgaikwad
//       caseimportance: medium
//       casecomponent: Appliance
//       tags: cfme_tenancy
//       initialEstimate: 1/4h
//       startsin: 5.7
//       testSteps:
//           1. Switch \"Tenant Mapping Enabled\" checkbox to Yes when adding RHOS
//           cloud provider
//           2. Create new test tenant in RHOS
//           3. Perform refresh of RHOS provider in CFME UI
//           4. New tenants are created automatically
// 
//   
// pass
function test_tenant_osp_mapping_refresh() {};

// 
//   Child tenants can see providers which were defined in parent tenants.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       tags: cfme_tenancy
//       initialEstimate: 1/6h
//       startsin: 5.5
//   
// pass
function test_tenant_visibility_providers_all_parents() {};

// 
//   Tenant members can see MIQ requests of this tenant and its children.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       tags: cfme_tenancy
//       initialEstimate: 1/2h
//       startsin: 5.5
//   
// pass
function test_tenant_visibility_miq_requests_all_childs() {};

// 
//   Tenants created by tenant mapping cannot be deleted.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       tags: cfme_tenancy
//       initialEstimate: 1/4h
//       startsin: 5.7
//       testSteps:
//           1. Add rhos which has at least one tenant enabled and perform refresh
//           2. Navigate to Configuration -> Access Control -> tenants
//           3. Try to delete any of the tenants created by tenant mapping process
//           4. This is not possible until RHOS provider is removed from VMDB
//           5. Try this again after provider is removed
//   
// pass
function test_tenant_osp_mapping_delete() {};

// 
//   Self Service UI - users can see their services
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       tags: cfme_tenancy
//       initialEstimate: 1/4h
//       startsin: 5.5
//       testSteps:
//           1. Configure LDAP authentication on CFME
//           2. Create 2 different parent parent-tenants
//               - marketing
//               - finance
//           3. Create groups marketing and finance (these are defined in LDAP) and
//           group names in LDAP and CFME must match, assign these groups to corresponding
//           tenants and assign them EvmRole-SuperAdministrator roles
//           4. In LDAP we have 3 users:
//               - bill -> member of marketing group
//               - jim -> member of finance group
//               - mike -> is member of both groups
//           5. Add rhos/amazon providers and refresh them
//               - BUG: if provider with the same IP is added to CFME already it is not
//               seen in Cloud - Providers and it cannot be added again. Therefore you have
//               to add 2 different providers as a workaround.
//               - Providers must be added under corresponding tenants!!!
//           6. Login as bill and create new catalog with  - finance_catalog and
//           catalog item
//               - catalog items cannot contain fields which requires input from users, known
//               limitation based on information from Brad\"s presentation, this is for froms
//               that have dynamic dialogs items
//           7. Login as jim and create new catalog with EC2 item
//           8. Login as jim or bill, you should see catalog items of parent-tenants and for tenant
//           they are in, mike user should see items from marketing or finance catalog based on which
//           group is active in Classic UI
//               - this does not work well - in SSUI - My Services and My requests does not show any
//               items (correct) but number of services/requests is calculated also from services not
//               relevant to actual tenant - this is fixed in next RC
//   
// pass
function test_tenant_ssui_users_can_see_their_services() {};

function test_tenant_unique_automation_domain_name_on_parent_level(appliance, request) {
  // 
  //   Automation domain name is unique across parent tenants and cannot be
  //   used twice.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: high
  //       tags: cfme_tenancy
  //       caseposneg: negative
  //       initialEstimate: 1/2h
  //       startsin: 5.5
  //   
  let domain_name = fauxfactory.gen_alphanumeric(
    15,
    {start: "domain_"}
  );

  let domain1 = appliance.collections.domains.create({
    name: domain_name,
    enabled: true
  });

  let msg = "Name has already been taken";

  pytest.raises(Exception, {match: msg}, () => {
    let domain2 = appliance.collections.domains.create({
      name: domain_name,
      enabled: true
    })
  });

  domain1.delete();

  let _delete_domain = () => {
    if (is_bool(domain1.exists)) domain1.delete();

    // pass
    try {
      if (is_bool(domain2.exists)) domain2.delete()
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NameError) {

      } else {
        throw $EXCEPTION
      }
    }
  }
};

// 
//   Tenants can see Automation domains owned by tenant or parent tenants
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: high
//       tags: cfme_tenancy
//       initialEstimate: 1/4h
//       startsin: 5.5
//       testSteps:
//           1. Configure LDAP authentication on CFME
//           2. Create 2 different parent parent-tenants
//               - marketing
//               - finance
//           3. Create groups marketing and finance (these are defined in LDAP) and
//           group names in LDAP and CFME must match, assign these groups to corresponding
//           tenants and assign them EvmRole-SuperAdministrator roles
//           4. In LDAP we have 3 users:
//               - bill -> member of marketing group
//               - jim -> member of finance group
//               - mike -> is member of both groups
//           5. In each tenant create new Automation domain and copy
//           ManageIQ/System/Request/InspectMe instance and
//           ManageIQ/System/Request/new_method method to new domain
//           6. User can see only domains (locked) from his parent tenants and can
//           create his own which are visible only to his tenant
//   
// pass
function test_tenant_automation_domains() {};

function test_superadmin_child_tenant_delete_parent_catalog(appliance, request) {
  // 
  //   Child superadmin tenant should able to delete catalog belonging to
  //   superadmin in parent tenant. This is by design tenancy has not been
  //   split any further and at this point is not expected to be changed
  //   Note: As per below BZ#1375713,  Child superadmin tenant should not
  //   delete catalog belonging to superadmin in parent tenant. However as
  //   per the current code base this is by design: \"ServiceTemplate\"
  //   => :ancestor_ids,
  //   https://github.com/ManageIQ/manageiq/blob/2a66cb59e26816c7296896620b5b
  //   7731b350943d/lib/rbac/filterer.rb#L114
  //   You\"re able to see Catalog items of parent and ancestor tenants.  If
  //   your role has permission to modify catalog items / delete them, and
  //   you can to see ones from ancestor tenants, then you can delete them.
  // 
  //   Bugzilla:
  //       1375713
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: high
  //       tags: cfme_tenancy
  //       initialEstimate: 1/2h
  //       startsin: 5.5
  //   
  let tenant_collection = appliance.collections.tenants;
  let root_tenant = tenant_collection.get_root_tenant();
  let catalog_name = fauxfactory.gen_alphanumeric({start: "cat_"});

  let cat = appliance.collections.catalogs.create({
    name: catalog_name,
    description: "my catalog"
  });

  let new_tenant = tenant_collection.create({
    name: fauxfactory.gen_alpha(15, {start: "tenant_"}),
    description: fauxfactory.gen_alphanumeric(16),
    parent: root_tenant
  });

  let group_collection = appliance.collections.groups;

  let group = group_collection.create({
    description: fauxfactory.gen_alphanumeric({start: "grp_"}),
    role: "EvmRole-super_administrator",
    tenant: `${root_tenant.name}/${new_tenant.name}`
  });

  let user = new_user(appliance, [group]);

  let _delete_user_group_tenant = () => {
    for (let item in [user, group, new_tenant]) {
      if (is_bool(item.exists)) item.delete()
    }
  };

  try {
    user(() => {
      navigate_to(appliance.server, "LoggedIn");
      cat.delete();
      if (!!cat.exists) throw new ()
    })
  } finally {
    user.appliance.server.login_admin()
  }
};

// 
//   verify if only 1 group displayed when login as tenant user ()that one
//   where user belongs to)
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       tags: cfme_tenancy
//       initialEstimate: 1/4h
//   
// pass
function test_verify_groups_for_tenant_user() {};

// 
//   Child tenants can see all service template items defined in parent
//   tenants.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       tags: cfme_tenancy
//       initialEstimate: 1/2h
//       startsin: 5.5
//   
// pass
function test_tenant_visibility_service_template_items_all_parents() {};

// 
//   Members of parent tenant can see all VMs/instances created by users in
//   child tenants.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       tags: cfme_tenancy
//       initialEstimate: 1h
//       startsin: 5.5
//   
// pass
function test_tenant_visibility_vms_all_childs() {};

function test_tenant_ldap_group_switch_between_tenants(appliance, setup_openldap_auth_provider, setup_openldap_user_group, soft_assert) {
  // 
  //   User who is member of 2 or more LDAP groups can switch between tenants
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: high
  //       tags: cfme_tenancy
  //       initialEstimate: 1/4h
  //       startsin: 5.5
  //       testSteps:
  //           1. Configure LDAP authentication on CFME
  //           2. Create 2 different parent-tenants
  //               - marketing
  //               - finance
  //           3. Retrieve the following LDAP groups: marketing and finance
  //              Assign these groups to the corresponding tenants created in the previous step .
  //              Additionally, assign the EvmRole-SuperAdministrator role to the groups.
  //           4. In LDAP we have 3 users:
  //               - bill -> member of marketing group
  //               - jim -> member of finance group
  //               - mike -> is member of both groups
  //           5. Login as 'mike' who is a member of 2 different tenants
  //           6. User should be able switch between groups after logging into classis UI.
  //              Switching is done in a way that the current group is written into DB as
  //              the active group. After switching to desired group,user is able login
  //              via Self Service UI to the desired tenant.
  //   
  let [user, retrieved_groups] = setup_openldap_user_group;

  user(() => {
    let view = navigate_to(appliance.server, "LoggedIn");

    if (view.group_names.size <= 1) {
      throw "Only a single group is displayed for the user"
    };

    let display_other_groups = view.group_names.select(g => (
      g != view.current_groupname
    )).map(g => g);

    soft_assert.call(
      view.current_fullname == user.name,
      `user full name ${user.name} did not match UI display name ${view.current_fullname}`
    );

    for (let group in retrieved_groups) {
      soft_assert.call(
        view.group_names.include(group.description),
        `user group ${group} not displayed in UI groups list ${view.group_names}`
      )
    };

    for (let other_group in display_other_groups) {
      soft_assert.call(
        user.groups.include(other_group),
        `Group ${other_group} in UI not expected for user ${user.name}`
      );

      view.change_group(other_group);

      if (!view.is_displayed) {
        throw "Not logged in after switching to group {} for {}".format(
          other_group,
          user.name
        )
      };

      soft_assert.call(
        other_group == view.current_groupname,
        `After switching to group ${other_group}, its not displayed as active`
      )
    }
  });

  appliance.server.login_admin();

  if (!user.exists) {
    throw `User record for \"${user.name}\" should exist after login`
  }
};

// 
//   Child tenants can see MIQ AE namespaces of parent tenants.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       tags: cfme_tenancy
//       initialEstimate: 1/4h
//       startsin: 5.5
//   
// pass
function test_tenant_visibility_miq_ae_namespaces_all_parents() {};

// 
//   Test that user can edit tags of an VM when he has role created by disabling 'Everything'
//   and then enabling every other checkbox.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: high
//       initialEstimate: 1/5h
//       startsin: 5.11
//       setup:
//           1. Have an infra provider added and testvm created
//       testSteps:
//           1. Create new role. Disable 'Everything' and then manually enable each check box
//               except 'Everything'.
//           2. Create new group based on this role; Create new user as a member of this group
//           3. Login as newly created user
//           4. Navigate to testing vm and try to Policy -> Edit Tags
//       expectedResults:
//           1. New role created
//           2. New group created; New user created
//           3. Login successful
//           4. Edit Tags screen displayed; no error in evm.log
//   Bugzilla:
//       1684472
//   
// pass
function test_tags_manual_features() {};

// 
//   Test that user with Hosts & Clusters filter is able to see pods belonging to that filter only
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: high
//       initialEstimate: 1/4h
//       startsin: 5.10.3
//       setup:
//           1. Have at least two OCP providers added with some pods
//       testSteps:
//           1. Create new role with Everything -> Compute enabled only
//           2. Create new group based on this role and in Hosts & Clusters tab check one of the
//               OCP providers
//           3. Create an user as a member of this group
//           4. Login as the new user and navigate to Compute -> Containers -> Providers
//           5. Navigate to Compute -> Containers -> Pods
//       expectedResults:
//           1. Role created
//           2. Group created
//           3. User created
//           4. Only one OCP provider displayed; this is the one checked in Hosts & Clusters
//           5. Only pods from one OCP provider are displayed
//   Bugzilla:
//       1631694
//   
// pass
function test_host_clusters_pod_filter(setup_provider) {};

// 
//   Test that user with My Tasks product feature can see only his tasks via API
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/6h
//       startsin: 5.10
//       testSteps:
//           1. Create a user with Settings -> Tasks -> View -> My Tasks (but not All Tasks),
//               for example EvmRole-support
//           2. Navigate to Tasks via UI, verify you can see only \"My Tasks\"
//           3. Query API with the user: curl -k \"https://<username>:<password>@<IP>/api/tasks/\"
//       expectedResults:
//           1. User created
//           2. \"My Tasks\" displayed
//           3. Only tasks belonging to the user displayed
//   Bugzilla:
//       1639387
//   
// pass
function test_my_tasks_api() {};

// 
//   Test that user with evmrole Administrator can see task status via API
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/4h
//       tags: rbac
//       testSteps:
//           1. Create a user with evmrole_administrator
//           2. Generate a task, i.e. by running a report
//           3. Query API with the user:
//               curl -k \"https://<username>:<password>@<IP>/api/tasks/<task_id>\"
//       expectedResults:
//           1. User created
//           2. Task displayed in My Tasks OPS-UI
//           3. Task status returned
//   Bugzilla:
//       1535962
//   
// pass
function test_api_task_status_with_administrator() {};

// 
//   Verify user with a non-administrator role can login to the SSUI and
//   view catalog items that are tagged for them to see
// 
//   Note that in order for this to work, all ownership limitations must be
//   removed.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: SelfServiceUI
//       caseimportance: medium
//       initialEstimate: 1/2h
//       setup:
//           1. Create a user account with a non-admin role w/ any necessary tags,
//              \"View Catalog Items\" permissions and SSUI access
//           2. Create a catalog item that is visible to the user
//       testSteps:
//           1. Login to the SSUI as a non-admin user
//           2. Attempt to view all catalog items the user has access to
//       expectedResults:
//           1. Logged in
//           2. Catalog items visible
//   Bugzilla:
//       1465642
//   
// pass
function test_user_view_catalog_items_ssui() {};

// 
//   Verify that child tenant can be added.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: low
//       initialEstimate: 1/10h
//       testSteps:
//           1. Go to Configuration -> Access Control
//           2. Select a Tenant
//           3. Use \"Configuration\" Toolbar to navigate to \"Add child Tenant to this Tenant\"
//           4. Fill the form in:
//               Name: \"test_tenant\"
//               Description: \"test_tenant\"
//           5. Then select \"Add\"
//       expectedResults:
//           5. Child tenant should be displayed under Parent Tenant
//   Bugzilla:
//       1387088
//   
// pass
function test_add_child_tenant() {};

// 
//   Verify that project can be added to tenant.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: low
//       initialEstimate: 1/10h
//       testSteps:
//           1. Go to Configuration -> Access Control
//           2. Select a Tenant
//           3. Use \"Configuration\" Toolbar to navigate to \"Add Project to this Tenant\"
//           4. Fill the form in:
//               Name: \"test_project\"
//               Description: \"test_project\"
//           5. Then select \"Add\"
//       expectedResults:
//           5. Project should be displayed under Parent Tenant
//   Bugzilla:
//       1387088
//   
// pass
function test_add_project() {};

// 
//   When a user is a member of two or more groups and one of the groups
//   does not have access to the SSUI, verify that the group w/o SSUI does
//   not stay logged in after switching groups.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: SelfServiceUI
//       caseimportance: critical
//       initialEstimate: 1/6h
//       startsin: 5.9
//       setup:
//           1. Create a user that is a member of two more groups with one group having SSUI access
//               and the other group having SSUI access disabled.
//       testSteps:
//           1. Login to the SSUI
//           2. Switch to the group that doesn\"t have SSUI access
//       expectedResults:
//           1. Login successful
//           2. Automatically logged out of the SSUI
//   
// pass
function test_ssui_group_switch() {};

// 
//   Verify that switching Groups in SSUI changes the dashboard items to
//   match the new groups permissions
//   Bugzilla:
//       1790817
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: SelfServiceUI
//       caseimportance: medium
//       initialEstimate: 1/4h
//       startsin: 5.9
//       setup:
//           1. Create a user with two or more groups with access to the SSUI. The
//               groups should have role permissions that grant access to different
//               features so you can easily see that the dashboard is updated
//               appropriately.
//       testSteps:
//           1. Login to the SSUI
//           2. Switch to another group
//           3. Check that dashboard items are updated appropriately
//       expectedResults:
//           1. Login successful
//           2. Group switch successful
//           3. Dashboard items are updated from to reflect that access of the new group
//   
// pass
function test_ssui_update_dashboard() {};

// 
//   Verify that switching groups the webui changes the dashboard items to
//   match the new groups permissions
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: WebUI
//       initialEstimate: 1/4h
//       setup: Create a user with two or more groups. The groups should have role
//              permissions that grant access to different features so you can easily
//              see that the dashboard is updated appropriately.
//       startsin: 5.9
//       tags: rbac
//       testSteps:
//           1. Login to the OPS webui
//           2. Switch to another group
//           3. Check that dashboard items are updated appropriately
//       expectedResults:
//           1. Login successful
//           2. Group switch successful
//           3. Dashboard items are updated from to reflect that access of the new group
//   
// pass
function test_verify_that_changing_groups_in_the_webui_updates_dashboard_items() {};

// 
//   Test that vm can not be approved by a user in different group when \"User and Group owned\"
//   restriction is in place.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/3h
//       setup:
//           1. Create two users belonging to two different groups
//       testSteps:
//           1. Request a VM as UserA
//           2. As UserB, try to approve the VM request
//       expectedResults:
//           1. VM requested
//           2. UserB should not be able to see the request
//   Bugzilla:
//       1545395
//   
// pass
function test_user_and_group_owned() {};

// 
//   Switching user's group while user is online
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/3h
//       setup:
//           1. Open two private/anonymous windows in Firefox/Chrome/etc.
//           2. Identify or create EvmRole-super_administrator level user admin
//           3. Identify or create EvmRole-user level user testusr
//           4. Identify or create EvmRole-user level group testGrp
//       testSteps:
//           1. Sign in to appliance in browser1 as admin
//           2. Sign in to appliance in browser2 as testusr
//           3. Browser1: Change group of user 'testusr' to EvmGroup-security
//           4. Browser2: Navigate to Help > About
//           5. Browser2: Click on user name in top right corner
//           6. Browser1: Change group of user 'testusr' to EvmGroup-user
//           7. Browser2: Navigate to Help > About
//           8. Browser2: Click on user name in top right corner
//           9. Browser1: Change group of user 'testusr' to testGrp
//           10. Browser2: Navigate to Help > About
//           11. Browser2: Click on user name in top right corner
//       expectedResults:
//           1. admin signed in browser 1
//           2. testusr signed in browser 2
//           3. Group changed for user testusr
//           4. Verify testusr role is EvmRole-security and user was not disconnected
//           5. Verify testusr group is EvmGroup-security
//           6. Group changed for user testusr
//           7. Verify testusr role is EvmRole-user and user was not disconnected
//           8. Verify testusr group is EvmGroup-user
//           9. Group changed for user testusr
//           10. Verify testusr role is EvmRole-user and user was not disconnected
//           11. Verify testusr group is testGrp
//   
// pass
function test_user_group_switch() {};

// 
//   Verify that the CFME REST API does not allow you to edit a user and
//   remove it from all assigned groups
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/6h
//       startsin: 5.9
//   testSteps:
//       1. Create a user and assign it to one or more groups
//       2. Using the REST API, edit the user and attempt to assign it to no groups
//   expectedResults:
//       1. User created
//       2. Action failed
//   
// pass
function test_api_edit_user_no_groups() {};

// 
//   Verify that admin and user\"s with access to Documentation can view the
//   PDF documents
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/8h
//       testSteps:
//           1. As admin, navigate Help->Documentation and view the supporting documents
//           2. Create a user with product feature Help->Documentation enabled
//           3. As the new user, navigate Help->Documentation and view the supporting documents
//       expectedResults:
//           1. Documents can be opened
//           2. User created
//           3. Documents can be opened
//   Bugzilla:
//       1563241
//   
// pass
function test_access_doc() {};

// 
//   Test querying requests via UI and API
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/4h
//       testSteps:
//           1. Login with user with Services > My Services > Requests > Operate enabled
//           2. View Services > Requests
//           3. Query API on service_requests
//       expectedResults:
//           1. Logged in
//           2. Requests displayed
//           3. Requests returned
//   Bugzilla:
//       1608554
//   
// pass
function test_requests_in_ui_and_api() {};

// 
//   Verify that user can see quotas without having the Manage Quota permission.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Infra
//       caseimportance: medium
//       initialEstimate: 1/4h
//       testSteps:
//           1. Remove \"Manage Quota\" from user\'s permissions
//           2. Try to view quotas
//       expectedResults:
//           1. Permission removed
//           2. QUotas displayed; \"Manage Quotas\" button unavailable
//   Bugzilla:
//       1535556
//   
// pass
function test_view_quotas_without_manage_quota_permisson() {};

// 
//   Test provider revresh via api with non-admin user.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Infra
//       caseimportance: medium
//       initialEstimate: 1/4h
//       testSteps:
//           1. set up a new user with a new group based on vm_user plus api access
//               and refresh access to cloud and infrastructure providers
//           2. issue a refresh using the classic ui with that user
//           3. issue a refresh of the same provider using the api
//       expectedResults:
//           1. New user created
//           2. Refresh performed
//           3. Refresh performed; no 403 error
//   Bugzilla:
//       1602413
//   
// pass
function test_api_provider_refresh_non_admin() {};

// 
//   When creating a new catalog item of type \"Orchestration\", the
//   available providers should be restricted to providers that are visible
//   to the user
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Control
//       caseimportance: medium
//       initialEstimate: 1/4h
//       setup:
//           1. On CFME appliance, add a Microsoft Azure provider with no restrictions
//       testSteps:
//           1. As admin: Create an administrator group that restricts
//              access to objects with a certain tag.
//           2. As admin: Create a user that is assigned to the restricted group
//           3. Restricted user: Verfiy that the Azure provider is not visible
//           4. Create a new catalog item with type \"Orchestration\" and
//              Orchestration Template of type azure
//           5. When the provider option is visible, verify that any
//              providers listed are visible providers
//           6. As admin: Change the tag for the azure provider to match
//              tags that are accessible by the restricted user
//           7. As the restricted user: Verify that the cloud provider is now visible
//           8. Attempt to create a new catalog item of type
//              \"Orchestration\", Orchestration Template for azure and
//              confirm that the azure provider is an available option
//       expectedResults:
//           1. Group created
//           2. User created
//           3. Azure provider is not visible
//           4. Catalog created
//           5. Providers visible: NOT Azure
//           6. Tag changed
//           7. Azure is now visible
//           8. Catalog item created
//   
// pass
function test_orchestration_catalog_visible_providers() {};

// 
//   When modifying RBAC Roles, all existing enabled/disabled product
//   features should retain their state when modifying other product
//   features.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/4h
//       testSteps:
//           1. Navigate to access control and create a new role with all
//              product features enabled
//           2. Edit the role, disable 1 or more product features and save the changes
//           3. Create a new role with only one sub product feature enabled and save it
//           4. Modify the previous role and enable an additional product
//              feature. Save the modifications.
//       expectedResults:
//           1. New role created successfully
//           2. Only the user modified feature(s) should be changes
//           3. Only the single product feature should be enabled
//           4. Only the specified product features should be enabled
//   
// pass
function test_modify_roles() {};

// 
//   When a user is assigned a custom tag restricting visible items, verify
//   that the user can only see VMs with the same tag.
//   See: https://access.redhat.com/articles/421423 and
//   https://cloudformsblog.redhat.com/2016/10/13/using-tags-for-access-
//   control
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Provisioning
//       caseimportance: medium
//       initialEstimate: 1/3h
//       setup: Add a provider with two VMs available for tagging
//       testSteps:
//           1. Create a custom Category and tag
//           2. Tag a VM with the custom tag and tag another VM with a different tag
//           3. Create a new group with the custom tag
//           4. Create a new user and assign it to the new group
//           5. Login as the new user and attempt to view the VM with the custom tag
//       expectedResults:
//           1. Category & tag created successfully
//           2. VMs tagged successfully
//           3. Group created successfully
//           4. User created successfully
//           5. User can see the VM with the custom tag and not the VM with a different tag
//   
// pass
function test_user_vms_tag() {};

// 
//   Clicking on Users or Groups with restricted role user throws \"undefined method `where\' for
//   #<Array:0x000000057a2510> [ops/tree_select]\"
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: low
//       initialEstimate: 1/6h
//       testSteps:
//           1. Navigate to Configure ==> Configuration ==> Access Control
//           2. Create a new role with \"VM & Template Access Restriction\" as
//               \"Only User or Group Owned\" or \"Only User Owned\".  Make sure all the module access
//               is given in \"Product Features (Editing)\" i.e., Everything is checked
//           3. Create a new group with the above role
//           4. Create a new user with the above group
//           5. Login with the newly created user and navigate to
//               Configure ==> Configuration ==> Access Control
//           6. Click on Users or Groups
//       expectedResults:
//           6. No error displayed
//   
// pass
function test_restricted_user_rbac() {};

// 
//   Verify there\'s no exception when ordering a service by non admin user.
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Infra
//       caseimportance: medium
//       initialEstimate: 1/4h
//       testSteps:
//           1. Go to Access Control, Create a role named \"service_role\" with below
//               roles should be enabled i.e. Compute and Services.
//           2. Create a user i.e. \"service_user\" based on this \"service_role\"
//           3. Login with service_user and order catalog
//       expectedResults:
//           3. No exception displayed
//   Bugzilla:
//       1546944
//   
// pass
function test_service_non_admin_user() {};

// 
//   Create group with role \"user owned only\"
//   As admin navigate to templates and set ownership for user
//   Log in as user, check template is visible for user(only this template)
// 
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/10h
//   
// pass
function test_tenant_template_visibility() {};

// 
//       after adding one cloud provider it should show only one provider name in list
//   Bugzilla:
//       1650484
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/4h
//       testSteps:
//           1. Navigate to compute -> Cloud -> Tenants
//           2. Go to Configuration -> Create cloud tenant
//       expectedResults:
//           1.
//           2. It should show only one provider name.
// 
//   
// pass
function test_check_provider_count() {};

// 
//       Default tenent nme should be updated after setting up it
//   Bugzilla:
//       1654718
//   Polarion:
//       assignee: dgaikwad
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/4h
//       testSteps:
//           1. Set a new default tenant name, e.g. \'Bit63\'
//           2. From Rails console, lookup the corresponding tenant object, i.e.
//           execute to check updated tenant name on rail console example:
//           \"Tenant.where(:name => \'Bit63\').first\"
//       expectedResults:
//           1.
//           2. tenant name should be updated on rail console
//   
// pass
function test_default_tenat_name_rail_console() {};

function test_create_group_console_no(appliance, request) {
  // 
  //   Should able to create group if atleast one 'Show in Console' category to NO
  //   Bugzilla:
  //       1813375
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: critical
  //       initialEstimate: 1/4h
  //       testSteps:
  //           1. Go to Configuration > Settings accordion > Region node in accordion > Tags tab >
  //           My Company Categories tab
  //           2. For a new/an existing category set 'Show in Console' to 'No' and save the category
  //           3. Go to Configuration > Access Control accordion > Groups
  //           4. Toolbar: Configuration > Add a new Group
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4. Should able to create group and there should not be error in production.log
  // 
  //   
  let cg = appliance.collections.categories.create({
    name: fauxfactory.gen_alphanumeric(10, {start: "name_"}).downcase(),
    description: fauxfactory.gen_alphanumeric(32, {start: "long_desc_"}),
    display_name: fauxfactory.gen_alphanumeric(32, {start: "desc_"}),
    show_in_console: false
  });

  request.addfinalizer(cg.delete_if_exists);
  let msg = ".*FATAL -- : Error caught: [NoMethodError] undefined method.*";

  (LogValidator(
    "/var/www/miq/vmdb/log/production.log",
    {failure_patterns: [msg]}
  )).waiting({timeout: 120}, () => {
    let group = appliance.collections.groups.create({
      description: fauxfactory.gen_alphanumeric(22, "group_description_"),
      role: "EvmRole-vm_user"
    });

    request.addfinalizer(group.delete_if_exists)
  })
};

function test_select_edit_group(appliance, request) {
  // 
  //   Should able to see \"Edit the selected Group\" option for custom group after selecting the group
  //   also check error in production.log log file
  //   Bugzilla:
  //       1803952
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: critical
  //       initialEstimate: 1/4h
  //       testSteps:
  //           1. Go to Configuration--> Access controls
  //           2. Select existing custom group and Configure
  //       expectedResults:
  //           1.
  //           2. Able to see \"Edit the selected Group\"
  //   
  let group = appliance.collections.groups.create({
    description: fauxfactory.gen_alphanumeric(22, "group_description_"),
    role: "EvmRole-vm_user"
  });

  request.addfinalizer(group.delete_if_exists);
  let view = navigate_to(appliance.collections.groups, "All");
  view.paginator.set_items_per_page(100);
  let msg = ".*FATAL.*Error caught: [NoMethodError].*";

  (LogValidator(
    "/var/www/miq/vmdb/log/production.log",
    {failure_patterns: [msg]}
  )).waiting({timeout: 120}, () => {
    view.table.row({description: group.description})[0].click();
    view.toolbar.configuration.open();

    if (!view.toolbar.configuration.item_enabled("Edit the selected Group")) {
      throw "\"Edit the selected Group\" button is disabled"
    }
  })
}
