require_relative("wrapanapi");
include(Wrapanapi);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/cloud/provider/gce");
include(Cfme.Cloud.Provider.Gce);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/common");
include(Cfme.Common);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
const PROVIDER_FIELDS = ["test_power_control"];

let pytestmark = [
  pytest.mark.tier(2),
  pytest.mark.long_running,
  test_requirements.power,

  pytest.mark.provider(
    [CloudProvider],
    {scope: "function", required_fields: PROVIDER_FIELDS}
  ),

  pytest.mark.usefixtures("setup_provider")
];

function create_instance(appliance, provider, template_name) {
  let instance = appliance.collections.cloud_instances.instantiate(
    random_vm_name("pwr-c"),
    provider,
    template_name
  );

  if (is_bool(!instance.exists_on_provider)) {
    instance.create_on_provider({
      allow_skip: "default",
      find_in_cfme: true
    })
  } else if (is_bool(instance.provider.one_of(EC2Provider) && instance.mgmt.state == VmState.DELETED)) {
    instance.mgmt.rename(fauxfactory.gen_alphanumeric(
      20,
      "test_terminated_"
    ));

    instance.create_on_provider({
      allow_skip: "default",
      find_in_cfme: true
    })
  };

  return instance
};

function testing_instance2(appliance, provider, small_template, setup_provider) {
  //  Fixture to provision instance on the provider
  //   
  let instance2 = create_instance(
    appliance,
    provider,
    small_template.name
  );

  yield(instance2);
  instance2.cleanup_on_provider()
};

function vm_name(testing_instance) {
  return testing_instance.name
};

function wait_for_ui_state_refresh(instance, provider, state_change_time, { timeout = 900 }) {
  //  Waits for 'State Changed On' refresh
  //   
  let view = navigate_to(instance, "Details");

  let _wait_for_state_refresh = () => {
    try {
      let state = view.entities.summary("Power Management").get_text_of("State Changed On");
      return state_change_time != state
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NameError) {
        logger.warning("NameError caught while waiting for state change, continuing");
        return false
      } else {
        throw $EXCEPTION
      }
    }
  };

  let refresh_timer = RefreshTimer({time_for_refresh: 180});

  let _fail_func = () => {
    provider.is_refreshed(refresh_timer);
    return view.toolbar.reload.click()
  };

  try {
    wait_for(method("_wait_for_state_refresh"), {
      fail_func: _fail_func,
      num_sec: timeout,
      delay: 30,
      message: "Waiting for instance state refresh"
    })
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      return false
    } else {
      throw $EXCEPTION
    }
  }
};

function wait_for_power_state_refresh(instance, state_change_time, { timeout = 720 }) {
  return wait_for(
    () => instance.rest_api_entity.state_changed_on != state_change_time,

    {
      num_sec: timeout.to_i,
      delay: 30,
      message: "Waiting for instance state refresh"
    }
  ).out
};

function wait_for_termination(provider, instance) {
  //  Waits for VM/instance termination and refreshes power states and relationships
  //   
  let view = navigate_to(instance, "Details");
  let pwr_mgmt = view.entities.summary("Power Management");
  let state_change_time = pwr_mgmt.get_text_of("State Changed On");
  provider.refresh_provider_relationships();
  logger.info("Refreshing provider relationships and power states");
  let refresh_timer = RefreshTimer({time_for_refresh: 300});

  wait_for(provider.is_refreshed, [refresh_timer], {
    message: "Waiting for provider.is_refreshed",
    num_sec: 1000,
    delay: 60,
    handle_exception: true
  });

  wait_for_ui_state_refresh(
    instance,
    provider,
    state_change_time,
    {timeout: 720}
  );

  let term_states = new Set([
    instance.STATE_TERMINATED,
    instance.STATE_ARCHIVED,
    instance.STATE_UNKNOWN
  ]);

  if (!term_states.include(pwr_mgmt.get_text_of("Power State"))) {
    // Wait for one more state change as transitional state also changes \"State Changed On\" time
    //     
    logger.info("Instance is still powering down. please wait before termination");
    state_change_time = pwr_mgmt.get_text_of("State Changed On");

    wait_for_ui_state_refresh(
      instance,
      provider,
      state_change_time,
      {timeout: 720}
    )
  };

  return (is_bool(provider.one_of(EC2Provider)) ? instance.mgmt.state == VmState.DELETED : term_states.include(pwr_mgmt.get_text_of("Power State")))
};

