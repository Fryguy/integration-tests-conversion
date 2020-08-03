require_relative 'wrapanapi/exceptions'
include Wrapanapi::Exceptions
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/ui'
include Cfme::Base::Ui
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/control/explorer/policies'
include Cfme::Control::Explorer::Policies
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(2), pytest.mark.provider([AzureProvider, EC2Provider], required_flags: ["timelines", "events"]), pytest.mark.usefixtures("setup_provider"), pytest.mark.meta(blockers: [GH("ManageIQ/manageiq-providers-amazon:620", unblock: lambda{|provider| !provider.one_of(EC2Provider)})]), test_requirements.timelines, test_requirements.events]
def mark_vm_as_appliance(create_vm, appliance)
  relations_view = navigate_to(create_vm, "EditManagementEngineRelationship", wait_for_view: 0)
  relations_view.form.server.select_by_visible_text("{name} ({sid})".format(name: appliance.server.name, sid: appliance.server.sid))
  relations_view.form.save_button.click()
end
def control_policy(appliance, create_vm)
  action = appliance.collections.actions.create(fauxfactory.gen_alpha(), "Tag", {})
  policy = appliance.collections.policies.create(VMControlPolicy, fauxfactory.gen_alpha())
  policy.assign_events("VM Power Off")
  policy.assign_actions_to_event("VM Power Off", action)
  profile = appliance.collections.policy_profiles.create(fauxfactory.gen_alpha(), policies: [policy])
  yield(create_vm.assign_policy_profiles(profile.description))
  for obj in [profile, policy, action]
    if is_bool(obj.exists)
      obj.delete()
    end
  end
end
def azone(create_vm, appliance)
  zone_id = create_vm.rest_api_entity.availability_zone_id
  rest_zones = create_vm.appliance.rest_api.collections.availability_zones
  zone_name = next(rest_zones.map{|zone| zone.name})
  inst_zone = appliance.collections.cloud_av_zones.instantiate(name: zone_name, provider: create_vm.provider)
  return inst_zone
