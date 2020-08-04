require_relative("wrapanapi");
include(Wrapanapi);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure");
include(Cfme.Infrastructure);
var host_ui = host.bind(this);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.smartstate,
  pytest.mark.meta({server_roles: "+smartproxy +smartstate"}),
  pytest.mark.provider([VMwareProvider], {selector: ONE_PER_VERSION}),
  pytest.mark.usefixtures("setup_provider")
];

let vddk_versions = ["v6_0", "v6_5", "v6_7"];

function ssa_analysis_profile(appliance) {
  let collected_files = [];

  for (let file in ["/etc/hosts", "/etc/passwd"]) {
    collected_files.push({Name: file, "Collect Contents?": true})
  };

  let analysis_profile_name = fauxfactory.gen_alphanumeric(
    18,
    {start: "ssa_analysis_"}
  );

  let analysis_profile_collection = appliance.collections.analysis_profiles;

  let analysis_profile = analysis_profile_collection.create({
    name: analysis_profile_name,
    description: analysis_profile_name,
    profile_type: analysis_profile_collection.VM_TYPE,
    categories: ["System"],
    files: collected_files
  });

  yield;
  if (is_bool(analysis_profile.exists)) analysis_profile.delete()
};

function configure_vddk(request, appliance, provider, vm) {
  let vddk_version = request.param;

  let vddk_url = conf.cfme_data.get("basic_info", {}).get(
    "vddk_url",
    {}
  ).get(vddk_version, null);

  if (vddk_url === null) {
    pytest.skip("Could not locate vddk url in cfme_data")
  } else {
    appliance.install_vddk({vddk_url})
  };

  let view = navigate_to(vm, "Details");
  let host_name = view.entities.summary("Relationships").get_text_of("Host");

  let [host] = provider.hosts.all().select(host => host.name == host_name).map(host => (
    host
  ));

  let [host_data] = provider.data.hosts.select(data => data.name == host.name).map(data => (
    data
  ));

  let host_collection = appliance.collections.hosts;

  let host_obj = host_collection.instantiate({
    name: host.name,
    provider
  });

  update(host_obj, {validate_credentials: true}, () => (
    host_obj.credentials = {default: host_ui.Host.Credential.from_config(host_data.credentials.default)}
  ));

  let _finalize = () => {
    appliance.uninstall_vddk();

    return update(host_obj, () => (
      host_obj.credentials = {default: host_ui.Host.Credential({
        principal: "",
        secret: "",
        verify_secret: ""
      })}
    ))
  }
};

function vm(request, provider, small_template, ssa_analysis_profile) {
  //  Fixture to provision instance on the provider 
  let vm_name = random_vm_name("ssa", {max_length: 16});

  let vm_obj = provider.appliance.collections.infra_vms.instantiate(
    vm_name,
    provider,
    small_template.name
  );

  vm_obj.create_on_provider({find_in_cfme: true, allow_skip: "default"});
  vm_obj.mgmt.ensure_state(VmState.RUNNING);

  let _finalize = () => {
    try {
      vm_obj.cleanup_on_provider();
      provider.refresh_provider_relationships()
    } catch (e) {
      if (e instanceof Exception) {
        logger.exception(e)
      } else {
        throw e
      }
    }
  };

  return vm_obj
};

function test_ssa_vddk(vm, configure_vddk) {
  // Check if different version of vddk works with provider
  // 
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       initialEstimate: 1/2h
  //   
  vm.smartstate_scan({wait_for_task_result: true});
  let view = navigate_to(vm, "Details");
  let c_users = view.entities.summary("Security").get_text_of("Users");
  let c_groups = view.entities.summary("Security").get_text_of("Groups");
  if (![c_users != 0, c_groups != 0].is_any) throw new ()
}
