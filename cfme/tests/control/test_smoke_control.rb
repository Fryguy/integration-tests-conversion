# This test contains necessary smoke tests for the Control.
require_relative 'cfme'
include Cfme
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.control, pytest.mark.smoke, pytest.mark.tier(2)]
destinations = [control.explorer.ControlExplorer.__name__, control.simulation.ControlSimulation.__name__, control.import_export.ControlImportExport.__name__, control.log.ControlLog.__name__]
control_explorer_accordions = ["Policy Profiles", "Policies", "Events", "Conditions", "Actions", "Alert Profiles", "Alerts"]
def control_explorer_view(appliance)
  return navigate_to(appliance.server, "ControlExplorer")
end
def test_control_navigation(destination, appliance)
  # This test verifies presence of destinations of Control tab.
  # 
  #   Steps:
  #       * Open each destination of Control tab.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: WebUI
  #       initialEstimate: 1/60h
  #   
  view = navigate_to(appliance.server, destination, wait_for_view: 60)
  raise unless view.is_displayed
end
def test_control_explorer_tree(control_explorer_view, destination, appliance)
  # This test checks the accordion of Control/Explorer.
  # 
  #   Steps:
  #       * Open each accordion tab and click on top node of the tree.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: WebUI
  #       initialEstimate: 1/60h
  #   
  navigate_to(appliance.server, "ControlExplorer", wait_for_view: 30)
  accordion_name = destination.downcase().gsub(" ", "_")
  accordion = control_explorer_view.getattr(accordion_name)
  accordion.tree.click_path()
end
