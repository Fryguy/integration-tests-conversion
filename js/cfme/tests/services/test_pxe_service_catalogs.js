require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/pxe");
include(Cfme.Infrastructure.Pxe);
require_relative("cfme/infrastructure/pxe");
include(Cfme.Infrastructure.Pxe);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);

let pytestmark = [
  pytest.mark.meta({server_roles: "+automate"}),
  pytest.mark.usefixtures("uses_infra_providers"),
  test_requirements.service,
  pytest.mark.tier(2)
];

function pytest_generate_tests(metafunc) {
  let [argnames, argvalues, idlist] = testgen.providers_by_class(
    metafunc,
    [InfraProvider],

    {required_fields: [
      ["provisioning", "pxe_server"],
      ["provisioning", "pxe_image"],
      ["provisioning", "pxe_image_type"],
      ["provisioning", "pxe_kickstart"],
      ["provisioning", "pxe_template"],
      ["provisioning", "datastore"],
      ["provisioning", "host"],
      ["provisioning", "pxe_root_password"],
      ["provisioning", "vlan"]
    ]}
  );

  let [pargnames, pargvalues, pidlist] = testgen.pxe_servers(metafunc);
  argnames = argnames;
  let pxe_server_names = pargvalues.map(pval => pval[0]);
  let new_idlist = [];
  let new_argvalues = [];

  for (let [i, argvalue_tuple] in enumerate(argvalues)) {
    if (args.provider.type == "scvmm") continue;
    let pxe_server_name = args.provider.data.provisioning.pxe_server;
    if (!pxe_server_names.include(pxe_server_name)) continue;
    let pxe_cust_template = args.provider.data.provisioning.pxe_kickstart;

    if (!Cfme.cfme_data.get("customization_templates", {}).keys().to_a.include(pxe_cust_template)) {
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

function pxe_server(appliance, provider) {
  let provisioning_data = provider.data.provisioning;
  let pxe_server_name = provisioning_data.pxe_server;
  return get_pxe_server_from_config(pxe_server_name, {appliance})
};

function pxe_cust_template(appliance, provider) {
  let provisioning_data = provider.data.provisioning;
  let pxe_cust_template = provisioning_data.pxe_kickstart;

  return get_template_from_config(
    pxe_cust_template,
    {create: true, appliance}
  )
};

function setup_pxe_servers_vm_prov(pxe_server, pxe_cust_template, provisioning) {
  if (is_bool(!pxe_server.exists())) pxe_server.create();

  pxe_server.set_pxe_image_type(
    provisioning.pxe_image,
    provisioning.pxe_image_type
  )
};

function catalog_item(appliance, provider, dialog, catalog, provisioning, setup_pxe_servers_vm_prov) {
  let [pxe_template, host, datastore, pxe_server, pxe_image, pxe_kickstart, pxe_root_password, pxe_image_type, pxe_vlan] = [
    "pxe_template",
    "host",
    "datastore",
    "pxe_server",
    "pxe_image",
    "pxe_kickstart",
    "pxe_root_password",
    "pxe_image_type",
    "vlan"
  ].map(_ => provisioning.get(_)).to_a;

  let provisioning_data = {
    catalog: {
      catalog_name: {name: pxe_template, provider: provider.name},
      provision_type: "PXE",
      pxe_server: pxe_server,
      pxe_image: {name: pxe_image},
      vm_name: random_vm_name("pxe_service")
    },

    environment: {
      datastore_name: {name: datastore},
      host_name: {name: host}
    },

    customize: {
      root_password: pxe_root_password,
      custom_template: {name: pxe_kickstart}
    },

    network: {vlan: partial_match(pxe_vlan)}
  };

  let item_name = fauxfactory.gen_alphanumeric(
    15,
    {start: "cat_item_"}
  );

  return appliance.collections.catalog_items.create(
    provider.catalog_item_type,

    {
      name: item_name,
      description: "my catalog",
      display_in: true,
      catalog,
      dialog,
      prov_data: provisioning_data
    }
  )
};

function test_pxe_servicecatalog(appliance, setup_provider, provider, catalog_item, request) {
  // Tests RHEV PXE service catalog
  // 
  //   Metadata:
  //       test_flag: pxe, provision
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/4h
  //   
  let vm_name = catalog_item.prov_data.catalog.vm_name;

  request.addfinalizer(() => (
    appliance.collections.infra_vms.instantiate(
      `${vm_name}0001`,
      provider
    ).cleanup_on_provider()
  ));

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  service_catalogs.order();

  logger.info(
    "Waiting for cfme provision request for service %s",
    catalog_item.name
  );

  let request_description = catalog_item.name;

  let provision_request = appliance.collections.requests.instantiate(
    request_description,
    {partial_check: true}
  );

  provision_request.wait_for_request({num_sec: 3600});
  let msg = `Provisioning failed with the message ${provision_request.rest.message}`;
  if (!provision_request.is_succeeded()) throw msg
}
