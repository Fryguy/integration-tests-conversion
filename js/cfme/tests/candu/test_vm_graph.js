require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
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
    [VMwareProvider, RHEVMProvider, EC2Provider, AzureProvider],

    {
      selector: ONE_PER_TYPE,
      required_fields: [[["cap_and_util", "capandu_vm"], "cu-24x7"]]
    }
  ),

  pytest.mark.meta({blockers: [BZ(
    1671580,
    {unblock(provider) {return !provider.one_of(AzureProvider)}}
  )]})
];

const VM_GRAPHS = [
  "vm_cpu",
  "vm_cpu_state",
  "vm_memory",
  "vm_disk",
  "vm_network"
];

const INTERVAL = ["Hourly", "Daily"];

function test_vm_most_recent_hour_graph_screen(graph_type, provider, enable_candu) {
  //  Test VM graphs for most recent hour displayed or not
  // 
  //   prerequisites:
  //       * C&U enabled appliance
  // 
  //   Steps:
  //       * Navigate to VM (cu-24x7) Utilization Page
  //       * Check graph displayed or not
  //       * Check legends hide and display properly or not
  //       * Check data for legends collected or not
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  let collection = provider.appliance.provider_based_collection(provider);
  let vm = collection.instantiate("cu-24x7", provider);
  vm.wait_candu_data_available({timeout: 1200});
  let view = navigate_to(vm, "candu");
  view.options.interval.fill("Most Recent Hour");
  let graph = view.getattr(graph_type);
  if (!graph.is_displayed) throw new ();

  let refresh = () => {
    provider.browser.refresh();
    view = navigate_to(vm, "candu");
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

function test_vm_graph_screen(provider, interval, graph_type, enable_candu) {
  // Test VM graphs for hourly and Daily
  // 
  //   prerequisites:
  //       * C&U enabled appliance
  // 
  //   Steps:
  //       * Navigate to VM (cu-24x7) Utilization Page
  //       * Check graph displayed or not
  //       * Zoom graph
  //       * Compare data of Table and Graph
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  let collection = provider.appliance.provider_based_collection(provider);
  let vm = collection.instantiate("cu-24x7", provider);

  if (is_bool(!provider.one_of(CloudProvider))) {
    wait_for(vm.capture_historical_data, {
      delay: 20,
      timeout: 1000,
      message: "wait for capturing VM historical data"
    })
  };

  vm.wait_candu_data_available({timeout: 1200});
  let view = navigate_to(vm, "candu");
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
    view = navigate_to(vm, "candu");
    return view.options.interval.fill(interval)
  };

  wait_for(
    () => graph.all_legends.size > 0,
    {delay: 5, timeout: 600, fail_func: refresh}
  );

  graph.zoom_in();
  view = view.browser.create_view(UtilizationZoomView);
  if (!view.chart.is_displayed) throw new ();
  let graph_data = view.chart.all_data;
  view.table.clear_cache();
  let table_data = view.table.read();
  let legends = view.chart.all_legends;
  compare_data({table_data, graph_data, legends})
}
