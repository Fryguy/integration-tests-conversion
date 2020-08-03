require_relative 'datetime'
include Datetime
require_relative 'datetime'
include Datetime
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.configuration, pytest.mark.rhel_testing]
STAT_CMD = "stat --format '%y' /etc/chrony.conf"
POOL_SED_CMD = "sed -i 's/^pool /# &/' /etc/chrony.conf"
def ntp_server_keys(appliance)
  # Return list of NTP server keys (widget attribute names) from ServerInformationView
  return appliance.server.settings.ntp_servers_fields_keys
end
def empty_ntp(ntp_server_keys)
  # Return dictionary of NTP server keys with blank values
  return dict.fromkeys(ntp_server_keys, "")
end
def random_ntp(ntp_server_keys)
  # Return dictionary of NTP server keys with random alphanumeric values
  return {zip_p(ntp_server_keys, 3.times.map{|_| fauxfactory.gen_alphanumeric()})}
end
def random_max_ntp(ntp_server_keys)
  # Return dictionary of NTP server keys with random alphanumeric values of max length
  return {zip_p(ntp_server_keys, 3.times.map{|_| fauxfactory.gen_alphanumeric(255)})}
end
def config_ntp(ntp_server_keys)
  # Return dictionary of NTP server keys with server names from config yaml
  return {zip_p(ntp_server_keys, cfme_data["clock_servers"])}
end
def appliance_date(appliance)
  # Return appliance server datetime, in ISO-8601 format
  result = appliance.ssh_client.run_command("date --iso-8601")
  return Datetime::fromisoformat(result.output.rstrip())
end
def chrony_servers(appliance)
  # Return list of the NTP servers from /etc/chrony.conf
  servers = appliance.ssh_client.run_command().output
  return servers.split("
").map{|s| s.split()[1]}
end
def clear_ntp_settings(appliance, empty_ntp)
  # Clear all NTP servers in the UI
  last_updated = appliance.ssh_client.run_command(STAT_CMD).output
  appliance.server.settings.update_ntp_servers(empty_ntp)
  wait_for(lambda{|| last_updated != appliance.ssh_client.run_command(STAT_CMD).output}, num_sec: 60, delay: 10)
end
def update_check_ntp(appliance, ntp_fill)
  # Update NTP servers in the UI, then verify that the changes are reflected in
  #   /etc/chrony.conf.
  # 
  #   Args:
  #       appliance: appliance to update
  #       ntp_fill: :py:class:`dict` of servers to add to UI
  #   
  appliance.server.settings.update_ntp_servers(ntp_fill)
  expected_servers = ntp_fill.values().select{|s| s != ""}.map{|s| s}
  if is_bool(!expected_servers)
    expected_servers = appliance.server.zone.advanced_settings["ntp"]["server"]
  end
  wait_for(lambda{|| chrony_servers(appliance) == expected_servers}, num_sec: 60, delay: 10)
end
def test_ntp_crud(request, appliance, random_ntp, empty_ntp, config_ntp)
  # Update and delete NTP servers in the Server Configuration page, and verify that they are
  #   updated in /etc/chrony.conf. Finally, restore the NTP servers to the yaml config values.
  # 
  #   TODO: Implement zone- and region-level NTP settings.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Configuration
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #   
  request.addfinalizer(lambda{|| update_check_ntp(appliance, config_ntp)})
  update_check_ntp(appliance, random_ntp)
  update_check_ntp(appliance, config_ntp)
  update_check_ntp(appliance, empty_ntp)
end
def test_ntp_server_max_character(request, appliance, random_max_ntp, config_ntp)
  # Update NTP servers in UI with 255 char hostname values, and verify that they are added to
  #   /etc/chrony.conf, then restore the NTP servers to the yaml config values.
  # 
  #   TODO: Implement zone- and region-level NTP settings.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Configuration
  #       caseimportance: low
  #       initialEstimate: 1/8h
  #   
  request.addfinalizer(lambda{|| update_check_ntp(appliance, config_ntp)})
  update_check_ntp(appliance, random_max_ntp)
end
def test_ntp_server_check(appliance)
  # Modify server date, and verify that the configured NTP servers restore it.
  # 
  #   TODO: Implement zone- and region-level NTP settings.
  # 
  #   Bugzilla:
  #       1832278
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Configuration
  #   
  orig_date = appliance_date(appliance)
  past_date = orig_date - timedelta(days: 1)
  logger.info()
  appliance.ssh_client.run_command(POOL_SED_CMD)
  appliance.ssh_client.run_command("systemctl restart chronyd")
  appliance.ssh_client.run_command()
  raise "Failed to modify appliance date." unless appliance_date(appliance) == past_date
  logger.info("Successfully modified the date in the appliance.")
  wait_for(lambda{|| ((appliance_date(appliance) - orig_date).total_seconds()).abs <= 3600}, delay: 10, num_sec: 300)
end
