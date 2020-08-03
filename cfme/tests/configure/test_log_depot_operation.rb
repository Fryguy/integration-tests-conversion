#  Tests used to check the operation of log collecting.
# 
# Author: Milan Falešník <mfalesni@redhat.com>
# Since: 2013-02-20
# 
require_relative 'datetime'
include Datetime
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/ftp'
include Cfme::Utils::Ftp
require_relative 'cfme/utils/ssh'
include Cfme::Utils::Ssh
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [pytest.mark.long_running, test_requirements.log_depot]
class LogDepotType
  def initialize(protocol, credentials, access_dir: nil, path: nil)
    @protocol = protocol
    @_param_name = @protocol
    @credentials = credentials
    @access_dir = access_dir || ""
    @path = path
    @machine_ip = nil
  end
  def ftp()
    if @protocol == "anon_ftp"
      ftp_user_name = "anonymous"
      ftp_password = ""
      upload_dir = "incoming"
    else
      ftp_user_name = @credentials["username"]
      ftp_password = @credentials["password"]
      upload_dir = "/"
    end
    return FTPClient(@machine_ip, ftp_user_name, ftp_password, upload_dir)
  end
end
def pytest_generate_tests(metafunc)
  #  Parametrizes the logdepot tests according to cfme_data YAML file.
  # 
  #   YAML structure (shared with db backup tests) is as follows:
  # 
  #   log_db_depot:
  #       credentials: credentials_key
  #       protocols:
  #           smb:
  #               path_on_host: /path/on/host
  #               use_for_log_collection: True
  #               use_for_db_backups: False
  #           nfs:
  #               hostname: nfs.example.com/path/on/host
  #               use_for_log_collection: False
  #               use_for_db_backups: True
  #           ftp:
  #               hostname: ftp.example.com
  #               use_for_log_collection: True
  #   
  if metafunc.function.__name__ == "test_collect_unconfigured"
    return
  end
  fixtures = ["log_depot"]
  data = conf.cfme_data.get("log_db_operations", {})
  depots = []
  ids = []
  if is_bool(!data)
    pytest.skip("No log_db_operations information!")
  end
  creds = conf.credentials[data["credentials"]]
  for (protocol, proto_data) in data["protocols"].to_a()
    if is_bool(proto_data["use_for_log_collection"])
      depots.push([LogDepotType.new(protocol, creds, proto_data.get("sub_folder"), proto_data.get("path_on_host"))])
      ids.push(protocol)
    end
  end
  if ["test_collect_multiple_servers", "test_collect_single_servers"].include?(metafunc.function.__name__)
    ids = ids[0...1]
    depots = depots[0...1]
  else
    if metafunc.function.__name__ == "test_log_collection_over_ipv6"
      anon_id = ids.index("anon_ftp")
      ids = [ids[anon_id]]
      depots = [depots[anon_id]]
    end
  end
  testgen.parametrize(metafunc, fixtures, depots, ids: ids, scope: "function")
  return
end
def configured_external_appliance(temp_appliance_preconfig, app_creds_modscope, temp_appliance_unconfig)
  hostname = temp_appliance_preconfig.hostname
  temp_appliance_unconfig.appliance_console_cli.configure_appliance_external_join(hostname, app_creds_modscope["username"], app_creds_modscope["password"], "vmdb_production", hostname, app_creds_modscope["sshlogin"], app_creds_modscope["sshpass"])
  temp_appliance_unconfig.evmserverd.start()
  temp_appliance_unconfig.evmserverd.wait_for_running()
  temp_appliance_unconfig.wait_for_web_ui()
  return temp_appliance_unconfig
end
def configured_depot(log_depot, depot_machine_ip, appliance)
  #  Configure selected depot provider
  # 
  #   This fixture used the trick that the fixtures are cached for given function.
  #   So if placed behind the depot_* stuff on the test function, it can actually
  #   take the values from them.
  # 
  #   It also provides a finalizer to disable the depot after test run.
  #   
  log_depot.machine_ip = depot_machine_ip
  uri = 
  server_log_depot = appliance.server.collect_logs
  update(server_log_depot) {
    server_log_depot.depot_type = log_depot.protocol
    server_log_depot.depot_name = fauxfactory.gen_alphanumeric()
    server_log_depot.uri = uri
    server_log_depot.username = log_depot.credentials.username
    server_log_depot.password = log_depot.credentials.password
  }
  yield server_log_depot
  server_log_depot.clear()
