require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/exceptions");
include(Cfme.Exceptions);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  test_requirements.tag,
  pytest.mark.tier(3),

  pytest.mark.provider(
    [CloudProvider, InfraProvider],
    {required_fields: ["cap_and_util"], selector: ONE_PER_TYPE}
  ),

  pytest.mark.usefixtures("setup_provider")
];

function tagged_vm(tag, provider) {
  let ownership_vm = provider.data.cap_and_util.capandu_vm;
  let collection = provider.appliance.provider_based_collection(provider);
  let tag_vm = collection.instantiate(ownership_vm, provider);
  tag_vm.add_tag({tag});
  yield(tag_vm);
  tag_vm.appliance.server.login_admin();
  tag_vm.remove_tag({tag})
};

function test_tag_vis_vm(tagged_vm, user_restricted) {
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Tagging
  //       initialEstimate: 1/4h
  //       caseimportance: critical
  //   
  user_restricted(() => {
    if (!tagged_vm.exists) throw "vm not found"
  })
};

function location_tag(appliance) {
  // Existing tag object
  let category = appliance.collections.categories.instantiate({
    name: "location",
    display_name: "Location"
  });

  let tag = category.collections.tags.instantiate({
    name: "paris",
    display_name: "Paris"
  });

  return tag
};

function service_level_tag(appliance) {
  // Existing tag object
  let category = appliance.collections.categories.instantiate({
    name: "service_level",
    display_name: "Service Level"
  });

  let tag = category.collections.tags.instantiate({
    name: "silver",
    display_name: "Silver"
  });

  return tag
};

function third_tag(appliance) {
  // The third tag for multiple conditions
  let category = appliance.collections.categories.create({
    name: fauxfactory.gen_alphanumeric(8).downcase(),
    description: fauxfactory.gen_alphanumeric(32),
    display_name: fauxfactory.gen_alphanumeric(32)
  });

  let tag = category.collections.tags.create({
    name: fauxfactory.gen_alphanumeric(8).downcase(),
    display_name: fauxfactory.gen_alphanumeric(32)
  });

  yield(tag);
  tag.delete_if_exists()
};

function vms_for_tagging(provider, appliance) {
  // Get two existing vms for tagging
  let view = navigate_to(provider, "ProviderVms");
  let all_names = view.entities.all_entity_names;

  let first_vm = appliance.collections.infra_vms.instantiate({
    name: all_names[0],
    provider
  });

  let second_vm = appliance.collections.infra_vms.instantiate({
    name: all_names[1],
    provider
  });

  return [first_vm, second_vm]
};

function group_with_tag_expression(appliance, user_restricted, request) {
  let _group_with_tag_expression = (expression) => {
    // Updates group with provided expression, also assign user to group
    let group = appliance.collections.groups.create({
      description: fauxfactory.gen_alphanumeric({start: "grp_"}),
      role: "EvmRole-approver",
      tag: expression
    });

    request.addfinalizer(group.delete);
    user_restricted.update({group: group});
    return group
  };

  return _group_with_tag_expression
};

function check_vm_visibility(user_restricted, appliance) {
  let _check_vm_visibility = (group, vm, vis_expect) => {
    // 
    //     Args:
    //         group: restricted group with expression tag
    //         vm: vm object to check visibility
    //         vis_expect: bool, True if tag should be visible
    // 
    //     Returns: None
    //     
    user_restricted(() => {
      let view = navigate_to(appliance.server, "LoggedIn");
      let orig_group = view.current_groupname;
      if (group.description != orig_group) view.change_group(group.description);

      try {
        navigate_to(vm, "VMsOnlyDetails");
        let actual_visibility = true
      } catch ($EXCEPTION) {
        if ($EXCEPTION instanceof ItemNotFound) {
          let actual_visibility = false
        } else {
          throw $EXCEPTION
        }
      }
    });

    if (actual_visibility != vis_expect) {
      return throw `VM visibility is not as expected, expected ${vis_expect}`
    }
  };

  return _check_vm_visibility
};

