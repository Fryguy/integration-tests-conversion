require_relative("cfme");
include(Cfme);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _groups = groups.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _roles = roles.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _tenants = tenants.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _users = users.bind(this);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.rest];

class TestTenantsViaREST {
  tenants(request, appliance) {
    let num_tenants = 3;
    let response = _tenants(request, appliance, {num: num_tenants});
    assert_response(appliance);
    if (response.size != num_tenants) throw new ();
    return response
  };

  test_query_tenant_attributes(tenants, soft_assert) {
    // Tests access to tenant attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    query_resource_attributes(tenants[0], {soft_assert})
  };

  test_create_tenants(appliance, tenants) {
    // Tests creating tenants.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    for (let tenant in tenants) {
      let record = appliance.rest_api.collections.tenants.get({id: tenant.id});
      assert_response(appliance);
      if (record.name != tenant.name) throw new ()
    }
  };

  test_edit_tenants(appliance, tenants, multiple) {
    let edited;

    // Tests editing tenants.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/3h
    //     
    let collection = appliance.rest_api.collections.tenants;
    let tenants_len = tenants.size;
    let new = [];

    for (let _ in tenants_len.times) {
      new.push({name: "test_tenants_{}".format(fauxfactory.gen_alphanumeric().downcase())})
    };

    if (is_bool(multiple)) {
      for (let index in tenants_len.times) {
        new[index].update(tenants[index]._ref_repr())
      };

      edited = collection.action.edit(...new);
      assert_response(appliance)
    } else {
      edited = [];

      for (let index in tenants_len.times) {
        edited.push(tenants[index].action.edit({None: new[index]}));
        assert_response(appliance)
      }
    };

    if (tenants_len != edited.size) throw new ();

    for (let [index, tenant] in enumerate(tenants)) {
      let [record, _] = wait_for(
        () => collection.find_by({name: new[index].name}) || false,
        {num_sec: 180, delay: 10}
      );

      tenant.reload();

      if (!(record[0].id == edited[index].id) || !(edited[index].id == tenant.id)) {
        throw new ()
      };

      if (!(record[0].name == edited[index].name) || !(edited[index].name == tenant.name)) {
        throw new ()
      }
    }
  };

  test_delete_tenants_from_detail(tenants, method) {
    // Tests deleting tenants from detail.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_detail(tenants, {method})
  };

  test_delete_tenants_from_collection(tenants) {
    // Tests deleting tenants from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_collection(tenants)
  }
};

class TestRolesViaREST {
  roles(request, appliance) {
    let num_roles = 3;
    let response = _roles(request, appliance, {num: num_roles});
    assert_response(appliance);
    if (response.size != num_roles) throw new ();
    return response
  };

  test_query_role_attributes(roles, soft_assert) {
    // Tests access to role attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    query_resource_attributes(roles[0], {soft_assert})
  };