end
def check_ftp(appliance, ftp, server_name, server_zone_id, check_contents: false)
  server_string = 
  ftp {
    date_group = "(_.*?){4}"
    zip_files = ftp.filesystem.search(re.compile(), directories: false)
    raise "No logs found!" unless zip_files
    if is_bool(appliance.version >= "5.11" && !BZ(1706989).blocks)
      models_files = ftp.filesystem.search(re.compile(), directories: false)
      raise "No models files found" unless models_files
      dialogs_files = ftp.filesystem.search(re.compile(), directories: false)
      raise "No dialogs files found" unless dialogs_files
    end
  }
  datetimes = []
  for zip_file in zip_files
    date = zip_file.name.split_p("_")
    date_from = date[7] + date[8]
    date_to = date[9] + (date[10][0...-4])
    begin
      date_from = Datetime::strptime(date_from, "%Y%m%d%H%M%S")
      date_to = Datetime::strptime(date_to, "%Y%m%d%H%M%S")
      log_files = ["log/ansible_tower", "pgsql/data/postgresql.conf"]
      if is_bool(ftp.login != "anonymous" && check_contents)
        SSHClient(hostname: ftp.host, username: ftp.login, password: ftp.password) {|log_ssh|
          for log in log_files
            if is_bool(log.include?("ansible") && BZ(1751961).blocks)
              next
            end
            result = log_ssh.run_command(, ensure_user: true)
            raise unless result.output.include?(log)
            log_file_size = result.output.split()[0]
            raise "Log file is empty!" unless log_file_size.to_i > 0
          end
        }
      end
    rescue TypeError
      raise  unless false
    end
    Datetime::datetimes.push([date_from, date_to, zip_file.name])
  end
  if datetimes.size > 1
    for i in (datetimes.size - 1).times
      dt = (datetimes[i + 1][0]) - datetimes[i][1]
      raise "Negative gap between log files ({}, {})".format(datetimes[i][2], datetimes[i + 1][2]) unless dt.total_seconds() >= 0.0
    end
  end
end
def service_request(appliance, ansible_catalog_item)
  request_descr = "Provisioning Service [{name}] from [{name}]".format(name: ansible_catalog_item.name)
  service_request_ = appliance.collections.requests.instantiate(description: request_descr)
  yield service_request_
  if is_bool(service_request_.exists())
    service_request_.remove_request()
  end
end
def test_collect_log_depot(log_depot, appliance, service_request, configured_depot, request)
  #  Boilerplate test to verify functionality of this concept
  # 
  #   Will be extended and improved.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Configuration
  #       initialEstimate: 1/4h
  #       caseimportance: critical
  #   Bugzilla:
  #       1652116
  #       1656318
  #       1706989
  #   
  _clear_ftp = lambda do
    log_depot.ftp {|ftp|
      ftp.cwd(ftp.upload_dir)
      ftp.recursively_delete()
    }
  end
  log_depot.ftp {|ftp|
    ftp.cwd(ftp.upload_dir)
    ftp.recursively_delete()
  }
  configured_depot.collect_all()
  check_ftp(appliance: appliance, ftp: log_depot.ftp, server_name: appliance.server.name, server_zone_id: appliance.server.sid, check_contents: true)
end
def test_collect_unconfigured(appliance)
  #  Test checking is collect button enable and disable after log depot was configured
  # 
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Configuration
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #   
  server_log_depot = appliance.server.collect_logs
  update(server_log_depot) {
    server_log_depot.depot_type = "anon_ftp"
    server_log_depot.depot_name = fauxfactory.gen_alphanumeric()
    server_log_depot.uri = fauxfactory.gen_alphanumeric()
  }
  view = navigate_to(server_log_depot, "DiagnosticsCollectLogs")
  raise unless view.toolbar.collect.is_displayed
  server_log_depot.clear()
  raise unless !view.toolbar.collect.is_displayed
  view_zone = navigate_to(appliance.server.zone.collect_logs, "DiagnosticsCollectLogs")
  raise unless !view_zone.toolbar.collect.is_displayed
