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
    required_fields: [[["cap_and_util", "capandu_vm"], "cu-24x7"]]
  })
];

const HOST_RECENT_HR_GRAPHS = [
  "host_cpu",
  "host_memory",
  "host_disk",
  "host_network"
];

const HOST_GRAPHS = [
  "host_cpu",
  "host_memory",
  "host_disk",
  "host_network",
  "host_cpu_state"
];

const INTERVAL = ["Hourly", "Daily"];
const GROUP_BY = ["VM Location"];

function host(appliance, provider) {
  let collection = appliance.collections.hosts;

  for (let test_host in provider.data.hosts) {
    if (is_bool(!test_host.get("test_fleece", false))) continue;
    return collection.instantiate({name: test_host.name, provider})
  }
};

function test_host_most_recent_hour_graph_screen(graph_type, provider, host, enable_candu) {
  //  Test Host graphs for most recent hour displayed or not
  // 
  //   prerequisites:
  //       * C&U enabled appliance
  // 
  //   Steps:
  //       * Navigate to Host Utilization Page
  //       * Check graph displayed or not
  //       * Check legends hide and display properly or not
  //       * Check data for legends collected or not
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  host.wait_candu_data_available({timeout: 1200});
  let view = navigate_to(host, "candu");
  view.options.interval.fill("Most Recent Hour");
  let graph = view.interval_type.getattr(graph_type);
  if (!graph.is_displayed) throw new ();

  let refresh = () => {
    provider.browser.refresh();
    return view.options.interval.fill("Most Recent Hour")
  };

  wait_for(
    () => graph.all_legends.size > 0,
    {delay: 5, timeout: 600, fail_func: refresh}
  );

  let graph_data = 0;

  for (let leg in graph.all_legends) {
    graph.hide_legends(leg);
    if (!!graph.legend_is_displayed(leg)) throw new ();
    graph.display_legends(leg);
    if (!graph.legend_is_displayed(leg)) throw new ();

    for (let data in graph.data_for_legends(leg).values()) {
      graph_data += ((data[leg].gsub(",", "").gsub("%", "")).split()[0]).to_f
    }
  };

  if (graph_data <= 0) throw new ()
};

function test_host_graph_screen(provider, interval, graph_type, host, enable_candu) {
  // Test Host graphs for hourly and Daily
  // 
  //   prerequisites:
  //       * C&U enabled appliance
  // 
  //   Steps:
  //       * Navigate to Host Utilization Page
  //       * Check graph displayed or not
  //       * Select interval(Hourly or Daily)
  //       * Zoom graph to get Table
  //       * Compare table and graph data
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  wait_for(host.capture_historical_data, {
    delay: 20,
    timeout: 1000,
    message: "wait for capturing host historical data"
  });

  host.wait_candu_data_available({timeout: 1200});
  let view = navigate_to(host, "candu");
  view.options.interval.fill(interval);

  try {
    let graph = view.interval_type.getattr(graph_type)
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

  try {
    let vm_avg_graph = view.interval_type.getattr(`${graph_type}_vm_avg`)
  } catch (e) {
    if (e instanceof NoMethodError) {
      logger.error(e)
    } else {
      throw e
    }
  };

  vm_avg_graph.zoom_in();
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
