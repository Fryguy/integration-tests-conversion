require_relative("manageiq_client/api");
include(Manageiq_client.Api);
var MiqApi = ManageIQClient.bind(this);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _automation_requests_data = automation_requests_data.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _vm = vm.bind(this);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.rest,
  pytest.mark.provider({classes: [InfraProvider], selector: ONE}),
  pytest.mark.usefixtures("setup_provider")
];

function vm(request, provider, appliance) {
  return _vm(request, provider, appliance)
};

function wait_for_requests(requests) {
  let _finished = () => {
    for (let request in requests) {
      request.reload();
      if (request.request_state != "finished") return false
    };

    return true
  };

  wait_for(
    method("_finished"),
    {num_sec: 600, delay: 5, message: "automation_requests finished"}
  )
};

function gen_pending_requests(collection, rest_api, vm, { requests = false }) {
  let requests_data = _automation_requests_data(
    vm,
    {approve: false, requests_collection: requests}
  );

  let response = collection.action.create(...requests_data[_.range(
    0,
    2
  )]);

  assert_response(rest_api);
  if (response.size != 2) throw new ();

  for (let resource in response) {
    if (resource.request_state != "pending") throw new ()
  };

  return response
};

function create_requests(collection, rest_api, automation_requests_data, multiple) {
  let requests;

  if (is_bool(multiple)) {
    requests = collection.action.create(...automation_requests_data)
  } else {
    requests = collection.action.create(automation_requests_data[0])
  };

  assert_response(rest_api);
  wait_for_requests(requests);

  for (let request in requests) {
    if (request.approval_state != "approved") throw new ();
    let resource = collection.get({id: request.id});
    if (resource.type != "AutomationRequest") throw new ()
  }
};

function create_pending_requests(collection, rest_api, requests_pending) {
  let waiting_request = requests_pending[0];

  wait_for(
    () => waiting_request.approval_state != "pending_approval",

    {
      fail_func: waiting_request.reload,
      num_sec: 30,
      delay: 10,
      silent_failure: true
    }
  );

  for (let request in requests_pending) {
    request.reload();
    if (request.approval_state != "pending_approval") throw new ();
    let resource = collection.get({id: request.id});
    assert_response(rest_api);
    if (resource.type != "AutomationRequest") throw new ()
  }
};

function approve_requests(collection, rest_api, requests_pending, from_detail) {
  if (is_bool(from_detail)) {
    for (let request in requests_pending) {
      request.action.approve({reason: "I said so"})
    }
  } else {
    collection.action.approve(...requests_pending, {reason: "I said so"})
  };

  assert_response(rest_api);
  wait_for_requests(requests_pending);

  for (let request in requests_pending) {
    request.reload();
    if (request.approval_state != "approved") throw new ()
  }
};

function deny_requests(collection, rest_api, requests_pending, from_detail) {
  if (is_bool(from_detail)) {
    for (let request in requests_pending) {
      request.action.deny({reason: "I said so"})
    }
  } else {
    collection.action.deny(...requests_pending, {reason: "I said so"})
  };

  assert_response(rest_api);
  wait_for_requests(requests_pending);

  for (let request in requests_pending) {
    request.reload();
    if (request.approval_state != "denied") throw new ()
  }
};

function edit_requests(collection, rest_api, requests_pending, from_detail) {
  let body = {options: {arbitrary_key_allowed: "test_rest"}};

  if (is_bool(from_detail)) {
    for (let request in requests_pending) {
      request.action.edit({None: body});
      assert_response(rest_api)
    }
  } else {
    let identifiers = [];

    for (let [i, resource] in enumerate(requests_pending)) {
      let loc = [
        {id: resource.id},
        {href: `${collection._href}/${resource.id}`}
      ];

      identifiers.push(loc[i % 2])
    };

    collection.action.edit(...identifiers, {None: body});
    assert_response(rest_api)
  };

  for (let request in requests_pending) {
    request.reload();
    if (request.options.arbitrary_key_allowed != "test_rest") throw new ()
  }
};

class TestAutomationRequestsRESTAPI {
  // Tests using /api/automation_requests.
  collection(appliance) {
    return appliance.rest_api.collections.automation_requests
  };

  automation_requests_data(vm) {
    return _automation_requests_data(vm)
  };

  requests_pending(appliance, vm) {
    return gen_pending_requests(
      appliance.rest_api.collections.automation_requests,
      appliance.rest_api,
      vm
    )
  };

  test_query_request_attributes(requests_pending, soft_assert) {
    // Tests access to attributes of automation request using /api/automation_requests.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         initialEstimate: 1/4h
    //     
    query_resource_attributes(requests_pending[0], {soft_assert})
  };

  test_create_requests(collection, appliance, automation_requests_data, multiple) {
    // Test adding the automation request using /api/automation_requests.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/5h
    //     
    create_requests(
      collection,
      appliance.rest_api,
      automation_requests_data,
      multiple
    )
  };

  test_create_pending_requests(appliance, requests_pending, collection) {
    // Tests creating pending requests using /api/automation_requests.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/5h
    //     
    create_pending_requests(
      collection,
      appliance.rest_api,
      requests_pending
    )
  };

  test_approve_requests(collection, appliance, requests_pending, from_detail) {
    // Tests approving automation requests using /api/automation_requests.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/5h
    //     
    approve_requests(
      collection,
      appliance.rest_api,
      requests_pending,
      from_detail
    )
  };

