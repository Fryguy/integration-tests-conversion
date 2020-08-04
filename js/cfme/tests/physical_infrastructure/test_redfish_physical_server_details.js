require_relative("cfme/physical/provider/redfish");
include(Cfme.Physical.Provider.Redfish);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [pytest.mark.provider(
  [RedfishProvider],
  {scope: "function"}
)];

function physical_server(appliance, provider, setup_provider_funcscope) {
  // Get and return the first physical server.
  yield(appliance.collections.redfish_physical_servers.all(provider)[0])
};

function assert_message(physical_server, expected_message) {
  // 
  //   Assert that the physical server details view displays the requested message.
  // 
  //   Args:
  //     physical_server: check the details view of this physical server.
  //     expected_message: the message we expect to be displayed in the flash alert
  //   
  let view = navigate_to(physical_server, "Details");
  view.flash.assert_message(expected_message)
};

function test_redfish_physical_server_details_stats(physical_server) {
  // Navigate to the physical server details page and verify that the stats match
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  physical_server.validate_stats({ui: true})
};

function test_redfish_power_buttons(physical_server, provider) {
  // 
  //   Test that pressing of the power buttons for physical server succeeds.
  // 
  //   The test assumes that the buttons can be pressed in any order and that we
  //   will get a flash that tells us of success regardless of the state that the
  //   physical server is in. Here we only test that the request in the gui
  //   succeeds.
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let power_actions = [
    ["power_off", () => physical_server.power_off()],
    ["power_on", () => physical_server.power_on()],
    ["power_off_now", () => physical_server.power_off_immediately()],
    ["restart", () => physical_server.restart()],
    ["restart_now", () => physical_server.restart_immediately()],
    ["turn_on_loc_led", () => physical_server.turn_on_led()],
    ["turn_off_loc_led", () => physical_server.turn_off_led()],
    ["blink_loc_led", () => physical_server.turn_blink_led()]
  ];

  for (let [action_name, action] in power_actions) {
    action();

    assert_message(
      physical_server,
      "Requested {} of selected item.".format(action_name)
    )
  }
}
