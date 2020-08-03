require 'None'
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.rhel_testing]
BASE_PATH = ["*"]
QUEUE_WORKER_PATH = ["queue_worker_base", "*"]
QUEUE_WORKER_DEFAULTS_PATH = QUEUE_WORKER_PATH + ["defaults"]
Worker = namedtuple("Worker", "dropdown id advanced path")
WORKERS = [Worker.("generic_worker_threshold", "generic", "generic_worker", QUEUE_WORKER_PATH), Worker.("cu_data_collector_worker_threshold", "cu_data_coll", "ems_metrics_collector_worker", QUEUE_WORKER_DEFAULTS_PATH), Worker.("event_monitor_worker_threshold", "event_monitor", "event_catcher", BASE_PATH), Worker.("connection_broker_worker_threshold", "conn_broker", "vim_broker_worker", BASE_PATH), Worker.("reporting_worker_threshold", "reporting", "reporting_worker", QUEUE_WORKER_PATH), Worker.("web_service_worker_threshold", "web_service", "web_service_worker", BASE_PATH), Worker.("priority_worker_threshold", "priority", "priority_worker", QUEUE_WORKER_PATH), Worker.("cu_data_processor_worker_threshold", "cu_data_proc", "ems_metrics_processor_worker", QUEUE_WORKER_PATH), Worker.("refresh_worker_threshold", "refresh", "ems_refresh_worker", QUEUE_WORKER_DEFAULTS_PATH), Worker.("vm_analysis_collectors_worker_threshold", "vm_analysis", "smart_proxy_worker", QUEUE_WORKER_PATH)]
def test_restart_workers(appliance)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #       casecomponent: Configuration
  #   
  worker = appliance.collections.diagnostic_workers.instantiate(name: "Generic Worker")
  pids = worker.reload_worker()
  wait_for(worker.check_workers_finished, func_args: [pids], fail_func: worker.parent.reload_workers_page, num_sec: 1800, delay: 10, message: "Wait for all original workers to be stopped")
  wait_for(lambda{|| pids.size == worker.get_all_worker_pids().size}, fail_func: worker.parent.reload_workers_page, num_sec: 1800, delay: 10, message: "Wait for all original workers to be running")
end
def set_memory_threshold_in_ui(appliance, worker, new_threshold)
  view = navigate_to(appliance.server, "Workers")
  view.browser.refresh()
  mem_threshold = view.workers.getattr(worker.dropdown)
  mem_threshold.select_by_visible_text(new_threshold.gsub(".gigabytes", " GB"))
  view.workers.save.click()
  return new_threshold
end
def get_memory_threshold_in_advanced_settings(appliance, worker)
  worker_base = appliance.server.advanced_settings
  loc = worker_base
  steps = ["workers", "worker_base"] + (worker.path.map{|step| (step != "*") ? step : worker.advanced})
  for step in steps
    worker_base = loc
    loc = loc.get(step)
  end
  return loc.get("memory_threshold", worker_base["defaults"]["memory_threshold"])
end
def set_memory_threshold_in_advanced_settings(appliance, worker, new_threshold)
  steps = ["workers", "worker_base"] + (worker.path.map{|step| (step != "*") ? step : worker.advanced})
  patch = {"memory_threshold" => new_threshold}
  for step in steps[0..-1].each_slice(-1).map(&:first)
    patch = {"step" => patch}
  end
  appliance.server.update_advanced_settings(patch)
  return new_threshold
end
def test_set_memory_threshold(appliance, worker, request, set_memory_threshold)
  # 
  #   Bugzilla:
  #       1656873
  #       1715633
  #       1787350
  #       1799443
  #       1805845
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #   
  view = navigate_to(appliance.server, "Workers")
  before = get_memory_threshold_in_advanced_settings(appliance, worker)
  threshold_change = "1.1.gigabytes"
  other_change = "1.2.gigabytes"
  if set_memory_threshold == set_memory_threshold_in_advanced_settings
    threshold_change,other_change = [other_change, threshold_change]
  end
  if threshold_change == before
    threshold_change = other_change
  end
  change = set_memory_threshold.(appliance, worker, threshold_change)
  request.addfinalizer(lambda{|| set_memory_threshold_in_advanced_settings(appliance, worker, before)})
  _ui_check = lambda do
    view.browser.refresh()
    mem_threshold = view.workers.getattr(worker.dropdown)
    after = mem_threshold.selected_option
    return after.startswith(change.gsub(".gigabytes", " GB"))
  end
  wait_for(method(:_ui_check), delay: 0, timeout: 45)
  change_val = change.gsub(".gigabytes", "").to_f
  mem_threshold_real = get_memory_threshold_in_advanced_settings(appliance, worker)
  MESSAGE = "memory threshold have changed incorrectly in advanced settings"
  raise MESSAGE unless mem_threshold_real == "#{change_val}.gigabytes"
end
