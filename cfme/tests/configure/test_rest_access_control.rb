require_relative 'cfme'
include Cfme
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _groups groups
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _roles roles
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _tenants tenants
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _users users
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.rest]
class TestTenantsViaREST
  def tenants(request, appliance)
    num_tenants = 3
    response = _tenants(request, appliance, num: num_tenants)
    assert_response(appliance)
    raise unless response.size == num_tenants
    return response
  end
  def test_query_tenant_attributes(tenants, soft_assert)
    # Tests access to tenant attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(tenants[0], soft_assert: soft_assert)
  end
  def test_create_tenants(appliance, tenants)
    # Tests creating tenants.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    for tenant in tenants
      record = appliance.rest_api.collections.tenants.get(id: tenant.id)
      assert_response(appliance)
      raise unless record.name == tenant.name
    end
  end
  def test_edit_tenants(appliance, tenants, multiple)
    # Tests editing tenants.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/3h
    #     
    collection = appliance.rest_api.collections.tenants
    tenants_len = tenants.size
    new = []
    for _ in tenants_len.times
      new.push({"name" => "test_tenants_{}".format(fauxfactory.gen_alphanumeric().downcase())})
    end
    if is_bool(multiple)
      for index in tenants_len.times
        new[index].update(tenants[index]._ref_repr())
      end
      edited = collection.action.edit(*new)
      assert_response(appliance)
    else
      edited = []
      for index in tenants_len.times
        edited.push(tenants[index].action.edit(None: new[index]))
        assert_response(appliance)
      end
    end
    raise unless tenants_len == edited.size
    for (index, tenant) in enumerate(tenants)
      record,_ = wait_for(lambda{|| collection.find_by(name: new[index]["name"]) || false}, num_sec: 180, delay: 10)
      tenant.reload()
      raise unless (record[0].id == edited[index].id) and (edited[index].id == tenant.id)
      raise unless (record[0].name == edited[index].name) and (edited[index].name == tenant.name)
    end
  end
  def test_delete_tenants_from_detail(tenants, method)
    # Tests deleting tenants from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_detail(tenants, method: method)
  end
  def test_delete_tenants_from_collection(tenants)
    # Tests deleting tenants from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_collection(tenants)
  end
end
class TestRolesViaREST
  def roles(request, appliance)
    num_roles = 3
    response = _roles(request, appliance, num: num_roles)
    assert_response(appliance)
    raise unless response.size == num_roles
    return response
  end
  def test_query_role_attributes(roles, soft_assert)
    # Tests access to role attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(roles[0], soft_assert: soft_assert)
  end
  def test_create_roles(appliance, roles)
    # Tests creating roles.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    for role in roles
      record = appliance.rest_api.collections.roles.get(id: role.id)
      assert_response(appliance)
      raise unless record.name == role.name
    end
  end
  def test_edit_roles(appliance, roles, multiple)
    # Tests editing roles.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/3h
    #     
    collection = appliance.rest_api.collections.roles
    roles_len = roles.size
    new = []
    for _ in roles_len.times
      new.push({"name" => fauxfactory.gen_alphanumeric(15, start: "test_role_")})
    end
    if is_bool(multiple)
      for index in roles_len.times
        new[index].update(roles[index]._ref_repr())
      end
      edited = collection.action.edit(*new)
      assert_response(appliance)
    else
      edited = []
      for index in roles_len.times
        edited.push(roles[index].action.edit(None: new[index]))
        assert_response(appliance)
      end
    end
    raise unless roles_len == edited.size
    for (index, role) in enumerate(roles)
      record,_ = wait_for(lambda{|| collection.find_by(name: new[index]["name"]) || false}, num_sec: 180, delay: 10)
      role.reload()
      raise unless (record[0].id == edited[index].id) and (edited[index].id == role.id)
      raise unless (record[0].name == edited[index].name) and (edited[index].name == role.name)
    end
  end
  def test_delete_roles_from_detail(roles, method)
    # Tests deleting roles from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_detail(roles, method: method)
  end
  def test_delete_roles_from_collection(roles)
    # Tests deleting roles from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_collection(roles)
  end
  def test_add_delete_role(appliance)
    # Tests adding role using \"add\" action and deleting it.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/3h
    #     
    role_data = {"name" => fauxfactory.gen_alphanumeric(15, start: "role_name_")}
    role = appliance.rest_api.collections.roles.action.add(role_data)[0]
    assert_response(appliance)
    raise unless role.name == role_data["name"]
    wait_for(lambda{|| appliance.rest_api.collections.roles.find_by(name: role.name) || false}, num_sec: 180, delay: 10)
    found_role = appliance.rest_api.collections.roles.get(name: role.name)
    raise unless found_role.name == role_data["name"]
    role.action.delete()
    assert_response(appliance)
    pytest.raises(Exception, match: "ActiveRecord::RecordNotFound") {
      role.action.delete()
    }
    assert_response(appliance, http_status: 404)
  end
  def test_role_assign_and_unassign_feature(appliance, roles)
    # Tests assigning and unassigning feature to a role.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/3h
    #     
    feature = appliance.rest_api.collections.features.get(name: "Everything")
    role = roles[0]
    role.reload()
    role.features.action.assign(feature)
    assert_response(appliance)
    role.reload()
    raise unless role.features.all.map{|f| f.id}.include?(feature.id)
    role.features.action.unassign(feature)
    assert_response(appliance)
    role.reload()
    raise unless !role.features.all.map{|f| f.id}.include?(feature.id)
  end
