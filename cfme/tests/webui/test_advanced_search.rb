require 'None'
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/physical/provider'
include Cfme::Physical::Provider
require_relative 'cfme/services/myservice'
include Cfme::Services::Myservice
require_relative 'cfme/services/workloads'
include Cfme::Services::Workloads
require_relative 'cfme/services/workloads'
include Cfme::Services::Workloads
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
SearchParam = namedtuple("SearchParam", ["collection", "destination", "entity", "filter", "my_filters"])
pytestmark = [pytest.mark.uncollectif(lambda{|param, appliance| appliance.version >= "5.11" && param.entity == "network_load_balancers"}, reason: "load balancers are no longer supported in 5.11 -> BZ 1672949 "), pytest.mark.meta(automates: [BZ(1402392), BZ(1777493)])]
def _navigation(param, appliance)
  if is_bool(param.collection.is_a? String)
    view = navigate_to(appliance.collections.getattr(param.collection), param.destination)
  else
    view = navigate_to(param.collection, param.destination)
  end
  return view
end
def _filter_displayed(filters, filter)
  if is_bool(filters.is_displayed)
    raise "Filter wasn't created!" unless filter
  else
    pytest.fail("Filter wasn't created or filters tree is not displayed!")
  end
end
def _select_filter(filters, filter_name, param)
  if is_bool(param.my_filters)
    if is_bool(param.my_filters.is_a? Array)
      filters.tree.click_path(param.my_filters[1], "My Filters", filter_name)
    else
      filters.tree.click_path("My Filters", filter_name)
    end
  else
    filters.navigation.select(filter_name)
  end
end
def _can_open_advanced_search(param, appliance)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: critical
  #       initialEstimate: 1/10h
  #   
  view = _navigation(param, appliance)
  raise  unless view.search.is_advanced_search_possible
  view.search.open_advanced_search()
  raise  unless view.search.is_advanced_search_opened
  view.search.close_advanced_search()
  raise  unless !view.search.is_advanced_search_opened
end
def _filter_crud(param, appliance)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: high
  #       initialEstimate: 1/10h
  #   
  filter_name = fauxfactory.gen_string("alphanumeric", 10)
  filter_value = fauxfactory.gen_string("alphanumeric", 10)
  filter_value_updated = fauxfactory.gen_string("alphanumeric", 10)
  view = _navigation(param, appliance)
  if !param.filter.include?(":")
    filter_value = fauxfactory.gen_numeric_string(3)
    filter_value_updated = fauxfactory.gen_numeric_string(3)
    view.search.save_filter(, filter_name)
  else
    view.search.save_filter(, filter_name)
  end
  view.search.close_advanced_search()
  view.flash.assert_no_error()
  if is_bool(param.my_filters)
    if is_bool(param.my_filters.is_a? Array)
      filters = operator.attrgetter(param.my_filters[0]).(view)
      _filter_displayed(filters, filters.tree.has_path(param.my_filters[1], "My Filters", filter_name))
    else
      filters = operator.attrgetter(param.my_filters).(view)
      _filter_displayed(filters, filters.tree.has_path("My Filters", filter_name))
    end
  else
    filters = view.my_filters
    _filter_displayed(filters, filters.navigation.has_item(filter_name))
  end
  _select_filter(filters, filter_name, param)
  view.search.open_advanced_search()
  view.search.advanced_search_form.search_exp_editor.select_first_expression()
  if !param.filter.include?(":")
    view.search.advanced_search_form.search_exp_editor.fill_count(count: param.filter, key: "=", value: filter_value_updated)
  else
    view.search.advanced_search_form.search_exp_editor.fill_field(field: param.filter, key: "=", value: filter_value_updated)
  end
  view.search.advanced_search_form.save_filter_button.click()
  view.search.advanced_search_form.save_filter_button.click()
  view.search.close_advanced_search()
  _select_filter(filters, filter_name, param)
  view.search.open_advanced_search()
  exp_text = view.search.advanced_search_form.search_exp_editor.expression_text
  raise "Filter wasn't changed!" unless exp_text.include?(filter_value_updated)
  view.search.delete_filter()
  view.search.close_advanced_search()
  if is_bool(param.my_filters)
    if is_bool(filters.is_displayed)
      if is_bool(param.my_filters.is_a? Array)
        raise "Filter wasn't deleted!" unless !filters.tree.has_path(param.my_filters[1], "My Filters", filter_name)
      else
        raise "Filter wasn't deleted!" unless !filters.tree.has_path("My Filters", filter_name)
      end
    end
  else
    if is_bool(view.my_filters.is_displayed)
      raise "Filter wasn't deleted!" unless !view.my_filters.navigation.has_item(filter_name)
    end
  end
