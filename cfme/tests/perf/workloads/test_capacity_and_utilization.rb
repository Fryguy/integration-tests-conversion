# Runs Capacity and Utilization Workload.
require_relative 'cfme/utils'
include Cfme::Utils
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
roles_cap_and_util = ["automate", "database_operations", "ems_inventory", "ems_metrics_collector", "ems_metrics_coordinator", "ems_metrics_processor", "ems_operations", "event", "notifier", "reporting", "scheduler", "user_interface", "web_services"]
def test_workload_capacity_and_utilization(request, scenario, appliance)
  # Runs through provider based scenarios enabling C&U and running for a set period of time.
  #   Memory Monitor creates graphs and summary at the end of each scenario.
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
  scenario_data = {"appliance_ip" => appliance.hostname, "appliance_name" => conf.cfme_performance["appliance"]["appliance_name"], "test_dir" => "workload-cap-and-util", "test_name" => "Capacity and Utilization", "appliance_roles" => roles_cap_and_util.join(","), "scenario" => scenario}
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
    logger.info()
  end
  request.addfinalizer(lambda{|| cleanup_workload.call(scenario, from_ts, quantifiers, scenario_data)})
  monitor_thread.start()
  appliance.wait_for_miq_server_workers_started(poll_interval: 2)
  appliance.update_server_roles(roles_cap_and_util.map{|role|[role, true]}.to_h)
  for provider in scenario["providers"]
    get_crud(provider).create_rest()
  end
  logger.info("Sleeping for Refresh: {}s".format(scenario["refresh_sleep_time"]))
  time.sleep(scenario["refresh_sleep_time"])
  appliance.set_cap_and_util_all_via_rails()
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
