require_relative("datetime");
include(Datetime);
require_relative("datetime");
include(Datetime);
require_relative("wrapanapi");
include(Wrapanapi);
require_relative("cfme");
include(Cfme);
require_relative("cfme/control/explorer");
include(Cfme.Control.Explorer);
require_relative("cfme/control/explorer");
include(Cfme.Control.Explorer);
require_relative("cfme/control/explorer/alert_profiles");
include(Cfme.Control.Explorer.Alert_profiles);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/tests/control");
include(Cfme.Tests.Control);
require_relative("cfme/tests/control");
include(Cfme.Tests.Control);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/ssh");
include(Cfme.Utils.Ssh);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pf1 = ProviderFilter({classes: [InfraProvider]});

let pf2 = ProviderFilter({
  classes: [SCVMMProvider, RHEVMProvider],
  inverted: true
});

const CANDU_PROVIDER_TYPES = [VMwareProvider];

let pytestmark = [
  pytest.mark.long_running,

  pytest.mark.meta({server_roles: [
    "+automate",
    "+smartproxy",
    "+notifier"
  ]}),

  pytest.mark.provider(CANDU_PROVIDER_TYPES, {scope: "module"}),
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.tier(3),
  test_requirements.alert
];

function wait_for_alert(smtp, alert, { delay = null, additional_checks = null }) {
  // DRY waiting function
  // 
  //   Args:
  //       smtp: smtp_test funcarg
  //       alert: Alert name
  //       delay: Optional delay to pass to wait_for
  //       additional_checks: Additional checks to perform on the mails. Keys are names of the mail
  //           sections, values the values to look for.
  //   
  logger.info(
    "Waiting for informative e-mail of alert %s to come",
    alert.description
  );

  additional_checks = additional_checks || {};

  let _mail_arrived = () => {
    for (let mail in smtp.get_emails()) {
      if (mail.subject.include(`Alert Triggered: ${alert.description}`)) {
        if (is_bool(!additional_checks)) {
          return true
        } else {
          for (let [key, value] in additional_checks.to_a()) {
            if (mail.get(key, "").include(value)) return true
          }
        }
      }
    };

    return false
  };

  wait_for(
    method("_mail_arrived"),
    {num_sec: delay, delay: 5, message: "wait for e-mail to come!"}
  )
};

function setup_for_alerts(appliance) {
  // fixture wrapping the function defined within, for delayed execution during the test
  // 
  //   Returns:
  //       unbound function object for calling during the test
  //   
  let _setup_for_alerts = (request, alerts_list, { event = null, vm_name = null, provider = null }) => {
    let action, policy, policy_profile;

    // This function takes alerts and sets up CFME for testing it. If event and further args are
    //     not specified, it won't create the actions and policy profiles.
    // 
    //     Args:
    //         request: py.test funcarg request
    //         alerts_list: list of alert objects
    //         event: Event to hook on (VM Power On, ...)
    //         vm_name: VM name to use for policy filtering
    //         provider: funcarg provider
    //     
    let alert_profile = appliance.collections.alert_profiles.create(
      alert_profiles.VMInstanceAlertProfile,
      `Alert profile for ${vm_name}`,
      {alerts: alerts_list}
    );

    request.addfinalizer(alert_profile.delete);
    let view = appliance.browser.create_view(AlertProfileDetailsView);

    if (is_bool(alert_profile.assign_to("The Enterprise"))) {
      view.flash.assert_message("Alert Profile \"{}\" assignments successfully saved".format(alert_profile.description))
    } else {
      view.flash.assert_message("Edit Alert Profile assignments cancelled by user")
    };

    if (!event.equal(null)) {
      action = appliance.collections.actions.create(
        `Evaluate Alerts for ${vm_name}`,
        "Evaluate Alerts",

        {
          action_values: {alerts_to_evaluate: alerts_list.map(alert => alert.to_s)}
        }
      );

      request.addfinalizer(action.delete);

      policy = appliance.collections.policies.create(
        policies.VMControlPolicy,
        `Evaluate Alerts policy for ${vm_name}`,
        {scope: `fill_field(VM and Instance : Name, INCLUDES, ${vm_name})`}
      );

      request.addfinalizer(policy.delete);

      policy_profile = appliance.collections.policy_profiles.create(
        `Policy profile for ${vm_name}`,
        {policies: [policy]}
      );

      request.addfinalizer(policy_profile.delete);
      policy.assign_actions_to_event(event, [action]);
      provider.assign_policy_profiles(policy_profile.description);

      return request.addfinalizer(() => (
        provider.unassign_policy_profiles(policy_profile.description)
      ))
    }
  };

  return _setup_for_alerts
};

function set_performance_capture_threshold(appliance) {
  let yaml_data = {performance: {capture_threshold_with_alerts: {vm: "3.minutes"}}};
  appliance.update_advanced_settings(yaml_data);
  yield;
  yaml_data = {performance: {capture_threshold_with_alerts: {vm: "20.minutes"}}};
  appliance.update_advanced_settings(yaml_data)
};

