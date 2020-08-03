require 'None'
require_relative 'wait_for'
include Wait_for
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/ui'
include Cfme::Base::Ui
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/version'
include Cfme::Utils::Version
pytestmark = [test_requirements.db_migration, pytest.mark.uncollectif(lambda{|appliance| appliance.is_dev}, reason: "DB migrate tests not valid for dev server")]
def pytest_generate_tests(metafunc)
  if Set.new([test_upgrade_single_inplace, test_db_migrate_replication, test_upgrade_single_sidebyside]).include?(metafunc.function)
    return
  end
  argnames,argvalues,idlist = [["db_url", "db_version", "db_desc"], [], []]
  db_backups = Cfme::cfme_data.get("db_backups", {})
  if is_bool(!db_backups)
    pytest.skip("No db backup information available!")
  end
  for (key, data) in db_backups.to_a()
    argvalues.push([data.url, data.version, data.desc])
    idlist.push(key)
  end
  return metafunc.parametrize(argnames: argnames, argvalues: argvalues, ids: idlist)
end
def temp_appliance_remote(temp_appliance_preconfig_funcscope)
  # Needed for db_migrate_replication as you can't drop a remote db due to subscription
  app = temp_appliance_preconfig_funcscope
  app.evmserverd.stop()
  app.db.extend_partition()
  app.evmserverd.start()
  return app
end
def temp_appliance_global_region(temp_appliance_unconfig_funcscope_rhevm)
  temp_appliance_unconfig_funcscope_rhevm.appliance_console_cli.configure_appliance_internal(99, "localhost", credentials["database"]["username"], credentials["database"]["password"], "vmdb_production", temp_appliance_unconfig_funcscope_rhevm.unpartitioned_disks[0])
  temp_appliance_unconfig_funcscope_rhevm.evmserverd.wait_for_running()
  temp_appliance_unconfig_funcscope_rhevm.wait_for_web_ui()
  return temp_appliance_unconfig_funcscope_rhevm
end
def appliance_preupdate(temp_appliance_preconfig_funcscope_upgrade, appliance)
  # Reconfigure appliance partitions and adds repo file for upgrade
  series = appliance.version.series()
  update_url = "update_url_{}".format(series.gsub(".", ""))
  temp_appliance_preconfig_funcscope_upgrade.db.extend_partition()
  urls = cfme_data["basic_info"][update_url]
  temp_appliance_preconfig_funcscope_upgrade.ssh_client.run_command("curl #{urls} -o /etc/yum.repos.d/update.repo")
  return temp_appliance_preconfig_funcscope_upgrade
end
def guess_the_db_format(basename)
  if is_bool(basename.end_with?("dumpall"))
    return "pg_dumpall"
  else
    if is_bool(basename.end_with?("backup") || basename.end_with?("dump"))
      return "pg_dump"
    else
      raise Exception, "Couldn't guess the db format"
    end
  end
end
def download_and_migrate_db(app, db_url)
  fetch = lambda do |src, dst|
    result = app.ssh_client.run_command("curl  --fail -S -o \"#{dst}\" \"#{src}\"", timeout: 15)
    raise "Failed to download #{src}:
#{result.output}" unless result.success
  end
  logger.info("Downloading database: #{db_url}")
  url_basename = os_path.basename(db_url)
  loc = "/tmp/"
  v2key_url = os_path.dirname(db_url), "v2_key.bak".os_path.join
  database_yml_url = os_path.dirname(db_url), "database.yml".os_path.join
  db_format = guess_the_db_format(url_basename)
  fetch.call(db_url, "#{loc}#{url_basename}")
  app.evmserverd.stop()
  app.__dict__.pop("rest_api", nil)
  app.db.drop()
  app.db.create()
  if db_format == "pg_dump"
    result = app.ssh_client.run_command("pg_restore -v --dbname=vmdb_production #{loc}#{url_basename}", timeout: 600)
  else
    if db_format == "pg_dumpall"
      result = app.ssh_client.run_command("psql postgres < #{loc}#{url_basename}", timeout: 600)
    else
      raise Exception, "Unknown db format: #{db_format}"
    end
  end
  raise "Failed to restore new database: #{result.output}" unless result.success
  begin
    fetch.call(v2key_url, "/var/www/miq/vmdb/certs/v2_key")
    v2_key_available = true
  rescue RuntimeError
    v2_key_available = false
    logger.info("Failed to download the v2_key. Will have to use the fix_auth tool.")
  end
  begin
    fetch.call(database_yml_url, "/var/www/miq/vmdb/conf/database.yml")
    database_yml_available = true
  rescue RuntimeError
    database_yml_available = false
    logger.info("Failed to download the database_yml.")
  end
  if is_bool(!v2_key_available)
    app.db.fix_auth_key()
    app.db.fix_auth_dbyml()
    app.db.migrate(env_vars: ["HARDCODE_ANSIBLE_PASSWORD=bogus"])
  else
    if is_bool(!database_yml_available)
      app.db.fix_auth_dbyml()
    end
    app.db.migrate()
  end
  begin
    app.evmserverd.start()
  rescue ApplianceException
    result = app.ssh_client.run_rake_command("evm:start")
    raise "Couldn't start evmserverd: #{result.output}" unless result.success
  end
  app.wait_for_web_ui(timeout: 600)
  app.db.reset_user_pass()
  Wait_for::wait_for(navigate_to, [app.server, "LoginScreen"], handle_exception: true, timeout: "5m")
  app.server.login(app.user)
