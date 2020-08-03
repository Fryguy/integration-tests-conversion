require_relative 'dateutil'
include Dateutil
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
def test_configure_vmdb_last_start_time(appliance)
  # 
  #       Go to Settings -> Configure -> Database
  #       Compare Vmdb Last Start Time with direct postgres query:
  #       > select pg_postmaster_start_time() at time zone 'utc';
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       endsin: 5.10
  #       initialEstimate: 1/12h
  #   
  db_last_start_time = appliance.db.client.session.execute("select pg_postmaster_start_time() at time zone 'utc'").first()[0].strftime("%Y-%m-%d %H:%M:%S")
  view = navigate_to(appliance.server, "DatabaseSummary")
  ui_last_start_time = parser.parse(view.properties.get_text_of("Last Start Time")).strftime("%Y-%m-%d %H:%M:%S")
  raise "Last start time #{ui_last_start_time} does not match DB value #{db_last_start_time}." unless ui_last_start_time == db_last_start_time
end
def test_configuration_database_garbage_collection(appliance)
  # 
  #       Navigate to Settings -> Configuration -> Diagnostics -> CFME Region -> Database
  #       Submit Run database Garbage Collection Now a check UI/logs for errors.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #   
  evm_tail = LogValidator("/var/www/miq/vmdb/log/evm.log", matched_patterns: [".*Queued the action: \\[Database GC\\] being run for user:.*"], failure_patterns: [".*ERROR.*"])
  evm_tail.start_monitoring()
  view = navigate_to(appliance.server.zone.region, "Database")
  view.submit_db_garbage_collection_button.click()
  view.flash.assert_message("Database Garbage Collection successfully initiated")
  raise unless evm_tail.validate(wait: "30s")
end
