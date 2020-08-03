require_relative 'cfme/physical/provider/lenovo'
include Cfme::Physical::Provider::Lenovo
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), pytest.mark.provider([LenovoProvider], scope: "module")]
def physical_server(appliance, provider, setup_provider_modscope)
  physical_servers = appliance.collections.physical_servers.all(provider)
  yield physical_servers[0]
end
def test_physical_server_details(physical_server)
  # Navigate to the physical server details page and verify that the page is displayed
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_server_view = navigate_to(physical_server, "Details")
  raise unless physical_server_view.is_displayed
end
def test_physical_server_details_dropdowns(physical_server)
  # Navigate to the physical server details page and verify that the menus are present
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_server_view = navigate_to(physical_server, "Details")
  configuration_items = physical_server_view.toolbar.configuration.to_a
  raise unless configuration_items.include?("Refresh Relationships and Power States")
  power_items = physical_server_view.toolbar.power.to_a
  raise unless power_items.include?("Power On")
  raise unless power_items.include?("Power Off")
  raise unless power_items.include?("Power Off Immediately")
  raise unless power_items.include?("Restart")
  raise unless power_items.include?("Restart Immediately")
  raise unless power_items.include?("Restart to System Setup")
  raise unless power_items.include?("Restart Management Controller")
  identify_items = physical_server_view.toolbar.identify.to_a
  raise unless identify_items.include?("Blink LED")
  raise unless identify_items.include?("Turn On LED")
  raise unless identify_items.include?("Turn Off LED")
  policy_items = physical_server_view.toolbar.policy.to_a
  raise unless policy_items.include?("Manage Policies")
  raise unless policy_items.include?("Edit Tags")
  lifecycle_items = physical_server_view.toolbar.lifecycle.to_a
  raise unless lifecycle_items.include?("Provision Physical Server")
  monitoring_items = physical_server_view.toolbar.monitoring.to_a
  raise unless monitoring_items.include?("Timelines")
end
def test_network_devices(physical_server)
  # Navigate to the Network Devices page and verify that the page is displayed
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  num_network_devices = physical_server.num_network_devices()
  network_device_view = navigate_to(physical_server, "NetworkDevices")
  raise unless (num_network_devices != "0") ? network_device_view.is_displayed : !network_device_view.is_displayed
end
def test_storage_devices(physical_server)
  # Navigate to the Storage Devices page and verify that the page is displayed
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  num_storage_devices = physical_server.num_storage_devices()
  storage_device_view = navigate_to(physical_server, "StorageDevices")
  raise unless (num_storage_devices != "0") ? storage_device_view.is_displayed : !storage_device_view.is_displayed
end
def test_physical_server_details_stats(physical_server)
  # Navigate to the physical server details page and verify that the stats match
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_server.validate_stats(ui: true)
end