end
class TestGroupsViaREST
  def tenants(request, appliance)
    return _tenants(request, appliance, num: 1)
  end
  def roles(request, appliance)
    return _roles(request, appliance, num: 1)
  end
  def groups(request, appliance, roles, tenants)
    num_groups = 3
    response = _groups(request, appliance, roles, num: num_groups, tenant: tenants)
    assert_response(appliance)
    raise unless response.size == num_groups
    return response
  end
  def test_query_group_attributes(groups, soft_assert)
    # Tests access to group attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(groups[0], soft_assert: soft_assert)
  end
  def test_create_groups(appliance, groups)
    # Tests creating groups.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    for group in groups
      record = appliance.rest_api.collections.groups.get(id: group.id)
      assert_response(appliance)
      raise unless record.description == group.description
    end
  end
  def test_edit_groups(appliance, groups, multiple)
    # Tests editing groups.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/3h
    #     
    collection = appliance.rest_api.collections.groups
    groups_len = groups.size
    new = []
    for _ in groups_len.times
      new.push({"description" => "group_description_{}".format(fauxfactory.gen_alphanumeric())})
    end
    if is_bool(multiple)
      for index in groups_len.times
        new[index].update(groups[index]._ref_repr())
      end
      edited = collection.action.edit(*new)
      assert_response(appliance)
    else
      edited = []
      for index in groups_len.times
        edited.push(groups[index].action.edit(None: new[index]))
        assert_response(appliance)
      end
    end
    raise unless groups_len == edited.size
    for (index, group) in enumerate(groups)
      record,_ = wait_for(lambda{|| collection.find_by(description: new[index]["description"]) || false}, num_sec: 180, delay: 10)
      group.reload()
      raise unless (record[0].id == edited[index].id) and (edited[index].id == group.id)
      raise unless (record[0].description == edited[index].description) and (edited[index].description == group.description)
    end
  end
  def test_delete_groups_from_detail(groups, method)
    # Tests deleting groups from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_detail(groups, method: method)
  end
  def test_delete_groups_from_collection(groups)
    # Tests deleting groups from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_collection(groups, not_found: true)
  end
