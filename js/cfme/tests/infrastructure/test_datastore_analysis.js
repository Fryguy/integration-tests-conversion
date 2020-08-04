require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/exceptions");
include(Cfme.Exceptions);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.smartstate];
const DATASTORE_TYPES = ["vmfs", "nfs", "iscsi"];

const CONTENT_ROWS_TO_CHECK = [
  "All Files",
  "VM Provisioned Disk Files",
  "VM Snapshot Files",
  "VM Memory Files",
  "Other VM Files",
  "Non-VM Files"
];

function pytest_generate_tests(metafunc) {
  let [argnames, argvalues, idlist] = testgen.providers_by_class(
    metafunc,
    [RHEVMProvider, VMwareProvider],
    {required_fields: ["datastores"]}
  );

  argnames.push("datastore_type");
  argnames.push("datastore_name");
  let new_idlist = [];
  let new_argvalues = [];

  for (let [index, argvalue_tuple] in enumerate(argvalues)) {
    let args = Hash(zip_p(argnames, argvalue_tuple).to_a);
    let provider_arg = args.provider;
    let datastores = provider_arg.data.get("datastores", {});

    let testable_datastores = datastores.select(ds => (
      ds.get("test_fleece", false) && DATASTORE_TYPES.include(ds.get("type"))
    )).map(ds => [ds.get("type"), ds.get("name")]);

    let __dummy0__ = false;

    for (let [ds_type, ds_name] in testable_datastores) {
      new_argvalues.push([provider_arg, ds_type, ds_name]);
      new_idlist.push(`${idlist[index]}-${ds_type}`);
      if ([ds_type, ds_name] == testable_datastores[-1]) __dummy0__ = true
    };

    if (__dummy0__) {
      logger.warning(`No testable datastores found for SSA on ${provider_arg}`)
    }
  };

  testgen.parametrize(
    metafunc,
    argnames,
    new_argvalues,
    {ids: new_idlist, scope: "module"}
  )
};

function datastore(appliance, provider, datastore_type, datastore_name) {
  return appliance.collections.datastores.instantiate({
    name: datastore_name,
    provider,
    type: datastore_type
  })
};

function datastores_hosts_setup(provider, datastore) {
  let hosts = datastore.hosts.all();
  let __dummy1__ = false;

  for (let host in hosts) {
    let host_data = provider.data.get("hosts", {}).select(data => (
      data.get("name") == host.name
    )).map(data => data);

    if (is_bool(!host_data)) {
      pytest.skip(`No host data for provider ${provider} and datastore ${datastore}`)
    };

    host.update_credentials_rest({credentials: host_data[0].credentials});
    if (host == hosts[-1]) __dummy1__ = true
  };

  if (__dummy1__) {
    pytest.skip(`No hosts attached to the datastore selected for testing: ${datastore}`)
  };

  yield;

  for (let host in hosts) {
    host.remove_credentials_rest()
  }
};

function clear_all_tasks(appliance) {
  let col = appliance.collections.tasks.filter({tab: "AllTasks"});
  col.delete_all()
};

function test_run_datastore_analysis(setup_provider, datastore, soft_assert, datastores_hosts_setup, clear_all_tasks, appliance) {
  // Tests smarthost analysis
  // 
  //   Metadata:
  //       test_flag: datastore_analysis
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: critical
  //       initialEstimate: 1/3h
  //   
  try {
    datastore.run_smartstate_analysis({wait_for_task_result: true})
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof [MenuItemNotFound, DropdownDisabled]) {
      pytest.skip(`Smart State analysis is disabled for ${datastore.name} datastore`)
    } else {
      throw $EXCEPTION
    }
  };

  let details_view = navigate_to(datastore, "DetailsFromProvider");

  wait_for(
    () => details_view.entities.content.get_text_of(CONTENT_ROWS_TO_CHECK[0]),

    {
      delay: 15,
      timeout: "3m",
      fail_condition: "0",
      fail_func: appliance.server.browser.refresh
    }
  );

  let managed_vms = details_view.entities.relationships.get_text_of("Managed VMs");

  if (managed_vms != "0") {
    for (let row_name in CONTENT_ROWS_TO_CHECK) {
      let value = details_view.entities.content.get_text_of(row_name);

      soft_assert.call(
        value != "0",
        `Expected value for ${row_name} to be non-empty`
      )
    }
  } else if (details_view.entities.content.get_text_of(CONTENT_ROWS_TO_CHECK[-1]) == "0") {
    throw new ()
  }
}
