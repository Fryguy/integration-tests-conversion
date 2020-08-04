// Test retirement of vm
// 
//   Prerequisities:
// 
//       * An appliance with ``/api`` available.
//       * VM
// 
//   Steps:
// 
//       * POST /api/vms/<id> (method ``retire``)
//       OR
//       * POST /api/vms (method ``retire``) with ``href`` of the vm or vms
// 
//   Metadata:
//       test_flag: rest
// 
//   Bugzilla:
//       1805119
// 
//   Polarion:
//       assignee: pvala
//       casecomponent: Infra
//       caseimportance: high
//       initialEstimate: 1/3h
//   
// pass
// Test retirement of vm
// 
//   Prerequisities:
// 
//       * An appliance with ``/api`` available.
//       * VM
// 
//   Steps:
// 
//       * POST /api/vms/<id> (method ``retire``) with the ``retire_date``
//       OR
//       * POST /api/vms (method ``retire``) with the ``retire_date`` and ``href`` of the vm or vms
// 
//   Metadata:
//       test_flag: rest
// 
//   Bugzilla:
//       1805119
//       1827787
// 
//   Polarion:
//       assignee: pvala
//       casecomponent: Infra
//       caseimportance: high
//       initialEstimate: 1/3h
//   
function test_check_vm_retirement_requester(appliance, request, provider, vm_retirement_report) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/2h
  //       tags: retirement
  //       setup:
  //           1. Add a provider.
  //           2. Provision a VM.
  //           3. Once the VM has been provisioned, retire the VM.
  //           4. Create a report(See attachment in BZ).
  //       testSteps:
  //           1. Queue the report once the VM has retired
  //               and check the retirement_requester column for the VM.
  //       expectedResults:
  //           1. Requester name must be visible.
  // 
  //   Bugzilla:
  //       1638502
  //       1805119
  //   
  let [vm_name, report] = vm_retirement_report;
  let saved_report = report.queue({wait_for_finish: true});

  let requester_id = ((appliance.rest_api.collections.requests.filter(Q(
    "description",
    "=",
    `VM Retire for: ${vm_name}*`
  ))).resources[0]).requester_id;

  let requester_userid = appliance.rest_api.collections.users.get({id: requester_id}).userid;
  let row_data = saved_report.data.find_row("Name", vm_name);

  if ([
    row_data.Name,
    row_data["Retirement Requester"],
    row_data["Retirement State"]
  ] != [vm_name, requester_userid, "retired"]) throw new ()
}
