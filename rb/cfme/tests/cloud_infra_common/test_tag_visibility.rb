require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.tag, pytest.mark.tier(3), pytest.mark.provider([CloudProvider, InfraProvider], required_fields: ["cap_and_util"], selector: ONE_PER_TYPE), pytest.mark.usefixtures("setup_provider")]
def tagged_vm(tag, provider)
  ownership_vm = provider.data.cap_and_util.capandu_vm
  collection = provider.appliance.provider_based_collection(provider)
  tag_vm = collection.instantiate(ownership_vm, provider)
  tag_vm.add_tag(tag: tag)
  yield(tag_vm)
  tag_vm.appliance.server.login_admin()
  tag_vm.remove_tag(tag: tag)
end
def test_tag_vis_vm(tagged_vm, user_restricted)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/4h
  #       caseimportance: critical
  #   
  user_restricted {
    raise "vm not found" unless tagged_vm.exists
  }
end
def location_tag(appliance)
  # Existing tag object
  category = appliance.collections.categories.instantiate(name: "location", display_name: "Location")
  tag = category.collections.tags.instantiate(name: "paris", display_name: "Paris")
  return tag
end
def service_level_tag(appliance)
  # Existing tag object
  category = appliance.collections.categories.instantiate(name: "service_level", display_name: "Service Level")
  tag = category.collections.tags.instantiate(name: "silver", display_name: "Silver")
  return tag
end
def third_tag(appliance)
  # The third tag for multiple conditions
  category = appliance.collections.categories.create(name: fauxfactory.gen_alphanumeric(8).downcase(), description: fauxfactory.gen_alphanumeric(32), display_name: fauxfactory.gen_alphanumeric(32))
  tag = category.collections.tags.create(name: fauxfactory.gen_alphanumeric(8).downcase(), display_name: fauxfactory.gen_alphanumeric(32))
  yield(tag)
  tag.delete_if_exists()
end
def vms_for_tagging(provider, appliance)
  # Get two existing vms for tagging
  view = navigate_to(provider, "ProviderVms")
  all_names = view.entities.all_entity_names
  first_vm = appliance.collections.infra_vms.instantiate(name: all_names[0], provider: provider)
  second_vm = appliance.collections.infra_vms.instantiate(name: all_names[1], provider: provider)
  return [first_vm, second_vm]
end
def group_with_tag_expression(appliance, user_restricted, request)
  _group_with_tag_expression = lambda do |expression|
    # Updates group with provided expression, also assign user to group
    group = appliance.collections.groups.create(description: fauxfactory.gen_alphanumeric(start: "grp_"), role: "EvmRole-approver", tag: expression)
    request.addfinalizer(group.delete)
    user_restricted.update({"group" => group})
    return group
  end
  return _group_with_tag_expression
end
def check_vm_visibility(user_restricted, appliance)
  _check_vm_visibility = lambda do |group, vm, vis_expect|
    # 
    #     Args:
    #         group: restricted group with expression tag
    #         vm: vm object to check visibility
    #         vis_expect: bool, True if tag should be visible
    # 
    #     Returns: None
    #     
    user_restricted {
      view = navigate_to(appliance.server, "LoggedIn")
      orig_group = view.current_groupname
      if group.description != orig_group
        view.change_group(group.description)
      end
      begin
        navigate_to(vm, "VMsOnlyDetails")
        actual_visibility = true
      rescue ItemNotFound
        actual_visibility = false
      end
    }
    raise "VM visibility is not as expected, expected #{vis_expect}" unless actual_visibility == vis_expect
  end
  return _check_vm_visibility
end
def test_tag_expression_and_condition(request, vms_for_tagging, location_tag, service_level_tag, group_with_tag_expression, check_vm_visibility)
  # Test for tag expression with AND condition
  #       Steps:
  #       1. Create group with expression tag1 AND tag2
  #       2. Assign tag1 to vm1 -> vm should not be visible to restricted user
  #       3. Assign tag2 to vm1 -> vm should be visible to restricted user
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/4h
  #   
  first_vm,_ = vms_for_tagging
  group = group_with_tag_expression.([location_tag, service_level_tag].map{|tag| "fill_tag(My Company Tags : {}, {})".format(tag.category.display_name, tag.display_name)}.join(";select_first_expression;click_and;"))
  first_vm.add_tag(location_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(location_tag)})
  check_vm_visibility.(group, first_vm, false)
  first_vm.add_tag(service_level_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(service_level_tag)})
  check_vm_visibility.(group, first_vm, true)
end
def test_tag_expression_or_condition(request, vms_for_tagging, location_tag, service_level_tag, group_with_tag_expression, check_vm_visibility)
  # Test for tag expression with OR condition
  #       Steps:
  #       1. Create group with expression tag1 OR tag2
  #       2. Assign tag1 to vm1 -> vm should be visible to restricted user
  #       3. Assign tag2 to vm2 -> vm should be visible to restricted user
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/4h
  #   
  first_vm,second_vm = vms_for_tagging
  group = group_with_tag_expression.([location_tag, service_level_tag].map{|tag| "fill_tag(My Company Tags : {}, {})".format(tag.category.display_name, tag.display_name)}.join(";select_first_expression;click_or;"))
  first_vm.add_tag(location_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(location_tag)})
  check_vm_visibility.(group, first_vm, true)
  second_vm.add_tag(service_level_tag)
  request.addfinalizer(lambda{|| second_vm.remove_tag(service_level_tag)})
  check_vm_visibility.(group, second_vm, true)
