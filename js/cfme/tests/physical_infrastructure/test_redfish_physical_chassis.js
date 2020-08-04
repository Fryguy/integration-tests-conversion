require_relative("cfme/physical/provider/redfish");
include(Cfme.Physical.Provider.Redfish);

let pytestmark = [pytest.mark.provider(
  [RedfishProvider],
  {scope: "function"}
)];

function get_physical_chassis(appliance, provider) {
  // Get and return the physical chassis collection.
  return appliance.collections.redfish_physical_chassis.all(provider)
};

function test_redfish_physical_chassis_details_stats(appliance, provider, setup_provider_funcscope) {
  // Navigate to the physical chassis' details page and verify that the stats match.
  for (let phys_ch in get_physical_chassis(appliance, provider)) {
    phys_ch.validate_stats({ui: true})
  }
}
