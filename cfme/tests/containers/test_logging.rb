require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/node'
include Cfme::Containers::Node
require_relative 'cfme/containers/node'
include Cfme::Containers::Node
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], required_flags: ["cmqe_logging"], scope: "function"), test_requirements.containers]
TEST_ITEMS = [ContainersTestItem(ContainersProvider, "test_logging_containerprovider", collection_obj: nil), ContainersTestItem(Node, "test_logging_node", collection_obj: NodeCollection)]
NUM_OF_DEFAULT_LOG_ROUTES = 2
def kibana_logging_url(provider)
  #  This fixture verifies the correct setup of the Kibana logging namespace and returns
  #   the Kibana logging router url 
  ose_pods = provider.mgmt.list_pods()
  for pod in ose_pods
    if pod.metadata.name.include?("kibana")
      logging_project = pod.metadata.namespace
      break
    else
      next
    end
  end
  logging_pods = provider.mgmt.list_pods(namespace: logging_project)
  for logging_pod in logging_pods
    if is_bool(logging_pod.status.container_statuses.map{|status| status.ready === true}.is_all?)
      next
    else
      pytest.skip("Logging pods are not in the 'Ready' state for provider {}".format(provider.name))
    end
  end
  all_logging_routes = provider.mgmt.list_route(namespace: logging_project)
  if all_logging_routes.size >= NUM_OF_DEFAULT_LOG_ROUTES
    # pass
  else
    pytest.skip()
  end
  kibana_router = []
  for route in all_logging_routes
    if route.spec.host.include?("kibana")
      kibana_router.push(route.spec.host)
    end
  end
  if is_bool(!kibana_router)
    pytest.skip()
  end
  return kibana_router
end
def test_external_logging_activated(provider, appliance, test_item, kibana_logging_url)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  test_collection = (test_item.obj === ContainersProvider) ? [provider] : test_item.collection_obj(appliance).all()
  for test_obj in test_collection
    if is_bool(!test_obj.exists)
      next
    end
    view = navigate_to(test_obj, "Details")
    raise "Monitoring --> External Logging not activated" unless view.toolbar.monitoring.item_enabled("External Logging")
    view.toolbar.monitoring.item_select("External Logging")
    kibana_console = test_obj.vm_console
    kibana_console.switch_to_console()
    raise unless !view.is_displayed
    raise unless kibana_logging_url.map{|kb_url| appliance.server.browser.url.include?(kb_url)}.is_any?
    kibana_console.close_console_window()
    raise unless view.is_displayed
    view.flash.assert_no_error()
  end
end