  test_create_roles(appliance, roles) {
    // Tests creating roles.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    for (let role in roles) {
      let record = appliance.rest_api.collections.roles.get({id: role.id});
      assert_response(appliance);
      if (record.name != role.name) throw new ()
    }
  };

  test_edit_roles(appliance, roles, multiple) {
    let edited;

    // Tests editing roles.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/3h
    //     
    let collection = appliance.rest_api.collections.roles;
    let roles_len = roles.size;
    let new = [];

    for (let _ in roles_len.times) {
      new.push({name: fauxfactory.gen_alphanumeric(
        15,
        {start: "test_role_"}
      )})
    };

    if (is_bool(multiple)) {
      for (let index in roles_len.times) {
        new[index].update(roles[index]._ref_repr())
      };

      edited = collection.action.edit(...new);
      assert_response(appliance)
    } else {
      edited = [];

      for (let index in roles_len.times) {
        edited.push(roles[index].action.edit({None: new[index]}));
        assert_response(appliance)
      }
    };

    if (roles_len != edited.size) throw new ();

    for (let [index, role] in enumerate(roles)) {
      let [record, _] = wait_for(
        () => collection.find_by({name: new[index].name}) || false,
        {num_sec: 180, delay: 10}
      );

      role.reload();

      if (!(record[0].id == edited[index].id) || !(edited[index].id == role.id)) {
        throw new ()
      };

      if (!(record[0].name == edited[index].name) || !(edited[index].name == role.name)) {
        throw new ()
      }
    }
  };

  test_delete_roles_from_detail(roles, method) {
    // Tests deleting roles from detail.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_detail(roles, {method})
  };

  test_delete_roles_from_collection(roles) {
    // Tests deleting roles from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_collection(roles)
  };

  test_add_delete_role(appliance) {
    // Tests adding role using \"add\" action and deleting it.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/3h
    //     
    let role_data = {name: fauxfactory.gen_alphanumeric(
      15,
      {start: "role_name_"}
    )};

    let role = appliance.rest_api.collections.roles.action.add(role_data)[0];
    assert_response(appliance);
    if (role.name != role_data.name) throw new ();

    wait_for(
      () => appliance.rest_api.collections.roles.find_by({name: role.name}) || false,
      {num_sec: 180, delay: 10}
    );

    let found_role = appliance.rest_api.collections.roles.get({name: role.name});
    if (found_role.name != role_data.name) throw new ();
    role.action.delete();
    assert_response(appliance);

    pytest.raises(
      Exception,
      {match: "ActiveRecord::RecordNotFound"},
      () => role.action.delete()
    );

    assert_response(appliance, {http_status: 404})
  };

  test_role_assign_and_unassign_feature(appliance, roles) {
    // Tests assigning and unassigning feature to a role.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/3h
    //     
    let feature = appliance.rest_api.collections.features.get({name: "Everything"});
    let role = roles[0];
    role.reload();
    role.features.action.assign(feature);
    assert_response(appliance);
    role.reload();
    if (!role.features.all.map(f => f.id).include(feature.id)) throw new ();
    role.features.action.unassign(feature);
    assert_response(appliance);
    role.reload();
    if (!!role.features.all.map(f => f.id).include(feature.id)) throw new ()
  }
};

class TestGroupsViaREST {
  tenants(request, appliance) {
    return _tenants(request, appliance, {num: 1})
  };

  roles(request, appliance) {
    return _roles(request, appliance, {num: 1})
  };

  groups(request, appliance, roles, tenants) {
    let num_groups = 3;

    let response = _groups(
      request,
      appliance,
      roles,
      {num: num_groups, tenant: tenants}
    );

    assert_response(appliance);
    if (response.size != num_groups) throw new ();
    return response
  };

  test_query_group_attributes(groups, soft_assert) {
    // Tests access to group attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    query_resource_attributes(groups[0], {soft_assert})
  };

  test_create_groups(appliance, groups) {
    // Tests creating groups.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    for (let group in groups) {
      let record = appliance.rest_api.collections.groups.get({id: group.id});
      assert_response(appliance);
      if (record.description != group.description) throw new ()
    }
  };

  test_edit_groups(appliance, groups, multiple) {
    let edited;

    // Tests editing groups.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/3h
    //     
    let collection = appliance.rest_api.collections.groups;
    let groups_len = groups.size;
    let new = [];

    for (let _ in groups_len.times) {
      new.push({description: "group_description_{}".format(fauxfactory.gen_alphanumeric())})
    };

    if (is_bool(multiple)) {
      for (let index in groups_len.times) {
        new[index].update(groups[index]._ref_repr())
      };

      edited = collection.action.edit(...new);
      assert_response(appliance)
    } else {
      edited = [];

      for (let index in groups_len.times) {
        edited.push(groups[index].action.edit({None: new[index]}));
        assert_response(appliance)
      }
    };

    if (groups_len != edited.size) throw new ();

    for (let [index, group] in enumerate(groups)) {
      let [record, _] = wait_for(
        () => collection.find_by({description: new[index].description}) || false,
        {num_sec: 180, delay: 10}
      );

      group.reload();

      if (!(record[0].id == edited[index].id) || !(edited[index].id == group.id)) {
        throw new ()
      };

      if (!(record[0].description == edited[index].description) || !(edited[index].description == group.description)) {
        throw new ()
      }
    }
  };

  test_delete_groups_from_detail(groups, method) {
    // Tests deleting groups from detail.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_detail(groups, {method})
  };

  test_delete_groups_from_collection(groups) {
    // Tests deleting groups from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_collection(groups, {not_found: true})
  }
};