function test_tag_expression_and_condition(request, vms_for_tagging, location_tag, service_level_tag, group_with_tag_expression, check_vm_visibility) {
  // Test for tag expression with AND condition
  //       Steps:
  //       1. Create group with expression tag1 AND tag2
  //       2. Assign tag1 to vm1 -> vm should not be visible to restricted user
  //       3. Assign tag2 to vm1 -> vm should be visible to restricted user
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Tagging
  //       initialEstimate: 1/4h
  //   
  let [first_vm, _] = vms_for_tagging;

  let group = group_with_tag_expression.call([
    location_tag,
    service_level_tag
  ].map(tag => (
    "fill_tag(My Company Tags : {}, {})".format(
      tag.category.display_name,
      tag.display_name
    )
  )).join(";select_first_expression;click_and;"));

  first_vm.add_tag(location_tag);
  request.addfinalizer(() => first_vm.remove_tag(location_tag));
  check_vm_visibility.call(group, first_vm, false);
  first_vm.add_tag(service_level_tag);
  request.addfinalizer(() => first_vm.remove_tag(service_level_tag));
  check_vm_visibility.call(group, first_vm, true)
};

function test_tag_expression_or_condition(request, vms_for_tagging, location_tag, service_level_tag, group_with_tag_expression, check_vm_visibility) {
  // Test for tag expression with OR condition
  //       Steps:
  //       1. Create group with expression tag1 OR tag2
  //       2. Assign tag1 to vm1 -> vm should be visible to restricted user
  //       3. Assign tag2 to vm2 -> vm should be visible to restricted user
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Tagging
  //       initialEstimate: 1/4h
  //   
  let [first_vm, second_vm] = vms_for_tagging;

  let group = group_with_tag_expression.call([
    location_tag,
    service_level_tag
  ].map(tag => (
    "fill_tag(My Company Tags : {}, {})".format(
      tag.category.display_name,
      tag.display_name
    )
  )).join(";select_first_expression;click_or;"));

  first_vm.add_tag(location_tag);
  request.addfinalizer(() => first_vm.remove_tag(location_tag));
  check_vm_visibility.call(group, first_vm, true);
  second_vm.add_tag(service_level_tag);
  request.addfinalizer(() => second_vm.remove_tag(service_level_tag));
  check_vm_visibility.call(group, second_vm, true)
};

function test_tag_expression_not_condition(request, vms_for_tagging, location_tag, group_with_tag_expression, check_vm_visibility) {
  // Test for tag expression with NOT condition
  //       Steps:
  //       1. Create group with expression NOT tag1
  //       2. Assign tag1 to vm1 -> vm should not be visible to restricted user
  //       3. vm2 should be visible to restricted user
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Tagging
  //       initialEstimate: 1/4h
  //   
  let [first_vm, second_vm] = vms_for_tagging;

  let group = group_with_tag_expression.call("{};select_first_expression;click_not;".format("fill_tag(My Company Tags : {}, {})".format(
    location_tag.category.display_name,
    location_tag.display_name
  )));

  first_vm.add_tag(location_tag);
  request.addfinalizer(() => first_vm.remove_tag(location_tag));
  check_vm_visibility.call(group, first_vm, false);
  check_vm_visibility.call(group, second_vm, true)
};

function test_tag_expression_not_and_condition(request, vms_for_tagging, location_tag, service_level_tag, group_with_tag_expression, check_vm_visibility) {
  // Test for tag expression with NOT and AND condition
  //       Steps:
  //       1. Create group with expression NOT tag1 AND tag2
  //       2. Assign tag1 to vm1 -> vm should not be visible to restricted user
  //       3. Assign tag2 to vm1 -> vm should not be visible to restricted user
  //       4. Assign tag2 to vm2 -> vm should be visible to restricted user
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Tagging
  //       initialEstimate: 1/4h
  //   
  let [first_vm, second_vm] = vms_for_tagging;

  let group = group_with_tag_expression.call([
    location_tag,
    service_level_tag
  ].map(tag => (
    "fill_tag(My Company Tags : {}, {})".format(
      tag.category.display_name,
      tag.display_name
    )
  )).join(";select_first_expression;click_not;select_first_expression;click_and;"));

  first_vm.add_tag(location_tag);
  request.addfinalizer(() => first_vm.remove_tag(location_tag));
  check_vm_visibility.call(group, first_vm, false);
  first_vm.add_tag(service_level_tag);
  request.addfinalizer(() => first_vm.remove_tag(service_level_tag));
  check_vm_visibility.call(group, first_vm, false);
  second_vm.add_tag(service_level_tag);
  request.addfinalizer(() => second_vm.remove_tag(service_level_tag));
  check_vm_visibility.call(group, second_vm, true)
};

