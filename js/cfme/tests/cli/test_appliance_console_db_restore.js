require("None");
require_relative("wait_for");
include(Wait_for);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/fixtures/cli");
include(Cfme.Fixtures.Cli);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/utils/appliance/console");
include(Cfme.Utils.Appliance.Console);
require_relative("cfme/utils/appliance/console");
include(Cfme.Utils.Appliance.Console);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/browser");
include(Cfme.Utils.Browser);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/ssh_expect");
include(Cfme.Utils.Ssh_expect);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);
let pytestmark = [test_requirements.restore];

const TimedCommand = namedtuple(
  "TimedCommand",
  ["command", "timeout"]
);

let evm_log = "/var/www/miq/vmdb/log/evm.log";

function provision_vm(request, provider) {
  // Function to provision appliance to the provider being tested
  let vm_name = fauxfactory.gen_alphanumeric(
    16,
    {start: "test_rest_db_"}
  );

  let coll = provider.appliance.provider_based_collection(
    provider,
    {coll_type: "vms"}
  );

  let vm = coll.instantiate(vm_name, provider);
  request.addfinalizer(vm.cleanup_on_provider);

  if (is_bool(!provider.mgmt.does_vm_exist(vm_name))) {
    logger.info("deploying %s on provider %s", vm_name, provider.key);
    vm.create_on_provider({allow_skip: "default"})
  } else {
    logger.info(
      "recycling deployed vm %s on provider %s",
      vm_name,
      provider.key
    )
  };

  vm.provider.refresh_provider_relationships();
  return vm
};

function get_appliances_with_providers(temp_appliances_unconfig_funcscope_rhevm) {
  // Returns two database-owning appliances, configures first appliance with providers and
  //   takes a backup on the first one prior to running tests.
  //   
  let [appl1, appl2] = temp_appliances_unconfig_funcscope_rhevm;
  appl1.configure({region: 0});
  appl2.configure({region: 0});

  for (let app in temp_appliances_unconfig_funcscope_rhevm) {
    app.wait_for_web_ui();
    app.wait_for_api_available()
  };

  provider_app_crud(VMwareProvider, appl1).setup();
  provider_app_crud(OpenStackProvider, appl1).setup();
  appl1.db.backup();
  appl1.wait_for_web_ui();
  appl1.wait_for_api_available();
  return temp_appliances_unconfig_funcscope_rhevm
};

function get_appliance_with_ansible(temp_appliance_preconfig_funcscope) {
  // Returns database-owning appliance, enables embedded ansible,
  //   waits for the ansbile to get ready, takes a backup prior to running
  //   tests.
  //   
  let appl1 = temp_appliance_preconfig_funcscope;
  appl1.enable_embedded_ansible_role();
  appl1.wait_for_embedded_ansible();
  appl1.db.backup();
  appl1.wait_for_web_ui();
  appl1.wait_for_api_available();
  return temp_appliance_preconfig_funcscope
};

function get_ext_appliances_with_providers(temp_appliances_unconfig_funcscope_rhevm, app_creds_modscope) {
  // Returns two database-owning appliances, configures first appliance with providers and
  //   takes a backup prior to running tests.
  // 
  //   
  let [appl1, appl2] = temp_appliances_unconfig_funcscope_rhevm;
  let app_ip = appl1.hostname;
  appl1.configure({region: 0});
  appl1.wait_for_web_ui();
  appl1.wait_for_api_available();

  appl2.appliance_console_cli.configure_appliance_external_join(
    app_ip,
    app_creds_modscope.username,
    app_creds_modscope.password,
    "vmdb_production",
    app_ip,
    app_creds_modscope.sshlogin,
    app_creds_modscope.sshpass
  );

  appl2.wait_for_web_ui();
  provider_app_crud(VMwareProvider, appl1).setup();
  provider_app_crud(OpenStackProvider, appl1).setup();
  appl1.db.backup();
  return temp_appliances_unconfig_funcscope_rhevm
};

