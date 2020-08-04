require_relative("cfme");
include(Cfme);
require_relative("cfme/base/ui");
include(Cfme.Base.Ui);
require_relative("cfme/control/explorer/policies");
include(Cfme.Control.Explorer.Policies);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/kubevirt");
include(Cfme.Infrastructure.Provider.Kubevirt);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let all_infra_prov = ProviderFilter({classes: [InfraProvider]});

let excluded = ProviderFilter({
  classes: [SCVMMProvider, KubeVirtProvider],
  inverted: true
});

let pytestmark = [
  pytest.mark.tier(2),

  pytest.mark.provider({
    gen_func: providers,
    filters: [excluded, all_infra_prov]
  }),

  pytest.mark.usefixtures("setup_provider"),
  test_requirements.timelines,
  test_requirements.events
];

function new_vm(provider) {
  let vm = provider.appliance.collections.infra_vms.instantiate(
    random_vm_name("timelines", {max_length: 16}),
    provider
  );

  vm.create_on_provider({find_in_cfme: true});

  logger.debug(
    "Fixture new_vm set up! Name: %r Provider: %r",
    vm.name,
    vm.provider.name
  );

  yield(vm);
  vm.cleanup_on_provider()
};

function mark_vm_as_appliance(new_vm, appliance) {
  let relations_view = navigate_to(
    new_vm,
    "EditManagementEngineRelationship",
    {wait_for_view: 0}
  );

  let server_name = `${appliance.server.name} (${appliance.server.sid})`;
  relations_view.form.server.select_by_visible_text(server_name);
  relations_view.form.save_button.click()
};

function control_policy(appliance, new_vm) {
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

  yield(new_vm.assign_policy_profiles(profile.description));
  if (is_bool(profile.exists)) profile.delete();
  if (is_bool(policy.exists)) policy.delete();
  if (is_bool(action.exists)) action.delete()
};

class VMEvent {
  #vm = vm;
  #event = event;
  #ACTIONS;
  #__dict__;
  #emit_cmd;
  #tl_category;
  #tl_event;

  // Class for generating  events on a VM in order to check it on Timelines.
  //   Args:
  //       vm: A VM object (Object)
  //       event: an event, Key in ACTIONS.(String)
  //   
  static #ACTIONS = {
    create: {
      tl_event: [
        "VmDeployedEvent",
        "USER_RUN_VM",
        "USER_ADD_VM_FINISHED_SUCCESS"
      ],

      tl_category: "Creation/Addition",
      db_event_type: ["vm_create", "USER_RUN_VM"],
      emit_cmd: "_setup_vm"
    },

    start: {
      tl_event: ["VmPoweredOnEvent", "USER_STARTED_VM", "USER_RUN_VM"],
      tl_category: "Power Activity",
      db_event_type: "vm_start",
      emit_cmd: "_power_on"
    },

    stop: {
      tl_event: ["VmPoweredOffEvent", "USER_STOP_VM", "VM_DOWN"],
      tl_category: "Power Activity",
      db_event_type: "vm_poweroff",
      emit_cmd: "_power_off"
    },

    suspend: {
      tl_event: [
        "VmSuspendedEvent",
        "USER_SUSPEND_VM",
        "USER_SUSPEND_VM_OK"
      ],

      tl_category: "Power Activity",
      db_event_type: "vm_suspend",
      emit_cmd: "_suspend"
    },

    rename: {
      tl_event: ["VmRenamedEvent", "USER_UPDATE_VM"],
      tl_category: "Alarm/Status Change/Errors",
      db_event_type: "VmRenamedEvent",
      emit_cmd: "_rename_vm"
    },

    delete: {
      tl_event: [
        "VmRemovedEvent",
        "DestroyVM_Task",
        "USER_REMOVE_VM_FINISHED"
      ],

      tl_category: "Deletion/Removal",
      db_event_type: "VmRenamedEvent",
      emit_cmd: "_delete_vm"
    },

    clone: {
      tl_event: ["CloneVM_Task_Complete", "CloneVM_Task"],
      tl_category: "Creation/Addition",
      db_event_type: "VmClonedEvent",
      emit_cmd: "_clone_vm"
    },

    migrate: {
      tl_event: [
        "VmMigratedEvent",
        "RelocateVM_Task",
        "VM_MIGRATION_DONE",
        "VM_MIGRATION_FAILED_FROM_TO",
        "VM_MIGRATION_FAILED"
      ],

      tl_category: "Migration/Vmotion",
      db_event_type: "VmMigratedEvent",
      emit_cmd: "_migrate_vm"
    },

