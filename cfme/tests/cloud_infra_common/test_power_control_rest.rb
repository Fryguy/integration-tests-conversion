require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/common/provider'
include Cfme::Common::Provider
require_relative 'cfme/infrastructure/config_management'
include Cfme::Infrastructure::Config_management
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.rest, pytest.mark.usefixtures("uses_infra_providers", "uses_cloud_providers"), pytest.mark.tier(2), pytest.mark.provider([BaseProvider], scope: "module"), pytest.mark.parametrize("from_detail", [true, false], ids: ["from_detail", "from_collection"]), pytest.mark.uncollectif(lambda{|provider| provider.one_of(ConfigManagerProvider)}, reason: "Config Manager providers do not support this feature.")]
def vm_name(create_vm)
  return create_vm.name
end
def wait_for_vm_state_change(create_vm, state)
  if is_bool(create_vm.provider.one_of(GCEProvider, EC2Provider, SCVMMProvider))
    num_sec = 4000
  else
    num_sec = 1200
  end
  create_vm.wait_for_power_state_change_rest(desired_state: state, timeout: num_sec)
end
def verify_vm_power_state(vm, state)
  vm.reload()
  return vm.power_state == state
end
def verify_action_result(rest_api, assert_success: true)
  raise unless rest_api.response.status_code == 200
  response = rest_api.response.json()
  if response.include?("results")
    response = response["results"][0]
  end
  message = response["message"]
  success = response["success"]
  if is_bool(assert_success)
    raise unless success
  end
  return [success, message]
end
def test_stop_vm_rest(appliance, create_vm, ensure_vm_running, soft_assert, from_detail)
  # Test stop of vm
  # 
  #   Prerequisities:
  # 
  #       * An appliance with ``/api`` available.
  #       * VM
  # 
  #   Steps:
  # 
  #       * POST /api/vms/<id> (method ``stop``)
  #       OR
  #       * POST /api/vms (method ``stop``) with ``href`` of the vm or vms
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  rest_api = appliance.rest_api
  create_vm.wait_for_vm_state_change(desired_state: create_vm.STATE_ON)
  vm = rest_api.collections.vms.get(name: create_vm.name)
  if is_bool(from_detail)
    vm.action.stop()
  else
    rest_api.collections.vms.action.stop(vm)
  end
  verify_action_result(rest_api)
  wait_for_vm_state_change(create_vm, create_vm.STATE_OFF)
  soft_assert.(!verify_vm_power_state(vm, create_vm.STATE_ON), "vm still running")
end
def test_start_vm_rest(appliance, create_vm, ensure_vm_stopped, soft_assert, from_detail)
  # Test start vm
  # 
  #   Prerequisities:
  # 
  #       * An appliance with ``/api`` available.
  #       * VM
  # 
  #   Steps:
  # 
  #       * POST /api/vms/<id> (method ``start``)
  #       OR
  #       * POST /api/vms (method ``start``) with ``href`` of the vm or vms
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  rest_api = appliance.rest_api
  create_vm.wait_for_vm_state_change(desired_state: create_vm.STATE_OFF, timeout: 1200)
  vm = rest_api.collections.vms.get(name: create_vm.name)
  if is_bool(from_detail)
    vm.action.start()
  else
    rest_api.collections.vms.action.start(vm)
  end
  verify_action_result(rest_api)
  wait_for_vm_state_change(create_vm, create_vm.STATE_ON)
  soft_assert.(verify_vm_power_state(vm, create_vm.STATE_ON), "vm not running")
end
def test_suspend_vm_rest(appliance, create_vm, ensure_vm_running, soft_assert, from_detail)
  # Test suspend vm
  # 
  #   Prerequisities:
  # 
  #       * An appliance with ``/api`` available.
  #       * VM
  # 
  #   Steps:
  # 
  #       * POST /api/vms/<id> (method ``suspend``)
  #       OR
  #       * POST /api/vms (method ``suspend``) with ``href`` of the vm or vms
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  rest_api = appliance.rest_api
  create_vm.wait_for_vm_state_change(desired_state: create_vm.STATE_ON)
  vm = rest_api.collections.vms.get(name: create_vm.name)
  if is_bool(from_detail)
    vm.action.suspend()
  else
    rest_api.collections.vms.action.suspend(vm)
  end
  success,message = verify_action_result(rest_api, assert_success: false)
  if is_bool(create_vm.provider.one_of(GCEProvider, EC2Provider))
    raise unless success === false
    raise unless message.include?("not available")
  else
    raise unless success
    wait_for_vm_state_change(create_vm, create_vm.STATE_SUSPENDED)
    soft_assert.(verify_vm_power_state(vm, create_vm.STATE_SUSPENDED), "vm not suspended")
  end
end
def test_reset_vm_rest(create_vm, ensure_vm_running, from_detail, appliance, provider)
  # 
  #   Test reset vm
  # 
  #   Prerequisities:
  # 
  #       * An appliance with ``/api`` available.
  #       * VM
  # 
  #   Steps:
  # 
  #       * POST /api/vms/<id> (method ``reset``)
  #       OR
  #       * POST /api/vms (method ``reset``) with ``href`` of the vm or vms
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  rest_api = appliance.rest_api
  create_vm.wait_for_vm_state_change(desired_state: create_vm.STATE_ON)
  vm = rest_api.collections.vms.get(name: create_vm.name)
  old_date = vm.updated_on
  if is_bool(from_detail)
    vm.action.reset()
  else
    rest_api.collections.vms.action.reset(vm)
  end
  success,message = verify_action_result(rest_api, assert_success: false)
  if appliance.version < "5.7"
    unsupported_providers = [GCEProvider, EC2Provider, SCVMMProvider]
  else
    unsupported_providers = [GCEProvider, EC2Provider]
  end
  if is_bool(create_vm.provider.one_of(*unsupported_providers))
    raise unless success === false
    raise unless message.include?("not available")
  else
    raise unless success
    wait_for(lambda{|| vm.updated_on >= old_date}, num_sec: 600, delay: 20, fail_func: vm.reload, message: "Wait for VM to reset")
  end
end
