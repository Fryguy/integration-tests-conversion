require_relative 'cfme'
include Cfme
require_relative 'cfme/common/candu_views'
include Cfme::Common::Candu_views
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/tests/candu'
include Cfme::Tests::Candu
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), test_requirements.c_and_u, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([VMwareProvider, RHEVMProvider], required_fields: [[["cap_and_util", "capandu_vm"], "cu-24x7"]])]
DATASTORE_GRAPHS = ["datastore_used_disk_space", "datastore_hosts", "datastore_vms"]
INTERVAL = ["Hourly"]
def test_datastore_graph_screen(provider, interval, graph_type, enable_candu)
  # Test Datastore graphs for hourly
  # 
  #   prerequisites:
  #       * C&U enabled appliance
  # 
  #   Steps:
  #       * Navigate to Datastore Utilization Page
  #       * Check graph displayed or not
  #       * Select interval Hourly
  #       * Zoom graph to get Table
  #       * Compare table and graph data
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       caseimportance: medium
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  #   
  vm_collection = provider.appliance.provider_based_collection(provider)
  vm = vm_collection.instantiate("cu-24x7", provider)
  datastore = vm.datastore
  datastore.wait_candu_data_available(timeout: 1500)
  view = navigate_to(datastore, "Utilization")
  view.options.interval.fill(interval)
  begin
    graph = view.interval_type.getattr(graph_type)
  rescue NoMethodError => e
    logger.error(e)
  end
  raise unless graph.is_displayed
  refresh = lambda do
    provider.browser.refresh()
    view.options.interval.fill(interval)
  end
  wait_for(lambda{|| bool(graph.all_legends)}, delay: 5, timeout: 200, fail_func: refresh)
  graph.zoom_in()
  view = view.browser.create_view(UtilizationZoomView)
  raise unless view.chart.is_displayed
  view.flush_widget_cache()
  legends = view.chart.all_legends
  graph_data = view.chart.all_data
  view.table.clear_cache()
  table_data = view.table.read()
  compare_data(table_data: table_data, graph_data: graph_data, legends: legends)
end
