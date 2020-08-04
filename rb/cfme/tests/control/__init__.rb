require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
def wait_for_ssa_enabled(vm)
  # Waits for \"Perform SmartState Analysis\" item enabled for a vm
  # 
  #   Args:
  #       vm (BaseVM): a vm object
  #   
  vm_details_view = navigate_to(vm, "Details")
  wait_for(vm_details_view.toolbar.configuration.item_enabled, func_args: ["Perform SmartState Analysis"], delay: 10, handle_exception: true, num_sec: 300, fail_func: vm_details_view.toolbar.reload.click)
end
def do_scan(vm, additional_item_check: nil, rediscover: true)
  vm_details_view = navigate_to(vm, "Details")
  if is_bool(rediscover)
    if is_bool(vm.rediscover_if_analysis_data_present())
      vm.assign_policy_profiles(*vm.assigned_policy_profiles)
    end
  end
  _scan = lambda do
    return vm_details_view.entities.summary("Lifecycle").get_text_of("Last Analyzed")
  end
  original = _scan.call()
  if !additional_item_check.equal?(nil)
    title,field = additional_item_check
    original_item = vm_details_view.entities.summary(title).get_text_of(field)
  end
  vm.smartstate_scan(cancel: false, from_details: true)
  vm_details_view.flash.assert_success_message("Analysis initiated for 1 VM and Instance from the CFME Database")
  logger.info("Scan initiated")
  wait_for(lambda{|| _scan.call() != original}, num_sec: 300, delay: 5, fail_func: vm_details_view.toolbar.reload.click, message: "Check if Last Analyzed field changed")
  if !additional_item_check.equal?(nil)
    title,field = additional_item_check
    get_text_of = vm_details_view.entities.summary(title).get_text_of
    wait_for(lambda{|| get_text_of.(field) != original_item}, num_sec: 120, delay: 5, fail_func: vm_details_view.toolbar.reload.click, message: "Check if Last Analyzed field changed")
  end
  logger.info("Scan finished")
end