function test_tag_expression_not_or_condition(request, vms_for_tagging, location_tag, service_level_tag, group_with_tag_expression, check_vm_visibility) {
  // Test for tag expression with NOT and OR condition
  //       Steps:
  //       1. Create group with expression NOT tag1 OR tag2
  //       2. Assign tag1 to vm1 -> vm should not be visible to restricted user
  //       3. Assign tag2 to vm1 -> vm should be visible to restricted user
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Tagging
  //       initialEstimate: 1/4h
  //   
  let [first_vm, _] = vms_for_tagging;

  let group = group_with_tag_expression.call([
    location_tag,
    service_level_tag
  ].map(tag => (
    "fill_tag(My Company Tags : {}, {})".format(
      tag.category.display_name,
      tag.display_name
    )
  )).join(";select_first_expression;click_not;select_first_expression;click_or;"));

  first_vm.add_tag(location_tag);
  request.addfinalizer(() => first_vm.remove_tag(location_tag));
  check_vm_visibility.call(group, first_vm, false);
  first_vm.add_tag(service_level_tag);
  request.addfinalizer(() => first_vm.remove_tag(service_level_tag));
  check_vm_visibility.call(group, first_vm, true)
};

function test_tag_expression_and_with_or_with_not(request, vms_for_tagging, location_tag, service_level_tag, third_tag, group_with_tag_expression, check_vm_visibility) {
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Tagging
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       startsin: 5.9
  //       testSteps:
  //           1. Combine tags with AND and NOT and OR conditions
  //           2. Check item visibility
  //   
  let [first_vm, second_vm] = vms_for_tagging;
  let group = group_with_tag_expression.call(`fill_tag(My Company Tags : ${location_tag.category.display_name}, ${location_tag.display_name});select_first_expression;click_and;fill_tag(My Company Tags : ${service_level_tag.category.display_name}, ${service_level_tag.display_name});select_last_expression;click_not;select_last_expression;click_or;fill_tag(My Company Tags : ${third_tag.category.display_name}, ${third_tag.display_name})`);
  first_vm.add_tag(location_tag);
  request.addfinalizer(() => first_vm.remove_tag(location_tag));
  check_vm_visibility.call(group, first_vm, true);
  first_vm.add_tag(service_level_tag);
  request.addfinalizer(() => first_vm.remove_tag(service_level_tag));
  check_vm_visibility.call(group, first_vm, false);
  second_vm.add_tag(third_tag);
  request.addfinalizer(() => second_vm.remove_tag(third_tag));
  check_vm_visibility.call(group, second_vm, false)
};

function test_tag_expression_and_with_or(request, vms_for_tagging, location_tag, service_level_tag, third_tag, group_with_tag_expression, check_vm_visibility) {
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Tagging
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       startsin: 5.9
  //       testSteps:
  //           1. Combine tags with AND and OR conditions
  //           2. Check item visibility
  //   
  let [first_vm, second_vm] = vms_for_tagging;
  let group = group_with_tag_expression.call(`fill_tag(My Company Tags : ${location_tag.category.display_name}, ${location_tag.display_name});select_first_expression;click_and;fill_tag(My Company Tags : ${service_level_tag.category.display_name}, ${service_level_tag.display_name});select_last_expression;click_or;fill_tag(My Company Tags : ${third_tag.category.display_name}, ${third_tag.display_name})`);
  first_vm.add_tag(location_tag);
  request.addfinalizer(() => first_vm.remove_tag(location_tag));
  check_vm_visibility.call(group, first_vm, false);
  first_vm.add_tag(service_level_tag);
  request.addfinalizer(() => first_vm.remove_tag(service_level_tag));
  check_vm_visibility.call(group, first_vm, true);
  second_vm.add_tags([service_level_tag, third_tag]);

  request.addfinalizer(() => (
    second_vm.remove_tags([service_level_tag, third_tag])
  ));

  check_vm_visibility.call(group, second_vm, false)
}
