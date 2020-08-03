require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/common/candu_views'
include Cfme::Common::Candu_views
require_relative 'cfme/tests/candu'
include Cfme::Tests::Candu
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), test_requirements.c_and_u, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([AzureProvider, EC2Provider, GCEProvider], required_fields: [["cap_and_util", "capandu_azone"]])]
GRAPHS = ["azone_cpu", "azone_memory", "azone_disk", "azone_network", "azone_instance"]
INTERVAL = ["Hourly"]
def azone(appliance, provider)
  collection = appliance.collections.cloud_av_zones
  azone_name = provider.data["cap_and_util"]["capandu_azone"]
  return collection.instantiate(name: azone_name, provider: provider)
end
def test_azone_graph_screen(provider, azone, graph_type, interval, enable_candu)
  # Test Availibility zone graphs for Hourly
  # 
  #   prerequisites:
  #       * C&U enabled appliance
  # 
  #   Steps:
  #       * Navigate to Availibility Zone Utilization Page
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
  azone.wait_candu_data_available(timeout: 1200)
  view = navigate_to(azone, "Utilization")
  view.options.interval.fill(interval)
  begin
    graph = view.getattr(graph_type)
  rescue NoMethodError => e
    logger.error(e)
  end
  raise unless graph.is_displayed
  refresh = lambda do
    provider.browser.refresh()
    view.options.interval.fill(interval)
  end
  wait_for(lambda{|| graph.all_legends.size > 0}, delay: 5, timeout: 200, fail_func: refresh)
  avg_graph = (graph_type == "azone_instance") ? graph_type : 
  begin
    avg_graph = view.getattr(avg_graph)
  rescue NoMethodError => e
    logger.error(e)
  end
  avg_graph.zoom_in()
  view = view.browser.create_view(UtilizationZoomView)
  wait_for(lambda{|| view.chart.all_legends.size > 0}, delay: 5, timeout: 300, fail_func: refresh)
  raise unless view.chart.is_displayed
  view.flush_widget_cache()
  legends = view.chart.all_legends
  graph_data = view.chart.all_data
  view.table.clear_cache()
  table_data = view.table.read()
  compare_data(table_data: table_data, graph_data: graph_data, legends: legends)
end
