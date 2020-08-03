require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _categories categories
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _service_templates service_templates
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _tags tags
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _tenants tenants
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _users users
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _vm vm
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
CLOUD_COLLECTION = ["availability_zones", "cloud_networks", "cloud_subnets", "flavors", "network_routers", "security_groups"]
INFRA_COLLECTION = ["clusters", "hosts", "data_stores", "providers", "resource_pools", "services", "service_templates", "tenants", "vms", "users"]
pytestmark = [pytest.mark.provider(classes: [InfraProvider], selector: ONE), pytest.mark.usefixtures("setup_provider")]
def category(appliance)
  cg = appliance.collections.categories.create(name: fauxfactory.gen_alphanumeric(8).downcase(), description: fauxfactory.gen_alphanumeric(32), display_name: fauxfactory.gen_alphanumeric(32))
  yield cg
  if is_bool(cg.exists)
    cg.delete()
  end
end
def tag(category)
  tag = category.collections.tags.create(name: fauxfactory.gen_alphanumeric(8).downcase(), display_name: fauxfactory.gen_alphanumeric(32))
  yield tag
  tag.delete_if_exists()
end
def test_tag_crud(tag)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       initialEstimate: 1/8h
  #       casecomponent: Tagging
  #   
  raise unless tag.exists
  tag.update({"name" => fauxfactory.gen_alphanumeric(8).downcase(), "display_name" => fauxfactory.gen_alphanumeric(32)})
end
def test_map_tagging_crud(appliance, category, soft_assert)
  # Test map tag crud with flash message assertion
  #   Polarion:
  #       assignee: anikifor
  #       initialEstimate: 1/4h
  #       casecomponent: Tagging
  #   Bugzilla:
  #       1707328
  #   
  label = fauxfactory.gen_alphanumeric(8)
  map_tags_collection = appliance.collections.map_tags
  map_tag_entity = map_tags_collection.create("Container Project", label, category.name)
  view = appliance.browser.create_view(navigator.get_class(map_tags_collection, "All").VIEW)
  view.flash.assert_success_message("Container Label Tag Mapping \"{}\" was added".format(label))
  update(map_tag_entity) {
    map_tag_entity.category = fauxfactory.gen_alphanumeric(8)
  }
  view = appliance.browser.create_view(navigator.get_class(map_tags_collection, "All").VIEW)
  view.flash.assert_success_message("Container Label Tag Mapping \"{}\" was saved".format(map_tag_entity.label))
  row = next(view.table.rows(resource_label: map_tag_entity.label))
  soft_assert.(row.tag_category.text == map_tag_entity.category)
  map_tag_entity.delete()
  view = appliance.browser.create_view(navigator.get_class(map_tags_collection, "All").VIEW)
  if appliance.version >= "5.11"
    view.flash.assert_success_message("Container Label Tag Mapping \"{}\": Delete successful".format(map_tag_entity.label))
  end
end
def test_updated_tag_name_on_vm(provider, tag, request)
  # 
  #   This test checks that tags don't disappear from the UI after their name (not displayed name) is
  #   changed.
  # 
  #   Bugzilla:
  #       1668730
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Configuration
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #       testSteps:
  #           1. create a tag
  #           2. assign the tag to some vm, observe the tag in Smart Management section of vm
  #           3. change name of the tag
  #           4. on VM screen: still the same tag in Smart Management section of vm
  #   
  coll = provider.appliance.provider_based_collection(provider, coll_type: "vms")
  vm = coll.all()[0]
  vm.add_tag(tag)
  request.addfinalizer(lambda{|| vm.remove_tag(tag)})
  vm_tags = vm.get_tags()
  raise "tag is not assigned" unless vm_tags.map{|vm_tag| tag.category.display_name == vm_tag.category.display_name && tag.display_name == vm_tag.display_name}.is_any?
  new_tag_name = "{}_{}".format(tag.name, fauxfactory.gen_alphanumeric(4).downcase())
  tag.update({"name" => new_tag_name})
  vm_tags = vm.get_tags()
  raise "tag is not assigned" unless vm_tags.map{|vm_tag| tag.category.display_name == vm_tag.category.display_name && tag.display_name == vm_tag.display_name}.is_any?