function check_power_options(soft_assert, instance, power_state) {
  //  Checks if power options match given power state ('on', 'off')
  //   
  for (let pwr_option in instance.ui_powerstates_available[power_state]) {
    soft_assert.call(
      instance.is_pwr_option_available_in_cfme({
        option: pwr_option,
        from_details: true
      }),

      `${pwr_option} must be available in current power state - ${power_state} `
    )
  };

  for (let pwr_option in instance.ui_powerstates_unavailable[power_state]) {
    soft_assert.call(
      !instance.is_pwr_option_available_in_cfme({
        option: pwr_option,
        from_details: true
      }),

      `${pwr_option} must not be available in current power state - ${power_state} `
    )
  }
};

function wait_for_instance_state(soft_assert, instance, state) {
  let desired_mgmt_state, desired_ui_state;

  // 
  //   Wait for VM to reach \'state\' in both provider and on CFME UI
  // 
  //   \'state\' is a \"friendly name\" which is mapped to the proper instance state/provider state
  // 
  //   Args:
  //     soft_assert -- fixtures.soft_assert pytest fixture
  //     provider -- instance of CloudProvider
  //     instance -- instance of cfme.cloud.instance.Instance
  //     state -- str of either \"started\"/\"running\", \"stopped\", \"suspended\", \"paused\", or \"terminated\"
  //   
  if (["started", "running"].include(state)) {
    desired_mgmt_state = VmState.RUNNING;
    desired_ui_state = instance.STATE_ON
  } else if (state == "stopped") {
    desired_mgmt_state = VmState.STOPPED;
    desired_ui_state = instance.STATE_OFF
  } else if (is_bool(state == "suspended" && instance.mgmt.system.can_suspend)) {
    desired_mgmt_state = VmState.SUSPENDED;
    desired_ui_state = instance.STATE_SUSPENDED
  } else if (is_bool(state == "paused" && instance.mgmt.system.can_pause)) {
    desired_mgmt_state = VmState.PAUSED;
    desired_ui_state = instance.STATE_PAUSED
  } else if (state == "terminated") {
    desired_mgmt_state = null;

    desired_ui_state = [
      instance.STATE_TERMINATED,
      instance.STATE_ARCHIVED,
      instance.STATE_UNKNOWN
    ]
  } else {
    throw new TypeError("Invalid instance state type of '{}' for provider '{}'".format(
      state,
      instance.provider
    ))
  };

  if (is_bool(desired_mgmt_state)) {
    instance.mgmt.wait_for_state(desired_mgmt_state, {timeout: 720})
  };

  soft_assert.call(
    instance.wait_for_instance_state_change({
      desired_state: desired_ui_state,
      timeout: 1200
    }),

    `Instance ${instance} isn't ${desired_ui_state} in CFME UI`
  )
};

function test_quadicon_terminate_cancel(provider, testing_instance, ensure_vm_running, soft_assert) {
  //  Tests terminate cancel
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.power_control_from_cfme({
    option: testing_instance.TERMINATE,
    cancel: true,
    from_details: false
  });

  soft_assert.call(testing_instance.find_quadicon().data.state == "on")
};

