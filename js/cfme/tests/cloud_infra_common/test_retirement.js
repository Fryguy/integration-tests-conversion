// Given the expected_date dictionary, return a string of the form 'T_1|T_2|...|T_N', where
//   T_1 through T_N are formatted datetime strings, one for each unique time between the start
//   and end dates (to minute resolution).
// 
//   Args:
//       expected_date: py:class:`dict` of py:class:`datetime.datetime` instances
//       fmt: py:class:`str` datetime format string
//   
function verify_retirement_state(vm, ...args) {
  // Verify the VM/Instance is in the 'retired' state in the UI, and assert its power state.
  // 
  //   Args:
  //       vm: VM/Instance object
  //     args: (optional) one or more :py:class:`str` corresponding to the Power State(s)
  //           that the VM/Ibstance can have once retired. If not specified, then the default
  //           value of 'retired' will be used.
  //   
  let view = navigate_to(vm, "Details");

  if (!wait_for(() => vm.is_retired, {
    delay: 5,
    num_sec: 15 * 60,
    fail_func: view.toolbar.reload.click,
    message: `Wait for VM '${vm.name}' to enter retired state`
  })) throw new ();

  view = vm.load_details();
  let power_states = (is_bool(args) ? args.to_a : ["retired"]);

  if (!power_states.include(view.entities.summary("Power Management").get_text_of("Power State"))) {
    throw new ()
  }
};

function verify_retirement_date(vm, { expected_date = "Never" }) {
  // Verify the retirement date for a variety of situations.
  // 
  //   Args:
  //       vm: VM/Instance object
  //       expected_date:
  //           :py:class:`str`
  //           or :py:class:`datetime`
  //           or :py:class:`dict`:
  //               'start': :py:class:`datetime`
  //               'end': :py:class:`datetime`
  //   
  if (is_bool(expected_date.is_a(Hash))) {
    expected_date.retire = Datetime.strptime(
      vm.retirement_date,
      vm.RETIRE_DATE_FMT
    );

    logger.info(
      "Asserting retirement date \"%s\" is between \"%s\" and \"%s\"",
      expected_date.retire,
      expected_date.start,
      expected_date.end
    );

    if (!(expected_date.start <= expected_date.retire) || !(expected_date.retire <= expected_date.end)) {
      throw new ()
    }
  } else if (is_bool(expected_date.is_a(datetime))) {
    if (vm.retirement_date != expected_date.strftime(vm.RETIRE_DATE_FMT)) {
      throw new ()
    }
  } else if (vm.retirement_date != expected_date) {
    throw new ()
  }
};

function generate_retirement_date({ delta = 9 }) {
  // Generate a retirement date that can be used by the VM.retire() method, adding delta.
  // 
  //   Args:
  //       delta: a :py:class: `int` that specifies the number of days to be added to today's date
  // 
  //   Returns:
  //        a :py:class: `datetime.date` object including delta as an offset from today
  //   
  let gen_date = Datetime.now().gsub({second: 0});
  if (is_bool(delta)) gen_date += timedelta({days: delta});
  return gen_date
};

function test_retirement_now(create_vm) {
  // Test on-demand retirement of a VM/Instance.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  // 
  //   Bugzilla:
  //       1518926
  //       1565128
  //   
  let expected_date = {};
  expected_date.start = Datetime.utcnow() + (timedelta({minutes: -5}));
  create_vm.retire();
  let view = create_vm.create_view(RequestsView);
  if (!view.is_displayed) throw new ();
  view.flash.assert_success_message("Retirement initiated for 1 VM and Instance from the CFME Database");
  verify_retirement_state(create_vm);
  expected_date.end = Datetime.utcnow() + timedelta({minutes: 5});
  verify_retirement_date(create_vm, {expected_date})
};

function test_retirement_now_multiple(create_vms, provider) {
  // Tests on-demand retirement of two VMs/Instances from All VMs or All Instances page.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  //   
  let expected_date = {};
  expected_date.start = Datetime.utcnow() + (timedelta({minutes: -5}));
  let collection = create_vms[0].parent;
  collection.retire({entities: create_vms});
  let view = collection.create_view(RequestsView);
  if (!view.is_displayed) throw new ();
  view.flash.assert_success_message("Retirement initiated for 2 VMs and Instances from the CFME Database");

  for (let vm in create_vms) {
    verify_retirement_state(vm)
  };

  expected_date.end = Datetime.utcnow() + timedelta({minutes: 5});

  for (let vm in create_vms) {
    verify_retirement_date(vm, {expected_date})
  }
};

