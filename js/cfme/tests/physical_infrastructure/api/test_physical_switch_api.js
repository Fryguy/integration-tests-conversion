require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider])
];

function test_get_switch(physical_switch, appliance) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  let existent_switch = appliance.rest_api.get_entity(
    "switches",
    physical_switch.id
  );

  existent_switch.reload();
  assert_response(appliance)
};

function test_get_nonexistent_physical_switch(appliance) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  let nonexistent = appliance.rest_api.get_entity("switches", 999999);

  pytest.raises(
    Exception,
    {match: "ActiveRecord::RecordNotFound"},
    () => nonexistent.reload()
  );

  assert_response(appliance, {http_status: 404})
};

function test_invalid_action(physical_switch, appliance) {
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
    () => appliance.rest_api.post(physical_switch.href, {None: payload})
  )
};

function test_refresh_physical_switch(appliance, physical_switch) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  if (!physical_switch.action.getattr("refresh").call()) throw new ();
  assert_response(appliance)
}