function test_quadicon_terminate(appliance, provider, testing_instance, ensure_vm_running, soft_assert) {
  //  Tests terminate instance
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.wait_for_instance_state_change({desired_state: testing_instance.STATE_ON});

  testing_instance.power_control_from_cfme({
    option: testing_instance.TERMINATE,
    from_details: false
  });

  logger.info("Terminate initiated");
  appliance.browser.create_view(BaseLoggedInPage).flash.assert_success_message("Terminate initiated for 1 VM and Instance from the {} Database".format(appliance.product_name));

  soft_assert.call(testing_instance.wait_for_instance_state_change({
    desired_state: [
      testing_instance.STATE_TERMINATED,
      testing_instance.STATE_ARCHIVED,
      testing_instance.STATE_UNKNOWN
    ],

    timeout: 1200
  }))
};

function test_stop(appliance, provider, testing_instance, ensure_vm_running, soft_assert) {
  //  Tests instance stop
  // 
  //   Metadata:
  //       test_flag: power_control, provision
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  testing_instance.wait_for_instance_state_change({desired_state: testing_instance.STATE_ON});
  testing_instance.power_control_from_cfme({option: testing_instance.STOP});
  let view = appliance.browser.create_view(BaseLoggedInPage);

  view.flash.assert_success_message({
    text: "Stop initiated",
    partial: true
  });

  wait_for_instance_state(
    soft_assert,
    testing_instance,
    {state: "stopped"}
  )
};

function test_start(appliance, provider, testing_instance, ensure_vm_stopped, soft_assert) {
  //  Tests instance start
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.wait_for_instance_state_change({
    desired_state: testing_instance.STATE_OFF,
    timeout: 900
  });

  navigate_to(testing_instance, "Details");

  testing_instance.power_control_from_cfme({
    option: testing_instance.START,
    cancel: false
  });

  let view = appliance.browser.create_view(BaseLoggedInPage);

  view.flash.assert_success_message({
    text: "Start initiated",
    partial: true
  });

  logger.info("Start initiated Flash message");

  wait_for_instance_state(
    soft_assert,
    testing_instance,
    {state: "started"}
  )
};

function test_soft_reboot(appliance, provider, testing_instance, ensure_vm_running, soft_assert) {
  //  Tests instance soft reboot
  // 
  //   Metadata:
  //       test_flag: power_control, provision
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  testing_instance.wait_for_instance_state_change({desired_state: testing_instance.STATE_ON});
  let view = navigate_to(testing_instance, "Details");
  let pwr_mgmt = view.entities.summary("Power Management");
  let state_change_time = pwr_mgmt.get_text_of("State Changed On");
  testing_instance.power_control_from_cfme({option: testing_instance.SOFT_REBOOT});

  view.flash.assert_success_message({
    text: "Restart Guest initiated",
    partial: true
  });

  wait_for_ui_state_refresh(
    testing_instance,
    provider,
    state_change_time,
    {timeout: 720}
  );

  let pwr_state = pwr_mgmt.get_text_of("Power State");

  if (is_bool(provider.one_of(GCEProvider) && pwr_state == testing_instance.STATE_UNKNOWN)) {
    // Wait for one more state change as transitional state also
    //     changes \"State Changed On\" time on GCE provider
    //     
    logger.info("Instance is still in \"{}\" state. please wait before CFME will show correct state".format(pwr_state));
    state_change_time = pwr_mgmt.get_text_of("State Changed On");

    wait_for_ui_state_refresh(
      testing_instance,
      provider,
      state_change_time,
      {timeout: 720}
    )
  };

  wait_for_instance_state(
    soft_assert,
    testing_instance,
    {state: "started"}
  )
};