class TestUsersViaREST {
  users_data(request, appliance) {
    let _users_data = ({ num = 3 }) => {
      let num_users = num;

      let [response, prov_data] = _users(
        request,
        appliance,
        {num: num_users}
      );

      assert_response(appliance);
      if (response.size != num) throw new ();
      return [response, prov_data]
    };

    return _users_data
  };

  user_auth(users_data) {
    let [users, prov_data] = users_data.call({num: 1});
    return [users[0].userid, prov_data[0].password]
  };

  users(users_data) {
    let [users, __] = users_data.call();
    return users
  };

  test_query_user_attributes(users, soft_assert) {
    // Tests access to user attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    query_resource_attributes(users[0], {soft_assert})
  };

  test_create_users(appliance, users_data) {
    // Tests creating users.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    let [users, prov_data] = users_data.call();

    for (let [index, user] in enumerate(users)) {
      let record = appliance.rest_api.collections.users.get({id: user.id});
      assert_response(appliance);
      if (record.name != user.name) throw new ();
      let user_auth = [user.userid, prov_data[index].password];
      if (!appliance.new_rest_api_instance({auth: user_auth})) throw new ()
    }
  };

  test_create_uppercase_user(request, appliance) {
    // Tests creating user with userid containing uppercase letters.
    // 
    //     Bugzilla:
    //         1486041
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    let uniq = fauxfactory.gen_alphanumeric(4).upcase();

    let data = {
      userid: `rest_${uniq}`,
      name: `REST User ${uniq}`,
      password: fauxfactory.gen_alphanumeric(),
      email: "user@example.com",
      group: "EvmGroup-user_self_service"
    };

    let [user, _] = _users(request, appliance, {None: data});
    assert_response(appliance);
    let user_auth = [user[0].userid, data.password];
    if (!appliance.new_rest_api_instance({auth: user_auth})) throw new ()
  };

  test_edit_user_password(appliance, users) {
    // Tests editing user password.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/3h
    //     
    let user = users[0];
    let new_password = fauxfactory.gen_alphanumeric();
    user.action.edit({password: new_password});
    assert_response(appliance);
    let new_user_auth = [user.userid, new_password];
    if (!appliance.new_rest_api_instance({auth: new_user_auth})) throw new ()
  };

  test_edit_user_name(appliance, users, multiple) {
    let edited;

    // Tests editing user name.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/3h
    //     
    let collection = appliance.rest_api.collections.users;
    let users_len = users.size;
    let new = [];

    for (let _ in users_len.times) {
      new.push({name: fauxfactory.gen_alphanumeric(15, "user_name_")})
    };

    if (is_bool(multiple)) {
      for (let index in users_len.times) {
        new[index].update(users[index]._ref_repr())
      };

      edited = collection.action.edit(...new);
      assert_response(appliance)
    } else {
      edited = [];

      for (let index in users_len.times) {
        edited.push(users[index].action.edit({None: new[index]}));
        assert_response(appliance)
      }
    };

    if (users_len != edited.size) throw new ();

    for (let [index, user] in enumerate(users)) {
      let [record, _] = wait_for(
        () => collection.find_by({name: new[index].name}) || false,
        {num_sec: 180, delay: 10}
      );

      user.reload();

      if (!(record[0].id == edited[index].id) || !(edited[index].id == user.id)) {
        throw new ()
      };

      if (!(record[0].name == edited[index].name) || !(edited[index].name == user.name)) {
        throw new ()
      }
    }
  };

  test_edit_user_groups(appliance, users, group_by) {
    // Tests editing user group.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    let group_descriptions = [
      "EvmGroup-user_limited_self_service",
      "EvmGroup-approver"
    ];

    let groups = group_descriptions.map(desc => (
      appliance.rest_api.collections.groups.get({description: desc})
    ));

    let group_handles = [{href: groups[0].href}];

    for (let group in groups[_.range(1, 0)]) {
      let group_handle;

      if (group_by == "id") {
        group_handle = {id: group.id}
      } else if (group_by == "href") {
        group_handle = {href: group.href}
      } else if (group_by == "description") {
        group_handle = {description: group.description}
      };

      group_handles.push(group_handle)
    };

