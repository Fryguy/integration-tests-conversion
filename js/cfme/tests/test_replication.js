require_relative("wait_for");
include(Wait_for);
require_relative("widgetastic/exceptions");
include(Widgetastic.Exceptions);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/configure/configuration/region_settings");
include(Cfme.Configure.Configuration.Region_settings);
require_relative("cfme/fixtures/cli");
include(Cfme.Fixtures.Cli);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);

let pytestmark = [
  test_requirements.replication,
  pytest.mark.long_running
];

function create_vm(provider, vm_name) {
  let collection = provider.appliance.provider_based_collection(provider);

  try {
    let template_name = provider.data.templates.full_template.name
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip(`Unable to identify full_template for provider: ${provider}`)
    } else {
      throw $EXCEPTION
    }
  };

  let vm = collection.instantiate(vm_name, provider, {template_name});
  vm.create_on_provider({find_in_cfme: true, allow_skip: "default"});
  return vm
};

function are_dicts_same(dict1, dict2) {
  logger.info(`Comparing two dictionaries\n dict1:${dict1}\n dict2:${dict2}`);
  if (new Set(dict1) != new Set(dict2)) return false;

  for (let key in dict1.keys()) {
    if (new Set(dict1[key]) != new Set(dict2[key])) return false
  };

  return true
};

function setup_replication(configured_appliance, unconfigured_appliance) {
  // Configure global_app database with region number 99 and subscribe to remote_app.
  let [remote_app, global_app] = [
    configured_appliance,
    unconfigured_appliance
  ];

  let app_params = {};
  global_app.appliance_console_cli.configure_appliance_internal_fetch_key({None: app_params});
  global_app.evmserverd.wait_for_running();
  global_app.wait_for_web_ui();
  remote_app.set_pglogical_replication({replication_type: ":remote"});
  global_app.set_pglogical_replication({replication_type: ":global"});
  global_app.add_pglogical_replication_subscription(remote_app.hostname);
  return [configured_appliance, unconfigured_appliance]
};

function test_replication_powertoggle(request, provider, setup_replication, small_template) {
  // 
  //   power toggle from global to remote
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Replication
  //       caseimportance: critical
  //       initialEstimate: 1/12h
  //       testSteps:
  //           1. Have a VM created in the provider in the Remote region
  //              subscribed to Global.
  //           2. Turn the VM off using the Global appliance.
  //           3. Turn the VM on using the Global appliance.
  //       expectedResults:
  //           1.
  //           2. VM state changes to off in the Remote and Global appliance.
  //           3. VM state changes to on in the Remote and Global appliance.
  //   
  let instance_name = fauxfactory.gen_alphanumeric({
    start: "test_replication_",
    length: 25
  }).downcase();

  let [remote_app, global_app] = setup_replication;
  provider_app_crud(OpenStackProvider, remote_app).setup();
  provider.appliance = remote_app;

  let remote_instance = remote_app.collections.cloud_instances.instantiate(
    instance_name,
    provider,
    small_template.name
  );

  let global_instance = global_app.collections.cloud_instances.instantiate(
    instance_name,
    provider
  );

  remote_instance.create_on_provider({find_in_cfme: true});
  request.addfinalizer(remote_instance.cleanup_on_provider);
  remote_instance.wait_for_instance_state_change({desired_state: remote_instance.STATE_ON});
  global_instance.power_control_from_cfme({option: global_instance.STOP});

  if (!global_instance.wait_for_instance_state_change({desired_state: global_instance.STATE_OFF}).out) {
    throw new ()
  };

  if (!remote_instance.wait_for_instance_state_change({desired_state: remote_instance.STATE_OFF}).out) {
    throw new ()
  };

  global_instance.power_control_from_cfme({option: global_instance.START});

  if (!global_instance.wait_for_instance_state_change({desired_state: global_instance.STATE_ON}).out) {
    throw new ()
  };

  if (!remote_instance.wait_for_instance_state_change({desired_state: global_instance.STATE_ON}).out) {
    throw new ()
  }
};

function test_replication_appliance_add_single_subscription(setup_replication) {
  // 
  // 
  //   Add one remote subscription to global region
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Replication
  //       caseimportance: critical
  //       initialEstimate: 1/12h
  //       startsin: 5.7
  //       testSteps:
  //           1. Configure first appliance as Global.
  //           2. Configure second appliance as Remote, subscribed to Global.
  //       expectedResults:
  //           1.
  //           2. No error. Appliance subscribed.
  //   
  let [remote_app, global_app] = setup_replication;
  let region = global_app.collections.regions.instantiate();

  if (!region.replication.get_replication_status({host: remote_app.hostname})) {
    throw new ()
  }
};

