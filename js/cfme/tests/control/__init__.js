require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

function wait_for_ssa_enabled(vm) {
  // Waits for \"Perform SmartState Analysis\" item enabled for a vm
  // 
  //   Args:
  //       vm (BaseVM): a vm object
  //   
  let vm_details_view = navigate_to(vm, "Details");

  wait_for(vm_details_view.toolbar.configuration.item_enabled, {
    func_args: ["Perform SmartState Analysis"],
    delay: 10,
    handle_exception: true,
    num_sec: 300,
    fail_func: vm_details_view.toolbar.reload.click
  })
};

function do_scan(vm, { additional_item_check = null, rediscover = true }) {
  let title, field, original_item;
  let vm_details_view = navigate_to(vm, "Details");

  if (is_bool(rediscover)) {
    if (is_bool(vm.rediscover_if_analysis_data_present())) {
      vm.assign_policy_profiles(...vm.assigned_policy_profiles)
    }
  };

  let _scan = () => (
    vm_details_view.entities.summary("Lifecycle").get_text_of("Last Analyzed")
  );

  let original = _scan.call();

  if (!additional_item_check.equal(null)) {
    let [title, field] = additional_item_check;
    original_item = vm_details_view.entities.summary(title).get_text_of(field)
  };

  vm.smartstate_scan({cancel: false, from_details: true});
  vm_details_view.flash.assert_success_message("Analysis initiated for 1 VM and Instance from the CFME Database");
  logger.info("Scan initiated");

  wait_for(() => _scan.call() != original, {
    num_sec: 300,
    delay: 5,
    fail_func: vm_details_view.toolbar.reload.click,
    message: "Check if Last Analyzed field changed"
  });

  if (!additional_item_check.equal(null)) {
    [title, field] = additional_item_check;
    let get_text_of = vm_details_view.entities.summary(title).get_text_of;

    wait_for(() => get_text_of.call(field) != original_item, {
      num_sec: 120,
      delay: 5,
      fail_func: vm_details_view.toolbar.reload.click,
      message: "Check if Last Analyzed field changed"
    })
  };

  logger.info("Scan finished")
}