    let users_len = users.size;
    let new = [];

    for (let _ in users_len.times) {
      new.push({miq_groups: group_handles})
    };

    let edited = [];

    for (let index in users_len.times) {
      edited.push(users[index].action.edit({None: new[index]}));
      assert_response(appliance)
    };

    if (users_len != edited.size) throw new ();

    let _updated = (user) => {
      user.reload({attributes: "miq_groups"});
      let descs = [];

      for (let group in user.miq_groups) {
        descs.push(group.description)
      };

      return group_descriptions.map(desc => descs.include(desc)).is_all
    };

    for (let [index, user] in enumerate(users)) {
      wait_for(() => _updated.call(user), {num_sec: 20, delay: 2});
      user.reload();
      if (edited[index].id != user.id) throw new ()
    }
  };

  test_edit_current_group(request, appliance, users_data) {
    // Tests that editing current group using \"edit\" action is not supported.
    // 
    //     Testing BZ 1549086
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    let group_descriptions = [
      "EvmGroup-user_limited_self_service",
      "EvmGroup-approver"
    ];

    let groups = group_descriptions.map(desc => (
      appliance.rest_api.collections.groups.get({description: desc})
    ));

    let group_handles = groups.map(group => ({href: group.href}));
    let [users, __] = users_data.call({num: 1});
    let user = users[0];
    user.action.edit({miq_groups: group_handles});
    assert_response(appliance);
    user.reload();
    if (user.current_group.id != groups[0].id) throw new ();

    pytest.raises(
      Exception,
      {match: "BadRequestError: Invalid attribute"},
      () => user.action.edit({current_group: group_handles[1]})
    );

    assert_response(appliance, {http_status: 400})
  };

  test_change_current_group_as_admin(request, appliance, users_data) {
    // Tests that it's possible to edit current group.
    // 
    //     Testing BZ 1549086
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    let group_descriptions = [
      "EvmGroup-user_limited_self_service",
      "EvmGroup-approver"
    ];

    let groups = group_descriptions.map(desc => (
      appliance.rest_api.collections.groups.get({description: desc})
    ));

    let group_handles = groups.map(group => ({href: group.href}));
    let [users, __] = users_data.call({num: 1});
    let user = users[0];
    user.action.edit({miq_groups: group_handles});
    assert_response(appliance);
    user.reload();
    if (user.current_group.id != groups[0].id) throw new ();

    pytest.raises(
      Exception,
      {match: "Can only edit authenticated user's current group"},
      () => user.action.set_current_group({current_group: group_handles[1]})
    );

    assert_response(appliance, {http_status: 400})
  };

  test_change_current_group_as_user(request, appliance, users_data) {
    // Tests that users can update their own group.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let group_descriptions = [
      "EvmGroup-user_limited_self_service",
      "EvmGroup-approver"
    ];

    let groups = group_descriptions.map(desc => (
      appliance.rest_api.collections.groups.get({description: desc})
    ));

    let group_handles = groups.map(group => ({href: group.href}));
    let [users, data] = users_data.call({num: 1});
    let user = users[0];
    user.action.edit({miq_groups: group_handles});
    assert_response(appliance);
    user.reload();
    if (user.current_group.id != groups[0].id) throw new ();
    let user_auth = [user.userid, data[0].password];
    let user_api = appliance.new_rest_api_instance({auth: user_auth});

    user_api.post(
      user.href,
      {action: "set_current_group", current_group: group_handles[1]}
    );

    assert_response(user_api)
  };

  test_change_unassigned_group_as_user(request, appliance, users_data) {
    // Tests that users can't update their own group to a group they don't belong to.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let group_descriptions = [
      "EvmGroup-user_limited_self_service",
      "EvmGroup-approver"
    ];

    let groups = group_descriptions.map(desc => (
      appliance.rest_api.collections.groups.get({description: desc})
    ));

    let group_handles = groups.map(group => ({href: group.href}));
    let [users, data] = users_data.call({num: 1});
    let user = users[0];
    user.action.edit({miq_groups: group_handles[_.range(0, 1)]});
    assert_response(appliance);
    user.reload();
    if (user.current_group.id != groups[0].id) throw new ();
    let user_auth = [user.userid, data[0].password];
    let user_api = appliance.new_rest_api_instance({auth: user_auth});

    pytest.raises(
      Exception,
      {match: "User must belong to group"},

      () => (
        user_api.post(
          user.href,
          {action: "set_current_group", current_group: group_handles[1]}
        )
      )
    )
  };

  test_change_password_as_user(appliance, user_auth) {
    // Tests that users can update their own password.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let new_password = fauxfactory.gen_alphanumeric();
    let new_user_auth = [user_auth[0], new_password];
    let user = appliance.rest_api.collections.users.get({userid: user_auth[0]});
    let user_api = appliance.new_rest_api_instance({auth: user_auth});

    user_api.post(
      user.href,
      {action: "edit", resource: {password: new_password}}
    );

    assert_response(user_api);
    if (!appliance.new_rest_api_instance({auth: new_user_auth})) throw new ();

    pytest.raises(
      Exception,
      {match: "Authentication failed"},
      () => appliance.new_rest_api_instance({auth: user_auth})
    )
  };

  test_change_email_as_user(appliance, user_auth) {
    // Tests that users can update their own email.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let new_email = "new@example.com";
    let user = appliance.rest_api.collections.users.get({userid: user_auth[0]});
    let user_api = appliance.new_rest_api_instance({auth: user_auth});

    user_api.post(
      user.href,
      {action: "edit", resource: {email: new_email}}
    );

    assert_response(user_api);
    user.reload();
    if (user.email != new_email) throw new ()
  };

  test_delete_users_from_detail(users, method) {
    // Tests deleting users from detail.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_detail(users, {method})
  };

  test_delete_users_from_collection(users) {
    // Tests deleting users from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_collection(users)
  }
};

