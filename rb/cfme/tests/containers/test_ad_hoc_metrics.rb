require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider(gen_func: providers, filters: [ProviderFilter(classes: [ContainersProvider], required_flags: ["metrics_collection"])], scope: "function"), test_requirements.containers]
def metrics_up_and_running(provider)
  begin
    router = (provider.mgmt.list_route().select{|router| (router.metadata.name == "hawkular-metrics") || router.metadata.name == "prometheus"}.map{|router| router}).pop()
    metrics_url = router.status.ingress[0].host
  rescue NoMethodError
    pytest.skip("Could not determine metric route for #{provider.key}")
  end
  creds = provider.get_credentials_from_config(provider.key, cred_type: "token")
  header = {"Authorization" => "Bearer #{creds.token}"}
  response = requests.get("https://#{metrics_url}:443", headers: header, verify: false)
  raise "#{router.metadata.name} failed to start!" unless response.ok
  logger.info("#{router.metadata.name} started successfully")
end
def is_ad_hoc_greyed(provider_object)
  view = navigate_to(provider_object, "Details")
  return view.toolbar.monitoring.item_enabled("Ad hoc Metrics")
end
def test_ad_hoc_metrics_overview(provider, metrics_up_and_running)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  raise "Monitoring --> Ad hoc Metrics not activated despite provider was set" unless is_ad_hoc_greyed(provider)
end
def test_ad_hoc_metrics_select_filter(provider, metrics_up_and_running)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  view = navigate_to(provider, "AdHoc")
  view.wait_for_filter_option_to_load()
  view.set_filter(view.get_random_filter())
  view.apply_filter()
  view.wait_for_results_to_load()
  raise "No results found for #{view.selected_filter}" unless view.get_total_results_count() != 0
end
