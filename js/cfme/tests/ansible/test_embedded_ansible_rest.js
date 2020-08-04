require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.long_running,
  pytest.mark.meta({server_roles: ["+embedded_ansible"]}),
  pytest.mark.ignore_stream("upstream", "5.11"),
  test_requirements.rest
];

function ansible(appliance) {
  appliance.wait_for_embedded_ansible();

  let [provider, __] = wait_for(
    () => (
      appliance.rest_api.collections.providers.find_by({name: "Embedded Ansible Automation Manager"}) || false
    ),

    {num_sec: 200, delay: 5}
  );

  return provider[0]
};

function repository(appliance, ansible) {
  let collection = appliance.rest_api.collections.configuration_script_sources;
  let uniq = fauxfactory.gen_alphanumeric(5);
  let repo_name = `test_repo_${uniq}`;

  let data = {
    name: repo_name,
    description: `Test Repo ${uniq}`,
    manager_resource: {href: ansible.href},
    related: {},
    scm_type: "git",
    scm_url: "https://github.com/quarckster/ansible_playbooks",
    scm_branch: "",
    scm_clean: false,
    scm_delete_on_update: false,
    scm_update_on_launch: false
  };

  collection.action.create(data);
  assert_response(appliance);

  let [repo_rest, __] = wait_for(
    () => collection.find_by({name: repo_name}) || false,
    {num_sec: 300, delay: 5}
  );

  repo_rest = repo_rest[0];
  yield(repo_rest);
  if (is_bool(repo_rest.exists)) repo_rest.action.delete()
};

class TestReposRESTAPI {
  test_edit_repository(appliance, repository, from_collection) {
    // Tests editing repositories using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Ansible
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //         endsin: 5.10
    //     
    let new_description = fauxfactory.gen_alphanumeric(
      21,
      {start: "Test Repository "}
    );

    if (is_bool(from_collection)) {
      repository.reload();

      let repository_data_edited = {
        href: repository.href,
        description: new_description
      };

      appliance.rest_api.collections.configuration_script_sources.action.edit(repository_data_edited)
    } else {
      repository.action.edit({description: new_description})
    };

    assert_response(appliance);

    let [record, __] = wait_for(
      () => (
        appliance.rest_api.collections.configuration_script_sources.find_by({description: new_description}) || false
      ),

      {num_sec: 180, delay: 10}
    );

    repository.reload();
    if (repository.description != record[0].description) throw new ()
  };

  test_delete_repository_from_detail(appliance, repository, method) {
    // Deletes repository from detail using REST API
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Ansible
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //         endsin: 5.10
    // 
    //     Bugzilla:
    //         1477520
    //     
    let del_action = repository.action.delete.getattr(method.upcase());
    del_action.call();
    assert_response(appliance);
    repository.wait_not_exists({num_sec: 300, delay: 5});

    pytest.raises(
      Exception,
      {match: "ActiveRecord::RecordNotFound"},
      () => del_action.call()
    );

    assert_response(appliance, {http_status: 404})
  };

  test_delete_repository_from_collection(appliance, repository) {
    // Deletes repository from collection using REST API
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Ansible
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_collection(
      [repository],
      {not_found: false, num_sec: 300, delay: 5}
    )
  }
};

class TestPayloadsRESTAPI {
  test_payloads_collection(appliance, repository) {
    // Checks the configuration_script_payloads collection using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Ansible
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //         endsin: 5.10
    //     
    let collection = appliance.rest_api.collections.configuration_script_payloads;
    collection.reload();
    if (!collection.all) throw new ();

    for (let payload in collection.all) {
      if (!payload.type.include("AutomationManager::Playbook")) throw new ()
    }
  };

  test_authentications_subcollection(appliance, repository) {
    // Checks the authentications subcollection using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Ansible
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //         endsin: 5.10
    //     
    let script_payloads = appliance.rest_api.collections.configuration_script_payloads;
    script_payloads.reload();
    if (!((script_payloads[-1]).authentications).name) throw new ()
  };

  test_payloads_subcollection(appliance, repository) {
    // Checks the configuration_script_payloads subcollection using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Ansible
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //         endsin: 5.10
    //     
    let script_sources = appliance.rest_api.collections.configuration_script_sources;
    script_sources.reload();
    if (!(script_sources[-1]).configuration_script_payloads) throw new ()
  }
}
