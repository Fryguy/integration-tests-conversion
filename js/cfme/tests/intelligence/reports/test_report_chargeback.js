require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
let pytestmark = [pytest.mark.tier(3), test_requirements.chargeback];

function _cleanup_report(report) {
  try {
    logger.info("Cleaning up report %s", report.menu_name);
    report.delete()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      logger.warning("Failed to clean up report %s", report.menu_name)
    } else {
      throw $EXCEPTION
    }
  }
};

function test_charge_report_filter_owner(appliance, infra_provider, request) {
  // Tests creation of chargeback report that is filtered by owner
  // 
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: CandU
  //       caseimportance: low
  //       initialEstimate: 1/12h
  //   
  let report = appliance.collections.reports.create({
    menu_name: fauxfactory.gen_alphanumeric(),
    title: fauxfactory.gen_alphanumeric(),
    base_report_on: "Chargeback for Vms",

    report_fields: [
      "Network I/O Used",
      "Network I/O Used Cost",
      "Storage Used",
      "Storage Used Cost",
      "Disk I/O Used",
      "Disk I/O Used Cost",
      "Owner",
      "Total Cost"
    ],

    filter: {}
  });

  let cleanup_report = report => () => _cleanup_report(report);
  request.addfinalizer(cleanup_report.call(report));
  report.queue({wait_for_finish: true})
};

function test_charge_report_filter_tag(appliance, infra_provider, request) {
  // Tests creation of chargeback report that is filtered by tag
  // 
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: CandU
  //       caseimportance: low
  //       initialEstimate: 1/12h
  //   
  let report = appliance.collections.reports.create({
    menu_name: fauxfactory.gen_alphanumeric(),
    title: fauxfactory.gen_alphanumeric(),
    base_report_on: "Chargeback for Vms",

    report_fields: [
      "CPU Used",
      "CPU Used Cost",
      "Memory Used",
      "Memory Used Cost",
      "Owner",
      "vCPUs Allocated Cost",
      "Total Cost"
    ],

    filter: {}
  });

  let cleanup_report = report => () => _cleanup_report(report);
  request.addfinalizer(cleanup_report.call(report));
  report.queue({wait_for_finish: true})
}
