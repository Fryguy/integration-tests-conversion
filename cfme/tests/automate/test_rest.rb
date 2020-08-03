# REST API specific automate tests.
require_relative 'datetime'
include Datetime
require_relative 'dateparser'
include Dateparser
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
pytestmark = [test_requirements.rest, pytest.mark.tier(3)]
def domain_rest(appliance, domain)
  domain = appliance.collections.domains.create(name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha(), enabled: true)
  yield(appliance.rest_api.collections.automate_domains.get(name: domain.name))
  domain.delete_if_exists()
end
def test_rest_search_automate(appliance)
  # 
  #   Polarion:
  #       assignee: pvala
  #       caseimportance: low
  #       casecomponent: Automate
  #       initialEstimate: 1/3h
  #   
  rest_api = appliance.rest_api
  _do_query = lambda do |**kwargs|
    response = rest_api.collections.automate.query_string(None: kwargs)
    raise unless rest_api.response.status_code == 200
    return response
  end
  more_depth = _do_query.call(depth: "2")
  full_depth = _do_query.call(depth: "-1")
  filtered_depth = _do_query.call(depth: "-1", search_options: "state_machines")
  raise unless (full_depth.size > more_depth.size) and (more_depth.size > rest_api.collections.automate.size)
  raise unless (full_depth.size > filtered_depth.size) and (filtered_depth.size > 0)
end
def test_delete_automate_domain_from_detail(domain_rest, method)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Automate
  #       initialEstimate: 1/10h
  #   
  delete_resources_from_detail([domain_rest], method: method, num_sec: 50)
end
def test_delete_automate_domain_from_collection(domain_rest)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Automate
  #       initialEstimate: 1/10h
  #   
  delete_resources_from_collection([domain_rest], not_found: true, num_sec: 50)
end
def test_schedule_automation_request(appliance, scheduler)
  # 
  #   Bugzilla:
  #       1740340
  #       1486765
  # 
  #   Polarion:
  #       assignee: pvala
  #       caseimportance: high
  #       casecomponent: Rest
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Send a request POST /api/automation_requests
  #               {
  #                   \"uri_parts\" : {
  #                       \"namespace\" : \"System\",
  #                       \"class\"     : \"Request\",
  #                       \"instance\"  : \"InspectME\",
  #                       \"message\"   : \"create\"
  #                   },
  #                   \"parameters\" : {
  #                       \"var1\" : \"value 1\",
  #                       \"var2\" : \"value 2\",
  #                       \"minimum_memory\" : 2048,
  #                       \"schedule_time\": scheduler
  #                   },
  #                   \"requester\" : {
  #                       \"auto_approve\" : true
  #                   }
  #               }
  #           2. Compare the `created_on` and `options::schedule_time` from the response.
  #       expectedResults:
  #           1. Request must be successful.
  #           2.Difference between the two dates must be equal to scheduler
  #   
  schedule_time = (scheduler == "number_of_days") ? "2" : "2019-08-14 17:41:06 UTC"
  automate_request_rest = appliance.rest_api.collections.automation_requests.action.create({"uri_parts" => {"namespace" => "System", "class" => "Request", "instance" => "InspectME", "message" => "create"}, "parameters" => {"var1" => "value 1", "var2" => "value 2", "minimum_memory" => 2048, "schedule_time" => schedule_time}, "requester" => {"auto_approve" => true}})[0]
  assert_response(appliance)
  automate_request = appliance.collections.automation_requests.instantiate(description: automate_request_rest.description)
  view = navigate_to(automate_request, "Details")
  raise unless view.is_displayed
  _convert = lambda do |date|
    date_format = "%m/%d/%y %H:%M"
    return Datetime::strptime(Datetime::strftime(date, date_format), date_format)
  end
  scheduled = _convert.call(parse(automate_request_rest.options["schedule_time"]))
  if scheduler == "number_of_days"
    created_on = _convert.call(automate_request_rest.created_on)
    difference = scheduled - created_on
    raise unless difference.days.to_s == schedule_time
  else
    raise unless _convert.call(parse(schedule_time)) == scheduled
  end
end
