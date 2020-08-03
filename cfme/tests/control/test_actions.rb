#  Tests used to check whether assigned actions really do what they're supposed to do. Events are
# not supported by gc and scvmm providers. Tests are uncollected for these
# providers. When the support will be implemented these tests can enabled for them.
# 
# Required YAML keys:
#     * Provider must have section provisioning/template (otherwise test will be skipped)
#     * RHEV-M provider must have provisioning/vlan specified, otherwise the test fails on provis.
#     * There should be a 'datastores_not_for_provision' in the root, being a list of datastores that
#         should not be used for tagging for provisioning. If not present,
#         nothing terrible happens, but provisioning can be then assigned to a datastore that does not
#         work (iso datastore or whatever), therefore failing the provision.
# 
require_relative 'wrapanapi'
include Wrapanapi
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/control/explorer'
include Cfme::Control::Explorer
require_relative 'cfme/control/explorer'
include Cfme::Control::Explorer
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/tests/control'
include Cfme::Tests::Control
require_relative 'cfme/tests/control'
include Cfme::Tests::Control
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.long_running, pytest.mark.meta(server_roles: "+automate +smartproxy +smartstate"), pytest.mark.tier(2), test_requirements.control]
def _get_vm(request, provider, template_name)
  vm_name = ("long-") + random_vm_name("action", max_length: 16)
  if is_bool(provider.one_of(RHEVMProvider))
    kwargs = {"cluster" => provider.data["default_cluster"]}
  else
    if is_bool(provider.one_of(OpenStackProvider))
      kwargs = {}
      if provider.data.templates.include?("small_template")
        kwargs = {"flavor_name" => provider.data.provisioning.get("instance_type")}
      end
    else
      if is_bool(provider.one_of(SCVMMProvider))
        kwargs = {"host_group" => provider.data.get("provisioning", {}).get("host_group", "All Hosts")}
      else
        kwargs = {}
      end
    end
  end
  collection = provider.appliance.provider_based_collection(provider)
  vm = collection.instantiate(vm_name, provider, template_name)
  vm.create_on_provider(delete_on_failure: true, find_in_cfme: true, None: kwargs)
  request.addfinalizer(vm.cleanup_on_provider)
  provider.refresh_provider_relationships()
  return vm
end
def vm(request, provider, setup_provider_modscope, small_template_modscope)
  return _get_vm(request, provider, small_template_modscope.name)
end
def vm_big(request, provider, setup_provider_modscope, big_template_modscope)
  return _get_vm(request, provider, big_template_modscope.name)
end
def policy_name()
  return fauxfactory.gen_alphanumeric(28, start: "action_testing: policy ")
end
def policy_profile_name()
  return fauxfactory.gen_alphanumeric(35, start: "action_testing: policy profile ")
end
def compliance_condition(appliance)
  condition_collection = appliance.collections.conditions
  _compliance_condition = condition_collection.create(conditions.VMCondition, fauxfactory.gen_alpha(), expression: "fill_tag(VM and Instance.My Company Tags : Service Level, Gold)")
  yield _compliance_condition
  _compliance_condition.delete_if_exists()
end
def compliance_policy(vm, policy_name, appliance)
  compliance_policy = appliance.collections.policies.create(policies.VMCompliancePolicy, , scope: )
  return compliance_policy
end
def compliance_tag(appliance)
  category = appliance.collections.categories.instantiate("Service Level")
  tag = category.collections.tags.instantiate(name: "gold", display_name: "Gold")
  return tag
end
def policy_for_testing(provider, vm, policy_name, policy_profile_name, compliance_policy, compliance_condition, appliance)
  control_policy = appliance.collections.policies.create(policies.VMControlPolicy, policy_name, scope: )
  policy_profile_collection = appliance.collections.policy_profiles
  policy_profile = policy_profile_collection.create(policy_profile_name, policies: [control_policy, compliance_policy])
  provider.assign_policy_profiles(policy_profile_name)
  yield control_policy
  provider.unassign_policy_profiles(policy_profile_name)
  policy_profile.delete()
  compliance_policy.delete()
  control_policy.delete()
