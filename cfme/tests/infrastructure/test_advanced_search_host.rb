# This testing module tests the behaviour of the search box in the Hosts section
require_relative 'itertools'
include Itertools
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/common/host_views'
include Cfme::Common::Host_views
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), test_requirements.filtering]
def host_collection(appliance)
  return appliance.collections.hosts
end
def hosts(infra_provider, host_collection)
  view = navigate_to(host_collection, "All")
  view.entities.search.remove_search_filters()
  return infra_provider.collections.hosts.all()
end
def hosts_with_vm_count(hosts, host_collection)
  # Returns a list of tuples (hostname, vm_count)
  hosts_with_vm_count = []
  view = navigate_to(host_collection, "All")
  view.toolbar.view_selector.select("Grid View")
  for host in hosts
    entity = view.entities.get_entity(name: host.name)
    hosts_with_vm_count.push([host.name, entity.data["total_vms"]])
  end
  return sorted(hosts_with_vm_count, key: lambda{|tup| tup[1]})
end
def get_expression(user_input: false, op: ">")
  expression = "fill_count(Host / Node.VMs, #{op}"
  if is_bool(user_input)
    return expression + ")"
  else
    return expression + ", {})"
  end
end
def host_with_median_vm(hosts_with_vm_count)
  # We'll pick a host with median number of vms
  sorted_hosts_with_vm_count = sorted(hosts_with_vm_count, key: lambda{|tup| tup[1].to_i})
  return sorted_hosts_with_vm_count[hosts_with_vm_count.size / 2]
end
def hosts_advanced_search(host_collection)
  view = navigate_to(host_collection, "All")
  raise "Cannot do advanced search here!" unless view.entities.search.is_advanced_search_possible
  yield(view)
  view.entities.search.remove_search_filters()
end
def test_can_open_host_advanced_search(hosts_advanced_search)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  hosts_advanced_search.entities.search.open_advanced_search()
end
def test_host_filter_without_user_input(host_collection, hosts, hosts_with_vm_count, host_with_median_vm, infra_provider, hosts_advanced_search)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  median_host,median_vm_count = host_with_median_vm
  more_than_median_hosts = hosts_with_vm_count.select{|hostname, vmcount| vmcount.to_i > median_vm_count.to_i}.map{|hostname, vmcount| hostname}.size
  hosts_advanced_search.entities.search.advanced_search(get_expression(user_input: false).format(median_vm_count))
  hosts_advanced_search.flash.assert_no_error()
  view = host_collection.appliance.browser.create_view(HostsView)
  hosts_on_page = view.entities.get_all().size
  raise unless more_than_median_hosts == hosts_on_page
end
def test_host_filter_with_user_input(host_collection, hosts, hosts_with_vm_count, host_with_median_vm, infra_provider, hosts_advanced_search)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  median_host,median_vm_count = host_with_median_vm
  more_than_median_hosts = hosts_with_vm_count.select{|hostname, vmcount| vmcount.to_i > median_vm_count.to_i}.map{|hostname, vmcount| hostname}.size
  hosts_advanced_search.entities.search.advanced_search(get_expression(user_input: true), {"COUNT" => median_vm_count})
  hosts_advanced_search.flash.assert_no_error()
  view = host_collection.appliance.browser.create_view(HostsView)
  hosts_on_page = view.entities.get_all().size
  raise unless more_than_median_hosts == hosts_on_page
end
def test_host_filter_with_user_input_and_cancellation(host_collection, hosts, hosts_with_vm_count, host_with_median_vm, hosts_advanced_search)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  median_host,median_vm_count = host_with_median_vm
  hosts_advanced_search.entities.search.advanced_search(get_expression(user_input: true), {"COUNT" => median_vm_count}, cancel_on_user_filling: true)
  hosts_advanced_search.flash.assert_no_error()
end
def test_host_filter_save_cancel(hosts_advanced_search, hosts, hosts_with_vm_count, host_with_median_vm)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  median_host,median_vm_count = host_with_median_vm
  filter_name = fauxfactory.gen_alphanumeric()
  hosts_advanced_search.entities.search.save_filter(get_expression(user_input: true), filter_name, cancel: true)
  hosts_advanced_search.flash.assert_no_error()
  pytest.raises(SelectItemNotFound) {
    hosts_advanced_search.entities.search.load_filter(filter_name)
  }
end
def test_host_filter_save_and_load(host_collection, request, hosts, hosts_with_vm_count, host_with_median_vm, infra_provider, hosts_advanced_search)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  median_host,median_vm_count = host_with_median_vm
  more_than_median_hosts = dropwhile(lambda{|h| h[1] <= median_vm_count}, hosts_with_vm_count).to_a
  filter_name = fauxfactory.gen_alphanumeric()
  hosts_advanced_search.entities.search.save_filter(get_expression(user_input: true), filter_name)
  hosts_advanced_search.flash.assert_no_error()
  hosts_advanced_search.entities.search.reset_filter()
  hosts_advanced_search.entities.search.load_filter(filter_name, fill_callback: {"COUNT" => median_vm_count}, apply_filter: true)
  hosts_advanced_search.flash.assert_no_error()
  request.addfinalizer(hosts_advanced_search.entities.search.delete_filter)
  raise unless more_than_median_hosts.size == hosts_advanced_search.entities.entity_names.size