function test_power_on_or_off_multiple(provider, testing_instance, testing_instance2, soft_assert) {
  // 
  //   Verify that multiple instances can be selected and powered on/off
  // 
  //   Metadata:
  //       test_flag: power_control, provision
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Cloud
  //       initialEstimate: 1/8h
  //   
  testing_instance.mgmt.ensure_state(VmState.RUNNING);
  testing_instance2.mgmt.ensure_state(VmState.RUNNING);
  testing_instance.wait_for_instance_state_change({desired_state: testing_instance.STATE_ON});
  testing_instance2.wait_for_instance_state_change({desired_state: testing_instance.STATE_ON});

  let _get_view_with_icons_checked = () => {
    let view = navigate_to(testing_instance.parent, "All");
    view.toolbar.view_selector.select("Grid View");
    view.paginator.set_items_per_page(1000);
    view.entities.get_entity({name: testing_instance.name}).ensure_checked();
    view.entities.get_entity({name: testing_instance2.name}).ensure_checked();
    return view
  };

  let view = _get_view_with_icons_checked.call();

  view.toolbar.power.item_select(
    testing_instance.STOP,
    {handle_alert: true}
  );

  view.flash.assert_success_message({
    text: "Stop initiated for 2 VMs and Instances",
    partial: true
  });

  wait_for_instance_state(
    soft_assert,
    testing_instance,
    {state: "stopped"}
  );

  wait_for_instance_state(
    soft_assert,
    method("testing_instance2"),
    {state: "stopped"}
  );

  view = _get_view_with_icons_checked.call();

  view.toolbar.power.item_select(
    testing_instance.START,
    {handle_alert: true}
  );

  view.flash.assert_success_message({
    text: "Start initiated for 2 VMs and Instances",
    partial: true
  });

  wait_for_instance_state(
    soft_assert,
    testing_instance,
    {state: "started"}
  );

  wait_for_instance_state(
    soft_assert,
    method("testing_instance2"),
    {state: "started"}
  )
};

function test_hard_reboot(appliance, provider, testing_instance, ensure_vm_running, soft_assert) {
  //  Tests instance hard reboot
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.wait_for_instance_state_change({desired_state: testing_instance.STATE_ON});
  let view = navigate_to(testing_instance, "Details");
  let state_change_time = view.entities.summary("Power Management").get_text_of("State Changed On");
  testing_instance.power_control_from_cfme({option: testing_instance.HARD_REBOOT});

  view.flash.assert_success_message({
    text: "Reset initiated",
    partial: true
  });

  wait_for_ui_state_refresh(
    testing_instance,
    provider,
    state_change_time,
    {timeout: 720}
  );

  wait_for_instance_state(
    soft_assert,
    testing_instance,
    {state: "started"}
  )
};

function test_hard_reboot_unsupported(appliance, testing_instance) {
  // 
  //   Tests that hard reboot throws an 'unsupported' error message on an Azure instance
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/8h
  //       casecomponent: Cloud
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.power_control_from_cfme({
    option: testing_instance.HARD_REBOOT,
    from_details: false
  });

  let message = (appliance.version < "5.10" ? "Reset does not apply to at least one of the selected items" : "Reset action does not apply to selected items");
  appliance.browser.create_view(BaseLoggedInPage).flash.assert_message(message)
};

function test_suspend(appliance, provider, testing_instance, ensure_vm_running, soft_assert) {
  //  Tests instance suspend
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.wait_for_instance_state_change({desired_state: testing_instance.STATE_ON});
  testing_instance.power_control_from_cfme({option: testing_instance.SUSPEND});
  let view = appliance.browser.create_view(BaseLoggedInPage);

  view.flash.assert_success_message({
    text: "Suspend initiated",
    partial: true
  });

  if (is_bool(provider.one_of(AzureProvider))) {
    testing_instance.mgmt.wait_for_state(VmState.SUSPENDED)
  };

  wait_for_instance_state(
    soft_assert,
    testing_instance,
    {state: "suspended"}
  )
};

function test_unpause(appliance, provider, testing_instance, ensure_vm_paused, soft_assert) {
  //  Tests instance unpause
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.wait_for_instance_state_change({desired_state: testing_instance.STATE_PAUSED});
  testing_instance.power_control_from_cfme({option: testing_instance.START});

  appliance.browser.create_view(BaseLoggedInPage).flash.assert_success_message({
    text: "Start initiated",
    partial: true
  });

  wait_for_instance_state(
    soft_assert,
    testing_instance,
    {state: "started"}
  )
};

