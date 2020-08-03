require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'wrapanapi/exceptions'
include Wrapanapi::Exceptions
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.provider([EC2Provider], scope: "function"), pytest.mark.usefixtures("setup_provider", "refresh_provider"), test_requirements.tag]
def map_tags(appliance, provider, request)
  tag = appliance.collections.map_tags.create(entity_type: partial_match(provider.name.title()), label: "test", category: "Testing")
  yield tag
  request.addfinalizer(lambda{|| tag.delete()})
end
def tagged_vm(provider)
  tag_vm = provider.data.cap_and_util.capandu_vm
  collection = provider.appliance.provider_based_collection(provider)
  begin
    return collection.instantiate(tag_vm, provider)
  rescue IndexError
    raise ItemNotFound, "VM for tag mapping not found!"
  end
end
def refresh_provider(provider)
  provider.refresh_provider_relationships(wait: 600)
  return true
end
def tag_mapping_items(request, appliance, provider)
  entity_type = request.param
  collection = appliance.collections.getattr()
  collection.filters = {"provider" => provider}
  view = navigate_to(collection, "AllForProvider")
  name = view.entities.get_first_entity().name
  begin
    mgmt_item = (entity_type == "images") ? provider.mgmt.get_template(name) : provider.mgmt.get_vm(name)
  rescue ImageNotFoundError
    msg = 
    logger.exception(msg)
    pytest.skip(msg)
  end
  return [collection.instantiate(name: name, provider: provider), mgmt_item, entity_type]
end
def tag_components()
  return [fauxfactory.gen_alphanumeric(15, start: "tag_label_"), fauxfactory.gen_alphanumeric(15, start: "tag_value_")]
end
def test_tag_mapping_azure_instances(tagged_vm, map_tags)
  # \"
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/12h
  #       testSteps:
  #           1. Find Instance that tagged with test:testing in Azure (cu-24x7)
  #           2. Create tag mapping for Azure instances
  #           3. Refresh Provider
  #           4. Go to Summary of the Instance and read Smart Management field
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Field value is \"My Company Tags Testing: testing\"
  #   
  tagged_vm.provider.refresh_provider_relationships()
  view = navigate_to(tagged_vm, "Details")
  my_company_tags = lambda do
    return view.tag.get_text_of("My Company Tags") != "No My Company Tags have been assigned"
  end
  wait_for(method(:my_company_tags), timeout: 600, delay: 45, fail_func: view.toolbar.reload.click)
  raise unless view.tag.get_text_of("My Company Tags")[0] == "Testing: testing"
end
def test_labels_update(provider, tag_mapping_items, soft_assert)
  # \" Test updates of tag labels on entity details
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/12h
  #       testSteps:
  #           1. Set a tag through provider mgmt interface
  #           2. Refresh Provider
  #           3. Go to entity details and get labels
  #           4. unset tag through provider mgmt interface
  #           5. Go to entity details and get labels
  #       expectedResults:
  #           1.
  #           2.
  #           3. labels includes label + tag
  #           4.
  #           5. labels should not include tag label
  #   
  entity,mgmt_entity,entity_type = tag_mapping_items
  tag_label,tag_value = tag_components()
  mgmt_entity.set_tag(tag_label, tag_value)
  provider.refresh_provider_relationships(method: "ui")
  view = navigate_to(entity, "Details")
  current_tag_value = view.entities.summary("Labels").get_text_of(tag_label)
  soft_assert.(current_tag_value == tag_value, ("Tag values is not that expected, actual - {}, expected - {}").format(current_tag_value, tag_value))
  mgmt_entity.unset_tag(tag_label, tag_value)
  provider.refresh_provider_relationships(method: "ui")
  view = navigate_to(entity, "Details", force: true)
  fields = view.entities.summary("Labels").fields
  soft_assert.(!fields.include?(tag_label), )
end
def test_mapping_tags(appliance, provider, tag_mapping_items, soft_assert, category, request)
  # Test mapping tags on provider instances and images
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/12h
  #       testSteps:
  #           1. Set a tag through provider mgmt interface
  #           2. create a CFME tag map for entity type
  #           3. Go to entity details and get smart management table
  #           4. Delete the tag map
  #           5. Go to entity details and get smart management table
  #       expectedResults:
  #           1.
  #           2.
  #           3. smart management should include category name and tag
  #           4.
  #           5. smart management table should NOT include category name and tag
  #   
  entity,mgmt_entity,entity_type = tag_mapping_items
  tag_label,tag_value = tag_components()
  mgmt_entity.set_tag(tag_label, tag_value)
  request.addfinalizer(lambda{|| mgmt_entity.unset_tag(tag_label, tag_value)})
  provider_type = provider.discover_name.split_p(" ")[0]
  view = navigate_to(appliance.collections.map_tags, "Add")
  select_text = nil
  options = []
  __dummy0__ = false
  for option in view.resource_entity.all_options
    option_text = option.text
    options.push(option_text)
    if is_bool(option_text.include?(provider_type) && (option_text.include?(entity_type.capitalize()[0...-1])))
      select_text = option_text
      break
    end
    if option == view.resource_entity.all_options[-1]
      __dummy0__ = true
    end
  end
  if __dummy0__
    if select_text === nil
      pytest.fail("Failed to match the entity type [{e}] and provider type [{p}] in options: [{o}]".format(e: entity_type, p: provider_type, o: options))
    end
  end
  view.cancel_button.click()
  map_tag = appliance.collections.map_tags.create(entity_type: select_text, label: tag_label, category: category.name)
  provider.refresh_provider_relationships(method: "ui")
  soft_assert.(entity.get_tags().map{|tag| tag.category.display_name == category.name && tag.display_name == tag_value}.is_any?, )
  map_tag.delete()
  provider.refresh_provider_relationships(method: "ui")
  soft_assert.(!entity.get_tags().include?())
end
def test_ec2_tags(provider, request, collection_type, testing_instance)
  # 
  #   Requirement: Have an ec2 provider
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       startsin: 5.8
  #       testSteps:
  #           1. Create an instance/choose image
  #           2. tag it with test:testing on EC side
  #           3. Refresh provider
  #           4. Go to summary of this instance/image and check whether there is
  #           test:testing in Labels field
  #           5. Delete that instance/untag image
  #   
  tag_key = 
  tag_value = 
  if collection_type == "templates"
    taggable = provider.mgmt.list_templates()[0]
    request.addfinalizer(lambda{|| taggable.unset_tag(tag_key, tag_value)})
  else
    taggable = testing_instance.mgmt
  end
  taggable.set_tag(tag_key, tag_value)
  provider.refresh_provider_relationships(wait: 600)
  collection = provider.appliance.provider_based_collection(provider, coll_type: collection_type)
  taggable_in_cfme = collection.instantiate(taggable.name, provider)
  view = navigate_to(taggable_in_cfme, "Details")
  raise unless view.entities.summary("Labels").get_text_of(tag_key) == tag_value
end
