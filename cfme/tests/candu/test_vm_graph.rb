require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
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
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), test_requirements.c_and_u, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([VMwareProvider, RHEVMProvider, EC2Provider, AzureProvider], selector: ONE_PER_TYPE, required_fields: [[["cap_and_util", "capandu_vm"], "cu-24x7"]]), pytest.mark.meta(blockers: [BZ(1671580, unblock: lambda{|provider| !provider.one_of(AzureProvider)})])]
VM_GRAPHS = ["vm_cpu", "vm_cpu_state", "vm_memory", "vm_disk", "vm_network"]
INTERVAL = ["Hourly", "Daily"]
def test_vm_most_recent_hour_graph_screen(graph_type, provider, enable_candu)
  #  Test VM graphs for most recent hour displayed or not
  # 
  #   prerequisites:
  #       * C&U enabled appliance
  # 
  #   Steps:
  #       * Navigate to VM (cu-24x7) Utilization Page
  #       * Check graph displayed or not
  #       * Check legends hide and display properly or not
  #       * Check data for legends collected or not
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       casecomponent: CandU
  #   
  collection = provider.appliance.provider_based_collection(provider)
  vm = collection.instantiate("cu-24x7", provider)
  vm.wait_candu_data_available(timeout: 1200)
  view = navigate_to(vm, "candu")
  view.options.interval.fill("Most Recent Hour")
  graph = view.getattr(graph_type)
  raise unless graph.is_displayed
  refresh = lambda do
    provider.browser.refresh()
    view = navigate_to(vm, "candu")
    view.options.interval.fill("Most Recent Hour")
  end
  wait_for(lambda{|| graph.all_legends.size > 0}, delay: 5, timeout: 600, fail_func: refresh)
  graph_data = 0
  for leg in graph.all_legends
    graph.hide_legends(leg)
    raise unless !graph.legend_is_displayed(leg)
    graph.display_legends(leg)
    raise unless graph.legend_is_displayed(leg)
    for data in graph.data_for_legends(leg).values()
      graph_data += ((data[leg].gsub(",", "").gsub("%", "")).split()[0]).to_f
    end
  end
  raise unless graph_data > 0
end
def test_vm_graph_screen(provider, interval, graph_type, enable_candu)
  # Test VM graphs for hourly and Daily
  # 
  #   prerequisites:
  #       * C&U enabled appliance
  # 
  #   Steps:
  #       * Navigate to VM (cu-24x7) Utilization Page
  #       * Check graph displayed or not
  #       * Zoom graph
  #       * Compare data of Table and Graph
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       casecomponent: CandU
  #   
  collection = provider.appliance.provider_based_collection(provider)
  vm = collection.instantiate("cu-24x7", provider)
  if is_bool(!provider.one_of(CloudProvider))
    wait_for(vm.capture_historical_data, delay: 20, timeout: 1000, message: "wait for capturing VM historical data")
  end
  vm.wait_candu_data_available(timeout: 1200)
  view = navigate_to(vm, "candu")
  view.options.interval.fill(interval)
  begin
    graph = view.getattr(graph_type)
  rescue NoMethodError => e
    logger.error(e)
  end
  raise unless graph.is_displayed
  refresh = lambda do
    provider.browser.refresh()
    view = navigate_to(vm, "candu")
    view.options.interval.fill(interval)
  end
  wait_for(lambda{|| graph.all_legends.size > 0}, delay: 5, timeout: 600, fail_func: refresh)
  graph.zoom_in()
  view = view.browser.create_view(UtilizationZoomView)
  raise unless view.chart.is_displayed
  graph_data = view.chart.all_data
  view.table.clear_cache()
  table_data = view.table.read()
  legends = view.chart.all_legends
  compare_data(table_data: table_data, graph_data: graph_data, legends: legends)
end
