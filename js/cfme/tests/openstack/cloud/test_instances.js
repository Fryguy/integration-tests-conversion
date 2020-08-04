// Tests for Openstack cloud instances
require_relative("selenium/common/exceptions");
include(Selenium.Common.Exceptions);
require_relative("wait_for");
include(Wait_for);
require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("wrapanapi/entities");
include(Wrapanapi.Entities);
require_relative("cfme/cloud/instance/openstack");
include(Cfme.Cloud.Instance.Openstack);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/exceptions");
include(Cfme.Exceptions);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider_modscope"),

  pytest.mark.provider(
    [OpenStackProvider],

    {scope: "module", required_fields: [
      ["provisioning", "cloud_tenant"],
      ["provisioning", "cloud_network"],
      ["provisioning", "instance_type"]
    ]}
  )
];

const VOLUME_SIZE = 1;

function new_instance(provider) {
  let prov_data = provider.data.provisioning;

  let prov_form_data = {
    request: {
      email: fauxfactory.gen_email(),
      first_name: fauxfactory.gen_alpha(),
      last_name: fauxfactory.gen_alpha()
    },

    catalog: {num_vms: "1", vm_name: random_vm_name("osp")},

    environment: {
      cloud_network: prov_data.cloud_network,
      cloud_tenant: prov_data.cloud_tenant
    },

    properties: {instance_type: partial_match(prov_data.instance_type)}
  };

  let instance_name = prov_form_data.catalog.vm_name;

  try {
    let instance = provider.appliance.collections.cloud_instances.create(
      instance_name,
      provider,
      prov_form_data,
      {find_in_cfme: true}
    )
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip("Unable to find an image map in provider \"{}\" provisioning data: {}".format(
        provider,
        prov_data
      ))
    } else {
      throw $EXCEPTION
    }
  };

  yield(instance);

  // pass
  try {
    instance.cleanup_on_provider()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {

    } else {
      throw $EXCEPTION
    }
  }
};

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
  if (is_bool(volume.exists)) volume.delete({wait: false})
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

function test_create_instance(new_instance, soft_assert) {
  // Creates an instance and verifies it appears on UI
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(new_instance, "Details");
  let prov_data = new_instance.provider.data.provisioning;
  let power_state = view.entities.summary("Power Management").get_text_of("Power State");
  if (power_state != OpenStackInstance.STATE_ON) throw new ();
  let vm_tmplt = view.entities.summary("Relationships").get_text_of("VM Template");
  soft_assert.call(vm_tmplt == prov_data.image.name);

  let props = [
    ["Availability Zone", "availability_zone"],
    ["Cloud Tenants", "cloud_tenant"],
    ["Flavor", "instance_type"]
  ];

  if (current_version() >= "5.7") {
    props.push(["Virtual Private Cloud", "cloud_network"])
  };

  for (let p in props) {
    let v = view.entities.summary("Relationships").get_text_of(p[0]);
    soft_assert.call(v == prov_data[p[1]])
  }
};

function test_stop_instance(new_instance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  new_instance.power_control_from_cfme({
    from_details: true,
    option: OpenStackInstance.STOP
  });

  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_OFF);
  let view = navigate_to(new_instance, "Details");
  let state = view.entities.summary("Power Management").get_text_of("Power State");
  if (state != OpenStackInstance.STATE_OFF) throw new ()
};

function test_suspend_instance(new_instance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  new_instance.power_control_from_cfme({
    from_details: true,
    option: OpenStackInstance.SUSPEND
  });

  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_SUSPENDED);
  let view = navigate_to(new_instance, "Details");
  let state = view.entities.summary("Power Management").get_text_of("Power State");
  if (state != OpenStackInstance.STATE_SUSPENDED) throw new ()
};

function test_pause_instance(new_instance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  new_instance.power_control_from_cfme({
    from_details: true,
    option: OpenStackInstance.PAUSE
  });

  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_PAUSED);
  let view = navigate_to(new_instance, "Details");
  let state = view.entities.summary("Power Management").get_text_of("Power State");
  if (state != OpenStackInstance.STATE_PAUSED) throw new ()
};

function test_shelve_instance(new_instance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  new_instance.power_control_from_cfme({
    from_details: true,
    option: OpenStackInstance.SHELVE
  });

  try {
    new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_SHELVED)
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      logger.warning("Timeout when waiting for instance state: 'shelved'. Skipping")
    } else {
      throw $EXCEPTION
    }
  };

  let view = navigate_to(new_instance, "Details");
  let state = view.entities.summary("Power Management").get_text_of("Power State");

  if (![
    OpenStackInstance.STATE_SHELVED_OFFLOAD,
    OpenStackInstance.STATE_SHELVED
  ].include(state)) throw new ()
};

