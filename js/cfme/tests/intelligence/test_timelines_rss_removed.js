require_relative("selenium/common/exceptions");
include(Selenium.Common.Exceptions);
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [test_requirements.timelines];

function test_timelines_removed(appliance) {
  // 
  //   Test that Cloud Intel->Timelines have been removed in upstream and 5.11 builds.
  //   Designed to pass for CFME 5.10.
  // 
  //   Bugzilla:
  //       1672933
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/12h
  //       casecomponent: WebUI
  //       caseimportance: medium
  //   
  if (is_bool(appliance.is_downstream && appliance.version < "5.11")) {
    navigate_to(appliance.server, "CloudIntelTimelines")
  } else {
    pytest.raises(
      NoSuchElementException,
      () => navigate_to(appliance.server, "CloudIntelTimelines")
    )
  }
};

function test_rss_removed(appliance) {
  // 
  //   Test that Cloud Intel->RSS has been removed in upstream and 5.11 builds.
  //   Designed to pass for CFME 5.10.
  // 
  //   Bugzilla:
  //       1672933
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/12h
  //       casecomponent: WebUI
  //       caseimportance: medium
  //   
  if (is_bool(appliance.is_downstream && appliance.version < "5.11")) {
    navigate_to(appliance.server, "RSS")
  } else {
    pytest.raises(
      NoSuchElementException,
      () => navigate_to(appliance.server, "RSS")
    )
  }
}
