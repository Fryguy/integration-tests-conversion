require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([ContainersProvider], scope: "function"), test_requirements.containers]
container_test_items = ["container_provider", "container_projects", "container_routes", "container_services", "container_replicators", "container_pods", "container_nodes", "container_volumes", "container_image_registries", "container_images", "container_templates"]
bz_1665284_test_items = ["container_provider", "container_projects"]
def get_collection_entity(appliance, collection_name, provider)
  # 
  #       Instantiating OpenShift Collection Object
  # 
  #       Args
  #           appliance: The appliance under test
  #           collection_name: The name of the collection object under test
  #           provider: The provider under test
  #       Returns:
  #           The instantiated collection object
  #   
  if ["container_provider"].include?(collection_name)
    return provider
  end
  item_collection = appliance.collections.getattr(collection_name)
  all_entities = item_collection.all()
  __dummy0__ = false
  for entity in all_entities
    if is_bool(entity.exists)
      selected_entity = entity
      break
    end
    if entity == all_entities[-1]
      __dummy0__ = true
    end
  end
  if __dummy0__
    pytest.skip("No content found for test")
  end
  for klass in [item_collection]
    d = {}
    for arg in ["name", "project_name", "host", "id", "provider"]
      if klass.ENTITY.__attrs_attrs__.map{|att| att.name}.include?(arg)
        d[arg] = selected_entity.getattr(arg, nil)
      end
    end
    return item_collection.instantiate(None: d)
  end
end
def verify_tags(obj_under_test, tag, details, dashboard)
  obj_under_test.add_tag(tag: tag, details: details, dashboard: dashboard)
  tags = obj_under_test.get_tags()
  raise "{tag_cat_name}: {tag_name} not in ({tags})".format(tag_cat_name: tag.category.display_name, tag_name: tag.display_name, tags: tags.to_s) unless tags.map{|object_tags| object_tags.category.display_name == tag.category.display_name && object_tags.display_name == tag.display_name}.is_any?
  obj_under_test.remove_tag(tag: tag, details: details)
  post_remove_tags = obj_under_test.get_tags()
  if is_bool(post_remove_tags)
    for post_tags in post_remove_tags
      raise unless post_tags.category.display_name != tag.category.display_name && post_tags.display_name != tag.display_name
    end
  end
end
def test_tag_container_objects(test_param, appliance, provider, tag, tag_place)
  #  Test for container items tagging action from list and details pages
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  obj_under_test = get_collection_entity(appliance: appliance, collection_name: test_param, provider: provider)
  verify_tags(obj_under_test: obj_under_test, tag: tag, details: tag_place, dashboard: false)
end
def test_tag_container_objects_dashboard_view(test_param, appliance, provider, tag)
  #  Test for BZ 1665284: Tagging: Unable to edit tag from container provider or container
  #   project dashboard view
  # 
  #      Polarion:
  #          assignee: juwatts
  #          casecomponent: Containers
  #          caseimportance: high
  #          initialEstimate: 1/6h
  #      
  obj_under_test = get_collection_entity(appliance: appliance, collection_name: test_param, provider: provider)
  verify_tags(obj_under_test: obj_under_test, tag: tag, details: false, dashboard: true)
end
