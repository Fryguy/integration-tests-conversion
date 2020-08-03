require_relative 'wrapanapi'
include Wrapanapi
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/virtual_machines'
include Cfme::Utils::Virtual_machines
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope", "uses_infra_providers"), pytest.mark.provider(gen_func: providers, filters: [ProviderFilter(classes: [RHEVMProvider, VMwareProvider], required_fields: [["templates", "small_template"], ["provisioning", "template"], ["provisioning", "host"], ["provisioning", "datastore"]])], scope: "module", selector: ONE_PER_TYPE), test_requirements.vmware, test_requirements.rhev]
def vm_crud(provider)
  collection = provider.appliance.provider_based_collection(provider)
  vm_name = random_vm_name(context: "pblsh")
  vm = collection.instantiate(vm_name, provider)
  begin
    deploy_template(vm.provider.key, vm_name, provider.data.templates.small_template.name, timeout: 2500)
  rescue [KeyError, NoMethodError]
    pytest.skip("Skipping as small_template could not be found on the provider")
  end
  vm.wait_to_appear(timeout: 900, load_details: false)
  yield vm
  begin
    vm.cleanup_on_provider()
  rescue Exception
    logger.exception("Exception deleting test vm \"%s\" on %s", vm.name, provider.name)
  end
end
def test_publish_vm_to_template(request, vm_crud)
  #  Try to publish VM to template.
  #   Steps:
  #       1) Deploy a VM and make sure it is stopped, otherwise Publish button isn't available
  #       2) Publish the VM to a template
  #       3) Check that the template exists
  # 
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Provisioning
  #       caseimportance: critical
  #   
  vm_crud.mgmt.ensure_state(VmState.STOPPED)
  vm_crud.refresh_relationships()
  template_name = random_vm_name(context: "pblsh")
  template = vm_crud.publish_to_template(template_name)
  _cleanup = lambda do
    template.delete()
    template.mgmt.delete()
  end
  raise "Published template does not exist." unless template.exists
end
