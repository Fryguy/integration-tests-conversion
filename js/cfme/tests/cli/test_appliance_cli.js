require_relative("wait_for");
include(Wait_for);
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/console");
include(Cfme.Utils.Appliance.Console);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);

let pytestmark = [
  test_requirements.app_console,

  pytest.mark.uncollectif(
    appliance => appliance.is_pod,
    {reason: "cli isn't supported in pod appliance"}
  )
];

let tzs = [
  ["Africa/Abidjan"],
  ["America/Argentina/Buenos_Aires"],
  ["Antarctica/Casey"],
  ["Arctic/Longyearbyen"],
  ["Asia/Aden"],
  ["Atlantic/Azores"],
  ["Australia/Adelaide"],
  ["Europe/Amsterdam"],
  ["Indian/Antananarivo"],
  ["Pacific/Apia"],
  ["UTC"]
];

let evm_log = "/var/www/miq/vmdb/log/evm.log";

function test_appliance_console_cli_datetime(temp_appliance_preconfig_funcscope) {
  // Grab fresh appliance and set time and date through appliance_console_cli and check result
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/6h
  //   
  let app = temp_appliance_preconfig_funcscope;
  app.ssh_client.run_command("appliance_console_cli --datetime 2020-10-20T09:59:00");

  let date_changed = () => (
    (app.ssh_client.run_command("date +%F-%T | grep 2020-10-20-10:00")).success
  );

  Wait_for.wait_for(method("date_changed"))
};

function test_appliance_console_cli_timezone(timezone, temp_appliance_preconfig_modscope) {
  // Set and check timezones are set correctly through appliance conosle cli
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/12h
  //   
  let app = temp_appliance_preconfig_modscope;
  app.ssh_client.run_command(`appliance_console_cli --timezone ${timezone}`);
  app.appliance_console.timezone_check(timezone)
};

function test_appliance_console_cli_set_hostname(configured_appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/12h
  //   
  let hostname = "test.example.com";
  configured_appliance.appliance_console_cli.set_hostname(hostname);
  let result = configured_appliance.ssh_client.run_command("hostname -f");
  if (!result.success) throw new ();
  if (result.output.strip() != hostname) throw new ()
};

function test_appliance_console_cli_internal_fetch_key(app_creds, unconfigured_appliance, appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/3h
  //   
  let fetch_key_ip = appliance.hostname;

  unconfigured_appliance.appliance_console_cli.configure_appliance_internal_fetch_key(
    0,
    "localhost",
    app_creds.username,
    app_creds.password,
    "vmdb_production",
    unconfigured_appliance.unpartitioned_disks[0],
    fetch_key_ip,
    app_creds.sshlogin,
    app_creds.sshpass
  );

  unconfigured_appliance.evmserverd.wait_for_running();
  unconfigured_appliance.wait_for_web_ui()
};

function test_appliance_console_cli_external_join(app_creds, appliance, temp_appliance_unconfig_funcscope) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //   
  let appliance_ip = appliance.hostname;

  temp_appliance_unconfig_funcscope.appliance_console_cli.configure_appliance_external_join(
    appliance_ip,
    app_creds.username,
    app_creds.password,
    "vmdb_production",
    appliance_ip,
    app_creds.sshlogin,
    app_creds.sshpass
  );

  temp_appliance_unconfig_funcscope.evmserverd.wait_for_running();
  temp_appliance_unconfig_funcscope.wait_for_web_ui()
};

function test_appliance_console_cli_external_create(app_creds, dedicated_db_appliance, unconfigured_appliance_secondary) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/3h
  //   
  let hostname = dedicated_db_appliance.hostname;

  unconfigured_appliance_secondary.appliance_console_cli.configure_appliance_external_create(
    5,
    hostname,
    app_creds.username,
    app_creds.password,
    "vmdb_production",
    hostname,
    app_creds.sshlogin,
    app_creds.sshpass
  );

  unconfigured_appliance_secondary.evmserverd.wait_for_running();
  unconfigured_appliance_secondary.wait_for_web_ui()
};

function test_appliance_console_cli_external_auth(auth_type, ipa_crud, configured_appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       casecomponent: Auth
  //       initialEstimate: 1/4h
  //   
  let evm_tail = LogValidator("/var/www/miq/vmdb/log/evm.log", {
    matched_patterns: [`.*${auth_type} to true.*`],
    hostname: configured_appliance.hostname
  });

  evm_tail.start_monitoring();
  let cmd_set = `appliance_console_cli --extauth-opts=\"/authentication/${auth_type}=true\"`;
  if (!configured_appliance.ssh_client.run_command(cmd_set)) throw new ();
  if (!evm_tail.validate({wait: "30s"})) throw new ();

  evm_tail = LogValidator("/var/www/miq/vmdb/log/evm.log", {
    matched_patterns: [`.*${auth_type} to false.*`],
    hostname: configured_appliance.hostname
  });

  evm_tail.start_monitoring();
  let cmd_unset = `appliance_console_cli --extauth-opts=\"/authentication/${auth_type}=false\"`;
  if (!configured_appliance.ssh_client.run_command(cmd_unset)) throw new ();
  if (!evm_tail.validate({wait: "30s"})) throw new ()
};