function test_replication_re_add_deleted_remote(setup_replication) {
  // 
  //   Re-add deleted remote region
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Replication
  //       initialEstimate: 1/12h
  //       testSteps:
  //           1. Have A Remote subscribed to Global.
  //           2. Remove the Remote subscription from Global.
  //           3. Add the Remote to Global again
  //       expectedResults:
  //           1.
  //           2. Subscription is successfully removed.
  //           3. No error. Appliance subscribed.
  //   
  let [remote_app, global_app] = setup_replication;
  let region = global_app.collections.regions.instantiate();
  region.replication.remove_global_appliance({host: remote_app.hostname});

  pytest.raises(
    RowNotFound,
    () => region.replication.get_replication_status({host: remote_app.hostname})
  );

  global_app.set_pglogical_replication({replication_type: ":global"});
  global_app.add_pglogical_replication_subscription(remote_app.hostname);
  let view = region.replication.create_view(ReplicationGlobalView);
  view.browser.refresh();

  if (!region.replication.get_replication_status({host: remote_app.hostname})) {
    throw new ()
  }
};

function test_replication_delete_remote_from_global(setup_replication) {
  // 
  //   Delete remote subscription from global region
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Replication
  //       caseimportance: critical
  //       initialEstimate: 1/5h
  //       testSteps:
  //           1. Have A Remote subscribed to Global.
  //           2. Remove the Remote subscription from Global.
  //       expectedResults:
  //           1.
  //           2. No error. Appliance unsubscribed.
  //   
  let [remote_app, global_app] = setup_replication;
  let region = global_app.collections.regions.instantiate();
  region.replication.remove_global_appliance({host: remote_app.hostname});

  pytest.raises(
    RowNotFound,
    () => region.replication.get_replication_status({host: remote_app.hostname})
  )
};

function test_replication_remote_to_global_by_ip_pglogical(setup_replication) {
  // 
  //   Test replication from remote region to global using any data type
  //   (provider,event,etc)
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Replication
  //       caseimportance: critical
  //       initialEstimate: 1/4h
  //       startsin: 5.6
  //       testSteps:
  //           1. Have A Remote subscribed to Global.
  //           2. Create a provider in remote region.
  //           3. Check the provider appeared in the Global.
  //       expectedResults:
  //           1.
  //           2.
  //           3. Provider appeared in the Global.
  //   
  let [remote_app, global_app] = setup_replication;
  let provider = provider_app_crud(OpenStackProvider, remote_app);
  provider.setup();

  if (!global_app.managed_provider_names.include(provider.name)) {
    throw "Provider name not found"
  }
};

function test_replication_appliance_set_type_global_ui(configured_appliance, unconfigured_appliance) {
  // 
  //   Set appliance replication type to \"Global\" and add subscription in the
  //   UI
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Replication
  //       caseimportance: critical
  //       initialEstimate: 1/6h
  //       testtype: functional
  //       testSteps:
  //           1. Have two appliances with same v2 keys and different regions
  //           2. Set one as Global and the other as Remote and add subscribe the
  //              Remote to the Global
  //       expectedResults:
  //           1.
  //           2. No error, appliance subscribed.
  //   
  let [remote_app, global_app] = [
    configured_appliance,
    unconfigured_appliance
  ];

  let app_params = {};
  global_app.appliance_console_cli.configure_appliance_internal_fetch_key({None: app_params});
  global_app.evmserverd.wait_for_running();
  global_app.wait_for_web_ui();
  let remote_region = remote_app.collections.regions.instantiate();
  remote_region.replication.set_replication({replication_type: "remote"});
  let global_region = global_app.collections.regions.instantiate({number: 99});

  global_region.replication.set_replication({
    replication_type: "global",
    updates: {host: remote_app.hostname},
    validate: true
  });

  if (!global_region.replication.get_replication_status({host: remote_app.hostname})) {
    throw "Replication is not started."
  }
};

function test_replication_appliance_add_multi_subscription(request, setup_multi_region_cluster, multi_region_cluster, temp_appliances_unconfig_modscope_rhevm) {
  // 
  //   add two or more subscriptions to global
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Replication
  //       initialEstimate: 1/4h
  //       startsin: 5.7
  //       testSteps:
  //           1. Have three appliances with same v2 keys and different regions
  //           2. Set one as Global and the other two as Remote and add subscribe
  //              the Remotes to the Global
  //       expectedResults:
  //           1.
  //           2. appliances subscribed.
  //   
  let region = multi_region_cluster.global_appliance.collections.regions.instantiate();
  navigate_to(region.replication, "Global");

  for (let host in multi_region_cluster.remote_appliances) {
    if (!region.replication.get_replication_status({host: host.hostname})) {
      throw `${host.hostname} Remote Appliance is not found in Global Appliance's list`
    }
  }
};