end
_tests = [_can_open_advanced_search, _filter_crud]
def methodized(metafunc)
  # Transform function to method by adding self argument
  # 
  #   works just for specific functions in this file, would be nice to generalize
  #   TODO generalize for more tests with possibly different arguments
  #   
  func = lambda do |self, param, appliance|
    return metafunc(param, appliance)
  end
  func.__doc__ = metafunc.__doc__
  return func
end
def inject_tests(metaclass)
  # Attach tests to decorated class
  # 
  #   uses _tests - list of test functions
  #   
  for test in _tests
    method = methodized(test)
    setattr(metaclass, , method)
  end
  return metaclass
end
def base_pytestmarks(param_values, setup_prov: false)
  return ([test_requirements.filtering, pytest.mark.parametrize("param", param_values, ids: param_values.map{|param| ("{}-{}").format(param.entity, param.destination.downcase())}, scope: "class")]) + is_bool(setup_prov) ? [pytest.mark.usefixtures("setup_provider")] : []
end
class TestCloud
  @@params_values = [SearchParam("cloud_providers", "All", "cloudprovider", "Cloud Provider : Name", nil), SearchParam("cloud_av_zones", "All", "availabilityzone", "Availability Zone : Name", nil), SearchParam("cloud_host_aggregates", "All", "hostaggregate", "Host Aggregate : Name", nil), SearchParam("cloud_tenants", "All", "tenant", "Cloud Tenant : Name", nil), SearchParam("cloud_flavors", "All", "flavor", "Flavor : Name", nil), SearchParam("cloud_instances", "All", "instances", "Instance : Name", ["sidebar.instances", "All Instances"]), SearchParam("cloud_images", "All", "images", "Image : Name", ["sidebar.images", "All Images"]), SearchParam("cloud_stacks", "All", "orchestration_stacks", "Orchestration Stack : Name", nil), SearchParam("cloud_keypairs", "All", "key_pairs", "Key Pair : Name", nil)]
  @@pytestmark = base_pytestmarks(params_values, setup_prov: true)
  def self.params_values; @@params_values; end
  def self.params_values=(val); @@params_values=val; end
  def params_values; @params_values = @@params_values if @params_values.nil?; @params_values; end
  def params_values=(val); @params_values=val; end
  def self.pytestmark; @@pytestmark; end
  def self.pytestmark=(val); @@pytestmark=val; end
  def pytestmark; @pytestmark = @@pytestmark if @pytestmark.nil?; @pytestmark; end
  def pytestmark=(val); @pytestmark=val; end
