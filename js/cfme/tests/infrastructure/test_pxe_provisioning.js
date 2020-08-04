require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
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
  pytest.mark.meta({server_roles: "+automate +notifier"}),
  pytest.mark.usefixtures("uses_infra_providers"),
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
    let provider = args.provider;
    if (is_bool(provider.one_of(SCVMMProvider))) continue;
    let provisioning_data = provider.data.provisioning;
    let pxe_server_name = provisioning_data.pxe_server;
    if (!pxe_server_names.include(pxe_server_name)) continue;
    let pxe_cust_template = provisioning_data.pxe_kickstart;

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

function vm_name() {
  let vm_name = fauxfactory.gen_alphanumeric(
    20,
    {start: "test_pxe_prov_"}
  );

  return vm_name
};

function test_pxe_provision_from_template(appliance, provider, vm_name, setup_provider, request, setup_pxe_servers_vm_prov) {
  // Tests provisioning via PXE
  // 
  //   Metadata:
  //       test_flag: pxe, provision
  //       suite: infra_provisioning
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  //       testtype: functional
  //       upstream: yes
  //   
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
  ].map(_ => provider.data.provisioning.get(_)).to_a;

  request.addfinalizer(() => (
    appliance.collections.infra_vms.instantiate(vm_name, provider).cleanup_on_provider()
  ));

  let provisioning_data = {
    catalog: {
      vm_name: vm_name,
      provision_type: "PXE",
      pxe_server: pxe_server,
      pxe_image: {name: pxe_image}
    },

    environment: {
      host_name: {name: host},
      datastore_name: {name: datastore}
    },

    customize: {
      custom_template: {name: pxe_kickstart},
      root_password: pxe_root_password
    },

    network: {vlan: partial_match(pxe_vlan)}
  };

  do_vm_provisioning(
    appliance,
    pxe_template,
    provider,
    vm_name,
    provisioning_data,
    request,
    {num_sec: 3600}
  )
}