function setup_candu(appliance) {
  let candu = appliance.collections.candus;
  candu.enable_all();

  appliance.server.settings.enable_server_roles(
    "ems_metrics_coordinator",
    "ems_metrics_collector",
    "ems_metrics_processor"
  );

  yield;

  appliance.server.settings.disable_server_roles(
    "ems_metrics_coordinator",
    "ems_metrics_collector",
    "ems_metrics_processor"
  );

  candu.disable_all()
};

function wait_candu(create_vm) {
  create_vm.wait_candu_data_available({timeout: 20 * 60})
};

function ssh(provider, full_template, create_vm) {
  SSHClient(
    {
      username: credentials[full_template.creds].username,
      password: credentials[full_template.creds].password,
      hostname: create_vm.mgmt.ip
    },

    (ssh_client) => {
      yield(ssh_client)
    }
  )
};

function setup_snmp(appliance) {
  appliance.ssh_client.run_command("echo 'disableAuthorization yes' >> /etc/snmp/snmptrapd.conf");
  appliance.ssh_client.run_command("systemctl start snmptrapd.service");
  yield;
  appliance.ssh_client.run_command("systemctl stop snmptrapd.service");
  appliance.ssh_client.run_command("sed -i '$ d' /etc/snmp/snmptrapd.conf")
};

function test_alert_vm_turned_on_more_than_twice_in_past_15_minutes(request, appliance, provider, create_vm, smtp_test, setup_for_alerts) {
  //  Tests alerts for vm turned on more than twice in 15 minutes
  // 
  //   Metadata:
  //       test_flag: alerts, provision
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Control
  //       initialEstimate: 1/4h
  //   
  let vm = create_vm;
  let alert = appliance.collections.alerts.instantiate("VM Power On > 2 in last 15 min");

  update(alert, () => {
    alert.active = true;
    alert.emails = fauxfactory.gen_email();
    if (appliance.version >= "5.11.0.7") alert.severity = "Error"
  });

  setup_for_alerts.call(
    request,
    [alert],
    "VM Power On",
    vm.name,
    provider
  );

  vm.mgmt.ensure_state(VmState.STOPPED);
  provider.refresh_provider_relationships();
  vm.wait_for_vm_state_change(vm.STATE_OFF);

  for (let i in (5).times) {
    vm.power_control_from_cfme({option: vm.POWER_ON, cancel: false});
    vm.mgmt.wait_for_state(VmState.RUNNING, {timeout: 300});
    vm.wait_for_vm_state_change(vm.STATE_ON);
    vm.power_control_from_cfme({option: vm.POWER_OFF, cancel: false});
    vm.mgmt.wait_for_state(VmState.STOPPED);
    vm.wait_for_vm_state_change(vm.STATE_OFF)
  };

  wait_for_alert(smtp_test, alert, {delay: 16 * 60})
};

function test_alert_rtp(request, appliance, create_vm, smtp_test, provider, setup_candu, wait_candu, setup_for_alerts) {
  //  Tests a custom alert that uses C&U data to trigger an alert. Since the threshold is set to
  //   zero, it will start firing mails as soon as C&U data are available.
  // 
  //   Metadata:
  //       test_flag: alerts, provision, metrics_collection
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Control
  //       initialEstimate: 1/6h
  //   
  let email = fauxfactory.gen_email();

  let alert = appliance.collections.alerts.create(
    fauxfactory.gen_alpha({length: 20, start: "Trigger by CPU "}),

    {
      active: true,
      based_on: "VM and Instance",

      evaluate: ["Real Time Performance", {
        performance_field: "CPU - % Used",
        performance_field_operator: ">",
        performance_field_value: "0",
        performance_trend: "Don't Care",
        performance_time_threshold: "3 Minutes"
      }],

      notification_frequency: "5 Minutes",
      emails: email
    }
  );

  request.addfinalizer(alert.delete);
  setup_for_alerts.call(request, [alert]);

  wait_for_alert(smtp_test, alert, {
    delay: 30 * 60,
    additional_checks: {text: create_vm.name, from_address: email}
  })
};

function test_alert_timeline_cpu(request, appliance, create_vm, set_performance_capture_threshold, provider, ssh, setup_candu, wait_candu, setup_for_alerts) {
  //  Tests a custom alert that uses C&U data to trigger an alert. It will run a script that makes
  //   a CPU spike in the machine to trigger the threshold. The alert is displayed in the timelines.
  // 
  //   Metadata:
  //       test_flag: alerts, provision, metrics_collection
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Control
  //       initialEstimate: 1/6h
  //   
  let alert = appliance.collections.alerts.create(
    fauxfactory.gen_alpha({length: 20, start: "TL event by CPU "}),

    {
      active: true,
      based_on: "VM and Instance",

      evaluate: ["Real Time Performance", {
        performance_field: "CPU - % Used",
        performance_field_operator: ">=",
        performance_field_value: "10",
        performance_trend: "Don't Care",
        performance_time_threshold: "2 Minutes"
      }],

      notification_frequency: "1 Minute",
      timeline_event: true
    }
  );

  request.addfinalizer(alert.delete);
  setup_for_alerts.call(request, [alert], {vm_name: create_vm.name});
  ssh.cpu_spike({seconds: 60 * 15, cpus: 2, ensure_user: true});
  let timeline = create_vm.open_timelines();

  timeline.filter.fill({
    event_category: "Alarm/Status Change/Errors",
    time_range: "Weeks",
    calendar: ("{dt.month}/{dt.day}/{dt.year}").format({dt: Datetime.now() + timedelta({days: 1})})
  });

  timeline.filter.apply.click();
  let events = timeline.chart.get_events();
  let __dummy0__ = false;

  for (let event in events) {
    if (event.message.include(alert.description)) break;
    if (event == events[-1]) __dummy0__ = true
  };

  if (__dummy0__) {
    pytest.fail(`The event has not been found on the timeline. Event list: ${events}`)
  }
};

