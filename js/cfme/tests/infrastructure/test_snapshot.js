// Tests snapshot memory checkbox
// 
//   Memory checkbox should be displayed and active when VM is running ('Power On').
//   Memory checkbox should not be displayed when VM is stopped ('Power Off').
// 
//   Metadata:
//       test_flag: power_control
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: Infra
//       caseimportance: medium
//       initialEstimate: 1/3h
//   
// Tests snapshot crud
// 
//   Metadata:
//       test_flag: snapshot, provision
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: Infra
//       initialEstimate: 1/6h
//   
// 
//   Check that it's not possible to delete an Active VM from RHV snapshots
// 
//   Bugzilla:
//       1443411
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Infra
//       caseimportance: medium
//       caseposneg: negative
//       initialEstimate: 1/12h
//   
// 
//   Test that we get an error message when we try to create a snapshot with
//   blank description on RHV provider.
// 
//   Metadata:
//       test_flag: snapshot, provision
// 
//   Polarion:
//       assignee: jhenner
//       initialEstimate: 1/4h
//       casecomponent: Infra
//   
// Tests snapshot removal
// 
//   Metadata:
//       test_flag: snapshot, provision
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: Infra
//       caseimportance: medium
//       initialEstimate: 1/4h
//   
function test_verify_revert_snapshot(create_vm, provider, soft_assert, register_event, request) {
  // Tests revert snapshot
  // 
  //   Only valid for RHV 4+ providers, due to EOL we are not explicitly checking/blocking on this
  // 
  //   Metadata:
  //       test_flag: snapshot, provision
  // 
  //   Bugzilla:
  //       1561618
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  verify_revert_snapshot(
    create_vm,
    provider,
    soft_assert,
    register_event,
    request
  )
};

function test_revert_active_snapshot(create_vm, provider, soft_assert, register_event, request) {
  // Tests revert active snapshot
  // 
  //   Metadata:
  //       test_flag: snapshot, provision
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/3h
  //   
  verify_revert_snapshot(
    create_vm,
    provider,
    soft_assert,
    register_event,
    request,
    {active_snapshot: true}
  )
};

function test_revert_to_active_vm(create_vm, provider) {
  // 
  //   Test that it\'s not possible to revert to \"Active VM\" on RHV.
  // 
  //   Bugzilla:
  //       1552732
  // 
  //   Metadata:
  //       test_flag: snapshot
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/4h
  //       casecomponent: Infra
  //   
  let snapshot = new_snapshot(create_vm, {has_name: false});
  snapshot.create();

  create_vm.power_control_from_cfme({
    option: create_vm.POWER_OFF,
    cancel: false
  });

  create_vm.wait_for_vm_state_change({desired_state: create_vm.STATE_OFF});
  snapshot.revert_to();
  let view = navigate_to(create_vm, "SnapshotsAll", {force: true});

  view.tree.click_path(
    create_vm.name,
    snapshot.description,
    "Active VM (Active)"
  );

  if (!!view.toolbar.revert.is_displayed) throw new ()
};

function test_revert_on_running_vm(create_vm) {
  // 
  //   Test that revert button is not clickable on powered on VM.
  // 
  //   Metadata:
  //       test_flag: snapshot, provision
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/4h
  //       casecomponent: Infra
  //   
  let snapshot = new_snapshot(create_vm, {has_name: false});
  snapshot.create();

  create_vm.power_control_from_cfme({
    option: create_vm.POWER_ON,
    cancel: false
  });

  create_vm.wait_for_vm_state_change({desired_state: create_vm.STATE_ON});

  pytest.raises(
    Exception,
    {match: "Could not find an element"},
    () => snapshot.revert_to()
  )
};

function setup_snapshot_env(test_vm, memory) {
  logger.info("Starting snapshot setup");
  let snapshot1 = new_snapshot(test_vm, {memory});
  snapshot1.create();
  let snapshot2 = new_snapshot(test_vm, {memory});
  snapshot2.create();
  snapshot1.revert_to();

  wait_for(() => snapshot1.active, {
    num_sec: 300,
    delay: 20,
    fail_func: test_vm.provider.browser.refresh,
    message: "Waiting for the first snapshot to become active"
  })
};

