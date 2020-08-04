require("None");
require_relative("manageiq_client/filters");
include(Manageiq_client.Filters);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _vm = vm.bind(this);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.rest,
  pytest.mark.provider({classes: [InfraProvider], selector: ONE}),
  pytest.mark.usefixtures("setup_provider")
];

function vm(request, provider, appliance) {
  let vm_name = _vm(request, provider, appliance);
  return appliance.rest_api.collections.vms.get({name: vm_name})
};

function test_query_vm_attributes(vm, soft_assert) {
  // Tests access to VM attributes using /api/vms.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  let outcome = query_resource_attributes(vm);

  for (let failure in outcome.failed) {
    soft_assert.call(false, "{} \"{}\": status: {}, error: `{}`".format(
      failure.type,
      failure.name,
      failure.response.status_code,
      failure.error
    ))
  }
};

function test_vm_scan(appliance, vm, from_detail) {
  let response;

  // Tests running VM scan using REST API.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: high
  //       initialEstimate: 1/3h
  //   
  if (is_bool(from_detail)) {
    response = vm.action.scan()
  } else {
    [response] = appliance.rest_api.collections.vms.action.scan(vm)
  };

  assert_response(appliance);

  let _finished = () => {
    response.task.reload();

    if (response.task.status.downcase().include("error")) {
      pytest.fail(`Error when running scan vm method: `${response.task.message}``)
    };

    return response.task.state.downcase() == "finished"
  }
};

function test_edit_vm(request, vm, appliance, from_detail) {
  let edited;

  // Tests edit VMs using REST API.
  // 
  //   Testing BZ 1428250.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  request.addfinalizer(vm.action.delete);

  let new_description = fauxfactory.gen_alphanumeric(
    18,
    {start: "Test REST VM "}
  );

  let payload = {description: new_description};

  if (is_bool(from_detail)) {
    edited = vm.action.edit({None: payload});
    assert_response(appliance)
  } else {
    payload.update(vm._ref_repr());
    edited = appliance.rest_api.collections.vms.action.edit(payload);
    assert_response(appliance);
    edited = edited[0]
  };

  let [record, __] = wait_for(
    () => (
      appliance.rest_api.collections.vms.find_by({description: new_description}) || false
    ),

    {num_sec: 100, delay: 5}
  );

  vm.reload();

  if (!(vm.description == edited.description) || !(edited.description == record[0].description)) {
    throw new ()
  }
};

function test_delete_vm_from_detail(vm, method) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       initialEstimate: 1/4h
  //       casecomponent: Infra
  //   
  delete_resources_from_detail([vm], {method, num_sec: 300, delay: 10})
};

function test_delete_vm_from_collection(vm) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       initialEstimate: 1/4h
  //       casecomponent: Infra
  //   
  delete_resources_from_collection(
    [vm],
    {not_found: true, num_sec: 300, delay: 10}
  )
};

function test_filtering_vm_with_multiple_ips(appliance, provider) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       caseimportance: high
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //       setup:
  //           1. Add a provider.
  //       testSteps:
  //           1. Select a VM with multiple IP addresses and note one ipaddress.
  //           2. Send a GET request with the noted ipaddress.
  //               GET /api/vms?expand=resources&attributes=ipaddresses&filter[]=ipaddresses=':ipaddr'
  //       expectedResults:
  //           1.
  //           2. Selected VM must be present in the resources sent by response.
  // 
  //   Bugzilla:
  //       1684681
  //   
  let vm = appliance.collections.infra_vms.instantiate(
    provider.data.cap_and_util.capandu_vm,
    provider
  );

  let result = appliance.rest_api.collections.vms.filter(Q(
    "ipaddresses",
    "=",
    choice(vm.all_ip_addresses)
  ));

  assert_response(appliance);

  if (!result.resources.map(resource => resource.name).include(vm.name)) {
    throw new ()
  }
};

function test_database_wildcard_should_work_and_be_included_in_the_query(appliance, request, provider) {
  //  Database wildcard should work and be included in the query
  //   Bugzilla:
  //       1581853
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       testtype: functional
  //       initialEstimate: 1/4h
  //       startsin: 5.10
  //       testSteps:
  //           1. Create a VM with some name, for e.g test-25-xyz.
  //           2. Filter VM with wild character and substring of the name, for e.g. \"%25%\"
  //       expectedResults:
  //           1. VM is created successfully.
  //           2. VM is obtained without any error.
  //   
  let vm_name = _vm(
    request,
    provider,
    appliance,
    {name: fauxfactory.gen_alpha({start: "test-25-", length: 12})}
  );

  (LogValidator(
    "/var/www/miq/vmdb/log/production.log",
    {failure_patterns: [".*FATAL.*"]}
  )).waiting({timeout: 20}, () => {
    let result = appliance.rest_api.collections.vms.filter(Q(
      "name",
      "=",
      "%25%"
    ))
  });

  if (!result.subcount) throw new ();
  if (!result.resources.map(vm => vm.name).include(vm_name)) throw new ()
}
