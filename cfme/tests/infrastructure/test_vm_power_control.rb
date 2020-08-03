require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/common'
include Cfme::Common
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _users users
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.long_running, pytest.mark.tier(2), pytest.mark.usefixtures("setup_provider"), test_requirements.power, pytest.mark.provider([InfraProvider], scope: "class")]
def vm_name()
  return random_vm_name("pwr-c")
end
def testing_vm(appliance, provider, vm_name)
  # Fixture to provision vm to the provider being tested
  vm = appliance.collections.infra_vms.instantiate(vm_name, provider)
  if is_bool(!provider.mgmt.does_vm_exist(vm.name))
    logger.info("deploying %s on provider %s", vm.name, provider.key)
    vm.create_on_provider(allow_skip: "default", find_in_cfme: true)
  end
  yield vm
  vm.cleanup_on_provider()
  if_scvmm_refresh_provider(provider)
end
def archived_vm(testing_vm)
  # Fixture to archive testing VM
  testing_vm.mgmt.delete()
  testing_vm.wait_for_vm_state_change(desired_state: "archived", timeout: 720, from_details: false, from_any_provider: true)
end
def orphaned_vm(provider, testing_vm)
  # Fixture to orphane VM by removing provider from CFME
  provider.delete_if_exists(cancel: false)
  testing_vm.wait_for_vm_state_change(desired_state: "orphaned", timeout: 720, from_details: false, from_any_provider: true)
end
def testing_vm_tools(appliance, provider, vm_name, full_template)
  # Fixture to provision vm with preinstalled tools to the provider being tested
  vm = appliance.collections.infra_vms.instantiate(vm_name, provider, full_template.name)
  if is_bool(!provider.mgmt.does_vm_exist(vm.name))
    logger.info("deploying %s on provider %s", vm.name, provider.key)
    vm.create_on_provider(allow_skip: "default", find_in_cfme: true)
  end
  yield vm
  vm.cleanup_on_provider()
  if_scvmm_refresh_provider(provider)
end
def if_scvmm_refresh_provider(provider)
  if is_bool(provider.one_of(SCVMMProvider))
    provider.refresh_provider_relationships()
  end
end
def check_power_options(provider, soft_assert, vm, power_state)
  must_be_available = {"on" => [vm.POWER_OFF, vm.SUSPEND, vm.RESET], "off" => [vm.POWER_ON]}
  mustnt_be_available = {"on" => [vm.POWER_ON], "off" => [vm.POWER_OFF, vm.SUSPEND, vm.RESET]}
  if is_bool(!provider.one_of(SCVMMProvider))
    mustnt_be_available["off"].concat([vm.GUEST_RESTART, vm.GUEST_SHUTDOWN])
  end
  if is_bool(!provider.one_of(SCVMMProvider, RHEVMProvider))
    mustnt_be_available["on"].concat([vm.GUEST_RESTART, vm.GUEST_SHUTDOWN])
  end
  if is_bool(provider.one_of(RHEVMProvider))
    must_be_available["on"].remove(vm.RESET)
  end
  view = navigate_to(vm, "Details")
  power_dropdown = view.toolbar.power
  for pwr_option in must_be_available[power_state]
    soft_assert.(power_dropdown.item_enabled(pwr_option), ("'{}' must be available in current power state - '{}' ").format(pwr_option, power_state))
  end
  for pwr_option in mustnt_be_available[power_state]
    pwr_state = power_dropdown.has_item(pwr_option) && power_dropdown.item_enabled(pwr_option)
    soft_assert.(!pwr_state, ("'{}' must not be available in current power state - '{}' ").format(pwr_option, power_state))
  end
end
def wait_for_last_boot_timestamp_refresh(vm, boot_time, timeout: 300)
  # Timestamp update doesn't happen with state change so need a longer
  #   wait when expecting a last boot timestamp change
  view = navigate_to(vm, "Details")
  _wait_for_timestamp_refresh = lambda do
    cur_boot_time = view.entities.summary("Power Management").get_text_of("Last Boot Time")
    return boot_time != cur_boot_time
  end
  begin
    wait_for(method(:_wait_for_timestamp_refresh), num_sec: timeout, delay: 30, fail_func: view.toolbar.reload.click)
    return true
  rescue TimedOutError
    return false
  end
end
def ensure_state_changed_on_unchanged(vm, state_changed_on)
  # Returns True if current value of State Changed On in the Power Management
  #   is the same as the supplied (original) value.
  view = navigate_to(vm, "Details")
  new_state_changed_on = view.entities.summary("Power Management").get_text_of("State Changed On")
  return state_changed_on == new_state_changed_on