function get_ha_appliances_with_providers(unconfigured_appliances, app_creds) {
  // Configure HA environment
  // 
  //   Appliance one configuring dedicated database, 'ap' launch appliance_console,
  //   '' clear info screen, '7' setup db, '1' Creates v2_key, '1' selects internal db,
  //   '2' use partition, 'y' create dedicated db, 'pwd' db password, 'pwd' confirm db password + wait
  //   360 secs and '' finish.
  // 
  //   Appliance two creating region in dedicated database, 'ap' launch appliance_console, '' clear
  //   info screen, '7' setup db, '2' fetch v2_key, 'app0_ip' appliance ip address, '' default user,
  //   'pwd' appliance password, '' default v2_key location, '2' create region in external db, '0' db
  //   region number, 'y' confirm create region in external db 'app0_ip', '' ip and default port for
  //   dedicated db, '' use default db name, '' default username, 'pwd' db password, 'pwd' confirm db
  //   password + wait 360 seconds and '' finish.
  // 
  //   Appliance one configuring primary node for replication, 'ap' launch appliance_console, '' clear
  //   info screen, '8' configure db replication, '1' configure node as primary, '1' cluster node
  //   number set to 1, '' default dbname, '' default user, 'pwd' password, 'pwd' confirm password,
  //   'app0_ip' primary appliance ip, confirm settings and wait 360 seconds to configure, '' finish.
  // 
  // 
  //   Appliance three configuring standby node for replication, 'ap' launch appliance_console, ''
  //   clear info screen, '8' configure db replication, '1' configure node as primary, '1' cluster node
  //   number set to 1, '' default dbname, '' default user, 'pwd' password, 'pwd' confirm password,
  //   'app0_ip' primary appliance ip, confirm settings and wait 360 seconds to configure, '' finish.
  // 
  // 
  //   Appliance two configuring automatic failover of database nodes, 'ap' launch appliance_console,
  //   '' clear info screen '10' configure application database failover monitor, '1' start failover
  //   monitor. wait 30 seconds for service to start '' finish.
  // 
  //   
  let [appl1, appl2, appl3] = unconfigured_appliances;
  let app0_ip = appl1.hostname;
  let app1_ip = appl2.hostname;
  let pwd = app_creds.password;

  let command_set = [
    "ap",
    "",
    "7",
    "1",
    "1",
    "2",
    "y",
    pwd,
    TimedCommand(pwd, 360),
    ""
  ];

  appl1.appliance_console.run_commands(command_set);
  Wait_for.wait_for(() => appl1.db.is_dedicated_active);

  command_set = [
    "ap",
    "",
    "7",
    "2",
    app0_ip,
    "",
    pwd,
    "",
    "2",
    "0",
    "y",
    app0_ip,
    "",
    "",
    "",
    TimedCommand(pwd, 360),
    ""
  ];

  appl3.appliance_console.run_commands(command_set);
  appl3.evmserverd.wait_for_running();
  appl3.wait_for_web_ui();

  command_set = [
    "ap",
    "",
    "8",
    "1",
    "1",
    "",
    "",
    pwd,
    pwd,
    app0_ip,
    TimedCommand("y", 60),
    ""
  ];

  appl1.appliance_console.run_commands(command_set);

  command_set = [
    "ap",
    "",
    "8",
    "2",
    "2",
    app0_ip,
    "",
    pwd,
    "",
    "2",
    "2",
    "",
    "",
    pwd,
    pwd,
    app0_ip,
    app1_ip,
    "y",
    TimedCommand("y", 60),
    ""
  ];

  appl2.appliance_console.run_commands(command_set);

  waiting_for_ha_monitor_started(
    appl3,
    app1_ip,
    {timeout: 300},

    () => {
      command_set = ["ap", "", "10", TimedCommand("1", 30), ""];
      appl3.appliance_console.run_commands(command_set)
    }
  );

  provider_app_crud(VMwareProvider, appl3).setup();
  provider_app_crud(OpenStackProvider, appl3).setup();
  appl1.db.backup();
  return unconfigured_appliances
};

