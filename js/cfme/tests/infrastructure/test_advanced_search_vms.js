// This testing module tests the behaviour of the view.entities.search box in the VMs section
require("None");
require_relative("widgetastic/exceptions");
include(Widgetastic.Exceptions);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.filtering,
  pytest.mark.provider({classes: [InfraProvider], selector: ONE}),
  pytest.mark.usefixtures("setup_provider")
];

function vms(appliance, provider) {
  // Ensure the infra providers are set up and get list of vms
  let view = navigate_to(appliance.collections.infra_vms, "VMsOnly");
  view.entities.search.remove_search_filters();
  return view.entities.all_entity_names
};

function running_vms(appliance, provider) {
  // Ensure the infra providers are set up and get list of running vms for advanced search
  let view = navigate_to(appliance.collections.infra_vms, "VMsOnly");

  view.sidebar.vms.tree.click_path(
    "All VMs",
    "Global Filters",
    "Status / Running"
  );

  return view.entities.all_entity_names
};

function subset_of_vms(vms) {
  // We'll pick a host with median number of vms
  let vm_num = (vms.size >= 4 ? 4 : vms.size);
  return sample(vms, vm_num)
};

function expression_for_vms_subset(subset_of_vms) {
  return subset_of_vms.map(vm => `fill_field(Virtual Machine : Name, =, ${vm})`).join(";select_first_expression;click_or;")
};

function vm_view(appliance) {
  let view = navigate_to(appliance.collections.infra_vms, "VMsOnly");

  if (!view.entities.search.is_advanced_search_possible) {
    throw "Cannot do advanced view.entities.search here!"
  };

  yield(view);
  view.entities.search.remove_search_filters()
};

function test_can_open_vm_advanced_search(vm_view) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  vm_view.entities.search.open_advanced_search()
};

function test_vm_filter_without_user_input(appliance, vm_view, vms, subset_of_vms, expression_for_vms_subset) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  vm_view.entities.search.advanced_search(expression_for_vms_subset);
  vm_view.flash.assert_no_error();
  let vms_present = vm_view.entities.entity_names;

  for (let vm in subset_of_vms) {
    if (!vms_present.include(vm)) throw `Could not find VM ${vm} after filtering!`
  }
};

function test_vm_filter_with_user_input(appliance, vm_view, vms, subset_of_vms, expression_for_vms_subset) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let vm = sample(subset_of_vms, 1)[0];
  let vms_before = vm_view.entities.get_all().size;

  vm_view.entities.search.advanced_search(
    "fill_field(Virtual Machine : Name, =)",
    {"Virtual Machine": vm}
  );

  vm_view.flash.assert_no_error();
  let vms_after = vm_view.entities.get_all().size;
  if (vms_after >= vms_before) throw new ();

  if (!vm_view.entities.entity_names.include(vm)) {
    throw `Could not find VM ${vm} after filtering!`
  }
};

function test_vm_filter_with_user_input_and_cancellation(vm_view, vms, subset_of_vms, expression_for_vms_subset) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let vm = sample(subset_of_vms, 1)[0];

  vm_view.entities.search.advanced_search(
    "fill_field(Virtual Machine : Name, =)",
    {"Virtual Machine": vm},
    {cancel_on_user_filling: true}
  );

  vm_view.flash.assert_no_error()
};

function test_vm_filter_save_cancel(vm_view, vms, subset_of_vms, expression_for_vms_subset) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_alphanumeric();

  vm_view.entities.search.save_filter(
    "fill_field(Virtual Machine : Name, =)",
    filter_name,
    {cancel: true}
  );

  vm_view.flash.assert_no_error();

  pytest.raises(
    NoSuchElementException,
    () => vm_view.entities.search.load_filter(filter_name)
  )
};

