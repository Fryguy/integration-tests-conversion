require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider], {scope: "module"})
];

function physical_server_collection(appliance, provider, setup_provider_modscope) {
  yield(appliance.collections.physical_servers)
};

function test_physical_servers_view_displayed(physical_server_collection) {
  // Navigate to the physical servers page and verify that servers are displayed
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let physical_servers_view = navigate_to(
    physical_server_collection,
    "All"
  );

  if (!physical_servers_view.is_displayed) throw new ()
};

function test_physical_servers_view_dropdowns(physical_server_collection) {
  // Navigate to the physical servers page and verify that the dropdown menus are present
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let physical_servers_view = navigate_to(
    physical_server_collection,
    "All"
  );

  let toolbar = physical_servers_view.toolbar;
  if (!toolbar.configuration.is_enabled) throw new ();
  if (!toolbar.power.is_enabled) throw new ();
  if (!toolbar.identify.is_enabled) throw new ();
  if (!toolbar.policy.is_enabled) throw new ();
  if (!toolbar.lifecycle.is_enabled) throw new ();
  let configuration_items = toolbar.configuration.to_a;
  let configuration_options = ["Refresh Relationships and Power States"];

  for (let option in configuration_options) {
    if (!configuration_items.include(option)) throw new ();
    if (!!toolbar.configuration.item_enabled(option)) throw new ()
  };

  let power_items = toolbar.power.to_a;

  let power_options = [
    "Power On",
    "Power Off",
    "Power Off Immediately",
    "Restart",
    "Restart Immediately"
  ];

  for (let option in power_options) {
    if (!power_items.include(option)) throw new ();
    if (!!toolbar.power.item_enabled(option)) throw new ()
  };

  let identify_items = toolbar.identify.to_a;
  let identify_options = ["Blink LED", "Turn On LED", "Turn Off LED"];

  for (let option in identify_options) {
    if (!identify_items.include(option)) throw new ();
    if (!!toolbar.identify.item_enabled(option)) throw new ()
  };

  let policy_items = toolbar.policy.to_a;
  let policy_options = ["Manage Policies", "Edit Tags"];

  for (let option in policy_options) {
    if (!policy_items.include(option)) throw new ();
    if (!!toolbar.policy.item_enabled(option)) throw new ()
  };

  let lifecycle_items = toolbar.lifecycle.to_a;
  let lifecycle_options = ["Provision Physical Server"];

  for (let option in lifecycle_options) {
    if (!lifecycle_items.include(option)) throw new ();
    if (!!toolbar.lifecycle.item_enabled(option)) throw new ()
  }
}