function fetch_v2key(appl1, appl2) {
  let rand_v2_filename = `/tmp/v2_key_${fauxfactory.gen_alphanumeric()}`;
  let rand_yml_filename = `/tmp/database_yml_${fauxfactory.gen_alphanumeric()}`;

  appl1.ssh_client.get_file(
    "/var/www/miq/vmdb/certs/v2_key",
    rand_v2_filename
  );

  appl2.ssh_client.put_file(
    rand_v2_filename,
    "/var/www/miq/vmdb/certs/v2_key"
  );

  appl1.ssh_client.get_file(
    "/var/www/miq/vmdb/config/database.yml",
    rand_yml_filename
  );

  appl2.ssh_client.put_file(
    rand_yml_filename,
    "/var/www/miq/vmdb/config/database.yml"
  )
};

function fetch_db_local(appl1, appl2, file_name) {
  let dump_filename = `/tmp/db_dump_${fauxfactory.gen_alphanumeric()}`;
  appl1.ssh_client.get_file(file_name, dump_filename);
  appl2.ssh_client.put_file(dump_filename, file_name)
};

function two_appliances_one_with_providers(temp_appliances_preconfig_funcscope) {
  // Requests two configured appliances from sprout.
  let [appl1, appl2] = temp_appliances_preconfig_funcscope;
  provider_app_crud(VMwareProvider, appl1).setup();
  provider_app_crud(OpenStackProvider, appl1).setup();
  return [appl1, appl2]
};

function restore_db(appl, { location = "" }) {
  SSHExpect(appl, (interaction) => {
    interaction.send("ap");
    interaction.answer("Press any key to continue.", "", {timeout: 40});

    interaction.answer(
      "Choose the advanced setting: ",
      VersionPicker({LOWEST: "6", "5.11.2.1": 4})
    );

    interaction.answer(
      re.escape("Choose the restore database file source: |1| "),
      "1"
    );

    interaction.answer(
      re.escape("Enter the location of the local restore file: |/tmp/evm_db.backup| "),
      location
    );

    interaction.answer(
      re.escape("Should this file be deleted after completing the restore? (Y/N): "),
      "N"
    );

    interaction.answer(
      re.escape("Are you sure you would like to restore the database? (Y/N): "),
      "Y"
    );

    interaction.answer("Press any key to continue.", "", {timeout: 60})
  })
};

function test_appliance_console_dump_restore_db_local(request, get_appliances_with_providers) {
  //  Test single appliance dump and restore, configures appliance with providers,
  //   dumps a database, restores it to fresh appliance and checks for matching providers.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Configuration
  //       caseimportance: critical
  //       initialEstimate: 1/2h
  //   
  let [appl1, appl2] = get_appliances_with_providers;
  fetch_v2key(appl1, appl2);
  fetch_db_local(appl1, appl2, "/tmp/evm_db.backup");
  appl2.evmserverd.stop();
  appl2.db.drop();
  appl2.db.create();
  restore_db(appl2);
  appl2.evmserverd.start();
  appl2.wait_for_web_ui();
  appl2.wait_for_api_available();

  if (new Set(appl2.managed_provider_names) != new Set(appl1.managed_provider_names)) {
    throw "Restored DB is missing some providers"
  };

  let virtual_crud = provider_app_crud(VMwareProvider, appl2);
  let vm = provision_vm(request, virtual_crud);
  if (!vm.mgmt.is_running) throw "vm not running"
};

