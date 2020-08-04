require_relative("cfme");
include(Cfme);
require_relative("cfme/common/candu_views");
include(Cfme.Common.Candu_views);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/tests/candu");
include(Cfme.Tests.Candu);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.c_and_u,
  pytest.mark.usefixtures("setup_provider"),

  pytest.mark.provider([VMwareProvider, RHEVMProvider], {
    selector: ONE_PER_TYPE,
    required_fields: [["cap_and_util", "cluster"]]
  })
];

const GRAPHS = [
  "cluster_cpu",
  "cluster_cpu_state",
  "cluster_memory",
  "cluster_disk",
  "cluster_network",
  "cluster_host",
  "cluster_vm"
];

const INTERVAL = ["Hourly", "Daily"];

function cluster(provider) {
  let collection = provider.appliance.collections.clusters;
  let cluster_name = provider.data.cap_and_util.cluster;
  return collection.instantiate({name: cluster_name, provider})
};

function host(appliance, provider) {
  let collection = appliance.collections.hosts;

  for (let test_host in provider.data.hosts) {
    if (is_bool(!test_host.get("test_fleece", false))) continue;
    return collection.instantiate({name: test_host.name, provider})
  }
};

function test_cluster_graph_screen(provider, cluster, host, graph_type, interval, enable_candu) {
  // Test Cluster graphs for Hourly and Daily Interval
  // 
  //   prerequisites:
  //       * C&U enabled appliance
  // 
  //   Steps:
  //       * Navigate to Cluster
  //       * Check graph displayed or not
  //       * Select interval Hourly/Daily
  //       * Zoom graph to get Table
  //       * Compare table and graph data
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       caseimportance: medium
  //       casecomponent: CandU
  //       initialEstimate: 1/4h
  //   
  host.capture_historical_data();
  cluster.wait_candu_data_available({timeout: 1200});
  let view = navigate_to(cluster, "Utilization");
  view.options.interval.fill(interval);

  try {
    let graph = view.getattr(graph_type)
  } catch (e) {
    if (e instanceof NoMethodError) {
      logger.error(e)
    } else {
      throw e
    }
  };

  if (!graph.is_displayed) throw new ();

  let refresh = () => {
    provider.browser.refresh();
    return view.options.interval.fill(interval)
  };

  wait_for(
    () => graph.all_legends.size > 0,
    {delay: 5, timeout: 200, fail_func: refresh}
  );

  let graph_zoom = ["cluster_host", "cluster_vm"];
  let avg_graph = (graph_zoom.include(graph_type) ? graph_type : `${graph_type}_vm_host_avg`);

  try {
    avg_graph = view.getattr(avg_graph)
  } catch (e) {
    if (e instanceof NoMethodError) {
      logger.error(e)
    } else {
      throw e
    }
  };

  avg_graph.zoom_in();
  view = view.browser.create_view(UtilizationZoomView);

  wait_for(
    () => view.chart.all_legends.size > 0,
    {delay: 5, timeout: 300, fail_func: refresh}
  );

  if (!view.chart.is_displayed) throw new ();
  view.flush_widget_cache();
  let legends = view.chart.all_legends;
  let graph_data = view.chart.all_data;
  view.table.clear_cache();
  let table_data = view.table.read();
  compare_data({table_data, graph_data, legends})
}
