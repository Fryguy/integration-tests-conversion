require_relative 'datetime'
include Datetime
require_relative 'datetime'
include Datetime
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), test_requirements.c_and_u, pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([VMwareProvider], scope: "module", required_fields: [[["cap_and_util", "capandu_vm"], "cu-24x7"]]), pytest.mark.meta(blockers: [BZ(1635126, forced_streams: ["5.10"])])]
ELEMENTS = ["vm", "host"]
GRAPH_TYPE = ["hourly", "daily"]
def order_data(appliance, provider, enable_candu)
  end_date = Datetime::now()
  start_date = end_date - timedelta(days: 2)
  view = navigate_to(appliance.server.zone, "CANDUGapCollection")
  view.candugapcollection.fill({"end_date" => end_date, "start_date" => start_date})
  view.candugapcollection.submit.click()
end
def test_gap_collection(appliance, provider, element, graph_type, order_data)
  #  Test gap collection data
  # 
  #   prerequisites:
  #       * C&U enabled appliance
  # 
  #   Steps:
  #       * Navigate to Configuration > Diagnostics > Zone Gap Collection Page
  #       * Order old data
  #       * Navigate to VM or Host Utilization page
  #       * Check for Hourly data
  #       * Check for Daily data
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: CandU
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  if element == "host"
    collection = appliance.collections.hosts
    for test_host in provider.data["hosts"]
      if is_bool(!test_host.get("test_fleece", false))
        next
      end
      element = collection.instantiate(name: test_host.name, provider: provider)
    end
  else
    if element == "vm"
      collection = appliance.provider_based_collection(provider)
      element = collection.instantiate("cu-24x7", provider)
    end
  end
  date = Datetime::now() - timedelta(days: 1)
  element.wait_candu_data_available(timeout: 1200)
  view = navigate_to(element, "candu")
  view.options.interval.fill(graph_type.capitalize())
  begin
    graph = view.getattr("vm_cpu")
  rescue NoMethodError
    graph = view.interval_type.getattr("host_cpu")
  end
  raise unless graph.is_displayed
  refresh = lambda do
    provider.browser.refresh()
    view = navigate_to(element, "candu")
    view.options.interval.fill(graph_type.capitalize())
  end
  wait_for(lambda{|| graph.all_legends.size > 0}, delay: 5, timeout: 600, fail_func: refresh)
  view.options.calendar.fill(date)
  graph_data = 0
  for leg in graph.all_legends
    graph.display_legends(leg)
    for data in graph.data_for_legends(leg).values()
      graph_data += ((data[leg].gsub(",", "").gsub("%", "")).split()[0]).to_f
    end
  end
  raise unless graph_data > 0
end
