// Manual chargeback tests
require_relative("cfme");
include(Cfme);

let pytestmark = [
  pytest.mark.ignore_stream("upstream"),
  pytest.mark.manual,
  test_requirements.chargeback
];

// 
//   Validate resource usage cost.
// 
//   Polarion:
//       assignee: tpapaioa
//       casecomponent: CandU
//       caseimportance: medium
//       initialEstimate: 1/10h
//   
// pass
function test_validate_chargeback_cost(report_period, rate_period, resource) {};

// 
//   Verify resource allocation in a chargeback report.
// 
//   Polarion:
//       assignee: tpapaioa
//       casecomponent: CandU
//       caseimportance: medium
//       initialEstimate: 1/10h
//   
// pass
function test_chargeback_resource_allocation(resource) {};

// 
//   Verify that saved chargeback reports can be viewed
// 
//   Polarion:
//       assignee: tpapaioa
//       casecomponent: CandU
//       caseimportance: low
//       initialEstimate: 1/12h
//   
// pass
function test_saved_chargeback_report_show_full_screen() {}