end
def wait_for_vm_tools(vm, timeout: 300)
  # Sometimes test opens VM details before it gets loaded and can't verify if vmtools are
  #   installed
  view = navigate_to(vm, "Details")
  _wait_for_tools_ok = lambda do
    return view.entities.summary("Properties").get_text_of("Platform Tools") == "toolsOk"
  end
  begin
    wait_for(method(:_wait_for_tools_ok), num_sec: timeout, delay: 10, fail_func: view.toolbar.reload.click)
  rescue TimedOutError
    return false
  end
end
class TestControlOnQuadicons
  def test_power_off_cancel(testing_vm, ensure_vm_running, soft_assert)
    # Tests power off cancel
    # 
    #     Metadata:
    #         test_flag: power_control, provision
    # 
    #     Polarion:
    #         assignee: prichard
    #         casecomponent: Infra
    #         initialEstimate: 1/10h
    #     
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_ON, timeout: 720)
    testing_vm.power_control_from_cfme(option: testing_vm.POWER_OFF, cancel: true)
    if_scvmm_refresh_provider(testing_vm.provider)
    time.sleep(60)
    vm_state = testing_vm.find_quadicon().data["state"]
    soft_assert.(vm_state == "on")
    soft_assert.(testing_vm.mgmt.is_running, "vm not running")
  end
  def test_power_off(appliance, testing_vm, ensure_vm_running, soft_assert)
    # Tests power off
    # 
    #     Polarion:
    #         assignee: prichard
    #         initialEstimate: 1/6h
    #         casecomponent: Infra
    #         caseimportance: high
    #         tags: power
    #     
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_ON, timeout: 720)
    testing_vm.power_control_from_cfme(option: testing_vm.POWER_OFF, cancel: false)
    view = appliance.browser.create_view(BaseLoggedInPage)
    view.flash.assert_success_message(text: "Stop initiated", partial: true)
    if_scvmm_refresh_provider(testing_vm.provider)
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_OFF, timeout: 900)
    vm_state = testing_vm.find_quadicon().data["state"]
    soft_assert.(vm_state == "off")
    soft_assert.(!testing_vm.mgmt.is_running, "vm running")
  end
  def test_power_on_cancel(testing_vm, ensure_vm_stopped, soft_assert)
    # Tests power on cancel
    # 
    #     Polarion:
    #         assignee: prichard
    #         initialEstimate: 1/4h
    #         casecomponent: Infra
    #         caseimportance: high
    #         tags: power
    #     
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_OFF, timeout: 720)
    testing_vm.power_control_from_cfme(option: testing_vm.POWER_ON, cancel: true)
    if_scvmm_refresh_provider(testing_vm.provider)
    time.sleep(60)
    vm_state = testing_vm.find_quadicon().data["state"]
    soft_assert.(vm_state == "off")
    soft_assert.(!testing_vm.mgmt.is_running, "vm running")
  end
  def test_power_on(appliance, testing_vm, ensure_vm_stopped, soft_assert)
    # Tests power on
    # 
    #     Metadata:
    #         test_flag: power_control, provision
    # 
    #     Polarion:
    #         assignee: prichard
    #         initialEstimate: 1/6h
    #         casecomponent: Infra
    #         caseimportance: high
    #         tags: power
    #     
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_OFF, timeout: 720)
    testing_vm.power_control_from_cfme(option: testing_vm.POWER_ON, cancel: false)
    view = appliance.browser.create_view(BaseLoggedInPage)
    view.flash.assert_success_message(text: "Start initiated", partial: true)
    if_scvmm_refresh_provider(testing_vm.provider)
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_ON, timeout: 900)
    vm_state = testing_vm.find_quadicon().data["state"]
    soft_assert.(vm_state == "on")
    soft_assert.(testing_vm.mgmt.is_running, "vm not running")
  end
