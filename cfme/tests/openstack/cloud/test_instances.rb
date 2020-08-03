# Tests for Openstack cloud instances
require_relative 'selenium/common/exceptions'
include Selenium::Common::Exceptions
require_relative 'wait_for'
include Wait_for
require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'wrapanapi/entities'
include Wrapanapi::Entities
require_relative 'cfme/cloud/instance/openstack'
include Cfme::Cloud::Instance::Openstack
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/version'
include Cfme::Utils::Version
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenStackProvider], scope: "module", required_fields: [["provisioning", "cloud_tenant"], ["provisioning", "cloud_network"], ["provisioning", "instance_type"]])]
VOLUME_SIZE = 1
def new_instance(provider)
  prov_data = provider.data["provisioning"]
  prov_form_data = {"request" => {"email" => fauxfactory.gen_email(), "first_name" => fauxfactory.gen_alpha(), "last_name" => fauxfactory.gen_alpha()}, "catalog" => {"num_vms" => "1", "vm_name" => random_vm_name("osp")}, "environment" => {"cloud_network" => prov_data["cloud_network"], "cloud_tenant" => prov_data["cloud_tenant"]}, "properties" => {"instance_type" => partial_match(prov_data["instance_type"])}}
  instance_name = prov_form_data["catalog"]["vm_name"]
  begin
    instance = provider.appliance.collections.cloud_instances.create(instance_name, provider, prov_form_data, find_in_cfme: true)
  rescue KeyError
    pytest.skip("Unable to find an image map in provider \"{}\" provisioning data: {}".format(provider, prov_data))
  end
  yield(instance)
  begin
    instance.cleanup_on_provider()
  rescue Exception
    # pass
  end
end
def volume(appliance, provider)
  collection = appliance.collections.volumes
  az = (appliance.version < "5.11") ? nil : provider.data["provisioning"]["availability_zone"]
  volume = collection.create(name: fauxfactory.gen_alpha(start: "vol_"), from_manager: false, az: az, tenant: provider.data["provisioning"]["cloud_tenant"], volume_size: VOLUME_SIZE, provider: provider)
  yield(volume)
  if is_bool(volume.exists)
    volume.delete(wait: false)
  end
end
def volume_with_type(appliance, provider)
  vol_type = provider.mgmt.capi.volume_types.create(name: fauxfactory.gen_alpha(start: "type_"))
  volume_type = appliance.collections.volume_types.instantiate(vol_type.name, provider)
  az = (appliance.version < "5.11") ? nil : provider.data["provisioning"]["availability_zone"]
  volume_type_is_displayed = lambda do
    volume_type.refresh()
    return volume_type.exists
  end
  collection = appliance.collections.volumes
  volume = collection.create(name: fauxfactory.gen_alpha(start: "vol_"), from_manager: false, az: az, tenant: provider.data["provisioning"]["cloud_tenant"], volume_type: volume_type.name, volume_size: VOLUME_SIZE, provider: provider)
  yield(volume)
  if is_bool(volume.exists)
    volume.delete(wait: false)
  end
  if is_bool(volume_type.exists)
    provider.mgmt.capi.volume_types.delete(vol_type)
  end
end
def test_create_instance(new_instance, soft_assert)
  # Creates an instance and verifies it appears on UI
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(new_instance, "Details")
  prov_data = new_instance.provider.data["provisioning"]
  power_state = view.entities.summary("Power Management").get_text_of("Power State")
  raise unless power_state == OpenStackInstance.STATE_ON
  vm_tmplt = view.entities.summary("Relationships").get_text_of("VM Template")
  soft_assert.(vm_tmplt == prov_data["image"]["name"])
  props = [["Availability Zone", "availability_zone"], ["Cloud Tenants", "cloud_tenant"], ["Flavor", "instance_type"]]
  if current_version() >= "5.7"
    props.push(["Virtual Private Cloud", "cloud_network"])
  end
  for p in props
    v = view.entities.summary("Relationships").get_text_of(p[0])
    soft_assert.(v == prov_data[p[1]])
  end
end
def test_stop_instance(new_instance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_instance.power_control_from_cfme(from_details: true, option: OpenStackInstance.STOP)
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_OFF)
  view = navigate_to(new_instance, "Details")
  state = view.entities.summary("Power Management").get_text_of("Power State")
  raise unless state == OpenStackInstance.STATE_OFF
end
def test_suspend_instance(new_instance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_instance.power_control_from_cfme(from_details: true, option: OpenStackInstance.SUSPEND)
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_SUSPENDED)
  view = navigate_to(new_instance, "Details")
  state = view.entities.summary("Power Management").get_text_of("Power State")
  raise unless state == OpenStackInstance.STATE_SUSPENDED
end
def test_pause_instance(new_instance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_instance.power_control_from_cfme(from_details: true, option: OpenStackInstance.PAUSE)
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_PAUSED)
  view = navigate_to(new_instance, "Details")
  state = view.entities.summary("Power Management").get_text_of("Power State")
  raise unless state == OpenStackInstance.STATE_PAUSED
