require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/tests/infrastructure/test_provisioning_dialog'
include Cfme::Tests::Infrastructure::Test_provisioning_dialog
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
filter_fields = {"required_fields" => [["provisioning", "template"], ["provisioning", "host"], ["provisioning", "datastore"]]}
infra_filter = ProviderFilter(classes: [InfraProvider], None: filter_fields)
not_vmware = ProviderFilter(classes: [VMwareProvider], inverted: true)
pytestmark = [pytest.mark.meta(roles: "+automate"), pytest.mark.provider(gen_func: providers, filters: [infra_filter], scope: "module"), pytest.mark.usefixtures("setup_provider"), pytest.mark.long_running]
def clone_vm_name()
  clone_vm_name = fauxfactory.gen_alphanumeric(18, start: "test_cloning_")
  return clone_vm_name
end
def test_vm_clone(appliance, provider, clone_vm_name, create_vm)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Provisioning
  #       initialEstimate: 1/6h
  #   
  provision_type = "VMware"
  create_vm.clone_vm("email@xyz.com", "first", "last", clone_vm_name, provision_type)
  request_description = clone_vm_name
  request_row = appliance.collections.requests.instantiate(request_description, partial_check: true)
  check_all_tabs(request_row, provider)
  request_row.wait_for_request(method: "ui")
  msg = 
  raise msg unless request_row.is_succeeded(method: "ui")
end
def test_template_clone(request, appliance, provider, clone_vm_name)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Provisioning
  #       initialEstimate: 1/6h
  #       caseimportance: high
  #   
  cloned_template_name = provider.data["provisioning"]["template"]
  vm = appliance.collections.infra_templates.instantiate(cloned_template_name, provider)
  if is_bool(provider.one_of(VMwareProvider))
    provision_type = "VMware"
  else
    provision_type = "Native Clone"
  end
  template_clone_cleanup = lambda do
    collections = appliance.collections
    if is_bool(BZ(1797733).blocks)
      cloned_template = collections.infra_vms.instantiate(method(:clone_vm_name), provider)
    else
      cloned_template = collections.infra_templates.instantiate(method(:clone_vm_name), provider)
    end
    cloned_template.delete()
  end
  vm.clone_template("email@xyz.com", "first", "last", method(:clone_vm_name), provision_type)
  request_row = appliance.collections.requests.instantiate(method(:clone_vm_name), partial_check: true)
  if is_bool(!BZ(1797706).blocks && provider.one_of(RHEVMProvider))
    check_all_tabs(request_row, provider)
  end
  request_row.wait_for_request(method: "ui")
  msg = 
  raise msg unless request_row.is_succeeded(method: "ui")
end
def test_vm_clone_neg(provider, clone_vm_name, create_vm)
  # Tests that we can't clone non-VMware VM
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Provisioning
  #       initialEstimate: 1/6h
  #   
  provision_type = "VMware"
  pytest.raises(DropdownItemNotFound) {
    create_vm.clone_vm("email@xyz.com", "first", "last", clone_vm_name, provision_type)
  }
end