function test_retirement_now_ec2_instance_backed(create_vm, tagged, appliance) {
  let power_states;

  // Test on-demand retirement of an S3 (instance-backed) EC2 instance.
  //   Tagged instances should be removed from the provider and become Archived.
  //   Untagged instances should not be removed from the provider.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  //   
  if (is_bool(tagged)) {
    let category = appliance.collections.categories.instantiate({display_name: "LifeCycle"});
    let tag = category.collections.tags.instantiate({display_name: "Fully retire VM and remove from Provider"});
    create_vm.add_tag(tag);
    power_states = ["archived"]
  } else {
    power_states = ["retired"]
  };

  let expected_date = {};
  expected_date.start = Datetime.utcnow() + (timedelta({minutes: -5}));
  create_vm.retire();
  let view = create_vm.create_view(RequestsView);
  if (!view.is_displayed) throw new ();
  view.flash.assert_success_message("Retirement initiated for 1 VM and Instance from the CFME Database");
  verify_retirement_state(create_vm, ...power_states);
  expected_date.end = Datetime.utcnow() + timedelta({minutes: 5});
  verify_retirement_date(create_vm, {expected_date})
};

function test_set_retirement_date(create_vm, warn) {
  // Tests setting retirement date and verifies configured date is reflected in UI
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  //   
  let num_days = 60;
  let expected_date = generate_retirement_date({delta: num_days});

  create_vm.set_retirement_date({
    when: expected_date,
    warn: warn.string
  });

  let view = create_vm.create_view(
    create_vm.DETAILS_VIEW_CLASS,
    {wait: "5s"}
  );

  if (!view.is_displayed) throw new ();
  let msg_date = expected_date.strftime(create_vm.RETIRE_DATE_MSG_FMT);
  view.flash.assert_success_message(`Retirement date set to ${msg_date}`);
  verify_retirement_date(create_vm, {expected_date})
};

function test_set_retirement_date_multiple(create_vms, provider, warn) {
  // Tests setting retirement date of multiple VMs, verifies configured date is reflected in
  //   individual VM Details pages.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  //   
  let num_days = 60;
  let expected_date = generate_retirement_date({delta: num_days});
  let collection = create_vms[0].parent;

  collection.set_retirement_date({
    entities: create_vms,
    when: expected_date,
    warn: warn.string
  });

  let view = collection.create_view(
    navigator.get_class(collection, "All").VIEW,
    {wait: "5s"}
  );

  if (!view.is_displayed) throw new ();
  let msg_date = expected_date.strftime(create_vms[0].RETIRE_DATE_MSG_FMT);
  view.flash.assert_success_message(`Retirement dates set to ${msg_date}`);

  for (let vm in create_vms) {
    verify_retirement_date(vm, {expected_date})
  }
};

function test_set_retirement_offset(create_vm, warn) {
  // Tests setting the retirement date with the 'Time Delay from Now' option.
  //   Minimum is 1 hour, just testing that it is set like test_set_retirement_date.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Provisioning
  //       initialEstimate: 1/15h
  //   
  let retire_offset = {months: 0, weeks: 2, days: 1, hours: 3};
  let timedelta_offset = retire_offset.copy();
  timedelta_offset.pop("months");
  let expected_date = {};

  expected_date.start = Datetime.utcnow() + (timedelta({
    seconds: -60,
    None: timedelta_offset
  }));

  create_vm.set_retirement_date({
    offset: retire_offset,
    warn: warn.string
  });

  expected_date.end = Datetime.utcnow() + timedelta({
    seconds: 60,
    None: timedelta_offset
  });

  let view = create_vm.create_view(
    create_vm.DETAILS_VIEW_CLASS,
    {wait: "5s"}
  );

  if (!view.is_displayed) throw new ();

  let msg_dates = msg_date_range(
    expected_date,
    create_vm.RETIRE_DATE_MSG_FMT
  );

  let flash_regex = re.compile(`^Retirement date set to (${msg_dates})$`);
  view.flash.assert_success_message(flash_regex);
  verify_retirement_date(create_vm, {expected_date})
};

