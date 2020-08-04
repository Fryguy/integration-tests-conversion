require_relative("wrapanapi/exceptions");
include(Wrapanapi.Exceptions);
require_relative("cfme");
include(Cfme);
require_relative("cfme/base/ui");
include(Cfme.Base.Ui);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/control/explorer/policies");
include(Cfme.Control.Explorer.Policies);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(2),

  pytest.mark.provider(
    [AzureProvider, EC2Provider],
    {required_flags: ["timelines", "events"]}
  ),

  pytest.mark.usefixtures("setup_provider"),

  pytest.mark.meta({blockers: [GH(
    "ManageIQ/manageiq-providers-amazon:620",
    {unblock(provider) {return !provider.one_of(EC2Provider)}}
  )]}),

  test_requirements.timelines,
  test_requirements.events
];

function mark_vm_as_appliance(create_vm, appliance) {
  let relations_view = navigate_to(
    create_vm,
    "EditManagementEngineRelationship",
    {wait_for_view: 0}
  );

  relations_view.form.server.select_by_visible_text("{name} ({sid})".format({
    name: appliance.server.name,
    sid: appliance.server.sid
  }));

  relations_view.form.save_button.click()
};

function control_policy(appliance, create_vm) {
  let action = appliance.collections.actions.create(
    fauxfactory.gen_alpha(),
    "Tag",
    {}
  );

  let policy = appliance.collections.policies.create(
    VMControlPolicy,
    fauxfactory.gen_alpha()
  );

  policy.assign_events("VM Power Off");
  policy.assign_actions_to_event("VM Power Off", action);

  let profile = appliance.collections.policy_profiles.create(
    fauxfactory.gen_alpha(),
    {policies: [policy]}
  );

  yield(create_vm.assign_policy_profiles(profile.description));

  for (let obj in [profile, policy, action]) {
    if (is_bool(obj.exists)) obj.delete()
  }
};

function azone(create_vm, appliance) {
  let zone_id = create_vm.rest_api_entity.availability_zone_id;
  let rest_zones = create_vm.appliance.rest_api.collections.availability_zones;
  let zone_name = rest_zones.map(zone => zone.name) // next;

  let inst_zone = appliance.collections.cloud_av_zones.instantiate({
    name: zone_name,
    provider: create_vm.provider
  });

  return inst_zone
};

class InstEvent {
  #inst = inst;
  #event = event;
  #ACTIONS;
  #__dict__;
  #emit_cmd;
  #tl_category;
  #tl_event;

  static #ACTIONS = {
    create: {
      tl_event: [
        "AWS_EC2_Instance_CREATE",
        "virtualMachines_write_EndRequest"
      ],

      tl_category: "Creation/Addition",

      db_event_type: [
        "AWS_EC2_Instance_CREATE",
        "virtualMachines_write_EndRequest"
      ],

      emit_cmd: "_create_vm"
    },

    start: {
      tl_event: [
        "AWS_API_CALL_StartInstances",
        "AWS_EC2_Instance_running",
        "virtualMachines_start_EndRequest"
      ],

      tl_category: "Power Activity",

      db_event_type: [
        "AWS_EC2_Instance_running",
        "virtualMachines_start_EndRequest"
      ],

      emit_cmd: "_power_on"
    },

    stop: {
      tl_event: [
        "AWS_API_CALL_StopInstances",
        "AWS_EC2_Instance_stopped",
        "virtualMachines_deallocate_EndRequest"
      ],

      tl_category: "Power Activity",

      db_event_type: [
        "AWS_EC2_Instance_stopped",
        "virtualMachines_deallocate_EndRequest"
      ],

      emit_cmd: "_power_off"
    },

    rename: {
      tl_event: "AWS_EC2_Instance_CREATE",
      tl_category: "Creation/Addition",
      db_event_type: "AWS_EC2_Instance_CREATE",
      emit_cmd: "_rename_vm"
    },

    delete: {
      tl_event: [
        "virtualMachines_delete_EndRequest",
        "AWS_EC2_Instance_DELETE",
        "AWS_API_CALL_TerminateInstances"
      ],

      tl_category: "Deletion/Removal",

      db_event_type: [
        "virtualMachines_delete_EndRequest",
        "AWS_API_CALL_TerminateInstances"
      ],

      emit_cmd: "_delete_vm"
    },

