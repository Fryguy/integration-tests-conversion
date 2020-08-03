require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.long_running, pytest.mark.meta(server_roles: ["+embedded_ansible"]), pytest.mark.ignore_stream("upstream", "5.11"), test_requirements.rest]
def ansible(appliance)
  appliance.wait_for_embedded_ansible()
  provider,__ = wait_for(lambda{|| appliance.rest_api.collections.providers.find_by(name: "Embedded Ansible Automation Manager") || false}, num_sec: 200, delay: 5)
  return provider[0]
end
def repository(appliance, ansible)
  collection = appliance.rest_api.collections.configuration_script_sources
  uniq = fauxfactory.gen_alphanumeric(5)
  repo_name = "test_repo_#{uniq}"
  data = {"name" => repo_name, "description" => "Test Repo #{uniq}", "manager_resource" => {"href" => ansible.href}, "related" => {}, "scm_type" => "git", "scm_url" => "https://github.com/quarckster/ansible_playbooks", "scm_branch" => "", "scm_clean" => false, "scm_delete_on_update" => false, "scm_update_on_launch" => false}
  collection.action.create(data)
  assert_response(appliance)
  repo_rest,__ = wait_for(lambda{|| collection.find_by(name: repo_name) || false}, num_sec: 300, delay: 5)
  repo_rest = repo_rest[0]
  yield(repo_rest)
  if is_bool(repo_rest.exists)
    repo_rest.action.delete()
  end
end
class TestReposRESTAPI
  def test_edit_repository(appliance, repository, from_collection)
    # Tests editing repositories using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Ansible
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #         endsin: 5.10
    #     
    new_description = fauxfactory.gen_alphanumeric(21, start: "Test Repository ")
    if is_bool(from_collection)
      repository.reload()
      repository_data_edited = {"href" => repository.href, "description" => new_description}
      appliance.rest_api.collections.configuration_script_sources.action.edit(repository_data_edited)
    else
      repository.action.edit(description: new_description)
    end
    assert_response(appliance)
    record,__ = wait_for(lambda{|| appliance.rest_api.collections.configuration_script_sources.find_by(description: new_description) || false}, num_sec: 180, delay: 10)
    repository.reload()
    raise unless repository.description == record[0].description
  end
  def test_delete_repository_from_detail(appliance, repository, method)
    # Deletes repository from detail using REST API
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Ansible
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #         endsin: 5.10
    # 
    #     Bugzilla:
    #         1477520
    #     
    del_action = repository.action.delete.getattr(method.upcase())
    del_action.()
    assert_response(appliance)
    repository.wait_not_exists(num_sec: 300, delay: 5)
    pytest.raises(Exception, match: "ActiveRecord::RecordNotFound") {
      del_action.()
    }
    assert_response(appliance, http_status: 404)
  end
  def test_delete_repository_from_collection(appliance, repository)
    # Deletes repository from collection using REST API
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Ansible
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_collection([repository], not_found: false, num_sec: 300, delay: 5)
  end
end
class TestPayloadsRESTAPI
  def test_payloads_collection(appliance, repository)
    # Checks the configuration_script_payloads collection using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Ansible
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #         endsin: 5.10
    #     
    collection = appliance.rest_api.collections.configuration_script_payloads
    collection.reload()
    raise unless collection.all
    for payload in collection.all
      raise unless payload.type.include?("AutomationManager::Playbook")
    end
  end
  def test_authentications_subcollection(appliance, repository)
    # Checks the authentications subcollection using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Ansible
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #         endsin: 5.10
    #     
    script_payloads = appliance.rest_api.collections.configuration_script_payloads
    script_payloads.reload()
    raise unless ((script_payloads[-1]).authentications).name
  end
  def test_payloads_subcollection(appliance, repository)
    # Checks the configuration_script_payloads subcollection using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Ansible
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #         endsin: 5.10
    #     
    script_sources = appliance.rest_api.collections.configuration_script_sources
    script_sources.reload()
    raise unless (script_sources[-1]).configuration_script_payloads
  end
end