function test_verify_vm_state_revert_snapshot(provider, parent_vm, create_vm) {
  // 
  //   test vm state after revert snapshot with parent vm:
  //    - powered on and includes memory
  //    - powered on without memory
  //    - powered off
  // 
  //   vm state after revert should be:
  //    - powered on
  //    - powered off
  //    - powered off
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/3h
  //   
  let power = (is_bool(parent_vm.startswith("on")) ? create_vm.POWER_ON : create_vm.POWER_OFF);
  let memory = parent_vm.include("with_memory");
  create_vm.power_control_from_cfme({option: power, cancel: false});
  create_vm.mgmt.wait_for_steady_state();
  setup_snapshot_env(create_vm, memory);
  if (bool(create_vm.mgmt.is_running) != memory) throw new ()
};

function test_operations_suspended_vm(create_vm, soft_assert) {
  // Tests snapshot operations on suspended vm
  // 
  //   Metadata:
  //       test_flag: snapshot, provision
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       initialEstimate: 1/2h
  // 
  //   VirtualCenter 6.5 VMs are in suspended power state when reverted to a snapshot created in the
  //   suspended state.
  //   VirtualCenter 6.7 VMs are in off power state when reverted to a snapshot created in the
  //   suspended state.
  //   
  let snapshot1 = new_snapshot(create_vm);
  snapshot1.create();

  wait_for(() => snapshot1.active, {
    num_sec: 300,
    delay: 20,
    fail_func: snapshot1.refresh,
    message: "Waiting for the first snapshot to become active"
  });

  create_vm.mgmt.ensure_state(VmState.SUSPENDED);
  create_vm.wait_for_vm_state_change({desired_state: create_vm.STATE_SUSPENDED});
  let snapshot2 = new_snapshot(create_vm);
  snapshot2.create();

  wait_for(() => snapshot2.active, {
    num_sec: 300,
    delay: 20,
    fail_func: snapshot2.refresh,
    message: "Waiting for the second snapshot to become active"
  });

  snapshot1.revert_to();

  wait_for(() => snapshot1.active, {
    num_sec: 300,
    delay: 20,
    fail_func: snapshot1.refresh,
    message: "Waiting for the first snapshot to become active after revert"
  });

  if (!create_vm.mgmt.is_stopped) throw new ();
  snapshot2.revert_to();

  wait_for(() => snapshot2.active, {
    num_sec: 300,
    delay: 20,
    fail_func: snapshot2.refresh,
    message: "Waiting for the second snapshot to become active after revert"
  });

  if (create_vm.provider.version == 6.7) {
    if (!create_vm.mgmt.is_stopped) throw new ()
  } else if (!create_vm.mgmt.is_suspended) {
    throw new ()
  };

  snapshot1.delete();
  snapshot2.delete()
};

function test_operations_powered_off_vm(create_vm) {
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       initialEstimate: 1/2h
  //   
  create_vm.power_control_from_cfme({
    option: create_vm.POWER_OFF,
    cancel: false
  });

  create_vm.wait_for_vm_state_change({desired_state: create_vm.STATE_OFF});
  let snapshot1 = new_snapshot(create_vm);
  snapshot1.create();

  wait_for(() => snapshot1.active, {
    num_sec: 300,
    delay: 20,
    fail_func: snapshot1.refresh,
    message: "Waiting for the first snapshot to become active"
  });

  let snapshot2 = new_snapshot(create_vm);
  snapshot2.create();

  wait_for(() => snapshot2.active, {
    num_sec: 300,
    delay: 20,
    fail_func: snapshot2.refresh,
    message: "Waiting for the second snapshot to become active"
  });

  snapshot1.revert_to();

  wait_for(() => snapshot1.active === true, {
    num_sec: 300,
    delay: 20,
    fail_func: snapshot1.refresh,
    message: "Waiting for the fist snapshot to become active after revert"
  });

  snapshot1.delete();
  snapshot2.delete()
};