function test_resume(appliance, provider, testing_instance, ensure_vm_suspended, soft_assert) {
  //  Tests instance resume
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.wait_for_instance_state_change({desired_state: testing_instance.STATE_SUSPENDED});
  testing_instance.power_control_from_cfme({option: testing_instance.START});

  appliance.browser.create_view(BaseLoggedInPage).flash.assert_success_message({
    text: "Start initiated",
    partial: true
  });

  wait_for_instance_state(
    soft_assert,
    testing_instance,
    {state: "started"}
  )
};

function test_terminate(provider, testing_instance, ensure_vm_running, soft_assert, appliance) {
  // Tests instance terminate
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.wait_for_instance_state_change({desired_state: testing_instance.STATE_ON});
  testing_instance.power_control_from_cfme({option: testing_instance.TERMINATE});
  appliance.browser.create_view(BaseLoggedInPage).flash.assert_success_message("Terminate initiated for 1 VM and Instance from the {} Database".format(appliance.product_name));

  wait_for_instance_state(
    soft_assert,
    testing_instance,
    {state: "terminated"}
  )
};

function test_instance_power_options_from_on(provider, testing_instance, ensure_vm_running, soft_assert) {
  //  Tests available power options from ON state
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Cloud
  //       initialEstimate: 1/10h
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.wait_for_instance_state_change({desired_state: testing_instance.STATE_ON});
  check_power_options(soft_assert, testing_instance, "on")
};

function test_instance_power_options_from_off(provider, testing_instance, ensure_vm_stopped, soft_assert) {
  // Tests available power options from OFF state
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Cloud
  //       initialEstimate: 1/10h
  //       caseimportance: high
  //       tags: power
  //   
  testing_instance.wait_for_instance_state_change({
    desired_state: testing_instance.STATE_OFF,
    timeout: 1200
  });

  check_power_options(soft_assert, testing_instance, "off")
};

class TestInstanceRESTAPI {
  //  Tests using the /api/instances collection. 
  test_stop(provider, testing_instance, ensure_vm_running, soft_assert, appliance, from_detail) {
    //  Tests instance stop
    // 
    //     Metadata:
    //         test_flag: power_control, provision, rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Cloud
    //         caseimportance: high
    //         initialEstimate: 1/4h
    //     
    testing_instance.wait_for_power_state_change_rest({desired_state: testing_instance.STATE_ON});
    let vm = testing_instance.rest_api_entity;

    if (is_bool(from_detail)) {
      vm.action.stop()
    } else {
      appliance.rest_api.collections.instances.action.stop(vm)
    };

    assert_response(appliance.rest_api);

    if (!testing_instance.wait_for_power_state_change_rest({desired_state: testing_instance.STATE_OFF})) {
      throw new ()
    };

    wait_for_instance_state(
      soft_assert,
      testing_instance,
      {state: "stopped"}
    )
  };

  test_start(provider, testing_instance, ensure_vm_stopped, soft_assert, appliance, from_detail) {
    //  Tests instance start
    // 
    //     Metadata:
    //         test_flag: power_control, provision, rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Cloud
    //         caseimportance: high
    //         initialEstimate: 1/4h
    //     
    testing_instance.wait_for_power_state_change_rest({
      desired_state: testing_instance.STATE_OFF,
      timeout: 1200
    });

    let vm = testing_instance.rest_api_entity;

    if (is_bool(from_detail)) {
      vm.action.start()
    } else {
      appliance.rest_api.collections.instances.action.start(vm)
    };

    assert_response(appliance.rest_api);

    if (!testing_instance.wait_for_power_state_change_rest({desired_state: testing_instance.STATE_ON})) {
      throw new ()
    };

    wait_for_instance_state(
      soft_assert,
      testing_instance,
      {state: "started"}
    )
  };

