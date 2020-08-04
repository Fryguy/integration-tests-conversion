require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider], {scope: "module"})
];

function physical_switch(appliance, setup_provider_modscope) {
  let physical_switches = appliance.collections.physical_switches.all();
  return physical_switches[0]
};

function test_physical_switch_details(physical_switch) {
  // Navigate to the physical switch details page and verify that the page is displayed
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let physical_switch_view = navigate_to(physical_switch, "Details");
  if (!physical_switch_view.is_displayed) throw new ()
};

function test_physical_switch_details_dropdowns(physical_switch) {
  // Navigate to the physical switch details page and verify that the menus are present
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let physical_switch_view = navigate_to(physical_switch, "Details");
  let configuration_items = physical_switch_view.toolbar.configuration.to_a;

  if (!configuration_items.include("Refresh Relationships and Power States")) {
    throw new ()
  }
}