end
def host(provider, setup_provider_modscope)
  return provider.hosts.all()[0]
end
def host_policy(appliance, host)
  control_policy = appliance.collections.policies.create(policies.HostControlPolicy, fauxfactory.gen_alphanumeric(35, start: "action_testing: host policy "))
  policy_profile_collection = appliance.collections.policy_profiles
  policy_profile = policy_profile_collection.create(fauxfactory.gen_alphanumeric(40, start: "action_testing: host policy profile "), policies: [control_policy])
  host.assign_policy_profiles(policy_profile.description)
  yield control_policy
  host.unassign_policy_profiles(policy_profile.description)
  policy_profile.delete()
  control_policy.delete()
end
def vm_on(vm)
  #  Ensures that the VM is on when the control goes to the test.
  vm.mgmt.wait_for_steady_state()
  vm.mgmt.ensure_state(VmState.RUNNING)
  return
end
def vm_off(vm)
  #  Ensures that the VM is off when the control goes to the test.
  vm.mgmt.wait_for_steady_state()
  vm.mgmt.ensure_state(VmState.STOPPED)
  return
end
def test_action_start_virtual_machine_after_stopping(request, vm, vm_on, policy_for_testing)
  #  This test tests action 'Start Virtual Machine'
  # 
  #   This test sets the policy that it turns on the VM when it is turned off
  #   (https://www.youtube.com/watch?v=UOn4gxj2Dso), then turns the VM off and waits for it coming
  #   back alive.
  # 
  #   Bugzilla:
  #       1531547
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  policy_for_testing.assign_actions_to_event("VM Power Off", ["Start Virtual Machine"])
  _cleanup = lambda do
    policy_for_testing.unassign_events("VM Power Off")
  end
  vm.mgmt.stop()
  begin
    vm.mgmt.wait_for_state(VmState.RUNNING, timeout: 600, delay: 5)
  rescue TimedOutError
    pytest.fail()
  end
end
def test_action_stop_virtual_machine_after_starting(request, vm, vm_off, policy_for_testing)
  #  This test tests action 'Stop Virtual Machine'
  # 
  #   This test sets the policy that it turns off the VM when it is turned on
  #   (https://www.youtube.com/watch?v=UOn4gxj2Dso), then turns the VM on and waits for it coming
  #   back off.
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  policy_for_testing.assign_actions_to_event("VM Power On", ["Stop Virtual Machine"])
  _cleanup = lambda do
    policy_for_testing.unassign_events("VM Power On")
  end
  vm.mgmt.start()
  begin
    vm.mgmt.wait_for_state(VmState.STOPPED, timeout: 600, delay: 5)
  rescue TimedOutError
    pytest.fail()
  end
end
def test_action_suspend_virtual_machine_after_starting(request, vm, vm_off, policy_for_testing)
  #  This test tests action 'Suspend Virtual Machine'
  # 
  #   This test sets the policy that it suspends the VM when it's turned on. Then it powers on the vm,
  #   waits for it becoming alive and then it waits for the VM being suspended.
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  policy_for_testing.assign_actions_to_event("VM Power On", ["Suspend Virtual Machine"])
  _cleanup = lambda do
    policy_for_testing.unassign_events("VM Power On")
  end
  vm.mgmt.start()
  vm.mgmt.ensure_state(VmState.RUNNING)
  begin
    vm.mgmt.wait_for_state(VmState.SUSPENDED, timeout: 600, delay: 5)
  rescue TimedOutError
    pytest.fail()
  end
