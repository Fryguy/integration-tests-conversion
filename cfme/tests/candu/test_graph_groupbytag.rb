require_relative 'cfme'
include Cfme
require_relative 'cfme/common/candu_views'
include Cfme::Common::Candu_views
require_relative 'cfme/tests/candu'
include Cfme::Tests::Candu
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), test_requirements.c_and_u]
HOST_GRAPHS = ["host_cpu", "host_memory", "host_disk", "host_network", "host_cpu_state"]
INTERVAL = ["Hourly", "Daily"]
GROUP_BY = ["VM Location"]
CANDU_VM = "cu-24x7"
def host(temp_appliance_extended_db)
  vm = temp_appliance_extended_db.rest_api.collections.vms.get(name: CANDU_VM)
  vm_host = vm.host.name
  return temp_appliance_extended_db.collections.hosts.instantiate(name: vm_host)
end
def test_tagwise(candu_db_restore, interval, graph_type, gp_by, host)
  # Tests for grouping host graphs by VM tag for hourly and Daily intervals
  # 
  #   prerequisites:
  #       * DB from an appliance on which C&U is enabled
  #       * DB should have C&U data collection enabled for Tag category
  #       * DB should have a VM tagged with proper tag category
  # 
  #   Steps:
  #       * Navigate to Host Utilization Page
  #       * Select interval(Hourly or Daily)
  #       * Select group by option with VM tag
  #       * Check graph displayed or not
  #       * Zoom graph to get Table
  #       * Check tag assigned to VM available in chart legends
  #       * Compare table and graph data
  # 
  #   Bugzilla:
  #       1367560
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/4h
  #       casecomponent: CandU
  #   
  view = navigate_to(host, "candu")
  data = {"interval" => interval, "group_by" => gp_by}
  view.options.fill(data)
  begin
    graph = view.interval_type.getattr(graph_type)
  rescue NoMethodError
    pytest.fail()
  end
  raise unless graph.is_displayed
  graph.zoom_in()
  view = view.browser.create_view(UtilizationZoomView)
  view.flush_widget_cache()
  raise unless view.chart.is_displayed
  legends = view.chart.all_legends
  raise unless legends.include?("London")
  graph_data = view.chart.all_data
  view.table.clear_cache()
  table_data = view.table.read()
  compare_data_with_unit(table_data: table_data, graph_data: graph_data, legends: legends)
end
