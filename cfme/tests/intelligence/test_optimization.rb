require_relative 'datetime'
include Datetime
require_relative 'widgetastic/exceptions'
include Widgetastic::Exceptions
require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
pytestmark = [test_requirements.report, pytest.mark.tier(1), pytest.mark.ignore_stream("5.10")]
REPORTS = ["Host CPU Trends (last week)", "Host Memory Trends (last week)", "Offline VMs with Snapshot", "Top CPU Consumers (weekly)", "Top Memory Consumers (weekly)", "VMs with Volume Free Space >= 75%"]
def test_generate_optimization_report(appliance, menu_name)
  # 
  #   Bugzilla:
  #       1769346
  # 
  #   Polarion:
  #       assignee: pvala
  #       initialEstimate: 1/8h
  #       casecomponent: Reporting
  #       tags: reports
  #       startsin: 5.11
  #       testSteps:
  #           1. Navigate to Overview > Optimization and queue the report with parametrized menu_name.
  #           2. Check if the report exists.
  #   
  saved_report = appliance.collections.optimization_reports.instantiate(menu_name: menu_name).queue()
  raise unless saved_report.exists
end
def test_delete_generated_report(appliance)
  # 
  #   Bugzilla:
  #       1769333
  # 
  #   Polarion:
  #       assignee: pvala
  #       initialEstimate: 1/8h
  #       casecomponent: Reporting
  #       tags: reports
  #       startsin: 5.11
  #       testSteps:
  #           1. Queue an optimization report.
  #           2. Navigate to the Saved reports page and delete the report
  #           3. Check if the optimization saved report still exists
  #       expectedResults:
  #           1.
  #           2.
  #           3. Report runs value for the optimization report must decrease by 1.
  #   
  optimization_report = appliance.collections.optimization_reports.instantiate(menu_name: "Offline VMs with Snapshot")
  opt_saved_report = optimization_report.queue()
  old_run = optimization_report.runs
  run_at_time = opt_saved_report.run_at.split()[1]
  if is_bool(BZ(1769333).blocks)
    run_at_time = Datetime::strftime(Datetime::strptime(, "%I:%M:%S %p"), "%H:%M:%S")
  end
  view = navigate_to(optimization_report.collections.saved_reports, "All")
  begin
    row = next(view.table.rows(run_at__contains: run_at_time, name__contains: opt_saved_report.parent.parent.menu_name))
  rescue RowNotFound
    pytest.fail("Saved Report does not exist.")
  end
  saved_report = appliance.collections.reports.instantiate(type: "Operations", subtype: "Virtual Machines", menu_name: opt_saved_report.parent.parent.menu_name).saved_reports.instantiate(run_datetime: row.run_at.text, queued_datetime: row.queued_at.text, candu: false)
  raise unless saved_report.exists
  saved_report.delete()
  raise unless optimization_report.runs < old_run
  raise unless !opt_saved_report.exists
end