end
class TestNetwork
  @@params_values = [SearchParam("network_providers", "All", "network_managers", "Network Manager : Name", nil), SearchParam("network_providers", "All", "network_managers", "Network Manager : Name", nil), SearchParam("cloud_networks", "All", "network_networks", "Cloud Network : Name", nil), SearchParam("network_subnets", "All", "network_subnets", "Cloud Subnet : Name", nil), SearchParam("network_routers", "All", "network_routers", "Network Router : Name", nil), SearchParam("network_security_groups", "All", "network_security_groups", "Security Group : Name", nil), SearchParam("network_floating_ips", "All", "network_floating_ips", "Floating IP : Address", nil), SearchParam("network_ports", "All", "network_ports", "Network Port : Name", nil), SearchParam("balancers", "All", "network_load_balancers", "Load Balancer : Name", nil)]
  @@pytestmark = base_pytestmarks(params_values, setup_prov: true)
  def self.params_values; @@params_values; end
  def self.params_values=(val); @@params_values=val; end
  def params_values; @params_values = @@params_values if @params_values.nil?; @params_values; end
  def params_values=(val); @params_values=val; end
  def self.pytestmark; @@pytestmark; end
  def self.pytestmark=(val); @@pytestmark=val; end
  def pytestmark; @pytestmark = @@pytestmark if @pytestmark.nil?; @pytestmark; end
  def pytestmark=(val); @pytestmark=val; end
end
class TestInfra
  @@params_values = [SearchParam("infra_providers", "All", "infraproviders", "Infrastructure Provider : Name", nil), SearchParam("clusters", "All", "clusters", "Cluster / Deployment Role : Name", nil), SearchParam("hosts", "All", "hosts", "Host / Node : Name", nil), SearchParam("hosts", "All", "hosts", "Host / Node.VMs", nil), SearchParam("infra_vms", "VMsOnly", "vms", "Virtual Machine : Name", ["sidebar.vms", "All VMs"]), SearchParam("infra_templates", "TemplatesOnly", "templates", "Template : Name", ["sidebar.templates", "All Templates"]), SearchParam("resource_pools", "All", "resource_pools", "Resource Pool : Name", nil), SearchParam("datastores", "All", "datastores", "Datastore : Name", ["sidebar.datastores", "All Datastores"]), SearchParam(VmsInstances, "All", "workloads_vms", "VM and Instance : Name", ["vms", "All VMs & Instances"]), SearchParam(TemplatesImages, "All", "workloads_templates", "VM Template and Image : Name", ["templates", "All Templates & Images"])]
  @@pytestmark = base_pytestmarks(params_values, setup_prov: true)
  def self.params_values; @@params_values; end
  def self.params_values=(val); @@params_values=val; end
  def params_values; @params_values = @@params_values if @params_values.nil?; @params_values; end
  def params_values=(val); @params_values=val; end
  def self.pytestmark; @@pytestmark; end
  def self.pytestmark=(val); @@pytestmark=val; end
  def pytestmark; @pytestmark = @@pytestmark if @pytestmark.nil?; @pytestmark; end
  def pytestmark=(val); @pytestmark=val; end
end
class TestPhysical
  @@params_values = [SearchParam("physical_providers", "All", "physical_providers", "Physical Infrastructure Provider : Name", nil), SearchParam("physical_servers", "All", "physical_servers", "Physical Server : Name", nil)]
  @@pytestmark = base_pytestmarks(params_values, setup_prov: true)
  def self.params_values; @@params_values; end
  def self.params_values=(val); @@params_values=val; end
  def params_values; @params_values = @@params_values if @params_values.nil?; @params_values; end
  def params_values=(val); @params_values=val; end
  def self.pytestmark; @@pytestmark; end
  def self.pytestmark=(val); @@pytestmark=val; end
  def pytestmark; @pytestmark = @@pytestmark if @pytestmark.nil?; @pytestmark; end
  def pytestmark=(val); @pytestmark=val; end
