require_relative 'cfme'
include Cfme
require_relative 'cfme/intelligence/reports/schedules'
include Cfme::Intelligence::Reports::Schedules
require_relative 'cfme/intelligence/reports/widgets'
include Cfme::Intelligence::Reports::Widgets
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/path'
include Cfme::Utils::Path
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.report]
REPORT_CRUD_DIR = "reports_crud".data_path.join
SCHEDULES_CRUD_DIR = "schedules_crud".data_path.join
def crud_files_reports()
  result = []
  if is_bool(!REPORT_CRUD_DIR.exists)
    REPORT_CRUD_DIR.mkdir()
  end
  for file_name in REPORT_CRUD_DIR.listdir()
    if is_bool(file_name.isfile() && file_name.basename.end_with?(".yaml"))
      result.push(file_name.basename)
    end
  end
  return result
end
def crud_files_schedules()
  result = []
  if is_bool(!SCHEDULES_CRUD_DIR.exists)
    SCHEDULES_CRUD_DIR.mkdir()
  end
  for file_name in SCHEDULES_CRUD_DIR.listdir()
    if is_bool(file_name.isfile() && file_name.basename.end_with?(".yaml"))
      result.push(file_name.basename)
    end
  end
  return result
end
def custom_report_values(request)
  request.param.REPORT_CRUD_DIR.join.open(mode: "r") {|rep_yaml|
    return yaml.safe_load(rep_yaml)
  }
end
def schedule_data(request)
  request.param.SCHEDULES_CRUD_DIR.join.open(mode: "r") {|rep_yaml|
    return yaml.safe_load(rep_yaml)
  }
end
def get_custom_report(appliance, custom_report_values)
  custom_report = appliance.collections.reports.create(None: custom_report_values)
  yield custom_report
  custom_report.delete()
end
def test_custom_report_crud(custom_report_values, appliance, request)
  # 
  #   Bugzilla:
  #       1531600
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: critical
  #       initialEstimate: 1/16h
  #   
  custom_report = appliance.collections.reports.create(None: custom_report_values)
  request.addfinalizer(custom_report.delete_if_exists)
  update(custom_report) {
    custom_report.title += fauxfactory.gen_alphanumeric()
  }
  custom_report.queue(wait_for_finish: true)
  for saved_report in custom_report.saved_reports.all()
    raise unless saved_report.exists
  end
  custom_report.delete()
end
def test_reports_schedule_crud(schedule_data, appliance, request)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/16h
  # 
  #   Bugzilla:
  #       1202412
  #       1446052
  #       1729882
  #   
  schedule = appliance.collections.schedules.create(None: schedule_data)
  request.addfinalizer(schedule.delete_if_exists)
  view = schedule.create_view(ScheduleDetailsView)
  view.flash.assert_success_message()
  date = datetime.datetime.today() + datetime.timedelta(5)
  updated_description = "badger badger badger"
  updated_timer = {"run" => "Monthly", "starting_date" => date}
  update(schedule) {
    schedule.description = updated_description
    schedule.timer = updated_timer
  }
  view.flash.assert_message()
  raise unless view.schedule_info.get_text_of("Description") == updated_description
  run_at = view.schedule_info.get_text_of("Run At")
  raise unless run_at.include?(updated_timer["run"].downcase())
  raise unless run_at.include?(date.day.to_s)
  schedule.queue()
  view.flash.assert_message("The selected Schedule has been queued to run")
  schedule.delete()
  view.flash.assert_message()
end
def test_menuwidget_crud(appliance, request)
  # 
  #   Bugzilla:
  #       1653796
  #       1667064
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Reporting
  #       caseimportance: critical
  #       initialEstimate: 1/12h
  #   
  w = appliance.collections.dashboard_report_widgets.create(appliance.collections.dashboard_report_widgets.MENU, fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), active: true, shortcuts: {"Services / Catalogs" => fauxfactory.gen_alphanumeric(), "Overview / Dashboard" => fauxfactory.gen_alphanumeric()}, visibility: "<To All Users>")
  request.addfinalizer(w.delete_if_exists)
  view = w.create_view(AllDashboardWidgetsView)
  view.flash.assert_message()
  update(w) {
    w.active = false
  }
  w.delete()
end
def test_reportwidget_crud(appliance, request)
  # 
  #   Bugzilla:
  #       1656413
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #       caseimportance: critical
  #   
  w = appliance.collections.dashboard_report_widgets.create(appliance.collections.dashboard_report_widgets.REPORT, fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), active: true, filter: ["Events", "Operations", "Operations VMs Powered On/Off for Last Week"], columns: ["VM Name", "Message"], rows: "10", timer: {"run" => "Hourly", "hours" => "Hour"}, visibility: "<To All Users>")
  request.addfinalizer(w.delete_if_exists)
  view = w.create_view(AllDashboardWidgetsView)
  view.flash.assert_message()
  update(w) {
    w.active = false
  }
  w.delete()
end
def test_chartwidget_crud(appliance, request)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Reporting
  #       caseimportance: critical
  #       initialEstimate: 1/12h
  #   
  w = appliance.collections.dashboard_report_widgets.create(appliance.collections.dashboard_report_widgets.CHART, fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), active: true, filter: "Configuration Management/Virtual Machines/Vendor and Guest OS", timer: {"run" => "Hourly", "hours" => "Hour"}, visibility: "<To All Users>")
  request.addfinalizer(w.delete_if_exists)
  view = w.create_view(AllDashboardWidgetsView)
  view.flash.assert_message()
  update(w) {
    w.active = false
  }
  w.delete()