function test_appliance_console_backup_restore_db_local(request, two_appliances_one_with_providers) {
  //  Test single appliance backup and restore, configures appliance with providers,
  //   backs up database, restores it to fresh appliance and checks for matching providers.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Configuration
  //       caseimportance: critical
  //       initialEstimate: 1/2h
  //   
  let [appl1, appl2] = two_appliances_one_with_providers;
  let appl1_provider_names = new Set(appl1.managed_provider_names);
  let backup_file_name = `/tmp/backup.${fauxfactory.gen_alphanumeric()}.dump`;
  appl1.db.backup(backup_file_name);
  fetch_v2key(appl1, appl2);
  fetch_db_local(appl1, appl2, backup_file_name);
  appl2.evmserverd.stop();
  appl2.db.drop();
  appl2.db.create();

  SSHExpect(appl2, (interaction) => {
    interaction.send("ap");
    interaction.answer("Press any key to continue.", "", {timeout: 40});

    interaction.answer(
      "Choose the advanced setting: ",
      VersionPicker({LOWEST: "6", "5.11.2.1": 4})
    );

    interaction.answer(
      re.escape("Choose the restore database file source: |1| "),
      ""
    );

    interaction.answer(
      re.escape("Enter the location of the local restore file: |/tmp/evm_db.backup| "),
      backup_file_name
    );

    interaction.answer(
      re.escape("Should this file be deleted after completing the restore? (Y/N): "),
      "n"
    );

    interaction.answer(
      re.escape("Are you sure you would like to restore the database? (Y/N): "),
      "y"
    );

    interaction.answer("Press any key to continue.", "", {timeout: 80})
  });

  appl2.evmserverd.start();
  appl2.wait_for_web_ui();
  appl2.wait_for_api_available();

  if (new Set(appl2.managed_provider_names) != appl1_provider_names) {
    throw "Restored DB is missing some providers"
  };

  let virtual_crud = provider_app_crud(VMwareProvider, appl2);
  let vm = provision_vm(request, virtual_crud);
  if (!vm.mgmt.is_running) throw "vm not running"
};

function test_appliance_console_restore_pg_basebackup_ansible(get_appliance_with_ansible) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Configuration
  //       caseimportance: critical
  //       initialEstimate: 1/2h
  //   
  let appl1 = get_appliance_with_ansible;
  appl1.evmserverd.stop();
  appl1.db_service.restart();
  restore_db(appl1, {location: "/tmp/evm_db.backup"});
  manager.quit();
  appl1.evmserverd.start();
  appl1.wait_for_web_ui();
  appl1.wait_for_api_available();
  appl1.wait_for_embedded_ansible();
  let repositories = appl1.collections.ansible_repositories;

  try {
    let repository = repositories.create({
      name: "example",
      url: cfme_data.ansible_links.playbook_repositories.console_db,
      description: "example"
    })
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip("Skipping since no such key found in yaml")
    } else {
      throw $EXCEPTION
    }
  };

  let view = navigate_to(repository, "Details");
  let refresh = view.toolbar.refresh.click;

  Wait_for.wait_for(
    () => (
      view.entities.summary("Properties").get_text_of("Status") == "successful"
    ),

    {
      timeout: 60,
      fail_func: refresh,
      message: "Check if playbook repo added"
    }
  )
};

function test_appliance_console_restore_pg_basebackup_replicated(request, replicated_appliances_with_providers) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Configuration
  //       caseimportance: critical
  //       initialEstimate: 1/2h
  //       upstream: no
  //   
  let [appl1, appl2] = replicated_appliances_with_providers;
  appl1.db.backup();
  appl2.db.backup();
  let providers_before_restore = new Set(appl1.managed_provider_names);
  appl2.set_pglogical_replication({replication_type: ":none"});
  appl1.set_pglogical_replication({replication_type: ":none"});
  appl1.evmserverd.stop();
  appl2.evmserverd.stop();
  appl1.db_service.restart();
  appl2.db_service.restart();
  restore_db(appl1, {location: "/tmp/evm_db.backup"});
  restore_db(appl2, {location: "/tmp/evm_db.backup"});
  appl1.evmserverd.start();
  appl2.evmserverd.start();
  appl1.wait_for_web_ui();
  appl2.wait_for_web_ui();
  appl1.wait_for_api_available();
  appl2.wait_for_api_available();

  if (providers_before_restore != new Set(appl1.managed_provider_names)) {
    throw "Restored DB is missing some providers"
  };

  if (providers_before_restore != new Set(appl2.managed_provider_names)) {
    throw "Restored DB is missing some providers"
  };

  let virtual_crud_appl1 = provider_app_crud(VMwareProvider, appl1);
  let virtual_crud_appl2 = provider_app_crud(VMwareProvider, appl2);
  let vm1 = provision_vm(request, virtual_crud_appl1);
  let vm2 = provision_vm(request, virtual_crud_appl2);
  if (!vm1.mgmt.is_running) throw "vm not running";
  if (!vm2.mgmt.is_running) throw "vm not running"
};

