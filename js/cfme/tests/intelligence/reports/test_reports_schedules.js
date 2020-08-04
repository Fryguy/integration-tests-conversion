require_relative("cfme");
include(Cfme);
require_relative("cfme/intelligence/reports/schedules");
include(Cfme.Intelligence.Reports.Schedules);
require_relative("cfme/intelligence/reports/schedules");
include(Cfme.Intelligence.Reports.Schedules);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _users = users.bind(this);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/ftp");
include(Cfme.Utils.Ftp);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/path");
include(Cfme.Utils.Path);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.report,
  pytest.mark.tier(3),
  pytest.mark.sauce
];

const SCHEDULES_REPORT_DIR = "schedules_crud".data_path.join;

const TIMER = {
  monthly: {
    run: "Monthly",
    timer_month: "2 Months",
    hour: "12",
    minute: "5",
    time_zone: "(GMT+10:00) Melbourne"
  },

  hourly: {
    run: "Hourly",
    timer_hour: "6 Hours",
    hour: "12",
    minute: "5",
    time_zone: "(GMT+10:00) Melbourne"
  },

  daily: {
    run: "Daily",
    timer_day: "2 Days",
    hour: "12",
    minute: "5",
    time_zone: "(GMT+10:00) Melbourne"
  },

  weekly: {
    run: "Weekly",
    timer_week: "3 Weeks",
    hour: "12",
    minute: "5",
    time_zone: "(GMT+10:00) Melbourne"
  },

  once: {
    run: "Once",
    hour: "12",
    minute: "5",
    time_zone: "(GMT+10:00) Melbourne"
  }
};

const INVALID_EMAILS = {
  string: fauxfactory.gen_alpha(),
  "multiple-dots": "{name}..{name}@example..com".format({name: fauxfactory.gen_alpha(5)}),
  brackets: "{name}@example.com({name})".format({name: fauxfactory.gen_alpha(5)}),
  "leading-dot": ".{name}@example.com".format({name: fauxfactory.gen_alpha(5)}),
  dash: ("{name}@-example.com").format({name: fauxfactory.gen_alpha(5)}),
  "missing-@": "{name}.example.com".format({name: fauxfactory.gen_alpha(5)}),
  "trailing-dot": "{name}.@example.com".format({name: fauxfactory.gen_alpha(5)}),
  "missing-username": "@example.com"
};

function schedule_files() {
  let result = [];
  if (is_bool(!SCHEDULES_REPORT_DIR.exists)) SCHEDULES_REPORT_DIR.mkdir();

  for (let file_name in SCHEDULES_REPORT_DIR.listdir()) {
    if (is_bool(file_name.isfile() && file_name.basename.end_with(".yaml"))) {
      result.push(file_name.basename)
    }
  };

  return result
};

function schedule_data(request) {
  request.param.SCHEDULES_REPORT_DIR.join.open(
    {mode: "r"},
    rep_yaml => yaml.safe_load(rep_yaml)
  )
};

function schedule(schedule_data, appliance) {
  let schedule = appliance.collections.schedules.create({None: schedule_data});
  yield(schedule);
  schedule.delete_if_exists()
};

function user(appliance, request) {
  let [users, user_data] = _users(request, appliance, {
    name: "Sherlock Holmes",
    email: "shholmes@redhat.com",
    userid: "shholmes",
    password: "smartvm",
    group: "EvmGroup-super_administrator"
  });

  return users[0]
};

function test_schedule_queue(appliance, request, interval, schedule_data) {
  //  To test scheduling of report using options: Once, Hourly, Daily, Weekly, Monthly
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       initialEstimate: 1/10h
  //       tags: report
  //   
  schedule_data.timer = TIMER[interval];
  let schedule = appliance.collections.schedules.create({None: schedule_data});
  request.addfinalizer(schedule.delete_if_exists);
  schedule.queue();
  if (schedule.timer != TIMER[interval]) throw new ();
  let view = schedule.create_view(ScheduleDetailsView);
  view.flash.assert_message("The selected Schedule has been queued to run")
};

function test_report_schedules_invalid_email(appliance, schedule_data, email) {
  // 
  //   This test case checks if invalid emails are accepted while creating a schedule
  // 
  //   TODO: In addition to above patterns, there are few invalid patterns which are still accepted.
  //   Patterns such as: xyz@example@example.com, xyz@example, ?/><!$%@example.com
  //   BZ(1684491) has been filed for this.
  // 
  //   Bugzilla:
  //       1684491
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //       tags: report
  //   
  schedule_data.email.to_emails = schedule_data.email.from_email = INVALID_EMAILS[email];

  pytest.raises(
    RuntimeError,
    () => appliance.collections.schedules.create({None: schedule_data})
  );

  let view = appliance.collections.schedules.create_view(NewScheduleView);
  view.flash.assert_message("One of e-mail addresses 'To' is not valid");
  view.flash.assert_message("E-mail address 'From' is not valid")
};