end
def test_action_prevent_event(request, vm, vm_off, policy_for_testing)
  #  This test tests action 'Prevent current event from proceeding'
  # 
  #   This test sets the policy that it prevents powering the VM up. Then the vm is powered up
  #   and then it waits that VM does not come alive.
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  policy_for_testing.assign_actions_to_event("VM Power On Request", ["Prevent current event from proceeding"])
  _cleanup = lambda do
    policy_for_testing.unassign_events("VM Power On Request")
  end
  vm.power_control_from_cfme(option: vm.POWER_ON, cancel: false)
  begin
    vm.mgmt.wait_for_state(VmState.RUNNING, timeout: 180, delay: 5)
  rescue TimedOutError
    # pass
  end
end
def test_action_prevent_vm_retire(request, vm, vm_on, policy_for_testing)
  # This test sets the policy that prevents VM retiring.
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Bugzilla:
  #       1702018
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  policy_for_testing.assign_actions_to_event("VM Retire Request", ["Prevent current event from proceeding"])
  _cleanup = lambda do
    policy_for_testing.unassign_events("VM Retire Request")
  end
  vm.retire()
  _fail_func = lambda do
    view = navigate_to(method(:vm), "Details")
    vm.refresh_relationships(from_details: true)
    view.toolbar.reload.click()
    return
  end
  begin
    wait_for(lambda{|| vm.is_retired}, num_sec: 300, delay: 15, message: "Waiting for vm retiring", fail_func: _fail_func)
  rescue TimedOutError
    # pass
  end
end
def test_action_prevent_ssa(request, configure_fleecing, vm, vm_on, policy_for_testing)
  # Tests preventing Smart State Analysis.
  # 
  #   This test sets the policy that prevents VM analysis.
  # 
  #   Bugzilla:
  #       1433084
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/4h
  #       casecomponent: Control
  #   
  policy_for_testing.assign_actions_to_event("VM Analysis Request", ["Prevent current event from proceeding"])
  _cleanup = lambda do
    policy_for_testing.unassign_events("VM Analysis Request")
  end
  policy_result = LogValidator("/var/www/miq/vmdb/log/policy.log", matched_patterns: [])
  policy_result.start_monitoring()
  wait_for_ssa_enabled(method(:vm))
  begin
    do_scan(method(:vm))
  rescue TimedOutError
    raise unless policy_result.validate(wait: "120s")
  end
end
def test_action_prevent_host_ssa(request, host, host_policy)
  # Tests preventing Smart State Analysis on a host.
  # 
  #   This test sets the policy that prevents host analysis.
  # 
  #   Bugzilla:
  #       1437910
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/4h
  #       casecomponent: Control
  #   
  host_policy.assign_actions_to_event("Host Analysis Request", ["Prevent current event from proceeding"])
  _cleanup = lambda do
    host_policy.unassign_events("Host Analysis Request")
  end
  policy_result = LogValidator("/var/www/miq/vmdb/log/policy.log", matched_patterns: [])
  policy_result.start_monitoring()
  view = navigate_to(method(:host), "Details")
  _scan = lambda do
    return view.entities.summary("Relationships").get_text_of("Drift History")
  end
  original = _scan.call()
  view.toolbar.configuration.item_select("Perform SmartState Analysis", handle_alert: true)
  view.flash.assert_success_message()
  begin
    wait_for(lambda{|| _scan.call() != original}, num_sec: 60, delay: 5, fail_func: view.browser.refresh, message: "Check if Drift History field is changed")
  rescue TimedOutError
    raise unless policy_result.validate(wait: "120s")
  end
end
def test_action_power_on_logged(request, vm, vm_off, policy_for_testing)
  #  This test tests action 'Generate log message'.
  # 
  #   This test sets the policy that it logs powering on of the VM. Then it powers up the vm and
  #   checks whether logs contain message about that.
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  policy_result = LogValidator("/var/www/miq/vmdb/log/policy.log", matched_patterns: [(".*policy: \\[{}\\], event: \\[VM Power On\\], entity name: \\[{}\\]").format(policy_for_testing.description, vm.name)])
  policy_result.start_monitoring()
  policy_for_testing.assign_actions_to_event("VM Power On", ["Generate log message"])
  _cleanup = lambda do
    policy_for_testing.unassign_events("VM Power On")
  end
  vm.mgmt.ensure_state(VmState.RUNNING)
  raise unless policy_result.validate(wait: "120s")