function test_appliance_console_restore_db_external(request, get_ext_appliances_with_providers) {
  // Configure ext environment with providers, run backup/restore on configuration,
  //   Confirm that providers still exist after restore and provisioning works.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Configuration
  //       caseimportance: critical
  //       initialEstimate: 1h
  //   
  let [appl1, appl2] = get_ext_appliances_with_providers;
  let providers_before_restore = new Set(appl1.managed_provider_names);
  appl2.evmserverd.stop();
  appl1.evmserverd.stop();
  appl1.db_service.restart();
  appl1.db.drop();
  appl1.db.create();
  restore_db(appl1);
  appl1.evmserverd.start();
  appl1.wait_for_web_ui();
  appl2.evmserverd.start();
  appl2.wait_for_web_ui();

  if (providers_before_restore != new Set(appl1.managed_provider_names)) {
    throw "Restored DB is missing some providers"
  };

  if (providers_before_restore != new Set(appl2.managed_provider_names)) {
    throw "Restored DB is missing some providers"
  };

  let virtual_crud_appl1 = provider_app_crud(VMwareProvider, appl1);
  let virtual_crud_appl2 = provider_app_crud(VMwareProvider, appl2);
  let vm1 = provision_vm(request, virtual_crud_appl1);
  let vm2 = provision_vm(request, virtual_crud_appl2);
  if (!vm1.mgmt.is_running) throw "vm not running";
  if (!vm2.mgmt.is_running) throw "vm not running"
};

function test_appliance_console_restore_db_replicated(request, replicated_appliances_with_providers) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Configuration
  //       initialEstimate: 1h
  //   
  let [appl1, appl2] = replicated_appliances_with_providers;
  appl1.db.backup();
  appl2.db.backup();
  let providers_before_restore = new Set(appl1.managed_provider_names);
  appl2.evmserverd.stop();
  restore_db(appl2);
  appl1.set_pglogical_replication({replication_type: ":none"});
  appl1.evmserverd.stop();
  appl1.db.drop();
  appl1.db.create();
  restore_db(appl1);
  appl1.evmserverd.start();
  appl2.evmserverd.start();
  appl1.wait_for_web_ui();
  appl2.wait_for_web_ui();
  appl1.wait_for_api_available();
  appl2.wait_for_api_available();
  appl2.set_pglogical_replication({replication_type: ":none"});
  let expected_providers = (appl2.version < "5.11" ? [] : ["Embedded Ansible"]);
  if (appl2.managed_provider_names != expected_providers) throw new ();
  appl2.set_pglogical_replication({replication_type: ":global"});
  appl2.add_pglogical_replication_subscription(appl1.hostname);

  if (providers_before_restore != new Set(appl1.managed_provider_names)) {
    throw new ()
  };

  Wait_for.wait_for(
    () => providers_before_restore == new Set(appl2.managed_provider_names),
    {timeout: 20}
  );

  let virtual_crud_appl1 = provider_app_crud(VMwareProvider, appl1);
  let virtual_crud_appl2 = provider_app_crud(VMwareProvider, appl2);
  let vm1 = provision_vm(request, virtual_crud_appl1);
  let vm2 = provision_vm(request, virtual_crud_appl2);
  if (!vm1.mgmt.is_running) throw "vm not running";
  if (!vm2.mgmt.is_running) throw "vm not running"
};

