require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
const TIMEOUT = 300;
const DELAY = 60;
const SOURCES = ["LenovoXclarity"];

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider], {scope: "module"})
];

function physical_server(setup_provider_modscope, appliance) {
  let physical_server = appliance.rest_api.collections.physical_servers[0];
  return physical_server
};

function enumerate_physical_infra_provider_events(appliance) {
  return SOURCES.map(x => enumerate_events_from_source(appliance, x)).sum
};

function enumerate_events_from_source(appliance, source) {
  return appliance.rest_api.collections.event_streams.find_by({source}).count
};

function enumerate_events_and_refresh_physical_infra_provider(appliance, provider) {
  let event_count = enumerate_physical_infra_provider_events(appliance);
  provider.refresh_provider_relationships();
  return event_count
};

function test_get_physical_infra_provider_power_event(appliance, physical_server, provider) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  let previous_num_events = enumerate_physical_infra_provider_events(appliance);
  physical_server.action.restart_now();
  assert_response(appliance);

  wait_for(
    () => (
      enumerate_events_and_refresh_physical_infra_provider(
        appliance,
        provider
      ) > previous_num_events
    ),

    {num_sec: TIMEOUT, delay: DELAY}
  )
}