end
def test_rssfeedwidget_crud(appliance, request)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Reporting
  #       caseimportance: critical
  #       initialEstimate: 1/12h
  #   
  w = appliance.collections.dashboard_report_widgets.create(appliance.collections.dashboard_report_widgets.RSS, fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), active: true, type: "Internal", feed: "Administrative Events", rows: "8", visibility: "<To All Users>")
  request.addfinalizer(w.delete_if_exists)
  view = w.create_view(AllDashboardWidgetsView)
  view.flash.assert_message()
  update(w) {
    w.active = false
  }
  update(w) {
    w.type = "External"
    w.external = "SlashDot"
  }
  update(w) {
    w.type = "External"
    w.external = "http://rss.example.com/"
  }
  w.delete()
end
def test_dashboard_crud(appliance, request)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: critical
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  # 
  #   Bugzilla:
  #       1667064
  #   
  d = appliance.collections.report_dashboards.create(fauxfactory.gen_alphanumeric(), "EvmGroup-administrator", title: fauxfactory.gen_alphanumeric(), locked: false, widgets: ["Top CPU Consumers (weekly)", "Vendor and Guest OS Chart"])
  request.addfinalizer(d.delete_if_exists)
  update(d) {
    d.locked = true
  }
  update(d) {
    d.locked = false
  }
  update(d) {
    d.widgets = "Top Storage Consumers"
  }
  d.delete()
end
def test_run_report(appliance)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: medium
  #       initialEstimate: 1/16h
  #   
  report = appliance.rest_api.collections.reports.get(name: "VM Disk Usage")
  response = report.action.run()
  assert_response(appliance)
  rest_running_report_finishes = lambda do
    response.task.reload()
    if response.task.status.downcase().include?("error")
      pytest.fail()
    end
    return response.task.state.downcase() == "finished"
  end
  result = appliance.rest_api.collections.results.get(id: response.result_id)
  raise unless result.name == report.name
end
def test_import_report_rest(appliance, request)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: medium
  #       initialEstimate: 1/16h
  #   
  menu_name = fauxfactory.gen_alphanumeric(18, start: "test_report_")
  data = {"report" => {"menu_name" => menu_name, "col_order" => ["col1", "col2", "col3"], "cols" => ["col1", "col2", "col3"], "rpt_type" => "Custom", "title" => "Test Report", "db" => "My::Db", "rpt_group" => "Custom"}, "options" => {"save" => "true"}}
  response, = appliance.rest_api.collections.reports.action.execute_action("import", data)
  assert_response(appliance)
  _finalize = lambda do
    report = appliance.collections.reports.instantiate(type: "My Company (All Groups)", subtype: "Custom", menu_name: menu_name)
    report.delete_if_exists()
  end
  raise unless response["message"] == 
  report = appliance.rest_api.collections.reports.get(name: menu_name)
  raise unless report.name == menu_name
  response, = appliance.rest_api.collections.reports.action.execute_action("import", data)
  assert_response(appliance)
  raise unless response["message"] == 
end
def test_reports_delete_saved_report(appliance, request)
  # The test case selects reports from the Saved Reports list and deletes them.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/16h
  #   
  report = appliance.collections.reports.instantiate(type: "Configuration Management", subtype: "Virtual Machines", menu_name: "Hardware Information for VMs").queue(wait_for_finish: true)
  request.addfinalizer(report.delete_if_exists)
  view = navigate_to(appliance.collections.saved_reports, "All")
  for row in view.table.rows()
    if row.name.text == report.report.menu_name
      row[0].check()
    end
  end
  view.configuration.item_select(item: "Delete selected Saved Reports", handle_alert: true)
  raise unless !report.exists
end
def test_reports_crud_schedule_for_base_report_once(appliance, request)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/16h
  #   
  report = appliance.collections.reports.instantiate(type: "Configuration Management", subtype: "Virtual Machines", menu_name: "Hardware Information for VMs")
  data = {"timer" => {"hour" => "12", "minute" => "10"}, "email" => {"to_emails" => "test@example.com"}, "email_options" => {"send_if_empty" => true, "send_pdf" => true, "send_csv" => true, "send_txt" => true}}
  schedule = report.create_schedule(None: data)
  request.addfinalizer(schedule.delete_if_exists)
  raise unless schedule.enabled
  schedule.delete(cancel: false)
  raise unless !schedule.exists
end
def test_crud_custom_report_schedule(appliance, request, get_custom_report, schedule_data)
  # This test case creates a schedule for custom reports and tests if it was created
  #   successfully.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/10h
  #   
  schedule_data["report_filter"] = {"filter_type" => "My Company (All Groups)", "subfilter_type" => "Custom", "report_type" => get_custom_report.menu_name}
  custom_report_schedule = appliance.collections.schedules.create(None: schedule_data)
  request.addfinalizer(custom_report_schedule.delete_if_exists)
  raise unless custom_report_schedule.exists
  custom_report_schedule.delete(cancel: false)
end
