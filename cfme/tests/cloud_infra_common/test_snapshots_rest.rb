require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.long_running, pytest.mark.tier(2), test_requirements.rest, pytest.mark.provider([VMwareProvider, RHEVMProvider, OpenStackProvider], scope: "module"), pytest.mark.meta(blockers: [BZ(1712850, forced_streams: ["5.11"], unblock: lambda{|provider| !provider.one_of(OpenStackProvider)})])]
def collection(appliance, provider)
  # Returns \"vms\" or \"instances\" collection based on provider type.
  if is_bool(provider.one_of(InfraProvider))
    return appliance.rest_api.collections.vms
  end
  return appliance.rest_api.collections.instances
end
def vm(provider, appliance, collection, setup_provider_modscope, small_template_modscope)
  # Creates new VM or instance.
  vm_name = random_vm_name("snpsht")
  prov_collection = provider.appliance.provider_based_collection(provider)
  new_vm = prov_collection.instantiate(vm_name, provider, small_template_modscope.name)
  if is_bool(!collection.find_by(name: vm_name))
    new_vm.create_on_provider(find_in_cfme: true, allow_skip: "default")
  end
  vm_rest = collection.get(name: vm_name)
  yield vm_rest
  vms = appliance.rest_api.collections.vms.find_by(name: vm_name)
  if is_bool(vms)
    vm = vms[0]
    vm.action.delete()
    vm.wait_not_exists(num_sec: 600, delay: 5)
  end
  new_vm.cleanup_on_provider()
end
def _create_snapshot_rest(appliance, vm)
  # Implement the snapshot create so tests can use the same method directly
  uid = fauxfactory.gen_alphanumeric(8)
  snap_desc = 
  vm.snapshots.action.create(name: , description: snap_desc, memory: false)
  assert_response(appliance)
  snap,__ = wait_for(lambda{|| vm.snapshots.find_by(description: snap_desc) || false}, num_sec: 800, delay: 5, message: "snapshot creation")
  snap = snap[0]
  return [vm, snap]
end
def vm_snapshot(appliance, vm)
  # Creates VM/instance snapshot using REST API.
  # 
  #   Returns:
  #       Tuple with VM and snapshot resources in REST API
  #   
  vm,snapshot = _create_snapshot_rest(appliance, vm)
  yield [vm, snapshot]
  to_delete = vm.snapshots.find_by(description: snapshot.description)
  if is_bool(to_delete)
    snap = to_delete[0]
    snap.action.delete()
    snap.wait_not_exists(num_sec: 300, delay: 5)
  end
end
class TestRESTSnapshots
  # Tests actions with VM/instance snapshots using REST API.
  def test_create_snapshot(vm_snapshot)
    # Creates VM/instance snapshot using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    vm,snapshot = vm_snapshot
    vm.snapshots.get(description: snapshot.description)
  end
  def test_delete_snapshot_from_detail(vm_snapshot, method)
    # Deletes VM/instance snapshot from detail using REST API.
    # 
    #     Testing BZ 1466225
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    __,snapshot = vm_snapshot
    delete_resources_from_detail([snapshot], method: method, num_sec: 300, delay: 5)
  end
  def test_delete_snapshot_from_collection(vm_snapshot)
    # Deletes VM/instance snapshot from collection using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    vm,snapshot = vm_snapshot
    delete_resources_from_collection([snapshot], vm.snapshots, not_found: true, num_sec: 300, delay: 5)
  end
  def test_delete_snapshot_race(request, appliance, collection, vm, vm_snapshot)
    # Tests creation of snapshot while delete is in progress.
    # 
    #     Testing race condition described in BZ 1550551
    # 
    #     Expected result is either success or reasonable error message.
    #     Not expected result is success where no snapshot is created.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    __,snap1 = vm_snapshot
    snap1.action.delete()
    begin
      _create_snapshot_rest(appliance, vm)
    rescue RuntimeError => err
      if !err.to_s.include?("Please wait for the operation to finish")
        raise
      end
    end
  end
  def test_revert_snapshot(appliance, provider, vm_snapshot)
    # Reverts VM/instance snapshot using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    __,snapshot = vm_snapshot
    snapshot.action.revert()
    if is_bool(provider.one_of(RHEVMProvider))
      assert_response(appliance, success: false)
      result = appliance.rest_api.response.json()
      raise unless result["message"].include?("Revert is allowed only when vm is down")
    else
      assert_response(appliance)
    end
  end
end
