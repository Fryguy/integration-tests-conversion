require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);

let pytestmark = [
  test_requirements.tag,
  pytest.mark.tier(2),

  pytest.mark.provider({
    classes: [InfraProvider],
    required_fields: ["datacenters", "clusters"],
    selector: ONE
  }),

  pytest.mark.usefixtures("setup_provider")
];

let test_items = [
  ["clusters", null],
  ["infra_vms", "ProviderVms"],
  ["infra_templates", "ProviderTemplates"]
];

function testing_vis_object(request, provider, appliance) {
  //  Fixture creates class object for tag visibility test
  // 
  //   Returns: class object of certain type
  //   
  let [collection_name, destination] = request.param;
  let collection = appliance.collections.getattr(collection_name);

  let view = (is_bool(destination) ? navigate_to(provider, destination) : navigate_to(
    collection,
    "All"
  ));

  let names = view.entities.entity_names;
  if (is_bool(!names)) pytest.skip(`No content found for test of ${collection}`);
  return collection.instantiate({name: names[0], provider})
};

function group_tag_datacenter_combination(group_with_tag, provider) {
  update(group_with_tag, () => (
    group_with_tag.host_cluster = [
      [provider.data.name, provider.data.datacenters[0]],
      true
    ]
  ))
};

function test_tagvis_tag_datacenter_combination(testing_vis_object, group_tag_datacenter_combination, check_item_visibility, visibility) {
  //  Tests template visibility with combination  of tag and selected
  // 
  //       datacenter filters in the group
  //       Prerequisites:
  //           Catalog, tag, role, group and restricted user should be created
  // 
  //       Steps:
  //           1. As admin add tag
  //           2. Login as restricted user, item is visible for user
  //           3. As admin remove tag
  //           4. Login as restricted user, iten is not visible for user
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Tagging
  //       initialEstimate: 1/8h
  //   
  check_item_visibility.call(testing_vis_object, visibility)
}