end
def test_action_power_on_audit(request, vm, vm_off, policy_for_testing)
  #  This test tests action 'Generate Audit Event'.
  # 
  #   This test sets the policy that it logs powering on of the VM. Then it powers up the vm and
  #   checks whether audit logs contain message about that.
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  policy_result = LogValidator("/var/www/miq/vmdb/log/audit.log", matched_patterns: [(".*policy: \\[{}\\], event: \\[VM Power On\\]").format(policy_for_testing.description)])
  policy_result.start_monitoring()
  policy_for_testing.assign_actions_to_event("VM Power On", ["Generate Audit Event"])
  _cleanup = lambda do
    policy_for_testing.unassign_events("VM Power On")
  end
  vm.mgmt.ensure_state(VmState.RUNNING)
  raise unless policy_result.validate("180s")
end
def test_action_create_snapshot_and_delete_last(appliance, request, vm, vm_on, policy_for_testing)
  #  This test tests actions 'Create a Snapshot' (custom) and 'Delete Most Recent Snapshot'.
  # 
  #   This test sets the policy that it makes snapshot of VM after it's powered off and when it is
  #   powered back on, it deletes the last snapshot.
  # 
  #   Bugzilla:
  #       1745065
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  snapshot_name = fauxfactory.gen_alphanumeric(start: "snap_")
  snapshot_create_action = appliance.collections.actions.create(fauxfactory.gen_alphanumeric(), action_type: "Create a Snapshot", action_values: {"snapshot_name" => snapshot_name})
  policy_for_testing.assign_actions_to_event("VM Power Off", [snapshot_create_action])
  policy_for_testing.assign_actions_to_event("VM Power On", ["Delete Most Recent Snapshot"])
  finalize = lambda do
    policy_for_testing.unassign_events("VM Power Off", "VM Power On")
    snapshot_create_action.delete()
  end
  snapshots_before = vm.total_snapshots
  vm.mgmt.ensure_state(VmState.STOPPED)
  wait_for(lambda{|| vm.total_snapshots > snapshots_before}, num_sec: 800, message: "wait for snapshot appear", delay: 5)
  snapshots_before = vm.total_snapshots
  vm.mgmt.ensure_state(VmState.RUNNING)
  wait_for(lambda{|| vm.total_snapshots < snapshots_before}, num_sec: 800, message: "wait for snapshot deleted", delay: 5)
end
def test_action_create_snapshots_and_delete_them(request, appliance, vm, vm_on, policy_for_testing)
  #  This test tests actions 'Create a Snapshot' (custom) and 'Delete all Snapshots'.
  # 
  #   This test sets the policy that it makes snapshot of VM after it's powered off and then it cycles
  #   several time that it generates a couple of snapshots. Then the 'Delete all Snapshots' is
  #   assigned to power on event, VM is powered on and it waits for all snapshots to disappear.
  # 
  #   Bugzilla:
  #       1549529
  #       1745065
  #       1748410
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  snapshot_name = fauxfactory.gen_alphanumeric(start: "snap_")
  snapshot_create_action = appliance.collections.actions.create(fauxfactory.gen_alphanumeric(), action_type: "Create a Snapshot", action_values: {"snapshot_name" => snapshot_name})
  policy_for_testing.assign_actions_to_event("VM Power Off", [snapshot_create_action])
  finalize = lambda do
    policy_for_testing.unassign_events("VM Power Off", "VM Power On")
    snapshot_create_action.delete()
  end
  create_one_snapshot = lambda do |n|
    # 
    #     Args:
    #         n: Sequential number of snapshot for logging.
    #     
    snapshots_before = vm.total_snapshots
    vm.mgmt.ensure_state(VmState.STOPPED)
    wait_for(lambda{|| vm.total_snapshots > snapshots_before}, num_sec: 800, message: "wait for snapshot %d to appear" % n + 1, delay: 5)
    vm.mgmt.ensure_state(VmState.RUNNING)
  end
  for i in 4.times
    create_one_snapshot.call(i)
  end
  policy_for_testing.unassign_events("VM Power Off")
  vm.mgmt.ensure_state(VmState.STOPPED)
  policy_for_testing.assign_actions_to_event("VM Power On", ["Delete all Snapshots"])
  vm.mgmt.ensure_state(VmState.RUNNING)
  wait_for(lambda{|| vm.total_snapshots == 0}, num_sec: 800, message: "wait for snapshots to be deleted", delay: 5)
