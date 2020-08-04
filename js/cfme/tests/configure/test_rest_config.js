require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [test_requirements.rest, pytest.mark.tier(1)];

function test_update_advanced_settings_new_key(appliance, request) {
  // 
  //   This test case checks updating advanced settings with a new key-value pair
  //   and tests that this change does not break the Configuration page
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Configuration
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  // 
  //   Bugzilla:
  //       1695566
  //   
  let data = {new_key: "new value"};
  appliance.update_advanced_settings(data);

  let _reset_settings = () => {
    data.new_key = "<<reset>>";
    return appliance.update_advanced_settings(data)
  };

  if (!appliance.advanced_settings.include("new_key")) throw new ();
  let view = navigate_to(appliance.server, "Advanced");
  if (!view.is_displayed) throw new ()
}