end
class TestUsersViaREST
  def users_data(request, appliance)
    _users_data = lambda do |num: 3|
      num_users = num
      response,prov_data = _users(request, appliance, num: num_users)
      assert_response(appliance)
      raise unless response.size == num
      return [response, prov_data]
    end
    return _users_data
  end
  def user_auth(users_data)
    users,prov_data = users_data.(num: 1)
    return [users[0].userid, prov_data[0]["password"]]
  end
  def users(users_data)
    users,__ = users_data.()
    return users
  end
  def test_query_user_attributes(users, soft_assert)
    # Tests access to user attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(users[0], soft_assert: soft_assert)
  end
  def test_create_users(appliance, users_data)
    # Tests creating users.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    users,prov_data = users_data.()
    for (index, user) in enumerate(users)
      record = appliance.rest_api.collections.users.get(id: user.id)
      assert_response(appliance)
      raise unless record.name == user.name
      user_auth = [user.userid, prov_data[index]["password"]]
      raise unless appliance.new_rest_api_instance(auth: user_auth)
    end
  end
  def test_create_uppercase_user(request, appliance)
    # Tests creating user with userid containing uppercase letters.
    # 
    #     Bugzilla:
    #         1486041
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    uniq = fauxfactory.gen_alphanumeric(4).upcase()
    data = {"userid" => , "name" => , "password" => fauxfactory.gen_alphanumeric(), "email" => "user@example.com", "group" => "EvmGroup-user_self_service"}
    user,_ = _users(request, appliance, None: data)
    assert_response(appliance)
    user_auth = [user[0].userid, data["password"]]
    raise unless appliance.new_rest_api_instance(auth: user_auth)
  end
  def test_edit_user_password(appliance, users)
    # Tests editing user password.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/3h
    #     
    user = users[0]
    new_password = fauxfactory.gen_alphanumeric()
    user.action.edit(password: new_password)
    assert_response(appliance)
    new_user_auth = [user.userid, new_password]
    raise unless appliance.new_rest_api_instance(auth: new_user_auth)
  end
  def test_edit_user_name(appliance, users, multiple)
    # Tests editing user name.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/3h
    #     
    collection = appliance.rest_api.collections.users
    users_len = users.size
    new = []
    for _ in users_len.times
      new.push({"name" => fauxfactory.gen_alphanumeric(15, "user_name_")})
    end
    if is_bool(multiple)
      for index in users_len.times
        new[index].update(users[index]._ref_repr())
      end
      edited = collection.action.edit(*new)
      assert_response(appliance)
    else
      edited = []
      for index in users_len.times
        edited.push(users[index].action.edit(None: new[index]))
        assert_response(appliance)
      end
    end
    raise unless users_len == edited.size
    for (index, user) in enumerate(users)
      record,_ = wait_for(lambda{|| collection.find_by(name: new[index]["name"]) || false}, num_sec: 180, delay: 10)
      user.reload()
      raise unless (record[0].id == edited[index].id) and (edited[index].id == user.id)
      raise unless (record[0].name == edited[index].name) and (edited[index].name == user.name)
    end
  end
  def test_edit_user_groups(appliance, users, group_by)
    # Tests editing user group.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    group_descriptions = ["EvmGroup-user_limited_self_service", "EvmGroup-approver"]
    groups = group_descriptions.map{|desc| appliance.rest_api.collections.groups.get(description: desc)}
    group_handles = [{"href" => groups[0].href}]
    for group in groups[1..-1]
      if group_by == "id"
        group_handle = {"id" => group.id}
      else
        if group_by == "href"
          group_handle = {"href" => group.href}
        else
          if group_by == "description"
            group_handle = {"description" => group.description}
          end
        end
      end
      group_handles.push(group_handle)
    end
    users_len = users.size
    new = []
    for _ in users_len.times
      new.push({"miq_groups" => group_handles})
    end
    edited = []
    for index in users_len.times
      edited.push(users[index].action.edit(None: new[index]))
      assert_response(appliance)
    end
    raise unless users_len == edited.size
    _updated = lambda do |user|
      user.reload(attributes: "miq_groups")
      descs = []
      for group in user.miq_groups
        descs.push(group["description"])
      end
      return group_descriptions.map{|desc| descs.include?(desc)}.is_all?
    end
    for (index, user) in enumerate(users)
      wait_for(lambda{|| _updated.call(user)}, num_sec: 20, delay: 2)
      user.reload()
      raise unless edited[index].id == user.id
    end
  end
  def test_edit_current_group(request, appliance, users_data)
    # Tests that editing current group using \"edit\" action is not supported.
    # 
    #     Testing BZ 1549086
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    group_descriptions = ["EvmGroup-user_limited_self_service", "EvmGroup-approver"]
    groups = group_descriptions.map{|desc| appliance.rest_api.collections.groups.get(description: desc)}
    group_handles = groups.map{|group| {"href" => group.href}}
    users,__ = users_data.(num: 1)
    user = users[0]
    user.action.edit(miq_groups: group_handles)
    assert_response(appliance)
    user.reload()
    raise unless user.current_group.id == groups[0].id
    pytest.raises(Exception, match: "BadRequestError: Invalid attribute") {
      user.action.edit(current_group: group_handles[1])
    }
    assert_response(appliance, http_status: 400)
  end
  def test_change_current_group_as_admin(request, appliance, users_data)
    # Tests that it's possible to edit current group.
    # 
    #     Testing BZ 1549086
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    group_descriptions = ["EvmGroup-user_limited_self_service", "EvmGroup-approver"]
    groups = group_descriptions.map{|desc| appliance.rest_api.collections.groups.get(description: desc)}
    group_handles = groups.map{|group| {"href" => group.href}}
    users,__ = users_data.(num: 1)
    user = users[0]
    user.action.edit(miq_groups: group_handles)
    assert_response(appliance)
    user.reload()
    raise unless user.current_group.id == groups[0].id
    pytest.raises(Exception, match: "Can only edit authenticated user's current group") {
      user.action.set_current_group(current_group: group_handles[1])
    }
    assert_response(appliance, http_status: 400)
  end
  def test_change_current_group_as_user(request, appliance, users_data)
    # Tests that users can update their own group.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    group_descriptions = ["EvmGroup-user_limited_self_service", "EvmGroup-approver"]
    groups = group_descriptions.map{|desc| appliance.rest_api.collections.groups.get(description: desc)}
    group_handles = groups.map{|group| {"href" => group.href}}
    users,data = users_data.(num: 1)
    user = users[0]
    user.action.edit(miq_groups: group_handles)
    assert_response(appliance)
    user.reload()
    raise unless user.current_group.id == groups[0].id
    user_auth = [user.userid, data[0]["password"]]
    user_api = appliance.new_rest_api_instance(auth: user_auth)
    user_api.post(user.href, action: "set_current_group", current_group: group_handles[1])
    assert_response(user_api)
  end
  def test_change_unassigned_group_as_user(request, appliance, users_data)
    # Tests that users can't update their own group to a group they don't belong to.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    group_descriptions = ["EvmGroup-user_limited_self_service", "EvmGroup-approver"]
    groups = group_descriptions.map{|desc| appliance.rest_api.collections.groups.get(description: desc)}
    group_handles = groups.map{|group| {"href" => group.href}}
    users,data = users_data.(num: 1)
    user = users[0]
    user.action.edit(miq_groups: group_handles[0...1])
    assert_response(appliance)
    user.reload()
    raise unless user.current_group.id == groups[0].id
    user_auth = [user.userid, data[0]["password"]]
    user_api = appliance.new_rest_api_instance(auth: user_auth)
    pytest.raises(Exception, match: "User must belong to group") {
      user_api.post(user.href, action: "set_current_group", current_group: group_handles[1])
    }
  end
  def test_change_password_as_user(appliance, user_auth)
    # Tests that users can update their own password.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    new_password = fauxfactory.gen_alphanumeric()
    new_user_auth = [user_auth[0], new_password]
    user = appliance.rest_api.collections.users.get(userid: user_auth[0])
    user_api = appliance.new_rest_api_instance(auth: user_auth)
    user_api.post(user.href, action: "edit", resource: {"password" => new_password})
    assert_response(user_api)
    raise unless appliance.new_rest_api_instance(auth: new_user_auth)
    pytest.raises(Exception, match: "Authentication failed") {
      appliance.new_rest_api_instance(auth: user_auth)
    }
  end
  def test_change_email_as_user(appliance, user_auth)
    # Tests that users can update their own email.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    new_email = "new@example.com"
    user = appliance.rest_api.collections.users.get(userid: user_auth[0])
    user_api = appliance.new_rest_api_instance(auth: user_auth)
    user_api.post(user.href, action: "edit", resource: {"email" => new_email})
    assert_response(user_api)
    user.reload()
    raise unless user.email == new_email
  end
  def test_delete_users_from_detail(users, method)
    # Tests deleting users from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_detail(users, method: method)
  end
  def test_delete_users_from_collection(users)
    # Tests deleting users from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_collection(users)
  end