end
def test_action_initiate_smartstate_analysis(request, configure_fleecing, vm, vm_off, policy_for_testing)
  #  This test tests actions 'Initiate SmartState Analysis for VM'.
  # 
  #   This test sets the policy that it analyses VM after it's powered on. Then it checks whether
  #   that really happened.
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  policy_for_testing.assign_actions_to_event("VM Power On", ["Initiate SmartState Analysis for VM"])
  _cleanup = lambda do
    policy_for_testing.unassign_events("VM Power On")
  end
  vm.power_control_from_cfme(option: vm.POWER_ON, cancel: false, from_details: true)
  wait_for_ssa_enabled(method(:vm))
  begin
    do_scan(method(:vm))
  rescue TimedOutError
    pytest.fail()
  end
end
def test_action_tag(request, vm, vm_off, policy_for_testing, appliance)
  #  Tests action tag
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  if is_bool(vm.get_tags().map{|tag| tag.category.display_name == "Service Level" && tag.display_name == "Gold"}.is_any?)
    vm.remove_tag("Service Level", "Gold")
  end
  tag_assign_action = appliance.collections.actions.create(fauxfactory.gen_alphanumeric(), action_type: "Tag", action_values: {"tag" => ["My Company Tags", "Service Level", "Gold"]})
  policy_for_testing.assign_actions_to_event("VM Power On", [tag_assign_action])
  finalize = lambda do
    policy_for_testing.unassign_events("VM Power On")
    tag_assign_action.delete()
  end
  vm.mgmt.ensure_state(VmState.RUNNING)
  vm.wait_for_vm_state_change(desired_state: vm.STATE_ON, from_details: true)
  begin
    wait_for(lambda{|| vm.get_tags().map{|tag| tag.category.display_name == "Service Level" && tag.display_name == "Gold"}.is_any?}, num_sec: 600, message: "tag presence check")
  rescue TimedOutError
    pytest.fail("Tags were not assigned!")
  end
end
def test_action_untag(request, vm, vm_off, policy_for_testing, appliance, tag)
  #  Tests action untag
  # 
  #   Metadata:
  #       test_flag: actions, provision
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       casecomponent: Control
  #   
  if is_bool(!vm.get_tags().map{|vm_tag| vm_tag.category.display_name == tag.category.display_name && vm_tag.display_name == tag.display_name}.is_any?)
    vm.add_tag(tag)
  end
  _remove_tag = lambda do
    if is_bool(vm.get_tags().map{|vm_tag| vm_tag.category.display_name == tag.category.display_name && vm_tag.display_name == tag.display_name}.is_any?)
      vm.remove_tag(tag)
    end
  end
  tag_unassign_action = appliance.collections.actions.create(fauxfactory.gen_alphanumeric(), action_type: "Remove Tags", action_values: {"remove_tag" => [tag.category.display_name]})
  policy_for_testing.assign_actions_to_event("VM Power On", [tag_unassign_action])
  finalize = lambda do
    policy_for_testing.unassign_events("VM Power On")
    tag_unassign_action.delete()
  end
  vm.mgmt.ensure_state(VmState.RUNNING)
  begin
    wait_for(lambda{|| !vm.get_tags().map{|vm_tag| vm_tag.category.display_name == tag.category.display_name && vm_tag.display_name == tag.display_name}.is_any?}, num_sec: 600, message: "tag presence check")
  rescue TimedOutError
    pytest.fail("Tags were not unassigned!")
  end