const COMMON_FEATURES = [
  "Services",
  "Compute",
  "Configuration",
  "Networks",
  "Storage",
  "Control",
  "Automation",
  "Monitor",
  "Help",
  "API",
  "Service UI"
];

const FEATURES_511 = COMMON_FEATURES + [
  "Overview",
  "Migration",
  "User Settings",
  "All VM and Instance Access Rules",
  "Main Configuration"
];

const FEATURES_510 = COMMON_FEATURES + [
  "Cloud Intel",
  "Optimize",
  "Access Rules for all Virtual Machines"
];

function create_role(appliance, request) {
  let product_features;

  if (is_bool(request.param)) {
    let features = (appliance.version > "5.11" ? FEATURES_511 : FEATURES_510);
    product_features = features.map(feature => [["Everything", feature], true])
  } else {
    product_features = [[["Everything"], true]]
  };

  let role = appliance.collections.roles.create({
    name: fauxfactory.gen_alpha(15, {start: "API-role-"}),
    product_features: [[["Everything"], false]] + product_features
  });

  yield(appliance.rest_api.collections.roles.get({name: role.name}));
  role.delete_if_exists()
};

function role_api(appliance, request, create_role) {
  let group = _groups(request, appliance, create_role);

  let [user, user_data] = _users(
    request,
    appliance,
    {group: group.description}
  );

  yield(appliance.new_rest_api_instance({
    entry_point: appliance.rest_api._entry_point,
    auth: [user[0].userid, user_data[0].password]
  }))
};

function test_create_picture_with_role(role_api) {
  // 
  //   Bugzilla:
  //       1727948
  //       1731157
  // 
  //   Polarion:
  //       assignee: pvala
  //       caseimportance: high
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //       setup:
  //           1. Create role by
  //               i. selecting every role individually.
  //               ii. checking every role by clicking on `Everything`.
  //           2. Create a group and user with the new role.
  //       testSteps:
  //           1. Send a POST request to create a picture and check the response.
  //       expectedResults:
  //           1. Picture must be created without any error.
  //               Check for `Use of Action create is forbidden` in response.
  //   
  let picture = role_api.collections.pictures.action.create({
    extension: "png",
    content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  })[0];

  assert_response(role_api);
  if (!picture.exists) throw new ()
}