  test_soft_reboot(provider, testing_instance, soft_assert, ensure_vm_running, appliance, from_detail) {
    //  Tests instance soft reboot
    // 
    //     Metadata:
    //         test_flag: power_control, provision, rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Cloud
    //         caseimportance: high
    //         initialEstimate: 1/4h
    //     
    testing_instance.wait_for_power_state_change_rest({desired_state: testing_instance.STATE_ON});
    let vm = testing_instance.rest_api_entity;
    let state_change_time = vm.state_changed_on;

    if (is_bool(from_detail)) {
      vm.action.reboot_guest()
    } else {
      appliance.rest_api.collections.instances.action.reboot_guest(vm)
    };

    assert_response(appliance.rest_api);
    wait_for_power_state_refresh(testing_instance, state_change_time);
    state_change_time = testing_instance.rest_api_entity.state_changed_on;

    if (vm.power_state != testing_instance.STATE_ON) {
      wait_for_power_state_refresh(testing_instance, state_change_time)
    };

    if (!testing_instance.wait_for_power_state_change_rest({desired_state: testing_instance.STATE_ON})) {
      throw new ()
    };

    wait_for_instance_state(
      soft_assert,
      testing_instance,
      {state: "started"}
    )
  };

  test_hard_reboot(provider, testing_instance, soft_assert, ensure_vm_running, appliance, from_detail) {
    //  Tests instance hard reboot
    // 
    //     Metadata:
    //         test_flag: power_control, provision, rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Cloud
    //         caseimportance: high
    //         initialEstimate: 1/4h
    //     
    testing_instance.wait_for_power_state_change_rest({desired_state: testing_instance.STATE_ON});
    let vm = testing_instance.rest_api_entity;

    if (is_bool(from_detail)) {
      vm.action.reset()
    } else {
      appliance.rest_api.collections.instances.action.reset(vm)
    };

    assert_response(appliance.rest_api);

    if (!testing_instance.wait_for_power_state_change_rest({
      desired_state: testing_instance.STATE_ON,
      timeout: 720
    })) throw new ();

    wait_for_instance_state(
      soft_assert,
      testing_instance,
      {state: "started"}
    )
  };

  test_suspend_resume(provider, testing_instance, soft_assert, ensure_vm_running, appliance, from_detail) {
    //  Tests instance suspend and resume
    // 
    //     Metadata:
    //         test_flag: power_control, provision, rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Cloud
    //         caseimportance: high
    //         initialEstimate: 1/4h
    //     
    testing_instance.wait_for_power_state_change_rest({desired_state: testing_instance.STATE_ON});
    let vm = testing_instance.rest_api_entity;

    if (is_bool(from_detail)) {
      vm.action.suspend()
    } else {
      appliance.rest_api.collections.instances.action.suspend(vm)
    };

    assert_response(appliance.rest_api);

    if (!testing_instance.wait_for_power_state_change_rest({
      desired_state: testing_instance.STATE_SUSPENDED,
      delay: 15
    })) throw new ();

    wait_for_instance_state(
      soft_assert,
      testing_instance,
      {state: "suspended"}
    );

    if (is_bool(from_detail)) {
      vm.action.start()
    } else {
      appliance.rest_api.collections.instances.action.start(vm)
    };

    assert_response(appliance.rest_api);

    if (!testing_instance.wait_for_power_state_change_rest({
      desired_state: testing_instance.STATE_ON,
      delay: 15
    })) throw new ();

    wait_for_instance_state(
      soft_assert,
      testing_instance,
      {state: "started"}
    )
  };

