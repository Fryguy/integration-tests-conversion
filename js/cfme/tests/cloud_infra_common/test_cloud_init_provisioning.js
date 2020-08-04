require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/infrastructure/pxe");
include(Cfme.Infrastructure.Pxe);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/tests/infrastructure/test_provisioning_dialog");
include(Cfme.Tests.Infrastructure.Test_provisioning_dialog);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pf1 = ProviderFilter({
  classes: [CloudProvider, InfraProvider],
  required_fields: [["provisioning", "ci-template"]]
});

let pf2 = ProviderFilter({classes: [SCVMMProvider], inverted: true});

let pytestmark = [
  pytest.mark.meta({server_roles: "+automate"}),

  pytest.mark.provider({
    gen_func: providers,
    filters: [pf1, pf2],
    scope: "module"
  })
];

function find_global_ipv6(vm) {
  // 
  //   Find global IPv6 on a VM if present.
  // 
  //   Args:
  //       vm: InfraVm object
  // 
  //   Returns: IPv6 as a string if found, False otherwise
  //   
  let all_ips = vm.mgmt.all_ips;

  for (let ip in all_ips) {
    if (is_bool(ip.include(":") && !ip.startswith("fe80"))) return ip
  };

  return false
};

function setup_ci_template(provider, appliance) {
  let cloud_init_template_name = provider.data.provisioning["ci-template"];

  get_template_from_config(
    cloud_init_template_name,
    {create: true, appliance}
  )
};

function vm_name() {
  return random_vm_name("ci")
};

function test_provision_cloud_init(appliance, request, setup_provider, provider, provisioning, setup_ci_template, vm_name) {
  //  Tests provisioning from a template with cloud_init
  // 
  //   Metadata:
  //       test_flag: cloud_init, provision
  // 
  //   Bugzilla:
  //       1619744
  //       1797706
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Provisioning
  //   
  let image = (provisioning.get("ci-image")) || provisioning.image.name;

  let note = "Testing provisioning from image {} to vm {} on provider {}".format(
    image,
    vm_name,
    provider.key
  );

  logger.info(note);
  let mgmt_system = provider.mgmt;

  let inst_args = {
    request: {notes: note},
    customize: {custom_template: {name: provisioning["ci-template"]}}
  };

  inst_args.template_name = image;

  if (is_bool(provider.one_of(AzureProvider))) {
    inst_args.environment = {public_ip_address: "New"}
  };

  if (is_bool(provider.one_of(OpenStackProvider))) {
    let ip_pool = provider.data.public_network;
    let floating_ip = mgmt_system.get_first_floating_ip({pool: ip_pool});
    provider.refresh_provider_relationships();
    inst_args.environment = {public_ip_address: floating_ip};
    let inst_arg_props = inst_args.setdefault("properties", {});
    inst_arg_props.instance_type = partial_match(provisioning["ci-flavor-name"])
  };

  if (is_bool(provider.one_of(InfraProvider) && appliance.version > "5.9")) {
    inst_args.customize.customize_type = "Specification"
  };

  logger.info(`Instance args: ${inst_args}`);
  let collection = appliance.provider_based_collection(provider);

  let instance = collection.create(
    vm_name,
    provider,
    {form_values: inst_args}
  );

  request.addfinalizer(instance.cleanup_on_provider);

  let provision_request = provider.appliance.collections.requests.instantiate(
    vm_name,
    {partial_check: true}
  );

  check_all_tabs(provision_request, provider);
  provision_request.wait_for_request();
  wait_for(() => !instance.ip_address.equal(null), {num_sec: 600});
  let connect_ip = instance.ip_address;
  if (!connect_ip) throw "VM has no IP";

  ssh.SSHClient(
    {
      hostname: connect_ip,
      username: provisioning["ci-username"],
      password: provisioning["ci-pass"]
    },

    ssh_client => (
      wait_for(ssh_client.uptime, {num_sec: 200, handle_exception: true})
    )
  )
};

function test_provision_cloud_init_payload(appliance, request, setup_provider, provider, provisioning, vm_name) {
  // 
  //   Tests that options specified in VM provisioning dialog in UI are properly passed as a cloud-init
  //   payload to the newly provisioned VM.
  // 
  //   Metadata:
  //       test_flag: cloud_init, provision
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Provisioning
  //   
  let image = provisioning.get("ci-image", null);

  if (is_bool(!image)) {
    pytest.skip("No ci-image found in provider specification.")
  };

  let note = "Testing provisioning from image {image} to vm {vm} on provider {provider}".format({
    image,
    vm: vm_name,
    provider: provider.key
  });

  logger.info(note);

  let ci_payload = {
    root_password: "mysecret",
    address_mode: "Static",
    hostname: "cimachine",
    ip_address: "169.254.0.1",
    subnet_mask: "29",
    gateway: "169.254.0.2",
    dns_servers: "169.254.0.3",
    dns_suffixes: "virt.lab.example.com",
    custom_template: {name: "oVirt cloud-init"}
  };

  let inst_args = {
    request: {notes: note},
    customize: {customize_type: "Specification"},
    template_name: image
  };

  inst_args.customize.update(ci_payload);
  logger.info(`Instance args: ${inst_args}`);
  let collection = appliance.provider_based_collection(provider);

  let instance = collection.create(
    vm_name,
    provider,
    {form_values: inst_args}
  );

  request.addfinalizer(instance.cleanup_on_provider);

  let provision_request = provider.appliance.collections.requests.instantiate(
    vm_name,
    {partial_check: true}
  );

  check_all_tabs(provision_request, provider);
  provision_request.wait_for_request();

  let connect_ip = wait_for(
    method("find_global_ipv6"),
    {func_args: [instance], num_sec: 600, delay: 20}
  ).out;

  logger.info(`Connect IP: ${connect_ip}`);

  ssh.SSHClient(
    {
      hostname: connect_ip,
      username: "root",
      password: ci_payload.root_password
    },

    (ssh_client) => {
      let hostname_cmd = ssh_client.run_command("hostname");
      if (!hostname_cmd.success) throw new ();
      if (hostname_cmd.output.strip() != ci_payload.hostname) throw new ();
      let network_cfg_cmd = ssh_client.run_command("cat /etc/sysconfig/network-scripts/ifcfg-eth0");
      if (!network_cfg_cmd.success) throw new ();
      let config_list = network_cfg_cmd.output.split_p("\n");

      if (!config_list.include("BOOTPROTO=none")) {
        throw "Address mode was not set to static"
      };

      if (!config_list.include("IPADDR={}".format(ci_payload.ip_address))) {
        throw new ()
      };

      if (!config_list.include("PREFIX={}".format(ci_payload.subnet_mask))) {
        throw new ()
      };

      if (!config_list.include("GATEWAY={}".format(ci_payload.gateway))) {
        throw new ()
      };

      if (!config_list.include("DNS1={}".format(ci_payload.dns_servers))) {
        throw new ()
      };

      if (!config_list.include("DOMAIN={}".format(ci_payload.dns_suffixes))) {
        throw new ()
      }
    }
  )
}
