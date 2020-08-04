require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
const TimeZone = namedtuple("TimeZone", ["friendly", "machine"]);
let pytestmark = [pytest.mark.tier(3), test_requirements.settings];

let colors = [
  "Orange",
  "Yellow",
  "Green",
  "Blue",
  "ManageIQ-Blue",
  "Black"
];

let test_timezone = TimeZone.call({
  friendly: "(GMT-10:00) Hawaii",
  machine: "-1000"
});

function set_timezone(appliance) {
  let old_time_zone = appliance.user.my_settings.visual.timezone;
  appliance.user.my_settings.visual.timezone = test_timezone.friendly;
  yield;
  appliance.user.my_settings.visual.timezone = old_time_zone
};

function test_timezone_setting(appliance, set_timezone) {
  //  Tests  timezone setting
  // 
  //   Metadata:
  //       test_flag: visuals
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/30h
  //   
  let view = navigate_to(appliance.server, "DiagnosticsDetails");

  if (!view.summary.started_on.text.include(test_timezone.machine)) {
    throw "Timezone settings Failed"
  }
}
