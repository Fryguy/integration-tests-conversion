require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [test_requirements.ownership, pytest.mark.tier(3), pytest.mark.provider([CloudProvider, InfraProvider], scope: "module", required_fields: [["templates", "small_template"]]), pytest.mark.usefixtures("setup_provider_modscope")]
def vm_crud(provider)
  collection = provider.appliance.provider_based_collection(provider)
  vm = collection.instantiate(random_vm_name(context: "ownrs"), provider)
  begin
    vm.create_on_provider(find_in_cfme: true, allow_skip: "default")
  rescue KeyError
    msg = 
    logger.exception(msg)
    pytest.skip(msg)
  end
  yield vm
  begin
    vm.cleanup_on_provider()
  rescue Exception
    logger.exception("Exception deleting test vm \"%s\" on %s", vm.name, provider.name)
  end
end
def role_only_user_owned(appliance)
  appliance.server.login_admin()
  role = appliance.collections.roles.create(name: fauxfactory.gen_alphanumeric(25, start: "role_only_user_owned_"), vm_restriction: "Only User Owned")
  yield role
  appliance.server.login_admin()
  role.delete()
end
def group_only_user_owned(appliance, role_only_user_owned)
  group_collection = appliance.collections.groups
  group = group_collection.create(description: fauxfactory.gen_alphanumeric(25, start: "group_only_user_owned_"), role: role_only_user_owned.name)
  yield group
  appliance.server.login_admin()
  group.delete()
end
def role_user_or_group_owned(appliance)
  appliance.server.login_admin()
  role = appliance.collections.roles.create(name: fauxfactory.gen_alphanumeric(30, start: "role_user_or_group_owned_"), vm_restriction: "Only User or Group Owned")
  yield role
  appliance.server.login_admin()
  role.delete()
end
def group_user_or_group_owned(appliance, role_user_or_group_owned)
  group_collection = appliance.collections.groups
  group = group_collection.create(description: fauxfactory.gen_alphanumeric(30, start: "group_user_or_group_owned_"), role: role_user_or_group_owned.name)
  yield group
  appliance.server.login_admin()
  group.delete()
end
def new_credential()
  if is_bool(BZ.bugzilla.get_bug(1487199).is_opened)
    return Credential(principal: fauxfactory.gen_alphanumeric(start: "uid").downcase(), secret: "redhat")
  else
    return Credential(principal: fauxfactory.gen_alphanumeric(start: "uid"), secret: "redhat")
  end
end
def user1(appliance, group_only_user_owned)
  user1 = new_user(appliance, group_only_user_owned)
  yield user1
  appliance.server.login_admin()
  user1.delete()
end
def user2(appliance, group_only_user_owned)
  user2 = new_user(appliance, group_only_user_owned)
  yield user2
  appliance.server.login_admin()
  user2.delete()
end
def user3(appliance, group_user_or_group_owned)
  user3 = new_user(appliance, group_user_or_group_owned)
  yield user3
  appliance.server.login_admin()
  user3.delete()
end
def new_user(appliance, group_only_user_owned)
  user = appliance.collections.users.create(name: fauxfactory.gen_alphanumeric(start: "user_"), credential: new_credential(), email: fauxfactory.gen_email(), groups: [group_only_user_owned], cost_center: "Workload", value_assign: "Database")
  return user
end
def check_vm_exists(vm_ownership)
  #  Checks if VM exists through All Instances tab.
  # 
  #   Args:
  #       vm_ownership: VM object for ownership test
  # 
  #   Returns:
  #       :py:class:`bool`
  #   
  begin
    vm_ownership.find_quadicon(from_any_provider: true)
    return true
  rescue ItemNotFound
    return false
  end
end
def test_form_button_validation(user1, vm_crud)
  # Tests group ownership
  # 
  #   Metadata:
  #       test_flag: rbac
  # 
  #   Polarion:
  #       assignee: spusater
  #       caseimportance: medium
  #       casecomponent: Appliance
  #       initialEstimate: 1/4h
  #   
  vm_crud.set_ownership(user: user1, reset: true)
  vm_crud.set_ownership(user: user1, cancel: true)
  vm_crud.set_ownership(user: user1)
  vm_crud.unset_ownership()
