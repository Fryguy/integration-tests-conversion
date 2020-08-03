require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [pytest.mark.provider([OpenStackProvider], scope: "module")]
TENANTS = [fauxfactory.gen_alphanumeric(start: "parent_"), fauxfactory.gen_alphanumeric(start: "child_")]
def tenant(provider, setup_provider, appliance)
  tenant = appliance.collections.cloud_tenants.create(name: fauxfactory.gen_alphanumeric(start: "tenant_"), provider: provider)
  yield(tenant)
  begin
    if is_bool(tenant.exists)
      tenant.delete()
    end
  rescue Exception
    logger.warning("Exception while attempting to delete tenant fixture, continuing")
  ensure
    if provider.mgmt.list_tenant().include?(tenant.name)
      provider.mgmt.remove_tenant(tenant.name)
    end
  end
end
def test_tenant_crud(tenant)
  #  Tests tenant create and delete
  # 
  #   Metadata:
  #       test_flag: tenant
  # 
  #   Polarion:
  #       assignee: nachandr
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #   
  update(tenant) {
    tenant.name = fauxfactory.gen_alphanumeric(15, start: "edited_")
  }
  tenant.wait_for_appear()
  raise unless tenant.exists
end
def new_tenant(appliance)
  # This fixture creates new tenant under root tenant(My Company)
  collection = appliance.collections.tenants
  tenant = collection.create(name: TENANTS[0], description: fauxfactory.gen_alphanumeric(15, start: "tenant_desc_"), parent: collection.get_root_tenant())
  yield(tenant)
  tenant.delete_if_exists()
end
def child_tenant(new_tenant)
  # This fixture used to create child tenant under parent tenant - new_tenant
  child_tenant = new_tenant.appliance.collections.tenants.create(name: TENANTS[1], description: fauxfactory.gen_alphanumeric(15, start: "tenant_desc_"), parent: new_tenant)
  yield(child_tenant)
  child_tenant.delete_if_exists()
end
def check_permissions(appliance, assigned_tenant)
  # This function is used to check user permissions for particular tenant
  view = navigate_to(appliance.collections.tenants, "All")
  for tenant in view.table
    if tenant["Name"].text == assigned_tenant
      tenant.click()
      break
    end
  end
  raise unless !view.toolbar.configuration.has_item("Manage Quotas")
end
def test_dynamic_product_feature_for_tenant_quota(request, appliance, new_tenant, child_tenant)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/12h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: Configuration
  #       tags: quota
  #       testSteps:
  #           1. Add two users > alpha and omega
  #           2. Create two tenants > alpha_tenant and it\'s child - omega_tenant
  #           3. Create two custom roles (role_alpha and role_omega) from copying
  #              EvmRole-tenant-administrator role
  #           4. Create groups alpha_group(for alpha_tenant) and omega_group(for omega_tenant)
  #              then assign role_alpha to alpha_group and role_omega to omega_group
  #           5. Add alpha_group to alpha user and omega_group to omega user
  #           6. Modify role_alpha for manage quota permissions of alpha user as it will manage
  #              only quota of omega_tenant
  #           7. Modify role_omega for manage quota permissions of omega user as it will not even
  #              manage quota of itself or other tenants
  #           8. CHECK IF YOU ARE ABLE TO MODIFY THE \"MANAGE QUOTA\" CHECKS IN ROLE AS YOU WANT
  #           9. Then see if you are able to save these two new roles.
  #           10.Login with alpha and SEE IF ALPHA USER CAN ABLE TO SET QUOTA OF omega_tenant
  #           11.Login with omega and SEE QUOTA GETS CHANGED OR NOT. THEN TRY TO CHANGE QUOTA
  #              IMPOSED BY ALPHA USER.
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5.
  #           6.
  #           7.
  #           8.
  #           9. Save roles successfully
  #           10. \'Manage Quotas\' option should be available for user alpha
  #           11. Here as per role_omega permissions, omega must not able change its own quota or
  #                other tenants quota.
  # 
  #   Bugzilla:
  #       1655012
  #       1468795
  #   
  user_ = []
  role_ = []
  product_feature = ["Everything"]
  product_feature.concat((appliance.version < "5.11") ? ["Settings", "Configuration"] : ["Main Configuration"])
  product_feature.concat(["Access Control", "Tenants", "Modify", "Manage Quotas"])
  tenant_ = ["My Company/#{new_tenant.name}", ("My Company/{parent}/{child}").format(parent: new_tenant.name, child: child_tenant.name)]
  role = appliance.collections.roles.instantiate(name: "EvmRole-tenant_administrator")
  for i in 2.times
    new_role = role.copy(name: "{name}_{role}".format(name: role.name, role: fauxfactory.gen_alphanumeric()))
    role_.push(new_role)
    request.addfinalizer(new_role.delete_if_exists)
    group = appliance.collections.groups.create(description: fauxfactory.gen_alphanumeric(start: "group_"), role: new_role.name, tenant: tenant_[i])
    request.addfinalizer(group.delete_if_exists)
    user = appliance.collections.users.create(name: fauxfactory.gen_alphanumeric(start: "user_").downcase(), credential: Credential(principal: fauxfactory.gen_alphanumeric(start: "uid"), secret: fauxfactory.gen_alphanumeric(start: "pwd_")), email: fauxfactory.gen_email(), groups: group, cost_center: "Workload", value_assign: "Database")
    user_.push(user)
    request.addfinalizer(user.delete_if_exists)
    product_feature.concat(["Manage Quotas ({tenant})".format(tenant: TENANTS[i])])
    role_[i].update({"product_features" => [[product_feature, false]]})
    product_feature.pop()
  end
  user_[0] {
    check_permissions(appliance: appliance, assigned_tenant: new_tenant.name)
  }
  user_[1] {
    check_permissions(appliance: appliance, assigned_tenant: child_tenant.name)
  }
end
def test_tenant_quota_input_validate(appliance)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  roottenant = appliance.collections.tenants.get_root_tenant()
  fields = [["cpu", 2.5], ["storage", "1.x"], ["memory", "2.x"], ["vm", 1.5]]
  for field in fields
    view = navigate_to(roottenant, "ManageQuotas")
    view.form.fill({"{}_cb".format(field[0]) => true, "{}_txt".format(field[0]) => field[1]})
    raise unless view.save_button.disabled
    view.form.fill({"{}_cb".format(field[0]) => false})
  end
end
