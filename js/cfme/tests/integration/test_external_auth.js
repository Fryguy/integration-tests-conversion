require_relative("gevent/timeout");
include(Gevent.Timeout);
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/auth");
include(Cfme.Utils.Auth);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
let pytestmark = [test_requirements.auth];

function freeipa_provider() {
  let auth_prov = get_auth_crud("freeipa03");
  let cmd = auth_prov.ssh_client.run_command("systemctl stop ntpd");
  if (!cmd.success) throw new ();
  yield(auth_prov);
  cmd = auth_prov.ssh_client.run_command("systemctl start ntpd");
  if (!cmd.success) throw new ()
};

function test_appliance_console_ipa_ntp(request, appliance, freeipa_provider) {
  // 
  //   Try to setup IPA on appliance when NTP daemon is stopped on server.
  // 
  //   Bugzilla:
  //       1767082
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Auth
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       caseposneg: negative
  //       setup:
  //           1. Have IPA server configured and running
  //               - https://mojo.redhat.com/docs/DOC-1058778
  //       testSteps:
  //           1. ssh into IPA server stop NTP daemon
  //           2. ssh to appliance and try to setup IPA
  //               - appliance_console_cli --ipaserver <IPA_URL> --ipaprincipal <LOGIN>
  //                   --ipapassword <PASS> --ipadomain <DOMAIN> --iparealm <REALM>
  //       expectedResults:
  //           1. NTP daemon stopped
  //           2. Command should fail; setting up IPA unsuccessful
  //   
  request.addfinalizer(appliance.disable_freeipa);

  pytest.raises(
    [Timeout, RuntimeError],
    () => appliance.configure_freeipa(freeipa_provider)
  )
}
