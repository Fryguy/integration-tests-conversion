require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
pytestmark = [pytest.mark.long_running, pytest.mark.tier(2), pytest.mark.provider([CloudProvider, InfraProvider], scope: "module"), test_requirements.rest]
COLLECTIONS = ["providers", "vms", "instances", "services"]
def vm_obj(provider, setup_provider_modscope, small_template_modscope)
  # Creates new VM or instance
  vm_name = random_vm_name("attrs")
  collection = provider.appliance.provider_based_collection(provider)
  new_vm = collection.instantiate(vm_name, provider, template_name: small_template_modscope.name)
  yield new_vm
  new_vm.cleanup_on_provider()
end
def get_provider(appliance, provider, setup_provider_modscope)
  resource = appliance.rest_api.collections.providers.get(name: provider.name)
  return lambda{|| resource}
end
def get_vm(appliance, provider, vm_obj)
  if is_bool(provider.one_of(InfraProvider))
    collection = appliance.rest_api.collections.vms
  else
    collection = appliance.rest_api.collections.instances
  end
  _get_vm = lambda do
    if is_bool(!provider.mgmt.does_vm_exist(vm_obj.name))
      vm_obj.create_on_provider(timeout: 2400, find_in_cfme: true, allow_skip: "default")
    end
    vms = collection.find_by(name: vm_obj.name)
    return vms[0]
  end
  return _get_vm
end
def get_service(appliance)
  uid = fauxfactory.gen_alphanumeric(5)
  name = 
  _get_service = lambda do
    service = appliance.rest_api.collections.services.find_by(name: name)
    if is_bool(!service)
      body = {"name" => name, "description" => }
      service = appliance.rest_api.collections.services.action.create(body)
    end
    return service[0]
  end
  yield _get_service
  begin
    service = appliance.rest_api.collections.services.get(name: name)
    service.delete()
  rescue [NoMethodError, TypeError]
    # pass
  end
end
def get_resource(get_provider, get_vm, get_service)
  db = {"providers" => get_provider, "instances" => get_vm, "vms" => get_vm, "services" => get_service}
  return db
end
def add_custom_attributes(request, resource, num: 2)
  body = []
  for __ in num.times
    uid = fauxfactory.gen_alphanumeric(5)
    body.push({"name" => , "value" => })
  end
  attrs = resource.custom_attributes.action.add(*body)
  _delete = lambda do
    resource.custom_attributes.reload()
    ids = attrs.map{|attr| attr.id}
    delete_attrs = resource.custom_attributes.select{|attr| ids.include?(attr.id)}.map{|attr| attr}
    if is_bool(delete_attrs)
      resource.custom_attributes.action.delete(*delete_attrs)
    end
  end
  assert_response(resource.collection._api)
  raise unless attrs.size == num
  return attrs
end
def _uncollect(provider, collection_name)
  return provider.one_of(InfraProvider) && collection_name == "instances" || provider.one_of(CloudProvider) && collection_name == "vms"