end
def test_db_migrate(temp_appliance_extended_db, db_url, db_version, db_desc)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   Bugzilla:
  #       1734076
  #       1755553
  #   
  download_and_migrate_db(temp_appliance_extended_db, db_url)
end
def test_db_migrate_replication(temp_appliance_remote, dbversion, temp_appliance_global_region)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   
  app = temp_appliance_remote
  app2 = temp_appliance_global_region
  logger.info("Downloading database: #{dbversion}")
  db_url = cfme_data["db_backups"][dbversion]["url"]
  url_basename = os_path.basename(db_url)
  result = app.ssh_client.run_command("curl -o \"/tmp/#{url_basename}\" \"#{db_url}\"", timeout: 30)
  raise "Failed to download database: #{result.output}" unless result.success
  v2key_url = os_path.dirname(db_url), "v2_key".os_path.join
  app.evmserverd.stop()
  app.db.drop()
  app.db.create()
  result = app.ssh_client.run_command("pg_restore -v --dbname=vmdb_production /tmp/#{url_basename}", timeout: 600)
  raise "Failed to restore new database: #{result.output}" unless result.success
  app.db.migrate()
  begin
    result = app.ssh_client.run_command("curl \"#{v2key_url}\"", timeout: 15)
    raise "Failed to download v2_key: #{result.output}" unless result.success
    raise "Not a v2_key file: #{result.output}" unless result.output.include?(":key:")
    result = app.ssh_client.run_command("curl -o \"/var/www/miq/vmdb/certs/v2_key\" \"#{v2key_url}\"", timeout: 15)
    raise "Failed to download v2_key: #{result.output}" unless result.success
  rescue RuntimeError
    app.db.fix_auth_key()
  end
  app.db.fix_auth_dbyml()
  begin
    app.evmserverd.start()
  rescue ApplianceException
    result = app.ssh_client.run_rake_command("evm:start")
    raise "Couldn't start evmserverd: #{result.output}" unless result.success
  end
  app.wait_for_web_ui(timeout: 600)
  app.db.reset_user_pass()
  app.server.login(app.user)
  app.set_pglogical_replication(replication_type: ":remote")
  app2.set_pglogical_replication(replication_type: ":global")
  app2.add_pglogical_replication_subscription(app.hostname)
  is_provider_replicated = lambda do |app, app2|
    return Set.new(app.managed_provider_names) == Set.new(app2.managed_provider_names)
  end
  Wait_for::wait_for(method(:is_provider_replicated), func_args: [app, app2], timeout: 30)
end
def test_upgrade_single_inplace(appliance_preupdate, appliance)
  # Tests appliance upgrade between streams
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       caseimportance: critical
  #       initialEstimate: 1/3h
  #       testtype: functional
  #   
  appliance_preupdate.evmserverd.stop()
  result = appliance_preupdate.ssh_client.run_command("yum update -y", timeout: 3600)
  raise "update failed #{result.output}" unless result.success
  appliance_preupdate.db.migrate()
  appliance_preupdate.db.automate_reset()
  appliance_preupdate.db_service.restart()
  appliance_preupdate.evmserverd.start()
  appliance_preupdate.wait_for_web_ui()
  result = appliance_preupdate.ssh_client.run_command("cat /var/www/miq/vmdb/VERSION")
  raise unless appliance.version.include?(result.output)
end
def test_upgrade_single_sidebyside()
  #  Test whether an upgrade procedure from CFME 5.x to CFME 5.11 results in
  #   working environment.
  # 
  #   Note that only the sidebyside upgrade to to CFME 5.11 is supported.
  # 
  #   Note this test is quite similar test_db_migrate and perhaps can be removed
  #   after the zone checking and ansible checking is implemented there.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       caseimportance: critical
  #       initialEstimate: 1/3h
  #       startsin: 5.11
  #       testSteps:
  #           1. Get CFME VMs of preupgrade and target version.
  #           2. Make sure the ansible is enabled and create an ansible playbook
  #              service (for testing the 1735114).
  #           3. Turn off the evmserverd processes on both.
  #           4. Dump the DB of the preupgrade appliance.
  #           5. Restore it on the target version appliance.
  #           6. Migrate the database.
  #           7. Check that a zone exists on the target appliance (as there was a bug 1749694)
  #           8. Check that the service provisioning tab doesn\'t
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5.
  #           6.
  #           7. Zone exists on the target appliance.
  #           8. An empty section or a friendly message such as \"No Output available\"
  #   Bugzila:
  #       1749694
  #       1735114
  #       1655794
  #   
  # pass
end
