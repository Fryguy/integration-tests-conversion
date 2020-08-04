require_relative 'datetime'
include Datetime
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/ssh'
include Cfme::Utils::Ssh
require_relative 'cfme/utils/timeutil'
include Cfme::Utils::Timeutil
pytestmark = [test_requirements.bottleneck, pytest.mark.uncollectif(lambda{|appliance| appliance.is_pod}, reason: "Tests not supported on pod appliance"), pytest.mark.ignore_stream("5.11")]
def db_tbl(temp_appliance_extended_db)
  app = temp_appliance_extended_db
  return app.db.client["bottleneck_events"]
end
def db_events(temp_appliance_extended_db, db_tbl)
  app = temp_appliance_extended_db
  return app.db.client.session.query(db_tbl.timestamp, db_tbl.resource_type, db_tbl.resource_name, db_tbl.event_type, db_tbl.severity, db_tbl.message)
end
def db_restore(temp_appliance_extended_db)
  app = temp_appliance_extended_db
  ver = temp_appliance_extended_db.version.to_s.gsub(".", "_")
  ver = (ver[3] == "_") ? ver[0...3] : ver[0...4]
  db_storage_hostname = conf.cfme_data.bottlenecks.hostname
  db_storage_ssh = SSHClient(hostname: db_storage_hostname, None: conf.credentials.bottlenecks)
  rand_filename = "/tmp/db.backup_#{fauxfactory.gen_alphanumeric()}"
  db_storage_ssh.get_file(("{}/db.backup_{}").format(conf.cfme_data.bottlenecks.backup_path, ver), rand_filename)
  app.ssh_client.put_file(rand_filename, "/tmp/evm_db.backup")
  app.evmserverd.stop()
  app.db.drop()
  app.db.create()
  app.db.restore()
  app.db.migrate()
  app.db.fix_auth_key()
  app.db.fix_auth_dbyml()
  app.evmserverd.start()
  app.wait_for_web_ui()
end
def test_bottlenecks_report_event_groups(temp_appliance_extended_db, db_restore, db_tbl, db_events)
  #  Checks event_groups selectbox in report tab. It should filter events by type
  # 
  #   Polarion:
  #       assignee: nachandr
  #       initialEstimate: 1/4h
  #       casecomponent: Optimize
  #   
  col = temp_appliance_extended_db.collections.bottlenecks
  view = navigate_to(col, "All")
  view.report.show_host_events.fill(true)
  view.report.event_groups.fill("Capacity")
  rows = view.report.event_details.rows()
  raise unless rows.map{|row| 1}.sum == db_events.filter(db_tbl.event_type == "DiskUsage").count()
  view.report.event_groups.fill("Utilization")
  rows = view.report.event_details.rows()
  raise unless rows.map{|row| 1}.sum == db_events.filter(db_tbl.event_type != "DiskUsage").count()
end
def test_bottlenecks_report_show_host_events(temp_appliance_extended_db, db_restore, db_events)
  #  Checks host_events checkbox in report tab. It should show or not host events
  # 
  #   Polarion:
  #       assignee: nachandr
  #       initialEstimate: 1/4h
  #       casecomponent: Optimize
  #   
  col = temp_appliance_extended_db.collections.bottlenecks
  view = navigate_to(col, "All")
  view.report.show_host_events.fill(false)
  rows = view.report.event_details.rows(type: "Host / Node")
  raise unless !rows.map{|row| 1}.sum
  view.report.show_host_events.fill(true)
  rows = view.report.event_details.rows()
  raise unless rows.map{|row| 1}.sum == db_events.count()
end
def test_bottlenecks_report_time_zone(temp_appliance_extended_db, db_restore, db_tbl, db_events)
  #  Checks time zone selectbox in report tab. It should change time zone of events in table
  # 
  #   Polarion:
  #       assignee: nachandr
  #       initialEstimate: 1/4h
  #       casecomponent: Optimize
  #   
  col = temp_appliance_extended_db.collections.bottlenecks
  view = navigate_to(col, "All")
  row = view.report.event_details[0]
  db_row = db_events.filter(db_tbl.message == row[5].text)
  raise unless row[0].text == db_row[0][0].strftime(parsetime.american_with_utc_format)
  view.report.time_zone.fill("(GMT-04:00) La Paz")
  row = view.report.event_details[0]
  raise unless row[0].text == (db_row[0][0] - timedelta(hours: 4)).strftime("%m/%d/%y %H:%M:%S -04")
end
def test_bottlenecks_summary_event_groups(temp_appliance_extended_db, db_restore, db_tbl, db_events)
  #  Checks event_groups selectbox in summary tab. It should filter events by type
  # 
  #   Polarion:
  #       assignee: nachandr
  #       initialEstimate: 1/4h
  #       casecomponent: Optimize
  #   
  col = temp_appliance_extended_db.collections.bottlenecks
  view = navigate_to(col, "All")
  view.summary.show_host_events.fill(true)
  view.summary.event_groups.fill("Capacity")
  events = view.summary.chart.get_events()
  raise unless events.size == db_events.filter(db_tbl.event_type == "DiskUsage").count()
  view.summary.event_groups.fill("Utilization")
  events = view.summary.chart.get_events()
  raise unless events.size == db_events.filter(db_tbl.event_type != "DiskUsage").count()
end
def test_bottlenecks_summary_show_host_events(temp_appliance_extended_db, db_restore, db_events)
  #  Checks host_events checkbox in summary tab. It should show or not host events
  # 
  #   Polarion:
  #       assignee: nachandr
  #       initialEstimate: 1/4h
  #       casecomponent: Optimize
  #   
  col = temp_appliance_extended_db.collections.bottlenecks
  view = navigate_to(col, "All")
  view.summary.show_host_events.fill(false)
  events = view.summary.chart.get_events()
  raise unless !events.map{|event| 1}.sum
  view.summary.show_host_events.fill(true)
  events = view.summary.chart.get_events()
  raise unless events.size == db_events.count()
end
def test_bottlenecks_summary_time_zone(temp_appliance_extended_db, db_restore, db_tbl, db_events)
  #  Checks time zone selectbox in summary tab. It should change time zone of events in chart
  # 
  #   Polarion:
  #       assignee: nachandr
  #       initialEstimate: 1/4h
  #       casecomponent: Optimize
  #   
  col = temp_appliance_extended_db.collections.bottlenecks
  view = navigate_to(col, "All")
  events = view.summary.chart.get_events()
  db_row = db_events.filter(db_tbl.message == events[0].message)
  raise unless events[0].time_stamp == db_row[0][0].strftime(parsetime.iso_with_utc_format)
  view.summary.time_zone.fill("(GMT-04:00) La Paz")
  events = view.summary.chart.get_events()
  raise unless events[0].time_stamp == (db_row[0][0] - timedelta(hours: 4)).strftime("%Y-%m-%d %H:%M:%S -04")
end
