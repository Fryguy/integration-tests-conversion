// This module tests Redfish physical infrastructure events.
require_relative("cfme/physical/provider/redfish");
include(Cfme.Physical.Provider.Redfish);

let pytestmark = [pytest.mark.provider(
  [RedfishProvider],
  {scope: "function"}
)];

const SOURCE = "REDFISH";

function test_get_redfish_events_any(setup_provider_funcscope, register_event) {
  // 
  //   Test that the provider accounts for any Redfish-related event.
  // 
  //   The test assumes that events are generated regularly without needing to
  //   trigger any action.
  //   
  register_event.call({source: SOURCE})
}
