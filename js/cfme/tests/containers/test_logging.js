require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/node");
include(Cfme.Containers.Node);
require_relative("cfme/containers/node");
include(Cfme.Containers.Node);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(1),

  pytest.mark.provider(
    [ContainersProvider],
    {required_flags: ["cmqe_logging"], scope: "function"}
  ),

  test_requirements.containers
];

const TEST_ITEMS = [
  ContainersTestItem(
    ContainersProvider,
    "test_logging_containerprovider",
    {collection_obj: null}
  ),

  ContainersTestItem(
    Node,
    "test_logging_node",
    {collection_obj: NodeCollection}
  )
];

const NUM_OF_DEFAULT_LOG_ROUTES = 2;

function kibana_logging_url(provider) {
  //  This fixture verifies the correct setup of the Kibana logging namespace and returns
  //   the Kibana logging router url 
  let ose_pods = provider.mgmt.list_pods();

  for (let pod in ose_pods) {
    if (pod.metadata.name.include("kibana")) {
      let logging_project = pod.metadata.namespace;
      break
    } else {
      continue
    }
  };

  let logging_pods = provider.mgmt.list_pods({namespace: logging_project});

  for (let logging_pod in logging_pods) {
    if (is_bool(logging_pod.status.container_statuses.map(status => (
      status.ready === true
    )).is_all)) {
      continue
    } else {
      pytest.skip("Logging pods are not in the 'Ready' state for provider {}".format(provider.name))
    }
  };

  let all_logging_routes = provider.mgmt.list_route({namespace: logging_project});

  if (all_logging_routes.size < NUM_OF_DEFAULT_LOG_ROUTES) {
    // pass
    pytest.skip(`Missing logging routes for ${provider.name}`)
  };

  let kibana_router = [];

  for (let route in all_logging_routes) {
    if (route.spec.host.include("kibana")) kibana_router.push(route.spec.host)
  };

  if (is_bool(!kibana_router)) {
    pytest.skip(`Could not determine Kibana Router for provider ${provider.name}`)
  };

  return kibana_router
};

function test_external_logging_activated(provider, appliance, test_item, kibana_logging_url) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let test_collection = (test_item.obj === ContainersProvider ? [provider] : test_item.collection_obj(appliance).all());

  for (let test_obj in test_collection) {
    if (is_bool(!test_obj.exists)) continue;
    let view = navigate_to(test_obj, "Details");

    if (!view.toolbar.monitoring.item_enabled("External Logging")) {
      throw "Monitoring --> External Logging not activated"
    };

    view.toolbar.monitoring.item_select("External Logging");
    let kibana_console = test_obj.vm_console;
    kibana_console.switch_to_console();
    if (!!view.is_displayed) throw new ();

    if (!kibana_logging_url.map(kb_url => (
      appliance.server.browser.url.include(kb_url)
    )).is_any) throw new ();

    kibana_console.close_console_window();
    if (!view.is_displayed) throw new ();
    view.flash.assert_no_error()
  }
}
