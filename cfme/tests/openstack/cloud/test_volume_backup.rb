# Tests for Openstack cloud volume Backups
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([OpenStackProvider], required_fields: [["provisioning", "cloud_tenant"]])]
VOLUME_SIZE = 1
def volume_backup(appliance, provider)
  volume_collection = appliance.collections.volumes
  backup_collection = appliance.collections.volume_backups.filter({"provider" => provider})
  az = (appliance.version < "5.11") ? nil : provider.data["provisioning"]["availability_zone"]
  volume = volume_collection.create(name: fauxfactory.gen_alpha(start: "vol_"), from_manager: false, az: az, tenant: provider.data["provisioning"]["cloud_tenant"], volume_size: VOLUME_SIZE, provider: provider)
  if volume.status == "available"
    backup_name = fauxfactory.gen_alpha(start: "bkup_")
    volume.create_backup(backup_name)
    volume_backup = backup_collection.instantiate(backup_name, provider)
    yield volume_backup
  else
    pytest.skip("Skipping volume backup tests, provider side volume creation fails")
  end
  begin
    if is_bool(volume_backup.exists)
      backup_collection.delete(volume_backup, wait: false)
    end
    if is_bool(volume.exists)
      volume.delete(wait: false)
    end
  rescue Exception
    logger.warning("Exception during volume deletion - skipping..")
  end
end
def volume_backup_with_type(appliance, provider)
  vol_type = provider.mgmt.capi.volume_types.create(name: fauxfactory.gen_alpha(start: "type_"))
  volume_type = appliance.collections.volume_types.instantiate(vol_type.name, provider)
  volume_type_is_displayed = lambda do
    volume_type.refresh()
    return volume_type.exists
  end
  volume_collection = appliance.collections.volumes
  backup_collection = appliance.collections.volume_backups.filter({"provider" => provider})
  az = (appliance.version < "5.11") ? nil : provider.data["provisioning"]["availability_zone"]
  volume = volume_collection.create(name: fauxfactory.gen_alpha(start: "vol_"), from_manager: false, az: az, tenant: provider.data["provisioning"]["cloud_tenant"], volume_type: volume_type.name, volume_size: VOLUME_SIZE, provider: provider)
  if volume.status == "available"
    backup_name = fauxfactory.gen_alpha(start: "bkup_")
    volume.create_backup(backup_name)
    volume_backup = backup_collection.instantiate(backup_name, provider)
    yield volume_backup
  else
    pytest.skip("Skipping volume backup tests, provider side volume creation fails")
  end
  if is_bool(volume_backup.exists)
    backup_collection.delete(volume_backup)
  end
  if is_bool(volume.exists)
    volume.delete(wait: false)
  end
  if is_bool(volume_type.exists)
    provider.mgmt.capi.volume_types.delete(vol_type)
  end
end
def incremental_backup(volume_backup, provider)
  backup_collection = provider.appliance.collections.volume_backups.filter({"provider" => provider})
  volume = volume_backup.appliance.collections.volumes.instantiate(volume_backup.volume, provider)
  if volume.status == "available"
    backup_name = fauxfactory.gen_alpha(start: "bkup_")
    volume.create_backup(backup_name, incremental: true)
    incremental_backup = backup_collection.instantiate(backup_name, provider)
    yield incremental_backup
  else
    pytest.skip("Skipping incremental backup fixture: volume not available")
  end
  begin
    if is_bool(incremental_backup.exists)
      backup_collection.delete(incremental_backup)
    end
  rescue Exception
    logger.warning("Exception during volume backup deletion - skipping..")
  end
end
def new_instance(provider)
  instance_name = fauxfactory.gen_alpha(15, start: "test_vol_")
  collection = provider.appliance.provider_based_collection(provider)
  instance = collection.create_rest(instance_name, provider)
  yield instance
  instance.cleanup_on_provider()
end
def attached_volume(appliance, provider, volume_backup, new_instance)
  attached_volume = appliance.collections.volumes.instantiate(volume_backup.volume, provider)
  initial_volume_count = new_instance.volume_count
  new_instance.attach_volume(attached_volume.name)
  volume_attached_to_instance = lambda do
    new_instance.refresh_relationships()
    return new_instance.volume_count > initial_volume_count
  end
  yield attached_volume
  new_instance.detach_volume(attached_volume.name)
  volume_detached_from_instance = lambda do
    new_instance.refresh_relationships()
    return new_instance.volume_count == initial_volume_count
  end
end
def test_create_volume_backup(volume_backup)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  raise unless volume_backup.exists
  raise unless volume_backup.size == VOLUME_SIZE
end
def test_create_volume_incremental_backup(incremental_backup)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  raise unless incremental_backup.exists
  raise unless incremental_backup.size == VOLUME_SIZE
end
def test_incr_backup_of_attached_volume_crud(appliance, provider, request, attached_volume)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  backup_name = fauxfactory.gen_alpha(start: "bkup_")
  collection = appliance.collections.volume_backups.filter({"provider" => provider})
  attached_volume.create_backup(backup_name, incremental: true, force: true)
  incr_backup_of_attached_volume = collection.instantiate(backup_name, provider)
  cleanup = lambda do
    if is_bool(incr_backup_of_attached_volume.exists)
      collection.delete(incr_backup_of_attached_volume, wait: false)
    end
  end
  raise unless incr_backup_of_attached_volume.exists
  raise unless incr_backup_of_attached_volume.size == VOLUME_SIZE
  collection.delete(incr_backup_of_attached_volume, wait: false)
  view = navigate_to(collection, "All")
  view.flash.assert_success_message()
  wait_for(lambda{|| !incr_backup_of_attached_volume.exists}, delay: 5, timeout: 600, fail_func: incr_backup_of_attached_volume.refresh, message: "Wait for Backup to disappear")
end
def test_create_backup_of_volume_with_type(volume_backup_with_type)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  raise unless volume_backup_with_type.exists
  raise unless volume_backup_with_type.size == VOLUME_SIZE
end
def test_restore_volume_backup(volume_backup)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  if volume_backup.status == "available"
    volume_backup.restore(volume_backup.volume)
  else
    pytest.skip("Skipping restore volume backup test, volume backup is not available")
  end
end
def test_restore_incremental_backup(incremental_backup)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  if incremental_backup.status == "available"
    incremental_backup.restore(incremental_backup.volume)
  else
    pytest.skip("Skipping restore incremental backup test, volume backup is not available")
  end
end