  test_deny_requests(collection, appliance, requests_pending, from_detail) {
    // Tests denying automation requests using /api/automation_requests.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/5h
    //     
    deny_requests(
      collection,
      appliance.rest_api,
      requests_pending,
      from_detail
    )
  };

  test_edit_requests(collection, appliance, requests_pending, from_detail) {
    // Tests editing requests using /api/automation_requests.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Bugzilla:
    //         1418338
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/6h
    //     
    edit_requests(
      collection,
      appliance.rest_api,
      requests_pending,
      from_detail
    )
  };

  test_multiple_automation_requests(collection, appliance, vm) {
    // 
    //     Bugzilla:
    //         1723830
    // 
    //     Polarion:
    //         assignee: ghubale
    //         initialEstimate: 1/30h
    //         casecomponent: Automate
    //     
    let requests_data = _automation_requests_data(
      vm,
      {approve: false, num: 100}
    );

    let response = collection.action.create(...requests_data);
    create_pending_requests(collection, appliance.rest_api, response);

    deny_requests(
      collection,
      appliance.rest_api,
      response,
      {from_detail: false}
    )
  }
};

class TestAutomationRequestsCommonRESTAPI {
  // Tests using /api/requests (common collection for all requests types).
  collection(appliance) {
    return appliance.rest_api.collections.requests
  };

  automation_requests_data(vm) {
    return _automation_requests_data(vm, {requests_collection: true})
  };

  requests_pending(appliance, vm) {
    return gen_pending_requests(
      appliance.rest_api.collections.requests,
      appliance.rest_api,
      vm,
      {requests: true}
    )
  };

  test_query_request_attributes(requests_pending, soft_assert) {
    // Tests access to attributes of automation request using /api/requests.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/6h
    //     
    query_resource_attributes(requests_pending[0], {soft_assert})
  };

  test_create_requests(collection, appliance, automation_requests_data, multiple) {
    // Test adding the automation request using /api/requests.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/6h
    //     
    create_requests(
      collection,
      appliance.rest_api,
      automation_requests_data,
      multiple
    )
  };

  test_create_pending_requests(collection, appliance, requests_pending) {
    // Tests creating pending requests using /api/requests.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/6h
    //     
    create_pending_requests(
      collection,
      appliance.rest_api,
      requests_pending
    )
  };

  test_approve_requests(collection, appliance, requests_pending, from_detail) {
    // Tests approving automation requests using /api/requests.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/6h
    //     
    approve_requests(
      collection,
      appliance.rest_api,
      requests_pending,
      from_detail
    )
  };

  test_deny_requests(collection, appliance, requests_pending, from_detail) {
    // Tests denying automation requests using /api/requests.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/6h
    //     
    deny_requests(
      collection,
      appliance.rest_api,
      requests_pending,
      from_detail
    )
  };

  test_edit_requests(collection, appliance, requests_pending, from_detail) {
    // Tests editing requests using /api/requests.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/6h
    //     
    edit_requests(
      collection,
      appliance.rest_api,
      requests_pending,
      from_detail
    )
  };

  test_create_requests_parallel(appliance) {
    // Create automation requests in parallel.
    // 
    //     Metadata:
    //         test_flag: rest, requests
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Automate
    //         caseimportance: medium
    //         initialEstimate: 1/6h
    //     
    let output = mp.Queue();
    let entry_point = appliance.rest_api._entry_point;
    let auth = appliance.rest_api._auth;

    let _gen_automation_requests = (output) => {
      let api = MiqApi(entry_point, auth, {verify_ssl: false});

      let requests_data = _automation_requests_data(
        "nonexistent_vm",
        {requests_collection: true, approve: false}
      );

      api.collections.requests.action.create(...requests_data[_.range(0, 2)]);
      let result = [api.response.status_code, api.response.json()];
      return output.put(result)
    };

    let processes = (4).times.map(_ => (
      mp.Process({target: _gen_automation_requests, args: [output]})
    ));

    for (let proc in processes) {
      proc.start()
    };

    for (let proc in processes.proc.join) {

    };

    for (let proc in processes) {
      let [status, response] = output.get();
      if (status != 200) throw new ();

      for (let result in response.results) {
        if (result.request_type != "automation") throw new ()
      }
    }
  }
};

function request_task(appliance, vm) {
  let requests = appliance.rest_api.collections.automation_requests.action.create(_automation_requests_data(vm)[0]);
  assert_response(appliance.rest_api);
  wait_for_requests(requests);
  return requests[0].request_tasks.all[0]
};

function test_edit_automation_request_task(appliance, request_task) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       caseimportance: medium
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //       setup:
  //           1. Create an automation request.
  //       testSteps:
  //           1. Edit the automation request task:
  //               POST /api/automation_requests/:id/request_tasks/:request_task_id
  //               {
    //               \"action\" : \"edit\",
    //               \"resource\" : {
      //                   \"options\" : {
        //                   \"request_param_a\" : \"value_a\",
        //                   \"request_param_b\" : \"value_b\"
        //                   }
        //               }
        //       expectedResults:
        //           1. Task must be edited successfully.
        // 
        //   
        request_task.action.edit({options: {
          request_param_a: "value_a",
          request_param_b: "value_b"
        }});

        assert_response(appliance);
        request_task.reload();
        if (request_task.options.request_param_a != "value_a") throw new ();
        if (request_task.options.request_param_b != "value_b") throw new ()
      }
