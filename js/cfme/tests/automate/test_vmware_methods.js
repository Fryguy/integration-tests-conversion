// This module contains tests that exercise the canned VMware Automate stuff.
require_relative("textwrap");
include(Textwrap);
require_relative("widgetastic/widget");
include(Widgetastic.Widget);
require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/common");
include(Cfme.Common);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.automate,
  pytest.mark.meta({server_roles: "+automate"}),
  pytest.mark.long_running,
  pytest.mark.tier(3),

  pytest.mark.provider(
    [VMwareProvider],
    {required_fields: [["provisioning", "template"]], scope: "module"}
  )
];

function cls(domain) {
  let original_class = domain.parent.instantiate({name: "ManageIQ"}).namespaces.instantiate({name: "System"}).classes.instantiate({name: "Request"});
  original_class.copy_to({domain});
  return domain.namespaces.instantiate({name: "System"}).classes.instantiate({name: "Request"})
};

function testing_group(appliance) {
  let group_desc = fauxfactory.gen_alphanumeric();

  let group = appliance.collections.button_groups.create({
    text: group_desc,
    hover: group_desc,
    type: appliance.collections.button_groups.VM_INSTANCE
  });

  yield(group);
  group.delete_if_exists()
};

function test_vmware_vimapi_hotadd_disk(appliance, request, testing_group, create_vm, domain, cls) {
  // Tests hot adding a disk to vmware vm. This test exercises the `VMware_HotAdd_Disk` method,
  //      located in `/Integration/VMware/VimApi`
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       casecomponent: Automate
  //       caseimportance: critical
  //       tags: automate
  //       testSteps:
  //           1. It creates an instance in ``System/Request`` that can be accessible from eg. button
  //           2. Then it creates a button, that refers to the ``VMware_HotAdd_Disk`` in ``Request``.
  //              The button shall belong in the VM and instance button group.
  //           3. After the button is created, it goes to a VM's summary page, clicks the button.
  //           4. The test waits until the capacity of disks is raised.
  // 
  //   Bugzilla:
  //       1211627
  //       1311221
  //   
  let view = appliance.browser.create_view(CustomButtonView);
  view.custom_button.item_select(button.text);
  view = appliance.browser.create_view(BaseLoggedInPage);
  view.flash.assert_no_error();

  try {
    wait_for(
      () => _get_disk_capacity.call() > original_disk_capacity,
      {num_sec: 180, delay: 5}
    )
  } finally {
    logger.info("End disk capacity: %s", _get_disk_capacity.call())
  }
}
