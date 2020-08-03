# Tests for Openstack cloud volumes
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenStackProvider], scope: "module")]
VOLUME_SIZE = 1
def volume(appliance, provider)
  collection = appliance.collections.volumes
  az = (appliance.version < "5.11") ? nil : provider.data["provisioning"]["availability_zone"]
  volume = collection.create(name: fauxfactory.gen_alpha(start: "vol_"), from_manager: false, az: az, tenant: provider.data["provisioning"]["cloud_tenant"], volume_size: VOLUME_SIZE, provider: provider)
  yield(volume)
  begin
    if is_bool(volume.exists)
      volume.delete(wait: false)
    end
  rescue Exception
    logger.warning("Exception during volume deletion - skipping..")
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
def new_instance(provider)
  instance_name = fauxfactory.gen_alpha(15, start: "test_vol_")
  collection = provider.appliance.provider_based_collection(provider)
  instance = collection.create_rest(instance_name, provider)
  yield(instance)
  instance.cleanup_on_provider()
end
def test_create_volume(volume, provider)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  raise unless volume.exists
  raise unless volume.size == "#{VOLUME_SIZE} GB"
  raise unless volume.tenant == provider.data["provisioning"]["cloud_tenant"]
end
def test_edit_volume(volume, appliance)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_name = fauxfactory.gen_alpha(15, start: "edited_")
  update(volume) {
    volume.name = new_name
  }
  view = navigate_to(appliance.collections.volumes, "All")
  raise unless view.entities.get_entity(name: new_name, surf_pages: true)
end
def test_delete_volume(volume)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  volume.delete()
  raise unless !volume.exists
end
def test_create_volume_with_type(volume_with_type, provider)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  raise unless volume_with_type.exists
  raise unless volume_with_type.size == "#{VOLUME_SIZE} GB"
  raise unless volume_with_type.tenant == provider.data["provisioning"]["cloud_tenant"]
end
def test_edit_volume_with_type(volume_with_type, appliance)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  new_name = fauxfactory.gen_alpha(15, start: "edited_")
  update(volume_with_type) {
    volume_with_type.name = new_name
  }
  view = navigate_to(appliance.collections.volumes, "All")
  raise unless view.entities.get_entity(name: new_name, surf_pages: true)
end
def test_delete_volume_with_type(volume_with_type)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  volume_with_type.delete()
  raise unless !volume_with_type.exists
end
def test_volume_attach_detach_instance(volume, new_instance, appliance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  initial_instance_count = volume.instance_count
  volume.attach_instance(new_instance.name)
  view = appliance.browser.create_view(navigator.get_class(volume, "Details").VIEW)
  view.flash.assert_success_message("Attaching Cloud Volume \"{name}\" to {instance} finished".format(name: volume.name, instance: new_instance.name))
  volume_attached_to_instance = lambda do
    new_instance.refresh_relationships()
    return volume.instance_count == initial_instance_count + 1
  end
  volume.detach_instance(new_instance.name)
  view = appliance.browser.create_view(navigator.get_class(method(:volume), "Details").VIEW)
  view.flash.assert_success_message("Detaching Cloud Volume \"{name}\" from {instance} finished".format(name: volume.name, instance: new_instance.name))
  volume_detached_from_instance = lambda do
    new_instance.refresh_relationships()
    return volume.instance_count == initial_instance_count
  end
end
