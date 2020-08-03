require_relative 'cfme'
include Cfme
require_relative 'cfme/intelligence/reports/reports'
include Cfme::Intelligence::Reports::Reports
require_relative 'cfme/intelligence/reports/widgets'
include Cfme::Intelligence::Reports::Widgets
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/ftp'
include Cfme::Utils::Ftp
require_relative 'cfme/utils/ftp'
include Cfme::Utils::Ftp
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/path'
include Cfme::Utils::Path
pytestmark = [pytest.mark.tier(1), test_requirements.report]
def yaml_path(yaml_name)
  #  Returns yaml path of the file with yaml_name name
  yaml_name = "#{yaml_name}.yaml"
  begin
    fs = FTPClientWrapper(cfme_data.ftpserver.entities.reports)
    file_path = fs.download(yaml_name, File.join("/tmp",yaml_name))
  rescue [FTPException, NoMethodError]
    logger.exception("FTP download or YAML lookup of %s failed, defaulting to local", yaml_name)
    file_path = "ui", "intelligence", yaml_name.data_path.join.realpath().strpath
    logger.info("Importing from data path: %s", file_path)
  end
  return file_path
end
def widget(appliance)
  widget = appliance.collections.dashboard_report_widgets.instantiate(appliance.collections.dashboard_report_widgets.CHART, "testing widget", description: "testing widget description", filter: "Configuration Management/Virtual Machines/Guest OS Information - any OS", active: true)
  yield(widget)
  widget.delete_if_exists()
end
def report(appliance)
  report = appliance.collections.reports.instantiate(type: "My Company (All Groups)", subtype: "Custom", menu_name: "testing report", title: "testing report title")
  yield(report)
  report.delete_if_exists()
end
def test_import_widget(appliance, widget)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       initialEstimate: 1/16h
  #       startsin: 5.3
  #       testSteps:
  #           1. Import the widget data yaml.
  #           2. Check if widget created with import is same as the expected widget.
  #   
  collection = appliance.collections.dashboard_report_widgets
  collection.import_widget(yaml_path("import_widget"))
  import_view = collection.create_view(ImportExportWidgetsCommitView)
  import_view.flash.assert_message("1 widget imported successfully")
  raise unless widget.exists
end
def test_export_widget(appliance, widget)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       initialEstimate: 1/16h
  #       startsin: 5.3
  #   
  collection = appliance.collections.dashboard_report_widgets
  collection.create(widget_class: collection.getattr(widget.TITLE.upcase()), title: widget.title, description: widget.description, filter: widget.filter, active: widget.active)
  collection.export_widget(widget.title)
end
def test_import_report(appliance, report)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: medium
  #       initialEstimate: 1/2h
  #       testSteps:
  #           1. Import the report data yaml.
  #           2. Check if report created with import is same as the expected report.
  # 
  #   
  collection = appliance.collections.reports
  collection.import_report(yaml_path("import_report"))
  view = collection.create_view(ImportExportCustomReportsView)
  raise unless view.is_displayed
  view.flash.assert_message("Imported Report: [#{report.menu_name}]")
  raise unless report.exists
end
def test_export_report(appliance, report)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       initialEstimate: 1/16h
  #       startsin: 5.3
  #   
  collection = appliance.collections.reports
  collection.create(menu_name: report.menu_name, title: report.title, base_report_on: "VMs and Instances", report_fields: ["Archived", "Autostart", "Boot Time"])
  collection.export_report(report.menu_name)
end
def test_import_duplicate_report(appliance, report, overwrite)
  # 
  #   This case tests appliance behavior when a duplicate report is imported.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  collection = appliance.collections.reports
  file_path = yaml_path("import_report")
  collection.import_report(file_path)
  view = collection.create_view(ImportExportCustomReportsView)
  view.flash.assert_message("Imported Report: ", partial: true)
  collection.import_report(file_path, overwrite: overwrite)
  if is_bool(overwrite)
    view.flash.assert_message("Replaced Report: [#{report.menu_name}]")
  else
    view.flash.assert_message("Skipping Report (already in DB): [#{report.menu_name}]")
  end
end
def test_reports_invalid_file(appliance, yaml_name)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: medium
  #       caseposneg: negative
  #       initialEstimate: 1/16h
  #       testSteps:
  #           1. Import `invalid_report` yaml that has some yaml data,
  #           but might have a syntax error.
  #           2. Import `invalid_yaml` yaml that has no yaml data.
  #   
  if yaml_name == "invalid_yaml"
    message = ".*Error during .*'upload.*': undefined method `keys.*' for.*i.*:String"
  else
    message = ".*Error during 'upload': Invalid YAML file"
  end
  pytest.raises(RuntimeError, match: message) {
    appliance.collections.reports.import_report(yaml_path(yaml_name))
  }
end
def test_widgets_invalid_file(appliance, yaml_name)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: medium
  #       caseposneg: negative
  #       initialEstimate: 1/16h
  #       testSteps:
  #           1. Import `invalid_widget` yaml that has some yaml data,
  #           but might have a syntax error.
  #           2. Import `invalid_yaml` yaml that has no yaml data.
  #   
  if yaml_name == "invalid_yaml"
    message = "Error: the file uploaded contains no widgets"
  else
    message = "Error: the file uploaded is not of the supported format"
  end
  pytest.raises(RuntimeError, match: message) {
    appliance.collections.dashboard_report_widgets.import_widget(yaml_path(yaml_name))
  }
end
