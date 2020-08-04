require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/config_management/ansible_tower");
include(Cfme.Infrastructure.Config_management.Ansible_tower);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.rest,
  pytest.mark.provider([AnsibleTowerProvider], {scope: "module"}),
  pytest.mark.usefixtures("setup_provider")
];

function authentications(appliance, provider) {
  // Creates and returns authentication resources under /api/authentications.
  let auth_num = 2;
  let collection = appliance.rest_api.collections.authentications;
  let prov = appliance.rest_api.collections.providers.get({name: `${provider.name} %`});
  let data = [];
  let cred_names = [];

  for (let __ in auth_num.times) {
    let uniq = fauxfactory.gen_alphanumeric(5);
    let cred_name = `test_credentials_${uniq}`;
    cred_names.push(cred_name);

    data.push({
      description: `Test Description ${uniq}`,
      name: cred_name,
      related: {},
      user: 1,
      userid: "foo",
      password: "bar",
      host: "baz",
      type: "ManageIQ::Providers::AnsibleTower::AutomationManager::VmwareCredential",
      manager_resource: {href: prov.href}
    })
  };

  collection.action.create(...data);
  assert_response(appliance);
  let auths = [];

  for (let cred in cred_names) {
    let [search, __] = wait_for(
      () => collection.find_by({name: cred}) || false,
      {num_sec: 300, delay: 5}
    );

    auths.push(search[0])
  };

  if (auths.size != auth_num) throw new ();
  yield(auths);
  collection.reload();
  let ids = auths.map(e => e.id);
  let delete_entities = collection.select(e => ids.include(e.id)).map(e => e);
  if (is_bool(delete_entities)) collection.action.delete(...delete_entities)
};

function _check_edited_authentications(appliance, authentications, new_names) {
  for (let [index, auth] in enumerate(authentications)) {
    let [record, __] = wait_for(
      () => (
        appliance.rest_api.collections.authentications.find_by({name: new_names[index]}) || false
      ),

      {num_sec: 180, delay: 10}
    );

    auth.reload();
    if (auth.name != record[0].name) throw new ()
  }
};

class TestAuthenticationsRESTAPI {
  test_query_authentications_attributes(authentications, soft_assert) {
    // Tests access to authentication attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Auth
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    query_resource_attributes(authentications[0], {soft_assert})
  };

  test_authentications_edit_single(appliance, authentications) {
    // Tests editing single authentication at a time.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Auth
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let new_names = [];
    let responses = [];

    for (let auth in authentications) {
      let new_name = fauxfactory.gen_alphanumeric(
        20,
        {start: "test_edited_"}
      ).downcase();

      new_names.push(new_name);
      responses.push(auth.action.edit({name: new_name}));
      assert_response(appliance)
    };

    if (responses.size != authentications.size) throw new ();
    _check_edited_authentications(appliance, authentications, new_names)
  };

  test_authentications_edit_multiple(appliance, authentications) {
    // Tests editing multiple authentications at once.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Auth
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let new_names = [];
    let auths_data_edited = [];

    for (let auth in authentications) {
      let new_name = fauxfactory.gen_alphanumeric(
        20,
        {start: "test_edited_"}
      ).downcase();

      new_names.push(new_name);
      auth.reload();
      auths_data_edited.push({href: auth.href, name: new_name})
    };

    let responses = appliance.rest_api.collections.authentications.action.edit(...auths_data_edited);
    assert_response(appliance);
    if (responses.size != authentications.size) throw new ();
    _check_edited_authentications(appliance, authentications, new_names)
  };

  test_delete_authentications_from_detail_post(appliance, authentications) {
    // Tests deleting authentications from detail using POST method.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Auth
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    for (let auth in authentications) {
      auth.action.delete.POST();
      assert_response(appliance);
      auth.wait_not_exists({num_sec: 180, delay: 5});

      pytest.raises(
        Exception,
        {match: "ActiveRecord::RecordNotFound"},
        () => auth.action.delete.POST()
      );

      assert_response(appliance, {http_status: 404})
    }
  };

  test_delete_authentications_from_detail_delete(appliance, authentications) {
    // Tests deleting authentications from detail using DELETE method.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Auth
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    for (let auth in authentications) {
      auth.action.delete.DELETE();
      assert_response(appliance);
      auth.wait_not_exists({num_sec: 180, delay: 5});

      pytest.raises(
        Exception,
        {match: "ActiveRecord::RecordNotFound"},
        () => auth.action.delete.DELETE()
      );

      assert_response(appliance, {http_status: 404})
    }
  };

  test_delete_authentications_from_collection(appliance, authentications) {
    // Tests deleting authentications from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Auth
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    appliance.rest_api.collections.authentications.action.delete.POST(...authentications);
    assert_response(appliance);

    for (let auth in authentications) {
      auth.wait_not_exists({num_sec: 180, delay: 5})
    };

    appliance.rest_api.collections.authentications.action.delete.POST(...authentications);
    assert_response(appliance, {success: false})
  };

  test_authentications_options(appliance) {
    // Tests that credential types can be listed through OPTIONS HTTP method.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Auth
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let collection = appliance.rest_api.collections.authentications;
    if (!collection.options().data.include("credential_types")) throw new ();
    assert_response(appliance)
  }
};

function config_manager_rest(provider) {
  // Creates provider using REST API.
  provider.delete();
  if (!!provider.exists) throw new ();
  provider.create_rest();
  assert_response(provider.appliance);
  let rest_entity = provider.rest_api_entity;
  rest_entity.reload();
  yield(rest_entity);

  if (is_bool(rest_entity.exists)) {
    rest_entity.action.delete();
    rest_entity.wait_not_exists()
  }
};

function test_config_manager_create_rest(config_manager_rest) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  // 
  //   Bugzilla:
  //       1621888
  //   
  if (!config_manager_rest.href.include("?provider_class=provider")) {
    throw new ()
  };

  if (!config_manager_rest.type.include("::Provider")) throw new ()
};

function test_config_manager_edit_rest(request, config_manager_rest) {
  // Test editing a config manager using REST API.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let new_name = fauxfactory.gen_alpha(30);
  let old_name = config_manager_rest.name;
  request.addfinalizer(() => config_manager_rest.action.edit({name: old_name}));
  let updated = config_manager_rest.action.edit({name: new_name});
  config_manager_rest.reload();

  if (!(config_manager_rest.name == new_name) || !(new_name == updated.name)) {
    throw new ()
  }
};

function test_config_manager_delete_rest(config_manager_rest, method) {
  // Tests deletion of the config manager from detail using REST API.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  delete_resources_from_detail([config_manager_rest], {method})
}
