require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);

let pytestmark = [
  pytest.mark.long_running,
  pytest.mark.tier(2),

  pytest.mark.provider(
    [CloudProvider, InfraProvider],
    {scope: "module"}
  ),

  test_requirements.rest
];

const COLLECTIONS = ["providers", "vms", "instances", "services"];

function vm_obj(provider, setup_provider_modscope, small_template_modscope) {
  // Creates new VM or instance
  let vm_name = random_vm_name("attrs");
  let collection = provider.appliance.provider_based_collection(provider);

  let new_vm = collection.instantiate(
    vm_name,
    provider,
    {template_name: small_template_modscope.name}
  );

  yield(new_vm);
  new_vm.cleanup_on_provider()
};

function get_provider(appliance, provider, setup_provider_modscope) {
  let resource = appliance.rest_api.collections.providers.get({name: provider.name});
  return () => resource
};

function get_vm(appliance, provider, vm_obj) {
  let collection;

  if (is_bool(provider.one_of(InfraProvider))) {
    collection = appliance.rest_api.collections.vms
  } else {
    collection = appliance.rest_api.collections.instances
  };

  let _get_vm = () => {
    if (is_bool(!provider.mgmt.does_vm_exist(vm_obj.name))) {
      vm_obj.create_on_provider({
        timeout: 2400,
        find_in_cfme: true,
        allow_skip: "default"
      })
    };

    let vms = collection.find_by({name: vm_obj.name});
    return vms[0]
  };

  return _get_vm
};

function get_service(appliance) {
  let uid = fauxfactory.gen_alphanumeric(5);
  let name = `test_rest_service_${uid}`;

  let _get_service = () => {
    let service = appliance.rest_api.collections.services.find_by({name});

    if (is_bool(!service)) {
      let body = {name: name, description: `Test REST Service ${uid}`};
      service = appliance.rest_api.collections.services.action.create(body)
    };

    return service[0]
  };

  yield(_get_service);

  // pass
  try {
    let service = appliance.rest_api.collections.services.get({name});
    service.delete()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof [NoMethodError, TypeError]) {

    } else {
      throw $EXCEPTION
    }
  }
};

function get_resource(get_provider, get_vm, get_service) {
  let db = {
    providers: get_provider,
    instances: get_vm,
    vms: get_vm,
    services: get_service
  };

  return db
};

function add_custom_attributes(request, resource, { num = 2 }) {
  let body = [];

  for (let __ in num.times) {
    let uid = fauxfactory.gen_alphanumeric(5);
    body.push({name: `ca_name_${uid}`, value: `ca_value_${uid}`})
  };

  let attrs = resource.custom_attributes.action.add(...body);

  let _delete = () => {
    resource.custom_attributes.reload();
    let ids = attrs.map(attr => attr.id);

    let delete_attrs = resource.custom_attributes.select(attr => (
      ids.include(attr.id)
    )).map(attr => attr);

    if (is_bool(delete_attrs)) {
      return resource.custom_attributes.action.delete(...delete_attrs)
    }
  };

  assert_response(resource.collection._api);
  if (attrs.size != num) throw new ();
  return attrs
};

function _uncollect(provider, collection_name) {
  return provider.one_of(InfraProvider) && collection_name == "instances" || provider.one_of(CloudProvider) && collection_name == "vms"
};

const GENERIC_UNCOLLECT = "Invalid combination of collection_name and provider type";

class TestCustomAttributesRESTAPI {
  test_add(request, collection_name, get_resource) {
    // Test adding custom attributes to resource using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let attributes = add_custom_attributes(request, resource);

    for (let attr in attributes) {
      let record = resource.custom_attributes.get({id: attr.id});
      if (record.name != attr.name) throw new ();
      if (record.value != attr.value) throw new ()
    }
  };

  test_delete_from_detail_post(request, collection_name, get_resource) {
    // Test deleting custom attributes from detail using POST method.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_detail(attributes, {method: "POST"})
  };

  test_delete_from_detail_delete(request, collection_name, get_resource) {
    // Test deleting custom attributes from detail using DELETE method.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_detail(attributes, {method: "DELETE"})
  };