end
def test_shelve_instance(new_instance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_instance.power_control_from_cfme(from_details: true, option: OpenStackInstance.SHELVE)
  begin
    new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_SHELVED)
  rescue TimedOutError
    logger.warning("Timeout when waiting for instance state: 'shelved'. Skipping")
  end
  view = navigate_to(new_instance, "Details")
  state = view.entities.summary("Power Management").get_text_of("Power State")
  raise unless [OpenStackInstance.STATE_SHELVED_OFFLOAD, OpenStackInstance.STATE_SHELVED].include?(state)
end
def test_shelve_offload_instance(new_instance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_instance.power_control_from_cfme(from_details: true, option: OpenStackInstance.SHELVE)
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_SHELVED)
  begin
    new_instance.power_control_from_cfme(from_details: true, option: OpenStackInstance.SHELVE_OFFLOAD)
  rescue TimeoutException
    logger.warning("Timeout when initiating power state 'Shelve Offload'. Skipping")
  end
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_SHELVED_OFFLOAD)
  view = navigate_to(new_instance, "Details")
  state = view.entities.summary("Power Management").get_text_of("Power State")
  raise unless state == OpenStackInstance.STATE_SHELVED_OFFLOAD
end
def test_start_instance(new_instance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_instance.mgmt.ensure_state(VmState.STOPPED)
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_OFF)
  new_instance.power_control_from_cfme(from_details: true, option: OpenStackInstance.START)
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_ON)
  view = navigate_to(new_instance, "Details")
  state = view.entities.summary("Power Management").get_text_of("Power State")
  raise unless state == OpenStackInstance.STATE_ON
end
def test_soft_reboot_instance(new_instance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_instance.power_control_from_cfme(from_details: true, option: OpenStackInstance.SOFT_REBOOT)
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_REBOOTING)
  view = navigate_to(new_instance, "Details")
  state = view.entities.summary("Power Management").get_text_of("Power State")
  raise unless [OpenStackInstance.STATE_ON, OpenStackInstance.STATE_REBOOTING].include?(state)
end
def test_hard_reboot_instance(new_instance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_instance.power_control_from_cfme(from_details: true, option: OpenStackInstance.HARD_REBOOT)
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_REBOOTING)
  view = navigate_to(new_instance, "Details")
  state = view.entities.summary("Power Management").get_text_of("Power State")
  raise unless [OpenStackInstance.STATE_ON, OpenStackInstance.STATE_REBOOTING].include?(state)
end
def test_delete_instance(new_instance, provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_instance.power_control_from_cfme(from_details: true, option: OpenStackInstance.TERMINATE)
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_UNKNOWN)
  raise unless !new_instance.exists_on_provider
  view = navigate_to(new_instance.appliance.collections.cloud_instances.filter({"provider" => provider}), "AllForProvider")
  begin
    view.entities.get_entity(name: new_instance.name, surf_pages: true)
    raise "entity still exists" unless false
  rescue ItemNotFound
    # pass
  end
end
def test_instance_operating_system_linux(new_instance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(new_instance, "Details")
  os = view.entities.summary("Properties").get_text_of("Operating System")
  prov_data_os = new_instance.provider.data["provisioning"]["image"]["os_distro"]
  raise "OS type mismatch: expected #{prov_data_os} and got #{os}" unless os == prov_data_os
end
def test_instance_attach_volume(volume, new_instance, appliance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  initial_volume_count = new_instance.volume_count
  new_instance.attach_volume(volume.name)
  view = appliance.browser.create_view(navigator.get_class(new_instance, "AttachVolume").VIEW)
  view.flash.assert_success_message("Attaching Cloud Volume \"#{volume.name}\" to #{new_instance.name} finished")
  Wait_for::wait_for(lambda{|| new_instance.volume_count > initial_volume_count}, delay: 20, timeout: 300, message: "Waiting for volume to be attached to instance", fail_func: new_instance.refresh_relationships)
end
def test_instance_attach_detach_volume_with_type(volume_with_type, new_instance, appliance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  initial_volume_count = new_instance.volume_count
  new_instance.attach_volume(volume_with_type.name)
  view = appliance.browser.create_view(navigator.get_class(new_instance, "Details").VIEW)
  view.flash.assert_success_message("Attaching Cloud Volume \"{}\" to {} finished".format(volume_with_type.name, new_instance.name))
  volume_attached_to_instance = lambda do
    new_instance.refresh_relationships()
    return new_instance.volume_count > initial_volume_count
  end
  new_instance.detach_volume(volume_with_type.name)
  view = appliance.browser.create_view(navigator.get_class(method(:new_instance), "Details").VIEW)
  view.flash.assert_success_message("Detaching Cloud Volume \"{}\" from {} finished".format(volume_with_type.name, new_instance.name))
  volume_detached_from_instance = lambda do
    new_instance.refresh_relationships()
    return new_instance.volume_count == initial_volume_count
  end
end
