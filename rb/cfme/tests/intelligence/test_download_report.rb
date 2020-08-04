require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.report]
def report(appliance)
  saved_report = appliance.collections.reports.instantiate(type: "Configuration Management", subtype: "Virtual Machines", menu_name: "Hardware Information for VMs").queue(wait_for_finish: true)
  yield(saved_report)
  saved_report.delete(cancel: false)
end
def test_download_report(setup_provider_modscope, report, filetype)
  # Download the report as a file.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/20h
  #   
  if filetype == "pdf"
    view = navigate_to(report, "Details")
    raise unless view.download.item_enabled("Print or export as PDF")
  else
    report.download(filetype)
  end
end