function test_vm_filter_save_and_load(appliance, request, vm_view, vms, subset_of_vms, expression_for_vms_subset) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_alphanumeric();
  let vm = sample(subset_of_vms, 1)[0];

  vm_view.entities.search.save_filter(
    "fill_field(Virtual Machine : Name, =)",
    filter_name
  );

  vm_view.flash.assert_no_error();
  vm_view.entities.search.reset_filter();

  vm_view.entities.search.load_filter(
    filter_name,
    {fill_callback: {"Virtual Machine": vm}, apply_filter: true}
  );

  let cleanup = () => {
    vm_view.entities.search.load_filter(filter_name);
    return vm_view.entities.search.delete_filter()
  };

  vm_view.flash.assert_no_error();
  if (!vm_view.entities.entity_names.include(vm)) throw new ()
};

function test_vm_filter_save_and_cancel_load(request, vm_view) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_alphanumeric();

  vm_view.entities.search.save_filter(
    "fill_field(Virtual Machine : Name, =)",
    filter_name
  );

  let cleanup = () => {
    vm_view.entities.search.load_filter(filter_name);
    return vm_view.entities.search.delete_filter()
  };

  vm_view.flash.assert_no_error();
  vm_view.entities.search.reset_filter();
  vm_view.entities.search.load_filter(filter_name, {cancel: true});
  vm_view.flash.assert_no_error()
};

function test_vm_filter_save_and_load_cancel(request, vms, subset_of_vms, vm_view) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_alphanumeric();
  let vm = sample(subset_of_vms, 1)[0];

  vm_view.entities.search.save_filter(
    "fill_field(Virtual Machine : Name, =)",
    filter_name
  );

  let cleanup = () => {
    vm_view.entities.search.load_filter(filter_name);
    return vm_view.entities.search.delete_filter()
  };

  vm_view.flash.assert_no_error();
  vm_view.entities.search.reset_filter();

  vm_view.entities.search.load_filter(filter_name, {
    fill_callback: {"Virtual Machine": vm},
    cancel_on_user_filling: true,
    apply_filter: true
  });

  vm_view.flash.assert_no_error()
};

function test_quick_search_without_vm_filter(appliance, request, vms, subset_of_vms) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let view = navigate_to(appliance.collections.infra_vms, "VMsOnly");
  view.flash.assert_no_error();
  let vm = sample(subset_of_vms, 1)[0];
  request.addfinalizer(view.entities.search.clear_simple_search);
  view.entities.search.simple_search(vm);
  view.flash.assert_no_error();

  let all_vms_visible = view.entities.get_all({surf_pages: false}).map(entity => (
    entity.name
  ));

  if (all_vms_visible.size != 1 || !all_vms_visible.include(vm)) throw new ()
};

function test_quick_search_with_vm_filter(vm_view, vms, subset_of_vms, appliance, expression_for_vms_subset) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  vm_view.entities.search.advanced_search(expression_for_vms_subset);
  vm_view.flash.assert_no_error();
  let chosen_vm = sample(subset_of_vms, 1)[0];
  vm_view.entities.search.simple_search(chosen_vm);
  vm_view.flash.assert_no_error();
  let all_vms_visible = vm_view.entities.entity_names;

  if (all_vms_visible.size != 1 || !all_vms_visible.include(chosen_vm)) {
    throw new ()
  }
};

function test_can_delete_vm_filter(vm_view) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_alphanumeric();

  vm_view.entities.search.save_filter(
    "fill_count(Virtual Machine.Files, >, 0)",
    filter_name
  );

  vm_view.flash.assert_no_error();
  vm_view.entities.search.reset_filter();
  vm_view.flash.assert_no_error();
  vm_view.entities.search.load_filter(filter_name);
  vm_view.flash.assert_no_error();

  if (is_bool(!vm_view.entities.search.delete_filter())) {
    throw new pytest.fail("Cannot delete filter! Probably the delete button is not present!")
  };

  vm_view.flash.assert_no_error()
};

