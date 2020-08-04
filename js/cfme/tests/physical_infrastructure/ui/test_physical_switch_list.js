require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider], {scope: "module"})
];

function test_physical_switches_view_displayed(appliance, physical_switch) {
  // Navigate to the physical switches page and verify that switches are displayed
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let physical_switches_view = navigate_to(
    appliance.collections.physical_switches,
    "All"
  );

  if (!physical_switches_view.is_displayed) throw new ()
};

function test_physical_switches_view_dropdowns(appliance, physical_switch) {
  // Navigate to the physical switches page and verify that the dropdown menus are present
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let physical_switches_view = navigate_to(
    appliance.collections.physical_switches,
    "All"
  );

  let toolbar = physical_switches_view.toolbar;
  if (!toolbar.configuration.is_enabled) throw new ();
  let configuration_items = toolbar.configuration.to_a;
  let configuration_options = ["Refresh Relationships and Power States"];

  for (let option in configuration_options) {
    if (!configuration_items.include(option)) throw new ();
    if (!!toolbar.configuration.item_enabled(option)) throw new ()
  }
}
