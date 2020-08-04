require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/networks/views");
include(Cfme.Networks.Views);
require_relative("cfme/networks/views");
include(Cfme.Networks.Views);
require_relative("cfme/networks/views");
include(Cfme.Networks.Views);
require_relative("cfme/networks/views");
include(Cfme.Networks.Views);
require_relative("cfme/networks/views");
include(Cfme.Networks.Views);
require_relative("cfme/networks/views");
include(Cfme.Networks.Views);
require_relative("cfme/networks/views");
include(Cfme.Networks.Views);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider_modscope"),

  pytest.mark.provider(
    [AzureProvider],
    {selector: ONE_PER_CATEGORY, scope: "module"}
  ),

  test_requirements.tag
];

let network_collections = [
  "network_providers",
  "cloud_networks",
  "network_subnets",
  "network_ports",
  "network_security_groups",
  "network_routers",
  "network_floating_ips"
];

let network_test_items = [
  ["Cloud Networks", CloudNetworkView],
  ["Cloud Subnets", SubnetView],
  ["Network Routers", NetworkRouterView],
  ["Security Groups", SecurityGroupView],
  ["Floating IPs", FloatingIpView],
  ["Network Ports", NetworkPortView],
  ["Load Balancers", BalancerView]
];

function child_visibility(appliance, network_provider, relationship, view) {
  let network_provider_view = navigate_to(network_provider, "Details");

  if (network_provider_view.entities.relationships.get_text_of(relationship) == "0") {
    pytest.skip(`There are no relationships for ${relationship}`)
  };

  network_provider_view.entities.relationships.click_at(relationship);
  let relationship_view = appliance.browser.create_view(view);

  try {
    if (relationship != "Floating IPs") {
      if (!relationship_view.entities.entity_names) throw new ()
    } else if (!relationship_view.entities.entity_ids) {
      throw new ()
    };

    let actual_visibility = true
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof RuntimeError) {
      let actual_visibility = false
    } else {
      throw $EXCEPTION
    }
  };

  return actual_visibility
};

function test_tagvis_network_provider_children(provider, appliance, request, relationship, view, tag, user_restricted) {
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/8h
  //       casecomponent: Tagging
  //   
  let collection = appliance.collections.network_providers.filter({provider: provider});
  let network_provider = collection.all()[0];
  network_provider.add_tag({tag});
  request.addfinalizer(() => network_provider.remove_tag({tag}));

  let actual_visibility = child_visibility(
    appliance,
    network_provider,
    relationship,
    view
  );

  if (!actual_visibility) throw new ();

  user_restricted(() => {
    actual_visibility = child_visibility(
      appliance,
      network_provider,
      relationship,
      view
    );

    if (!!actual_visibility) throw new ()
  })
};

function entity(request, appliance) {
  let collection_name = request.param;
  let item_collection = appliance.collections.getattr(collection_name);
  let items = item_collection.all();

  if (is_bool(items)) {
    return items[0]
  } else {
    pytest.skip("No content found for test")
  }
};

function test_network_tagvis(check_item_visibility, entity, visibility) {
  //  Tests network provider and its items honors tag visibility
  //   Prerequisites:
  //       Catalog, tag, role, group and restricted user should be created
  // 
  //   Steps:
  //       1. As admin add tag
  //       2. Login as restricted user, item is visible for user
  //       3. As admin remove tag
  //       4. Login as restricted user, iten is not visible for user
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/4h
  //       casecomponent: Tagging
  //   
  check_item_visibility.call(entity, visibility)
}