  test_delete_from_collection(request, collection_name, get_resource) {
    // Test deleting custom attributes from collection using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let attributes = add_custom_attributes(request, resource);
    let collection = resource.custom_attributes;

    delete_resources_from_collection(
      attributes,
      {collection, not_found: true}
    )
  };

  test_delete_single_from_collection(request, collection_name, get_resource) {
    // Test deleting single custom attribute from collection using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let attributes = add_custom_attributes(request, resource);
    let attribute = attributes[0];
    let collection = resource.custom_attributes;

    delete_resources_from_collection(
      [attribute],
      {collection, not_found: true}
    )
  };

  test_edit(request, from_detail, collection_name, appliance, get_resource) {
    let edited;

    // Test editing custom attributes using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let attributes = add_custom_attributes(request, resource);
    let response_len = attributes.size;
    let body = [];

    for (let __ in response_len.times) {
      let uid = fauxfactory.gen_alphanumeric(5);

      body.push({
        name: `ca_name_${uid}`,
        value: `ca_value_${uid}`,
        section: "metadata"
      })
    };

    if (is_bool(from_detail)) {
      edited = [];

      for (let i in response_len.times) {
        edited.push(attributes[i].action.edit({None: body[i]}));
        assert_response(appliance)
      }
    } else {
      for (let i in response_len.times) {
        body[i].update(attributes[i]._ref_repr())
      };

      edited = resource.custom_attributes.action.edit(...body);
      assert_response(appliance)
    };

    if (edited.size != response_len) throw new ();

    for (let i in response_len.times) {
      attributes[i].reload();

      if (!(edited[i].name == body[i].name) || !(body[i].name == attributes[i].name)) {
        throw new ()
      };

      if (!(edited[i].value == body[i].value) || !(body[i].value == attributes[i].value)) {
        throw new ()
      };

      if (!(edited[i].section == body[i].section) || !(body[i].section == attributes[i].section)) {
        throw new ()
      }
    }
  };

  test_bad_section_edit(request, from_detail, collection_name, appliance, get_resource) {
    // Test that editing custom attributes using REST API and adding invalid section fails.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let attributes = add_custom_attributes(request, resource);
    let response_len = attributes.size;
    let body = [];

    for (let __ in response_len.times) {
      body.push({section: "bad_section"})
    };

    if (is_bool(from_detail)) {
      for (let i in response_len.times) {
        pytest.raises(
          Exception,
          {match: "Api::BadRequestError"},
          () => attributes[i].action.edit({None: body[i]})
        );

        assert_response(appliance, {http_status: 400})
      }
    } else {
      for (let i in response_len.times) {
        body[i].update(attributes[i]._ref_repr())
      };

      pytest.raises(
        Exception,
        {match: "Api::BadRequestError"},
        () => resource.custom_attributes.action.edit(...body)
      );

      assert_response(appliance, {http_status: 400})
    }
  };

  test_bad_section_add(request, collection_name, appliance, get_resource) {
    // Test adding custom attributes with invalid section to resource using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    add_custom_attributes(request, resource);
    let uid = fauxfactory.gen_alphanumeric(5);

    let body = {
      name: `ca_name_${uid}`,
      value: `ca_value_${uid}`,
      section: "bad_section"
    };

    pytest.raises(
      Exception,
      {match: "Api::BadRequestError"},
      () => resource.custom_attributes.action.add(body)
    );

    assert_response(appliance, {http_status: 400})
  };

  test_add_duplicate(request, collection_name, get_resource) {
    // Tests that adding duplicate custom attribute updates the existing one.
    // 
    //     Testing BZ 1544800
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let [orig_attribute] = add_custom_attributes(
      request,
      resource,
      {num: 1}
    );

    let new_attribute = resource.custom_attributes.action.add({
      name: orig_attribute.name,
      value: "updated_value"
    })[0];

    if (orig_attribute.name != new_attribute.name) throw new ();
    if (orig_attribute.id != new_attribute.id) throw new ();
    if (new_attribute.value != "updated_value") throw new ()
  }
}