end
def test_tag_expression_not_condition(request, vms_for_tagging, location_tag, group_with_tag_expression, check_vm_visibility)
  # Test for tag expression with NOT condition
  #       Steps:
  #       1. Create group with expression NOT tag1
  #       2. Assign tag1 to vm1 -> vm should not be visible to restricted user
  #       3. vm2 should be visible to restricted user
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/4h
  #   
  first_vm,second_vm = vms_for_tagging
  group = group_with_tag_expression.("{};select_first_expression;click_not;".format("fill_tag(My Company Tags : {}, {})".format(location_tag.category.display_name, location_tag.display_name)))
  first_vm.add_tag(location_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(location_tag)})
  check_vm_visibility.(group, first_vm, false)
  check_vm_visibility.(group, second_vm, true)
end
def test_tag_expression_not_and_condition(request, vms_for_tagging, location_tag, service_level_tag, group_with_tag_expression, check_vm_visibility)
  # Test for tag expression with NOT and AND condition
  #       Steps:
  #       1. Create group with expression NOT tag1 AND tag2
  #       2. Assign tag1 to vm1 -> vm should not be visible to restricted user
  #       3. Assign tag2 to vm1 -> vm should not be visible to restricted user
  #       4. Assign tag2 to vm2 -> vm should be visible to restricted user
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/4h
  #   
  first_vm,second_vm = vms_for_tagging
  group = group_with_tag_expression.([location_tag, service_level_tag].map{|tag| "fill_tag(My Company Tags : {}, {})".format(tag.category.display_name, tag.display_name)}.join(";select_first_expression;click_not;select_first_expression;click_and;"))
  first_vm.add_tag(location_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(location_tag)})
  check_vm_visibility.(group, first_vm, false)
  first_vm.add_tag(service_level_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(service_level_tag)})
  check_vm_visibility.(group, first_vm, false)
  second_vm.add_tag(service_level_tag)
  request.addfinalizer(lambda{|| second_vm.remove_tag(service_level_tag)})
  check_vm_visibility.(group, second_vm, true)
end
def test_tag_expression_not_or_condition(request, vms_for_tagging, location_tag, service_level_tag, group_with_tag_expression, check_vm_visibility)
  # Test for tag expression with NOT and OR condition
  #       Steps:
  #       1. Create group with expression NOT tag1 OR tag2
  #       2. Assign tag1 to vm1 -> vm should not be visible to restricted user
  #       3. Assign tag2 to vm1 -> vm should be visible to restricted user
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/4h
  #   
  first_vm,_ = vms_for_tagging
  group = group_with_tag_expression.([location_tag, service_level_tag].map{|tag| "fill_tag(My Company Tags : {}, {})".format(tag.category.display_name, tag.display_name)}.join(";select_first_expression;click_not;select_first_expression;click_or;"))
  first_vm.add_tag(location_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(location_tag)})
  check_vm_visibility.(group, first_vm, false)
  first_vm.add_tag(service_level_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(service_level_tag)})
  check_vm_visibility.(group, first_vm, true)
end
def test_tag_expression_and_with_or_with_not(request, vms_for_tagging, location_tag, service_level_tag, third_tag, group_with_tag_expression, check_vm_visibility)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       startsin: 5.9
  #       testSteps:
  #           1. Combine tags with AND and NOT and OR conditions
  #           2. Check item visibility
  #   
  first_vm,second_vm = vms_for_tagging
  group = group_with_tag_expression.("fill_tag(My Company Tags : #{location_tag.category.display_name}, #{location_tag.display_name});select_first_expression;click_and;fill_tag(My Company Tags : #{service_level_tag.category.display_name}, #{service_level_tag.display_name});select_last_expression;click_not;select_last_expression;click_or;fill_tag(My Company Tags : #{third_tag.category.display_name}, #{third_tag.display_name})")
  first_vm.add_tag(location_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(location_tag)})
  check_vm_visibility.(group, first_vm, true)
  first_vm.add_tag(service_level_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(service_level_tag)})
  check_vm_visibility.(group, first_vm, false)
  second_vm.add_tag(third_tag)
  request.addfinalizer(lambda{|| second_vm.remove_tag(third_tag)})
  check_vm_visibility.(group, second_vm, false)
end
def test_tag_expression_and_with_or(request, vms_for_tagging, location_tag, service_level_tag, third_tag, group_with_tag_expression, check_vm_visibility)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       startsin: 5.9
  #       testSteps:
  #           1. Combine tags with AND and OR conditions
  #           2. Check item visibility
  #   
  first_vm,second_vm = vms_for_tagging
  group = group_with_tag_expression.("fill_tag(My Company Tags : #{location_tag.category.display_name}, #{location_tag.display_name});select_first_expression;click_and;fill_tag(My Company Tags : #{service_level_tag.category.display_name}, #{service_level_tag.display_name});select_last_expression;click_or;fill_tag(My Company Tags : #{third_tag.category.display_name}, #{third_tag.display_name})")
  first_vm.add_tag(location_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(location_tag)})
  check_vm_visibility.(group, first_vm, false)
  first_vm.add_tag(service_level_tag)
  request.addfinalizer(lambda{|| first_vm.remove_tag(service_level_tag)})
  check_vm_visibility.(group, first_vm, true)
  second_vm.add_tags([service_level_tag, third_tag])
  request.addfinalizer(lambda{|| second_vm.remove_tags([service_level_tag, third_tag])})
  check_vm_visibility.(group, second_vm, false)
end