function test_snapshot_history_btn(create_vm, provider) {
  // Tests snapshot history button
  //   Metadata:
  //       test_flag: snapshot
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //   
  let snapshot = new_snapshot(
    create_vm,
    {has_name: !provider.one_of(RHEVMProvider)}
  );

  snapshot.create();
  let vm_details_view = navigate_to(create_vm, "Details");
  let item = `\"Snapshots\" for Virtual Machine \"${create_vm.name}\"`;
  vm_details_view.toolbar.history.item_select(item);
  let snapshot_view = create_vm.create_view(InfraVmSnapshotView);
  if (!snapshot_view.is_displayed) throw new ()
};

function test_create_snapshot_via_ae(appliance, request, domain, create_vm) {
  // This test checks whether the vm.create_snapshot works in AE.
  // 
  //   Prerequisities:
  //       * A VMware provider
  //       * A VM that has been discovered by CFME
  // 
  //   Steps:
  //       * Clone the Request class inside the System namespace into a new domain
  //       * Add a method named ``snapshot`` and insert the provided code there.
  //       * Add an instance named ``snapshot`` and set the methd from previous step
  //           as ``meth5``
  //       * Run the simulation of the method against the VM, preferably setting
  //           ``snap_name`` to something that can be checked
  //       * Wait until snapshot with such name appears.
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/3h
  //   
  "ui".data_path.join.join.join;
  file.open("r", (f) => {let method_contents = f.read()});
  let miq_domain = DomainCollection(appliance).instantiate({name: "ManageIQ"});
  let miq_class = miq_domain.namespaces.instantiate({name: "System"}).classes.instantiate({name: "Request"});
  miq_class.copy_to(domain);
  let request_cls = domain.namespaces.instantiate({name: "System"}).classes.instantiate({name: "Request"});
  request.addfinalizer(request_cls.delete);

  let method = request_cls.methods.create({
    name: "snapshot",
    location: "inline",
    script: method_contents
  });

  request.addfinalizer(method.delete);

  let instance = request_cls.instances.create({
    name: "snapshot",
    fields: {meth5: {value: "snapshot"}}
  });

  request.addfinalizer(instance.delete);
  let snap_name = fauxfactory.gen_alpha({start: "snap_"});

  let snapshot = InfraVm.Snapshot({
    name: snap_name,
    parent_vm: create_vm
  });

  simulate({
    appliance,
    instance: "Request",
    request: "snapshot",
    target_type: "VM and Instance",
    target_object: create_vm.name,
    execute_methods: true,
    attributes_values: {snap_name: snap_name}
  });

  wait_for(() => snapshot.exists, {
    timeout: "2m",
    delay: 10,
    fail_func: create_vm.provider.browser.refresh,
    handle_exception: true,
    message: "Waiting for snapshot create"
  });

  snapshot.delete()
};

// 
//   Snapshot can be created from VM details page, service details page
//   and snapshot page.
//   Check all pages and the snapshot count displayed on vm details page.
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: SelfServiceUI
//       caseimportance: medium
//       initialEstimate: 1/4h
//       startsin: 5.9
//       setup:
//           1. Add an infra provider
//           2. Create and order a service catalog which provisions a VM
//           3. Login to SSUI
//       testSteps:
//           1. Test that snapshot can be created from Service Details page
//               * Navigate to My Services -> <service_name>
//               * Click Snapshots -> Create
//               * Fill Name and click Create
//           2. Test that snapshot can be created from VM Details page
//               * Navigate to My Services -> <service_name> -> <vm_name>
//               * Click Snapshots -> Create
//               * Fill Name and click Create
//           3. Test that snapshot can be created from Snapshot page
//               * Navigate to My Services -> <service_name> -> <vm_name> -> Snapshots
//               * Click Configuration -> Create Snapshot
//               * Fill Name and click Create
//       expectedResults:
//           1. Snapshot successfully created
//           2. Snapshot successfully created
//           3. Snapshot successfully created
//   
// pass
function test_sui_create_snapshot() {};

