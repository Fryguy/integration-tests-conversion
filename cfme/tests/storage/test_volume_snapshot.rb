require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/storage/manager'
include Cfme::Storage::Manager
require_relative 'cfme/storage/volume'
include Cfme::Storage::Volume
require_relative 'cfme/storage/volume'
include Cfme::Storage::Volume
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.storage, pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([EC2Provider, OpenStackProvider], scope: "module", required_fields: [["provisioning", "cloud_tenant"]])]
STORAGE_SIZE = 1
def volume(appliance, provider)
  volume_collection = appliance.collections.volumes
  name = fauxfactory.gen_alpha(start: "vol_")
  volume_kwargs = {"name" => name, "volume_size" => STORAGE_SIZE, "provider" => provider, "cancel" => false}
  if is_bool(provider.one_of(OpenStackProvider))
    volume_kwargs["tenant"] = provider.data["provisioning"]["cloud_tenant"]
    if appliance.version >= "5.11"
      volume_kwargs["az"] = provider.data["provisioning"]["availability_zone"]
    end
  else
    if is_bool(provider.one_of(EC2Provider))
      volume_kwargs["az"] = "#{provider.region}a"
      volume_kwargs["volume_type"] = "General Purpose SSD (GP2)"
    else
      return false
    end
  end
  volume = volume_collection.create(None: volume_kwargs)
  raise unless volume.exists
  yield(volume)
  begin
    if is_bool(volume.exists)
      volume.delete(wait: true)
    end
  rescue Exception => e
    logger.warning(("{name}:{msg} Volume deletion - skipping...").format(name: e.class.__name__, msg: e.to_s))
  end
end
def snapshot(volume)
  snapshot_name = fauxfactory.gen_alpha(start: "snap_")
  snapshot = volume.create_snapshot(snapshot_name)
  begin
    wait_for(lambda{|| snapshot.status == "available"}, delay: 20, timeout: 1200, fail_func: snapshot.refresh)
  rescue TimedOutError
    logger.error("Snapshot Creation fails:TimeoutException due to status not available (=error)")
  end
  yield(snapshot)
  begin
    if is_bool(snapshot.exists)
      snapshot.delete()
    end
  rescue Exception => e
    logger.warning(("{name}:{msg}: Snapshot deletion - skipping...").format(name: e.class.__name__, msg: e.to_s))
  end
end
def test_storage_snapshot_create_cancelled_validation(volume, snapshot_create_from)
  #  Test snapshot create cancelled
  # 
  #   prerequisites:
  #       * Storage Volume
  # 
  #   Steps:
  #       * Navigate to Snapshot create window
  #       * Fill snapshot name
  #       * Click Cancel button
  #       * Assert flash message
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #   
  snapshot_name = fauxfactory.gen_alpha(start: "snap_")
  volume.create_snapshot(snapshot_name, cancel: true, from_manager: snapshot_create_from)
  if is_bool(snapshot_create_from)
    view = volume.browser.create_view(StorageManagerVolumeAllView, additional_context: {"object" => volume.parent.manager}, wait: "10s")
  else
    view = volume.create_view(VolumeDetailsView, wait: "10s")
  end
  view.flash.assert_message("Snapshot of Cloud Volume \"#{volume.name}\" was cancelled by the user")
end
def test_storage_snapshot_create_reset_validation(volume, snapshot_create_from)
  #  Test snapshot create reset button validation
  # 
  #   prerequisites:
  #       * Storage Volume
  # 
  #   Steps:
  #       * Navigate to Snapshot create window
  #       * Fill snapshot name
  #       * Click Reset button
  #       * Assert flash message
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #   
  snapshot_name = fauxfactory.gen_alpha(start: "snap_")
  volume.create_snapshot(snapshot_name, reset: true, from_manager: snapshot_create_from)
  view = volume.create_view(VolumeSnapshotView)
  view.flash.assert_message("All changes have been reset")
end
def test_storage_volume_snapshot_crud(volume, provider, snapshot_create_from)
  #  Test storage snapshot crud
  #   prerequisites:
  #       * Volume
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #       testSteps:
  #           1. Create new snapshot
  #           2. Updates that snapshot
  #           3. Delete delete that snapshot
  #   
  initial_snapshot_count = volume.snapshots_count
  snapshot_name = fauxfactory.gen_alpha(start: "snap_")
  snapshot = volume.create_snapshot(snapshot_name, from_manager: snapshot_create_from)
  view = volume.create_view(VolumeDetailsView, wait: "10s")
  view.flash.assert_success_message("Snapshot for Cloud Volume \"#{volume.name}\" created")
  begin
    wait_for(lambda{|| volume.snapshots_count > initial_snapshot_count}, delay: 20, timeout: 1000, fail_func: volume.refresh)
  rescue TimedOutError
    logger.error("Snapshot count increment fails")
  end
  status = is_bool(provider.one_of(EC2Provider)) ? "completed" : "available"
  begin
    wait_for(lambda{|| snapshot.status == status}, delay: 20, timeout: 1200, fail_func: snapshot.refresh)
  rescue TimedOutError
    logger.error("Snapshot Creation fails:TimeoutException due to status not available (=error)")
  end
  raise unless snapshot.exists
  raise unless snapshot.size == STORAGE_SIZE
  snapshot.delete()
  raise unless !snapshot.exists
end
def test_storage_volume_snapshot_edit_tag_from_detail(snapshot, tag)
  #  Test tags for snapshot
  # 
  #   prerequisites:
  #       * snapshot
  # 
  #   Steps:
  #       * Navigate to Snapshot Detail page
  #       * Add new Tag
  #       * Remove Tag
  # 
  #   Polarion:
  #       assignee: anikifor
  #       initialEstimate: 1/4h
  #       casecomponent: Configuration
  #   
  snapshot.add_tag(tag)
  tag_available = snapshot.get_tags()
  raise unless tag_available[0].display_name == tag.display_name
  raise unless tag_available[0].category.display_name == tag.category.display_name
  snapshot.remove_tag(tag)
  tag_available = snapshot.get_tags()
  raise unless !tag_available
end