end
class TestVmDetailsPowerControlPerProvider
  def test_power_off(appliance, testing_vm, ensure_vm_running, soft_assert)
    # Tests power off
    # 
    #     Metadata:
    #         test_flag: power_control, provision
    # 
    #     Polarion:
    #         assignee: prichard
    #         initialEstimate: 1/6h
    #         casecomponent: Infra
    #         caseimportance: high
    #         tags: power
    #     
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_ON, timeout: 720, from_details: true)
    view = navigate_to(testing_vm, "Details")
    last_boot_time = view.entities.summary("Power Management").get_text_of("Last Boot Time")
    testing_vm.power_control_from_cfme(option: testing_vm.POWER_OFF, cancel: false, from_details: true)
    view.flash.assert_success_message(text: "Stop initiated", partial: true)
    if_scvmm_refresh_provider(testing_vm.provider)
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_OFF, timeout: 720, from_details: true)
    soft_assert.(!testing_vm.mgmt.is_running, "vm running")
    if is_bool(!testing_vm.provider.one_of(RHEVMProvider))
      new_last_boot_time = view.entities.summary("Power Management").get_text_of("Last Boot Time")
      soft_assert.(new_last_boot_time == last_boot_time, )
    end
  end
  def test_power_on(appliance, testing_vm, ensure_vm_stopped, soft_assert)
    # Tests power on
    # 
    #     Metadata:
    #         test_flag: power_control, provision
    # 
    #     Polarion:
    #         assignee: prichard
    #         initialEstimate: 1/6h
    #         casecomponent: Infra
    #         caseimportance: high
    #         tags: power
    #     
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_OFF, timeout: 720, from_details: true)
    testing_vm.power_control_from_cfme(option: testing_vm.POWER_ON, cancel: false, from_details: true)
    view = appliance.browser.create_view(BaseLoggedInPage)
    view.flash.assert_success_message(text: "Start initiated", partial: true)
    if_scvmm_refresh_provider(testing_vm.provider)
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_ON, timeout: 720, from_details: true)
    soft_assert.(testing_vm.mgmt.is_running, "vm not running")
  end
  def test_suspend(appliance, testing_vm, ensure_vm_running, soft_assert)
    # Tests suspend
    # 
    #     Polarion:
    #         assignee: prichard
    #         initialEstimate: 1/6h
    #         casecomponent: Infra
    #         caseimportance: high
    #         tags: power
    # 
    #     Bugzilla:
    #         1174858
    #     
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_ON, timeout: 720, from_details: true)
    view = navigate_to(testing_vm, "Details")
    last_boot_time = view.entities.summary("Power Management").get_text_of("Last Boot Time")
    testing_vm.power_control_from_cfme(option: testing_vm.SUSPEND, cancel: false, from_details: true)
    view.flash.assert_success_message(text: "Suspend initiated", partial: true)
    if_scvmm_refresh_provider(testing_vm.provider)
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_SUSPENDED, timeout: 450, from_details: true)
    soft_assert.(testing_vm.mgmt.is_suspended, "vm not suspended")
    if is_bool(!testing_vm.provider.one_of(RHEVMProvider))
      new_last_boot_time = view.entities.summary("Power Management").get_text_of("Last Boot Time")
      soft_assert.(new_last_boot_time == last_boot_time, )
    end
  end
  def test_start_from_suspend(appliance, testing_vm, ensure_vm_suspended, soft_assert)
    # Tests start from suspend
    # 
    #     Polarion:
    #         assignee: prichard
    #         initialEstimate: 1/6h
    #         casecomponent: Infra
    #         caseimportance: high
    #         tags: power
    # 
    #     
    begin
      testing_vm.provider.refresh_provider_relationships()
      testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_SUSPENDED, timeout: 450, from_details: true)
    rescue TimedOutError
      if is_bool(testing_vm.provider.one_of(RHEVMProvider))
        logger.warning("working around bz1174858, ignoring timeout")
      else
        raise
      end
    end
    view = navigate_to(testing_vm, "Details")
    last_boot_time = view.entities.summary("Power Management").get_text_of("Last Boot Time")
    testing_vm.power_control_from_cfme(option: testing_vm.POWER_ON, cancel: false, from_details: true)
    view.flash.assert_success_message(text: "Start initiated", partial: true)
    if_scvmm_refresh_provider(testing_vm.provider)
    testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_ON, timeout: 720, from_details: true)
    wait_for_last_boot_timestamp_refresh(testing_vm, last_boot_time, timeout: 600)
    soft_assert.(testing_vm.mgmt.is_running, "vm not running")
  end
