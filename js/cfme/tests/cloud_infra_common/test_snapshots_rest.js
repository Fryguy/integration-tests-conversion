require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.long_running,
  pytest.mark.tier(2),
  test_requirements.rest,

  pytest.mark.provider(
    [VMwareProvider, RHEVMProvider, OpenStackProvider],
    {scope: "module"}
  ),

  pytest.mark.meta({blockers: [BZ(
    1712850,

    {forced_streams: ["5.11"], unblock(provider) {
      return !provider.one_of(OpenStackProvider)
    }}
  )]})
];

function collection(appliance, provider) {
  // Returns \"vms\" or \"instances\" collection based on provider type.
  if (is_bool(provider.one_of(InfraProvider))) {
    return appliance.rest_api.collections.vms
  };

  return appliance.rest_api.collections.instances
};

function vm(provider, appliance, collection, setup_provider_modscope, small_template_modscope) {
  // Creates new VM or instance.
  let vm_name = random_vm_name("snpsht");
  let prov_collection = provider.appliance.provider_based_collection(provider);

  let new_vm = prov_collection.instantiate(
    vm_name,
    provider,
    small_template_modscope.name
  );

  if (is_bool(!collection.find_by({name: vm_name}))) {
    new_vm.create_on_provider({find_in_cfme: true, allow_skip: "default"})
  };

  let vm_rest = collection.get({name: vm_name});
  yield(vm_rest);
  let vms = appliance.rest_api.collections.vms.find_by({name: vm_name});

  if (is_bool(vms)) {
    let vm = vms[0];
    vm.action.delete();
    vm.wait_not_exists({num_sec: 600, delay: 5})
  };

  new_vm.cleanup_on_provider()
};

function _create_snapshot_rest(appliance, vm) {
  // Implement the snapshot create so tests can use the same method directly
  let uid = fauxfactory.gen_alphanumeric(8);
  let snap_desc = `snapshot ${uid}`;

  vm.snapshots.action.create({
    name: `test_snapshot_${uid}`,
    description: snap_desc,
    memory: false
  });

  assert_response(appliance);

  let [snap, __] = wait_for(
    () => vm.snapshots.find_by({description: snap_desc}) || false,
    {num_sec: 800, delay: 5, message: "snapshot creation"}
  );

  snap = snap[0];
  return [vm, snap]
};

function vm_snapshot(appliance, vm) {
  // Creates VM/instance snapshot using REST API.
  // 
  //   Returns:
  //       Tuple with VM and snapshot resources in REST API
  //   
  let snapshot;
  [vm, snapshot] = _create_snapshot_rest(appliance, vm);
  yield([vm, snapshot]);
  let to_delete = vm.snapshots.find_by({description: snapshot.description});

  if (is_bool(to_delete)) {
    let snap = to_delete[0];
    snap.action.delete();
    snap.wait_not_exists({num_sec: 300, delay: 5})
  }
};

class TestRESTSnapshots {
  // Tests actions with VM/instance snapshots using REST API.
  test_create_snapshot(vm_snapshot) {
    // Creates VM/instance snapshot using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let [vm, snapshot] = vm_snapshot;
    vm.snapshots.get({description: snapshot.description})
  };

  test_delete_snapshot_from_detail(vm_snapshot, method) {
    // Deletes VM/instance snapshot from detail using REST API.
    // 
    //     Testing BZ 1466225
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let [__, snapshot] = vm_snapshot;

    delete_resources_from_detail(
      [snapshot],
      {method, num_sec: 300, delay: 5}
    )
  };

  test_delete_snapshot_from_collection(vm_snapshot) {
    // Deletes VM/instance snapshot from collection using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let [vm, snapshot] = vm_snapshot;

    delete_resources_from_collection(
      [snapshot],
      vm.snapshots,
      {not_found: true, num_sec: 300, delay: 5}
    )
  };

  test_delete_snapshot_race(request, appliance, collection, vm, vm_snapshot) {
    // Tests creation of snapshot while delete is in progress.
    // 
    //     Testing race condition described in BZ 1550551
    // 
    //     Expected result is either success or reasonable error message.
    //     Not expected result is success where no snapshot is created.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let [__, snap1] = vm_snapshot;
    snap1.action.delete();

    try {
      _create_snapshot_rest(appliance, vm)
    } catch (err) {
      if (err instanceof RuntimeError) {
        if (!err.to_s.include("Please wait for the operation to finish")) throw new ()
      } else {
        throw err
      }
    }
  };

  test_revert_snapshot(appliance, provider, vm_snapshot) {
    // Reverts VM/instance snapshot using REST API.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let [__, snapshot] = vm_snapshot;
    snapshot.action.revert();

    if (is_bool(provider.one_of(RHEVMProvider))) {
      assert_response(appliance, {success: false});
      let result = appliance.rest_api.response.json();

      if (!result.message.include("Revert is allowed only when vm is down")) {
        throw new ()
      }
    } else {
      assert_response(appliance)
    }
  }
}
