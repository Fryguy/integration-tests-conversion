// REST API specific automate tests.
require_relative("datetime");
include(Datetime);
require_relative("dateparser");
include(Dateparser);
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
let pytestmark = [test_requirements.rest, pytest.mark.tier(3)];

function domain_rest(appliance, domain) {
  domain = appliance.collections.domains.create({
    name: fauxfactory.gen_alpha(),
    description: fauxfactory.gen_alpha(),
    enabled: true
  });

  yield(appliance.rest_api.collections.automate_domains.get({name: domain.name}));
  domain.delete_if_exists()
};

function test_rest_search_automate(appliance) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       caseimportance: low
  //       casecomponent: Automate
  //       initialEstimate: 1/3h
  //   
  let rest_api = appliance.rest_api;

  let _do_query = (kwargs, { ...kwargs }) => {
    let response = rest_api.collections.automate.query_string({None: kwargs});
    if (rest_api.response.status_code != 200) throw new ();
    return response
  };

  let more_depth = _do_query.call({depth: "2"});
  let full_depth = _do_query.call({depth: "-1"});

  let filtered_depth = _do_query.call({
    depth: "-1",
    search_options: "state_machines"
  });

  if (!(full_depth.size > more_depth.size) || !(more_depth.size > rest_api.collections.automate.size)) {
    throw new ()
  };

  if (!(full_depth.size > filtered_depth.size) || !(filtered_depth.size > 0)) {
    throw new ()
  }
};

function test_delete_automate_domain_from_detail(domain_rest, method) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Automate
  //       initialEstimate: 1/10h
  //   
  delete_resources_from_detail([domain_rest], {method, num_sec: 50})
};

function test_delete_automate_domain_from_collection(domain_rest) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Automate
  //       initialEstimate: 1/10h
  //   
  delete_resources_from_collection(
    [domain_rest],
    {not_found: true, num_sec: 50}
  )
};

function test_schedule_automation_request(appliance, scheduler) {
  // 
  //   Bugzilla:
  //       1740340
  //       1486765
  // 
  //   Polarion:
  //       assignee: pvala
  //       caseimportance: high
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //       testSteps:
  //           1. Send a request POST /api/automation_requests
  //               {
    //                   \"uri_parts\" : {
      //                       \"namespace\" : \"System\",
      //                       \"class\"     : \"Request\",
      //                       \"instance\"  : \"InspectME\",
      //                       \"message\"   : \"create\"
      //                   },
      //                   \"parameters\" : {
        //                       \"var1\" : \"value 1\",
        //                       \"var2\" : \"value 2\",
        //                       \"minimum_memory\" : 2048,
        //                       \"schedule_time\": scheduler
        //                   },
        //                   \"requester\" : {
          //                       \"auto_approve\" : true
          //                   }
          //               }
          //           2. Compare the `created_on` and `options::schedule_time` from the response.
          //       expectedResults:
          //           1. Request must be successful.
          //           2.Difference between the two dates must be equal to scheduler
          //   
          let schedule_time = (scheduler == "number_of_days" ? "2" : "2019-08-14 17:41:06 UTC");

          let automate_request_rest = appliance.rest_api.collections.automation_requests.action.create({
            uri_parts: {
              namespace: "System",
              class: "Request",
              instance: "InspectME",
              message: "create"
            },

            parameters: {
              var1: "value 1",
              var2: "value 2",
              minimum_memory: 2048,
              schedule_time: schedule_time
            },

            requester: {auto_approve: true}
          })[0];

          assert_response(appliance);
          let automate_request = appliance.collections.automation_requests.instantiate({description: automate_request_rest.description});
          let view = navigate_to(automate_request, "Details");
          if (!view.is_displayed) throw new ();

          let _convert = (date) => {
            let date_format = "%m/%d/%y %H:%M";

            return Datetime.strptime(
              Datetime.strftime(date, date_format),
              date_format
            )
          };

          let scheduled = _convert.call(parse(automate_request_rest.options.schedule_time));

          if (scheduler == "number_of_days") {
            let created_on = _convert.call(automate_request_rest.created_on);
            let difference = scheduled - created_on;
            if (difference.days.to_s != schedule_time) throw new ()
          } else if (_convert.call(parse(schedule_time)) != scheduled) {
            throw new ()
          }
        }
