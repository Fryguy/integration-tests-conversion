require_relative("cfme");
include(Cfme);
require_relative("cfme/configure");
include(Cfme.Configure);
let pytestmark = [test_requirements.general_ui];

function test_about_region(appliance) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       testSteps:
  //           1. Open `About` modal and check the value of Region.
  // 
  //   Bugzilla:
  //       1402112
  //   
  let about_version = about.get_detail(about.REGION, appliance.server);
  if (about_version != appliance.region()[-1]) throw new ()
};

function test_about_zone(appliance) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       testSteps:
  //           1. Open `About` modal and check the value of Zone.
  // 
  //   Bugzilla:
  //       1402112
  //   
  let about_version = about.get_detail(about.ZONE, appliance.server);
  if (about_version != appliance.server.zone.name) throw new ()
}
