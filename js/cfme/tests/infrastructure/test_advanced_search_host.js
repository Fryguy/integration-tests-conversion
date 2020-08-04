// This testing module tests the behaviour of the search box in the Hosts section
require_relative("itertools");
include(Itertools);
require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/common/host_views");
include(Cfme.Common.Host_views);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [pytest.mark.tier(3), test_requirements.filtering];

function host_collection(appliance) {
  return appliance.collections.hosts
};

function hosts(infra_provider, host_collection) {
  let view = navigate_to(host_collection, "All");
  view.entities.search.remove_search_filters();
  return infra_provider.collections.hosts.all()
};

function hosts_with_vm_count(hosts, host_collection) {
  // Returns a list of tuples (hostname, vm_count)
  let hosts_with_vm_count = [];
  let view = navigate_to(host_collection, "All");
  view.toolbar.view_selector.select("Grid View");

  for (let host in hosts) {
    let entity = view.entities.get_entity({name: host.name});
    hosts_with_vm_count.push([host.name, entity.data.total_vms])
  };

  return sorted(hosts_with_vm_count, {key(tup) {return tup[1]}})
};

function get_expression({ user_input = false, op = ">" }) {
  let expression = `fill_count(Host / Node.VMs, ${op}`;

  if (is_bool(user_input)) {
    return expression + ")"
  } else {
    return expression + ", {})"
  }
};

function host_with_median_vm(hosts_with_vm_count) {
  // We'll pick a host with median number of vms
  let sorted_hosts_with_vm_count = sorted(
    hosts_with_vm_count,
    {key(tup) {return tup[1].to_i}}
  );

  return sorted_hosts_with_vm_count[hosts_with_vm_count.size / 2]
};

function hosts_advanced_search(host_collection) {
  let view = navigate_to(host_collection, "All");

  if (!view.entities.search.is_advanced_search_possible) {
    throw "Cannot do advanced search here!"
  };

  yield(view);
  view.entities.search.remove_search_filters()
};

function test_can_open_host_advanced_search(hosts_advanced_search) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  hosts_advanced_search.entities.search.open_advanced_search()
};

function test_host_filter_without_user_input(host_collection, hosts, hosts_with_vm_count, host_with_median_vm, infra_provider, hosts_advanced_search) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let [median_host, median_vm_count] = host_with_median_vm;

  let more_than_median_hosts = hosts_with_vm_count.select((hostname, vmcount) => (
    vmcount.to_i > median_vm_count.to_i
  )).map((hostname, vmcount) => hostname).size;

  hosts_advanced_search.entities.search.advanced_search(get_expression({user_input: false}).format(median_vm_count));
  hosts_advanced_search.flash.assert_no_error();
  let view = host_collection.appliance.browser.create_view(HostsView);
  let hosts_on_page = view.entities.get_all().size;
  if (more_than_median_hosts != hosts_on_page) throw new ()
};

function test_host_filter_with_user_input(host_collection, hosts, hosts_with_vm_count, host_with_median_vm, infra_provider, hosts_advanced_search) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let [median_host, median_vm_count] = host_with_median_vm;

  let more_than_median_hosts = hosts_with_vm_count.select((hostname, vmcount) => (
    vmcount.to_i > median_vm_count.to_i
  )).map((hostname, vmcount) => hostname).size;

  hosts_advanced_search.entities.search.advanced_search(
    get_expression({user_input: true}),
    {COUNT: median_vm_count}
  );

  hosts_advanced_search.flash.assert_no_error();
  let view = host_collection.appliance.browser.create_view(HostsView);
  let hosts_on_page = view.entities.get_all().size;
  if (more_than_median_hosts != hosts_on_page) throw new ()
};

function test_host_filter_with_user_input_and_cancellation(host_collection, hosts, hosts_with_vm_count, host_with_median_vm, hosts_advanced_search) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let [median_host, median_vm_count] = host_with_median_vm;

  hosts_advanced_search.entities.search.advanced_search(
    get_expression({user_input: true}),
    {COUNT: median_vm_count},
    {cancel_on_user_filling: true}
  );

  hosts_advanced_search.flash.assert_no_error()
};

function test_host_filter_save_cancel(hosts_advanced_search, hosts, hosts_with_vm_count, host_with_median_vm) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let [median_host, median_vm_count] = host_with_median_vm;
  let filter_name = fauxfactory.gen_alphanumeric();

  hosts_advanced_search.entities.search.save_filter(
    get_expression({user_input: true}),
    filter_name,
    {cancel: true}
  );

  hosts_advanced_search.flash.assert_no_error();

  pytest.raises(
    SelectItemNotFound,
    () => hosts_advanced_search.entities.search.load_filter(filter_name)
  )
};

function test_host_filter_save_and_load(host_collection, request, hosts, hosts_with_vm_count, host_with_median_vm, infra_provider, hosts_advanced_search) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let [median_host, median_vm_count] = host_with_median_vm;

  let more_than_median_hosts = dropwhile(
    h => h[1] <= median_vm_count,
    hosts_with_vm_count
  ).to_a;

  let filter_name = fauxfactory.gen_alphanumeric();

  hosts_advanced_search.entities.search.save_filter(
    get_expression({user_input: true}),
    filter_name
  );

  hosts_advanced_search.flash.assert_no_error();
  hosts_advanced_search.entities.search.reset_filter();

  hosts_advanced_search.entities.search.load_filter(
    filter_name,
    {fill_callback: {COUNT: median_vm_count}, apply_filter: true}
  );

  hosts_advanced_search.flash.assert_no_error();
  request.addfinalizer(hosts_advanced_search.entities.search.delete_filter);

  if (more_than_median_hosts.size != hosts_advanced_search.entities.entity_names.size) {
    throw new ()
  }
};

