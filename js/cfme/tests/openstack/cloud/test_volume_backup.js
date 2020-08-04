// Tests for Openstack cloud volume Backups
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),

  pytest.mark.provider(
    [OpenStackProvider],
    {required_fields: [["provisioning", "cloud_tenant"]]}
  )
];

const VOLUME_SIZE = 1;

function volume_backup(appliance, provider) {
  let volume_backup;
  let volume_collection = appliance.collections.volumes;
  let backup_collection = appliance.collections.volume_backups.filter({provider: provider});
  let az = (appliance.version < "5.11" ? null : provider.data.provisioning.availability_zone);

  let volume = volume_collection.create({
    name: fauxfactory.gen_alpha({start: "vol_"}),
    from_manager: false,
    az,
    tenant: provider.data.provisioning.cloud_tenant,
    volume_size: VOLUME_SIZE,
    provider
  });

  if (volume.status == "available") {
    let backup_name = fauxfactory.gen_alpha({start: "bkup_"});
    volume.create_backup(backup_name);
    volume_backup = backup_collection.instantiate(backup_name, provider);
    yield(volume_backup)
  } else {
    pytest.skip("Skipping volume backup tests, provider side volume creation fails")
  };

  try {
    if (is_bool(volume_backup.exists)) {
      backup_collection.delete(volume_backup, {wait: false})
    };

    if (is_bool(volume.exists)) volume.delete({wait: false})
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      logger.warning("Exception during volume deletion - skipping..")
    } else {
      throw $EXCEPTION
    }
  }
};

function volume_backup_with_type(appliance, provider) {
  let volume_backup;
  let vol_type = provider.mgmt.capi.volume_types.create({name: fauxfactory.gen_alpha({start: "type_"})});

  let volume_type = appliance.collections.volume_types.instantiate(
    vol_type.name,
    provider
  );

  let volume_type_is_displayed = () => {
    volume_type.refresh();
    return volume_type.exists
  };

  let volume_collection = appliance.collections.volumes;
  let backup_collection = appliance.collections.volume_backups.filter({provider: provider});
  let az = (appliance.version < "5.11" ? null : provider.data.provisioning.availability_zone);

  let volume = volume_collection.create({
    name: fauxfactory.gen_alpha({start: "vol_"}),
    from_manager: false,
    az,
    tenant: provider.data.provisioning.cloud_tenant,
    volume_type: volume_type.name,
    volume_size: VOLUME_SIZE,
    provider
  });

  if (volume.status == "available") {
    let backup_name = fauxfactory.gen_alpha({start: "bkup_"});
    volume.create_backup(backup_name);
    volume_backup = backup_collection.instantiate(backup_name, provider);
    yield(volume_backup)
  } else {
    pytest.skip("Skipping volume backup tests, provider side volume creation fails")
  };

  if (is_bool(volume_backup.exists)) backup_collection.delete(volume_backup);
  if (is_bool(volume.exists)) volume.delete({wait: false});

  if (is_bool(volume_type.exists)) {
    provider.mgmt.capi.volume_types.delete(vol_type)
  }
};

function incremental_backup(volume_backup, provider) {
  let incremental_backup;
  let backup_collection = provider.appliance.collections.volume_backups.filter({provider: provider});

  let volume = volume_backup.appliance.collections.volumes.instantiate(
    volume_backup.volume,
    provider
  );

  if (volume.status == "available") {
    let backup_name = fauxfactory.gen_alpha({start: "bkup_"});
    volume.create_backup(backup_name, {incremental: true});

    incremental_backup = backup_collection.instantiate(
      backup_name,
      provider
    );

    yield(incremental_backup)
  } else {
    pytest.skip("Skipping incremental backup fixture: volume not available")
  };

  try {
    if (is_bool(incremental_backup.exists)) {
      backup_collection.delete(incremental_backup)
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      logger.warning("Exception during volume backup deletion - skipping..")
    } else {
      throw $EXCEPTION
    }
  }
};

function new_instance(provider) {
  let instance_name = fauxfactory.gen_alpha(15, {start: "test_vol_"});
  let collection = provider.appliance.provider_based_collection(provider);
  let instance = collection.create_rest(instance_name, provider);
  yield(instance);
  instance.cleanup_on_provider()
};

function attached_volume(appliance, provider, volume_backup, new_instance) {
  let attached_volume = appliance.collections.volumes.instantiate(
    volume_backup.volume,
    provider
  );

  let initial_volume_count = new_instance.volume_count;
  new_instance.attach_volume(attached_volume.name);

  let volume_attached_to_instance = () => {
    new_instance.refresh_relationships();
    return new_instance.volume_count > initial_volume_count
  };

  yield(attached_volume);
  new_instance.detach_volume(attached_volume.name);

  let volume_detached_from_instance = () => {
    new_instance.refresh_relationships();
    return new_instance.volume_count == initial_volume_count
  }
};

function test_create_volume_backup(volume_backup) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (!volume_backup.exists) throw new ();
  if (volume_backup.size != VOLUME_SIZE) throw new ()
};

function test_create_volume_incremental_backup(incremental_backup) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (!incremental_backup.exists) throw new ();
  if (incremental_backup.size != VOLUME_SIZE) throw new ()
};

function test_incr_backup_of_attached_volume_crud(appliance, provider, request, attached_volume) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let backup_name = fauxfactory.gen_alpha({start: "bkup_"});
  let collection = appliance.collections.volume_backups.filter({provider: provider});

  attached_volume.create_backup(
    backup_name,
    {incremental: true, force: true}
  );

  let incr_backup_of_attached_volume = collection.instantiate(
    backup_name,
    provider
  );

  let cleanup = () => {
    if (is_bool(incr_backup_of_attached_volume.exists)) {
      return collection.delete(
        incr_backup_of_attached_volume,
        {wait: false}
      )
    }
  };

  if (!incr_backup_of_attached_volume.exists) throw new ();
  if (incr_backup_of_attached_volume.size != VOLUME_SIZE) throw new ();
  collection.delete(incr_backup_of_attached_volume, {wait: false});
  let view = navigate_to(collection, "All");
  view.flash.assert_success_message(`Delete of Backup \"${backup_name}\" was successfully initiated.`);

  wait_for(() => !incr_backup_of_attached_volume.exists, {
    delay: 5,
    timeout: 600,
    fail_func: incr_backup_of_attached_volume.refresh,
    message: "Wait for Backup to disappear"
  })
};

function test_create_backup_of_volume_with_type(volume_backup_with_type) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (!volume_backup_with_type.exists) throw new ();
  if (volume_backup_with_type.size != VOLUME_SIZE) throw new ()
};

function test_restore_volume_backup(volume_backup) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (volume_backup.status == "available") {
    volume_backup.restore(volume_backup.volume)
  } else {
    pytest.skip("Skipping restore volume backup test, volume backup is not available")
  }
};

function test_restore_incremental_backup(incremental_backup) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (incremental_backup.status == "available") {
    incremental_backup.restore(incremental_backup.volume)
  } else {
    pytest.skip("Skipping restore incremental backup test, volume backup is not available")
  }
}
