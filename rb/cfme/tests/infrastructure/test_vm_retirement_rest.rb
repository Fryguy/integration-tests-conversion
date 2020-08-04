require_relative 'manageiq_client/filters'
include Manageiq_client::Filters
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _vm vm
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/version'
include Cfme::Utils::Version
require_relative 'cfme/utils/version'
include Cfme::Utils::Version
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.rest, pytest.mark.provider(classes: [InfraProvider], selector: ONE), pytest.mark.usefixtures("setup_provider")]
def vm(request, provider, appliance)
  return _vm(request, provider, appliance)
end
def retire_vm(appliance, vm, provider)
  retire_vm = appliance.collections.infra_vms.instantiate(vm, provider)
  retire_vm.retire()
  _retire_vm = appliance.rest_api.collections.vms.get(name: vm)
  wait_for(lambda{|| _retire_vm.instance_variable_defined? :@retired && _retire_vm.retired}, timeout: 1000, delay: 5, fail_func: _retire_vm.reload)
  return vm
end
def vm_retirement_report(appliance, retire_vm)
  report_data = {"menu_name" => "vm_retirement_requester", "title" => "VM Retirement Requester", "base_report_on" => "Virtual Machines", "report_fields" => ["Name", "Retirement Requester", "Retirement State"], "filter" => {"primary_filter" => "fill_field(Virtual Machine : Name, =, {})".format(retire_vm)}}
  report = appliance.collections.reports.create(None: report_data)
  yield([retire_vm, report])
  report.delete()
end
def test_retire_vm_now(appliance, vm, from_collection)
  # Test retirement of vm
  # 
  #   Prerequisities:
  # 
  #       * An appliance with ``/api`` available.
  #       * VM
  # 
  #   Steps:
  # 
  #       * POST /api/vms/<id> (method ``retire``)
  #       OR
  #       * POST /api/vms (method ``retire``) with ``href`` of the vm or vms
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Bugzilla:
  #       1805119
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/3h
  #   
  retire_action = VersionPicker({Version.lowest() => "retire", "5.11" => "request_retire"}).pick()
  retire_vm = appliance.rest_api.collections.vms.get(name: vm)
  if is_bool(from_collection)
    appliance.rest_api.collections.vms.action.getattr(retire_action).(retire_vm)
  else
    retire_vm.action.getattr(retire_action).()
  end
  assert_response(appliance)
  _finished = lambda do
    retire_vm.reload()
    begin
      if retire_vm.retirement_state == "retired"
        return true
      end
    rescue NoMethodError
      # pass
    end
    return false
  end
  wait_for(method(:_finished), num_sec: 1500, delay: 10, message: "REST vm retire now")
end
def test_retire_vm_future(appliance, vm, from_collection)
  # Test retirement of vm
  # 
  #   Prerequisities:
  # 
  #       * An appliance with ``/api`` available.
  #       * VM
  # 
  #   Steps:
  # 
  #       * POST /api/vms/<id> (method ``retire``) with the ``retire_date``
  #       OR
  #       * POST /api/vms (method ``retire``) with the ``retire_date`` and ``href`` of the vm or vms
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Bugzilla:
  #       1805119
  #       1827787
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/3h
  #   
  retire_action = VersionPicker({Version.lowest() => "retire", "5.11" => "request_retire"}).pick()
  retire_vm = appliance.rest_api.collections.vms.get(name: vm)
  date = (datetime.datetime.now() + datetime.timedelta(days: 5)).strftime("%Y/%m/%d")
  future = {"date" => date, "warn" => "4"}
  if is_bool(from_collection)
    future.update(retire_vm._ref_repr())
    appliance.rest_api.collections.vms.action.getattr(retire_action).(future)
  else
    retire_vm.action.getattr(retire_action).(None: future)
  end
  assert_response(appliance)
  _finished = lambda do
    retire_vm.reload()
    if is_bool(!method(:retire_vm).instance_variable_defined? :@retires_on)
      return false
    end
    if is_bool(!method(:retire_vm).instance_variable_defined? :@retirement_warn)
      return false
    end
    if is_bool(!method(:retire_vm).instance_variable_defined? :@retirement_state)
      return false
    end
    return true
  end
  wait_for(method(:_finished), num_sec: 1500, delay: 10, message: "REST vm retire future")
end
def test_check_vm_retirement_requester(appliance, request, provider, vm_retirement_report)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/2h
  #       tags: retirement
  #       setup:
  #           1. Add a provider.
  #           2. Provision a VM.
  #           3. Once the VM has been provisioned, retire the VM.
  #           4. Create a report(See attachment in BZ).
  #       testSteps:
  #           1. Queue the report once the VM has retired
  #               and check the retirement_requester column for the VM.
  #       expectedResults:
  #           1. Requester name must be visible.
  # 
  #   Bugzilla:
  #       1638502
  #       1805119
  #   
  vm_name,report = vm_retirement_report
  saved_report = report.queue(wait_for_finish: true)
  requester_id = ((appliance.rest_api.collections.requests.filter(Q("description", "=", "VM Retire for: #{vm_name}*"))).resources[0]).requester_id
  requester_userid = appliance.rest_api.collections.users.get(id: requester_id).userid
  row_data = saved_report.data.find_row("Name", vm_name)
  raise unless [row_data["Name"], row_data["Retirement Requester"], row_data["Retirement State"]] == [vm_name, requester_userid, "retired"]
end
