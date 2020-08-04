require("None");
require_relative("wait_for");
include(Wait_for);
require_relative("cfme");
include(Cfme);
require_relative("cfme/base/ui");
include(Cfme.Base.Ui);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);

let pytestmark = [
  test_requirements.db_migration,

  pytest.mark.uncollectif(
    appliance => appliance.is_dev,
    {reason: "DB migrate tests not valid for dev server"}
  )
];

function pytest_generate_tests(metafunc) {
  if (new Set([
    test_upgrade_single_inplace,
    test_db_migrate_replication,
    test_upgrade_single_sidebyside
  ]).include(metafunc.function)) return;

  let [argnames, argvalues, idlist] = [
    ["db_url", "db_version", "db_desc"],
    [],
    []
  ];

  let db_backups = Cfme.cfme_data.get("db_backups", {});
  if (is_bool(!db_backups)) pytest.skip("No db backup information available!");

  for (let [key, data] in db_backups.to_a()) {
    argvalues.push([data.url, data.version, data.desc]);
    idlist.push(key)
  };

  return metafunc.parametrize({argnames, argvalues, ids: idlist})
};

function temp_appliance_remote(temp_appliance_preconfig_funcscope) {
  // Needed for db_migrate_replication as you can't drop a remote db due to subscription
  let app = temp_appliance_preconfig_funcscope;
  app.evmserverd.stop();
  app.db.extend_partition();
  app.evmserverd.start();
  return app
};

function temp_appliance_global_region(temp_appliance_unconfig_funcscope_rhevm) {
  temp_appliance_unconfig_funcscope_rhevm.appliance_console_cli.configure_appliance_internal(
    99,
    "localhost",
    credentials.database.username,
    credentials.database.password,
    "vmdb_production",
    temp_appliance_unconfig_funcscope_rhevm.unpartitioned_disks[0]
  );

  temp_appliance_unconfig_funcscope_rhevm.evmserverd.wait_for_running();
  temp_appliance_unconfig_funcscope_rhevm.wait_for_web_ui();
  return temp_appliance_unconfig_funcscope_rhevm
};

function appliance_preupdate(temp_appliance_preconfig_funcscope_upgrade, appliance) {
  // Reconfigure appliance partitions and adds repo file for upgrade
  let series = appliance.version.series();
  let update_url = "update_url_{}".format(series.gsub(".", ""));
  temp_appliance_preconfig_funcscope_upgrade.db.extend_partition();
  let urls = cfme_data.basic_info[update_url];
  temp_appliance_preconfig_funcscope_upgrade.ssh_client.run_command(`curl ${urls} -o /etc/yum.repos.d/update.repo`);
  return temp_appliance_preconfig_funcscope_upgrade
};

function guess_the_db_format(basename) {
  if (is_bool(basename.end_with("dumpall"))) {
    return "pg_dumpall"
  } else if (is_bool(basename.end_with("backup") || basename.end_with("dump"))) {
    return "pg_dump"
  } else {
    throw new Exception("Couldn't guess the db format")
  }
};

function download_and_migrate_db(app, db_url) {
  let result;

  let fetch = (src, dst) => {
    let result = app.ssh_client.run_command(
      `curl  --fail -S -o \"${dst}\" \"${src}\"`,
      {timeout: 15}
    );

    if (!result.success) {
      return throw `Failed to download ${src}:\n${result.output}`
    }
  };

  logger.info(`Downloading database: ${db_url}`);
  let url_basename = os_path.basename(db_url);
  let loc = "/tmp/";
  let v2key_url = [os_path.dirname(db_url), "v2_key.bak".os_path.join];

  let database_yml_url = [
    os_path.dirname(db_url),
    "database.yml".os_path.join
  ];

  let db_format = guess_the_db_format(url_basename);
  fetch.call(db_url, `${loc}${url_basename}`);
  app.evmserverd.stop();
  app.__dict__.pop("rest_api", null);
  app.db.drop();
  app.db.create();

  if (db_format == "pg_dump") {
    result = app.ssh_client.run_command(
      `pg_restore -v --dbname=vmdb_production ${loc}${url_basename}`,
      {timeout: 600}
    )
  } else if (db_format == "pg_dumpall") {
    result = app.ssh_client.run_command(
      `psql postgres < ${loc}${url_basename}`,
      {timeout: 600}
    )
  } else {
    throw new Exception(`Unknown db format: ${db_format}`)
  };

  if (!result.success) throw `Failed to restore new database: ${result.output}`;

  try {
    fetch.call(v2key_url, "/var/www/miq/vmdb/certs/v2_key");
    let v2_key_available = true
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof RuntimeError) {
      let v2_key_available = false;
      logger.info("Failed to download the v2_key. Will have to use the fix_auth tool.")
    } else {
      throw $EXCEPTION
    }
  };

  try {
    fetch.call(database_yml_url, "/var/www/miq/vmdb/conf/database.yml");
    let database_yml_available = true
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof RuntimeError) {
      let database_yml_available = false;
      logger.info("Failed to download the database_yml.")
    } else {
      throw $EXCEPTION
    }
  };

  if (is_bool(!v2_key_available)) {
    app.db.fix_auth_key();
    app.db.fix_auth_dbyml();
    app.db.migrate({env_vars: ["HARDCODE_ANSIBLE_PASSWORD=bogus"]})
  } else {
    if (is_bool(!database_yml_available)) app.db.fix_auth_dbyml();
    app.db.migrate()
  };

  try {
    app.evmserverd.start()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof ApplianceException) {
      result = app.ssh_client.run_rake_command("evm:start");
      if (!result.success) throw `Couldn't start evmserverd: ${result.output}`
    } else {
      throw $EXCEPTION
    }
  };

  app.wait_for_web_ui({timeout: 600});
  app.db.reset_user_pass();

  Wait_for.wait_for(
    navigate_to,
    [app.server, "LoginScreen"],
    {handle_exception: true, timeout: "5m"}
  );

  app.server.login(app.user)
};