function test_appliance_console_restore_db_ha(request, unconfigured_appliances, app_creds) {
  // Configure HA environment with providers, run backup/restore on configuration,
  //   Confirm that ha failover continues to work correctly and providers still exist.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //   Bugzilla:
  //       1693189
  //       1740515
  //   
  let pwd = app_creds.password;

  let [appl1, appl2, appl3] = configure_appliances_ha(
    unconfigured_appliances,
    pwd
  );

  provider_app_crud(VMwareProvider, appl3).setup();
  provider_app_crud(OpenStackProvider, appl3).setup();
  appl1.db.backup();
  let providers_before_restore = new Set(appl3.managed_provider_names);
  appl3.evmserverd.stop();
  appl1.repmgr.stop();
  appl2.repmgr.stop();
  appl1.db.drop();
  appl1.db.create();
  fetch_v2key(appl3, appl1);
  restore_db(appl1);
  appl1.appliance_console.reconfigure_primary_replication_node(pwd);

  appl2.appliance_console.reconfigure_standby_replication_node(
    pwd,
    appl1.hostname
  );

  appl3.appliance_console.configure_automatic_failover({primary_ip: appl1.hostname});
  appl3.evm_failover_monitor.restart();
  appl3.evmserverd.start();
  appl3.wait_for_web_ui();
  appl3.wait_for_api_available();

  if (providers_before_restore != new Set(appl3.managed_provider_names)) {
    throw "Restored DB is missing some providers"
  };

  LogValidator(evm_log, {
    matched_patterns: ["Starting to execute failover"],
    hostname: appl3.hostname
  }).waiting({timeout: 450}, () => appl1.db_service.stop());

  appl3.evmserverd.wait_for_running();
  appl3.wait_for_web_ui();
  appl3.wait_for_api_available();

  if (providers_before_restore != new Set(appl3.managed_provider_names)) {
    throw "Restored DB is missing some providers"
  };

  let virtual_crud = provider_app_crud(VMwareProvider, appl3);
  let vm = provision_vm(request, virtual_crud);
  if (!vm.mgmt.is_running) throw "vm not running"
};

function test_appliance_console_restore_db_nfs(request, two_appliances_one_with_providers, utility_vm, utility_vm_nfs_ip) {
  //  Test single appliance backup and restore through nfs, configures appliance with providers,
  //       backs up database, restores it to fresh appliance and checks for matching providers.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Configuration
  //       caseimportance: critical
  //       initialEstimate: 1h
  // 
  //   Bugzilla:
  //       1633573
  //   
  let [appl1, appl2] = two_appliances_one_with_providers;
  let [vm, _, data] = utility_vm;
  let host = utility_vm_nfs_ip;
  let loc = data.network_share.nfs.path;
  let nfs_dump_file_name = `/tmp/backup.${fauxfactory.gen_alphanumeric()}.dump`;
  let nfs_restore_dir_path = `nfs://${host}${loc}`;
  let nfs_restore_file_path = `${nfs_restore_dir_path}/db_backup/${nfs_dump_file_name}`;
  fetch_v2key(appl1, appl2);
  let appl1_provider_names = new Set(appl1.managed_provider_names);

  SSHExpect(appl1, (interaction) => {
    appl1.evmserverd.stop();
    interaction.send("ap");
    interaction.answer("Press any key to continue.", "", {timeout: 40});

    interaction.answer(
      "Choose the advanced setting: ",
      VersionPicker({LOWEST: "4", "5.11.2.1": 2})
    );

    interaction.answer(
      "Choose the backup output file destination: \\|1\\| ",
      "2"
    );

    interaction.answer(
      "Enter the location to save the backup file to: \\|.*\\| ",
      nfs_dump_file_name
    );

    interaction.answer(
      re.escape("Example: nfs://host.mydomain.com/exported/my_exported_folder/db.backup: "),
      nfs_restore_dir_path
    );

    interaction.answer("Press any key to continue.", "", {timeout: 240})
  });

  appl2.evmserverd.stop();
  appl2.db.drop();
  appl2.db.create();

  SSHExpect(appl2, (interaction) => {
    interaction.send("ap");
    interaction.answer("Press any key to continue.", "", {timeout: 40});

    interaction.answer(
      "Choose the advanced setting: ",
      VersionPicker({LOWEST: "6", "5.11.2.1": 4})
    );

    interaction.answer(
      "Choose the restore database file source: \\|1\\| ",
      "2"
    );

    interaction.answer(
      re.escape("Example: nfs://host.mydomain.com/exported/my_exported_folder/db.backup: "),
      nfs_restore_file_path
    );

    interaction.answer(
      "Are you sure you would like to restore the database\\? \\(Y\\/N\\): ",
      "y"
    );

    interaction.answer("Press any key to continue.", "", {timeout: 80})
  });

  appl2.evmserverd.start();
  appl2.wait_for_web_ui();
  appl2.wait_for_api_available();

  if (new Set(appl2.managed_provider_names) != appl1_provider_names) {
    throw "Restored DB is missing some providers"
  };

  let virtual_crud = provider_app_crud(VMwareProvider, appl2);
  vm = provision_vm(request, virtual_crud);
  if (!vm.mgmt.is_running) throw "vm not running"
};