end
def test_no_template_power_control(provider, soft_assert)
  #  Ensures that no power button is displayed for templates.
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Infra
  #       initialEstimate: 1/10h
  #       setup:
  #           1. An infra provider that has some templates.
  #       testSteps:
  #           1. Open the view of all templates of the provider
  #           2. Verify the Power toolbar button is not visible
  #           3. Select some template using the checkbox
  #           4. Verify the Power toolbar button is not visible
  #           5. Click on some template to get into the details page
  #           6. Verify the Power toolbar button is not visible
  # 
  #   Bugzilla:
  #       1496383
  #       1634713
  #   
  view = navigate_to(provider, "ProviderTemplates")
  view.toolbar.view_selector.select("Grid View")
  soft_assert.(!view.toolbar.power.is_displayed, "Power displayed in template grid view!")
  templates = view.entities.all_entity_names
  template_name = random.choice(templates)
  selected_template = provider.appliance.collections.infra_templates.instantiate(template_name, provider)
  view = navigate_to(selected_template, "AllForProvider", use_resetter: false)
  entity = view.entities.get_entity(name: selected_template.name, surf_pages: true)
  entity.ensure_checked()
  for action in view.toolbar.power.to_a
    view.toolbar.power.item_select(action, handle_alert: true)
    if action == "Power On"
      action = "Start"
    else
      if action == "Power Off"
        action = "Stop"
      end
    end
    view.flash.assert_message()
    view.flash.dismiss()
  end
  entity.click()
  soft_assert.(!view.toolbar.power.is_displayed, "Power displayed in template details!")
end
def test_no_power_controls_on_archived_vm(appliance, testing_vm, archived_vm, soft_assert)
  #  Ensures that no power button is displayed from details view of archived vm
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Infra
  #       initialEstimate: 1/10h
  #       setup:
  #           1. Archived VM should be available
  #       testSteps:
  #           1. Open the view of VM Details
  #           2. Verify the Power toolbar button is not visible
  # 
  #   Bugzilla:
  #       1520489
  #       1659340
  #   
  view = navigate_to(testing_vm, "AnyProviderDetails", use_resetter: false)
  status = view.toolbar.power.getattr("is_enabled")
  raise "Power displayed in archived VM's details!" unless !status
end
def test_archived_vm_status(testing_vm, archived_vm)
  # Tests archived vm status
  # 
  #   Metadata:
  #       test_flag: inventory
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #       tags: power
  #   
  vm_state = testing_vm.find_quadicon(from_any_provider: true).data["state"]
  raise unless vm_state == "archived"
end
def test_orphaned_vm_status(testing_vm, orphaned_vm)
  # Tests orphaned vm status
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/10h
  #       casecomponent: Infra
  #       tags: power
  #   
  vm_state = testing_vm.find_quadicon(from_any_provider: true).data["state"]
  raise unless vm_state == "orphaned"
end
def test_vm_power_options_from_on(provider, soft_assert, testing_vm, ensure_vm_running)
  # Tests vm power options from on
  # 
  #   Metadata:
  #       test_flag: power_control
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_ON, timeout: 720, from_details: true)
  check_power_options(provider, soft_assert, testing_vm, testing_vm.STATE_ON)
end
def test_vm_power_options_from_off(provider, soft_assert, testing_vm, ensure_vm_stopped)
  # Tests vm power options from off
  # 
  #   Metadata:
  #       test_flag: power_control
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  # 
  #   Bugzilla:
  #       1724062
  #   
  testing_vm.wait_for_vm_state_change(desired_state: testing_vm.STATE_OFF, timeout: 720, from_details: true)
  check_power_options(provider, soft_assert, testing_vm, testing_vm.STATE_OFF)
end
def test_guest_os_reset(appliance, provider, testing_vm_tools, ensure_vm_running, soft_assert)
  # Tests vm guest os reset
  # 
  #   Metadata:
  #       test_flag: power_control
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/6h
  #       casecomponent: Infra
  #       tags: power
  # 
  #   Bugzilla:
  #       1571830
  #       1650506
  #   
  wait_for_vm_tools(testing_vm_tools)
  view = navigate_to(testing_vm_tools, "Details")
  last_boot_time = view.entities.summary("Power Management").get_text_of("Last Boot Time")
  state_changed_on = view.entities.summary("Power Management").get_text_of("State Changed On")
  testing_vm_tools.power_control_from_cfme(option: testing_vm_tools.GUEST_RESTART, cancel: false, from_details: true)
  view.flash.assert_success_message(text: "Restart Guest initiated", partial: true)
  if is_bool(!provider.one_of(RHEVMProvider) && BZ(1571830, forced_streams: ["5.10", "5.11"]).blocks)
    soft_assert.(wait_for_last_boot_timestamp_refresh(testing_vm_tools, last_boot_time), "Last Boot Time value has not been refreshed")
  end
  soft_assert.(ensure_state_changed_on_unchanged(testing_vm_tools, state_changed_on), "Value of 'State Changed On' has changed after guest restart")
  soft_assert.(testing_vm_tools.mgmt.is_running, "vm not running")
