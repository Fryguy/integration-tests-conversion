require_relative("wrapanapi");
include(Wrapanapi);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/virtual_machines");
include(Cfme.Utils.Virtual_machines);

let pytestmark = [
  pytest.mark.usefixtures(
    "setup_provider_modscope",
    "uses_infra_providers"
  ),

  pytest.mark.provider({
    gen_func: providers,

    filters: [ProviderFilter({
      classes: [RHEVMProvider, VMwareProvider],

      required_fields: [
        ["templates", "small_template"],
        ["provisioning", "template"],
        ["provisioning", "host"],
        ["provisioning", "datastore"]
      ]
    })],

    scope: "module",
    selector: ONE_PER_TYPE
  }),

  test_requirements.vmware,
  test_requirements.rhev
];

function vm_crud(provider) {
  let collection = provider.appliance.provider_based_collection(provider);
  let vm_name = random_vm_name({context: "pblsh"});
  let vm = collection.instantiate(vm_name, provider);

  try {
    deploy_template(
      vm.provider.key,
      vm_name,
      provider.data.templates.small_template.name,
      {timeout: 2500}
    )
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof [KeyError, NoMethodError]) {
      pytest.skip("Skipping as small_template could not be found on the provider")
    } else {
      throw $EXCEPTION
    }
  };

  vm.wait_to_appear({timeout: 900, load_details: false});
  yield(vm);

  try {
    vm.cleanup_on_provider()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      logger.exception(
        "Exception deleting test vm \"%s\" on %s",
        vm.name,
        provider.name
      )
    } else {
      throw $EXCEPTION
    }
  }
};

function test_publish_vm_to_template(request, vm_crud) {
  //  Try to publish VM to template.
  //   Steps:
  //       1) Deploy a VM and make sure it is stopped, otherwise Publish button isn't available
  //       2) Publish the VM to a template
  //       3) Check that the template exists
  // 
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Provisioning
  //       caseimportance: critical
  //   
  vm_crud.mgmt.ensure_state(VmState.STOPPED);
  vm_crud.refresh_relationships();
  let template_name = random_vm_name({context: "pblsh"});
  let template = vm_crud.publish_to_template(template_name);

  let _cleanup = () => {
    template.delete();
    return template.mgmt.delete()
  };

  if (!template.exists) throw "Published template does not exist."
}