end
class TestContainers
  @@params_values = [SearchParam("containers_providers", "All", "container_providers", "Containers Provider : Name", nil), SearchParam("container_projects", "All", "container_projects", "Container Project : Name", nil), SearchParam("container_routes", "All", "container_routes", "Container Route : Name", nil), SearchParam("container_services", "All", "container_services", "Container Service : Name", nil), SearchParam("container_replicators", "All", "container_replicators", "Container Replicator : Name", nil), SearchParam("container_pods", "All", "container_pods", "Container Pod : Name", nil), SearchParam("containers", "All", "containers", "Container : Name", nil), SearchParam("container_nodes", "All", "container_nodes", "Container Node : Name", nil), SearchParam("container_volumes", "All", "container_volumes", "Persistent Volume : Name", nil), SearchParam("container_builds", "All", "container_builds", "Container Build : Name", nil), SearchParam("container_image_registries", "All", "image_registries", "Container Image Registry : Name", nil), SearchParam("container_images", "All", "container_images", "Container Image : Name", nil), SearchParam("container_templates", "All", "container_templates", "Container Template : Name", nil)]
  @@pytestmark = base_pytestmarks(params_values, setup_prov: true)
  def self.params_values; @@params_values; end
  def self.params_values=(val); @@params_values=val; end
  def params_values; @params_values = @@params_values if @params_values.nil?; @params_values; end
  def params_values=(val); @params_values=val; end
  def self.pytestmark; @@pytestmark; end
  def self.pytestmark=(val); @@pytestmark=val; end
  def pytestmark; @pytestmark = @@pytestmark if @pytestmark.nil?; @pytestmark; end
  def pytestmark=(val); @pytestmark=val; end
end
class TestStorage
  @@params_values = [SearchParam("volumes", "All", "block_store_volumes", "Cloud Volume : Name", nil), SearchParam("volume_snapshots", "All", "block_store_snapshots", "Cloud Volume Snapshot : Name", nil), SearchParam("volume_backups", "All", "block_store_backups", "Cloud Volume Backup : Name", nil), SearchParam("object_store_containers", "All", "object_store_containers", "Cloud Object Store Container : Name", nil), SearchParam("object_store_objects", "All", "object_store_objects", "Cloud Object Store Object : Name", nil)]
  @@pytestmark = base_pytestmarks(params_values)
  def self.params_values; @@params_values; end
  def self.params_values=(val); @@params_values=val; end
  def params_values; @params_values = @@params_values if @params_values.nil?; @params_values; end
  def params_values=(val); @params_values=val; end
  def self.pytestmark; @@pytestmark; end
  def self.pytestmark=(val); @@pytestmark=val; end
  def pytestmark; @pytestmark = @@pytestmark if @pytestmark.nil?; @pytestmark; end
  def pytestmark=(val); @pytestmark=val; end
end
class TestConfigManagement
  @@params_values = [SearchParam("satellite_systems", "All", "configuration_management_systems", "Configured System (Red Hat Satellite) : Hostname", ["sidebar.configured_systems", "All Configured Systems"]), SearchParam("ansible_tower_systems", "All", "ansible_tower_explorer_system", "Configured System (Ansible Tower) : Hostname", ["sidebar.configured_systems", "All Ansible Tower Configured Systems"]), SearchParam("ansible_tower_jobs", "All", "ansible_tower_jobs", "Ansible Tower Job : Name", nil)]
  @@pytestmark = base_pytestmarks(params_values)
  def self.params_values; @@params_values; end
  def self.params_values=(val); @@params_values=val; end
  def params_values; @params_values = @@params_values if @params_values.nil?; @params_values; end
  def params_values=(val); @params_values=val; end
  def self.pytestmark; @@pytestmark; end
  def self.pytestmark=(val); @@pytestmark=val; end
  def pytestmark; @pytestmark = @@pytestmark if @pytestmark.nil?; @pytestmark; end
  def pytestmark=(val); @pytestmark=val; end
end
class TestServices
  @@params_values = [SearchParam(MyService, "All", "myservices", "Service : Name", "myservice")]
  @@pytestmark = base_pytestmarks(params_values)
  def self.params_values; @@params_values; end
  def self.params_values=(val); @@params_values=val; end
  def params_values; @params_values = @@params_values if @params_values.nil?; @params_values; end
  def params_values=(val); @params_values=val; end
  def self.pytestmark; @@pytestmark; end
  def self.pytestmark=(val); @@pytestmark=val; end
  def pytestmark; @pytestmark = @@pytestmark if @pytestmark.nil?; @pytestmark; end
  def pytestmark=(val); @pytestmark=val; end
end