end
GENERIC_UNCOLLECT = "Invalid combination of collection_name and provider type"
class TestCustomAttributesRESTAPI
  def test_add(request, collection_name, get_resource)
    # Test adding custom attributes to resource using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    resource = get_resource[collection_name]()
    attributes = add_custom_attributes(request, resource)
    for attr in attributes
      record = resource.custom_attributes.get(id: attr.id)
      raise unless record.name == attr.name
      raise unless record.value == attr.value
    end
  end
  def test_delete_from_detail_post(request, collection_name, get_resource)
    # Test deleting custom attributes from detail using POST method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    attributes = add_custom_attributes(request, get_resource[collection_name]())
    delete_resources_from_detail(attributes, method: "POST")
  end
  def test_delete_from_detail_delete(request, collection_name, get_resource)
    # Test deleting custom attributes from detail using DELETE method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    attributes = add_custom_attributes(request, get_resource[collection_name]())
    delete_resources_from_detail(attributes, method: "DELETE")
  end
  def test_delete_from_collection(request, collection_name, get_resource)
    # Test deleting custom attributes from collection using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    resource = get_resource[collection_name]()
    attributes = add_custom_attributes(request, resource)
    collection = resource.custom_attributes
    delete_resources_from_collection(attributes, collection: collection, not_found: true)
  end
  def test_delete_single_from_collection(request, collection_name, get_resource)
    # Test deleting single custom attribute from collection using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    resource = get_resource[collection_name]()
    attributes = add_custom_attributes(request, resource)
    attribute = attributes[0]
    collection = resource.custom_attributes
    delete_resources_from_collection([attribute], collection: collection, not_found: true)
  end
  def test_edit(request, from_detail, collection_name, appliance, get_resource)
    # Test editing custom attributes using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    resource = get_resource[collection_name]()
    attributes = add_custom_attributes(request, resource)
    response_len = attributes.size
    body = []
    for __ in response_len.times
      uid = fauxfactory.gen_alphanumeric(5)
      body.push({"name" => , "value" => , "section" => "metadata"})
    end
    if is_bool(from_detail)
      edited = []
      for i in response_len.times
        edited.push(attributes[i].action.edit(None: body[i]))
        assert_response(appliance)
      end
    else
      for i in response_len.times
        body[i].update(attributes[i]._ref_repr())
      end
      edited = resource.custom_attributes.action.edit(*body)
      assert_response(appliance)
    end
    raise unless edited.size == response_len
    for i in response_len.times
      attributes[i].reload()
      raise unless (edited[i].name == body[i]["name"]) and (body[i]["name"] == attributes[i].name)
      raise unless (edited[i].value == body[i]["value"]) and (body[i]["value"] == attributes[i].value)
      raise unless (edited[i].section == body[i]["section"]) and (body[i]["section"] == attributes[i].section)
    end
  end
  def test_bad_section_edit(request, from_detail, collection_name, appliance, get_resource)
    # Test that editing custom attributes using REST API and adding invalid section fails.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    resource = get_resource[collection_name]()
    attributes = add_custom_attributes(request, resource)
    response_len = attributes.size
    body = []
    for __ in response_len.times
      body.push({"section" => "bad_section"})
    end
    if is_bool(from_detail)
      for i in response_len.times
        pytest.raises(Exception, match: "Api::BadRequestError") {
          attributes[i].action.edit(None: body[i])
        }
        assert_response(appliance, http_status: 400)
      end
    else
      for i in response_len.times
        body[i].update(attributes[i]._ref_repr())
      end
      pytest.raises(Exception, match: "Api::BadRequestError") {
        resource.custom_attributes.action.edit(*body)
      }
      assert_response(appliance, http_status: 400)
    end
  end
  def test_bad_section_add(request, collection_name, appliance, get_resource)
    # Test adding custom attributes with invalid section to resource using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    resource = get_resource[collection_name]()
    add_custom_attributes(request, resource)
    uid = fauxfactory.gen_alphanumeric(5)
    body = {"name" => , "value" => , "section" => "bad_section"}
    pytest.raises(Exception, match: "Api::BadRequestError") {
      resource.custom_attributes.action.add(body)
    }
    assert_response(appliance, http_status: 400)
  end
  def test_add_duplicate(request, collection_name, get_resource)
    # Tests that adding duplicate custom attribute updates the existing one.
    # 
    #     Testing BZ 1544800
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    resource = get_resource[collection_name]()
    orig_attribute, = add_custom_attributes(request, resource, num: 1)
    new_attribute = resource.custom_attributes.action.add({"name" => orig_attribute.name, "value" => "updated_value"})[0]
    raise unless orig_attribute.name == new_attribute.name
    raise unless orig_attribute.id == new_attribute.id
    raise unless new_attribute.value == "updated_value"
  end
end
