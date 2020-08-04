// This module tests events that are invoked by Cloud/Infra VMs.
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/cloud/provider/gce");
include(Cfme.Cloud.Provider.Gce);
require_relative("cfme/control/explorer/policies");
include(Cfme.Control.Explorer.Policies);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/kubevirt");
include(Cfme.Infrastructure.Provider.Kubevirt);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let all_prov = ProviderFilter({
  classes: [InfraProvider, CloudProvider],
  required_fields: ["provisioning", "events"]
});

let excluded = ProviderFilter({
  classes: [KubeVirtProvider],
  inverted: true
});

let pytestmark = [
  pytest.mark.usefixtures(
    "uses_infra_providers",
    "uses_cloud_providers"
  ),

  pytest.mark.tier(2),

  pytest.mark.provider({
    gen_func: providers,
    filters: [all_prov, excluded],
    scope: "module"
  }),

  test_requirements.events
];

function vm_crud(provider, setup_provider_modscope, small_template_modscope) {
  let template = small_template_modscope;
  let base_name = (is_bool(provider.one_of(GCEProvider)) ? "test-events-" : "test_events_");
  let vm_name = fauxfactory.gen_alpha(20, {start: base_name}).downcase();
  let collection = provider.appliance.provider_based_collection(provider);

  let vm = collection.instantiate(
    vm_name,
    provider,
    {template_name: template.name}
  );

  yield(vm);
  vm.cleanup_on_provider()
};

function test_vm_create(request, appliance, vm_crud, provider, register_event) {
  //  Test whether vm_create_complete event is emitted.
  // 
  //   Prerequisities:
  //       * A provider that is set up and able to deploy VMs
  // 
  //   Steps:
  //       * Create a Control setup (action, policy, profile) that apply a tag on a VM when
  //           ``VM Create Complete`` event comes
  //       * Deploy the VM outside of CFME (directly in the provider)
  //       * Refresh provider relationships and wait for VM to appear
  //       * Assert the tag appears.
  // 
  //   Metadata:
  //       test_flag: provision, events
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Events
  //       caseimportance: high
  //       initialEstimate: 1/8h
  //   
  let action = appliance.collections.actions.create(
    fauxfactory.gen_alpha(),
    "Tag",
    {}
  );

  request.addfinalizer(action.delete);

  let policy = appliance.collections.policies.create(
    VMControlPolicy,
    fauxfactory.gen_alpha()
  );

  request.addfinalizer(policy.delete);
  policy.assign_events("VM Create Complete");
  let _cleanup = () => policy.unassign_events("VM Create Complete");
  policy.assign_actions_to_event("VM Create Complete", action);

  let profile = appliance.collections.policy_profiles.create(
    fauxfactory.gen_alpha(),
    {policies: [policy]}
  );

  request.addfinalizer(profile.delete);
  provider.assign_policy_profiles(profile.description);

  request.addfinalizer(() => (
    provider.unassign_policy_profiles(profile.description)
  ));

  register_event({
    target_type: "VmOrTemplate",
    target_name: vm_crud.name,
    event_type: "vm_create"
  });

  vm_crud.create_on_provider({find_in_cfme: true});

  let _check = () => (
    vm_crud.get_tags().map(tag => (
      tag.category.display_name == "Environment" && tag.display_name == "Development"
    )).is_any
  );

  wait_for(
    method("_check"),
    {num_sec: 300, delay: 15, message: "tags to appear"}
  )
}