function test_shelve_offload_instance(new_instance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  new_instance.power_control_from_cfme({
    from_details: true,
    option: OpenStackInstance.SHELVE
  });

  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_SHELVED);

  try {
    new_instance.power_control_from_cfme({
      from_details: true,
      option: OpenStackInstance.SHELVE_OFFLOAD
    })
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimeoutException) {
      logger.warning("Timeout when initiating power state 'Shelve Offload'. Skipping")
    } else {
      throw $EXCEPTION
    }
  };

  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_SHELVED_OFFLOAD);
  let view = navigate_to(new_instance, "Details");
  let state = view.entities.summary("Power Management").get_text_of("Power State");
  if (state != OpenStackInstance.STATE_SHELVED_OFFLOAD) throw new ()
};

function test_start_instance(new_instance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  new_instance.mgmt.ensure_state(VmState.STOPPED);
  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_OFF);

  new_instance.power_control_from_cfme({
    from_details: true,
    option: OpenStackInstance.START
  });

  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_ON);
  let view = navigate_to(new_instance, "Details");
  let state = view.entities.summary("Power Management").get_text_of("Power State");
  if (state != OpenStackInstance.STATE_ON) throw new ()
};

function test_soft_reboot_instance(new_instance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  new_instance.power_control_from_cfme({
    from_details: true,
    option: OpenStackInstance.SOFT_REBOOT
  });

  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_REBOOTING);
  let view = navigate_to(new_instance, "Details");
  let state = view.entities.summary("Power Management").get_text_of("Power State");

  if (![OpenStackInstance.STATE_ON, OpenStackInstance.STATE_REBOOTING].include(state)) {
    throw new ()
  }
};

function test_hard_reboot_instance(new_instance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  new_instance.power_control_from_cfme({
    from_details: true,
    option: OpenStackInstance.HARD_REBOOT
  });

  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_REBOOTING);
  let view = navigate_to(new_instance, "Details");
  let state = view.entities.summary("Power Management").get_text_of("Power State");

  if (![OpenStackInstance.STATE_ON, OpenStackInstance.STATE_REBOOTING].include(state)) {
    throw new ()
  }
};

function test_delete_instance(new_instance, provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  new_instance.power_control_from_cfme({
    from_details: true,
    option: OpenStackInstance.TERMINATE
  });

  new_instance.wait_for_instance_state_change(OpenStackInstance.STATE_UNKNOWN);
  if (!!new_instance.exists_on_provider) throw new ();

  let view = navigate_to(
    new_instance.appliance.collections.cloud_instances.filter({provider: provider}),
    "AllForProvider"
  );

  // pass
  try {
    view.entities.get_entity({name: new_instance.name, surf_pages: true});
    if (!false) throw "entity still exists"
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof ItemNotFound) {

    } else {
      throw $EXCEPTION
    }
  }
};

function test_instance_operating_system_linux(new_instance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(new_instance, "Details");
  let os = view.entities.summary("Properties").get_text_of("Operating System");
  let prov_data_os = new_instance.provider.data.provisioning.image.os_distro;

  if (os != prov_data_os) {
    throw `OS type mismatch: expected ${prov_data_os} and got ${os}`
  }
};

function test_instance_attach_volume(volume, new_instance, appliance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let initial_volume_count = new_instance.volume_count;
  new_instance.attach_volume(volume.name);

  let view = appliance.browser.create_view(navigator.get_class(
    new_instance,
    "AttachVolume"
  ).VIEW);

  view.flash.assert_success_message(`Attaching Cloud Volume \"${volume.name}\" to ${new_instance.name} finished`);

  Wait_for.wait_for(
    () => new_instance.volume_count > initial_volume_count,

    {
      delay: 20,
      timeout: 300,
      message: "Waiting for volume to be attached to instance",
      fail_func: new_instance.refresh_relationships
    }
  )
};

function test_instance_attach_detach_volume_with_type(volume_with_type, new_instance, appliance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let initial_volume_count = new_instance.volume_count;
  new_instance.attach_volume(volume_with_type.name);

  let view = appliance.browser.create_view(navigator.get_class(
    new_instance,
    "Details"
  ).VIEW);

  view.flash.assert_success_message("Attaching Cloud Volume \"{}\" to {} finished".format(
    volume_with_type.name,
    new_instance.name
  ));

  let volume_attached_to_instance = () => {
    new_instance.refresh_relationships();
    return new_instance.volume_count > initial_volume_count
  };

  new_instance.detach_volume(volume_with_type.name);

  view = appliance.browser.create_view(navigator.get_class(
    method("new_instance"),
    "Details"
  ).VIEW);

  view.flash.assert_success_message("Detaching Cloud Volume \"{}\" from {} finished".format(
    volume_with_type.name,
    new_instance.name
  ));

  let volume_detached_from_instance = () => {
    new_instance.refresh_relationships();
    return new_instance.volume_count == initial_volume_count
  }
}