function test_reports_create_schedule_send_report(smtp_test, schedule) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: medium
  //       initialEstimate: 1/2h
  //       startsin: 5.8
  //       tags: report
  //       setup:
  //           1. Navigate to Cloud > Intel > Reports > Schedules.
  //           2. Click on `Configuration` and select `Add a new Schedule`.
  //           3. Create schedule that send an email to more than one users.
  //           Un-check \"Send if Report is Empty\" option.
  //       testSteps:
  //           1. Queue up this Schedule and check if the email was sent.
  //       expectedResults:
  //           1. Queueing the schedule must send the report via email to all the users.
  //   
  schedule.queue();
  let emails_sent = schedule.email.get("to_emails", []).join(",");
  let initial_count = smtp_test.get_emails().size;

  wait_for(
    () => smtp_test.get_emails().size > initial_count,
    {num_sec: 90, delay: 5}
  );

  if (smtp_test.get_emails({to_address: emails_sent}).size != 1) throw new ()
};

function test_reports_disable_enable_schedule(appliance, schedule) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       initialEstimate: 1/10h
  //       tags: report
  //   
  let schedules = appliance.collections.schedules;
  schedules.disable_schedules(schedule);
  if (!!schedule.enabled) throw new ();
  schedules.enable_schedules(schedule);
  if (!schedule.enabled) throw new ()
};

function test_reports_disable_enable_schedule_from_summary(appliance, schedule) {
  // 
  //   This test checks if schedule can be enabled/disabled from it's summary page.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       initialEstimate: 1/10h
  // 
  //   Bugzilla:
  //       1559335
  //   
  let view = navigate_to(schedule, "Details");
  view.configuration.item_select("Disable this Schedule");
  if (!!schedule.enabled) throw new ();
  navigate_to(schedule, "Details");
  view.configuration.item_select("Enable this Schedule");
  if (!schedule.enabled) throw new ()
};

function test_reports_schedules_user(appliance, request, user, schedule_data) {
  // 
  //   This test checks if a user is visible under the Emails options of schedule form
  //   while creating a schedule
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       initialEstimate: 1/10h
  //       setup:
  //           1. Create a user with an email belonging to the same group as logged in user.
  //       testSteps:
  //           1. Create a schedule and check if the newly created user is available
  //           under `User` dropdown.
  //   
  schedule_data.email = {user_email: `${user.name} (${user.email})`};
  let schedule = appliance.collections.schedules.create({None: schedule_data});
  request.addfinalizer(schedule.delete);
  if (!schedule.exists) throw new ();
  let view = schedule.create_view(ScheduleDetailsView);

  if (view.schedule_info.get_text_of("To E-mail") != `${user.name} (${user.email})`) {
    throw new ()
  }
};

function test_miq_schedule_validation_failed(temp_appliance_preconfig) {
  // 
  //   Bugzilla:
  //       1729441
  //       1740229
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       initialEstimate: 1/10h
  //       testSteps:
  //           1. Restore the customer database and monitor the EVM logs while restoring.
  //           2. Restart the server.
  //       expectedResults:
  //           1. Should not encounter the following message(refer BZ description) in the logs.
  //           2. Server should restart successfully.
  //   
  let appliance = temp_appliance_preconfig;
  let dump = FTPClientWrapper(cfme_data.ftpserver.entities.databases).get_file("miqschedule_dump");
  let dump_destination = File.join("/tmp", dump.name);

  if (is_bool(!(appliance.ssh_client.run_command(`curl -o ${dump_destination} ftp://${dump.link}`)).success)) {
    pytest.fail("Failed to download the file to the appliance.")
  };

  (LogValidator("/var/www/miq/vmdb/log/evm.log", {
    failure_patterns: [".* ERROR .*Validation failed: MiqSchedule:.*Name has already been taken.*Method.*"],

    matched_patterns: [
      ".*INFO.* Widget: .*chart_server_availability.* file has been .* disk.*",
      ".*INFO.* : MIQ.*EvmDatabase.seed.* Seeding MiqAction.*"
    ]
  })).waiting(() => (
    appliance.db.restore_database({
      db_path: dump_destination,
      is_major: bool(appliance.version > "5.11")
    })
  ))
}
