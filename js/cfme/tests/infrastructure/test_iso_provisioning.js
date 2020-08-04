require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/pxe");
include(Cfme.Infrastructure.Pxe);
require_relative("cfme/infrastructure/pxe");
include(Cfme.Infrastructure.Pxe);
require_relative("cfme/provisioning");
include(Cfme.Provisioning);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);

let pytestmark = [
  pytest.mark.meta({server_roles: "+automate"}),
  pytest.mark.usefixtures("uses_infra_providers"),
  pytest.mark.tier(2)
];

function pytest_generate_tests(metafunc) {
  let [argnames, argvalues, idlist] = testgen.providers_by_class(
    metafunc,
    [InfraProvider],

    {required_fields: [
      ["iso_datastore", true],
      ["provisioning", "host"],
      ["provisioning", "datastore"],
      ["provisioning", "iso_template"],
      ["provisioning", "iso_file"],
      ["provisioning", "iso_kickstart"],
      ["provisioning", "iso_root_password"],
      ["provisioning", "iso_image_type"],
      ["provisioning", "vlan"]
    ]}
  );

  let new_idlist = [];
  let new_argvalues = [];

  for (let [i, argvalue_tuple] in enumerate(argvalues)) {
    if (args.provider.type == "scvmm") continue;
    let iso_cust_template = args.provider.data.provisioning.iso_kickstart;

    if (!Cfme.cfme_data.get("customization_templates", {}).keys().to_a.include(iso_cust_template)) {
      continue
    };

    new_idlist.push(idlist[i]);
    new_argvalues.push(argvalues[i])
  };

  testgen.parametrize(
    metafunc,
    argnames,
    new_argvalues,
    {ids: new_idlist, scope: "module"}
  )
};

function iso_cust_template(provider, appliance) {
  let iso_cust_template = provider.data.provisioning.iso_kickstart;

  return get_template_from_config(
    iso_cust_template,
    {create: true, appliance}
  )
};

function iso_datastore(provider, appliance) {
  return ISODatastore(provider.name, {appliance})
};

function datastore_init(iso_cust_template, iso_datastore, provisioning, setup_provider, appliance) {
  if (is_bool(!iso_datastore.exists())) iso_datastore.create();
  let iso_image_type = appliance.collections.system_image_types.instantiate({name: provisioning.iso_image_type});

  let iso_image = appliance.collections.system_images.instantiate({
    name: provisioning.iso_file,
    image_type: iso_image_type,
    datastore: iso_datastore
  });

  iso_image.set_image_type()
};

function vm_name() {
  let vm_name = fauxfactory.gen_alphanumeric(
    20,
    {start: "test_iso_prov_"}
  );

  return vm_name
};

function test_iso_provision_from_template(appliance, provider, vm_name, datastore_init, request) {
  // Tests ISO provisioning
  // 
  //   Metadata:
  //       test_flag: iso, provision
  //       suite: infra_provisioning
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Provisioning
  //       initialEstimate: 1/4h
  //   
  let [iso_template, host, datastore, iso_file, iso_kickstart, iso_root_password, iso_image_type, vlan, addr_mode] = [
    "pxe_template",
    "host",
    "datastore",
    "iso_file",
    "iso_kickstart",
    "iso_root_password",
    "iso_image_type",
    "vlan",
    "iso_address_mode"
  ].map(_ => provider.data.provisioning.get(_)).to_a;

  request.addfinalizer(() => (
    appliance.collections.infra_vms.instantiate(vm_name, provider).cleanup_on_provider()
  ));

  let provisioning_data = {
    catalog: {
      vm_name: vm_name,
      provision_type: "ISO",
      iso_file: {name: iso_file}
    },

    environment: {
      host_name: {name: host},
      datastore_name: {name: datastore}
    },

    customize: {
      custom_template: {name: iso_kickstart},
      root_password: iso_root_password,
      address_mode: addr_mode
    },

    network: {vlan: partial_match(vlan)},
    schedule: {power_on: false}
  };

  do_vm_provisioning(
    appliance,
    iso_template,
    provider,
    vm_name,
    provisioning_data,
    request,
    {num_sec: 1800}
  )
}