end
def test_user_ownership_crud(user1, vm_crud)
  # Tests user ownership
  # 
  #   Metadata:
  #       test_flag: rbac
  # 
  #   Polarion:
  #       assignee: spusater
  #       caseimportance: medium
  #       casecomponent: Appliance
  #       initialEstimate: 1/4h
  #   
  vm_crud.set_ownership(user: user1)
  user1 {
    raise "vm not found" unless vm_crud.exists
  }
  vm_crud.unset_ownership()
  user1 {
    raise "vm exists! but shouldn't exist" unless !check_vm_exists(vm_crud)
  }
end
def test_group_ownership_on_user_only_role(user2, vm_crud)
  # Tests group ownership
  # 
  #   Metadata:
  #       test_flag: rbac
  # 
  #   Polarion:
  #       assignee: spusater
  #       caseimportance: medium
  #       casecomponent: Appliance
  #       initialEstimate: 1/4h
  #   
  vm_crud.set_ownership(group: user2.groups[0])
  user2 {
    raise "vm exists! but shouldn't exist" unless !check_vm_exists(vm_crud)
  }
  vm_crud.set_ownership(user: user2)
  user2 {
    raise "vm exists" unless vm_crud.exists
  }
end
def test_group_ownership_on_user_or_group_role(user3, vm_crud)
  # Tests group ownership
  # 
  #   Metadata:
  #       test_flag: rbac
  # 
  #   Polarion:
  #       assignee: spusater
  #       caseimportance: medium
  #       casecomponent: Appliance
  #       initialEstimate: 1/4h
  #   
  vm_crud.set_ownership(group: user3.groups[0])
  user3 {
    raise "vm not found" unless vm_crud.exists
  }
  vm_crud.unset_ownership()
  user3 {
    raise "vm exists! but shouldn't exist" unless !check_vm_exists(vm_crud)
  }
end
def test_template_set_ownership(appliance, vm_crud)
  #  Sets ownership to an infra template.
  # 
  #   First publishes a template from a VM, then tries to unset an ownership of that template,
  #   then sets it back and in the end removes the template.
  #   VM is removed via fixture.
  #   Tests BZ 1446801 in RHCF3-14353
  # 
  #   Polarion:
  #       assignee: spusater
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #   
  template = vm_crud.publish_to_template(template_name: random_vm_name(context: "ownrs"))
  user_no_owner = appliance.collections.users.instantiate(name: "<No Owner>")
  user_admin = appliance.collections.users.instantiate(name: "Administrator")
  begin
    template.set_ownership(user: user_no_owner)
    template.set_ownership(user: user_admin)
  ensure
    template.mgmt.delete()
  end
end
def test_set_ownership_back_to_default()
  # 
  #   Set ownership back to default value.
  # 
  #   Polarion:
  #       assignee: spusater
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Set ownership of a VM to some user, for example Administrator and Submit
  #           2. Set ownership of that VM back to <No Owner>
  #           3. Repeat for group ownership
  #           4. Try it on template instead of VM
  #       expectedResults:
  #           1. Ownership set
  #           2. Ownership set
  #           3. Ownership set
  #           4. Ownership set
  #   Bugzilla:
  #       1483512
  #   
  # pass
end
def test_ownership_dropdown_values()
  # 
  #   Test that all values are displayed on ownership user and group dropdowns
  # 
  #   Polarion:
  #       assignee: spusater
  #       casecomponent: Configuration
  #       caseimportance: low
  #       initialEstimate: 1/8h
  #       setup:
  #           1. Create a new user with new group and role
  #       testSteps:
  #           1. Navigate to testing VM
  #           2. Configuration -> Set Ownership
  #           3. Inspect user dropdown and group dropdown
  #       expectedResults:
  #           3. All possible users and groups are displayed in the dropdowns
  #   Bugzilla:
  #       1330022
  #   
  # pass
end
def test_duplicate_groups()
  # 
  #   Verify duplicat group names are not listed when selecting multiple vms and setting ownership.
  # 
  #   Polarion:
  #       assignee: spusater
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. Navigate to Infrastructure -> Provider -> Vmware
  #           2. select multiple vms and go to Configuration -> Set ownership
  #           3. Verify no duplicate group names listed.
  #       expectedResults:
  #           3. No duplicate group names listed
  #   
  # pass
end
