// This module contains control REST API specific tests.
require_relative("manageiq_client/api");
include(Manageiq_client.Api);
require_relative("cfme");
include(Cfme);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _conditions = conditions.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _policies = policies.bind(this);
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
let pytestmark = [test_requirements.rest];

class TestConditionsRESTAPI {
  conditions(request, appliance) {
    let num_conditions = 2;
    let response = _conditions(request, appliance, {num: num_conditions});
    assert_response(appliance);
    if (response.size != num_conditions) throw new ();
    return response
  };

  test_query_condition_attributes(conditions, soft_assert) {
    // Tests access to condition attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    query_resource_attributes(conditions[0], {soft_assert})
  };

  test_create_conditions(appliance, conditions) {
    // Tests create conditions.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    for (let condition in conditions) {
      let record = appliance.rest_api.collections.conditions.get({id: condition.id});
      if (record.description != condition.description) throw new ()
    }
  };

  test_delete_conditions_from_detail(conditions, method) {
    // Tests delete conditions from detail.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_detail(
      conditions,
      {method, num_sec: 100, delay: 5}
    )
  };

  test_delete_conditions_from_collection(conditions) {
    // Tests delete conditions from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_collection(
      conditions,
      {num_sec: 100, delay: 5}
    )
  };

  test_edit_conditions(conditions, appliance, from_detail) {
    let edited;

    // Tests edit conditions.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    let num_conditions = conditions.size;
    let uniq = num_conditions.times.map(_ => fauxfactory.gen_alphanumeric(5));
    let new = uniq.map(u => ({description: `Edited Test Condition ${u}`}));

    if (is_bool(from_detail)) {
      edited = [];

      for (let index in num_conditions.times) {
        edited.push(conditions[index].action.edit({None: new[index]}));
        assert_response(appliance)
      }
    } else {
      for (let index in num_conditions.times) {
        new[index].update(conditions[index]._ref_repr())
      };

      edited = appliance.rest_api.collections.conditions.action.edit(...new);
      assert_response(appliance)
    };

    if (edited.size != num_conditions) throw new ();

    for (let [index, condition] in enumerate(conditions)) {
      let [record, __] = wait_for(
        () => (
          appliance.rest_api.collections.conditions.find_by({description: new[index].description}) || false
        ),

        {num_sec: 100, delay: 5, message: "Find a test condition"}
      );

      condition.reload();

      if (!(condition.description == edited[index].description) || !(edited[index].description == record[0].description)) {
        throw new ()
      }
    }
  }
};

class TestPoliciesRESTAPI {
  policies(request, appliance) {
    let num_policies = 2;
    let response = _policies(request, appliance, {num: num_policies});
    assert_response(appliance);
    if (response.size != num_policies) throw new ();
    return response
  };

  test_query_policy_attributes(policies, soft_assert) {
    // Tests access to policy attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    query_resource_attributes(policies[0], {soft_assert})
  };

  test_create_policies(appliance, policies) {
    // Tests create policies.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    for (let policy in policies) {
      let record = appliance.rest_api.collections.policies.get({id: policy.id});
      if (record.description != policy.description) throw new ()
    }
  };

  test_delete_policies_from_detail_post(policies) {
    // Tests delete policies from detail using POST method.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_detail(
      policies,
      {method: "POST", num_sec: 100, delay: 5}
    )
  };

  test_delete_policies_from_detail_delete(policies) {
    // Tests delete policies from detail using DELETE method.
    // 
    //     Bugzilla:
    //         1435773
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_detail(
      policies,
      {method: "DELETE", num_sec: 100, delay: 5}
    )
  };

  test_delete_policies_from_collection(policies) {
    // Tests delete policies from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_collection(policies, {num_sec: 100, delay: 5})
  };

  test_edit_policies(policies, appliance, from_detail) {
    let edited;

    // Tests edit policies.
    // 
    //     Testing BZ 1435777
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    let num_policies = policies.size;
    let uniq = num_policies.times.map(_ => fauxfactory.gen_alphanumeric(5));
    let new = uniq.map(u => ({description: `Edited Test Policy ${u}`}));

    if (is_bool(from_detail)) {
      edited = [];

      for (let index in num_policies.times) {
        edited.push(policies[index].action.edit({None: new[index]}));
        assert_response(appliance)
      }
    } else {
      for (let index in num_policies.times) {
        new[index].update(policies[index]._ref_repr())
      };

      edited = appliance.rest_api.collections.policies.action.edit(...new);
      assert_response(appliance)
    };

    if (edited.size != num_policies) throw new ();

    for (let [index, policy] in enumerate(policies)) {
      let [record, __] = wait_for(
        () => (
          appliance.rest_api.collections.policies.find_by({description: new[index].description}) || false
        ),

        {num_sec: 100, delay: 5, message: "Find a policy"}
      );

      policy.reload();

      if (!(policy.description == edited[index].description) || !(edited[index].description == record[0].description)) {
        throw new ()
      }
    }
  };

  test_create_invalid_policies(appliance) {
    // 
    //     This test case checks policy creation with invalid data.
    // 
    //     Bugzilla:
    //         1435780
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Control
    //         caseimportance: high
    //         initialEstimate: 1/30h
    //     
    let policy_name = fauxfactory.gen_alphanumeric(5);

    let data = {
      name: `test_policy_${policy_name}`,
      description: `Test Policy ${policy_name}`,
      mode: "bar",
      towhat: "baz",
      conditions_ids: [2000, 3000],

      policy_contents: [{
        event_id: 2,
        actions: [{action_id: 1, opts: {qualifier: "failure"}}]
      }]
    };

    pytest.raises(
      APIException,
      {match: "Api::BadRequestError"},
      () => appliance.rest_api.collections.policies.action.create(data)
    )
  }
}
