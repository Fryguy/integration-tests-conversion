# Runs Refresh Workload by adding specified providers, refreshing the providers, waiting, then
# repeating for specified length of time.
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
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
roles_refresh_providers = ["automate", "database_operations", "ems_inventory", "ems_operations", "event", "reporting", "scheduler", "smartstate", "user_interface", "web_services", "websocket"]
def test_refresh_providers(appliance, request, scenario)
  # 
  #   Refreshes providers then waits for a specific amount of time.
  #   Memory Monitor creates graphs and summary at the end of the scenario.
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Appliance
  #       initialEstimate: 1/4h
  #   
  from_ts = (time.time() * 1000).to_i
  logger.debug("Scenario: {}".format(scenario["name"]))
  appliance.clean_appliance()
  quantifiers = {}
  scenario_data = {"appliance_ip" => appliance.hostname, "appliance_name" => cfme_performance["appliance"]["appliance_name"], "test_dir" => "workload-refresh-providers", "test_name" => "Refresh Providers", "appliance_roles" => roles_refresh_providers.join(", "), "scenario" => scenario}
  monitor_thread = SmemMemoryMonitor(appliance.ssh_client(), scenario_data)
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
  appliance.update_server_roles(roles_refresh_providers.map{|role|[role, true]}.to_h)
  for prov in scenario["providers"]
    get_crud(prov).create_rest()
  end
  total_time = scenario["total_time"]
  starttime = time.time()
  time_between_refresh = scenario["time_between_refresh"]
  total_refreshed_providers = 0
  while time.time() - starttime < total_time
    start_refresh_time = time.time()
    appliance.rest_api.collections.providers.reload()
    for prov in appliance.rest_api.collections.providers.all
      prov.action.reload()
      total_refreshed_providers += 1
    end
    iteration_time = time.time()
    refresh_time = round(iteration_time - start_refresh_time, 2)
    elapsed_time = iteration_time - starttime
    logger.debug()
    logger.info(("Time elapsed: {}/{}").format(round(elapsed_time, 2), total_time))
    if refresh_time < time_between_refresh
      wait_diff = time_between_refresh - refresh_time
      time_remaining = total_time - elapsed_time
      if is_bool(time_remaining > 0 && time_remaining < time_between_refresh)
        time.sleep(time_remaining)
      else
        if time_remaining > 0
          time.sleep(wait_diff)
        end
      end
    else
      logger.warning("Time to Queue Refreshes ({}) exceeded time between ({})".format(refresh_time, time_between_refresh))
    end
  end
  quantifiers["Elapsed_Time"] = round(time.time() - starttime, 2)
  quantifiers["Queued_Provider_Refreshes"] = total_refreshed_providers
  logger.info("Test Ending...")
end
