require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/cloud/provider/gce");
include(Cfme.Cloud.Provider.Gce);
require_relative("cfme/common/candu_views");
include(Cfme.Common.Candu_views);
require_relative("cfme/tests/candu");
include(Cfme.Tests.Candu);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.c_and_u,
  pytest.mark.usefixtures("setup_provider"),

  pytest.mark.provider(
    [AzureProvider, EC2Provider, GCEProvider],
    {required_fields: [["cap_and_util", "capandu_azone"]]}
  )
];

const GRAPHS = [
  "azone_cpu",
  "azone_memory",
  "azone_disk",
  "azone_network",
  "azone_instance"
];

const INTERVAL = ["Hourly"];

function azone(appliance, provider) {
  let collection = appliance.collections.cloud_av_zones;
  let azone_name = provider.data.cap_and_util.capandu_azone;
  return collection.instantiate({name: azone_name, provider})
};

function test_azone_graph_screen(provider, azone, graph_type, interval, enable_candu) {
  // Test Availibility zone graphs for Hourly
  // 
  //   prerequisites:
  //       * C&U enabled appliance
  // 
  //   Steps:
  //       * Navigate to Availibility Zone Utilization Page
  //       * Check graph displayed or not
  //       * Select interval Hourly
  //       * Zoom graph to get Table
  //       * Compare table and graph data
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       caseimportance: medium
  //       casecomponent: CandU
  //       initialEstimate: 1/4h
  //   
  azone.wait_candu_data_available({timeout: 1200});
  let view = navigate_to(azone, "Utilization");
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

  let avg_graph = (graph_type == "azone_instance" ? graph_type : `${graph_type}_avg`);

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
