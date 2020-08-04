require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);

let _LOGS_pre_511 = [
  "/var/www/miq/vmdb/log/evm.log",
  "/var/opt/rh/rh-postgresql95/lib/pgsql/data/pg_log/postgresql.log"
];

let _LOGS_511 = [
  "/var/www/miq/vmdb/log/evm.log",
  "/var/lib/pgsql/data/log/postgresql.log"
];

const LOGS = VersionPicker({
  [Version.lowest()]: _LOGS_pre_511,
  "5.11": _LOGS_511
});

function advance_appliance_date_by_day(appliance) {
  // Advance date on the appliance by one day.
  let txt_date = (appliance.ssh_client.run_command("date --rfc-3339=ns")).output;
  let appliance_date = dateutil.parser.parse(txt_date);
  let td = datetime.timedelta({days: 1});
  let advanced_txt_date = (appliance_date + td).strftime("%Y-%m-%d %H:%M:%S%z");
  appliance.ssh_client.run_command(`date -s '${advanced_txt_date}'`)
};

function test_appliance_log_rotate(temp_appliance_preconfig_funcscope) {
  //  Checks whether the log is logrotated daily.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Appliance
  //       initialEstimate: 1/12h
  //       startsin: 5.6
  //   
  let appliance = temp_appliance_preconfig_funcscope;

  if (!(appliance.ssh_client.run_command("/etc/cron.daily/logrotate")).success) {
    throw new ()
  };

  let initial_log_files = {};

  for (let log_path in LOGS.pick()) {
    initial_log_files[log_path] = ((appliance.ssh_client.run_command(`ls -1 ${log_path}*`)).output).split_p("\n");
    appliance.ssh_client.run_command(`echo 'Ensure line in logs' >> ${log_path}`)
  };

  advance_appliance_date_by_day(appliance);

  if (!(appliance.ssh_client.run_command("/etc/cron.daily/logrotate")).success) {
    throw new ()
  };

  for (let log_path in LOGS.pick()) {
    let adv_time_log_files = ((appliance.ssh_client.run_command(("ls -1 {}*").format(log_path))).output).split_p("\n");

    if (new Set(initial_log_files[log_path]) >= new Set(adv_time_log_files)) {
      throw new ()
    }
  }
}
