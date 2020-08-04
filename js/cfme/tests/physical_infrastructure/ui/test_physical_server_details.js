require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider], {scope: "module"})
];

function physical_server(appliance, provider, setup_provider_modscope) {
  let physical_servers = appliance.collections.physical_servers.all(provider);
  yield(physical_servers[0])
};

function test_physical_server_details(physical_server) {
  // Navigate to the physical server details page and verify that the page is displayed
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let physical_server_view = navigate_to(physical_server, "Details");
  if (!physical_server_view.is_displayed) throw new ()
};

function test_physical_server_details_dropdowns(physical_server) {
  // Navigate to the physical server details page and verify that the menus are present
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let physical_server_view = navigate_to(physical_server, "Details");
  let configuration_items = physical_server_view.toolbar.configuration.to_a;

  if (!configuration_items.include("Refresh Relationships and Power States")) {
    throw new ()
  };

  let power_items = physical_server_view.toolbar.power.to_a;
  if (!power_items.include("Power On")) throw new ();
  if (!power_items.include("Power Off")) throw new ();
  if (!power_items.include("Power Off Immediately")) throw new ();
  if (!power_items.include("Restart")) throw new ();
  if (!power_items.include("Restart Immediately")) throw new ();
  if (!power_items.include("Restart to System Setup")) throw new ();
  if (!power_items.include("Restart Management Controller")) throw new ();
  let identify_items = physical_server_view.toolbar.identify.to_a;
  if (!identify_items.include("Blink LED")) throw new ();
  if (!identify_items.include("Turn On LED")) throw new ();
  if (!identify_items.include("Turn Off LED")) throw new ();
  let policy_items = physical_server_view.toolbar.policy.to_a;
  if (!policy_items.include("Manage Policies")) throw new ();
  if (!policy_items.include("Edit Tags")) throw new ();
  let lifecycle_items = physical_server_view.toolbar.lifecycle.to_a;
  if (!lifecycle_items.include("Provision Physical Server")) throw new ();
  let monitoring_items = physical_server_view.toolbar.monitoring.to_a;
  if (!monitoring_items.include("Timelines")) throw new ()
};

function test_network_devices(physical_server) {
  // Navigate to the Network Devices page and verify that the page is displayed
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let num_network_devices = physical_server.num_network_devices();

  let network_device_view = navigate_to(
    physical_server,
    "NetworkDevices"
  );

  if (!(num_network_devices != "0" ? network_device_view.is_displayed : !network_device_view.is_displayed)) {
    throw new ()
  }
};

function test_storage_devices(physical_server) {
  // Navigate to the Storage Devices page and verify that the page is displayed
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let num_storage_devices = physical_server.num_storage_devices();

  let storage_device_view = navigate_to(
    physical_server,
    "StorageDevices"
  );

  if (!(num_storage_devices != "0" ? storage_device_view.is_displayed : !storage_device_view.is_displayed)) {
    throw new ()
  }
};

function test_physical_server_details_stats(physical_server) {
  // Navigate to the physical server details page and verify that the stats match
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  physical_server.validate_stats({ui: true})
}
