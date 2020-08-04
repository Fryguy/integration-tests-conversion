//  This test generate one default report for each category under reports accordion
// 
// 
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.report,
  pytest.mark.usefixtures("setup_provider_modscope"),

  pytest.mark.provider(
    [InfraProvider],
    {scope: "module", selector: ONE}
  )
];

let report_path = [
  [
    "Configuration Management",
    "Virtual Machines",
    "Guest OS Information - any OS"
  ],

  [
    "Migration Readiness",
    "Virtual Machines",
    "Summary - VMs migration ready"
  ],

  ["Operations", "Virtual Machines", "VMs not Powered On"],
  ["VM Sprawl", "Candidates", "Summary of VM Create and Deletes"],

  [
    "Relationships",
    "Virtual Machines, Folders, Clusters",
    "VM Relationships"
  ],

  ["Events", "Operations", "Events for VM prod_webserver"],

  [
    "Performance by Asset Type",
    "Virtual Machines",
    "Top CPU Consumers (weekly)"
  ],

  [
    "Running Processes",
    "Virtual Machines",
    "Processes for prod VMs sort by CPU Time"
  ],

  ["Trending", "Clusters", "Cluster CPU Trends (last week)"],
  ["Tenants", "Tenant Quotas", "Tenant Quotas"],
  ["Provisioning", "Activity Reports", "Provisioning Activity - by VM"]
];

function test_reports_generate_report(request, path, appliance) {
  //  This Tests run one default report for each category
  // 
  //   Steps:
  //       *Run one default report
  //       *Delete this Saved Report from the Database
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: high
  //       initialEstimate: 1/16h
  //   
  let report = appliance.collections.reports.instantiate({
    type: path[0],
    subtype: path[1],
    menu_name: path[2]
  }).queue({wait_for_finish: true});

  request.addfinalizer(report.delete_if_exists);
  if (!report.exists) throw new ()
}