end
class TestTagsViaREST
  @@COLLECTIONS_BULK_TAGS = ["services", "vms", "users"]
  def _service_body(**kwargs)
    uid = fauxfactory.gen_alphanumeric(5)
    body = {"name" => , "description" => }
    body.update(kwargs)
    return body
  end
  def _create_services(request, rest_api, num: 3)
    bodies = num.times.map{|__| _service_body()}
    collection = rest_api.collections.services
    new_services = collection.action.create(*bodies)
    assert_response(rest_api)
    new_services_backup = new_services.to_a
    _finished = lambda do
      collection.reload()
      ids = new_services_backup.map{|service| service.id}
      delete_entities = collection.select{|service| ids.include?(service.id)}.map{|service| service}
      if is_bool(delete_entities)
        collection.action.delete(*delete_entities)
      end
    end
    return new_services
  end
  def services(request, appliance)
    return _create_services(request, appliance.rest_api)
  end
  def categories(request, appliance, num: 3)
    return _categories(request, appliance, num)
  end
  def tags(request, appliance, categories)
    return _tags(request, appliance, categories)
  end
  def services_mod(request, appliance)
    return _create_services(request, appliance.rest_api)
  end
  def categories_mod(request, appliance, num: 3)
    return _categories(request, appliance, num)
  end
  def tags_mod(request, appliance, categories_mod)
    return _tags(request, appliance, categories_mod)
  end
  def tenants(request, appliance)
    return _tenants(request, appliance, num: 1)
  end
  def service_templates(request, appliance)
    return _service_templates(request, appliance)
  end
  def vm(request, provider, appliance)
    return _vm(request, provider, appliance)
  end
  def users(request, appliance, num: 3)
    return _users(request, appliance, num: num)
  end
  def test_edit_tags_rest(appliance, tags)
    # Tests tags editing from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: high
    #         initialEstimate: 1/6h
    #     
    collection = appliance.rest_api.collections.tags
    tags_len = tags.size
    tags_data_edited = []
    for tag in tags
      tags_data_edited.push({"href" => tag.href, "name" => fauxfactory.gen_alphanumeric(15, start: "test_tag_").downcase()})
    end
    edited = collection.action.edit(*tags_data_edited)
    assert_response(appliance, results_num: tags_len)
    for index in tags_len.times
      record,_ = wait_for(lambda{|| (collection.find_by(name: ("%/{}").format(tags_data_edited[index]["name"]))) || false}, num_sec: 180, delay: 10)
      raise unless record[0].id == edited[index].id
      raise unless record[0].name == edited[index].name
    end
  end
  def test_edit_tag_from_detail(appliance, tags)
    # Tests tag editing from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: high
    #         initialEstimate: 1/30h
    #     
    edited = []
    new_names = []
    for tag in tags
      new_name = fauxfactory.gen_alphanumeric(15, start: "test_tag_")
      new_names.push(new_name)
      edited.push(tag.action.edit(name: new_name))
      assert_response(appliance)
    end
    for (index, name) in enumerate(new_names)
      record,_ = wait_for(lambda{|| appliance.rest_api.collections.tags.find_by(name: ) || false}, num_sec: 180, delay: 10)
      raise unless record[0].id == edited[index].id
      raise unless record[0].name == edited[index].name
    end
  end
  def test_delete_tags_from_detail(tags, method)
    # Tests deleting tags from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: high
    #         initialEstimate: 1/30h
    #     
    delete_resources_from_detail(tags, method: method)
  end
  def test_delete_tags_from_collection(tags)
    # Tests deleting tags from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: high
    #         initialEstimate: 1/30h
    #     
    delete_resources_from_collection(tags, not_found: true)
  end
  def test_create_tag_with_wrong_arguments(appliance)
    # Tests creating tags with missing category \"id\", \"href\" or \"name\".
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: high
    #         initialEstimate: 1/30h
    #     
    data = {"name" => fauxfactory.gen_alphanumeric(15, start: "test_tag_").downcase(), "description" => fauxfactory.gen_alphanumeric(20, start: "test_tag_desc_").downcase()}
    msg = "BadRequestError: Category id, href or name needs to be specified"
    pytest.raises(Exception, match: msg) {
      appliance.rest_api.collections.tags.action.create(data)
    }
    assert_response(appliance, http_status: 400)
  end
  def test_assign_and_unassign_tag(appliance, tags_mod, provider, services_mod, service_templates, tenants, vm, collection_name, users)
    # Tests assigning and unassigning tags.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: high
    #         initialEstimate: 1/5h
    #     
    collection = appliance.rest_api.collections.getattr(collection_name)
    collection.reload()
    if is_bool(!collection.all)
      pytest.skip()
    end
    entity = collection[-1]
    tag = tags_mod[0]
    begin
      entity.tags.action.assign(tag)
    rescue NoMethodError
      msg = "Missing tag attribute in parametrized REST collection {} for entity: {}".format(collection_name, entity)
      logger.exception(msg)
      pytest.fail(msg)
    end
    assert_response(appliance)
    entity.reload()
    raise unless entity.tags.all.map{|t| t.id}.include?(tag.id)
    entity.tags.action.unassign(tag)
    assert_response(appliance)
    entity.reload()
    raise unless !entity.tags.all.map{|t| t.id}.include?(tag.id)
  end
  def test_bulk_assign_and_unassign_tag(appliance, tags_mod, services_mod, vm, collection_name, users)
    # Tests bulk assigning and unassigning tags.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: high
    #         initialEstimate: 1/5h
    #     
    collection = appliance.rest_api.collections.getattr(collection_name)
    collection.reload()
    entities = collection.all[-2..-1]
    new_tags = []
    for (index, tag) in enumerate(tags_mod)
      identifiers = [{"href" => tag._href}, {"id" => tag.id}]
      new_tags.push(identifiers[index % 2])
    end
    new_tags.push({"category" => "department", "name" => "finance"})
    new_tags.push({"name" => "/managed/department/presales"})
    tags_ids = 
    tags_ids.add((appliance.rest_api.collections.tags.get(name: "/managed/department/finance")).id)
    tags_ids.add((appliance.rest_api.collections.tags.get(name: "/managed/department/presales")).id)
    tags_count = new_tags.size * entities.size
    response = collection.action.assign_tags(*entities, tags: new_tags)
    assert_response(appliance, results_num: tags_count)
    results = appliance.rest_api.response.json()["results"]
    entities_hrefs = entities.map{|e| e.href}
    for result in results
      raise unless entities_hrefs.include?(result["href"])
    end
    for (index, entity) in enumerate(entities)
      entity.tags.reload()
      response[index].id = entity.id
      raise unless tags_ids.issubset()
    end
    collection.action.unassign_tags(*entities, tags: new_tags)
    assert_response(appliance, results_num: tags_count)
    for entity in entities
      entity.tags.reload()
      raise unless ( - tags_ids).size == entity.tags.subcount
    end
  end
  def test_bulk_assign_and_unassign_invalid_tag(appliance, services_mod, vm, collection_name, users)
    # Tests bulk assigning and unassigning invalid tags.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: high
    #         initialEstimate: 1/5h
    #     
    collection = appliance.rest_api.collections.getattr(collection_name)
    collection.reload()
    entities = collection.all[-2..-1]
    new_tags = ["invalid_tag1", "invalid_tag2"]
    tags_count = new_tags.size * entities.size
    tags_per_entities_count = []
    for entity in entities
      entity.tags.reload()
      tags_per_entities_count.push(entity.tags.subcount)
    end
    _check_tags_counts = lambda do
      for (index, entity) in enumerate(entities)
        entity.tags.reload()
        raise unless entity.tags.subcount == tags_per_entities_count[index]
      end
    end
    collection.action.assign_tags(*entities, tags: new_tags)
    assert_response(appliance, success: false, results_num: tags_count)
    _check_tags_counts.call()
    collection.action.unassign_tags(*entities, tags: new_tags)
    assert_response(appliance, success: false, results_num: tags_count)
    _check_tags_counts.call()
  end
  def test_query_by_multiple_tags(appliance, tags, services)
    # Tests support for multiple tag specification in query.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: high
    #         initialEstimate: 1/30h
    #     
    collection = appliance.rest_api.collections.services
    collection.reload()
    new_tags = tags.map{|tag| tag._ref_repr()}
    tagged_services = services[1..-1]
    collection.action.assign_tags(*tagged_services, tags: new_tags)
    assert_response(appliance)
    by_tag = tags.map{|tag| tag.name.gsub("/managed", "")}.join(",")
    query_results = collection.query_string(by_tag: by_tag)
    raise unless tagged_services.size == query_results.size
    result_ids = 
    tagged_ids = 
    raise unless result_ids == tagged_ids
  end
  def self.COLLECTIONS_BULK_TAGS; @@COLLECTIONS_BULK_TAGS; end
  def self.COLLECTIONS_BULK_TAGS=(val); @@COLLECTIONS_BULK_TAGS=val; end
  def COLLECTIONS_BULK_TAGS; @COLLECTIONS_BULK_TAGS = @@COLLECTIONS_BULK_TAGS if @COLLECTIONS_BULK_TAGS.nil?; @COLLECTIONS_BULK_TAGS; end
  def COLLECTIONS_BULK_TAGS=(val); @COLLECTIONS_BULK_TAGS=val; end
end
