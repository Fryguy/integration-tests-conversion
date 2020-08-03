# This module contains tests that exercise the canned VMware Automate stuff.
require_relative 'textwrap'
include Textwrap
require_relative 'widgetastic/widget'
include Widgetastic::Widget
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/common'
include Cfme::Common
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.automate, pytest.mark.meta(server_roles: "+automate"), pytest.mark.long_running, pytest.mark.tier(3), pytest.mark.provider([VMwareProvider], required_fields: [["provisioning", "template"]], scope: "module")]
def cls(domain)
  original_class = domain.parent.instantiate(name: "ManageIQ").namespaces.instantiate(name: "System").classes.instantiate(name: "Request")
  original_class.copy_to(domain: domain)
  return domain.namespaces.instantiate(name: "System").classes.instantiate(name: "Request")
end
def testing_group(appliance)
  group_desc = fauxfactory.gen_alphanumeric()
  group = appliance.collections.button_groups.create(text: group_desc, hover: group_desc, type: appliance.collections.button_groups.VM_INSTANCE)
  yield(group)
  group.delete_if_exists()
end
def test_vmware_vimapi_hotadd_disk(appliance, request, testing_group, create_vm, domain, cls)
  # Tests hot adding a disk to vmware vm. This test exercises the `VMware_HotAdd_Disk` method,
  #      located in `/Integration/VMware/VimApi`
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       casecomponent: Automate
  #       caseimportance: critical
  #       tags: automate
  #       testSteps:
  #           1. It creates an instance in ``System/Request`` that can be accessible from eg. button
  #           2. Then it creates a button, that refers to the ``VMware_HotAdd_Disk`` in ``Request``.
  #              The button shall belong in the VM and instance button group.
  #           3. After the button is created, it goes to a VM's summary page, clicks the button.
  #           4. The test waits until the capacity of disks is raised.
  # 
  #   Bugzilla:
  #       1211627
  #       1311221
  #   
  meth = cls.methods.create(name: fauxfactory.gen_alpha(15, start: "load_value_"), script: dedent("            # Sets the capacity of the new disk.

            $evm.root['size'] = 1  # GB
            exit MIQ_OK
            "))
  request.addfinalizer(meth.delete_if_exists)
  instance = cls.instances.create(name: fauxfactory.gen_alpha(23, start: "VMware_HotAdd_Disk_"), fields: {"meth4" => {"value" => meth.name}, "rel5" => {"value" => "/Integration/VMware/VimApi/VMware_HotAdd_Disk"}})
  request.addfinalizer(instance.delete_if_exists)
  button_name = fauxfactory.gen_alphanumeric()
  button = testing_group.buttons.create(text: button_name, hover: button_name, system: "Request", request: instance.name)
  request.addfinalizer(button.delete_if_exists)
  _get_disk_capacity = lambda do
    view = create_vm.load_details(refresh: true)
    return view.entities.summary("Datastore Allocation Summary").get_text_of("Total Allocation")
  end
  original_disk_capacity = _get_disk_capacity.call()
  logger.info("Initial disk allocation: %s", original_disk_capacity)
  class CustomButtonView < View
    @@custom_button = Dropdown(testing_group.text)
    def self.custom_button; @@custom_button; end
    def self.custom_button=(val); @@custom_button=val; end
    def custom_button; @custom_button = @@custom_button if @custom_button.nil?; @custom_button; end
    def custom_button=(val); @custom_button=val; end
  end
  view = appliance.browser.create_view(CustomButtonView)
  view.custom_button.item_select(button.text)
  view = appliance.browser.create_view(BaseLoggedInPage)
  view.flash.assert_no_error()
  begin
    wait_for(lambda{|| _get_disk_capacity.call() > original_disk_capacity}, num_sec: 180, delay: 5)
  ensure
    logger.info("End disk capacity: %s", _get_disk_capacity.call())
  end
end
