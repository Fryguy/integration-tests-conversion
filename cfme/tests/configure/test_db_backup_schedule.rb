require_relative 'datetime'
include Datetime
require_relative 'urllib/parse'
include Urllib::Parse
require_relative 'dateutil/relativedelta'
include Dateutil::Relativedelta
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/pretty'
include Cfme::Utils::Pretty
require_relative 'cfme/utils/ssh'
include Cfme::Utils::Ssh
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
PROTOCOL_TYPES = ["smb", "nfs"]
class DbBackupData < Pretty
  #  Container for test data
  # 
  #   Contains data from cfme_data and credentials conf files used in tests
  #   + protocol type, schedule name and schedule description
  # 
  #   Args:
  #       machine_id: cfme_data yaml key
  #                   ``log_db_depot > *machine_id*``
  #       machine_data: cfme_data yaml key
  #                     ``log_db_depot > machine_id > *machine_data*``
  #       protocol_type: One of :py:var:`PROTOCOL_TYPES`
  # 
  #   
  @@required_keys = {"smb" => ["sub_folder", "path_on_host"], "nfs" => ["sub_folder"]}
  @@pretty_attrs = ["machine_data", "protocol_type", "protocol_data"]
  def initialize(machine_data, protocol_type, protocol_data)
    @_param_name = protocol_type
    @protocol_type = protocol_type
    @protocol_data = protocol_data
    @schedule_name = _get_random_schedule_name()
    @schedule_description = _get_random_schedule_description()
    @credentials = _get_credentials()
    @__dict__.update(_get_data(protocol_data, protocol_type))
  end
  def _get_random_schedule_name()
    return fauxfactory.gen_alphanumeric(15, start: "schedule_")
  end
  def _get_random_schedule_description()
    return fauxfactory.gen_alphanumeric(20, start: "schedule_desc_")
  end
  def _get_credentials()
    #  Loads credentials that correspond to 'credentials' key from machine_data dict
    #     
    creds_key = conf.cfme_data.get("log_db_operations", {}).get("credentials", false)
    raise "No 'credentials' key found for machine {machine_id}".format(None: @__dict__) unless creds_key
    raise  unless conf.credentials.include?(creds_key) && conf.credentials[creds_key]
    credentials = conf.credentials[creds_key]
    return credentials
  end
  def _get_data(protocol_data, protocol_type)
    #  Loads data from machine_data dict
    #     
    data = {}
    for key in @required_keys[protocol_type]
      raise  unless protocol_data.include?(key) && protocol_data[key]
      data[key] = protocol_data[key]
    end
    return data
  end
  def id()
    #  Used for pretty test identification string in report
    #     
    return ("{protocol_type}-{sub_folder}").format(None: @__dict__)
  end
  def self.required_keys; @@required_keys; end
  def self.required_keys=(val); @@required_keys=val; end
  def required_keys; @required_keys = @@required_keys if @required_keys.nil?; @required_keys; end
  def required_keys=(val); @required_keys=val; end
  def self.pretty_attrs; @@pretty_attrs; end
  def self.pretty_attrs=(val); @@pretty_attrs=val; end
  def pretty_attrs; @pretty_attrs = @@pretty_attrs if @pretty_attrs.nil?; @pretty_attrs; end
  def pretty_attrs=(val); @pretty_attrs=val; end
end
def pytest_generate_tests(metafunc)
  #  Generates DbBackupData fixture called 'db_backup_data' with all the necessary data
  #   
  data = conf.cfme_data.get("log_db_operations", {})
  if metafunc.fixturenames.include?("db_backup_data")
    argnames = "db_backup_data"
    argvalues = []
    ids = []
    machine_data = data.get("log_db_depot_template")
    if is_bool(!machine_data)
      pytest.skip("No log_db_depot information available!")
    end
    for protocol in data["protocols"]
      if is_bool(PROTOCOL_TYPES.include?(protocol) && data["protocols"][protocol].get("use_for_db_backups", false))
        db_backup_data = DbBackupData.new(machine_data, protocol, data["protocols"][protocol])
        argvalues.push(db_backup_data)
        ids.push(db_backup_data.id)
      end
    end
    testgen.parametrize(metafunc, argnames, argvalues, ids: ids)
  end
