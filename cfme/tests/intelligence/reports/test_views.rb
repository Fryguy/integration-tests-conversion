require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/common/provider'
include Cfme::Common::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), test_requirements.report, pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([BaseProvider], selector: ONE, scope: "module")]
def report(appliance)
  report = (appliance.collections.reports.instantiate(type: "Configuration Management", subtype: "Virtual Machines", menu_name: "Guest OS Information - any OS")).queue(wait_for_finish: true)
  yield report
  report.delete_if_exists()
end
def test_report_view(report, view_mode)
  # Tests provisioning via PXE
  #   Bugzilla: 1401560
  # 
  #   Metadata:
  #       test_flag: report
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #   
  begin
    view = navigate_to(report, "Details")
  rescue CandidateNotFound
    report.browser.refresh()
    view = navigate_to(report, "Details")
  end
  view.view_selector.select(view_mode)
  raise  unless view.view_selector.selected == view_mode
end
