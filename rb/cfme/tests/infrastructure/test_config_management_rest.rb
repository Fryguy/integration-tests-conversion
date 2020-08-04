require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/config_management/ansible_tower'
include Cfme::Infrastructure::Config_management::Ansible_tower
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.rest, pytest.mark.provider([AnsibleTowerProvider], scope: "module"), pytest.mark.usefixtures("setup_provider")]
def authentications(appliance, provider)
  # Creates and returns authentication resources under /api/authentications.
  auth_num = 2
  collection = appliance.rest_api.collections.authentications
  prov = appliance.rest_api.collections.providers.get(name: "#{provider.name} %")
  data = []
  cred_names = []
  for __ in auth_num.times
    uniq = fauxfactory.gen_alphanumeric(5)
    cred_name = "test_credentials_#{uniq}"
    cred_names.push(cred_name)
    data.push({"description" => "Test Description #{uniq}", "name" => cred_name, "related" => {}, "user" => 1, "userid" => "foo", "password" => "bar", "host" => "baz", "type" => "ManageIQ::Providers::AnsibleTower::AutomationManager::VmwareCredential", "manager_resource" => {"href" => prov.href}})
  end
  collection.action.create(*data)
  assert_response(appliance)
  auths = []
  for cred in cred_names
    search,__ = wait_for(lambda{|| collection.find_by(name: cred) || false}, num_sec: 300, delay: 5)
    auths.push(search[0])
  end
  raise unless auths.size == auth_num
  yield(auths)
  collection.reload()
  ids = auths.map{|e| e.id}
  delete_entities = collection.select{|e| ids.include?(e.id)}.map{|e| e}
  if is_bool(delete_entities)
    collection.action.delete(*delete_entities)
  end
end
def _check_edited_authentications(appliance, authentications, new_names)
  for (index, auth) in enumerate(authentications)
    record,__ = wait_for(lambda{|| appliance.rest_api.collections.authentications.find_by(name: new_names[index]) || false}, num_sec: 180, delay: 10)
    auth.reload()
    raise unless auth.name == record[0].name
  end
end
class TestAuthenticationsRESTAPI
  def test_query_authentications_attributes(authentications, soft_assert)
    # Tests access to authentication attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Auth
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(authentications[0], soft_assert: soft_assert)
  end
  def test_authentications_edit_single(appliance, authentications)
    # Tests editing single authentication at a time.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Auth
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    new_names = []
    responses = []
    for auth in authentications
      new_name = fauxfactory.gen_alphanumeric(20, start: "test_edited_").downcase()
      new_names.push(new_name)
      responses.push(auth.action.edit(name: new_name))
      assert_response(appliance)
    end
    raise unless responses.size == authentications.size
    _check_edited_authentications(appliance, authentications, new_names)
  end
  def test_authentications_edit_multiple(appliance, authentications)
    # Tests editing multiple authentications at once.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Auth
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    new_names = []
    auths_data_edited = []
    for auth in authentications
      new_name = fauxfactory.gen_alphanumeric(20, start: "test_edited_").downcase()
      new_names.push(new_name)
      auth.reload()
      auths_data_edited.push({"href" => auth.href, "name" => new_name})
    end
    responses = appliance.rest_api.collections.authentications.action.edit(*auths_data_edited)
    assert_response(appliance)
    raise unless responses.size == authentications.size
    _check_edited_authentications(appliance, authentications, new_names)
  end
  def test_delete_authentications_from_detail_post(appliance, authentications)
    # Tests deleting authentications from detail using POST method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Auth
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    for auth in authentications
      auth.action.delete.POST()
      assert_response(appliance)
      auth.wait_not_exists(num_sec: 180, delay: 5)
      pytest.raises(Exception, match: "ActiveRecord::RecordNotFound") {
        auth.action.delete.POST()
      }
      assert_response(appliance, http_status: 404)
    end
  end
  def test_delete_authentications_from_detail_delete(appliance, authentications)
    # Tests deleting authentications from detail using DELETE method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Auth
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    for auth in authentications
      auth.action.delete.DELETE()
      assert_response(appliance)
      auth.wait_not_exists(num_sec: 180, delay: 5)
      pytest.raises(Exception, match: "ActiveRecord::RecordNotFound") {
        auth.action.delete.DELETE()
      }
      assert_response(appliance, http_status: 404)
    end
  end
  def test_delete_authentications_from_collection(appliance, authentications)
    # Tests deleting authentications from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Auth
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    appliance.rest_api.collections.authentications.action.delete.POST(*authentications)
    assert_response(appliance)
    for auth in authentications
      auth.wait_not_exists(num_sec: 180, delay: 5)
    end
    appliance.rest_api.collections.authentications.action.delete.POST(*authentications)
    assert_response(appliance, success: false)
  end
  def test_authentications_options(appliance)
    # Tests that credential types can be listed through OPTIONS HTTP method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Auth
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    collection = appliance.rest_api.collections.authentications
    raise unless collection.options()["data"].include?("credential_types")
    assert_response(appliance)
  end
end
def config_manager_rest(provider)
  # Creates provider using REST API.
  provider.delete()
  raise unless !provider.exists
  provider.create_rest()
  assert_response(provider.appliance)
  rest_entity = provider.rest_api_entity
  rest_entity.reload()
  yield(rest_entity)
  if is_bool(rest_entity.exists)
    rest_entity.action.delete()
    rest_entity.wait_not_exists()
  end
end
def test_config_manager_create_rest(config_manager_rest)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  # 
  #   Bugzilla:
  #       1621888
  #   
  raise unless config_manager_rest.href.include?("?provider_class=provider")
  raise unless config_manager_rest.type.include?("::Provider")
end
def test_config_manager_edit_rest(request, config_manager_rest)
  # Test editing a config manager using REST API.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  new_name = fauxfactory.gen_alpha(30)
  old_name = config_manager_rest.name
  request.addfinalizer(lambda{|| config_manager_rest.action.edit(name: old_name)})
  updated = config_manager_rest.action.edit(name: new_name)
  config_manager_rest.reload()
  raise unless (config_manager_rest.name == new_name) and (new_name == updated.name)
end
def test_config_manager_delete_rest(config_manager_rest, method)
  # Tests deletion of the config manager from detail using REST API.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  delete_resources_from_detail([config_manager_rest], method: method)
end
