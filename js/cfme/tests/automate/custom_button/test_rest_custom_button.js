require_relative("cfme");
include(Cfme);
require_relative("cfme/rest");
include(Cfme.Rest);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
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
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.custom_button,

  pytest.mark.uncollectif(
    (appliance, obj_type) => (
      appliance.version >= "5.11" && obj_type == "LOAD_BALANCER"
    ),

    {reason: "Load Balancer not supported from version 5.11"}
  ),

  pytest.mark.parametrize(
    "obj_type",
    OBJ_TYPE,
    {ids: OBJ_TYPE.map(obj => obj.capitalize()), scope: "module"}
  )
];

function group_rest(request, appliance, obj_type) {
  let button_type = CLASS_MAP[obj_type].rest;

  let response = gen_data.custom_button_sets(
    request,
    appliance,
    button_type
  );

  assert_response(appliance);
  return response[0]
};

function buttons_rest(request, appliance, obj_type) {
  let button_type = CLASS_MAP[obj_type].rest;

  let response = gen_data.custom_buttons(
    request,
    appliance,
    button_type,
    {num: 2}
  );

  assert_response(appliance);
  return response
};

class TestCustomButtonRESTAPI {
  buttons_groups(request, appliance, obj_type) {
    if (is_bool(BZ(1827818, {forced_streams: ["5.11"]}).blocks && request.param == "custom_buttons")) {
      pytest.skip("Setup fails BZ-1827818; unable to create custom button with rest")
    };

    let button_type = CLASS_MAP[obj_type].rest;
    let num_conditions = 2;

    let response = gen_data.getattr(request.param).call(
      request,
      appliance,
      button_type,
      {num: num_conditions}
    );

    assert_response(appliance);
    if (response.size != num_conditions) throw new ();
    return [response, request.param]
  };

  test_query_attributes(buttons_groups, soft_assert) {
    // Tests access to custom button/group attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: ndhandre
    //         initialEstimate: 1/4h
    //         caseimportance: low
    //         caseposneg: positive
    //         testtype: functional
    //         startsin: 5.9
    //         casecomponent: Rest
    //         tags: custom_button
    //     
    let [response, _] = buttons_groups;
    query_resource_attributes(response[0], {soft_assert})
  };

  test_create(appliance, buttons_groups) {
    // Tests create custom button/group.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: ndhandre
    //         initialEstimate: 1/4h
    //         caseimportance: medium
    //         caseposneg: positive
    //         testtype: functional
    //         startsin: 5.9
    //         casecomponent: Rest
    //         tags: custom_button
    // 
    //     Bugzilla:
    //         1827818
    //     
    let [entities, _type] = buttons_groups;

    for (let entity in entities) {
      let record = appliance.rest_api.collections.getattr(_type).get({id: entity.id});
      if (record.description != entity.description) throw new ()
    }
  };

  test_delete_from_detail(buttons_groups, method) {
    // Tests delete custom button/group from detail.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: ndhandre
    //         initialEstimate: 1/4h
    //         caseimportance: medium
    //         caseposneg: positive
    //         testtype: functional
    //         startsin: 5.9
    //         casecomponent: Rest
    //         tags: custom_button
    //     
    let [entities, _] = buttons_groups;

    delete_resources_from_detail(
      entities,
      {method, num_sec: 100, delay: 5}
    )
  };

  test_delete_from_collection(buttons_groups) {
    // Tests delete custom button/group from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: ndhandre
    //         initialEstimate: 1/4h
    //         caseimportance: low
    //         caseposneg: positive
    //         testtype: functional
    //         startsin: 5.9
    //         casecomponent: Rest
    //         tags: custom_button
    //     
    let [entities, _] = buttons_groups;
    delete_resources_from_collection(entities, {num_sec: 100, delay: 5})
  };

  test_edit(buttons_groups, appliance, from_detail) {
    let edited;

    // Tests edit custom button/group.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: ndhandre
    //         initialEstimate: 1/4h
    //         caseimportance: medium
    //         caseposneg: positive
    //         testtype: functional
    //         startsin: 5.9
    //         casecomponent: Rest
    //         tags: custom_button
    //     
    let [entities, _type] = buttons_groups;
    let num_entities = entities.size;
    let uniq = num_entities.times.map(_ => fauxfactory.gen_alphanumeric(5));

    let new = uniq.map(u => ({
      name: `Edited_${u}`,
      description: `Edited_${u}`
    }));

    if (is_bool(from_detail)) {
      edited = [];

      for (let index in num_entities.times) {
        edited.push(entities[index].action.edit({None: new[index]}));
        assert_response(appliance)
      }
    } else {
      for (let index in num_entities.times) {
        new[index].update(entities[index]._ref_repr())
      };

      edited = appliance.rest_api.collections.getattr(_type).action.edit(...new);
      assert_response(appliance)
    };

    if (edited.size != num_entities) throw new ();

    for (let [index, condition] in enumerate(entities)) {
      let [record, __] = wait_for(
        () => (
          appliance.rest_api.collections.getattr(_type).find_by({description: new[index].description}) || false
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

function test_associate_unassigned_buttons_rest(appliance, group_rest, buttons_rest) {
  // Test associate unassigned button with group
  // 
  //   Bugzilla:
  //       1737449
  //       1745198
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/4h
  //       caseimportance: medium
  //       startsin: 5.10
  //       casecomponent: CustomButton
  //       tags: custom_button
  //   
  let set_data = group_rest.set_data;
  set_data.button_order = buttons_rest.map(b => b.id.to_i);
  let data = {set_data: set_data};
  group_rest.action.edit({None: data});
  assert_response(appliance);
  let group_collection = appliance.collections.button_groups;

  let gp = group_collection.ENTITY.from_id(
    group_collection,
    group_rest.id
  );

  let view = navigate_to(gp, "ObjectType");
  view.browser.refresh();
  view = navigate_to(gp, "Details");
  let ui_assinged_btns = view.assigned_buttons.map(btn => btn.Text.text).to_set;
  if (ui_assinged_btns != buttons_rest.map(btn => btn.name).to_set) throw new ()
}
