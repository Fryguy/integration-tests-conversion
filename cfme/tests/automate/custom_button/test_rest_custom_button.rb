require_relative 'cfme'
include Cfme
require_relative 'cfme/rest'
include Cfme::Rest
require_relative 'cfme/tests/automate/custom_button'
include Cfme::Tests::Automate::Custom_button
require_relative 'cfme/tests/automate/custom_button'
include Cfme::Tests::Automate::Custom_button
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
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), test_requirements.custom_button, pytest.mark.uncollectif(lambda{|appliance, obj_type| appliance.version >= "5.11" && obj_type == "LOAD_BALANCER"}, reason: "Load Balancer not supported from version 5.11"), pytest.mark.parametrize("obj_type", OBJ_TYPE, ids: OBJ_TYPE.map{|obj| obj.capitalize()}, scope: "module")]
def group_rest(request, appliance, obj_type)
  button_type = CLASS_MAP[obj_type]["rest"]
  response = gen_data.custom_button_sets(request, appliance, button_type)
  assert_response(appliance)
  return response[0]
end
def buttons_rest(request, appliance, obj_type)
  button_type = CLASS_MAP[obj_type]["rest"]
  response = gen_data.custom_buttons(request, appliance, button_type, num: 2)
  assert_response(appliance)
  return response
end
class TestCustomButtonRESTAPI
  def buttons_groups(request, appliance, obj_type)
    if is_bool(BZ(1827818, forced_streams: ["5.11"]).blocks && request.param == "custom_buttons")
      pytest.skip("Setup fails BZ-1827818; unable to create custom button with rest")
    end
    button_type = CLASS_MAP[obj_type]["rest"]
    num_conditions = 2
    response = gen_data.getattr(request.param).(request, appliance, button_type, num: num_conditions)
    assert_response(appliance)
    raise unless response.size == num_conditions
    return [response, request.param]
  end
  def test_query_attributes(buttons_groups, soft_assert)
    # Tests access to custom button/group attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: ndhandre
    #         initialEstimate: 1/4h
    #         caseimportance: low
    #         caseposneg: positive
    #         testtype: functional
    #         startsin: 5.9
    #         casecomponent: Rest
    #         tags: custom_button
    #     
    response,_ = buttons_groups
    query_resource_attributes(response[0], soft_assert: soft_assert)
  end
  def test_create(appliance, buttons_groups)
    # Tests create custom button/group.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: ndhandre
    #         initialEstimate: 1/4h
    #         caseimportance: medium
    #         caseposneg: positive
    #         testtype: functional
    #         startsin: 5.9
    #         casecomponent: Rest
    #         tags: custom_button
    # 
    #     Bugzilla:
    #         1827818
    #     
    entities,_type = buttons_groups
    for entity in entities
      record = appliance.rest_api.collections.getattr(_type).get(id: entity.id)
      raise unless record.description == entity.description
    end
  end
  def test_delete_from_detail(buttons_groups, method)
    # Tests delete custom button/group from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: ndhandre
    #         initialEstimate: 1/4h
    #         caseimportance: medium
    #         caseposneg: positive
    #         testtype: functional
    #         startsin: 5.9
    #         casecomponent: Rest
    #         tags: custom_button
    #     
    entities,_ = buttons_groups
    delete_resources_from_detail(entities, method: method, num_sec: 100, delay: 5)
  end
  def test_delete_from_collection(buttons_groups)
    # Tests delete custom button/group from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: ndhandre
    #         initialEstimate: 1/4h
    #         caseimportance: low
    #         caseposneg: positive
    #         testtype: functional
    #         startsin: 5.9
    #         casecomponent: Rest
    #         tags: custom_button
    #     
    entities,_ = buttons_groups
    delete_resources_from_collection(entities, num_sec: 100, delay: 5)
  end
  def test_edit(buttons_groups, appliance, from_detail)
    # Tests edit custom button/group.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: ndhandre
    #         initialEstimate: 1/4h
    #         caseimportance: medium
    #         caseposneg: positive
    #         testtype: functional
    #         startsin: 5.9
    #         casecomponent: Rest
    #         tags: custom_button
    #     
    entities,_type = buttons_groups
    num_entities = entities.size
    uniq = num_entities.times.map{|_| fauxfactory.gen_alphanumeric(5)}
    new = uniq.map{|u| {"name" => "Edited_#{u}", "description" => "Edited_#{u}"}}
    if is_bool(from_detail)
      edited = []
      for index in num_entities.times
        edited.push(entities[index].action.edit(None: new[index]))
        assert_response(appliance)
      end
    else
      for index in num_entities.times
        new[index].update(entities[index]._ref_repr())
      end
      edited = appliance.rest_api.collections.getattr(_type).action.edit(*new)
      assert_response(appliance)
    end
    raise unless edited.size == num_entities
    for (index, condition) in enumerate(entities)
      record,__ = wait_for(lambda{|| appliance.rest_api.collections.getattr(_type).find_by(description: new[index]["description"]) || false}, num_sec: 100, delay: 5, message: "Find a test condition")
      condition.reload()
      raise unless (condition.description == edited[index].description) and (edited[index].description == record[0].description)
    end
  end
end
def test_associate_unassigned_buttons_rest(appliance, group_rest, buttons_rest)
  # Test associate unassigned button with group
  # 
  #   Bugzilla:
  #       1737449
  #       1745198
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/4h
  #       caseimportance: medium
  #       startsin: 5.10
  #       casecomponent: CustomButton
  #       tags: custom_button
  #   
  set_data = group_rest.set_data
  set_data["button_order"] = buttons_rest.map{|b| b.id.to_i}
  data = {"set_data" => set_data}
  group_rest.action.edit(None: data)
  assert_response(appliance)
  group_collection = appliance.collections.button_groups
  gp = group_collection.ENTITY.from_id(group_collection, group_rest.id)
  view = navigate_to(gp, "ObjectType")
  view.browser.refresh()
  view = navigate_to(gp, "Details")
  ui_assinged_btns = view.assigned_buttons.map{|btn| btn["Text"].text}.to_set
  raise unless ui_assinged_btns == buttons_rest.map{|btn| btn.name}.to_set
end
