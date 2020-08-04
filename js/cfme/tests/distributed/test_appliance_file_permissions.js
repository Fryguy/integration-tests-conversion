require_relative("cfme");
include(Cfme);
let pytestmark = [test_requirements.distributed];

function test_v2_key_permissions(appliance) {
  // Verifies that the v2_key has proper permissions
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       initialEstimate: 1/60h
  //   
  let stdout = (appliance.ssh_client.run_command("stat --format '%a' /var/www/miq/vmdb/certs/v2_key")).output;
  if (stdout.to_i != 400) throw new ()
}