    policy: {
      tl_event: ["vm_poweroff"],
      tl_category: "VM Operation",
      emit_cmd: "_power_off"
    }
  };

  constructor(vm, event) {
    this.#__dict__.update(this.#ACTIONS[this.#event])
  };

  emit() {
    try {
      let emit_action = this.getattr(this.#emit_cmd);
      emit_action.call()
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NoMethodError) {
        throw new ()
      } else {
        throw $EXCEPTION
      }
    }
  };

  _setup_vm() {
    if (is_bool(!this.#vm.exists_on_provider)) {
      logger.info("Will set up the VM %r ton the provider", this.#vm.name);
      return this.#vm.create_on_provider({find_in_cfme: true})
    } else {
      logger.info("%r already exists on the provider.", this.#vm.name)
    }
  };

  _power_on() {
    return this.#vm.mgmt.start()
  };

  _power_off() {
    return this.#vm.mgmt.stop()
  };

  _restart_vm() {
    return this._power_off() && this._power_on()
  };

  _suspend() {
    return this.#vm.mgmt.suspend() && this.#vm.mgmt.start()
  };

  _rename_vm() {
    logger.info("%r will be renamed", this.#vm.name);
    let new_name = this.#vm.name + ("-renamed");
    let rename_success = this.#vm.mgmt.rename(this.#vm.name + ("-renamed"));

    if (is_bool(!rename_success)) {
      throw new Exception("Renaming {} to {} on the provider failed".format(
        this.#vm.name,
        new_name
      ))
    };

    logger.info("%r new name is %r", this.#vm.name, new_name);
    this.#vm.name = new_name;
    logger.info("%r will be rebooted", this.#vm.name);
    this.#vm.mgmt.restart();
    return this.#vm.name
  };

  _delete_vm() {
    logger.info("%r will be deleted.", this.#vm.name);
    return this.#vm.mgmt.delete()
  };

  _clone_vm() {
    let msg = ("{name} will be cloned to {name}-clone.").format({name: this.#vm.name});
    logger.info(msg);
    let clone_name = this.#vm.name + ("-clone");
    this.#vm.clone_vm({vm_name: clone_name});

    wait_for(
      this.#vm.provider.mgmt.does_vm_exist,
      [clone_name],
      {timeout: "6m", message: "Check clone exists failed"}
    )
  };

  _migrate_vm() {
    let migrate_to;
    logger.info("%r will be migrated.", this.#vm.name);
    let view = navigate_to(this.#vm, "Details");
    let vm_host = view.entities.summary("Relationships").get_text_of("Host");

    let hosts = this.#vm.provider.hosts.all().select(vds => (
      !vm_host.include(vds.name)
    )).map(vds => vds.name);

    if (is_bool(hosts)) {
      migrate_to = hosts[0]
    } else {
      pytest.skip("There is only one host in the provider")
    };

    return this.#vm.migrate_vm({host: migrate_to})
  };

  _check_timelines(target, policy_events) {
    // Verify that the event is present in the timeline
    // 
    //     Args:
    //         target: A entity where a Timeline is present (VM, host, cluster, Provider...)
    //         policy_events: switch between the management event timeline and the policy timeline.
    //     Returns:
    //          The length of the array containing the event found on the Timeline of the target.
    //     
    let _get_timeline_events = (target, policy_events) => {
      // Navigate to the timeline of the target and select the management timeline or the
      //       policy timeline. Returns an array of the found events.
      //       
      let timelines_view = navigate_to(target, "Timelines");

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

    if (is_bool(!events_list.size)) {
      this.#vm.provider.refresh_provider_relationships();
      logger.warning("Event list of %r is empty!", target.to_s)
    };

    let found_events = [];

    for (let evt in events_list) {
      try {
        if (is_bool(!policy_events)) {
          if (is_bool(evt.instance_variable_defined("@destination_vm" && this.#vm.name.include(evt.destination_vm)))) {
            found_events.push(evt);
            break
          } else if (is_bool(this.#vm.name.include(evt.source_vm) && this.#tl_event.include(evt.event_type))) {
            found_events.push(evt);
            break
          } else if (is_bool(this.#event == "create" && BZ(
            1687493,
            {unblock(provider) {return !provider.one_of(RHEVMProvider)}}
          ).blocks && evt.message.include(this.#vm.name) && this.#tl_event.include(evt.event_type))) {
            found_events.push(evt);
            break
          }
        } else if (is_bool(this.#tl_event.include(evt.event_type) && this.#vm.name.include(evt.target))) {
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
      `found events on %r :\n %s`,
      target,
      found_events.map(e => repr(e)).join("\n")
    );

    return found_events.size
  };

  catch_in_timelines(soft_assert, targets, { policy_events = false }) {
    if (is_bool(targets)) {
      for (let target in targets) {
        try {
          wait_for(
            this._check_timelines,
            [target, policy_events],
            {timeout: "7m", fail_condition: 0}
          )
        } catch ($EXCEPTION) {
          if ($EXCEPTION instanceof TimedOutError) {
            soft_assert.call(
              false,

              "0 occurrence of {} found on the timeline of {}".format(
                this.#event,
                target
              )
            )
          } else {
            throw $EXCEPTION
          }
        }
      }
    } else {
      throw new TypeError("Targets must not be empty")
    }
  };

  static get ACTIONS() {
    return VMEvent.#ACTIONS
  };

  static set ACTIONS(val) {
    VMEvent.#ACTIONS = val
  };

  get ACTIONS() {
    if (this.#ACTIONS.nil) this.#ACTIONS = VMEvent.#ACTIONS;
    return this.#ACTIONS
  };

  set ACTIONS(val) {
    this.#ACTIONS = val
  }
};

function test_infra_timeline_create_event(new_vm, soft_assert) {
  let targets;

  // Test that the event create is visible on the management event timeline of the Vm,
  //   Vm's cluster,  VM's host, VM's provider.
  // 
  //   Metadata:
  //       test_flag: events, provision, timelines
  // 
  //   Bugzilla:
  //       1670550
  //       1747132
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "create";
  let vm_event = new VMEvent(new_vm, event);

  if (is_bool(new_vm.provider.one_of(RHEVMProvider))) {
    targets = [new_vm, new_vm.cluster, new_vm.provider]
  } else {
    targets = [new_vm, new_vm.cluster, new_vm.host, new_vm.provider]
  };

  logger.info(
    "Will generate event %r on machine %r",
    event,
    new_vm.name
  );

  wait_for(
    vm_event.emit,
    {timeout: "7m", message: `Event ${event}failed`}
  );

  vm_event.catch_in_timelines(soft_assert, targets)
};

function test_infra_timeline_policy_event(new_vm, control_policy, soft_assert) {
  // Test that the category Policy Event is properly working on the Timeline of the Vm,
  //   Vm's cluster,  VM's host, VM's provider. For this purpose, there is need to create a policy
  //   profile, assign it to the VM and stopping it which triggers the policy.
  // 
  //   Metadata:
  //       test_flag: events, provision, timelines
  // 
  //   Bugzilla:
  //       1670550
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "policy";
  let targets = [new_vm, new_vm.cluster, new_vm.host, new_vm.provider];
  let vm_event = new VMEvent(new_vm, event);

  logger.info(
    "Will generate event %r on machine %r",
    event,
    new_vm.name
  );

  wait_for(
    vm_event.emit,
    {timeout: "7m", message: `Event ${event} did timeout`}
  );

  vm_event.catch_in_timelines(
    soft_assert,
    targets,
    {policy_events: true}
  )
};

function test_infra_timeline_stop_event(new_vm, soft_assert) {
  // Test that the event Stop is visible on the  management event timeline of the Vm,
  //   Vm's cluster,  VM's host, VM's provider.
  // 
  //   Metadata:
  //       test_flag: events, provision, timelines
  // 
  //   Bugzilla:
  //       1670550
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "stop";
  let targets = [new_vm, new_vm.cluster, new_vm.host, new_vm.provider];
  let vm_event = new VMEvent(new_vm, event);

  logger.info(
    "Will generate event %r on machine %r",
    event,
    new_vm.name
  );

  wait_for(
    vm_event.emit,
    {timeout: "7m", message: `Event ${event} failed`}
  );

  vm_event.catch_in_timelines(soft_assert, targets)
};

function test_infra_timeline_start_event(new_vm, soft_assert) {
  // Test that the event start is visible on the  management event timeline of the Vm,
  //   Vm's cluster,  VM's host, VM's provider.
  // 
  //   Metadata:
  //       test_flag: events, provision, timelines
  // 
  //   Bugzilla:
  //       1670550
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "start";
  let targets = [new_vm, new_vm.cluster, new_vm.host, new_vm.provider];
  let vm_event = new VMEvent(new_vm, event);

  logger.info(
    "Will generate event %r on machine %r",
    event,
    new_vm.name
  );

  wait_for(
    vm_event.emit,
    {timeout: "7m", message: `Event ${event} failed`}
  );

  vm_event.catch_in_timelines(soft_assert, targets)
};

function test_infra_timeline_suspend_event(new_vm, soft_assert) {
  // Test that the event suspend is visible on the  management event timeline of the Vm,
  //   Vm's cluster,  VM's host, VM's provider. The VM needs to be set before as management engine.
  // 
  //   Metadata:
  //       test_flag: events, provision, timelines
  // 
  //   Bugzilla:
  //       1670550
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "suspend";
  let targets = [new_vm, new_vm.cluster, new_vm.host, new_vm.provider];
  let vm_event = new VMEvent(new_vm, event);

  logger.info(
    "Will generate event %r on machine %r",
    event,
    new_vm.name
  );

  wait_for(
    vm_event.emit,
    {timeout: "7m", message: `Event ${event} failed`}
  );

  vm_event.catch_in_timelines(soft_assert, targets)
};

function test_infra_timeline_diagnostic(new_vm, soft_assert, mark_vm_as_appliance) {
  // Test that the event create is visible on the appliance timeline ( EVM/configuration/Server/
  //   diagnostic/Timelines.
  // 
  //   Metadata:
  //       test_flag: events, provision, timelines
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "create";
  let targets = [new_vm.appliance.server];

  logger.info(
    "Will generate event %r on machine %r",
    event,
    new_vm.name
  );

  let vm_event = new VMEvent(new_vm, event);
  vm_event.catch_in_timelines(soft_assert, targets)
};

function test_infra_timeline_clone_event(new_vm, soft_assert) {
  // Test that the event clone is visible on the  management event timeline of the Vm,
  //   Vm's cluster,  VM's host, VM's provider.
  // 
  //   Metadata:
  //       test_flag: events, provision, timelines
  // 
  //   Bugzilla:
  //       1622952
  //       1670550
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "clone";
  let vm_event = new VMEvent(new_vm, event);
  let targets = [new_vm, new_vm.cluster, new_vm.host, new_vm.provider];

  logger.info(
    "Will generate event %r on machine %r",
    event,
    new_vm.name
  );

  wait_for(
    vm_event.emit,
    {timeout: "7m", message: `Event ${event} failed`}
  );

  vm_event.catch_in_timelines(soft_assert, targets)
};

function test_infra_timeline_migrate_event(new_vm, soft_assert) {
  // Test that the event migrate is visible on the  management event timeline of the Vm,
  //   Vm's cluster,  VM's host, VM's provider.
  // 
  //   Metadata:
  //       test_flag: events, provision, timelines
  // 
  //   Bugzilla:
  //       1670550
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "migrate";
  let vm_event = new VMEvent(new_vm, event);
  let targets = [new_vm, new_vm.cluster, new_vm.host, new_vm.provider];

  logger.info(
    "Will generate event %r on machine %r",
    event,
    new_vm.name
  );

  wait_for(
    vm_event.emit,
    {timeout: "7m", message: `Event ${event} failed`}
  );

  vm_event.catch_in_timelines(soft_assert, targets)
};

function test_infra_timeline_rename_event(new_vm, soft_assert) {
  // Test that the event rename is visible on the  management event timeline of the Vm,
  //   Vm\'s cluster,  VM\'s host, VM\'s provider.
  //   Action \"rename\" does not exist on RHV, thats why it is excluded.
  // 
  //   Metadata:
  //       test_flag: events, provision, timelines
  // 
  //   Bugzilla:
  //       1670550
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "rename";
  let vm_event = new VMEvent(new_vm, event);
  let targets = [new_vm, new_vm.cluster, new_vm.host, new_vm.provider];

  logger.info(
    "Will generate event %r on machine %r",
    event,
    new_vm.name
  );

  wait_for(
    vm_event.emit,
    {timeout: "7m", message: `Event ${event} failed`}
  );

  vm_event.catch_in_timelines(soft_assert, targets)
};

function test_infra_timeline_delete_event(new_vm, soft_assert) {
  let targets;

  // Test that the event delete is visible on the  management event timeline of the Vm,
  //   Vm's cluster,  VM's host, VM's provider.
  // 
  //   Metadata:
  //       test_flag: events, provision, timelines
  // 
  //   Bugzilla:
  //       1550488
  //       1670550
  //       1747132
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       initialEstimate: 1/4h
  //       casecomponent: Events
  //   
  let event = "delete";
  let vm_event = new VMEvent(new_vm, event);

  if (is_bool(new_vm.provider.one_of(RHEVMProvider))) {
    targets = [new_vm, new_vm.cluster, new_vm.provider]
  } else {
    targets = [new_vm, new_vm.cluster, new_vm.host, new_vm.provider]
  };

  logger.info(
    "Will generate event %r on machine %r",
    event,
    new_vm.name
  );

  wait_for(
    vm_event.emit,
    {timeout: "7m", message: `Event ${event} failed`}
  );

  navigate_to(new_vm, "ArchiveDetails");
  vm_event.catch_in_timelines(soft_assert, targets)
}