function test_alert_snmp(request, appliance, provider, setup_snmp, setup_candu, create_vm, wait_candu, setup_for_alerts) {
  //  Tests a custom alert that uses C&U data to trigger an alert. Since the threshold is set to
  //   zero, it will start firing mails as soon as C&U data are available. It uses SNMP to catch the
  //   alerts. It uses SNMP v2.
  // 
  //   Metadata:
  //       test_flag: alerts, provision, metrics_collection
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Control
  //       initialEstimate: 1/6h
  //   
  let match_string = fauxfactory.gen_alpha({length: 8});

  let alert = appliance.collections.alerts.create(
    fauxfactory.gen_alpha({length: 20, start: "Trigger by CPU "}),

    {
      active: true,
      based_on: "VM and Instance",

      evaluate: ["Real Time Performance", {
        performance_field: "CPU - % Used",
        performance_field_operator: ">=",
        performance_field_value: "0",
        performance_trend: "Don't Care",
        performance_time_threshold: "3 Minutes"
      }],

      notification_frequency: "1 Minute",

      snmp_trap: {
        hosts: "127.0.0.1",
        version: "v2",
        id: "info",
        traps: [["1.2.3", "OctetString", `${match_string}`]]
      }
    }
  );

  request.addfinalizer(alert.delete);
  setup_for_alerts.call(request, [alert]);

  let _snmp_arrived = () => {
    let result = appliance.ssh_client.run_command(`journalctl --no-pager /usr/sbin/snmptrapd | grep ${match_string}`);

    if (is_bool(result.failed)) {
      return false
    } else if (is_bool(result.output)) {
      return true
    } else {
      return false
    }
  };

  wait_for(
    method("_snmp_arrived"),
    {timeout: "30m", delay: 60, message: "SNMP trap arrived."}
  )
};

function test_alert_hardware_reconfigured(request, appliance, configure_fleecing, smtp_test, create_vm, setup_for_alerts) {
  // Tests alert based on \"Hardware Reconfigured\" evaluation.
  // 
  //   According https://bugzilla.redhat.com/show_bug.cgi?id=1396544 Hardware Reconfigured alerts
  //   require drift history. So here are the steps for triggering hardware reconfigured alerts based
  //   on CPU Count:
  //       1. Run VM smart state analysis.
  //       2. Change CPU count.
  //       3. Run VM smart state analysis again.
  //       4. Run VM reconfigure again.
  //   Then the alert for CPU count change should be triggered. It is either CPU increased or decreased
  //   depending on what has been done in your step 2, not the result of step 4. Step 4 is just to
  //   trigger the event.
  // 
  //   Bugzilla:
  //       1396544
  //       1730805
  // 
  //   Metadata:
  //       test_flag: alerts, provision
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Control
  //       initialEstimate: 1/4h
  //   
  let vm = create_vm;
  let email = fauxfactory.gen_email();
  let service_request_desc = "VM Reconfigure for: {0} - Processor Sockets: {1}, Processor Cores Per Socket: 1, Total Processors: {1}";

  let alert = appliance.collections.alerts.create(
    fauxfactory.gen_alpha({
      length: 36,
      start: "Trigger by hardware reconfigured "
    }),

    {
      active: true,
      based_on: "VM and Instance",

      evaluate: [
        "Hardware Reconfigured",
        {hardware_attribute: "Number of CPU Cores", operator: "Increased"}
      ],

      notification_frequency: "1 Minute",
      emails: email
    }
  );

  request.addfinalizer(alert.delete);
  setup_for_alerts.call(request, [alert], {vm_name: vm.name});
  wait_for_ssa_enabled(vm);
  let sockets_count = vm.configuration.hw.sockets;

  for (let i in (1).upto(3 - 1)) {
    do_scan(vm, {rediscover: false});

    vm.reconfigure({changes: {
      cpu: true,
      sockets: (sockets_count + i).to_s,
      disks: [],
      network_adapters: []
    }});

    let service_request = appliance.collections.requests.instantiate({description: service_request_desc.format(
      vm.name,
      sockets_count + i
    )});

    service_request.wait_for_request({
      method: "ui",
      num_sec: 300,
      delay: 10
    })
  };

  wait_for_alert(smtp_test, alert, {
    delay: 30 * 60,
    additional_checks: {text: vm.name, from_address: email}
  })
}
