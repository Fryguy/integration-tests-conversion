require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.log_depot,

  pytest.mark.provider(
    [AzureProvider, EC2Provider, RHEVMProvider, SCVMMProvider],
    {scope: "module"}
  ),

  pytest.mark.usefixtures("setup_provider_modscope")
];

function log_exists(appliance, provider) {
  let log_exists = bool((appliance.ssh_client.run_command(("(ls /var/www/miq/vmdb/log/{}.log >> /dev/null 2>&1 && echo True) || echo False").format(provider.log_name))).output);
  return log_exists
};

function test_provider_log_exists(log_exists) {
  // 
  //   Tests if provider log exists
  // 
  //   Metadata:
  //       test_flag: log
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Configuration
  //       initialEstimate: 1/4h
  //   
  if (!log_exists) throw new ()
};

function test_provider_log_rotate(appliance, provider, log_exists) {
  // 
  //   Tests that log rotation works for provider log
  // 
  //   Steps:
  //   1. Force log rotation with default config miq_logs.conf
  //   2. Verify that new
  // 
  //   Metadata:
  //       test_flag: log
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Configuration
  //   
  if (!log_exists) throw `Log file ${provider.log_name}.log doesn't exist`;
  appliance.ssh_client.run_command("logrotate -f /etc/logrotate.d/miq_logs.conf");
  let logs_count = (((appliance.ssh_client.run_command(("ls -l /var/www/miq/vmdb/log/{}.log*|wc -l").format(provider.log_name))).output).rstrip()).to_i;

  if (logs_count <= 1) {
    throw "{}.log wasn't rotated by default miq_logs.conf".format(provider.log_name)
  }
};

function test_provider_log_updated(appliance, provider, log_exists) {
  // 
  //   Tests that providers log is not empty and updatable
  // 
  //   Steps:
  //   1. Store log before provider refresh
  //   2. Refresh provider
  //   3. Store log once again
  //   4. Compare logs from 1 and 3
  // 
  //   Metadata:
  //       test_flag: log
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Configuration
  //   
  if (!log_exists) throw `Log file ${provider.log_name}.log doesn't exist`;
  let log_before = (appliance.ssh_client.run_command(("md5sum /var/www/miq/vmdb/log/{}.log | awk '{{ print $1 }}'").format(provider.log_name))).output;
  wait_for(provider.is_refreshed, {func_kwargs: {}, timeout: 600});
  let log_after = (appliance.ssh_client.run_command(("md5sum /var/www/miq/vmdb/log/{}.log | awk '{{ print $1 }}'").format(provider.log_name))).output;
  if (log_before == log_after) throw "Log hashes are the same"
};

function test_provider_log_level(appliance, provider, log_exists) {
  // 
  //   Tests that log level in advanced settings affects log files
  // 
  //   Bugzilla:
  //       1633656
  //       1640718
  // 
  //   Metadata:
  //       test_flag: log
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Configuration
  //       testSteps:
  //           1. Change log level to info
  //           2. Refresh provider
  //           3. Check logs do contain info messages
  //           4. Change log level to warn
  //           5. Refresh provider
  //           6. Check there are no info messages in the log
  //           7. Reset log level back
  //   
  if (!log_exists) throw `Log file ${provider.log_name}.log doesn't exist`;
  let log_level = appliance.server.advanced_settings.log[`level_${provider.log_name}`];
  let log = `/var/www/miq/vmdb/log/${provider.log_name}.log`;

  wait_for(
    () => (
      appliance.server.update_advanced_settings({log: {[`level_${provider.log_name}`]: "info"}})
    ),

    {timeout: 300}
  );

  let lv_info = LogValidator(
    log,
    {matched_patterns: [".*INFO.*"], failure_patterns: [".*DEBUG.*"]}
  );

  lv_info.start_monitoring();
  provider.refresh_provider_relationships({wait: 600});
  if (!lv_info.validate({wait: "60s"})) throw new ();

  wait_for(
    () => (
      appliance.server.update_advanced_settings({log: {[`level_${provider.log_name}`]: "warn"}})
    ),

    {timeout: 300}
  );

  let lv = LogValidator(log, {failure_patterns: [".*INFO.*"]});

  let _no_info = () => {
    lv.start_monitoring();
    provider.refresh_provider_relationships({wait: 600});

    try {
      if (!lv.validate()) throw new ()
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof FailPatternMatchError) {
        return false
      } else {
        throw $EXCEPTION
      }
    }
  };

  wait_for(
    method("_no_info"),
    {num_sec: 900, delay: 40, message: "no INFOs in the log"}
  );

  appliance.server.update_advanced_settings({log: {[`level_${provider.log_name}`]: log_level}})
}
