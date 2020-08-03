require_relative 'manageiq_client/api'
include Manageiq_client::Api
alias MiqApi ManageIQClient
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _automation_requests_data automation_requests_data
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _vm vm
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.rest, pytest.mark.provider(classes: [InfraProvider], selector: ONE), pytest.mark.usefixtures("setup_provider")]
def vm(request, provider, appliance)
  return _vm(request, provider, appliance)
end
def wait_for_requests(requests)
  _finished = lambda do
    for request in requests
      request.reload()
      if request.request_state != "finished"
        return false
      end
    end
    return true
  end
  wait_for(method(:_finished), num_sec: 600, delay: 5, message: "automation_requests finished")
end
def gen_pending_requests(collection, rest_api, vm, requests: false)
  requests_data = _automation_requests_data(vm, approve: false, requests_collection: requests)
  response = collection.action.create(*requests_data[0...2])
  assert_response(rest_api)
  raise unless response.size == 2
  for resource in response
    raise unless resource.request_state == "pending"
  end
  return response
end
def create_requests(collection, rest_api, automation_requests_data, multiple)
  if is_bool(multiple)
    requests = collection.action.create(*automation_requests_data)
  else
    requests = collection.action.create(automation_requests_data[0])
  end
  assert_response(rest_api)
  wait_for_requests(requests)
  for request in requests
    raise unless request.approval_state == "approved"
    resource = collection.get(id: request.id)
    raise unless resource.type == "AutomationRequest"
  end
end
def create_pending_requests(collection, rest_api, requests_pending)
  waiting_request = requests_pending[0]
  wait_for(lambda{|| waiting_request.approval_state != "pending_approval"}, fail_func: waiting_request.reload, num_sec: 30, delay: 10, silent_failure: true)
  for request in requests_pending
    request.reload()
    raise unless request.approval_state == "pending_approval"
    resource = collection.get(id: request.id)
    assert_response(rest_api)
    raise unless resource.type == "AutomationRequest"
  end
end
def approve_requests(collection, rest_api, requests_pending, from_detail)
  if is_bool(from_detail)
    for request in requests_pending
      request.action.approve(reason: "I said so")
    end
  else
    collection.action.approve(*requests_pending, reason: "I said so")
  end
  assert_response(rest_api)
  wait_for_requests(requests_pending)
  for request in requests_pending
    request.reload()
    raise unless request.approval_state == "approved"
  end
end
def deny_requests(collection, rest_api, requests_pending, from_detail)
  if is_bool(from_detail)
    for request in requests_pending
      request.action.deny(reason: "I said so")
    end
  else
    collection.action.deny(*requests_pending, reason: "I said so")
  end
  assert_response(rest_api)
  wait_for_requests(requests_pending)
  for request in requests_pending
    request.reload()
    raise unless request.approval_state == "denied"
  end
end
def edit_requests(collection, rest_api, requests_pending, from_detail)
  body = {"options" => {"arbitrary_key_allowed" => "test_rest"}}
  if is_bool(from_detail)
    for request in requests_pending
      request.action.edit(None: body)
      assert_response(rest_api)
    end
  else
    identifiers = []
    for (i, resource) in enumerate(requests_pending)
      loc = [{"id" => resource.id}, {"href" => }]
      identifiers.push(loc[i % 2])
    end
    collection.action.edit(*identifiers, None: body)
    assert_response(rest_api)
  end
  for request in requests_pending
    request.reload()
    raise unless request.options["arbitrary_key_allowed"] == "test_rest"
  end
end
class TestAutomationRequestsRESTAPI
  # Tests using /api/automation_requests.
  def collection(appliance)
    return appliance.rest_api.collections.automation_requests
  end
  def automation_requests_data(vm)
    return _automation_requests_data(vm)
  end
  def requests_pending(appliance, vm)
    return gen_pending_requests(appliance.rest_api.collections.automation_requests, appliance.rest_api, vm)
  end
  def test_query_request_attributes(requests_pending, soft_assert)
    # Tests access to attributes of automation request using /api/automation_requests.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(requests_pending[0], soft_assert: soft_assert)
  end
  def test_create_requests(collection, appliance, automation_requests_data, multiple)
    # Test adding the automation request using /api/automation_requests.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/5h
    #     
    create_requests(collection, appliance.rest_api, automation_requests_data, multiple)
  end
  def test_create_pending_requests(appliance, requests_pending, collection)
    # Tests creating pending requests using /api/automation_requests.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/5h
    #     
    create_pending_requests(collection, appliance.rest_api, requests_pending)
  end
  def test_approve_requests(collection, appliance, requests_pending, from_detail)
    # Tests approving automation requests using /api/automation_requests.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/5h
    #     
    approve_requests(collection, appliance.rest_api, requests_pending, from_detail)
  end
  def test_deny_requests(collection, appliance, requests_pending, from_detail)
    # Tests denying automation requests using /api/automation_requests.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/5h
    #     
    deny_requests(collection, appliance.rest_api, requests_pending, from_detail)
  end
  def test_edit_requests(collection, appliance, requests_pending, from_detail)
    # Tests editing requests using /api/automation_requests.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Bugzilla:
    #         1418338
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/6h
    #     
    edit_requests(collection, appliance.rest_api, requests_pending, from_detail)
  end
  def test_multiple_automation_requests(collection, appliance, vm)
    # 
    #     Bugzilla:
    #         1723830
    # 
    #     Polarion:
    #         assignee: ghubale
    #         initialEstimate: 1/30h
    #         casecomponent: Automate
    #     
    requests_data = _automation_requests_data(vm, approve: false, num: 100)
    response = collection.action.create(*requests_data)
    create_pending_requests(collection, appliance.rest_api, response)
    deny_requests(collection, appliance.rest_api, response, from_detail: false)
  end
