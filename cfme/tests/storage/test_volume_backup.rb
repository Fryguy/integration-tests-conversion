require_relative 'wait_for'
include Wait_for
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenStackProvider], scope: "module", required_fields: [["provisioning", "cloud_tenant"]])]
STORAGE_SIZE = 1
def backup(appliance, provider)
  volume_collection = appliance.collections.volumes
  backup_collection = appliance.collections.volume_backups.filter({"provider" => provider})
  if appliance.version >= "5.11"
    volume = volume_collection.create(name: fauxfactory.gen_alpha(start: "vol_"), tenant: provider.data["provisioning"]["cloud_tenant"], volume_size: STORAGE_SIZE, az: provider.data["provisioning"]["availability_zone"], provider: provider)
  else
    volume = volume_collection.create(name: fauxfactory.gen_alpha(start: "vol_"), tenant: provider.data["provisioning"]["cloud_tenant"], volume_size: STORAGE_SIZE, provider: provider)
  end
  if volume.status == "available"
    backup_name = fauxfactory.gen_alpha(start: "bkup_")
    volume.create_backup(backup_name)
    backup = backup_collection.instantiate(backup_name, provider)
    yield(backup)
  else
    pytest.skip("Skipping volume backup tests, provider side volume creation fails")
  end
  begin
    if is_bool(backup.exists)
      backup_collection.delete(backup)
    end
    if is_bool(volume.exists)
      volume.delete(wait: false)
    end
  rescue Exception
    logger.warning("Exception during volume deletion - skipping..")
  end
end
def test_storage_volume_backup_create(backup)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #   
  raise unless backup.exists
  raise unless backup.size == STORAGE_SIZE
end
def test_storage_volume_backup_edit_tag_from_detail(backup)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #   
  added_tag = backup.add_tag()
  tag_available = backup.get_tags()
  raise unless tag_available[0].display_name == added_tag.display_name
  raise unless tag_available[0].category.display_name == added_tag.category.display_name
  backup.remove_tag(added_tag)
  tag_available = backup.get_tags()
  raise unless !tag_available
end
def test_storage_volume_backup_delete(backup)
  #  Volume backup deletion method not support by 5.8
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #   
  backup.parent.delete(backup)
  raise unless !backup.exists
end
def test_storage_volume_backup_restore(appliance, backup, provider, request)
  # 
  #   Requires:
  #       test_storage_volume_backup[openstack]
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/5h
  #       startsin: 5.7
  #       upstream: yes
  #       testSteps:
  #           1 . Go back to the summary page of the respective volume.
  #           2 . Restore Volume [configuration > Restore from backup of this cloud
  #           volume > select cloud volume backup]
  #       expectedResults:
  #           1.
  #           2. check in Task whether restored
  #   
  backup.restore(name: backup.volume, new_volume: false)
  backup.refresh()
  volumes_collection = appliance.collections.volumes
  restored_volume = volumes_collection.instantiate(name: backup.volume, provider: provider)
  Wait_for::wait_for(lambda{|| restored_volume.status == "available"}, fail_func: backup.refresh, delay: 30, timeout: 600)
end
def test_storage_volume_backup_restore_new_volume(appliance, backup, provider, request)
  # 
  #   Requires:
  #       test_storage_volume_backup[openstack]
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/5h
  #       startsin: 5.7
  #       upstream: yes
  #       testSteps:
  #           1 . Go back to the summary page of the respective volume.
  #           2 . Restore Volume [configuration > Restore from backup of this cloud
  #           volume > select cloud volume backup]
  #       expectedResults:
  #           1.
  #           2. check in Task whether restored
  #   
  restored_volume_name = fauxfactory.gen_alpha(start: "vol_")
  backup.restore(name: restored_volume_name, new_volume: true)
  backup.refresh()
  volumes_collection = appliance.collections.volumes
  restored_volume = volumes_collection.instantiate(name: restored_volume_name, provider: provider)
  request.addfinalizer(lambda{|| restored_volume.delete()})
  Wait_for::wait_for(lambda{|| restored_volume.status == "available"}, fail_func: backup.refresh, delay: 30, timeout: 600)
end
def test_storage_volume_backup_restore_from_backup_page(appliance, backup, provider, request)
  # 
  #   Requires:
  #       test_storage_volume_backup[openstack]
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/5h
  #       startsin: 5.9
  #       testSteps:
  #           1. Navigate to Volume Backups [Storage > Block Storage > Volume
  #           Backups]
  #           2. Select respective Volume backups
  #           3. Restore Volume [configuration > Restore backup to cloud volume
  #           4. Select Proper Volume to restore
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. check in Task whether restored
  #   
  backup.restore(name: backup.volume, new_volume: false, from_all_backups: true)
  backup.refresh()
  volumes_collection = appliance.collections.volumes
  restored_volume = volumes_collection.instantiate(name: backup.volume, provider: provider)
  Wait_for::wait_for(lambda{|| restored_volume.status == "available"}, fail_func: backup.refresh, delay: 30, timeout: 600)
end
def test_storage_volume_backup_restore_new_volume_from_backup_page(appliance, backup, provider, request)
  # 
  #   Requires:
  #       test_storage_volume_backup[openstack]
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/5h
  #       startsin: 5.9
  #       testSteps:
  #           1. Navigate to Volume Backups [Storage > Block Storage > Volume
  #           Backups]
  #           2. Select respective Volume backups
  #           3. Restore Volume [configuration > Restore backup to cloud volume
  #           4. Select Proper Volume to restore
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. check in Task whether restored
  #   
  restored_volume_name = fauxfactory.gen_alpha(start: "vol_")
  backup.restore(name: restored_volume_name, new_volume: true, from_all_backups: true)
  backup.refresh()
  volumes_collection = appliance.collections.volumes
  restored_volume = volumes_collection.instantiate(name: restored_volume_name, provider: provider)
  request.addfinalizer(lambda{|| restored_volume.delete()})
  Wait_for::wait_for(lambda{|| restored_volume.status == "available"}, fail_func: backup.refresh, delay: 30, timeout: 600)
end
