require_relative 'dateutil'
include Dateutil
require_relative 'dateutil'
include Dateutil
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/ui'
include Cfme::Base::Ui
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.provider([VMwareProvider], required_fields: ["hosts"], selector: ONE, scope: "module"), pytest.mark.usefixtures("setup_provider_modscope"), test_requirements.scheduled_ops]
run_types = [["Once", nil, nil], ["Hourly", "hours", 1], ["Daily", "days", 1], ["Weekly", "weeks", 1], ["Monthly", "months", 1]]
def host_with_credentials(appliance, provider)
  #  Add credentials to hosts 
  host = provider.hosts.all()[0]
  host_data, = provider.data["hosts"].select{|data| data["name"] == host.name}.map{|data| data}
  host.update_credentials_rest(credentials: host_data["credentials"])
  yield(host)
  host.remove_credentials_rest()
end
def current_server_time(appliance)
  current_time = parser.parse(appliance.ssh_client.run_command("date").output)
  tz_list = appliance.ssh_client.run_command("timedatectl | grep 'Time zone'").output.strip().split_p(" ")
  tz_name = tz_list[2]
  tz_num = tz_list[-1][0...-1]
  date = current_time.gsub(tzinfo: pytz.timezone(tz_name))
  return [date, tz_num]
end
def round_min(value, base: 5)
  return ((base * (round(value.to_f / base.to_f))).to_i == 60) ? 0 : (base * (round(value.to_f / base.to_f))).to_i
end
def test_schedule_crud(appliance, current_server_time)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Reporting
  #       initialEstimate: 1/16h
  #       caseimportance: critical
  #   
  current_time,_ = current_server_time
  start_date = current_time + relativedelta.relativedelta(days: 2)
  schedule = appliance.collections.system_schedules.create(name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), start_date: start_date)
  view = appliance.browser.create_view(BaseLoggedInPage)
  view.flash.assert_message("Schedule \"#{schedule.name}\" was saved")
  start_date_updated = start_date - relativedelta.relativedelta(days: 1)
  updates = {"name" => fauxfactory.gen_alphanumeric(), "description" => fauxfactory.gen_alphanumeric()}
  schedule.update(updates, cancel: true)
  view.flash.assert_message("Edit of Schedule \"#{schedule.name}\" was cancelled by the user")
  schedule.update(updates, reset: true)
  view.flash.assert_message("All changes have been reset")
  update(schedule) {
    schedule.name = fauxfactory.gen_alphanumeric()
    schedule.start_date = start_date_updated
  }
  view.flash.assert_message("Schedule \"#{schedule.name}\" was saved")
  schedule.delete(cancel: true)
  schedule.delete()
  view.flash.assert_message("Schedule \"#{schedule.description}\": Delete successful")
end
def test_schedule_analysis_in_the_past(appliance, current_server_time, request)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  current_time,_ = current_server_time
  past_time = current_time - relativedelta.relativedelta(minutes: 5)
  if round_min(past_time.minute) == 0
    past_time = past_time + relativedelta.relativedelta(hours: 1)
    past_time_minute = "0"
  else
    past_time_minute = round_min(past_time.minute).to_s
  end
  schedule = appliance.collections.system_schedules.create(name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), start_hour: past_time.hour.to_s, start_minute: past_time_minute)
  request.addfinalizer(schedule.delete)
  view = appliance.browser.create_view(BaseLoggedInPage)
  view.flash.assert_message("Warning: This 'Run Once' timer is in the past and will never run as currently configured")
end
def test_create_multiple_schedules_in_one_timezone(appliance, request)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Reporting
  #       initialEstimate: 1/4h
  #   
  schedule_list = []
  request.addfinalizer(lambda{|| schedule_list.map{|item| item.delete()}})
  for i in 6.times
    schedule = appliance.collections.system_schedules.create(name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), time_zone: "(GMT-04:00) Atlantic Time (Canada)")
    view = appliance.browser.create_view(BaseLoggedInPage)
    view.flash.assert_message("Schedule \"#{schedule.name}\" was saved")
    schedule_list.push(schedule)
  end
end
def test_inactive_schedule(appliance, current_server_time)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Reporting
  #       initialEstimate: 1/4h
  #   
  current_time,_ = current_server_time
  start_date = current_time + relativedelta.relativedelta(minutes: 5)
  schedule = appliance.collections.system_schedules.create(name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), start_date: start_date, start_hour: start_date.hour.to_s, start_minute: round_min(start_date.minute).to_s)
  raise unless schedule.next_run_date
  schedule.disable()
  raise unless !schedule.next_run_date
end
def test_schedule_timer(appliance, run_types, host_with_credentials, request, current_server_time)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: critical
  #       casecomponent: Reporting
  #       initialEstimate: 1/4h
  #   
  run_time,time_diff,time_num = run_types
  current_time,tz_num = current_server_time
  start_date = current_time + relativedelta.relativedelta(minutes: 5)
  view = navigate_to(appliance.collections.system_schedules, "Add")
  available_list = view.form.time_zone.all_options
  for tz in available_list
    if is_bool(tz.text.include?("{}:00".format(tz_num[0...3])) && !tz.text.include?("Atlantic Time (Canada)"))
      tz_select = tz.text
      break
    end
  end
  if round_min(start_date.minute) == 0
    start_date = start_date + (relativedelta.relativedelta(minutes: 60 - start_date.minute))
    start_date_minute = start_date.minute.to_s
  else
    start_date_minute = round_min(start_date.minute).to_s
  end
  schedule = appliance.collections.system_schedules.create(name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), action_type: "Host Analysis", filter_level1: "A single Host", filter_level2: host_with_credentials.name, run_type: run_time, start_date: start_date, time_zone: tz_select, start_hour: start_date.hour.to_s, start_minute: start_date_minute)
  _finalize = lambda do
    if is_bool(schedule.exists)
      schedule.delete()
    end
  end
  wait_for(lambda{|| schedule.last_run_date != ""}, delay: 60, timeout: "10m", fail_func: appliance.server.browser.refresh, message: "Scheduled task didn't run in first time")
  if is_bool(time_diff)
    next_date = parser.parse(schedule.next_run_date)
    up = {"time_diff" => time_num}
    next_run_date = start_date + (relativedelta.relativedelta(minutes: -5, None: up))
    appliance.ssh_client.run_command("date {}".format(next_run_date.strftime("%m%d%H%M%Y")))
    wait_for(lambda{|| next_date.strftime("%m%d%H") == parser.parse(schedule.last_run_date).strftime("%m%d%H")}, delay: 60, timeout: "10m", fail_func: appliance.server.browser.refresh, message: "Scheduled task didn't run in appropriate time set")
  end
end