end
class TestAutomationRequestsCommonRESTAPI
  # Tests using /api/requests (common collection for all requests types).
  def collection(appliance)
    return appliance.rest_api.collections.requests
  end
  def automation_requests_data(vm)
    return _automation_requests_data(vm, requests_collection: true)
  end
  def requests_pending(appliance, vm)
    return gen_pending_requests(appliance.rest_api.collections.requests, appliance.rest_api, vm, requests: true)
  end
  def test_query_request_attributes(requests_pending, soft_assert)
    # Tests access to attributes of automation request using /api/requests.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/6h
    #     
    query_resource_attributes(requests_pending[0], soft_assert: soft_assert)
  end
  def test_create_requests(collection, appliance, automation_requests_data, multiple)
    # Test adding the automation request using /api/requests.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/6h
    #     
    create_requests(collection, appliance.rest_api, automation_requests_data, multiple)
  end
  def test_create_pending_requests(collection, appliance, requests_pending)
    # Tests creating pending requests using /api/requests.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/6h
    #     
    create_pending_requests(collection, appliance.rest_api, requests_pending)
  end
  def test_approve_requests(collection, appliance, requests_pending, from_detail)
    # Tests approving automation requests using /api/requests.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/6h
    #     
    approve_requests(collection, appliance.rest_api, requests_pending, from_detail)
  end
  def test_deny_requests(collection, appliance, requests_pending, from_detail)
    # Tests denying automation requests using /api/requests.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/6h
    #     
    deny_requests(collection, appliance.rest_api, requests_pending, from_detail)
  end
  def test_edit_requests(collection, appliance, requests_pending, from_detail)
    # Tests editing requests using /api/requests.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/6h
    #     
    edit_requests(collection, appliance.rest_api, requests_pending, from_detail)
  end
  def test_create_requests_parallel(appliance)
    # Create automation requests in parallel.
    # 
    #     Metadata:
    #         test_flag: rest, requests
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Automate
    #         caseimportance: medium
    #         initialEstimate: 1/6h
    #     
    output = mp.Queue()
    entry_point = appliance.rest_api._entry_point
    auth = appliance.rest_api._auth
    _gen_automation_requests = lambda do |output|
      api = MiqApi(entry_point, auth, verify_ssl: false)
      requests_data = _automation_requests_data("nonexistent_vm", requests_collection: true, approve: false)
      api.collections.requests.action.create(*requests_data[0...2])
      result = [api.response.status_code, api.response.json()]
      output.put(result)
    end
    processes = 4.times.map{|_| mp.Process(target: _gen_automation_requests, args: [output])}
    for proc in processes
      proc.start()
    end
    for proc in processes
      .proc.join
    end
    for proc in processes
      status,response = output.get()
      raise unless status == 200
      for result in response["results"]
        raise unless result["request_type"] == "automation"
      end
    end
  end
end
def request_task(appliance, vm)
  requests = appliance.rest_api.collections.automation_requests.action.create(_automation_requests_data(vm)[0])
  assert_response(appliance.rest_api)
  wait_for_requests(requests)
  return requests[0].request_tasks.all[0]
end
def test_edit_automation_request_task(appliance, request_task)
  # 
  #   Polarion:
  #       assignee: pvala
  #       caseimportance: medium
  #       casecomponent: Rest
  #       initialEstimate: 1/4h
  #       setup:
  #           1. Create an automation request.
  #       testSteps:
  #           1. Edit the automation request task:
  #               POST /api/automation_requests/:id/request_tasks/:request_task_id
  #               {
  #               \"action\" : \"edit\",
  #               \"resource\" : {
  #                   \"options\" : {
  #                   \"request_param_a\" : \"value_a\",
  #                   \"request_param_b\" : \"value_b\"
  #                   }
  #               }
  #       expectedResults:
  #           1. Task must be edited successfully.
  # 
  #   
  request_task.action.edit(options: {"request_param_a" => "value_a", "request_param_b" => "value_b"})
  assert_response(appliance)
  request_task.reload()
  raise unless request_task.options["request_param_a"] == "value_a"
  raise unless request_task.options["request_param_b"] == "value_b"
end
