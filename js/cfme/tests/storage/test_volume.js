require_relative("wrapanapi");
include(Wrapanapi);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/storage/volume");
include(Cfme.Storage.Volume);
require_relative("cfme/storage/volume");
include(Cfme.Storage.Volume);
require_relative("cfme/storage/volume");
include(Cfme.Storage.Volume);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.storage,
  pytest.mark.usefixtures("setup_provider_modscope"),

  pytest.mark.provider([OpenStackProvider, EC2Provider], {
    scope: "module",
    required_fields: [["provisioning", "cloud_tenant"]]
  })
];

const STORAGE_SIZE = 1;

function from_manager(request) {
  if (request.param == "from_manager") {
    return true
  } else {
    return false
  }
};

function volume(appliance, provider) {
  let volume = create_volume(
    appliance,
    provider,
    {should_assert: false}
  );

  yield(volume);

  try {
    if (is_bool(volume.exists)) volume.delete({wait: true})
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      logger.exception("Volume deletion - skipping...")
    } else {
      throw $EXCEPTION
    }
  }
};

function attached_volume(appliance, provider, instance_fixture) {
  let volume = create_volume(
    appliance,
    provider,
    method("from_manager"),

    {
      az: instance_fixture.vm_default_args.environment.availability_zone,
      should_assert: true
    }
  );

  volume.attach_instance({
    name: instance_fixture.name,
    mountpoint: "/dev/sdm",
    from_manager: from_manager
  });

  wait_for(() => volume.instance_count == 1, {delay: 15, timeout: 600});
  yield(volume);

  try {
    if (is_bool(volume.exists)) {
      if (volume.instance_count > 0) {
        volume.detach_instance({
          name: instance_fixture.name,
          from_manager: from_manager
        });

        wait_for(() => volume.instance_count == 0, {delay: 15, timeout: 600})
      };

      volume.delete({wait: true})
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      logger.exception("Volume deletion - skipping...")
    } else {
      throw $EXCEPTION
    }
  }
};

function instance_fixture(appliance, provider, small_template) {
  let instance = appliance.collections.cloud_instances.instantiate(
    random_vm_name("stor"),
    provider,
    small_template.name
  );

  if (is_bool(!instance.exists_on_provider)) {
    instance.create_on_provider({
      allow_skip: "default",
      find_in_cfme: true
    })
  } else if (is_bool(instance.provider.one_of(EC2Provider) && instance.mgmt.state == VmState.DELETED)) {
    instance.mgmt.rename(fauxfactory.gen_alphanumeric(
      20,
      {start: "test_terminated_"}
    ));

    instance.create_on_provider({
      allow_skip: "default",
      find_in_cfme: true
    })
  };

  yield(instance);
  instance.cleanup_on_provider()
};

function create_volume(appliance, provider, { is_from_manager = false, az = null, cancel = false, should_assert = false }) {
  let volume;
  let volume_collection = appliance.collections.volumes;
  let name = fauxfactory.gen_alpha({start: "vol_"});

  if (is_bool(provider.one_of(OpenStackProvider))) {
    if (appliance.version < "5.11") {
      volume = volume_collection.create({
        name,
        tenant: provider.data.provisioning.cloud_tenant,
        volume_size: STORAGE_SIZE,
        provider,
        cancel,
        from_manager: is_from_manager
      })
    } else {
      volume = volume_collection.create({
        name,
        tenant: provider.data.provisioning.cloud_tenant,
        volume_size: STORAGE_SIZE,
        provider,
        az: provider.data.provisioning.availability_zone,
        cancel,
        from_manager: is_from_manager
      })
    }
  } else if (is_bool(provider.one_of(EC2Provider))) {
    az = (is_bool(az) ? az : `${provider.region}a`);

    volume = volume_collection.create({
      name,
      volume_type: "General Purpose SSD (GP2)",
      volume_size: STORAGE_SIZE,
      provider,
      az,
      from_manager: is_from_manager,
      cancel
    })
  };

  if (is_bool(should_assert)) if (!volume.exists) throw new ();
  return volume
};

function test_storage_volume_create_cancelled_validation(appliance, provider, from_manager) {
  //  Test Attach instance to storage volume cancelled
  //   prerequisites:
  //       * Storage provider
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       testSteps:
  //           1. Navigate to storage add volume page
  //           2. Click Cancel button
  //           3. Assert flash message
  //   
  let volume_collection = appliance.collections.volumes;

  create_volume(
    appliance,
    provider,
    {is_from_manager: from_manager, cancel: true}
  );

  let view = volume_collection.create_view(VolumeAllView);
  view.flash.assert_message("Add of new Cloud Volume was cancelled by the user")
};

