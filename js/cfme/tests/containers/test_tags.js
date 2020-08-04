require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

let container_test_items = [
  "container_provider",
  "container_projects",
  "container_routes",
  "container_services",
  "container_replicators",
  "container_pods",
  "container_nodes",
  "container_volumes",
  "container_image_registries",
  "container_images",
  "container_templates"
];

let bz_1665284_test_items = [
  "container_provider",
  "container_projects"
];

function get_collection_entity(appliance, collection_name, provider) {
  // 
  //       Instantiating OpenShift Collection Object
  // 
  //       Args
  //           appliance: The appliance under test
  //           collection_name: The name of the collection object under test
  //           provider: The provider under test
  //       Returns:
  //           The instantiated collection object
  //   
  if (["container_provider"].include(collection_name)) return provider;
  let item_collection = appliance.collections.getattr(collection_name);
  let all_entities = item_collection.all();
  let __dummy0__ = false;

  for (let entity in all_entities) {
    if (is_bool(entity.exists)) {
      let selected_entity = entity;
      break
    };

    if (entity == all_entities[-1]) __dummy0__ = true
  };

  if (__dummy0__) pytest.skip("No content found for test");

  for (let klass in [item_collection]) {
    let d = {};

    for (let arg in ["name", "project_name", "host", "id", "provider"]) {
      if (klass.ENTITY.__attrs_attrs__.map(att => att.name).include(arg)) {
        d[arg] = selected_entity.getattr(arg, null)
      }
    };

    return item_collection.instantiate({None: d})
  }
};

function verify_tags(obj_under_test, tag, details, dashboard) {
  obj_under_test.add_tag({tag, details, dashboard});
  let tags = obj_under_test.get_tags();

  if (!tags.map(object_tags => (
    object_tags.category.display_name == tag.category.display_name && object_tags.display_name == tag.display_name
  )).is_any) {
    throw "{tag_cat_name}: {tag_name} not in ({tags})".format({
      tag_cat_name: tag.category.display_name,
      tag_name: tag.display_name,
      tags: tags.to_s
    })
  };

  obj_under_test.remove_tag({tag, details});
  let post_remove_tags = obj_under_test.get_tags();

  if (is_bool(post_remove_tags)) {
    for (let post_tags in post_remove_tags) {
      if (post_tags.category.display_name == tag.category.display_name || post_tags.display_name == tag.display_name) {
        throw new ()
      }
    }
  }
};

function test_tag_container_objects(test_param, appliance, provider, tag, tag_place) {
  //  Test for container items tagging action from list and details pages
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let obj_under_test = get_collection_entity({
    appliance,
    collection_name: test_param,
    provider
  });

  verify_tags({
    obj_under_test,
    tag,
    details: tag_place,
    dashboard: false
  })
};

function test_tag_container_objects_dashboard_view(test_param, appliance, provider, tag) {
  //  Test for BZ 1665284: Tagging: Unable to edit tag from container provider or container
  //   project dashboard view
  // 
  //      Polarion:
  //          assignee: juwatts
  //          casecomponent: Containers
  //          caseimportance: high
  //          initialEstimate: 1/6h
  //      
  let obj_under_test = get_collection_entity({
    appliance,
    collection_name: test_param,
    provider
  });

  verify_tags({obj_under_test, tag, details: false, dashboard: true})
}
