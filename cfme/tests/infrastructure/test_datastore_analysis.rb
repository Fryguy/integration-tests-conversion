require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.smartstate]
DATASTORE_TYPES = ["vmfs", "nfs", "iscsi"]
CONTENT_ROWS_TO_CHECK = ["All Files", "VM Provisioned Disk Files", "VM Snapshot Files", "VM Memory Files", "Other VM Files", "Non-VM Files"]
def pytest_generate_tests(metafunc)
  argnames,argvalues,idlist = testgen.providers_by_class(metafunc, [RHEVMProvider, VMwareProvider], required_fields: ["datastores"])
  argnames.push("datastore_type")
  argnames.push("datastore_name")
  new_idlist = []
  new_argvalues = []
  for (index, argvalue_tuple) in enumerate(argvalues)
    args = {zip_p(argnames, argvalue_tuple).to_a}
    provider_arg = args["provider"]
    datastores = provider_arg.data.get("datastores", {})
    testable_datastores = datastores.select{|ds| ds.get("test_fleece", false) && DATASTORE_TYPES.include?(ds.get("type"))}.map{|ds| [ds.get("type"), ds.get("name")]}
    __dummy0__ = false
    for (ds_type, ds_name) in testable_datastores
      new_argvalues.push([provider_arg, ds_type, ds_name])
      new_idlist.push()
      if (ds_type, ds_name) == testable_datastores[-1]
        __dummy0__ = true
      end
    end
    if __dummy0__
      logger.warning()
    end
  end
  testgen.parametrize(metafunc, argnames, new_argvalues, ids: new_idlist, scope: "module")
end
def datastore(appliance, provider, datastore_type, datastore_name)
  return appliance.collections.datastores.instantiate(name: datastore_name, provider: provider, type: datastore_type)
end
def datastores_hosts_setup(provider, datastore)
  hosts = datastore.hosts.all()
  __dummy1__ = false
  for host in hosts
    host_data = provider.data.get("hosts", {}).select{|data| data.get("name") == host.name}.map{|data| data}
    if is_bool(!host_data)
      pytest.skip()
    end
    host.update_credentials_rest(credentials: host_data[0]["credentials"])
    if host == hosts[-1]
      __dummy1__ = true
    end
  end
  if __dummy1__
    pytest.skip()
  end
  yield
  for host in hosts
    host.remove_credentials_rest()
  end
end
def clear_all_tasks(appliance)
  col = appliance.collections.tasks.filter({"tab" => "AllTasks"})
  col.delete_all()
end
def test_run_datastore_analysis(setup_provider, datastore, soft_assert, datastores_hosts_setup, clear_all_tasks, appliance)
  # Tests smarthost analysis
  # 
  #   Metadata:
  #       test_flag: datastore_analysis
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: critical
  #       initialEstimate: 1/3h
  #   
  begin
    datastore.run_smartstate_analysis(wait_for_task_result: true)
  rescue [MenuItemNotFound, DropdownDisabled]
    pytest.skip()
  end
  details_view = navigate_to(datastore, "DetailsFromProvider")
  wait_for(lambda{|| details_view.entities.content.get_text_of(CONTENT_ROWS_TO_CHECK[0])}, delay: 15, timeout: "3m", fail_condition: "0", fail_func: appliance.server.browser.refresh)
  managed_vms = details_view.entities.relationships.get_text_of("Managed VMs")
  if managed_vms != "0"
    for row_name in CONTENT_ROWS_TO_CHECK
      value = details_view.entities.content.get_text_of(row_name)
      soft_assert.(value != "0", )
    end
  else
    raise unless details_view.entities.content.get_text_of(CONTENT_ROWS_TO_CHECK[-1]) != "0"
  end
end
