require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider], {scope: "module"})
];

const TIMEOUT = 600;
const DELAY = 60;

function physical_server(appliance, provider, setup_provider_modscope) {
  try {
    let physical_server = appliance.rest_api.collections.physical_servers.filter({provider: provider}).all()[0]
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof IndexError) {
      pytest.skip("No physical server on provider")
    } else if ($EXCEPTION instanceof NoMethodError) {
      pytest.skip("No physical server attribute in REST collection")
    } else {
      throw $EXCEPTION
    }
  };

  return physical_server
};

function get_server_attr(attr_name, provider, physical_server) {
  provider.refresh_provider_relationships();
  physical_server.reload();
  return physical_server[attr_name]
};

function test_get_physical_server(physical_server, appliance) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  let existent_server = appliance.rest_api.get_entity(
    "physical_servers",
    physical_server.id
  );

  existent_server.reload();
  assert_response(appliance)
};

function test_get_nonexistent_physical_server(appliance) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  let nonexistent = appliance.rest_api.get_entity(
    "physical_servers",
    999999
  );

  pytest.raises(
    Exception,
    {match: "ActiveRecord::RecordNotFound"},
    () => nonexistent.reload()
  );

  assert_response(appliance, {http_status: 404})
};

function test_invalid_action(physical_server, appliance) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  let payload = {action: "invalid_action"};

  pytest.raises(
    Exception,
    {match: "Api::BadRequestError"},
    () => appliance.rest_api.post(physical_server.href, {None: payload})
  )
};

function test_refresh_physical_server(appliance, physical_server) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  if (!physical_server.action.getattr("refresh").call()) throw new ();
  assert_response(appliance)
};

let actions = [
  ["power_off", "power_state", "off"],
  ["power_on", "power_state", "on"],
  ["power_off_now", "power_state", "off"],
  ["restart", "power_state", "on"],
  ["restart_now", "power_state", "on"],
  ["blink_loc_led", "location_led_state", "Blinking"],
  ["turn_on_loc_led", "location_led_state", "On"],
  ["turn_off_loc_led", "location_led_state", "Off"]
];

function test_server_actions(physical_server, appliance, provider, action, verification_attr, desired_state) {
  //  Test the physical server actions sending the action request, waiting the task be complete on MiQ
  //       and then waiting the state of some attribute of physical server be change
  //   Params:
  //       * action:            the action to be perform against the Physical Server
  //       * verification_attr: the physical server attribute that will be change by the action
  //       * desired_state:     the value of the attribute after the action execution
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  let condition = () => {
    let server_attr = get_server_attr(
      verification_attr,
      provider,
      method("physical_server")
    );

    return server_attr.downcase() == desired_state.downcase()
  };

  if (!physical_server.action.getattr(action).call()) throw new ();
  assert_response(appliance);
  wait_for(method("condition"), {num_sec: TIMEOUT, delay: DELAY})
}
