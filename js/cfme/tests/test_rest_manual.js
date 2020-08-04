// Manual tests
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/rest");
include(Cfme.Utils.Appliance.Implementations.Rest);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [pytest.mark.manual];

// 
//   Bugzilla:
//       1700378
//       1714615
// 
//   Polarion:
//       assignee: pvala
//       caseimportance: medium
//       casecomponent: Rest
//       initialEstimate: 1/4h
//       testSteps:
//           1. Stop evmserverd.
//           2. Run `bin rails/server`
//           3. Monitor production.log
//           4. Run ruby script which will execute multiple api requests parallely.
//               ```
//               2.times do
//                   Thread.new do
//                       `curl -L https://admin:smartvm@localhost/api/vms`
//                   end
//                   Thread.new do
//                       `curl -L https://admin:smartvm@localhost/api/notifications?
//                       expand=resources&attributes=details&sort_by=id&sort_order=desc&limit=100`
//                   end
//               end
//               ```
//           5. Validate logs.
//       expectedResults:
//           1.
//           2.
//           3.
//           4.
//           5. Check if all the requests were processed and completed
//   
// pass
function test_notification_url_parallel_requests() {};

// 
//   Bugzilla:
//      1761836
//      1623607
//      1753682
// 
//   Polarion:
//       assignee: pvala
//       caseimportance: medium
//       casecomponent: Rest
//       initialEstimate: 1/4h
//       testSteps:
//           1. Depending on the implementation -
//               i. GET /api/widgtes/:id and note the `last_generated_content_on`.
//               ii. Navigate to Dashboard and note the `last_generated_content_on` for the widget.
//           2. POST /api/widgets/:id
//               {
  //                   \"action\": \"generate_content\"
  //               }
  //           3. Wait until the task completes.
  //           4. Depending on the implementation
  //               i. GET /api/widgets/:id and compare the value of `last_generated_content_on`
  //                   with the value noted in step 1.
  //               ii.  Navigate to the dashboard and check if the value was updated for the widget.
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4. Both values must be different, value must be updated.
  //   
  // pass
  function test_widget_generate_content_via_rest(context) {}
