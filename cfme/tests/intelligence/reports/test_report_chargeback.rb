require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [pytest.mark.tier(3), test_requirements.chargeback]
def _cleanup_report(report)
  begin
    logger.info("Cleaning up report %s", report.menu_name)
    report.delete()
  rescue Exception
    logger.warning("Failed to clean up report %s", report.menu_name)
  end
end
def test_charge_report_filter_owner(appliance, infra_provider, request)
  # Tests creation of chargeback report that is filtered by owner
  # 
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #   
  report = appliance.collections.reports.create(menu_name: fauxfactory.gen_alphanumeric(), title: fauxfactory.gen_alphanumeric(), base_report_on: "Chargeback for Vms", report_fields: ["Network I/O Used", "Network I/O Used Cost", "Storage Used", "Storage Used Cost", "Disk I/O Used", "Disk I/O Used Cost", "Owner", "Total Cost"], filter: {})
  cleanup_report = lambda do |report|
    return lambda{|| _cleanup_report(report)}
  end
  request.addfinalizer(cleanup_report.call(report))
  report.queue(wait_for_finish: true)
end
def test_charge_report_filter_tag(appliance, infra_provider, request)
  # Tests creation of chargeback report that is filtered by tag
  # 
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #   
  report = appliance.collections.reports.create(menu_name: fauxfactory.gen_alphanumeric(), title: fauxfactory.gen_alphanumeric(), base_report_on: "Chargeback for Vms", report_fields: ["CPU Used", "CPU Used Cost", "Memory Used", "Memory Used Cost", "Owner", "vCPUs Allocated Cost", "Total Cost"], filter: {})
  cleanup_report = lambda do |report|
    return lambda{|| _cleanup_report(report)}
  end
  request.addfinalizer(cleanup_report.call(report))
  report.queue(wait_for_finish: true)
end
