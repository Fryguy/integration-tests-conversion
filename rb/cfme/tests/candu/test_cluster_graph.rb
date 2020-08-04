require_relative 'cfme'
include Cfme
require_relative 'cfme/common/candu_views'
include Cfme::Common::Candu_views
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/tests/candu'
include Cfme::Tests::Candu
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), test_requirements.c_and_u, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([VMwareProvider, RHEVMProvider], selector: ONE_PER_TYPE, required_fields: [["cap_and_util", "cluster"]])]
GRAPHS = ["cluster_cpu", "cluster_cpu_state", "cluster_memory", "cluster_disk", "cluster_network", "cluster_host", "cluster_vm"]
INTERVAL = ["Hourly", "Daily"]
def cluster(provider)
  collection = provider.appliance.collections.clusters
  cluster_name = provider.data["cap_and_util"]["cluster"]
  return collection.instantiate(name: cluster_name, provider: provider)
end
def host(appliance, provider)
  collection = appliance.collections.hosts
  for test_host in provider.data["hosts"]
    if is_bool(!test_host.get("test_fleece", false))
      next
    end
    return collection.instantiate(name: test_host.name, provider: provider)
  end
end
def test_cluster_graph_screen(provider, cluster, host, graph_type, interval, enable_candu)
  # Test Cluster graphs for Hourly and Daily Interval
  # 
  #   prerequisites:
  #       * C&U enabled appliance
  # 
  #   Steps:
  #       * Navigate to Cluster
  #       * Check graph displayed or not
  #       * Select interval Hourly/Daily
  #       * Zoom graph to get Table
  #       * Compare table and graph data
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       caseimportance: medium
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  #   
  host.capture_historical_data()
  cluster.wait_candu_data_available(timeout: 1200)
  view = navigate_to(cluster, "Utilization")
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
  graph_zoom = ["cluster_host", "cluster_vm"]
  avg_graph = (graph_zoom.include?(graph_type)) ? graph_type : "#{graph_type}_vm_host_avg"
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