    policy: {
      tl_event: ["vm_poweroff"],
      tl_category: "VM Operation",
      emit_cmd: "_power_off"
    }
  };

  constructor(inst, event) {
    this.#__dict__.update(this.#ACTIONS[this.#event])
  };

  emit() {
    try {
      let emit_action = this.getattr(this.#emit_cmd);
      emit_action.call()
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NoMethodError) {
        throw new NoMethodError("{} is not a valid key in ACTION. self: {}".format(
          this.#event,
          this.#__dict__
        ))
      } else {
        throw $EXCEPTION
      }
    }
  };

  _create_vm() {
    if (is_bool(!this.#inst.exists_on_provider)) {
      this.#inst.create_on_provider({
        allow_skip: "default",
        find_in_cfme: true
      })
    } else {
      logger.info("%r already exists on provider", this.#inst.name)
    }
  };

  _power_on() {
    return this.#inst.mgmt.start()
  };

  _power_off() {
    return this.#inst.mgmt.stop()
  };

  _power_off_power_on() {
    this.#inst.mgmt.stop();
    return this.#inst.mgmt.start()
  };

  _restart() {
    return this.#inst.mgmt.restart()
  };

  _rename_vm() {
    logger.info("%r will be renamed", this.#inst.name);
    let new_name = `${this.#inst.name}-renamed`;
    this.#inst.mgmt.rename(new_name);
    this.#inst.name = new_name;
    this.#inst.mgmt.restart();
    this.#inst.provider.refresh_provider_relationships();
    this.#inst.wait_to_appear();
    return this.#inst.name
  };

  _delete_vm() {
    // pass
    try {
      logger.info("attempting to delete vm %s", this.#inst.name);
      this.#inst.mgmt.cleanup()
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NotFoundError) {
        logger.info("can't delete vm %r, does not exist", this.#inst.name)
      } else {
        throw $EXCEPTION
      }
    }
  };

  _check_timelines(target, policy_events) {
    // Verify that the event is present in the timeline
    // 
    //     Args:
    //         target: A entity where a Timeline is present (Instance, Availability zone, Provider...)
    //         policy_events: switch between the management event timeline and the policy timeline.
    //     Returns:
    //          The length of the array containing the event found on the Timeline of the target.
    //     
    let _get_timeline_events = (target, policy_events) => {
      // Navigate to the timeline of the target and select the management timeline or the
      //       policy timeline. Returns an array of the found events.
      //       
      let timelines_view = navigate_to(
        target,
        "Timelines",
        {wait_for_view: 20, force: true}
      );

      if (is_bool(timelines_view.is_a(ServerDiagnosticsView))) {
        timelines_view = timelines_view.timelines
      };

      let timeline_filter = timelines_view.filter;

      if (is_bool(policy_events)) {
        logger.info("Will search in Policy event timelines");
        timelines_view.filter.event_type.select_by_visible_text("Policy Events");
        timeline_filter.policy_event_category.select_by_visible_text(this.#tl_category);
        timeline_filter.policy_event_status.fill("Both")
      } else {
        if (timelines_view.browser.product_version < "5.10") {
          timeline_filter.detailed_events.fill(true)
        };

        for (let selected_option in timeline_filter.event_category.all_selected_options) {
          timeline_filter.event_category.select_by_visible_text(selected_option)
        };

        timeline_filter.event_category.select_by_visible_text(this.#tl_category)
      };

      timeline_filter.time_position.select_by_visible_text("centered");
      timeline_filter.apply.click();

      logger.info(
        "Searching for event type: %r in timeline category: %r",
        this.#event,
        this.#tl_category
      );

      return timelines_view.chart.get_events(this.#tl_category)
    };

    let events_list = _get_timeline_events.call(target, policy_events);
    logger.debug("events_list: %r", events_list.to_s);

    if (is_bool(!events_list)) {
      this.#inst.provider.refresh_provider_relationships();
      logger.warning("Event list of %r is empty!", target)
    };

    let found_events = [];

    for (let evt in events_list) {
      try {
        if (is_bool(!policy_events)) {
          if (is_bool(this.#inst.name.include(evt.source_instance) && this.#tl_event.include(evt.event_type))) {
            found_events.push(evt);
            break
          }
        } else if (is_bool(this.#tl_event.include(evt.event_type) && this.#inst.name.include(evt.target))) {
          found_events.push(evt);
          break
        }
      } catch (err) {
        if (err instanceof NoMethodError) {
          logger.warning(
            "Issue with TimelinesEvent: %r .Faulty event: %r",
            err.to_s,
            evt.to_s
          );

          continue
        } else {
          throw err
        }
      }
    };

    logger.info(
      "found events on %r: %s",
      target,
      found_events.map(e => repr(e)).join("\n")
    );

    return found_events.size
  };

  catch_in_timelines(soft_assert, targets, { policy_events = false }) {
    for (let target in targets) {
      try {
        wait_for(
          this._check_timelines,
          [target, policy_events],
          {timeout: "15m", fail_condition: 0}
        )
      } catch ($EXCEPTION) {
        if ($EXCEPTION instanceof TimedOutError) {
          soft_assert.call(
            false,

            "0 occurrence of {evt} found on the timeline of {tgt}".format({
              evt: this.#event,
              tgt: target
            })
          )
        } else {
          throw $EXCEPTION
        }
      }
    }
  };

  static get ACTIONS() {
    return InstEvent.#ACTIONS
  };

  static set ACTIONS(val) {
    InstEvent.#ACTIONS = val
  };

  get ACTIONS() {
    if (this.#ACTIONS.nil) this.#ACTIONS = InstEvent.#ACTIONS;
    return this.#ACTIONS
  };

  set ACTIONS(val) {
    this.#ACTIONS = val
  }
};

function test_cloud_timeline_create_event(create_vm, soft_assert, azone) {
  let targets;

  // 
  //   Metadata:
  //       test_flag: timelines, events
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  if (is_bool(BZ(1670550).blocks)) {
    targets = [create_vm]
  } else {
    targets = [create_vm, create_vm.provider, azone]
  };

  let event = "create";
  let inst_event = new InstEvent(create_vm, event);

  logger.info(
    "Will generate event %r on machine %r",
    event,
    create_vm.name
  );

  wait_for(
    inst_event.emit,
    {timeout: "9m", message: `Event ${event} did timeout`}
  );

  inst_event.catch_in_timelines(soft_assert, targets)
};

function test_cloud_timeline_policy_event(create_vm, control_policy, soft_assert) {
  let targets;

  // 
  //   Metadata:
  //       test_flag: timelines, events
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "policy";

  if (is_bool(BZ(1670550).blocks)) {
    targets = [create_vm]
  } else {
    targets = [create_vm, create_vm.provider]
  };

  let inst_event = new InstEvent(create_vm, event);

  logger.info(
    "Will generate event %r on machine %r",
    event,
    create_vm.name
  );

  wait_for(
    inst_event.emit,
    {timeout: "9m", message: `Event ${event} did timeout`}
  );

  inst_event.catch_in_timelines(
    soft_assert,
    targets,
    {policy_events: true}
  )
};

function test_cloud_timeline_stop_event(create_vm, soft_assert, azone) {
  let targets;

  // 
  //   Metadata:
  //       test_flag: timelines, events
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  if (is_bool(BZ(1670550).blocks)) {
    targets = [create_vm]
  } else {
    targets = [create_vm, create_vm.provider, azone]
  };

  let event = "stop";
  let inst_event = new InstEvent(create_vm, event);

  logger.info(
    "Will generate event %r on machine %r",
    event,
    create_vm.name
  );

  wait_for(
    inst_event.emit,
    {timeout: "7m", message: `Event ${event} did timeout`}
  );

  inst_event.catch_in_timelines(soft_assert, targets)
};

function test_cloud_timeline_start_event(create_vm, soft_assert, azone) {
  let targets;

  // 
  //   Metadata:
  //       test_flag: timelines, events
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  if (is_bool(BZ(1670550).blocks)) {
    targets = [create_vm]
  } else {
    targets = [create_vm, create_vm.provider, azone]
  };

  let event = "start";
  let inst_event = new InstEvent(create_vm, "start");

  logger.info(
    "Will generate event %r on machine %r",
    event,
    create_vm.name
  );

  wait_for(
    inst_event.emit,
    {timeout: "7m", message: `Event ${event} did timeout`}
  );

  inst_event.catch_in_timelines(soft_assert, targets)
};

function test_cloud_timeline_diagnostic(create_vm, mark_vm_as_appliance, soft_assert) {
  // Check Configuration/diagnostic/timelines.
  // 
  //   Metadata:
  //       test_flag: timelines, events
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "create";
  let targets = [create_vm.appliance.server];
  let inst_event = new InstEvent(create_vm, event);

  logger.info(
    "Will generate event %r on machine %r",
    event,
    create_vm.name
  );

  inst_event.catch_in_timelines(soft_assert, targets)
};

function test_cloud_timeline_rename_event(create_vm, soft_assert, azone) {
  let targets;

  // 
  //   Metadata:
  //       test_flag: timelines, events
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "rename";

  if (is_bool(BZ(1670550).blocks)) {
    targets = [create_vm]
  } else {
    targets = [create_vm, create_vm.provider, azone]
  };

  let inst_event = new InstEvent(create_vm, event);

  logger.info(
    "Will generate event %r on machine %r",
    event,
    create_vm.name
  );

  wait_for(
    inst_event.emit,
    {timeout: "12m", message: `Event ${event} did timeout`}
  );

  inst_event.catch_in_timelines(soft_assert, targets)
};

function test_cloud_timeline_delete_event(create_vm, soft_assert, azone) {
  let targets;

  // 
  //   Metadata:
  //       test_flag: timelines, events
  // 
  //   Bugzilla:
  //       1730819
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "delete";

  if (is_bool(BZ(1670550).blocks)) {
    targets = [create_vm]
  } else {
    targets = [create_vm, create_vm.provider, azone]
  };

  let inst_event = new InstEvent(create_vm, event);

  logger.info(
    "Will generate event %r on machine %r",
    event,
    create_vm.name
  );

  wait_for(
    inst_event.emit,
    {timeout: "9m", message: `Event ${event} did timeout`}
  );

  inst_event.catch_in_timelines(soft_assert, targets)
}
