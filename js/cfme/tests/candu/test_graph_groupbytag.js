require_relative("cfme");
include(Cfme);
require_relative("cfme/common/candu_views");
include(Cfme.Common.Candu_views);
require_relative("cfme/tests/candu");
include(Cfme.Tests.Candu);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [pytest.mark.tier(3), test_requirements.c_and_u];

const HOST_GRAPHS = [
  "host_cpu",
  "host_memory",
  "host_disk",
  "host_network",
  "host_cpu_state"
];

const INTERVAL = ["Hourly", "Daily"];
const GROUP_BY = ["VM Location"];
const CANDU_VM = "cu-24x7";

function host(temp_appliance_extended_db) {
  let vm = temp_appliance_extended_db.rest_api.collections.vms.get({name: CANDU_VM});
  let vm_host = vm.host.name;
  return temp_appliance_extended_db.collections.hosts.instantiate({name: vm_host})
};

function test_tagwise(candu_db_restore, interval, graph_type, gp_by, host) {
  // Tests for grouping host graphs by VM tag for hourly and Daily intervals
  // 
  //   prerequisites:
  //       * DB from an appliance on which C&U is enabled
  //       * DB should have C&U data collection enabled for Tag category
  //       * DB should have a VM tagged with proper tag category
  // 
  //   Steps:
  //       * Navigate to Host Utilization Page
  //       * Select interval(Hourly or Daily)
  //       * Select group by option with VM tag
  //       * Check graph displayed or not
  //       * Zoom graph to get Table
  //       * Check tag assigned to VM available in chart legends
  //       * Compare table and graph data
  // 
  //   Bugzilla:
  //       1367560
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  let view = navigate_to(host, "candu");
  let data = {interval: interval, group_by: gp_by};
  view.options.fill(data);

  try {
    let graph = view.interval_type.getattr(graph_type)
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NoMethodError) {
      pytest.fail(`${graph_type} graph was not displayed`)
    } else {
      throw $EXCEPTION
    }
  };

  if (!graph.is_displayed) throw new ();
  graph.zoom_in();
  view = view.browser.create_view(UtilizationZoomView);
  view.flush_widget_cache();
  if (!view.chart.is_displayed) throw new ();
  let legends = view.chart.all_legends;
  if (!legends.include("London")) throw new ();
  let graph_data = view.chart.all_data;
  view.table.clear_cache();
  let table_data = view.table.read();
  compare_data_with_unit({table_data, graph_data, legends})
}
