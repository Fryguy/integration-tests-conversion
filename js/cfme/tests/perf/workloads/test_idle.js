// Runs Idle Workload by resetting appliance and enabling specific roles with no providers.
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/grafana");
include(Cfme.Utils.Grafana);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/smem_memory_monitor");
include(Cfme.Utils.Smem_memory_monitor);
require_relative("cfme/utils/smem_memory_monitor");
include(Cfme.Utils.Smem_memory_monitor);
require_relative("cfme/utils/workloads");
include(Cfme.Utils.Workloads);

function pytest_generate_tests(metafunc) {
  let argvalues = get_idle_scenarios().map(scenario => [scenario]);
  let idlist = get_idle_scenarios().map(scenario => scenario.name);
  metafunc.parametrize(["scenario"], argvalues, {ids: idlist})
};

function test_idle(appliance, request, scenario) {
  // Runs an appliance at idle with specific roles turned on for specific amount of time. Memory
  //   Monitor creates graphs and summary at the end of the scenario.
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: CandU
  //       initialEstimate: 1/4h
  //   
  let from_ts = (time.time() * 1000).to_i;
  logger.debug("Scenario: {}".format(scenario.name));
  appliance.clean_appliance();
  let quantifiers = {};

  let scenario_data = {
    appliance_ip: appliance.hostname,
    appliance_name: cfme_performance.appliance.appliance_name,
    test_dir: "workload-idle",
    test_name: "Idle with {} Roles".format(scenario.name),
    appliance_roles: scenario.roles.join(", "),
    scenario: scenario
  };

  let monitor_thread = SmemMemoryMonitor(
    appliance.ssh_client(),
    scenario_data
  );

  let cleanup_workload = (from_ts, quantifiers, scenario_data) => {
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
    cleanup_workload.call(from_ts, quantifiers, scenario_data)
  ));

  monitor_thread.start();
  appliance.wait_for_miq_server_workers_started({poll_interval: 2});
  appliance.update_server_roles(scenario.roles.map(role => [role, true]).to_h);
  let s_time = scenario.total_time;
  logger.info(`Idling appliance for ${s_time}s`);
  time.sleep(s_time);
  quantifiers.Elapsed_Time = s_time;
  logger.info("Test Ending...")
}
