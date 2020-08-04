require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/cloud/provider/gce");
include(Cfme.Cloud.Provider.Gce);
require_relative("cfme/common/provider");
include(Cfme.Common.Provider);
require_relative("cfme/infrastructure/config_management");
include(Cfme.Infrastructure.Config_management);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.rest,

  pytest.mark.usefixtures(
    "uses_infra_providers",
    "uses_cloud_providers"
  ),

  pytest.mark.tier(2),
  pytest.mark.provider([BaseProvider], {scope: "module"}),

  pytest.mark.parametrize(
    "from_detail",
    [true, false],
    {ids: ["from_detail", "from_collection"]}
  ),

  pytest.mark.uncollectif(
    provider => provider.one_of(ConfigManagerProvider),
    {reason: "Config Manager providers do not support this feature."}
  )
];

function vm_name(create_vm) {
  return create_vm.name
};

function wait_for_vm_state_change(create_vm, state) {
  let num_sec;

  if (is_bool(create_vm.provider.one_of(
    GCEProvider,
    EC2Provider,
    SCVMMProvider
  ))) {
    num_sec = 4000
  } else {
    num_sec = 1200
  };

  create_vm.wait_for_power_state_change_rest({
    desired_state: state,
    timeout: num_sec
  })
};

function verify_vm_power_state(vm, state) {
  vm.reload();
  return vm.power_state == state
};

function verify_action_result(rest_api, { assert_success = true }) {
  if (rest_api.response.status_code != 200) throw new ();
  let response = rest_api.response.json();
  if (response.include("results")) response = response.results[0];
  let message = response.message;
  let success = response.success;
  if (is_bool(assert_success)) if (!success) throw new ();
  return [success, message]
};

function test_stop_vm_rest(appliance, create_vm, ensure_vm_running, soft_assert, from_detail) {
  // Test stop of vm
  // 
  //   Prerequisities:
  // 
  //       * An appliance with ``/api`` available.
  //       * VM
  // 
  //   Steps:
  // 
  //       * POST /api/vms/<id> (method ``stop``)
  //       OR
  //       * POST /api/vms (method ``stop``) with ``href`` of the vm or vms
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  let rest_api = appliance.rest_api;
  create_vm.wait_for_vm_state_change({desired_state: create_vm.STATE_ON});
  let vm = rest_api.collections.vms.get({name: create_vm.name});

  if (is_bool(from_detail)) {
    vm.action.stop()
  } else {
    rest_api.collections.vms.action.stop(vm)
  };

  verify_action_result(rest_api);
  wait_for_vm_state_change(create_vm, create_vm.STATE_OFF);

  soft_assert.call(
    !verify_vm_power_state(vm, create_vm.STATE_ON),
    "vm still running"
  )
};

function test_start_vm_rest(appliance, create_vm, ensure_vm_stopped, soft_assert, from_detail) {
  // Test start vm
  // 
  //   Prerequisities:
  // 
  //       * An appliance with ``/api`` available.
  //       * VM
  // 
  //   Steps:
  // 
  //       * POST /api/vms/<id> (method ``start``)
  //       OR
  //       * POST /api/vms (method ``start``) with ``href`` of the vm or vms
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  let rest_api = appliance.rest_api;

  create_vm.wait_for_vm_state_change({
    desired_state: create_vm.STATE_OFF,
    timeout: 1200
  });

  let vm = rest_api.collections.vms.get({name: create_vm.name});

  if (is_bool(from_detail)) {
    vm.action.start()
  } else {
    rest_api.collections.vms.action.start(vm)
  };

  verify_action_result(rest_api);
  wait_for_vm_state_change(create_vm, create_vm.STATE_ON);

  soft_assert.call(
    verify_vm_power_state(vm, create_vm.STATE_ON),
    "vm not running"
  )
};

function test_suspend_vm_rest(appliance, create_vm, ensure_vm_running, soft_assert, from_detail) {
  // Test suspend vm
  // 
  //   Prerequisities:
  // 
  //       * An appliance with ``/api`` available.
  //       * VM
  // 
  //   Steps:
  // 
  //       * POST /api/vms/<id> (method ``suspend``)
  //       OR
  //       * POST /api/vms (method ``suspend``) with ``href`` of the vm or vms
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  let rest_api = appliance.rest_api;
  create_vm.wait_for_vm_state_change({desired_state: create_vm.STATE_ON});
  let vm = rest_api.collections.vms.get({name: create_vm.name});

  if (is_bool(from_detail)) {
    vm.action.suspend()
  } else {
    rest_api.collections.vms.action.suspend(vm)
  };

  let [success, message] = verify_action_result(
    rest_api,
    {assert_success: false}
  );

  if (is_bool(create_vm.provider.one_of(GCEProvider, EC2Provider))) {
    if (success !== false) throw new ();
    if (!message.include("not available")) throw new ()
  } else {
    if (!success) throw new ();
    wait_for_vm_state_change(create_vm, create_vm.STATE_SUSPENDED);

    soft_assert.call(
      verify_vm_power_state(vm, create_vm.STATE_SUSPENDED),
      "vm not suspended"
    )
  }
};

function test_reset_vm_rest(create_vm, ensure_vm_running, from_detail, appliance, provider) {
  let unsupported_providers;

  // 
  //   Test reset vm
  // 
  //   Prerequisities:
  // 
  //       * An appliance with ``/api`` available.
  //       * VM
  // 
  //   Steps:
  // 
  //       * POST /api/vms/<id> (method ``reset``)
  //       OR
  //       * POST /api/vms (method ``reset``) with ``href`` of the vm or vms
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  let rest_api = appliance.rest_api;
  create_vm.wait_for_vm_state_change({desired_state: create_vm.STATE_ON});
  let vm = rest_api.collections.vms.get({name: create_vm.name});
  let old_date = vm.updated_on;

  if (is_bool(from_detail)) {
    vm.action.reset()
  } else {
    rest_api.collections.vms.action.reset(vm)
  };

  let [success, message] = verify_action_result(
    rest_api,
    {assert_success: false}
  );

  if (appliance.version < "5.7") {
    unsupported_providers = [GCEProvider, EC2Provider, SCVMMProvider]
  } else {
    unsupported_providers = [GCEProvider, EC2Provider]
  };

  if (is_bool(create_vm.provider.one_of(...unsupported_providers))) {
    if (success !== false) throw new ();
    if (!message.include("not available")) throw new ()
  } else {
    if (!success) throw new ();

    wait_for(() => vm.updated_on >= old_date, {
      num_sec: 600,
      delay: 20,
      fail_func: vm.reload,
      message: "Wait for VM to reset"
    })
  }
}
