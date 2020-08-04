require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider], {scope: "module"})
];

function physical_server(setup_provider_modscope, appliance) {
  let physical_server = appliance.rest_api.collections.physical_servers[0];
  return physical_server
};

function test_get_hardware(appliance, physical_server) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  physical_server.reload({attributes: ["hardware"]});
  assert_response(appliance);
  if (!!physical_server.hardware.equal(null)) throw new ()
};

function test_get_hardware_attributes(appliance, physical_server, attribute) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  let expanded_attribute = `hardware.${attribute}`;
  physical_server.reload({attributes: [expanded_attribute]});
  assert_response(appliance);
  if (!!physical_server.hardware[attribute].equal(null)) throw new ()
};

function test_get_asset_detail(appliance, physical_server) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //   
  physical_server.reload({attributes: ["asset_detail"]});
  assert_response(appliance);
  if (!!physical_server.asset_detail.equal(null)) throw new ()
}
