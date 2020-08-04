// This test contains necessary smoke tests for the Control.
require_relative("cfme");
include(Cfme);
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  test_requirements.control,
  pytest.mark.smoke,
  pytest.mark.tier(2)
];

let destinations = [
  control.explorer.ControlExplorer.__name__,
  control.simulation.ControlSimulation.__name__,
  control.import_export.ControlImportExport.__name__,
  control.log.ControlLog.__name__
];

let control_explorer_accordions = [
  "Policy Profiles",
  "Policies",
  "Events",
  "Conditions",
  "Actions",
  "Alert Profiles",
  "Alerts"
];

function control_explorer_view(appliance) {
  return navigate_to(appliance.server, "ControlExplorer")
};

function test_control_navigation(destination, appliance) {
  // This test verifies presence of destinations of Control tab.
  // 
  //   Steps:
  //       * Open each destination of Control tab.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: WebUI
  //       initialEstimate: 1/60h
  //   
  let view = navigate_to(
    appliance.server,
    destination,
    {wait_for_view: 60}
  );

  if (!view.is_displayed) throw new ()
};

function test_control_explorer_tree(control_explorer_view, destination, appliance) {
  // This test checks the accordion of Control/Explorer.
  // 
  //   Steps:
  //       * Open each accordion tab and click on top node of the tree.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: WebUI
  //       initialEstimate: 1/60h
  //   
  navigate_to(appliance.server, "ControlExplorer", {wait_for_view: 30});
  let accordion_name = destination.downcase().gsub(" ", "_");
  let accordion = control_explorer_view.getattr(accordion_name);
  accordion.tree.click_path(`All ${destination}`)
}