end
def test_host_filter_save_and_cancel_load(host_collection, request, hosts, hosts_with_vm_count, host_with_median_vm, hosts_advanced_search)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  median_host,median_vm_count = host_with_median_vm
  filter_name = fauxfactory.gen_alphanumeric()
  hosts_advanced_search.entities.search.save_filter(get_expression(user_input: true), filter_name)
  cleanup = lambda do
    hosts_advanced_search.entities.search.load_filter(filter_name)
    hosts_advanced_search.entities.search.delete_filter()
  end
  hosts_advanced_search.flash.assert_no_error()
  hosts_advanced_search.entities.search.reset_filter()
  hosts_advanced_search.entities.search.load_filter(filter_name, cancel: true)
  hosts_advanced_search.flash.assert_no_error()
end
def test_host_filter_save_and_load_cancel(hosts_advanced_search, request, hosts, hosts_with_vm_count, host_with_median_vm)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  median_host,median_vm_count = host_with_median_vm
  filter_name = fauxfactory.gen_alphanumeric()
  hosts_advanced_search.entities.search.save_filter(get_expression(user_input: true), filter_name)
  cleanup = lambda do
    hosts_advanced_search.entities.search.load_filter(filter_name)
    hosts_advanced_search.entities.search.delete_filter()
  end
  hosts_advanced_search.flash.assert_no_error()
  hosts_advanced_search.entities.search.reset_filter()
  hosts_advanced_search.entities.search.load_filter(filter_name, fill_callback: {"COUNT" => median_vm_count}, cancel_on_user_filling: true, apply_filter: true)
  hosts_advanced_search.flash.assert_no_error()
end
def test_quick_search_without_host_filter(host_collection, request, hosts, hosts_with_vm_count, host_with_median_vm, infra_provider)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  view = navigate_to(host_collection, "All")
  view.entities.search.remove_search_filters()
  view.flash.assert_no_error()
  median_host,median_vm_count = host_with_median_vm
  view.entities.search.simple_search(median_host)
  request.addfinalizer(view.entities.search.clear_simple_search)
  view.flash.assert_no_error()
  all_hosts_visible = view.entities.entity_names
  raise unless all_hosts_visible.size == 1 && all_hosts_visible.include?(median_host)
end
def test_quick_search_with_host_filter(host_collection, request, hosts, hosts_with_vm_count, host_with_median_vm, infra_provider)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  view = navigate_to(host_collection, "All")
  median_host,median_vm_count = host_with_median_vm
  view.entities.search.advanced_search(get_expression(user_input: false, op: ">=").format(median_vm_count))
  view.flash.assert_no_error()
  request.addfinalizer(view.entities.search.clear_simple_search)
  view.entities.search.simple_search(median_host)
  view.flash.assert_no_error()
  all_hosts_visible = view.entities.entity_names
  raise unless all_hosts_visible.size == 1 && all_hosts_visible.include?(median_host)
end
def test_can_delete_host_filter(host_collection, hosts_advanced_search)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  filter_name = fauxfactory.gen_alphanumeric()
  hosts_advanced_search.entities.search.save_filter(get_expression(user_input: false).format(0), filter_name)
  hosts_advanced_search.flash.assert_no_error()
  hosts_advanced_search.entities.search.reset_filter()
  hosts_advanced_search.flash.assert_no_error()
  hosts_advanced_search.entities.search.load_filter(filter_name)
  hosts_advanced_search.flash.assert_no_error()
  if is_bool(!hosts_advanced_search.entities.search.delete_filter())
    raise pytest.fail, "Cannot delete filter! Probably the delete button is not present!"
  end
  hosts_advanced_search.flash.assert_no_error()
end
def test_delete_button_should_appear_after_save_host(host_collection, hosts_advanced_search, request)
  # Delete button appears only after load, not after save
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  filter_name = fauxfactory.gen_alphanumeric()
  hosts_advanced_search.entities.search.save_filter(get_expression(user_input: false).format(0), filter_name)
  cleanup = lambda do
    hosts_advanced_search.entities.search.delete_filter()
  end
  if is_bool(!hosts_advanced_search.entities.search.delete_filter())
    pytest.fail("Could not delete filter right after saving!")
  end
end
def test_cannot_delete_host_filter_more_than_once(host_collection, hosts_advanced_search)
  # When Delete button appars, it does not want to go away
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  filter_name = fauxfactory.gen_alphanumeric()
  hosts_advanced_search.entities.search.save_filter(get_expression(user_input: false).format(0), filter_name)
  hosts_advanced_search.entities.search.load_filter(filter_name)
  if is_bool(!hosts_advanced_search.entities.search.delete_filter())
    pytest.fail("Could not delete the filter even first time!")
  end
  hosts_advanced_search.flash.assert_no_error()
  raise "Delete twice accepted!" unless !hosts_advanced_search.entities.search.delete_filter()
end