function test_storage_volume_crud(appliance, provider, from_manager) {
  let updates;

  //  Test storage volume crud
  //   prerequisites:
  //       * Storage provider
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       caseimportance: high
  //       testSteps:
  //           1. Create new volume
  //           2. Update volume
  //           3. Delete volume
  //   
  let volume = create_volume(
    appliance,
    provider,
    {is_from_manager: from_manager, should_assert: true}
  );

  let old_name = volume.name;
  let new_name = fauxfactory.gen_alpha(12, {start: "edited_"});

  if (is_bool(provider.one_of(OpenStackProvider))) {
    updates = {volume_name: new_name}
  } else {
    updates = {volume_name: new_name, volume_size: STORAGE_SIZE + 1}
  };

  volume = volume.update(updates, from_manager);

  if (is_bool(provider.one_of(EC2Provider))) {
    wait_for(
      () => volume.size == "{} GB".format(updates.get("volume_size")),
      {delay: 15, timeout: 900}
    )
  };

  updates = {volume_name: old_name};
  volume = volume.update(updates, from_manager);
  volume.delete({wait: true, from_manager});
  if (!!volume.exists) throw new ()
};

function test_storage_volume_attach_detach(appliance, provider, instance_fixture, from_manager) {
  //  Test storage volume attach/detach
  //   prerequisites:
  //       * Storage provider
  //       * Instance
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       startsin: 5.7
  //       caseimportance: high
  //       testSteps:
  //           1. Create new volume
  //           2. Attach that volume to instance
  //           3. Detach that volume from instance
  //           4. Delete that volume
  // 
  //   
  let volume = create_volume(appliance, provider, {
    is_from_manager: from_manager,
    az: instance_fixture.vm_default_args.environment.availability_zone,
    should_assert: true
  });

  volume.attach_instance({
    name: instance_fixture.name,
    mountpoint: "/dev/sdm",
    from_manager
  });

  wait_for(() => volume.status == "in-use", {delay: 15, timeout: 600});
  volume.detach_instance({name: instance_fixture.name, from_manager});

  wait_for(
    () => volume.status == "available",
    {delay: 15, timeout: 600}
  );

  volume.delete()
};

function test_storage_volume_attached_delete(appliance, provider, instance_fixture, request, attached_volume, from_manager) {
  // 
  //   Requires:
  //       RHCF3-21779 - test_storage_volume_attach[openstack]
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Cloud
  //       caseimportance: medium
  //       initialEstimate: 1/16h
  //       startsin: 5.7
  //       testSteps:
  //           1. Check after attached status of volume in-used or not
  //           2. Now try to delete volume from Detail page
  //           3. Navigate on All page
  //           4. try to delete volume from All page
  //       expectedResults:
  //           1. check for flash message \" Cloud Volume \"Volume_name\" cannot be
  //           removed because it is attached to one or more Instances \"
  //           2.
  //           3.
  //           4. check for flash message \" Cloud Volume \"Volume_name\" cannot be
  //           removed because it is attached to one or more Instances \"
  //       
  try {
    attached_volume.delete({from_manager});
    pytest.fail("Attached volume was deleted!")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      let view;

      if (is_bool(from_manager)) {
        view = attached_volume.browser.create_view(
          StorageManagerVolumeAllView,
          {additional_context: {object: attached_volume.parent.manager}}
        )
      } else {
        view = attached_volume.create_view(VolumeDetailsView)
      };

      if (!view.flash.assert_message("Cloud Volume \"{}\" cannot be removed because it is attached to one or more Instances".format(attached_volume.name))) {
        throw new ()
      }
    } else {
      throw $EXCEPTION
    }
  }
};

function test_storage_volume_edit_tag(volume) {
  //  Test add and remove tag to storage volume
  //   prerequisites:
  //       * Storage Volume
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       testSteps:
  //           1. Add tag
  //           2. Remove tag
  //       expectedResults:
  //           1. Check that tag is added
  //           2. Checked that tag is removed
  //   
  let added_tag = volume.add_tag();
  let tag_available = volume.get_tags();
  if (tag_available[0].display_name != added_tag.display_name) throw new ();

  if (tag_available[0].category.display_name != added_tag.category.display_name) {
    throw new ()
  };

  volume.remove_tag(added_tag);
  tag_available = volume.get_tags();
  if (!!tag_available) throw new ()
};

function test_multiple_cloud_volumes_tag_edit(appliance, soft_assert) {
  // Test tag can be added to multiple volumes at once
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/12h
  //       casecomponent: Configuration
  //   
  let all_volumes = appliance.collections.volumes.all();
  let volumes = (all_volumes.size > 4 ? all_volumes[_.range(0, 3)] : all_volumes);
  let assigned_tag = appliance.collections.volumes.add_tag(volumes);

  for (let item in volumes) {
    let tag_available = item.get_tags();

    soft_assert.call(
      tag_available.map(tag => (
        tag.category.display_name == assigned_tag.category.display_name && tag.display_name == assigned_tag.display_name
      )).is_any,

      `Tag is not assigned to volume ${item.name}`
    )
  };

  appliance.collections.volumes.remove_tag(volumes, assigned_tag);

  for (let item in volumes) {
    soft_assert.call(!item.get_tags())
  }
}
