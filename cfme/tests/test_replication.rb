require_relative 'wait_for'
include Wait_for
require_relative 'widgetastic/exceptions'
include Widgetastic::Exceptions
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/configure/configuration/region_settings'
include Cfme::Configure::Configuration::Region_settings
require_relative 'cfme/fixtures/cli'
include Cfme::Fixtures::Cli
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [test_requirements.replication, pytest.mark.long_running]
def create_vm(provider, vm_name)
  collection = provider.appliance.provider_based_collection(provider)
  begin
    template_name = provider.data["templates"]["full_template"]["name"]
  rescue KeyError
    pytest.skip("Unable to identify full_template for provider: #{provider}")
  end
  vm = collection.instantiate(vm_name, provider, template_name: template_name)
  vm.create_on_provider(find_in_cfme: true, allow_skip: "default")
  return vm
end
def are_dicts_same(dict1, dict2)
  logger.info("Comparing two dictionaries
 dict1:#{dict1}
 dict2:#{dict2}")
  if Set.new(dict1) != Set.new(dict2)
    return false
  end
  for key in dict1.keys()
    if Set.new(dict1[key]) != Set.new(dict2[key])
      return false
    end
  end
  return true
end
def setup_replication(configured_appliance, unconfigured_appliance)
  # Configure global_app database with region number 99 and subscribe to remote_app.
  remote_app,global_app = [configured_appliance, unconfigured_appliance]
  app_params = {}
  global_app.appliance_console_cli.configure_appliance_internal_fetch_key(None: app_params)
  global_app.evmserverd.wait_for_running()
  global_app.wait_for_web_ui()
  remote_app.set_pglogical_replication(replication_type: ":remote")
  global_app.set_pglogical_replication(replication_type: ":global")
  global_app.add_pglogical_replication_subscription(remote_app.hostname)
  return [configured_appliance, unconfigured_appliance]
end
def test_replication_powertoggle(request, provider, setup_replication, small_template)
  # 
  #   power toggle from global to remote
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Replication
  #       caseimportance: critical
  #       initialEstimate: 1/12h
  #       testSteps:
  #           1. Have a VM created in the provider in the Remote region
  #              subscribed to Global.
  #           2. Turn the VM off using the Global appliance.
  #           3. Turn the VM on using the Global appliance.
  #       expectedResults:
  #           1.
  #           2. VM state changes to off in the Remote and Global appliance.
  #           3. VM state changes to on in the Remote and Global appliance.
  #   
  instance_name = fauxfactory.gen_alphanumeric(start: "test_replication_", length: 25).downcase()
  remote_app,global_app = setup_replication
  provider_app_crud(OpenStackProvider, remote_app).setup()
  provider.appliance = remote_app
  remote_instance = remote_app.collections.cloud_instances.instantiate(instance_name, provider, small_template.name)
  global_instance = global_app.collections.cloud_instances.instantiate(instance_name, provider)
  remote_instance.create_on_provider(find_in_cfme: true)
  request.addfinalizer(remote_instance.cleanup_on_provider)
  remote_instance.wait_for_instance_state_change(desired_state: remote_instance.STATE_ON)
  global_instance.power_control_from_cfme(option: global_instance.STOP)
  raise unless global_instance.wait_for_instance_state_change(desired_state: global_instance.STATE_OFF).out
  raise unless remote_instance.wait_for_instance_state_change(desired_state: remote_instance.STATE_OFF).out
  global_instance.power_control_from_cfme(option: global_instance.START)
  raise unless global_instance.wait_for_instance_state_change(desired_state: global_instance.STATE_ON).out
  raise unless remote_instance.wait_for_instance_state_change(desired_state: global_instance.STATE_ON).out
end
def test_replication_appliance_add_single_subscription(setup_replication)
  # 
  # 
  #   Add one remote subscription to global region
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Replication
  #       caseimportance: critical
  #       initialEstimate: 1/12h
  #       startsin: 5.7
  #       testSteps:
  #           1. Configure first appliance as Global.
  #           2. Configure second appliance as Remote, subscribed to Global.
  #       expectedResults:
  #           1.
  #           2. No error. Appliance subscribed.
  #   
  remote_app,global_app = setup_replication
  region = global_app.collections.regions.instantiate()
  raise unless region.replication.get_replication_status(host: remote_app.hostname)
end
def test_replication_re_add_deleted_remote(setup_replication)
  # 
  #   Re-add deleted remote region
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Replication
  #       initialEstimate: 1/12h
  #       testSteps:
  #           1. Have A Remote subscribed to Global.
  #           2. Remove the Remote subscription from Global.
  #           3. Add the Remote to Global again
  #       expectedResults:
  #           1.
  #           2. Subscription is successfully removed.
  #           3. No error. Appliance subscribed.
  #   
  remote_app,global_app = setup_replication
  region = global_app.collections.regions.instantiate()
  region.replication.remove_global_appliance(host: remote_app.hostname)
  pytest.raises(RowNotFound) {
    region.replication.get_replication_status(host: remote_app.hostname)
  }
  global_app.set_pglogical_replication(replication_type: ":global")
  global_app.add_pglogical_replication_subscription(remote_app.hostname)
  view = region.replication.create_view(ReplicationGlobalView)
  view.browser.refresh()
  raise unless region.replication.get_replication_status(host: remote_app.hostname)
end
def test_replication_delete_remote_from_global(setup_replication)
  # 
  #   Delete remote subscription from global region
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Replication
  #       caseimportance: critical
  #       initialEstimate: 1/5h
  #       testSteps:
  #           1. Have A Remote subscribed to Global.
  #           2. Remove the Remote subscription from Global.
  #       expectedResults:
  #           1.
  #           2. No error. Appliance unsubscribed.
  #   
  remote_app,global_app = setup_replication
  region = global_app.collections.regions.instantiate()
  region.replication.remove_global_appliance(host: remote_app.hostname)
  pytest.raises(RowNotFound) {
    region.replication.get_replication_status(host: remote_app.hostname)
  }
end
def test_replication_remote_to_global_by_ip_pglogical(setup_replication)
  # 
  #   Test replication from remote region to global using any data type
  #   (provider,event,etc)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Replication
  #       caseimportance: critical
  #       initialEstimate: 1/4h
  #       startsin: 5.6
  #       testSteps:
  #           1. Have A Remote subscribed to Global.
  #           2. Create a provider in remote region.
  #           3. Check the provider appeared in the Global.
  #       expectedResults:
  #           1.
  #           2.
  #           3. Provider appeared in the Global.
  #   
  remote_app,global_app = setup_replication
  provider = provider_app_crud(OpenStackProvider, remote_app)
  provider.setup()
  raise "Provider name not found" unless global_app.managed_provider_names.include?(provider.name)
end
def test_replication_appliance_set_type_global_ui(configured_appliance, unconfigured_appliance)
  # 
  #   Set appliance replication type to \"Global\" and add subscription in the
  #   UI
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Replication
  #       caseimportance: critical
  #       initialEstimate: 1/6h
  #       testtype: functional
  #       testSteps:
  #           1. Have two appliances with same v2 keys and different regions
  #           2. Set one as Global and the other as Remote and add subscribe the
  #              Remote to the Global
  #       expectedResults:
  #           1.
  #           2. No error, appliance subscribed.
  #   
  remote_app,global_app = [configured_appliance, unconfigured_appliance]
  app_params = {}
  global_app.appliance_console_cli.configure_appliance_internal_fetch_key(None: app_params)
  global_app.evmserverd.wait_for_running()
  global_app.wait_for_web_ui()
  remote_region = remote_app.collections.regions.instantiate()
  remote_region.replication.set_replication(replication_type: "remote")
  global_region = global_app.collections.regions.instantiate(number: 99)
  global_region.replication.set_replication(replication_type: "global", updates: {"host" => remote_app.hostname}, validate: true)
  raise "Replication is not started." unless global_region.replication.get_replication_status(host: remote_app.hostname)
end
def test_replication_appliance_add_multi_subscription(request, setup_multi_region_cluster, multi_region_cluster, temp_appliances_unconfig_modscope_rhevm)
  # 
  #   add two or more subscriptions to global
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Replication
  #       initialEstimate: 1/4h
  #       startsin: 5.7
  #       testSteps:
  #           1. Have three appliances with same v2 keys and different regions
  #           2. Set one as Global and the other two as Remote and add subscribe
  #              the Remotes to the Global
  #       expectedResults:
  #           1.
  #           2. appliances subscribed.
  #   
  region = multi_region_cluster.global_appliance.collections.regions.instantiate()
  navigate_to(region.replication, "Global")
  for host in multi_region_cluster.remote_appliances
    raise "#{host.hostname} Remote Appliance is not found in Global Appliance's list" unless region.replication.get_replication_status(host: host.hostname)
  end
end
def test_replication_global_region_dashboard(request, setup_replication)
  # 
  #   Global dashboard show remote data
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Replication
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Have a VM created in the provider in the Remote region which is
  #              subscribed to Global.
  #           2. Check the dashboard on the Global shows data from the Remote region.
  #       expectedResults:
  #           1.
  #           2. Dashboard on the Global displays data from the Remote region
  #   
  remote_app,global_app = setup_replication
  remote_provider = provider_app_crud(InfraProvider, remote_app)
  remote_provider.setup()
  raise "Provider is not available." unless remote_app.managed_provider_names.include?(remote_provider.name)
  new_vm_name = fauxfactory.gen_alphanumeric(start: "test_rep_dashboard", length: 25).downcase()
  vm = create_vm(provider: remote_provider, vm_name: new_vm_name)
  request.addfinalizer(vm.cleanup_on_provider)
  data_items = ["EVM: Recently Discovered Hosts", "EVM: Recently Discovered VMs", "Top Storage Consumers"]
  remote_app_data,global_app_data = [{}, {}]
  get_tabel_data = lambda do |widget|
    ret = widget.contents.map{|row| row.name.text}
    logger.info("Widget text data:{%s}" % ret)
    return ret
  end
  data_check = lambda do |view, table|
    return bool(get_tabel_data.call(view.dashboards("Default Dashboard").widgets(table)))
  end
  view = navigate_to(remote_app.server, "Dashboard")
  for table_name in data_items
    logger.info("Table name:{%s}" % table_name)
    Wait_for::wait_for(method(:data_check), func_args: [view, table_name], delay: 20, num_sec: 600, fail_func: view.dashboards("Default Dashboard").browser.refresh, message: "Waiting for table data item: #{table_name} ")
    remote_app_data[table_name] = get_tabel_data.call(view.dashboards("Default Dashboard").widgets(table_name))
  end
  view = navigate_to(global_app.server, "Dashboard")
  for table_name in data_items
    logger.info("Table name:{%s}" % table_name)
    Wait_for::wait_for(method(:data_check), func_args: [view, table_name], delay: 20, num_sec: 600, fail_func: view.dashboards("Default Dashboard").browser.refresh, message: "Waiting for table data item: #{table_name}")
    global_app_data[table_name] = get_tabel_data.call(view.dashboards("Default Dashboard").widgets(table_name))
  end
  raise "Dashboard is not same of both app." unless are_dicts_same(remote_app_data, global_app_data)
end
def test_replication_global_to_remote_new_vm_from_template(request, setup_replication)
  # 
  #   Create a new VM from template in remote region from global region
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Replication
  #       caseimportance: critical
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. Configure first appliance as Global.
  #           2. Configure second appliance as Remote, subscribed to Global.
  #           3. Create a VM from template in Remote region using the Global appliance.
  #       expectedResults:
  #           1.
  #           2.
  #           3. VM created in the Remote, no errors.
  #   
  remote_app,global_app = setup_replication
  remote_provider = provider_app_crud(RHEVMProvider, remote_app)
  remote_provider.setup()
  raise "Provider is not available." unless remote_app.managed_provider_names.include?(remote_provider.name)
  new_vm_name = fauxfactory.gen_alphanumeric(start: "test_replication_", length: 25).downcase()
  global_provider = provider_app_crud(RHEVMProvider, global_app)
  vm = create_vm(provider: global_provider, vm_name: new_vm_name)
  request.addfinalizer(vm.cleanup_on_provider)
  remote_provider.refresh_provider_relationships()
  raise "#{new_vm_name} vm is not found in Remote Appliance" unless remote_app.collections.infra_vms.instantiate(new_vm_name, remote_provider).exists
end
def test_replication_subscription_revalidation_pglogical(configured_appliance, unconfigured_appliance)
  # 
  #   Subscription validation passes for replication subscriptions which
  #   have been validated and successfully saved.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Replication
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #       testSteps:
  #           1. Attempt to validate the subscription
  #       expectedResults:
  #           1. Validation succeeds as this subscription was successfully
  #              saved and is currently replicating
  #   
  remote_app,global_app = [configured_appliance, unconfigured_appliance]
  app_params = {}
  global_app.appliance_console_cli.configure_appliance_internal_fetch_key(None: app_params)
  global_app.evmserverd.wait_for_running()
  global_app.wait_for_web_ui()
  remote_app.set_pglogical_replication(replication_type: ":remote")
  region = global_app.collections.regions.instantiate(number: 99)
  region.replication.set_replication(replication_type: "global", updates: {"host" => remote_app.hostname}, validate: true)
end
