require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider], {scope: "function"})
];

function physical_rack(appliance, provider, setup_provider) {
  try {
    let physical_racks = appliance.collections.physical_racks.filter({provider: provider}).all();
    return physical_racks[0]
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof IndexError) {
      pytest.skip("No rack resource on provider")
    } else {
      throw $EXCEPTION
    }
  }
};

function test_physical_rack_details_dropdowns(physical_rack) {
  // Navigate to the physical rack details page and verify the refresh button
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  physical_rack.refresh()
};

function test_physical_racks_view_dropdowns(appliance, physical_rack) {
  // Navigate to the physical racks page and verify that the dropdown menus are present
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let physical_racks_view = navigate_to(
    appliance.collections.physical_racks,
    "All"
  );

  let configuration_items = physical_racks_view.toolbar.configuration.to_a;

  if (!configuration_items.include("Refresh Relationships and Power States")) {
    throw new ()
  }
}
