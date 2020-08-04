require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [pytest.mark.rhel_testing];
const BASE_PATH = ["*"];
const QUEUE_WORKER_PATH = ["queue_worker_base", "*"];
const QUEUE_WORKER_DEFAULTS_PATH = QUEUE_WORKER_PATH + ["defaults"];
const Worker = namedtuple("Worker", "dropdown id advanced path");

const WORKERS = [
  Worker.call(
    "generic_worker_threshold",
    "generic",
    "generic_worker",
    QUEUE_WORKER_PATH
  ),

  Worker.call(
    "cu_data_collector_worker_threshold",
    "cu_data_coll",
    "ems_metrics_collector_worker",
    QUEUE_WORKER_DEFAULTS_PATH
  ),

  Worker.call(
    "event_monitor_worker_threshold",
    "event_monitor",
    "event_catcher",
    BASE_PATH
  ),

  Worker.call(
    "connection_broker_worker_threshold",
    "conn_broker",
    "vim_broker_worker",
    BASE_PATH
  ),

  Worker.call(
    "reporting_worker_threshold",
    "reporting",
    "reporting_worker",
    QUEUE_WORKER_PATH
  ),

  Worker.call(
    "web_service_worker_threshold",
    "web_service",
    "web_service_worker",
    BASE_PATH
  ),

  Worker.call(
    "priority_worker_threshold",
    "priority",
    "priority_worker",
    QUEUE_WORKER_PATH
  ),

  Worker.call(
    "cu_data_processor_worker_threshold",
    "cu_data_proc",
    "ems_metrics_processor_worker",
    QUEUE_WORKER_PATH
  ),

  Worker.call(
    "refresh_worker_threshold",
    "refresh",
    "ems_refresh_worker",
    QUEUE_WORKER_DEFAULTS_PATH
  ),

  Worker.call(
    "vm_analysis_collectors_worker_threshold",
    "vm_analysis",
    "smart_proxy_worker",
    QUEUE_WORKER_PATH
  )
];

function test_restart_workers(appliance) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //       casecomponent: Configuration
  //   
  let worker = appliance.collections.diagnostic_workers.instantiate({name: "Generic Worker"});
  let pids = worker.reload_worker();

  wait_for(worker.check_workers_finished, {
    func_args: [pids],
    fail_func: worker.parent.reload_workers_page,
    num_sec: 1800,
    delay: 10,
    message: "Wait for all original workers to be stopped"
  });

  wait_for(() => pids.size == worker.get_all_worker_pids().size, {
    fail_func: worker.parent.reload_workers_page,
    num_sec: 1800,
    delay: 10,
    message: "Wait for all original workers to be running"
  })
};

function set_memory_threshold_in_ui(appliance, worker, new_threshold) {
  let view = navigate_to(appliance.server, "Workers");
  view.browser.refresh();
  let mem_threshold = view.workers.getattr(worker.dropdown);

  mem_threshold.select_by_visible_text(new_threshold.gsub(
    ".gigabytes",
    " GB"
  ));

  view.workers.save.click();
  return new_threshold
};

function get_memory_threshold_in_advanced_settings(appliance, worker) {
  let worker_base = appliance.server.advanced_settings;
  let loc = worker_base;

  let steps = ["workers", "worker_base"] + (worker.path.map(step => (
    (step != "*" ? step : worker.advanced)
  )));

  for (let step in steps) {
    worker_base = loc;
    loc = loc.get(step)
  };

  return loc.get(
    "memory_threshold",
    worker_base.defaults.memory_threshold
  )
};

function set_memory_threshold_in_advanced_settings(appliance, worker, new_threshold) {
  let steps = ["workers", "worker_base"] + (worker.path.map(step => (
    (step != "*" ? step : worker.advanced)
  )));

  let patch = {memory_threshold: new_threshold};

  for (let step in steps[_.range(0, 0)].each_slice(-1).map(item => item.first)) {
    patch = {step: patch}
  };

  appliance.server.update_advanced_settings(patch);
  return new_threshold
};

function test_set_memory_threshold(appliance, worker, request, set_memory_threshold) {
  // 
  //   Bugzilla:
  //       1656873
  //       1715633
  //       1787350
  //       1799443
  //       1805845
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //   
  "memory threshold have changed incorrectly in advanced settings";
  if (mem_threshold_real != `${change_val}.gigabytes`) throw MESSAGE
}