end
def test_guest_os_shutdown(appliance, provider, testing_vm_tools, ensure_vm_running, soft_assert)
  # Tests vm guest os reset
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/6h
  #       caseimportance: high
  #       casecomponent: Infra
  #       tags: power
  # 
  #   Bugzilla:
  #       1723485
  #       1571895
  #       1650506
  #   
  testing_vm_tools.wait_for_vm_state_change(desired_state: testing_vm_tools.STATE_ON, timeout: 720, from_details: true)
  wait_for_vm_tools(testing_vm_tools)
  view = navigate_to(testing_vm_tools, "Details")
  last_boot_time = view.entities.summary("Power Management").get_text_of("Last Boot Time")
  testing_vm_tools.power_control_from_cfme(option: testing_vm_tools.GUEST_SHUTDOWN, cancel: false, from_details: true)
  view.flash.assert_success_message(text: "Shutdown Guest initiated", partial: true)
  testing_vm_tools.wait_for_vm_state_change(desired_state: testing_vm_tools.STATE_OFF, timeout: 720, from_details: true)
  soft_assert.(!testing_vm_tools.mgmt.is_running, "vm running")
  if is_bool(!BZ(1571895, forced_streams: ["5.10", "5.11"]).blocks && provider.one_of(RHEVMProvider))
    new_last_boot_time = view.entities.summary("Power Management").get_text_of("Last Boot Time")
    soft_assert.(new_last_boot_time == last_boot_time, )
  end
end
def new_user(request, appliance)
  user,user_data = _users(request, appliance, group: "EvmGroup-vm_user")
  yield appliance.collections.users.instantiate(name: user[0].name, credential: Credential(principal: user_data[0]["userid"], secret: user_data[0]["password"]))
  if is_bool(user[0].exists)
    user[0].action.delete()
  end
end
def test_retire_vm_with_vm_user_role(new_user, appliance, testing_vm)
  # 
  #   Bugzilla:
  #       1687597
  # 
  #   Polarion:
  #       assignee: ghubale
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       startsin: 5.10
  #       casecomponent: Automate
  #       setup:
  #           1. Provision vm
  #       testSteps:
  #           1. Create custom user with 'EvmRole_vm-user' role
  #           2. Retire VM by log-in to custom user
  #   
  new_user {
    view = navigate_to(testing_vm.parent, "All")
    view.entities.get_entity(name: testing_vm.name, surf_pages: true).ensure_checked()
    raise unless view.toolbar.lifecycle.item_enabled("Retire selected items")
    testing_vm.retire()
    raise unless testing_vm.wait_for_vm_state_change(desired_state: "retired", timeout: 720, from_details: true)
  }
end
def archive_orphan_vm(request, provider, testing_vm)
  # This fixture is used to create archived or orphaned VM
  if request.param == "archived"
    testing_vm.mgmt.delete()
    testing_vm.wait_for_vm_state_change(desired_state: "archived", timeout: 720, from_details: false, from_any_provider: true)
  else
    provider.delete_if_exists(cancel: false)
    testing_vm.wait_for_vm_state_change(desired_state: "orphaned", timeout: 720, from_details: false, from_any_provider: true)
  end
  yield [request.param, testing_vm]
end
def test_power_options_on_archived_orphaned_vms_all_page(appliance, archive_orphan_vm)
  # This test case is to check Power option drop-down button is disabled on archived and orphaned
  #   VMs all page. Also it performs the power operations on vm and checked expected flash messages.
  # 
  #   Bugzilla:
  #       1655477
  #       1686015
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/2h
  #       caseimportance: low
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: Control
  #       tags: power
  #       testSteps:
  #           1. Add infrastructure provider
  #           2. Navigate to Archived or orphaned VMs all page
  #           3. Select any VM and click on power option drop-down
  #   
  infra_vms = appliance.collections.infra_vms
  state,testing_vm = archive_orphan_vm
  if state == "archived"
    view = navigate_to(infra_vms, "ArchivedAll")
    testing_vm.find_quadicon(from_archived_all: true).ensure_checked()
  else
    view = navigate_to(infra_vms, "OrphanedAll")
    testing_vm.find_quadicon(from_orphaned_all: true).ensure_checked()
  end
  for action in view.toolbar.power.to_a
    view.toolbar.power.item_select(action, handle_alert: true)
    if action == "Power On"
      action = "Start"
    else
      if action == "Power Off"
        action = "Stop"
      end
    end
    view.flash.assert_message()
    view.flash.dismiss()
  end
end