function test_replication_global_region_dashboard(request, setup_replication) {
  // 
  //   Global dashboard show remote data
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Replication
  //       initialEstimate: 1/4h
  //       testSteps:
  //           1. Have a VM created in the provider in the Remote region which is
  //              subscribed to Global.
  //           2. Check the dashboard on the Global shows data from the Remote region.
  //       expectedResults:
  //           1.
  //           2. Dashboard on the Global displays data from the Remote region
  //   
  let [remote_app, global_app] = setup_replication;
  let remote_provider = provider_app_crud(InfraProvider, remote_app);
  remote_provider.setup();

  if (!remote_app.managed_provider_names.include(remote_provider.name)) {
    throw "Provider is not available."
  };

  let new_vm_name = fauxfactory.gen_alphanumeric({
    start: "test_rep_dashboard",
    length: 25
  }).downcase();

  let vm = create_vm({provider: remote_provider, vm_name: new_vm_name});
  request.addfinalizer(vm.cleanup_on_provider);

  let data_items = [
    "EVM: Recently Discovered Hosts",
    "EVM: Recently Discovered VMs",
    "Top Storage Consumers"
  ];

  let [remote_app_data, global_app_data] = [{}, {}];

  let get_tabel_data = (widget) => {
    let ret = widget.contents.map(row => row.name.text);
    logger.info("Widget text data:{%s}" % ret);
    return ret
  };

  let data_check = (view, table) => (
    bool(get_tabel_data.call(view.dashboards("Default Dashboard").widgets(table)))
  );

  let view = navigate_to(remote_app.server, "Dashboard");

  for (let table_name in data_items) {
    logger.info("Table name:{%s}" % table_name);

    Wait_for.wait_for(method("data_check"), {
      func_args: [view, table_name],
      delay: 20,
      num_sec: 600,
      fail_func: view.dashboards("Default Dashboard").browser.refresh,
      message: `Waiting for table data item: ${table_name} `
    });

    remote_app_data[table_name] = get_tabel_data.call(view.dashboards("Default Dashboard").widgets(table_name))
  };

  view = navigate_to(global_app.server, "Dashboard");

  for (let table_name in data_items) {
    logger.info("Table name:{%s}" % table_name);

    Wait_for.wait_for(method("data_check"), {
      func_args: [view, table_name],
      delay: 20,
      num_sec: 600,
      fail_func: view.dashboards("Default Dashboard").browser.refresh,
      message: `Waiting for table data item: ${table_name}`
    });

    global_app_data[table_name] = get_tabel_data.call(view.dashboards("Default Dashboard").widgets(table_name))
  };

  if (!are_dicts_same(remote_app_data, global_app_data)) {
    throw "Dashboard is not same of both app."
  }
};

function test_replication_global_to_remote_new_vm_from_template(request, setup_replication) {
  // 
  //   Create a new VM from template in remote region from global region
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Replication
  //       caseimportance: critical
  //       initialEstimate: 1/6h
  //       testSteps:
  //           1. Configure first appliance as Global.
  //           2. Configure second appliance as Remote, subscribed to Global.
  //           3. Create a VM from template in Remote region using the Global appliance.
  //       expectedResults:
  //           1.
  //           2.
  //           3. VM created in the Remote, no errors.
  //   
  let [remote_app, global_app] = setup_replication;
  let remote_provider = provider_app_crud(RHEVMProvider, remote_app);
  remote_provider.setup();

  if (!remote_app.managed_provider_names.include(remote_provider.name)) {
    throw "Provider is not available."
  };

  let new_vm_name = fauxfactory.gen_alphanumeric({
    start: "test_replication_",
    length: 25
  }).downcase();

  let global_provider = provider_app_crud(RHEVMProvider, global_app);
  let vm = create_vm({provider: global_provider, vm_name: new_vm_name});
  request.addfinalizer(vm.cleanup_on_provider);
  remote_provider.refresh_provider_relationships();

  if (!remote_app.collections.infra_vms.instantiate(
    new_vm_name,
    remote_provider
  ).exists) throw `${new_vm_name} vm is not found in Remote Appliance`
};

function test_replication_subscription_revalidation_pglogical(configured_appliance, unconfigured_appliance) {
  // 
  //   Subscription validation passes for replication subscriptions which
  //   have been validated and successfully saved.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Replication
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //       testSteps:
  //           1. Attempt to validate the subscription
  //       expectedResults:
  //           1. Validation succeeds as this subscription was successfully
  //              saved and is currently replicating
  //   
  let [remote_app, global_app] = [
    configured_appliance,
    unconfigured_appliance
  ];

  let app_params = {};
  global_app.appliance_console_cli.configure_appliance_internal_fetch_key({None: app_params});
  global_app.evmserverd.wait_for_running();
  global_app.wait_for_web_ui();
  remote_app.set_pglogical_replication({replication_type: ":remote"});
  let region = global_app.collections.regions.instantiate({number: 99});

  region.replication.set_replication({
    replication_type: "global",
    updates: {host: remote_app.hostname},
    validate: true
  })
}
