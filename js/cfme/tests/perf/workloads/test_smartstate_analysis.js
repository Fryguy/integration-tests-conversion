// Runs SmartState Analysis Workload.
require_relative("cfme/infrastructure");
include(Cfme.Infrastructure);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/grafana");
include(Cfme.Utils.Grafana);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/smem_memory_monitor");
include(Cfme.Utils.Smem_memory_monitor);
require_relative("cfme/utils/smem_memory_monitor");
include(Cfme.Utils.Smem_memory_monitor);
require_relative("cfme/utils/workloads");
include(Cfme.Utils.Workloads);

let roles_smartstate = [
  "automate",
  "database_operations",
  "ems_inventory",
  "ems_operations",
  "event",
  "notifier",
  "reporting",
  "scheduler",
  "smartproxy",
  "smartstate",
  "user_interface",
  "web_services"
];

function get_host_data_by_name(provider, host_name) {
  for (let host_obj in conf.cfme_data.get("management_systems", {})[provider.key].get(
    "hosts",
    []
  )) {
    if (host_name == host_obj.name) return host_obj
  };

  return null
};

function test_workload_smartstate_analysis(appliance, request, scenario) {
  // Runs through provider based scenarios initiating smart state analysis against VMs, Hosts,
  //   and Datastores
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: SmartState
  //       initialEstimate: 1/4h
  //   
  let from_ts = (time.time() * 1000).to_i;
  logger.debug("Scenario: {}".format(scenario.name));
  appliance.install_vddk();
  appliance.clean_appliance();
  let quantifiers = {};

  let scenario_data = {
    appliance_ip: appliance.hostname,
    appliance_name: cfme_performance.appliance.appliance_name,
    test_dir: "workload-ssa",
    test_name: "SmartState Analysis",
    appliance_roles: roles_smartstate.join(", "),
    scenario: scenario
  };

  let monitor_thread = SmemMemoryMonitor(
    appliance.ssh_client(),
    scenario_data
  );

  let cleanup_workload = (scenario, from_ts, quantifiers, scenario_data) => {
    let starttime = time.time();
    let to_ts = (starttime * 1000).to_i;
    let g_urls = get_scenario_dashboard_urls(scenario, from_ts, to_ts);
    logger.debug("Started cleaning up monitoring thread.");
    monitor_thread.grafana_urls = g_urls;
    monitor_thread.signal = false.monitor_thread.join;
    add_workload_quantifiers(quantifiers, scenario_data);
    let timediff = time.time() - starttime;
    return logger.info(`Finished cleaning up monitoring thread in ${timediff}`)
  };

  request.addfinalizer(() => (
    cleanup_workload.call(scenario, from_ts, quantifiers, scenario_data)
  ));

  monitor_thread.start();
  appliance.wait_for_miq_server_workers_started({poll_interval: 2});
  appliance.update_server_roles(roles_smartstate.map(role => [role, true]).to_h);

  for (let provider in scenario.providers) {
    get_crud(provider).create_rest()
  };

  logger.info("Sleeping for Refresh: {}s".format(scenario.refresh_sleep_time));
  time.sleep(scenario.refresh_sleep_time);

  for (let provider in scenario.providers) {
    for (let api_host in appliance.rest_api.collections.hosts.all) {
      let host_collection = appliance.collections.hosts;

      let test_host = host_collection.instantiate({
        name: api_host.name,
        provider
      });

      let host_data = get_host_data_by_name(
        get_crud(provider),
        api_host.name
      );

      let credentials = host.get_credentials_from_config(host_data.credentials);
      test_host.update_credentials_rest(credentials)
    };

    appliance.set_cfme_server_relationship(cfme_performance.appliance.appliance_name)
  };

  let total_time = scenario.total_time;
  let starttime = time.time();
  let time_between_analyses = scenario.time_between_analyses;
  let total_scanned_vms = 0;

  while (time.time() - starttime < total_time) {
    let start_ssa_time = time.time();

    for (let vm in scenario.vms_to_scan.values().to_a[0]) {
      let vm_api = appliance.rest_api.collections.vms.get({name: vm});
      vm_api.action.scan();
      total_scanned_vms++
    };

    let iteration_time = time.time();
    let ssa_time = round(iteration_time - start_ssa_time, 2);
    let elapsed_time = iteration_time - starttime;
    logger.debug(`Time to Queue SmartState Analyses: ${ssa_time}`);

    logger.info(("Time elapsed: {}/{}").format(
      round(elapsed_time, 2),
      total_time
    ));

    if (ssa_time < time_between_analyses) {
      let wait_diff = time_between_analyses - ssa_time;
      let time_remaining = total_time - elapsed_time;

      if (is_bool(time_remaining > 0 && time_remaining < time_between_analyses)) {
        time.sleep(time_remaining)
      } else if (time_remaining > 0) {
        time.sleep(wait_diff)
      }
    } else {
      logger.warning("Time to Queue SmartState Analyses ({}) exceeded time between ({})".format(
        ssa_time,
        time_between_analyses
      ))
    }
  };

  quantifiers.Elapsed_Time = round(time.time() - starttime, 2);
  quantifiers.Queued_VM_Scans = total_scanned_vms;
  logger.info("Test Ending...")
}
