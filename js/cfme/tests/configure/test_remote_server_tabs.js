require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  test_requirements.configuration,
  pytest.mark.long_running
];

function test_remote_server_advanced_config(distributed_appliances, request) {
  // 
  //   Verify that it is possible to navigate to and modify advanced settings for another server from
  //   the web UI in a distributed appliance configuration.
  // 
  //   Bugzilla:
  //       1536524
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: Configuration
  //   
  let [primary_appliance, secondary_appliance] = distributed_appliances;
  let secondary_server = primary_appliance.server.secondary_servers[0];
  primary_appliance.browser_steal = true;

  primary_appliance(() => {
    navigate_to(secondary_server, "Advanced");
    let initial_conf = secondary_server.advanced_settings.server.startup_timeout;
    secondary_server.update_advanced_settings({server: {startup_timeout: initial_conf * 2}});
    let new_conf = secondary_server.advanced_settings.server.startup_timeout;
    if (new_conf != initial_conf * 2) throw new ()
  })
}
