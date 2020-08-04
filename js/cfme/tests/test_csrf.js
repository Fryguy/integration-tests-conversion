require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.general_ui];

function test_csrf_post(appliance) {
  // CSRF should prevent forged POST requests
  // 
  //   POST requests use the CSRF token to validate requests, so setting the token
  //   to something invalid should set off the CSRF detector and reject the request
  // 
  // 
  //   Polarion:
  //       assignee: pvala
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let dashboard = navigate_to(appliance.server, "Dashboard");
  dashboard.csrf_token = "Bogus!";
  dashboard.reset_widgets({cancel: false});

  try {
    wait_for(() => dashboard.logged_out, {num_sec: 15, delay: 0.2})
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      pytest.fail("CSRF attack succeeded!")
    } else {
      throw $EXCEPTION
    }
  }
}
