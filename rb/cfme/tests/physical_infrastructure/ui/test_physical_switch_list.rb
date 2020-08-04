require_relative 'cfme/physical/provider/lenovo'
include Cfme::Physical::Provider::Lenovo
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), pytest.mark.provider([LenovoProvider], scope: "module")]
def test_physical_switches_view_displayed(appliance, physical_switch)
  # Navigate to the physical switches page and verify that switches are displayed
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_switches_view = navigate_to(appliance.collections.physical_switches, "All")
  raise unless physical_switches_view.is_displayed
end
def test_physical_switches_view_dropdowns(appliance, physical_switch)
  # Navigate to the physical switches page and verify that the dropdown menus are present
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_switches_view = navigate_to(appliance.collections.physical_switches, "All")
  toolbar = physical_switches_view.toolbar
  raise unless toolbar.configuration.is_enabled
  configuration_items = toolbar.configuration.to_a
  configuration_options = ["Refresh Relationships and Power States"]
  for option in configuration_options
    raise unless configuration_items.include?(option)
    raise unless !toolbar.configuration.item_enabled(option)
  end
end