function test_delete_button_should_appear_after_save_vm(request, vm_view) {
  // Delete button appears only after load, not after save
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_alphanumeric();

  vm_view.entities.search.save_filter(
    "fill_count(Virtual Machine.Files, >, 0)",
    filter_name
  );

  let cleanup = () => vm_view.entities.search.delete_filter();

  if (is_bool(!vm_view.entities.search.delete_filter())) {
    pytest.fail("Could not delete filter right after saving!")
  }
};

function test_cannot_delete_vm_filter_more_than_once(vm_view) {
  // When Delete button appars, it does not want to go away
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_alphanumeric();

  vm_view.entities.search.save_filter(
    "fill_count(Virtual Machine.Files, >, 0)",
    filter_name
  );

  vm_view.entities.search.load_filter(filter_name);

  if (is_bool(!vm_view.entities.search.delete_filter())) {
    pytest.fail("Could not delete the filter even first time!")
  };

  vm_view.flash.assert_no_error();
  if (!!vm_view.entities.search.delete_filter()) throw "Delete twice accepted!"
};

function test_create_filter_with_multiple_conditions(appliance, provider, request, running_vms) {
  let vm1_name, vm2_name, vm1, vm2;

  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: high
  //       initialEstimate: 1/5h
  //       setup:
  //           1. Navigate to Compute > Infrastructure > Providers.
  //           2. Click on Advanced Search Filter.
  //       testSteps:
  //           1. Create an expression with multiple types of condition. Eg: arg_1 AND arg_2 OR arg_3
  //       expectedResults:
  //           1. Expression must be created successfully.
  // 
  //   Bugzilla:
  //       1506672
  //       1660460
  //       1718895
  //   
  let filter_name = fauxfactory.gen_alphanumeric();

  if (running_vms.size >= 2) {
    let [vm1_name, vm2_name] = [running_vms[0], running_vms[1]];
    vm1 = appliance.collections.infra_vms.instantiate(vm1_name, provider);
    vm2 = appliance.collections.infra_vms.instantiate(vm2_name, provider)
  } else {
    pytest.skip("Less than 2 VMs are running, that's not enough for multiple condition test")
  };

  let tag1_name = {category: "Environment", value: "Development"};
  let tag2_name = {category: "Environment", value: "Test"};
  let tag1 = appliance.collections.categories.instantiate({display_name: "{}".format(tag1_name.category)}).collections.tags.instantiate({display_name: "{}".format(tag1_name.value)});
  let tag2 = appliance.collections.categories.instantiate({display_name: "{}".format(tag2_name.category)}).collections.tags.instantiate({display_name: "{}".format(tag1_name.value)});
  vm1.add_tag(tag1);
  vm2.add_tag(tag2);
  let vm_view = navigate_to(appliance.collections.infra_vms, "VMsOnly");
  let vms_before = vm_view.paginator.items_amount;

  vm_view.entities.search.advanced_search(
    "fill_field(Virtual Machine : Power State, INCLUDES, on);select_first_expression;click_and;fill_tag(Virtual Machine.My Company Tags : {}, {});select_last_expression; click_or;fill_tag(Virtual Machine.My Company Tags : {}, {})".format(
      tag1_name.category,
      tag1_name.value,
      tag2_name.category,
      tag2_name.value
    ),

    filter_name
  );

  let cleanup = () => {
    if (is_bool(!BZ(1725838, {forced_streams: ["5.10", "5.11"]}).blocks)) {
      vm_view.entities.search.load_filter(filter_name);
      vm_view.entities.search.delete_filter();
      vm1.remove_tag(tag1);
      return vm2.remove_tag(tag2)
    }
  };

  let vms_after = vm_view.entities.get_all().size;
  if (!(2 <= vms_after) || !(vms_after < vms_before)) throw new ();
  let msg = `Could not find VMs ${vm1_name}, ${vm2_name} after filtering!`;
  let vms = vm_view.entities.entity_names;
  if (!vms.include(vm1_name) || !vms.include(vm2_name)) throw msg
}
