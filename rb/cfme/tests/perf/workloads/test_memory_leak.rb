require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/grafana'
include Cfme::Utils::Grafana
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/smem_memory_monitor'
include Cfme::Utils::Smem_memory_monitor
require_relative 'cfme/utils/smem_memory_monitor'
include Cfme::Utils::Smem_memory_monitor
require_relative 'cfme/utils/workloads'
include Cfme::Utils::Workloads
roles_memory_leak = ["automate", "database_operations", "ems_inventory", "ems_metrics_collector", "ems_metrics_coordinator", "ems_metrics_processor", "ems_operations", "event", "notifier", "reporting", "scheduler", "user_interface", "web_services"]
pytestmark = [pytest.mark.provider(gen_func: providers, filters: [ProviderFilter()], scope: "module")]
def prepare_workers(appliance)
  # Set single instance of each worker type and maximum threshold
  view = navigate_to(appliance.server, "Workers")
  view.workers.fill({"generic_worker_count" => "1", "cu_data_collector_worker_count" => "1", "ui_worker_count" => "1", "reporting_worker_count" => "1", "web_service_worker_count" => "1", "priority_worker_count" => "1", "cu_data_processor_worker_count" => "1", "vm_analysis_collectors_worker_count" => "1", "websocket_worker_count" => "1", "generic_worker_threshold" => "1.5 GB", "cu_data_collector_worker_threshold" => "1.5 GB", "event_monitor_worker_threshold" => "10 GB", "connection_broker_worker_threshold" => "10 GB", "reporting_worker_threshold" => "1.5 GB", "web_service_worker_threshold" => "1.5 GB", "priority_worker_threshold" => "1.5 GB", "cu_data_processor_worker_threshold" => "1.5 GB", "refresh_worker_threshold" => "10 GB", "vm_analysis_collectors_worker_threshold" => "1.5 GB"})
  view.workers.save.click()
end
def test_workload_memory_leak(request, scenario, appliance, provider)
  # Runs through provider based scenarios setting one worker instance and maximum threshold and
  #   running for a set period of time. Memory Monitor creates graphs and summary info.
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  #   
  from_ts = (time.time() * 1000).to_i
  logger.debug("Scenario: {}".format(scenario["name"]))
  appliance.clean_appliance()
  quantifiers = {}
  scenario_data = {"appliance_ip" => appliance.hostname, "appliance_name" => conf.cfme_performance["appliance"]["appliance_name"], "test_dir" => "workload-memory-leak", "test_name" => "Memory Leak", "appliance_roles" => roles_memory_leak.join(","), "scenario" => scenario}
  monitor_thread = SmemMemoryMonitor(appliance.ssh_client, scenario_data)
  cleanup_workload = lambda do |scenario, from_ts, quantifiers, scenario_data|
    starttime = time.time()
    to_ts = (starttime * 1000).to_i
    g_urls = get_scenario_dashboard_urls(scenario, from_ts, to_ts)
    logger.debug("Started cleaning up monitoring thread.")
    monitor_thread.grafana_urls = g_urls
    monitor_thread.signal = false
    .monitor_thread.join
    add_workload_quantifiers(quantifiers, scenario_data)
    timediff = time.time() - starttime
    logger.info("Finished cleaning up monitoring thread in #{timediff}")
  end
  request.addfinalizer(lambda{|| cleanup_workload.call(scenario, from_ts, quantifiers, scenario_data)})
  monitor_thread.start()
  appliance.wait_for_miq_server_workers_started(poll_interval: 2)
  appliance.update_server_roles(roles_memory_leak.map{|role|[role, true]}.to_h)
  prepare_workers(appliance)
  provider.create()
  total_time = scenario["total_time"]
  starttime = time.time()
  elapsed_time = 0
  while elapsed_time < total_time
    elapsed_time = time.time() - starttime
    time_left = total_time - elapsed_time
    logger.info(("Time elapsed: {}/{}").format(round(elapsed_time, 2), total_time))
    if is_bool(time_left > 0 && time_left < 300)
      time.sleep(time_left)
    else
      if time_left > 0
        time.sleep(300)
      end
    end
  end
  quantifiers["Elapsed_Time"] = round(elapsed_time, 2)
  logger.info("Test Ending...")
end
