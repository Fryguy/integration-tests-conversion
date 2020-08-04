require_relative("datetime");
include(Datetime);
require_relative("urllib/parse");
include(Urllib.Parse);
require_relative("dateutil/relativedelta");
include(Dateutil.Relativedelta);
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/pretty");
include(Cfme.Utils.Pretty);
require_relative("cfme/utils/ssh");
include(Cfme.Utils.Ssh);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
const PROTOCOL_TYPES = ["smb", "nfs"];

class DbBackupData extends Pretty {
  #_param_name = protocol_type;
  #protocol_type = protocol_type;
  #protocol_data = protocol_data;
  #schedule_name = this._get_random_schedule_name();
  #schedule_description = this._get_random_schedule_description();
  #credentials = this._get_credentials();
  #__dict__;
  #pretty_attrs;
  #required_keys;

  //  Container for test data
  // 
  //   Contains data from cfme_data and credentials conf files used in tests
  //   + protocol type, schedule name and schedule description
  // 
  //   Args:
  //       machine_id: cfme_data yaml key
  //                   ``log_db_depot > *machine_id*``
  //       machine_data: cfme_data yaml key
  //                     ``log_db_depot > machine_id > *machine_data*``
  //       protocol_type: One of :py:var:`PROTOCOL_TYPES`
  // 
  //   
  static #required_keys = {
    smb: ["sub_folder", "path_on_host"],
    nfs: ["sub_folder"]
  };

  static #pretty_attrs = [
    "machine_data",
    "protocol_type",
    "protocol_data"
  ];

  constructor(machine_data, protocol_type, protocol_data) {
    this.#__dict__.update(this._get_data(protocol_data, protocol_type))
  };

  _get_random_schedule_name() {
    return fauxfactory.gen_alphanumeric(15, {start: "schedule_"})
  };

  _get_random_schedule_description() {
    return fauxfactory.gen_alphanumeric(20, {start: "schedule_desc_"})
  };

  _get_credentials() {
    //  Loads credentials that correspond to 'credentials' key from machine_data dict
    //     
    let creds_key = conf.cfme_data.get("log_db_operations", {}).get(
      "credentials",
      false
    );

    if (!creds_key) {
      throw "No 'credentials' key found for machine {machine_id}".format({None: this.#__dict__})
    };

    if (!conf.credentials.include(creds_key) || !conf.credentials[creds_key]) {
      throw `No credentials for key '${creds_key}' found in credentials yaml`
    };

    let credentials = conf.credentials[creds_key];
    return credentials
  };

  _get_data(protocol_data, protocol_type) {
    //  Loads data from machine_data dict
    //     
    let data = {};

    for (let key in this.#required_keys[protocol_type]) {
      if (!protocol_data.include(key) || !protocol_data[key]) {
        throw `'${key}' key must be set for scheduled ${protocol_type} backup to work`
      };

      data[key] = protocol_data[key]
    };

    return data
  };

  id() {
    //  Used for pretty test identification string in report
    //     
    return ("{protocol_type}-{sub_folder}").format({None: this.#__dict__})
  };

  static get required_keys() {
    return DbBackupData.#required_keys
  };

  static set required_keys(val) {
    DbBackupData.#required_keys = val
  };

  get required_keys() {
    if (this.#required_keys.nil) this.#required_keys = DbBackupData.#required_keys;
    return this.#required_keys
  };

  set required_keys(val) {
    this.#required_keys = val
  };

  static get pretty_attrs() {
    return DbBackupData.#pretty_attrs
  };

  static set pretty_attrs(val) {
    DbBackupData.#pretty_attrs = val
  };

  get pretty_attrs() {
    if (this.#pretty_attrs.nil) this.#pretty_attrs = DbBackupData.#pretty_attrs;
    return this.#pretty_attrs
  };

  set pretty_attrs(val) {
    this.#pretty_attrs = val
  }
};

function pytest_generate_tests(metafunc) {
  //  Generates DbBackupData fixture called 'db_backup_data' with all the necessary data
  //   
  let data = conf.cfme_data.get("log_db_operations", {});

  if (metafunc.fixturenames.include("db_backup_data")) {
    let argnames = "db_backup_data";
    let argvalues = [];
    let ids = [];
    let machine_data = data.get("log_db_depot_template");

    if (is_bool(!machine_data)) {
      pytest.skip("No log_db_depot information available!")
    };

    for (let protocol in data.protocols) {
      if (is_bool(PROTOCOL_TYPES.include(protocol) && data.protocols[protocol].get(
        "use_for_db_backups",
        false
      ))) {
        let db_backup_data = new DbBackupData(machine_data, protocol, data.protocols[protocol]);
        argvalues.push(db_backup_data);
        ids.push(db_backup_data.id)
      }
    };

    testgen.parametrize(metafunc, argnames, argvalues, {ids})
  }
};

function get_schedulable_datetime() {
  //  Returns datetime for closest schedulable time (every 5 minutes)
  //   
  let dt = Datetime.utcnow();
  let delta_min = 5 - (dt.minute % 5);
  if (delta_min < 3) delta_min += 5;
  dt += relativedelta({minutes: delta_min});
  return dt
};

function get_ssh_client(hostname, credentials) {
  //  Returns fresh ssh client connected to given server using given credentials
  //   
  hostname = (urlparse(`scheme://${hostname}`)).netloc;

  let connect_kwargs = {
    username: credentials.username,
    password: credentials.password,
    hostname: hostname
  };

  return SSHClient({None: connect_kwargs})
};

function get_full_path_to_file(path_on_host, schedule_name) {
  //  Returns full path to db backup file on host
  //   
  if (is_bool(!path_on_host.end_with("/"))) path_on_host += "/";
  let full_path = `${path_on_host}db_backup/region_*/${schedule_name}`;
  return full_path
};

function test_db_backup_schedule(request, db_backup_data, depot_machine_ip, appliance) {
  let path_on_host;

  //  Test scheduled one-type backup on given machines using smb/nfs
  // 
  //   Polarion:
  //       assignee: sbulage
  //       casecomponent: Appliance
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  let dt = get_schedulable_datetime();
  let hour = dt.strftime("%-H");
  let minute = dt.strftime("%-M");
  let db_depot_uri = `${depot_machine_ip}${db_backup_data.sub_folder}`;

  let sched_args = {
    name: db_backup_data.schedule_name,
    description: db_backup_data.schedule_description,
    active: true,
    action_type: "Database Backup",
    run_type: "Once",
    run_every: null,
    time_zone: "(GMT+00:00) UTC",
    start_date: dt,
    start_hour: hour,
    start_minute: minute,
    depot_name: fauxfactory.gen_alphanumeric()
  };

  if (db_backup_data.protocol_type == "smb") {
    sched_args.update({
      backup_type: "Samba",
      uri: db_depot_uri,
      samba_username: db_backup_data.credentials.username,
      samba_password: db_backup_data.credentials.password
    })
  } else {
    sched_args.update({
      backup_type: "Network File System",
      uri: db_depot_uri
    })
  };

  if (db_backup_data.protocol_type == "nfs") {
    path_on_host = (urlparse(`nfs://${db_depot_uri}`)).path
  } else {
    path_on_host = db_backup_data.path_on_host
  };

  let full_path = get_full_path_to_file(
    path_on_host,
    db_backup_data.schedule_name
  );

  let sched = appliance.collections.system_schedules.create({None: sched_args});

  let delete_sched_and_files = () => {
    get_ssh_client(
      db_depot_uri,
      db_backup_data.credentials,

      ssh_client => (
        ssh_client.run_command(`rm -rf ${full_path}`, {ensure_user: true})
      )
    );

    return sched.delete()
  };

  request.addfinalizer(method("delete_sched_and_files"));

  LogValidator(
    "/var/www/miq/vmdb/log/evm.log",
    {failure_patterns: ["ERROR"]},

    () => (
      wait_for(() => sched.last_run_date != "", {
        num_sec: 600,
        delay: 30,
        fail_func: sched.browser.refresh,
        message: "Schedule failed to run in 10mins from being set up"
      })
    )
  );

  get_ssh_client(
    db_depot_uri,
    db_backup_data.credentials,

    (ssh_client) => {
      if (!ssh_client.run_command(
        `cd \"${path_on_host}\"`,
        {ensure_user: true}
      ).success) throw `Could not cd into '${path_on_host}' over ssh`;

      let file_check_cmd = `find ${full_path}/* -cmin -5 | wc -l | tr -d '\n' `;

      wait_for(
        () => (
          ssh_client.run_command(file_check_cmd, {ensure_user: true}).output == "1"
        ),

        {
          delay: 5,
          num_sec: 60,
          message: `File '${full_path}' not found on share`
        }
      )
    }
  )
};

//  Tests whether the scheduled db backups handle big DB. It should write
//   directly to the target endpoint -- it should not be writing to, for
//   example, /tmp.
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Configuration
//       caseimportance: high
//       initialEstimate: 1/2h
//       startsin: 5.11
//       testSteps:
//           1. Get a big dump of big DB. It needs to be bigger than a free
//              space on /tmp of the appliance.
//           2. Schedule the backup
//       expectedResults:
//           1. After scheduled time, backup should be on the target share. No
//              ERROR in the log.
//   Bugzila:
//       1703278
//   
// pass
function test_scheduled_backup_handles_big_db() {}