function test_appliance_console_restore_db_samba(request, two_appliances_one_with_providers, utility_vm, utility_vm_samba_ip) {
  //  Test single appliance backup and restore through smb, configures appliance with providers,
  //       backs up database, restores it to fresh appliance and checks for matching providers.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Configuration
  //       caseimportance: critical
  //       initialEstimate: 1h
  //   
  let [appl1, appl2] = two_appliances_one_with_providers;
  let [_, _, data] = utility_vm;
  let host = utility_vm_samba_ip;
  let loc = data.network_share.smb.path;
  let smb_dump_file_name = `/tmp/backup.${fauxfactory.gen_alphanumeric()}.dump`;
  let smb_restore_dir_path = `smb://${host}${loc}`;
  let smb_restore_file_path = `${smb_restore_dir_path}/db_backup/${smb_dump_file_name}`;
  let creds_key = data.network_share.smb.credentials;
  let pwd = credentials[creds_key].password;
  let usr = credentials[creds_key].username;
  fetch_v2key(appl1, appl2);
  let appl1_provider_names = new Set(appl1.managed_provider_names);

  SSHExpect(appl1, (interaction) => {
    appl1.evmserverd.stop();
    interaction.send("ap");
    interaction.answer("Press any key to continue.", "", {timeout: 40});

    interaction.answer(
      "Choose the advanced setting: ",
      VersionPicker({LOWEST: "4", "5.11.2.1": 2})
    );

    interaction.answer(
      "Choose the backup output file destination: \\|1\\| ",
      "3"
    );

    interaction.answer(
      "Enter the location to save the backup file to: \\|.*\\| ",
      smb_dump_file_name
    );

    interaction.answer(
      re.escape("Example: smb://host.mydomain.com/my_share/daily_backup/db.backup: "),
      smb_restore_dir_path
    );

    interaction.answer(re.escape("Example: 'mydomain.com/user': "), usr);
    interaction.answer(re.escape(`Enter the password for ${usr}: `), pwd);
    interaction.answer("Press any key to continue.", "", {timeout: 120})
  });

  appl2.evmserverd.stop();
  appl2.db.drop();
  appl2.db.create();

  SSHExpect(appl2, (interaction) => {
    interaction.send("ap");
    interaction.answer("Press any key to continue.", "", {timeout: 40});

    interaction.answer(
      "Choose the advanced setting: ",
      VersionPicker({LOWEST: "6", "5.11.2.1": 4})
    );

    interaction.answer(
      "Choose the restore database file source: \\|1\\| ",
      "3"
    );

    interaction.answer(
      re.escape("Example: smb://host.mydomain.com/my_share/daily_backup/db.backup: "),
      smb_restore_file_path
    );

    interaction.answer(re.escape("Example: 'mydomain.com/user': "), usr);
    interaction.answer(re.escape(`Enter the password for ${usr}: `), pwd);

    interaction.answer(
      "Are you sure you would like to restore the database\\? \\(Y\\/N\\): ",
      "y"
    );

    interaction.answer("Press any key to continue.", "", {timeout: 80})
  });

  appl2.evmserverd.start();
  appl2.wait_for_web_ui();
  appl2.wait_for_api_available();

  if (new Set(appl2.managed_provider_names) != appl1_provider_names) {
    throw "Restored DB is missing some providers"
  };

  let virtual_crud = provider_app_crud(VMwareProvider, appl2);
  let vm = provision_vm(request, virtual_crud);
  if (!vm.mgmt.is_running) throw "vm not running"
}