  test_pause_unpause(provider, testing_instance, soft_assert, ensure_vm_running, appliance, from_detail) {
    //  Tests instance pause and unpause
    // 
    //     Metadata:
    //         test_flag: power_control, provision, rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Cloud
    //         caseimportance: high
    //         initialEstimate: 1/4h
    //     
    testing_instance.wait_for_power_state_change_rest({desired_state: testing_instance.STATE_ON});
    let vm = testing_instance.rest_api_entity;

    if (is_bool(from_detail)) {
      vm.action.pause()
    } else {
      appliance.rest_api.collections.instances.action.pause(vm)
    };

    assert_response(appliance.rest_api);

    if (!testing_instance.wait_for_power_state_change_rest({
      desired_state: testing_instance.STATE_PAUSED,
      delay: 15
    })) throw new ();

    wait_for_instance_state(
      soft_assert,
      testing_instance,
      {state: "paused"}
    );

    if (is_bool(from_detail)) {
      vm.action.start()
    } else {
      appliance.rest_api.collections.instances.action.start(vm)
    };

    assert_response(appliance.rest_api);

    if (!testing_instance.wait_for_power_state_change_rest({
      desired_state: testing_instance.STATE_ON,
      delay: 15
    })) throw new ();

    wait_for_instance_state(
      soft_assert,
      testing_instance,
      {state: "started"}
    )
  };

  test_terminate(provider, testing_instance, soft_assert, ensure_vm_running, appliance, from_detail) {
    //  Tests instance terminate via REST API
    // 
    //     Metadata:
    //         test_flag: power_control, provision, rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Cloud
    //         caseimportance: high
    //         initialEstimate: 1/4h
    //     
    testing_instance.wait_for_power_state_change_rest({desired_state: testing_instance.STATE_ON});
    let vm = testing_instance.rest_api_entity;

    if (is_bool(from_detail)) {
      vm.action.terminate()
    } else {
      appliance.rest_api.collections.instances.action.terminate(vm)
    };

    assert_response(appliance.rest_api);

    wait_for_instance_state(
      soft_assert,
      testing_instance,
      {state: "terminated"}
    );

    let terminated_states = [
      testing_instance.STATE_TERMINATED,
      testing_instance.STATE_ARCHIVED,
      testing_instance.STATE_UNKNOWN
    ];

    vm.reload();

    soft_assert.call(
      terminated_states.include(vm.power_state),
      "instance not terminated"
    )
  }
};

function test_power_options_on_archived_instance_all_page(testing_instance) {
  // This test case is to check Power option drop-down button is disabled on archived and orphaned
  //      instances all page. Also it performs the power operations on instance and checked expected
  //      flash messages.
  //      Note: Cloud instances can not be orphaned
  // 
  //   Bugzilla:
  //       1701188
  //       1655477
  //       1686015
  //       1738584
  // 
  //   Polarion:
  //       assignee: prichard
  //       initialEstimate: 1/2h
  //       caseimportance: low
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.9
  //       casecomponent: Control
  //       tags: power
  //       testSteps:
  //           1. Add provider cloud provider
  //           2. Navigate to Archived instance all page
  //           3. Select any instance and click on power option drop-down
  //   
  testing_instance.mgmt.delete();

  testing_instance.wait_for_instance_state_change({
    desired_state: "archived",
    timeout: 1200
  });

  let cloud_instance = testing_instance.appliance.collections.cloud_instances;
  let view = navigate_to(cloud_instance, "ArchivedAll");
  testing_instance.find_quadicon({from_archived_all: true}).ensure_checked();

  for (let action in view.toolbar.power.to_a) {
    if (is_bool(action == "Resume" && BZ(
      1738584,
      {forced_streams: ["5.10", "5.11"]}
    ).blocks)) continue;

    view.toolbar.power.item_select(action, {handle_alert: true});

    if (action == "Soft Reboot") {
      action = "Restart Guest"
    } else if (action == "Hard Reboot") {
      action = "Reset"
    } else if (action == "Delete") {
      action = "Terminate"
    };

    view.flash.assert_message(`${action} action does not apply to selected items`);
    view.flash.dismiss()
  }
}
