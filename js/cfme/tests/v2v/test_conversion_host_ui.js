// Test to validate conversion host UI.
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/fixtures/v2v_fixtures");
include(Cfme.Fixtures.V2v_fixtures);
require_relative("cfme/fixtures/v2v_fixtures");
include(Cfme.Fixtures.V2v_fixtures);
require_relative("cfme/fixtures/v2v_fixtures");
include(Cfme.Fixtures.V2v_fixtures);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils");
include(Cfme.Utils);

let pytestmark = [
  test_requirements.v2v,

  pytest.mark.provider({
    classes: [RHEVMProvider, OpenStackProvider],
    selector: ONE_PER_VERSION,
    required_flags: ["v2v"],
    scope: "module"
  }),

  pytest.mark.provider({
    classes: [VMwareProvider],
    selector: ONE_PER_VERSION,
    fixture_name: "source_provider",
    required_flags: ["v2v"],
    scope: "module"
  }),

  pytest.mark.usefixtures("v2v_provider_setup")
];

function get_vmware_ssh_key(transformation_method, source_provider) {
  // Get vmware ssh keys from yaml required only when transformation method is SSH
  let vmware_ssh_key = null;

  if (transformation_method == "SSH") {
    let ssh_key_name = source_provider.data["private-keys"]["vmware-ssh-key"].credentials;
    vmware_ssh_key = conf.credentials[ssh_key_name].password
  };

  return vmware_ssh_key
};

function get_tls_key(provider) {
  // Get TLS cert from yaml for OSP provider
  let tls_key_name = provider.data["private-keys"].tls_cert.credentials;
  let tls_cert_key = conf.credentials[tls_key_name].password;
  return tls_cert_key
};

function test_add_conversion_host_ui_crud(appliance, delete_conversion_hosts, source_provider, provider) {
  let hosts, default_value, osp_cert_switch, osp_ca_cert;

  // 
  //       Test CRUD operations for conversion host from UI
  //       Polarion:
  //           assignee: sshveta
  //           caseimportance: medium
  //           caseposneg: positive
  //           testtype: functional
  //           startsin: 5.10
  //           casecomponent: V2V
  //           initialEstimate: 1/4h
  //       
  let transformation_method = "VDDK";
  let temp_file = tempfile.NamedTemporaryFile("w");

  open(
    temp_file.name,
    "w",
    f => f.write(get_conversion_data(appliance, provider).private_key)
  );

  let conv_host_key = temp_file.name;

  if (is_bool(provider.one_of(RHEVMProvider))) {
    hosts = provider.hosts.all().map(h => h.name);
    default_value = "Default";
    osp_cert_switch = null;
    osp_ca_cert = null
  } else {
    hosts = provider.data.conversion_instances;
    default_value = "admin";
    osp_cert_switch = true;
    osp_ca_cert = get_tls_key(provider)
  };

  let conv_host_collection = appliance.collections.v2v_conversion_hosts;

  for (let host in hosts) {
    let conv_host = conv_host_collection.create({
      target_provider: provider,
      cluster: get_data(provider, "clusters", default_value),
      hostname: host,
      conv_host_key,
      transformation_method,
      vddk_library_path: vddk_url(),

      vmware_ssh_key: get_vmware_ssh_key(
        transformation_method,
        source_provider
      ),

      osp_cert_switch,
      osp_ca_cert
    });

    if (!conv_host.is_host_configured) throw new ();
    if (!conv_host.remove_conversion_host()) throw new ();
    if (!conv_host.is_host_removed) throw new ()
  }
}
