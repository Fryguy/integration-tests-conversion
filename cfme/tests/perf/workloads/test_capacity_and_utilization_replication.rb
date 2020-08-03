# Runs Capacity and Utilization with Replication Workload.
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
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
require_relative 'cfme/utils/ssh'
include Cfme::Utils::Ssh
require_relative 'cfme/utils/ssh'
include Cfme::Utils::Ssh
require_relative 'cfme/utils/workloads'
include Cfme::Utils::Workloads
roles_cap_and_util_rep = ["automate", "database_operations", "database_synchronization", "ems_inventory", "ems_metrics_collector", "ems_metrics_coordinator", "ems_metrics_processor", "ems_operations", "event", "notifier", "reporting", "scheduler", "user_interface", "web_services"]
def test_workload_capacity_and_utilization_rep(appliance, request, scenario, setup_perf_provider)
  # Runs through provider based scenarios enabling C&U and replication, run for a set period of
  #   time. Memory Monitor creates graphs and summary at the end of each scenario.
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  #   
  from_ts = (time.time() * 1000).to_i
  ssh_client = appliance.ssh_client()
  ssh_master_args = {"hostname" => scenario["replication_master"]["ip_address"], "username" => scenario["replication_master"]["ssh"]["username"], "password" => scenario["replication_master"]["ssh"]["password"]}
  master_appliance = IPAppliance(hostname: scenario["replication_master"]["ip_address"], openshift_creds: ssh_master_args)
  ssh_client_master = SSHClient(None: ssh_master_args)
  logger.debug("Scenario: {}".format(scenario["name"]))
  is_pglogical = (scenario["replication"] == "pglogical") ? true : false
  appliance.set_pglogical_replication(replication_type: ":none")
  sshtail_evm = SSHTail("/var/www/miq/vmdb/log/evm.log")
  sshtail_evm.set_initial_file_end()
  logger.info()
  appliance.clean_appliance()
  logger.info()
  master_appliance.clean_appliance()
  if is_bool(is_pglogical)
    scenario_data = {"appliance_ip" => appliance.hostname, "appliance_name" => cfme_performance["appliance"]["appliance_name"], "test_dir" => "workload-cap-and-util-rep", "test_name" => "Capacity and Utilization Replication (pgLogical)", "appliance_roles" => roles_cap_and_util_rep.join(", "), "scenario" => scenario}
  else
    scenario_data = {"appliance_ip" => cfme_performance["appliance"]["ip_address"], "appliance_name" => cfme_performance["appliance"]["appliance_name"], "test_dir" => "workload-cap-and-util-rep", "test_name" => "Capacity and Utilization Replication (RubyRep)", "appliance_roles" => roles_cap_and_util_rep.join(", "), "scenario" => scenario}
  end
  quantifiers = {}
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
  appliance.wait_for_miq_server_workers_started(evm_tail: sshtail_evm, poll_interval: 2)
  appliance.update_server_roles(roles_cap_and_util_rep.map{|role|[role, true]}.to_h)
  for provider in scenario["providers"]
    get_crud(provider).create_rest()
  end
  logger.info("Sleeping for Refresh: {}s".format(scenario["refresh_sleep_time"]))
  time.sleep(scenario["refresh_sleep_time"])
  appliance.set_cap_and_util_all_via_rails()
  if is_bool(is_pglogical)
    appliance.set_pglogical_replication(replication_type: ":remote")
    master_appliance.set_pglogical_replication(replication_type: ":global")
    master_appliance.add_pglogical_replication_subscription(ssh_client_master, appliance.hostname)
  else
    appliance.set_rubyrep_replication(scenario["replication_master"]["ip_address"])
    appliance.update_server_roles(roles_cap_and_util_rep.map{|role|[role, true]}.to_h)
  end
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
  if is_bool(is_pglogical)
    appliance.set_pglogical_replication(replication_type: ":none")
  else
    appliance.update_server_roles(roles_cap_and_util_rep.map{|role|[role, true]}.to_h)
  end
  quantifiers["Elapsed_Time"] = round(elapsed_time, 2)
  logger.info("Test Ending...")
end
