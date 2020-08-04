require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.configuration,
  pytest.mark.rhel_testing,
  pytest.mark.tier(3)
];

function test_send_test_email(smtp_test, random_string, appliance) {
  //  This test checks whether the mail sent for testing really arrives.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       caseimportance: critical
  //       initialEstimate: 1/10h
  //   
  let e_mail = random_string + "@email.test";
  appliance.server.settings.send_test_email({email: e_mail});

  wait_for(
    () => smtp_test.get_emails({to_address: e_mail}).size > 0,
    {num_sec: 60}
  )
}