end
COMMON_FEATURES = ["Services", "Compute", "Configuration", "Networks", "Storage", "Control", "Automation", "Monitor", "Help", "API", "Service UI"]
FEATURES_511 = COMMON_FEATURES + ["Overview", "Migration", "User Settings", "All VM and Instance Access Rules", "Main Configuration"]
FEATURES_510 = COMMON_FEATURES + ["Cloud Intel", "Optimize", "Access Rules for all Virtual Machines"]
def create_role(appliance, request)
  if is_bool(request.param)
    features = (appliance.version > "5.11") ? FEATURES_511 : FEATURES_510
    product_features = features.map{|feature| [["Everything", feature], true]}
  else
    product_features = [[["Everything"], true]]
  end
  role = appliance.collections.roles.create(name: fauxfactory.gen_alpha(15, start: "API-role-"), product_features: [[["Everything"], false]] + product_features)
  yield appliance.rest_api.collections.roles.get(name: role.name)
  role.delete_if_exists()
end
def role_api(appliance, request, create_role)
  group = _groups(request, appliance, create_role)
  user,user_data = _users(request, appliance, group: group.description)
  yield appliance.new_rest_api_instance(entry_point: appliance.rest_api._entry_point, auth: [user[0].userid, user_data[0]["password"]])
end
def test_create_picture_with_role(role_api)
  # 
  #   Bugzilla:
  #       1727948
  #       1731157
  # 
  #   Polarion:
  #       assignee: pvala
  #       caseimportance: high
  #       casecomponent: Rest
  #       initialEstimate: 1/4h
  #       setup:
  #           1. Create role by
  #               i. selecting every role individually.
  #               ii. checking every role by clicking on `Everything`.
  #           2. Create a group and user with the new role.
  #       testSteps:
  #           1. Send a POST request to create a picture and check the response.
  #       expectedResults:
  #           1. Picture must be created without any error.
  #               Check for `Use of Action create is forbidden` in response.
  #   
  picture = role_api.collections.pictures.action.create({"extension" => "png", "content" => "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="})[0]
  assert_response(role_api)
  raise unless picture.exists
end