// 
//   Test the SUI snapshot timeline.
//   Test grouping of actions in a timeline. Try to create a couple of
//   snapshots in a rapid succession, check how it looks in the timeline.
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: SelfServiceUI
//       caseimportance: low
//       initialEstimate: 1/3h
//       setup:
//           1. Add infra provider
//       testSteps:
//           1. create a new vm
//           2. create multiple snapshots in fast succession (two should be enough)
//           3. go to the VM details page, then Monitoring -> Timelines
//           4. select \"Management Events\" and \"Snapshot Activity\" and click Apply
//           5. click on the group of events in timeline
//       expectedResults:
//           1. vm created
//           2. snapshots created
//           3. timelines page displayed
//           4. group of events displayed in the timeline
//           5. details of events displayed, correct number of events
//              displayed, time/date seems correct
//   
// pass
function test_snapshot_timeline_group_actions() {};

// 
//   Test the SUI snapshot timeline.
//   See if there\"s no timeline when there\"s no snapshot.
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: SelfServiceUI
//       caseimportance: low
//       initialEstimate: 1/6h
//       setup:
//           1. Add infra provider
//       testSteps:
//           1. create a new vm
//           2. go to the VM details page, then Monitoring -> Timelines
//           3. select \"Management Events\" and \"Snapshot Activity\" and click Apply
//       expectedResults:
//           1. vm created
//           2. timelines page displayed
//           3. no timeline visible, warning \"No records found for this timeline\" displayed
//   
// pass
function test_snapshot_timeline_new_vm() {};

// 
//   Test \"snapshot vm memory\" checkbox when creating snapshot for powered off vm.
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: SelfServiceUI
//       caseimportance: medium
//       initialEstimate: 1/4h
//       setup:
//           1. Add infra provider
//           2. Create and order a service catalog which provisions a VM
//           3. Power off testing VM
//       testSteps:
//           1. Via SSUI, test creating snapshot for powered off vm\'s
//       expectedResults:
//           1. \"snapshot vm memory\" checkbox should not be displayed.
//   Bugzilla:
//       1600043
//   
// pass
function test_ssui_snapshot_memory_checkbox() {};

// 
//   Just test the snapshot tree view. Create a bunch of snapshots and see
//   if the snapshot tree seems right. Check if the last created snapshot
//   is active. Revert to some snapshot, then create another bunch of
//   snapshots and check if the tree is correct.
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: Infra
//       caseimportance: medium
//       initialEstimate: 1/4h
//       setup:
//           1. Add infra provider
//           2. Create testing VM
//       testSteps:
//           1. Create three snapshots
//           2. Revert to second snapshot
//           3. Create another two snapshots
//       expectedResults:
//           1. Snapshots created successfully; snapshot tree displays snapshots correctly;
//              last created snapshot is Active
//           2. Revert successful; snapshot tree displays snapshots correctly; active snapshot
//              is the one we reverted to
//           3. Snapshots created successfully; subtree in snapshots tree looks good; active
//              snapshot is the last one created
//   Bugzilla:
//       1398239
//   
// pass
function test_snapshot_tree_view_functionality() {};

// 
//   test snapshot link in vm summary page after deleting snapshot
//   Have a vm, create couple of snapshots. Delete one snapshot. From the
//   vm summary page use the history button and try to go back to
//   snapshots. Go to the vm summary page again and try to click snapshots
//   link, it should work.
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: Infra
//       caseimportance: medium
//       initialEstimate: 1/6h
//       setup:
//           1. Add vmware provider
//           2. Create testing VM
//       testSteps:
//           1. Create two snapshots
//           2. Delete one snapshot
//           3. Use history button to navigate back to VM summary page
//           4. From the vm summary page use the history button and try to go back to snapshots.
//           5. From vm summary page click the snapshot link
//       expectedResults:
//           1. Snapshots successfully created
//           2. Snapshot successfully deleted
//           3. VM summary page displayed
//           4. Snapshots page displayed
//           5. Snapshots page displayed
//   Bugzilla:
//       1395116
//   
// pass
function test_snapshot_link_after_deleting_snapshot() {};