end
def test_action_cancel_clone(appliance, request, provider, vm_big, policy_for_testing, compliance_policy)
  # This test checks if 'Cancel vCenter task' action works.
  #   For this test we need big template otherwise CFME won't have enough time
  #   to cancel the task https://bugzilla.redhat.com/show_bug.cgi?id=1383372#c9
  # 
  #   Metadata:
  #       test_flag: policy, actions
  # 
  #   Bugzilla:
  #       1383372
  #       1685201
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/4h
  #       casecomponent: Control
  #   
  update(policy_for_testing) {
    policy_for_testing.scope = "fill_field(VM and Instance : Name, INCLUDES, {})".format(vm_big.name)
  }
  update(compliance_policy) {
    compliance_policy.scope = "fill_field(VM and Instance : Name, INCLUDES, {})".format(vm_big.name)
  }
  policy_for_testing.assign_events("VM Clone Start")
  policy_for_testing.assign_actions_to_event("VM Clone Start", ["Cancel vCenter Task"])
  clone_vm_name = 
  finalize = lambda do
    policy_for_testing.unassign_events("VM Clone Start")
    collection = provider.appliance.provider_based_collection(provider)
    collection.instantiate(clone_vm_name, provider).cleanup_on_provider()
    update(method(:policy_for_testing)) {
      policy_for_testing.scope = "fill_field(VM and Instance : Name, INCLUDES, {})".format(vm.name)
    }
    update(method(:compliance_policy)) {
      compliance_policy.scope = "fill_field(VM and Instance : Name, INCLUDES, {})".format(vm.name)
    }
  end
  vm_big.clone_vm(fauxfactory.gen_email(), "first", "last", clone_vm_name, "VMware")
  request_description = clone_vm_name
  clone_request = appliance.collections.requests.instantiate(description: request_description, partial_check: true)
  clone_request.wait_for_request(method: "ui")
  raise unless clone_request.status == "Error"
end
def test_action_check_compliance(request, vm, policy_for_testing, compliance_policy, compliance_condition, compliance_tag)
  # Tests action \"Check Host or VM Compliance\". Policy profile should have control and compliance
  #   policies. Control policy initiates compliance check and compliance policy determines is the vm
  #   compliant or not. After reloading vm details screen the compliance status should be changed.
  # 
  #   Metadata:
  #       test_flag: policy, actions
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/4h
  #       casecomponent: Control
  #   
  compliance_policy.assign_conditions(compliance_condition)
  if is_bool(vm.get_tags().map{|vm_tag| vm_tag.category.display_name == compliance_tag.category.display_name && vm_tag.display_name == compliance_tag.display_name}.is_any?)
    vm.remove_tag(compliance_tag)
  end
  _remove_tag = lambda do
    compliance_policy.assign_conditions()
    if is_bool(vm.get_tags().map{|vm_tag| vm_tag.category.display_name == compliance_tag.category.display_name && vm_tag.display_name == compliance_tag.display_name}.is_any?)
      vm.remove_tag(method(:compliance_tag))
    end
  end
  policy_for_testing.assign_actions_to_event("Tag Complete", ["Check Host or VM Compliance"])
  _cleanup = lambda do
    policy_for_testing.unassign_events("Tag Complete")
  end
  vm.add_tag(method(:compliance_tag))
  vm.check_compliance()
end
