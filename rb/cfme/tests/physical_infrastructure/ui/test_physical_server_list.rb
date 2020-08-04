require_relative 'cfme/physical/provider/lenovo'
include Cfme::Physical::Provider::Lenovo
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), pytest.mark.provider([LenovoProvider], scope: "module")]
def physical_server_collection(appliance, provider, setup_provider_modscope)
  yield(appliance.collections.physical_servers)
end
def test_physical_servers_view_displayed(physical_server_collection)
  # Navigate to the physical servers page and verify that servers are displayed
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_servers_view = navigate_to(physical_server_collection, "All")
  raise unless physical_servers_view.is_displayed
end
def test_physical_servers_view_dropdowns(physical_server_collection)
  # Navigate to the physical servers page and verify that the dropdown menus are present
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_servers_view = navigate_to(physical_server_collection, "All")
  toolbar = physical_servers_view.toolbar
  raise unless toolbar.configuration.is_enabled
  raise unless toolbar.power.is_enabled
  raise unless toolbar.identify.is_enabled
  raise unless toolbar.policy.is_enabled
  raise unless toolbar.lifecycle.is_enabled
  configuration_items = toolbar.configuration.to_a
  configuration_options = ["Refresh Relationships and Power States"]
  for option in configuration_options
    raise unless configuration_items.include?(option)
    raise unless !toolbar.configuration.item_enabled(option)
  end
  power_items = toolbar.power.to_a
  power_options = ["Power On", "Power Off", "Power Off Immediately", "Restart", "Restart Immediately"]
  for option in power_options
    raise unless power_items.include?(option)
    raise unless !toolbar.power.item_enabled(option)
  end
  identify_items = toolbar.identify.to_a
  identify_options = ["Blink LED", "Turn On LED", "Turn Off LED"]
  for option in identify_options
    raise unless identify_items.include?(option)
    raise unless !toolbar.identify.item_enabled(option)
  end
  policy_items = toolbar.policy.to_a
  policy_options = ["Manage Policies", "Edit Tags"]
  for option in policy_options
    raise unless policy_items.include?(option)
    raise unless !toolbar.policy.item_enabled(option)
  end
  lifecycle_items = toolbar.lifecycle.to_a
  lifecycle_options = ["Provision Physical Server"]
  for option in lifecycle_options
    raise unless lifecycle_items.include?(option)
    raise unless !toolbar.lifecycle.item_enabled(option)
  end
end
