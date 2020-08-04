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
require_relative 'cfme/utils/path'
include Cfme::Utils::Path
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider(gen_func: providers, filters: [ProviderFilter(classes: [ContainersProvider], required_flags: ["metrics_collection"])], scope: "function"), test_requirements.containers]
SET_METRICS_CAPTURE_THRESHOLD_IN_MINUTES = 5
WAIT_FOR_METRICS_CAPTURE_THRESHOLD_IN_MINUTES = "15m"
ROLLUP_METRICS_CALC_THRESHOLD_IN_MINUTES = "50m"
def reduce_metrics_collection_threshold(appliance)
  f_name = ("openshift/change_metrics_collection_threshold.rb".scripts_path.join).strpath
  appliance.ssh_client.put_file(f_name, "/var/www/miq/vmdb")
  appliance.ssh_client.run_rails_command("change_metrics_collection_threshold.rb {threshold}.minutes".format(threshold: SET_METRICS_CAPTURE_THRESHOLD_IN_MINUTES))
end
def enable_capacity_and_utilization(appliance)
  args = ["ems_metrics_coordinator", "ems_metrics_collector", "ems_metrics_processor"]
  logger.info("Enabling metrics collection roles")
  appliance.server.settings.enable_server_roles(*args)
  if is_bool(appliance.wait_for_server_roles(args, delay: 10, timeout: 300))
    yield
  else
    pytest.skip("Failed to set server roles on appliance #{appliance}")
  end
  logger.info("Disabling metrics collection roles")
  appliance.server.settings.disable_server_roles(*args)
end
def wait_for_metrics_rollup(provider)
  if is_bool(!provider.wait_for_collected_metrics(timeout: ROLLUP_METRICS_CALC_THRESHOLD_IN_MINUTES, table_name: "metric_rollups"))
    raise RuntimeError, "No metrics exist in rollup table for {timeout} minutes".format(timeout: ROLLUP_METRICS_CALC_THRESHOLD_IN_MINUTES)
  end
end
def test_basic_metrics(provider)
  #  Basic Metrics availability test
  #       This test checks that the Metrics service is up
  #       Curls the hawkular status page and checks if it's up
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  begin
    router = (provider.mgmt.list_route().select{|router| (router.metadata.name == "hawkular-metrics") || router.metadata.name == "prometheus"}.map{|router| router}).pop()
    metrics_url = router.status.ingress[0].host
  rescue NoMethodError
    pytest.skip("Could not determine metric route for #{provider.key}")
  end
  creds = provider.get_credentials_from_config(provider.key, cred_type: "token")
  header = {"Authorization" => "Bearer #{creds.token}"}
  response = requests.get("https://#{metrics_url}:443", headers: header, verify: false)
  raise "{metrics} failed to start!".format(metrics: router["metadata"]["name"]) unless response.ok
end
def test_validate_metrics_collection_db(provider, enable_capacity_and_utilization, reduce_metrics_collection_threshold)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  raise unless provider.wait_for_collected_metrics(timeout: WAIT_FOR_METRICS_CAPTURE_THRESHOLD_IN_MINUTES)
end
def test_validate_metrics_collection_provider_gui(appliance, provider, enable_capacity_and_utilization, reduce_metrics_collection_threshold, wait_for_metrics_rollup, soft_assert)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  view = navigate_to(provider, "Details")
  wait_for(lambda{|| view.toolbar.monitoring.item_enabled("Utilization")}, delay: 2, timeout: 600, fail_func: appliance.server.browser.refresh)
  utilization = navigate_to(provider, "Utilization")
  soft_assert.(utilization.cpu.all_data, "No cpu's metrics exist in the cpu utilization graph!")
  soft_assert.(utilization.memory.all_data, "No memory's metrics exist in the memory utilization graph!")
  soft_assert.(utilization.network.all_data, "No network's metrics exist in the network utilization graph!")
end
def test_flash_msg_not_contains_html_tags(provider)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  edit_view = navigate_to(provider, "Edit")
  metrics_view = provider.endpoints_form(edit_view).getattr("metrics")
  metrics_view.validate.click()
  flash_msg_text = edit_view.flash.read().join("/n")
  is_translated_to_html = false
  begin
    xmltodict.parse(flash_msg_text)
  rescue xmltodict.expat.ExpatError
    is_translated_to_html = true
  end
  raise "Flash massage contains HTML tags" unless is_translated_to_html
end
def test_typo_in_metrics_endpoint_type(provider)
  # 
  #   This test based on bz1538948
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  view = navigate_to(provider, "Details")
  endpoints_table = view.entities.summary("Endpoints")
  raise "Provider metrics endpoint name from yaml and UI do not match" unless provider.metrics_type.downcase() == endpoints_table.get_text_of("Metrics Type").downcase()
end
