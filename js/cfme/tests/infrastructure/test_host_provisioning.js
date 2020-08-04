require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/pxe");
include(Cfme.Infrastructure.Pxe);
require_relative("cfme/infrastructure/pxe");
include(Cfme.Infrastructure.Pxe);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.meta({server_roles: "+automate +notifier"}),
  pytest.mark.usefixtures("uses_infra_providers")
];

function pytest_generate_tests(metafunc) {
  let [argnames, argvalues, idlist] = testgen.providers_by_class(
    metafunc,
    [InfraProvider],

    {required_fields: [
      ["host_provisioning", "pxe_server"],
      ["host_provisioning", "pxe_image"],
      ["host_provisioning", "pxe_image_type"],
      ["host_provisioning", "pxe_kickstart"],
      ["host_provisioning", "datacenter"],
      ["host_provisioning", "cluster"],
      ["host_provisioning", "datastores"],
      ["host_provisioning", "hostname"],
      ["host_provisioning", "root_password"],
      ["host_provisioning", "ip_addr"],
      ["host_provisioning", "subnet_mask"],
      ["host_provisioning", "gateway"],
      ["host_provisioning", "dns"]
    ]}
  );

  let [pargnames, pargvalues, pidlist] = testgen.pxe_servers(metafunc);
  let pxe_server_names = pargvalues.map(pval => pval[0]);
  let new_idlist = [];
  let new_argvalues = [];

  for (let [i, argvalue_tuple] in enumerate(argvalues)) {
    try {
      let prov_data = args.provider.data.host_provisioning
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof KeyError) {
        continue
      } else {
        throw $EXCEPTION
      }
    };

    let holder = metafunc.config.pluginmanager.get_plugin("appliance-holder");
    let stream = prov_data.get("runs_on_stream", "");

    if (is_bool(!holder.held_appliance.version.is_in_series(stream.to_s))) {
      continue
    };

    let pxe_server_name = prov_data.get("pxe_server", "");
    if (!pxe_server_names.include(pxe_server_name)) continue;
    let pxe_cust_template = prov_data.get("pxe_kickstart", "");

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
  return get_template_from_config(pxe_cust_template, {appliance})
};

function setup_pxe_servers_host_prov(pxe_server, pxe_cust_template, host_provisioning) {
  if (is_bool(!pxe_server.exists)) {
    pxe_server.create();

    pxe_server.set_pxe_image_type(
      host_provisioning.pxe_image,
      host_provisioning.pxe_image_type
    )
  };

  if (is_bool(!pxe_cust_template.exists)) pxe_cust_template.create()
};

function test_host_provisioning(appliance, setup_provider, cfme_data, host_provisioning, provider, smtp_test, request) {
  // Tests host provisioning
  // 
  //   Metadata:
  //       test_flag: host_provision
  // 
  //   Bugs:
  //       1203775
  //       1232427
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Provisioning
  //   
  let test_host = appliance.collections.hosts.create_from_config("esx");

  let [pxe_server, pxe_image, pxe_image_type, pxe_kickstart, datacenter, cluster, datastores, prov_host_name, root_password, ip_addr, subnet_mask, gateway, dns] = [
    "pxe_server",
    "pxe_image",
    "pxe_image_type",
    "pxe_kickstart",
    "datacenter",
    "cluster",
    "datastores",
    "hostname",
    "root_password",
    "ip_addr",
    "subnet_mask",
    "gateway",
    "dns"
  ].map(_ => host_provisioning.get(_)).to_a;

  let cleanup_host = () => {
    try {
      logger.info(
        "Cleaning up host %s on provider %s",
        prov_host_name,
        provider.key
      );

      let mgmt_system = provider.mgmt;
      let host_list = mgmt_system.list_host();

      if (host_list.include(host_provisioning.ip_addr)) {
        wait_for(mgmt_system.is_host_connected, [host_provisioning.ip_addr]);
        mgmt_system.remove_host_from_cluster(host_provisioning.ip_addr)
      };

      let ipmi = test_host.get_ipmi();
      ipmi.power_off();

      let renamed_host_name1 = "{} ({})".format(
        "IPMI",
        host_provisioning.ipmi_address
      );

      let renamed_host_name2 = "{} ({})".format(
        "VMware ESXi",
        host_provisioning.ip_addr
      );

      let host_collection = appliance.collections.hosts;
      let host_list_ui = host_collection.all({provider});

      if (host_list_ui.include(host_provisioning.hostname)) {
        test_host.delete({cancel: false});
        test_host.wait_for_delete()
      } else if (host_list_ui.map(h => h.name).include(renamed_host_name1)) {
        let host_renamed_obj1 = host_collection.instantiate({
          name: renamed_host_name1,
          provider
        });

        host_renamed_obj1.delete({cancel: false});
        host_renamed_obj1.wait_for_delete()
      } else if (host_list_ui.map(h => h.name).include(renamed_host_name2)) {
        let host_renamed_obj2 = host_collection.instantiate({
          name: renamed_host_name2,
          provider
        });

        host_renamed_obj2.delete({cancel: false});
        host_renamed_obj2.wait_for_delete()
      }
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof Exception) {
        logger.exception(
          "Failed to clean up host %s on provider %s",
          prov_host_name,
          provider.key
        )
      } else {
        throw $EXCEPTION
      }
    }
  };

  request.addfinalizer(method("cleanup_host"));
  let view = navigate_to(test_host, "Provision");
  let note = `Provisioning host ${prov_host_name} on provider ${provider.key}`;

  let provisioning_data = {
    request: {
      email: "template_provisioner@example.com",
      first_name: "Template",
      last_name: "Provisioner",
      notes: note
    },

    catalog: {pxe_server: pxe_server, pxe_image: {name: [pxe_image]}},

    environment: {
      provider_name: provider.name,
      datastore_name: {name: datastores},
      cluster: `${datacenter} / ${cluster}`,
      host_name: prov_host_name
    },

    customize: {
      root_password: root_password,
      ip_address: ip_addr,
      subnet_mask: subnet_mask,
      gateway: gateway,
      dns_servers: dns,
      custom_template: {name: [pxe_kickstart]}
    }
  };

  view.form.fill_with(
    provisioning_data,
    {on_change: view.form.submit_button}
  );

  view.flash.assert_success_message("Host Request was Submitted, you will be notified when your Hosts are ready");
  let request_description = `PXE install on [${prov_host_name}] from image [${pxe_image}]`;
  let host_request = appliance.collections.requests.instantiate(request_description);
  host_request.wait_for_request({method: "ui"});

  if (host_request.row.last_message.text != "Host Provisioned Successfully") {
    throw new ()
  };

  if (host_request.row.status.text == "Error") throw new ();
  view = navigate_to(test_host, "Details");

  if (view.entities.summary("Relationships").get_text_of("Infrastructure Provider") != provider.name) {
    throw "Provider name does not match"
  };

  if (view.entities.summary("Relationships").get_text_of("Cluster") != host_provisioning.cluster) {
    throw "Cluster does not match"
  };

  let requested_ds = host_provisioning.datastores;
  datastores = test_host.get_datastores();

  if (!new Set(requested_ds).issubset(datastores)) {
    throw "Datastores are missing some members"
  };

  let verify = () => (
    (smtp_test.get_emails({subject_like: ("Your host provisioning request has Completed - Host:%%").format(prov_host_name)})).size > 0
  );

  wait_for(
    method("verify"),
    {message: "email receive check", delay: 5}
  )
}