function no_ipa_config(configured_appliance) {
  // Make sure appliance doesn't have IPA configured
  configured_appliance.appliance_console_cli.uninstall_ipa_client()
};

function test_appliance_console_cli_ipa(ipa_crud, configured_appliance, no_ipa_config) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //       casecomponent: Auth
  //   
  let ipa_args = ipa_crud.as_external_value();
  configured_appliance.appliance_console_cli.configure_ipa({None: ipa_args});
  if (!Wait_for.wait_for(() => configured_appliance.sssd.running)) throw new ();
  configured_appliance.appliance_console_cli.uninstall_ipa_client();
  if (!Wait_for.wait_for(() => !configured_appliance.sssd.running)) throw new ()
};

function test_appliance_console_cli_extend_storage(unconfigured_appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/6h
  //   
  unconfigured_appliance.ssh_client.run_command("appliance_console_cli -t /dev/vdb");

  let is_storage_extended = () => {
    if (!unconfigured_appliance.ssh_client.run_command("df -h | grep /var/www/miq_tmp")) {
      return throw new ()
    }
  };

  Wait_for.wait_for(method("is_storage_extended"))
};

function test_appliance_console_cli_extend_log_storage(unconfigured_appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/6h
  //   
  unconfigured_appliance.ssh_client.run_command("appliance_console_cli -l /dev/vdb");

  let is_storage_extended = () => {
    if (!unconfigured_appliance.ssh_client.run_command("df -h | grep /vg_miq_logs")) {
      return throw new ()
    }
  };

  Wait_for.wait_for(method("is_storage_extended"))
};

function test_appliance_console_cli_configure_dedicated_db(unconfigured_appliance, app_creds) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/6h
  //   
  unconfigured_appliance.appliance_console_cli.configure_appliance_dedicated_db(
    app_creds.username,
    app_creds.password,
    "vmdb_production",
    unconfigured_appliance.unpartitioned_disks[0]
  );

  Wait_for.wait_for(() => unconfigured_appliance.db.is_dedicated_active)
};

function test_appliance_console_cli_ha_crud(unconfigured_appliances, app_creds) {
  // Tests the configuration of HA with three appliances including failover to standby node
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1h
  //   
  let apps = unconfigured_appliances;
  let app0_ip = apps[0].hostname;
  let app1_ip = apps[1].hostname;

  apps[0].appliance_console_cli.configure_appliance_dedicated_db(
    app_creds.username,
    app_creds.password,
    "vmdb_production",
    apps[0].unpartitioned_disks[0]
  );

  Wait_for.wait_for(() => apps[0].db.is_dedicated_active);

  apps[2].appliance_console_cli.configure_appliance_external_create(
    1,
    app0_ip,
    app_creds.username,
    app_creds.password,
    "vmdb_production",
    app0_ip,
    app_creds.sshlogin,
    app_creds.sshpass
  );

  apps[2].evmserverd.wait_for_running();
  apps[2].wait_for_web_ui();

  apps[0].appliance_console_cli.configure_appliance_dedicated_ha_primary(
    app_creds.username,
    app_creds.password,
    "primary",
    app0_ip,
    "1",
    "vmdb_production"
  );

  apps[1].appliance_console_cli.configure_appliance_dedicated_ha_standby(
    app_creds.username,
    app_creds.password,
    "standby",
    app0_ip,
    app1_ip,
    "2",
    "vmdb_production",
    apps[1].unpartitioned_disks[0]
  );

  waiting_for_ha_monitor_started(
    apps[2],
    app1_ip,
    {timeout: 300},

    () => {
      let command_set = ["ap", "", "10", "1", ""];
      apps[2].appliance_console.run_commands(command_set)
    }
  );

  LogValidator(evm_log, {
    matched_patterns: ["Starting to execute failover"],
    hostname: apps[2].hostname
  }).waiting({timeout: 450}, () => {
    let result = apps[0].ssh_client.run_command(
      "systemctl stop $APPLIANCE_PG_SERVICE",
      {timeout: 15}
    );

    if (!result.success) {
      throw `Failed to stop APPLIANCE_PG_SERVICE: ${result.output}`
    }
  });

  apps[2].evmserverd.wait_for_running();
  apps[2].wait_for_web_ui()
}