// 
//   Timeline should display snapshots at the time of creation
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: SelfServiceUI
//       caseimportance: medium
//       initialEstimate: 1/4h
//       startsin: 5.9
//       setup:
//           1. Add vmware provider
//           2. Create testing VM
//       testSteps:
//           1. Create two snapshots
//           2. Check the time of creation on the details page
//           3. Check the time of creation on timeline
//       expectedResults:
//           1. Snapshots created successfully
//           2. Snapshots time is correct
//           3. Snapshots time is correct
//   Bugzilla:
//       1490510
//   
// pass
function test_sui_snapshot_timeline_time_of_creation() {};

// 
//   create few snapshots and check if the count displayed on service
//   details page is same as the number of snapshots created
//   and last snapshot created is displayed on service detail page .
//   Also click on the snapshot link should navigate to snapshot page .
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: SelfServiceUI
//       caseimportance: medium
//       initialEstimate: 1/6h
//       startsin: 5.9
//       setup:
//           1. Add vmware provider
//           2. Create testing VM
//       testSteps:
//           1. Create three snapshots
//           2. Check the snapshot count displayed on service details page
//           3. Check that last created snapshot is displayed on service defails page
//           4. Click on that snapshot link
//       expectedResults:
//           1. Snapshots created successfully
//           2. Count should be 3
//           3. True
//           4. Snapshot page displayed
//   
// pass
function test_sui_test_snapshot_count() {};

// 
//   Test the SUI snapshot timeline.
//   See if the data in the timeline are corresponding to the snapshot
//   actions. Try to create snapshots, revert to snapshot and delete
//   snapshot and see if the timeline reflects this correctly
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: SelfServiceUI
//       caseimportance: low
//       initialEstimate: 1/2h
//       setup:
//           1. Add vmware provider
//       testSteps:
//           1. create a new vm
//           2. create two snapshots for the VM
//           3. revert to the first snapshot
//           4. delete all snapshots
//           5. go to the VM details page, then Monitoring -> Timelines
//           6. select \"Management Events\" and \"Snapshot Activity\" and click Apply
//       expectedResults:
//           1. vm created
//           2. snapshots created
//           3. revert successful
//           4. delete successful
//           5. timelines page displayed
//           6. snapshot timeline appears, all actions are in the timeline
//              and visible, the time/date appears correct
//   
// pass
function test_snapshot_timeline_crud() {};

// 
//   Test creating second snapshot on suspended vm.
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: Infra
//       caseimportance: medium
//       initialEstimate: 1/3h
//       setup:
//           1. Add vmware provider
//           2. Create testing vm; suspend it
//       testSteps:
//           1. Take a first snapshot on suspended VM
//           2. Take a second snapshot on suspended VM
//       expectedResults:
//           1. Snapshot created successfully
//           2. Flash message Snapshot not taken since the state of the
//              virtual machine has not changed since the last snapshot
//              operation should be displayed in UI
//   Bugzilla:
//       1419872
//   
// pass
function test_creating_second_snapshot_on_suspended_vm() {};

// 
//   Test the SUI snapshot timeline.
//   See if data on the popup correspond to data shown below the timeline.
// 
//   Polarion:
//       assignee: prichard
//       casecomponent: Infra
//       caseimportance: low
//       initialEstimate: 1/3h
//       setup:
//           1. Add infra provider
//       testSteps:
//           1. create a new vm
//           2. create a snapshot
//           3. go to the VM details page, then Monitoring -> Timelines
//           4. select \"Management Events\" and \"Snapshot Activity\" and click Apply
//           5. click on the event, compare data from the popup with data
//              shown below the timeline
//       expectedResults:
//           1. vm created
//           2. snapshot created
//           3. timelines page displayed
//           4. event displayed on timeline
//           5. data should be identical
//   
// pass
function test_snapshot_timeline_verify_data() {}
