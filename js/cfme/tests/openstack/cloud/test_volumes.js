// Tests for Openstack cloud volumes
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.provider([OpenStackProvider], {scope: "module"})
];

const VOLUME_SIZE = 1;

function volume(appliance, provider) {
  let collection = appliance.collections.volumes;
  let az = (appliance.version < "5.11" ? null : provider.data.provisioning.availability_zone);

  let volume = collection.create({
    name: fauxfactory.gen_alpha({start: "vol_"}),
    from_manager: false,
    az,
    tenant: provider.data.provisioning.cloud_tenant,
    volume_size: VOLUME_SIZE,
    provider
  });

  yield(volume);

  try {
    if (is_bool(volume.exists)) volume.delete({wait: false})
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      logger.warning("Exception during volume deletion - skipping..")
    } else {
      throw $EXCEPTION
    }
  }
};

function volume_with_type(appliance, provider) {
  let vol_type = provider.mgmt.capi.volume_types.create({name: fauxfactory.gen_alpha({start: "type_"})});

  let volume_type = appliance.collections.volume_types.instantiate(
    vol_type.name,
    provider
  );

  let az = (appliance.version < "5.11" ? null : provider.data.provisioning.availability_zone);

  let volume_type_is_displayed = () => {
    volume_type.refresh();
    return volume_type.exists
  };

  let collection = appliance.collections.volumes;

  let volume = collection.create({
    name: fauxfactory.gen_alpha({start: "vol_"}),
    from_manager: false,
    az,
    tenant: provider.data.provisioning.cloud_tenant,
    volume_type: volume_type.name,
    volume_size: VOLUME_SIZE,
    provider
  });

  yield(volume);
  if (is_bool(volume.exists)) volume.delete({wait: false});

  if (is_bool(volume_type.exists)) {
    provider.mgmt.capi.volume_types.delete(vol_type)
  }
};

function new_instance(provider) {
  let instance_name = fauxfactory.gen_alpha(15, {start: "test_vol_"});
  let collection = provider.appliance.provider_based_collection(provider);
  let instance = collection.create_rest(instance_name, provider);
  yield(instance);
  instance.cleanup_on_provider()
};

function test_create_volume(volume, provider) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (!volume.exists) throw new ();
  if (volume.size != `${VOLUME_SIZE} GB`) throw new ();
  if (volume.tenant != provider.data.provisioning.cloud_tenant) throw new ()
};

function test_edit_volume(volume, appliance) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let new_name = fauxfactory.gen_alpha(15, {start: "edited_"});
  update(volume, () => volume.name = new_name);
  let view = navigate_to(appliance.collections.volumes, "All");

  if (!view.entities.get_entity({name: new_name, surf_pages: true})) {
    throw new ()
  }
};

function test_delete_volume(volume) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  volume.delete();
  if (!!volume.exists) throw new ()
};

function test_create_volume_with_type(volume_with_type, provider) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (!volume_with_type.exists) throw new ();
  if (volume_with_type.size != `${VOLUME_SIZE} GB`) throw new ();

  if (volume_with_type.tenant != provider.data.provisioning.cloud_tenant) {
    throw new ()
  }
};

function test_edit_volume_with_type(volume_with_type, appliance) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let new_name = fauxfactory.gen_alpha(15, {start: "edited_"});
  update(volume_with_type, () => volume_with_type.name = new_name);
  let view = navigate_to(appliance.collections.volumes, "All");

  if (!view.entities.get_entity({name: new_name, surf_pages: true})) {
    throw new ()
  }
};

function test_delete_volume_with_type(volume_with_type) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  volume_with_type.delete();
  if (!!volume_with_type.exists) throw new ()
};

function test_volume_attach_detach_instance(volume, new_instance, appliance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let initial_instance_count = volume.instance_count;
  volume.attach_instance(new_instance.name);

  let view = appliance.browser.create_view(navigator.get_class(
    volume,
    "Details"
  ).VIEW);

  view.flash.assert_success_message("Attaching Cloud Volume \"{name}\" to {instance} finished".format({
    name: volume.name,
    instance: new_instance.name
  }));

  let volume_attached_to_instance = () => {
    new_instance.refresh_relationships();
    return volume.instance_count == initial_instance_count + 1
  };

  volume.detach_instance(new_instance.name);

  view = appliance.browser.create_view(navigator.get_class(
    method("volume"),
    "Details"
  ).VIEW);

  view.flash.assert_success_message("Detaching Cloud Volume \"{name}\" from {instance} finished".format({
    name: volume.name,
    instance: new_instance.name
  }));

  let volume_detached_from_instance = () => {
    new_instance.refresh_relationships();
    return volume.instance_count == initial_instance_count
  }
}
