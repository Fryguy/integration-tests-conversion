require_relative("cfme");
include(Cfme);

function test_fixauth_dryrun_has_feedback(temp_appliance_preconfig) {
  // 
  //   Check whether the fixauth says it is running in dry mode
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Appliance
  //       initialEstimate: 1/60h
  // 
  //   Bugzilla:
  //       1577303
  //   
  let appliance = temp_appliance_preconfig;
  let run_command = appliance.ssh_client.run_command;
  let dry_run_message = "is executing in dry-run mode, and no actual changes will be made **";

  if (!(run_command.call("fix_auth -d")).output.include(dry_run_message)) {
    throw new ()
  };

  if (!(run_command.call("fix_auth -d -i invalid")).output.include(dry_run_message)) {
    throw new ()
  };

  if (!(run_command.call("fix_auth -d --databaseyml")).output.include(dry_run_message)) {
    throw new ()
  };

  if (!!run_command.call("fix_auth").output.include(dry_run_message)) {
    throw new ()
  }
}
