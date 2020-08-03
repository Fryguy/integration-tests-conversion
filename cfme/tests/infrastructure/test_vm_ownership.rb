require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _vm vm
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.ownership, pytest.mark.provider(classes: [InfraProvider], selector: ONE), pytest.mark.usefixtures("setup_provider")]
class TestVmOwnershipRESTAPI
  def vm(request, provider, appliance)
    return _vm(request, provider, appliance)
  end
  def test_vm_set_ownership(appliance, vm)
    # Tests set_ownership action from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Infra
    #         caseimportance: high
    #         initialEstimate: 1/3h
    #     
    if !appliance.rest_api.collections.services.action.all.include?("set_ownership")
      pytest.skip("Set owner action for service is not implemented in this version")
    end
    rest_vm = appliance.rest_api.collections.vms.get(name: vm)
    user = appliance.rest_api.collections.users.get(userid: "admin")
    data = {"owner" => {"href" => user.href}}
    rest_vm.action.set_ownership(None: data)
    assert_response(appliance)
    rest_vm.reload()
    raise unless rest_vm.instance_variable_defined? :@evm_owner_id
    raise unless rest_vm.evm_owner_id == user.id
  end
  def test_vms_set_ownership(appliance, vm)
    # Tests set_ownership action from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Infra
    #         caseimportance: high
    #         initialEstimate: 1/3h
    #     
    rest_vm = appliance.rest_api.collections.vms.get(name: vm)
    group = appliance.rest_api.collections.groups.get(description: "EvmGroup-super_administrator")
    data = {"group" => {"href" => group.href}}
    appliance.rest_api.collections.vms.action.set_ownership(rest_vm, None: data)
    assert_response(appliance)
    rest_vm.reload()
    raise unless rest_vm.instance_variable_defined? :@miq_group_id
    raise unless rest_vm.miq_group_id == group.id
  end
  def test_set_vm_owner(appliance, vm, from_detail)
    # Test whether set_owner action from the REST API works.
    #     Prerequisities:
    #         * A VM
    #     Steps:
    #         * Find a VM id using REST
    #         * Call either:
    #             * POST /api/vms/<id> (method ``set_owner``) <- {\"owner\": \"owner username\"}
    #             * POST /api/vms (method ``set_owner``) <- {\"owner\": \"owner username\",
    #                 \"resources\": [{\"href\": ...}]}
    #         * Query the VM again
    #         * Assert it has the attribute ``evm_owner`` as we set it.
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Infra
    #         caseimportance: high
    #         initialEstimate: 1/3h
    #     
    rest_vm = appliance.rest_api.collections.vms.get(name: vm)
    if is_bool(from_detail)
      responses = [rest_vm.action.set_owner(owner: "admin")]
    else
      responses = appliance.rest_api.collections.vms.action.set_owner(rest_vm, owner: "admin")
    end
    assert_response(appliance)
    for response in responses
      raise "Could not set owner" unless response["success"] === true
    end
    rest_vm.reload()
    raise unless rest_vm.instance_variable_defined? :@evm_owner_id
    raise unless rest_vm.evm_owner.userid == "admin"
  end
end
def small_vm(provider, small_template)
  vm = provider.appliance.collections.infra_vms.instantiate(random_vm_name(context: "rename"), provider, small_template.name)
  vm.create_on_provider(find_in_cfme: true, allow_skip: "default")
  vm.refresh_relationships()
  yield vm
  if is_bool(vm.exists)
    vm.cleanup_on_provider()
  end
end
def test_rename_vm(small_vm)
  # Test for rename the VM.
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/4h
  #       casecomponent: Infra
  #       startsin: 5.10
  #       tags: power
  #       testSteps:
  #           1. Add VMware provider
  #           2. Provision VM
  #           3. Navigate to details page of VM
  #           4. Click on Configuration > Rename this VM > Enter new name
  #           5. Click on submit
  #           6. Check whether VM is renamed or not
  #   
  view = navigate_to(small_vm, "Details")
  vm_name = small_vm.name
  changed_vm = small_vm.rename(new_vm_name: fauxfactory.gen_alphanumeric(15, start: "renamed_"))
  view.flash.wait_displayed(timeout: 20)
  view.flash.assert_success_message("Rename of Virtual Machine \"{vm_name}\" has been initiated".format(vm_name: vm_name))
  exists,_ = wait_for(lambda{|| changed_vm.exists}, timeout: 300, delay: 5, msg: "waiting for vm rename")
  raise unless exists
end