function test_set_retirement_offset_multiple(create_vms, provider, warn) {
  // Test setting the retirement date of multiple VMs/Instances using 'Time Delay from Now'
  //   option. Verify the selected retirement date is reflected in each VM's/Instance's Details
  //   page.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  //   
  let retire_offset = {months: 0, weeks: 2, days: 1, hours: 3};
  let timedelta_offset = retire_offset.copy();
  timedelta_offset.pop("months");
  let expected_date = {};

  expected_date.start = Datetime.utcnow() + (timedelta({
    seconds: -60,
    None: timedelta_offset
  }));

  let collection = create_vms[0].parent;

  collection.set_retirement_date({
    entities: create_vms,
    offset: retire_offset,
    warn: warn.string
  });

  expected_date.end = Datetime.utcnow() + timedelta({
    seconds: 60,
    None: timedelta_offset
  });

  let view = collection.create_view(
    navigator.get_class(collection, "All").VIEW,
    {wait: "5s"}
  );

  if (!view.is_displayed) throw new ();

  let msg_dates = msg_date_range(
    expected_date,
    create_vms[0].RETIRE_DATE_MSG_FMT
  );

  let flash_regex = re.compile(`^Retirement dates set to (${msg_dates})$`);
  view.flash.assert_success_message(flash_regex);

  for (let vm in create_vms) {
    verify_retirement_date(vm, {expected_date})
  }
};

function test_unset_retirement_date(create_vm) {
  // Tests cancelling a scheduled retirement by removing the set date
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  //   
  let num_days = 3;
  let retire_date = generate_retirement_date({delta: num_days});
  create_vm.set_retirement_date({when: retire_date});

  let view = create_vm.create_view(
    create_vm.DETAILS_VIEW_CLASS,
    {wait: "5s"}
  );

  if (!view.is_displayed) throw new ();
  let msg_date = retire_date.strftime(create_vm.RETIRE_DATE_MSG_FMT);
  view.flash.assert_success_message(`Retirement date set to ${msg_date}`);
  verify_retirement_date(create_vm, {expected_date: retire_date});
  create_vm.set_retirement_date({when: null});

  view = create_vm.create_view(
    create_vm.DETAILS_VIEW_CLASS,
    {wait: "5s"}
  );

  if (!view.is_displayed) throw new ();
  view.flash.assert_success_message("Retirement date removed");
  verify_retirement_date(create_vm, {expected_date: "Never"})
};

function test_resume_retired_instance(create_vm, provider, remove_date) {
  // Test resuming a retired instance, should be supported for infra and cloud, though the
  //   actual recovery results may differ depending on state after retirement
  // 
  //   Two methods to resume:
  //   1. Set a retirement date in the future
  //   2. Remove the set retirement date
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Provisioning
  //       initialEstimate: 1/2h
  //   
  let num_days = 5;
  create_vm.retire();
  let view = create_vm.create_view(RequestsView);
  if (!view.is_displayed) throw new ();
  view.flash.assert_success_message("Retirement initiated for 1 VM and Instance from the CFME Database");
  verify_retirement_state(create_vm);
  let retire_date = (is_bool(remove_date) ? null : generate_retirement_date({delta: num_days}));
  create_vm.set_retirement_date({when: retire_date});

  view = create_vm.create_view(
    create_vm.DETAILS_VIEW_CLASS,
    {wait: "5s"}
  );

  if (!view.is_displayed) throw new ();

  if (is_bool(retire_date)) {
    let msg_date = retire_date.strftime(create_vm.RETIRE_DATE_MSG_FMT);
    view.flash.assert_success_message(`Retirement date set to ${msg_date}`)
  } else {
    view.flash.assert_success_message("Retirement date removed")
  };

  verify_retirement_date(
    create_vm,
    {expected_date: (is_bool(retire_date) ? retire_date : "Never")}
  );

  if (!!create_vm.is_retired) throw new ()
};

function test_vm_retirement_from_global_region(setup_multi_region_cluster, multi_region_cluster, activate_global_appliance, setup_remote_provider, create_vm) {
  // 
  //   Retire a VM via Centralized Administration
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       caseimportance: high
  //       casecomponent: Provisioning
  //       initialEstimate: 1/3h
  //       testSteps:
  //           1. Have a VM created in the provider in the Remote region
  //              subscribed to Global.
  //           2. Retire the VM using the Global appliance.
  //       expectedResults:
  //           1.
  //           2. VM transitions to Retired state in the Global and Remote region.
  // 
  //   
  let expected_date = {};
  expected_date.start = Datetime.utcnow() + (timedelta({minutes: -5}));
  create_vm.retire();
  verify_retirement_state(create_vm);
  expected_date.end = Datetime.utcnow() + timedelta({minutes: 5});
  verify_retirement_date(create_vm, {expected_date})
};

// 
//   retire a vm via CA
// 
//   Polarion:
//       assignee: tpapaioa
//       caseimportance: medium
//       casecomponent: Provisioning
//       initialEstimate: 1/3h
//       testSteps:
//           1. Have a VM created in the provider in the Remote region
//              subscribed to Global.
//           2. Retire the VM using the Global appliance.
//       expectedResults:
//           1.
//           2. VM transitions to Retired state in the Global and Remote region.
// 
//   
// pass
function test_vm_retirement_from_global_region_via_rest() {}