end
def get_schedulable_datetime()
  #  Returns datetime for closest schedulable time (every 5 minutes)
  #   
  dt = Datetime::utcnow()
  delta_min = 5 - (dt.minute % 5)
  if delta_min < 3
    delta_min += 5
  end
  dt += relativedelta(minutes: delta_min)
  return dt
end
def get_ssh_client(hostname, credentials)
  #  Returns fresh ssh client connected to given server using given credentials
  #   
  hostname = urlparse().netloc
  connect_kwargs = {"username" => credentials["username"], "password" => credentials["password"], "hostname" => hostname}
  return SSHClient(None: connect_kwargs)
end
def get_full_path_to_file(path_on_host, schedule_name)
  #  Returns full path to db backup file on host
  #   
  if is_bool(!path_on_host.end_with?("/"))
    path_on_host += "/"
  end
  full_path = 
  return full_path
end
def test_db_backup_schedule(request, db_backup_data, depot_machine_ip, appliance)
  #  Test scheduled one-type backup on given machines using smb/nfs
  # 
  #   Polarion:
  #       assignee: sbulage
  #       casecomponent: Appliance
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  dt = get_schedulable_datetime()
  hour = dt.strftime("%-H")
  minute = dt.strftime("%-M")
  db_depot_uri = 
  sched_args = {"name" => db_backup_data.schedule_name, "description" => db_backup_data.schedule_description, "active" => true, "action_type" => "Database Backup", "run_type" => "Once", "run_every" => nil, "time_zone" => "(GMT+00:00) UTC", "start_date" => dt, "start_hour" => hour, "start_minute" => minute, "depot_name" => fauxfactory.gen_alphanumeric()}
  if db_backup_data.protocol_type == "smb"
    sched_args.update({"backup_type" => "Samba", "uri" => db_depot_uri, "samba_username" => db_backup_data.credentials["username"], "samba_password" => db_backup_data.credentials["password"]})
  else
    sched_args.update({"backup_type" => "Network File System", "uri" => db_depot_uri})
  end
  if db_backup_data.protocol_type == "nfs"
    path_on_host = urlparse().path
  else
    path_on_host = db_backup_data.path_on_host
  end
  full_path = get_full_path_to_file(path_on_host, db_backup_data.schedule_name)
  sched = appliance.collections.system_schedules.create(None: sched_args)
  delete_sched_and_files = lambda do
    get_ssh_client(db_depot_uri, db_backup_data.credentials) {|ssh_client|
      ssh_client.run_command(, ensure_user: true)
    }
    sched.delete()
  end
  request.addfinalizer(method(:delete_sched_and_files))
  LogValidator("/var/www/miq/vmdb/log/evm.log", failure_patterns: []) {
    wait_for(lambda{|| sched.last_run_date != ""}, num_sec: 600, delay: 30, fail_func: sched.browser.refresh, message: "Schedule failed to run in 10mins from being set up")
  }
  get_ssh_client(db_depot_uri, db_backup_data.credentials) {|ssh_client|
    raise  unless ssh_client.run_command(, ensure_user: true).success
    file_check_cmd = 
    wait_for(lambda{|| ssh_client.run_command(file_check_cmd, ensure_user: true).output == "1"}, delay: 5, num_sec: 60, message: )
  }
end
def test_scheduled_backup_handles_big_db()
  #  Tests whether the scheduled db backups handle big DB. It should write
  #   directly to the target endpoint -- it should not be writing to, for
  #   example, /tmp.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Configuration
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       startsin: 5.11
  #       testSteps:
  #           1. Get a big dump of big DB. It needs to be bigger than a free
  #              space on /tmp of the appliance.
  #           2. Schedule the backup
  #       expectedResults:
  #           1. After scheduled time, backup should be on the target share. No
  #              ERROR in the log.
  #   Bugzila:
  #       1703278
  #   
  # pass
end