end
def test_collect_multiple_servers(log_depot, temp_appliance_preconfig, depot_machine_ip, request, configured_external_appliance, zone_collect, collect_type, from_secondary)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Configuration
  #       initialEstimate: 1/4h
  #   
  appliance = temp_appliance_preconfig
  log_depot.machine_ip = depot_machine_ip
  collect_logs = is_bool(zone_collect) ? appliance.server.zone.collect_logs : appliance.server.collect_logs
  request.addfinalizer(collect_logs.clear)
  _clear_ftp = lambda do
    log_depot.ftp {|ftp|
      ftp.cwd(ftp.upload_dir)
      ftp.recursively_delete()
    }
  end
  log_depot.ftp {|ftp|
    ftp.cwd(ftp.upload_dir)
    ftp.recursively_delete()
  }
  appliance {
    uri = 
    update(collect_logs) {
      collect_logs.second_server_collect = from_secondary
      collect_logs.depot_type = log_depot.protocol
      collect_logs.depot_name = fauxfactory.gen_alphanumeric()
      collect_logs.uri = uri
      collect_logs.username = log_depot.credentials.username
      collect_logs.password = log_depot.credentials.password
    }
    if collect_type == "all"
      collect_logs.collect_all()
    else
      collect_logs.collect_current()
    end
  }
  secondary_servers = appliance.server.secondary_servers
  secondary_server = is_bool(secondary_servers) ? secondary_servers[0] : nil
  if is_bool(from_secondary && zone_collect)
    check_ftp(appliance, log_depot.ftp, secondary_server.name, secondary_server.sid)
    check_ftp(appliance, log_depot.ftp, appliance.server.name, appliance.server.zone.id)
  else
    if is_bool(from_secondary)
      check_ftp(appliance, log_depot.ftp, secondary_server.name, secondary_server.sid)
    else
      check_ftp(appliance, log_depot.ftp, appliance.server.name, appliance.server.zone.id)
    end
  end
end
def test_collect_single_servers(log_depot, appliance, depot_machine_ip, request, zone_collect, collect_type)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Configuration
  #       initialEstimate: 1/4h
  #   
  log_depot.machine_ip = depot_machine_ip
  _clear_ftp = lambda do
    log_depot.ftp {|ftp|
      ftp.cwd(ftp.upload_dir)
      ftp.recursively_delete()
    }
  end
  log_depot.ftp {|ftp|
    ftp.cwd(ftp.upload_dir)
    ftp.recursively_delete()
  }
  uri = 
  collect_logs = is_bool(zone_collect) ? appliance.server.zone.collect_logs : appliance.server.collect_logs
  update(collect_logs) {
    collect_logs.depot_type = log_depot.protocol
    collect_logs.depot_name = fauxfactory.gen_alphanumeric()
    collect_logs.uri = uri
    collect_logs.username = log_depot.credentials.username
    collect_logs.password = log_depot.credentials.password
  }
  request.addfinalizer(collect_logs.clear)
  if collect_type == "all"
    collect_logs.collect_all()
  else
    collect_logs.collect_current()
  end
  check_ftp(appliance, log_depot.ftp, appliance.server.name, appliance.server.sid)
end
def test_log_collection_over_ipv6(log_depot, depot_machine_ipv4_and_ipv6, appliance, request)
  # 
  #   Bug 1452224 - Log Collection fails via IPv6
  # 
  #   Bugzilla:
  #       1452224
  # 
  #   An IPv6 FTP server can be validated for log collection, and log
  #   collection succeeds.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  ipv4,ipv6 = depot_machine_ipv4_and_ipv6
  log_depot.machine_ip = ipv4
  _clear_ftp = lambda do
    log_depot.ftp {|ftp|
      ftp.cwd(ftp.upload_dir)
      ftp.recursively_delete()
    }
  end
  log_depot.ftp {|ftp|
    ftp.cwd(ftp.upload_dir)
    ftp.recursively_delete()
  }
  uri = 
  collect_logs = appliance.server.collect_logs
  update(collect_logs) {
    collect_logs.depot_type = log_depot.protocol
    collect_logs.depot_name = fauxfactory.gen_alphanumeric()
    collect_logs.uri = uri
    collect_logs.username = log_depot.credentials.username
    collect_logs.password = log_depot.credentials.password
  }
  request.addfinalizer(collect_logs.clear)
  collect_logs.collect_all()
  check_ftp(appliance, log_depot.ftp, appliance.server.name, appliance.server.sid)
end