function test_host_filter_save_and_cancel_load(host_collection, request, hosts, hosts_with_vm_count, host_with_median_vm, hosts_advanced_search) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let [median_host, median_vm_count] = host_with_median_vm;
  let filter_name = fauxfactory.gen_alphanumeric();

  hosts_advanced_search.entities.search.save_filter(
    get_expression({user_input: true}),
    filter_name
  );

  let cleanup = () => {
    hosts_advanced_search.entities.search.load_filter(filter_name);
    return hosts_advanced_search.entities.search.delete_filter()
  };

  hosts_advanced_search.flash.assert_no_error();
  hosts_advanced_search.entities.search.reset_filter();

  hosts_advanced_search.entities.search.load_filter(
    filter_name,
    {cancel: true}
  );

  hosts_advanced_search.flash.assert_no_error()
};

function test_host_filter_save_and_load_cancel(hosts_advanced_search, request, hosts, hosts_with_vm_count, host_with_median_vm) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let [median_host, median_vm_count] = host_with_median_vm;
  let filter_name = fauxfactory.gen_alphanumeric();

  hosts_advanced_search.entities.search.save_filter(
    get_expression({user_input: true}),
    filter_name
  );

  let cleanup = () => {
    hosts_advanced_search.entities.search.load_filter(filter_name);
    return hosts_advanced_search.entities.search.delete_filter()
  };

  hosts_advanced_search.flash.assert_no_error();
  hosts_advanced_search.entities.search.reset_filter();

  hosts_advanced_search.entities.search.load_filter(filter_name, {
    fill_callback: {COUNT: median_vm_count},
    cancel_on_user_filling: true,
    apply_filter: true
  });

  hosts_advanced_search.flash.assert_no_error()
};

function test_quick_search_without_host_filter(host_collection, request, hosts, hosts_with_vm_count, host_with_median_vm, infra_provider) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let view = navigate_to(host_collection, "All");
  view.entities.search.remove_search_filters();
  view.flash.assert_no_error();
  let [median_host, median_vm_count] = host_with_median_vm;
  view.entities.search.simple_search(median_host);
  request.addfinalizer(view.entities.search.clear_simple_search);
  view.flash.assert_no_error();
  let all_hosts_visible = view.entities.entity_names;

  if (all_hosts_visible.size != 1 || !all_hosts_visible.include(median_host)) {
    throw new ()
  }
};

function test_quick_search_with_host_filter(host_collection, request, hosts, hosts_with_vm_count, host_with_median_vm, infra_provider) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let view = navigate_to(host_collection, "All");
  let [median_host, median_vm_count] = host_with_median_vm;

  view.entities.search.advanced_search(get_expression({
    user_input: false,
    op: ">="
  }).format(median_vm_count));

  view.flash.assert_no_error();
  request.addfinalizer(view.entities.search.clear_simple_search);
  view.entities.search.simple_search(median_host);
  view.flash.assert_no_error();
  let all_hosts_visible = view.entities.entity_names;

  if (all_hosts_visible.size != 1 || !all_hosts_visible.include(median_host)) {
    throw new ()
  }
};

function test_can_delete_host_filter(host_collection, hosts_advanced_search) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_alphanumeric();

  hosts_advanced_search.entities.search.save_filter(
    get_expression({user_input: false}).format(0),
    filter_name
  );

  hosts_advanced_search.flash.assert_no_error();
  hosts_advanced_search.entities.search.reset_filter();
  hosts_advanced_search.flash.assert_no_error();
  hosts_advanced_search.entities.search.load_filter(filter_name);
  hosts_advanced_search.flash.assert_no_error();

  if (is_bool(!hosts_advanced_search.entities.search.delete_filter())) {
    throw new pytest.fail("Cannot delete filter! Probably the delete button is not present!")
  };

  hosts_advanced_search.flash.assert_no_error()
};

function test_delete_button_should_appear_after_save_host(host_collection, hosts_advanced_search, request) {
  // Delete button appears only after load, not after save
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_alphanumeric();

  hosts_advanced_search.entities.search.save_filter(
    get_expression({user_input: false}).format(0),
    filter_name
  );

  let cleanup = () => hosts_advanced_search.entities.search.delete_filter();

  if (is_bool(!hosts_advanced_search.entities.search.delete_filter())) {
    pytest.fail("Could not delete filter right after saving!")
  }
};

function test_cannot_delete_host_filter_more_than_once(host_collection, hosts_advanced_search) {
  // When Delete button appars, it does not want to go away
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_alphanumeric();

  hosts_advanced_search.entities.search.save_filter(
    get_expression({user_input: false}).format(0),
    filter_name
  );

  hosts_advanced_search.entities.search.load_filter(filter_name);

  if (is_bool(!hosts_advanced_search.entities.search.delete_filter())) {
    pytest.fail("Could not delete the filter even first time!")
  };

  hosts_advanced_search.flash.assert_no_error();

  if (!!hosts_advanced_search.entities.search.delete_filter()) {
    throw "Delete twice accepted!"
  }
}