function test_db_migrate(temp_appliance_extended_db, db_url, db_version, db_desc) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Appliance
  //   Bugzilla:
  //       1734076
  //       1755553
  //   
  download_and_migrate_db(temp_appliance_extended_db, db_url)
};

function test_db_migrate_replication(temp_appliance_remote, dbversion, temp_appliance_global_region) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Appliance
  //   
  let app = temp_appliance_remote;
  let app2 = temp_appliance_global_region;
  logger.info(`Downloading database: ${dbversion}`);
  let db_url = cfme_data.db_backups[dbversion].url;
  let url_basename = os_path.basename(db_url);

  let result = app.ssh_client.run_command(
    `curl -o \"/tmp/${url_basename}\" \"${db_url}\"`,
    {timeout: 30}
  );

  if (!result.success) throw `Failed to download database: ${result.output}`;
  let v2key_url = [os_path.dirname(db_url), "v2_key".os_path.join];
  app.evmserverd.stop();
  app.db.drop();
  app.db.create();

  result = app.ssh_client.run_command(
    `pg_restore -v --dbname=vmdb_production /tmp/${url_basename}`,
    {timeout: 600}
  );

  if (!result.success) throw `Failed to restore new database: ${result.output}`;
  app.db.migrate();

  try {
    result = app.ssh_client.run_command(
      `curl \"${v2key_url}\"`,
      {timeout: 15}
    );

    if (!result.success) throw `Failed to download v2_key: ${result.output}`;

    if (!result.output.include(":key:")) {
      throw `Not a v2_key file: ${result.output}`
    };

    result = app.ssh_client.run_command(
      `curl -o \"/var/www/miq/vmdb/certs/v2_key\" \"${v2key_url}\"`,
      {timeout: 15}
    );

    if (!result.success) throw `Failed to download v2_key: ${result.output}`
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof RuntimeError) {
      app.db.fix_auth_key()
    } else {
      throw $EXCEPTION
    }
  };

  app.db.fix_auth_dbyml();

  try {
    app.evmserverd.start()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof ApplianceException) {
      result = app.ssh_client.run_rake_command("evm:start");
      if (!result.success) throw `Couldn't start evmserverd: ${result.output}`
    } else {
      throw $EXCEPTION
    }
  };

  app.wait_for_web_ui({timeout: 600});
  app.db.reset_user_pass();
  app.server.login(app.user);
  app.set_pglogical_replication({replication_type: ":remote"});
  app2.set_pglogical_replication({replication_type: ":global"});
  app2.add_pglogical_replication_subscription(app.hostname);

  let is_provider_replicated = (app, app2) => (
    new Set(app.managed_provider_names) == new Set(app2.managed_provider_names)
  );

  Wait_for.wait_for(
    method("is_provider_replicated"),
    {func_args: [app, app2], timeout: 30}
  )
};

function test_upgrade_single_inplace(appliance_preupdate, appliance) {
  // Tests appliance upgrade between streams
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Appliance
  //       caseimportance: critical
  //       initialEstimate: 1/3h
  //       testtype: functional
  //   
  appliance_preupdate.evmserverd.stop();

  let result = appliance_preupdate.ssh_client.run_command(
    "yum update -y",
    {timeout: 3600}
  );

  if (!result.success) throw `update failed ${result.output}`;
  appliance_preupdate.db.migrate();
  appliance_preupdate.db.automate_reset();
  appliance_preupdate.db_service.restart();
  appliance_preupdate.evmserverd.start();
  appliance_preupdate.wait_for_web_ui();
  result = appliance_preupdate.ssh_client.run_command("cat /var/www/miq/vmdb/VERSION");
  if (!appliance.version.include(result.output)) throw new ()
};

//  Test whether an upgrade procedure from CFME 5.x to CFME 5.11 results in
//   working environment.
// 
//   Note that only the sidebyside upgrade to to CFME 5.11 is supported.
// 
//   Note this test is quite similar test_db_migrate and perhaps can be removed
//   after the zone checking and ansible checking is implemented there.
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Appliance
//       caseimportance: critical
//       initialEstimate: 1/3h
//       startsin: 5.11
//       testSteps:
//           1. Get CFME VMs of preupgrade and target version.
//           2. Make sure the ansible is enabled and create an ansible playbook
//              service (for testing the 1735114).
//           3. Turn off the evmserverd processes on both.
//           4. Dump the DB of the preupgrade appliance.
//           5. Restore it on the target version appliance.
//           6. Migrate the database.
//           7. Check that a zone exists on the target appliance (as there was a bug 1749694)
//           8. Check that the service provisioning tab doesn\'t
//       expectedResults:
//           1.
//           2.
//           3.
//           4.
//           5.
//           6.
//           7. Zone exists on the target appliance.
//           8. An empty section or a friendly message such as \"No Output available\"
//   Bugzila:
//       1749694
//       1735114
//       1655794
//   
// pass
function test_upgrade_single_sidebyside() {}