end
class InstEvent
  @@ACTIONS = {"create" => {"tl_event" => ["AWS_EC2_Instance_CREATE", "virtualMachines_write_EndRequest"], "tl_category" => "Creation/Addition", "db_event_type" => ["AWS_EC2_Instance_CREATE", "virtualMachines_write_EndRequest"], "emit_cmd" => "_create_vm"}, "start" => {"tl_event" => ["AWS_API_CALL_StartInstances", "AWS_EC2_Instance_running", "virtualMachines_start_EndRequest"], "tl_category" => "Power Activity", "db_event_type" => ["AWS_EC2_Instance_running", "virtualMachines_start_EndRequest"], "emit_cmd" => "_power_on"}, "stop" => {"tl_event" => ["AWS_API_CALL_StopInstances", "AWS_EC2_Instance_stopped", "virtualMachines_deallocate_EndRequest"], "tl_category" => "Power Activity", "db_event_type" => ["AWS_EC2_Instance_stopped", "virtualMachines_deallocate_EndRequest"], "emit_cmd" => "_power_off"}, "rename" => {"tl_event" => "AWS_EC2_Instance_CREATE", "tl_category" => "Creation/Addition", "db_event_type" => "AWS_EC2_Instance_CREATE", "emit_cmd" => "_rename_vm"}, "delete" => {"tl_event" => ["virtualMachines_delete_EndRequest", "AWS_EC2_Instance_DELETE", "AWS_API_CALL_TerminateInstances"], "tl_category" => "Deletion/Removal", "db_event_type" => ["virtualMachines_delete_EndRequest", "AWS_API_CALL_TerminateInstances"], "emit_cmd" => "_delete_vm"}, "policy" => {"tl_event" => ["vm_poweroff"], "tl_category" => "VM Operation", "emit_cmd" => "_power_off"}}
  def initialize(inst, event)
    @inst = inst
    @event = event
    @__dict__.update(@ACTIONS[@event])
  end
  def emit()
    begin
      emit_action = self.getattr(@emit_cmd)
      emit_action.()
    rescue NoMethodError
      raise NoMethodError, "{} is not a valid key in ACTION. self: {}".format(@event, @__dict__)
    end
  end
  def _create_vm()
    if is_bool(!@inst.exists_on_provider)
      @inst.create_on_provider(allow_skip: "default", find_in_cfme: true)
    else
      logger.info("%r already exists on provider", @inst.name)
    end
  end
  def _power_on()
    return @inst.mgmt.start()
  end
  def _power_off()
    return @inst.mgmt.stop()
  end
  def _power_off_power_on()
    @inst.mgmt.stop()
    return @inst.mgmt.start()
  end
  def _restart()
    return @inst.mgmt.restart()
  end
  def _rename_vm()
    logger.info("%r will be renamed", @inst.name)
    new_name = "#{@inst.name}-renamed"
    @inst.mgmt.rename(new_name)
    @inst.name = new_name
    @inst.mgmt.restart()
    @inst.provider.refresh_provider_relationships()
    @inst.wait_to_appear()
    return @inst.name
  end
  def _delete_vm()
    begin
      logger.info("attempting to delete vm %s", @inst.name)
      @inst.mgmt.cleanup()
    rescue NotFoundError
      logger.info("can't delete vm %r, does not exist", @inst.name)
      # pass
    end
  end
  def _check_timelines(target, policy_events)
    # Verify that the event is present in the timeline
    # 
    #     Args:
    #         target: A entity where a Timeline is present (Instance, Availability zone, Provider...)
    #         policy_events: switch between the management event timeline and the policy timeline.
    #     Returns:
    #          The length of the array containing the event found on the Timeline of the target.
    #     
    _get_timeline_events = lambda do |target, policy_events|
      # Navigate to the timeline of the target and select the management timeline or the
      #       policy timeline. Returns an array of the found events.
      #       
      timelines_view = navigate_to(target, "Timelines", wait_for_view: 20, force: true)
      if is_bool(timelines_view.is_a? ServerDiagnosticsView)
        timelines_view = timelines_view.timelines
      end
      timeline_filter = timelines_view.filter
      if is_bool(policy_events)
        logger.info("Will search in Policy event timelines")
        timelines_view.filter.event_type.select_by_visible_text("Policy Events")
        timeline_filter.policy_event_category.select_by_visible_text(@tl_category)
        timeline_filter.policy_event_status.fill("Both")
      else
        if timelines_view.browser.product_version < "5.10"
          timeline_filter.detailed_events.fill(true)
        end
        for selected_option in timeline_filter.event_category.all_selected_options
          timeline_filter.event_category.select_by_visible_text(selected_option)
        end
        timeline_filter.event_category.select_by_visible_text(@tl_category)
      end
      timeline_filter.time_position.select_by_visible_text("centered")
      timeline_filter.apply.click()
      logger.info("Searching for event type: %r in timeline category: %r", @event, @tl_category)
      return timelines_view.chart.get_events(@tl_category)
    end
    events_list = _get_timeline_events.call(target, policy_events)
    logger.debug("events_list: %r", events_list.to_s)
    if is_bool(!events_list)
      @inst.provider.refresh_provider_relationships()
      logger.warning("Event list of %r is empty!", target)
    end
    found_events = []
    for evt in events_list
      begin
        if is_bool(!policy_events)
          if is_bool(@inst.name.include?(evt.source_instance) && @tl_event.include?(evt.event_type))
            found_events.push(evt)
            break
          end
        else
          if is_bool(@tl_event.include?(evt.event_type) && @inst.name.include?(evt.target))
            found_events.push(evt)
            break
          end
        end
      rescue NoMethodError => err
        logger.warning("Issue with TimelinesEvent: %r .Faulty event: %r", err.to_s, evt.to_s)
        next
      end
    end
    logger.info("found events on %r: %s", target, found_events.map{|e| repr(e)}.join("
"))
    return found_events.size
  end
  def catch_in_timelines(soft_assert, targets, policy_events: false)
    for target in targets
      begin
        wait_for(_check_timelines, [target, policy_events], timeout: "15m", fail_condition: 0)
      rescue TimedOutError
        soft_assert.(false, "0 occurrence of {evt} found on the timeline of {tgt}".format(evt: @event, tgt: target))
      end
    end
  end
  def self.ACTIONS; @@ACTIONS; end
  def self.ACTIONS=(val); @@ACTIONS=val; end
  def ACTIONS; @ACTIONS = @@ACTIONS if @ACTIONS.nil?; @ACTIONS; end
  def ACTIONS=(val); @ACTIONS=val; end
end
def test_cloud_timeline_create_event(create_vm, soft_assert, azone)
  # 
  #   Metadata:
  #       test_flag: timelines, events
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       initialEstimate: 1/4h
  #       casecomponent: Events
  #   
  if is_bool(BZ(1670550).blocks)
    targets = [create_vm]
  else
    targets = [create_vm, create_vm.provider, azone]
  end
  event = "create"
  inst_event = InstEvent.new(create_vm, event)
  logger.info("Will generate event %r on machine %r", event, create_vm.name)
  wait_for(inst_event.emit, timeout: "9m", message: "Event #{event} did timeout")
  inst_event.catch_in_timelines(soft_assert, targets)
end
def test_cloud_timeline_policy_event(create_vm, control_policy, soft_assert)
  # 
  #   Metadata:
  #       test_flag: timelines, events
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       initialEstimate: 1/4h
  #       casecomponent: Events
  #   
  event = "policy"
  if is_bool(BZ(1670550).blocks)
    targets = [create_vm]
  else
    targets = [create_vm, create_vm.provider]
  end
  inst_event = InstEvent.new(create_vm, event)
  logger.info("Will generate event %r on machine %r", event, create_vm.name)
  wait_for(inst_event.emit, timeout: "9m", message: "Event #{event} did timeout")
  inst_event.catch_in_timelines(soft_assert, targets, policy_events: true)
end
def test_cloud_timeline_stop_event(create_vm, soft_assert, azone)
  # 
  #   Metadata:
  #       test_flag: timelines, events
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       initialEstimate: 1/4h
  #       casecomponent: Events
  #   
  if is_bool(BZ(1670550).blocks)
    targets = [create_vm]
  else
    targets = [create_vm, create_vm.provider, azone]
  end
  event = "stop"
  inst_event = InstEvent.new(create_vm, event)
  logger.info("Will generate event %r on machine %r", event, create_vm.name)
  wait_for(inst_event.emit, timeout: "7m", message: "Event #{event} did timeout")
  inst_event.catch_in_timelines(soft_assert, targets)
end
def test_cloud_timeline_start_event(create_vm, soft_assert, azone)
  # 
  #   Metadata:
  #       test_flag: timelines, events
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       initialEstimate: 1/4h
  #       casecomponent: Events
  #   
  if is_bool(BZ(1670550).blocks)
    targets = [create_vm]
  else
    targets = [create_vm, create_vm.provider, azone]
  end
  event = "start"
  inst_event = InstEvent.new(create_vm, "start")
  logger.info("Will generate event %r on machine %r", event, create_vm.name)
  wait_for(inst_event.emit, timeout: "7m", message: "Event #{event} did timeout")
  inst_event.catch_in_timelines(soft_assert, targets)
end
def test_cloud_timeline_diagnostic(create_vm, mark_vm_as_appliance, soft_assert)
  # Check Configuration/diagnostic/timelines.
  # 
  #   Metadata:
  #       test_flag: timelines, events
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       initialEstimate: 1/4h
  #       casecomponent: Events
  #   
  event = "create"
  targets = [create_vm.appliance.server]
  inst_event = InstEvent.new(create_vm, event)
  logger.info("Will generate event %r on machine %r", event, create_vm.name)
  inst_event.catch_in_timelines(soft_assert, targets)
end
def test_cloud_timeline_rename_event(create_vm, soft_assert, azone)
  # 
  #   Metadata:
  #       test_flag: timelines, events
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       initialEstimate: 1/4h
  #       casecomponent: Events
  #   
  event = "rename"
  if is_bool(BZ(1670550).blocks)
    targets = [create_vm]
  else
    targets = [create_vm, create_vm.provider, azone]
  end
  inst_event = InstEvent.new(create_vm, event)
  logger.info("Will generate event %r on machine %r", event, create_vm.name)
  wait_for(inst_event.emit, timeout: "12m", message: "Event #{event} did timeout")
  inst_event.catch_in_timelines(soft_assert, targets)
end
def test_cloud_timeline_delete_event(create_vm, soft_assert, azone)
  # 
  #   Metadata:
  #       test_flag: timelines, events
  # 
  #   Bugzilla:
  #       1730819
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       initialEstimate: 1/4h
  #       casecomponent: Events
  #   
  event = "delete"
  if is_bool(BZ(1670550).blocks)
    targets = [create_vm]
  else
    targets = [create_vm, create_vm.provider, azone]
  end
  inst_event = InstEvent.new(create_vm, event)
  logger.info("Will generate event %r on machine %r", event, create_vm.name)
  wait_for(inst_event.emit, timeout: "9m", message: "Event #{event} did timeout")
  inst_event.catch_in_timelines(soft_assert, targets)
end
