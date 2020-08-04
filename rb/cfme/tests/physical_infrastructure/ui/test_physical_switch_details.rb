require_relative 'cfme/physical/provider/lenovo'
include Cfme::Physical::Provider::Lenovo
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), pytest.mark.provider([LenovoProvider], scope: "module")]
def physical_switch(appliance, setup_provider_modscope)
  physical_switches = appliance.collections.physical_switches.all()
  return physical_switches[0]
end
def test_physical_switch_details(physical_switch)
  # Navigate to the physical switch details page and verify that the page is displayed
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_switch_view = navigate_to(physical_switch, "Details")
  raise unless physical_switch_view.is_displayed
end
def test_physical_switch_details_dropdowns(physical_switch)
  # Navigate to the physical switch details page and verify that the menus are present
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_switch_view = navigate_to(physical_switch, "Details")
  configuration_items = physical_switch_view.toolbar.configuration.to_a
  raise unless configuration_items.include?("Refresh Relationships and Power States")
end
