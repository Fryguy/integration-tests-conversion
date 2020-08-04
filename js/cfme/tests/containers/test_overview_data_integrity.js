require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/container");
include(Cfme.Containers.Container);
require_relative("cfme/containers/image_registry");
include(Cfme.Containers.Image_registry);
require_relative("cfme/containers/node");
include(Cfme.Containers.Node);
require_relative("cfme/containers/overview");
include(Cfme.Containers.Overview);
require_relative("cfme/containers/pod");
include(Cfme.Containers.Pod);
require_relative("cfme/containers/project");
include(Cfme.Containers.Project);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/containers/route");
include(Cfme.Containers.Route);
require_relative("cfme/containers/service");
include(Cfme.Containers.Service);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(1),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

const DataSet = namedtuple("DataSet", ["object", "name"]);

let tested_objects = [
  ImageRegistry,
  Container,
  Project,
  Pod,
  Service,
  Route,
  ContainersProvider,
  Node
];

function get_api_object_counts(appliance) {
  let out = {
    ContainersProvider: 0,
    Container: 0,
    ImageRegistry: 0,
    Node: 0,
    Pod: 0,
    Service: 0,
    Project: 0,
    Route: 0
  };

  for (let provider in appliance.managed_known_providers) {
    if (is_bool(provider.is_a(ContainersProvider))) {
      out[ContainersProvider]++;
      out[Node] += provider.mgmt.list_node().size;
      out[Pod] += provider.mgmt.list_pods().size;
      out[Service] += provider.mgmt.list_service().size;
      out[Project] += provider.mgmt.list_project().size;
      out[Route] += provider.mgmt.list_route().size;
      out[ImageRegistry] += provider.mgmt.list_image_registry().size;
      let listed_containers = provider.mgmt.list_container();
      out[Container] += listed_containers.map(pod => 1).sum
    }
  };

  return out
};

function test_containers_overview_data_integrity(appliance, soft_assert) {
  // Test data integrity of status boxes in containers dashboard.
  //   Steps:
  //       * Go to Containers / Overview
  //       * All cells should contain the correct relevant information
  //           # of nodes
  //           # of providers
  //           # ...
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(ContainersOverview, "All");
  let api_values = get_api_object_counts(appliance);

  for (let cls in tested_objects) {
    let statusbox_value = (view.status_cards(cls.PLURAL.split_p(" ")[-1])).value;

    soft_assert.call(
      api_values[cls] == statusbox_value,

      "There is a mismatch between API and UI values: {}: {} (API) != {} (UI)".format(
        cls.__name__,
        api_values[cls],
        statusbox_value
      )
    )
  }
};

// 
//   Test data integrity of node utilization graphs on the containers dashboard.
// 
//   Note: There is no clear way to verify this bug. Steps below are what are believed to be
//   sufficient verification
// 
//   Bugzilla:
//       1650351
//       1663520
// 
//   Polarion:
//       assignee: juwatts
//       caseimportance: high
//       casecomponent: Containers
//       initialEstimate: 1/2h
//       setup:
//           1. In the advanced settings, set the key hawkular_force_legacy to false for 5.10
//           2. Enable metric collection permissions on the appliance
//       testSteps:
//           1. Add an Openshift provider that has cluster metrics enabled
//           2. Compare the real time metrics on the OpenShift nodes (\"oc adm top nodes\")
//            with the averages displayed on the CFME dashboard and overview pages.
//       expectedResults:
//           1.
//           2. Verify the metrics on the appliance are within 5% of the real time metrics.
//   
// pass
function test_container_overview_data_integrity_node_utilization() {}
