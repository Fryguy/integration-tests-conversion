require_relative 'cfme/physical/provider/redfish'
include Cfme::Physical::Provider::Redfish
pytestmark = [pytest.mark.provider([RedfishProvider], scope: "function")]
def get_physical_chassis(appliance, provider)
  # Get and return the physical chassis collection.
  return appliance.collections.redfish_physical_chassis.all(provider)
end
def test_redfish_physical_chassis_details_stats(appliance, provider, setup_provider_funcscope)
  # Navigate to the physical chassis' details page and verify that the stats match.
  for phys_ch in get_physical_chassis(appliance, provider)
    phys_ch.validate_stats(ui: true)
  end
end
