require_relative 'riggerlib'
include Riggerlib
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/provisioning'
include Cfme::Provisioning
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [test_requirements.quota, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([RHEVMProvider, VMwareProvider], scope: "module", selector: ONE_PER_TYPE)]
NUM_GROUPS = NUM_TENANTS = 3
def admin_email(appliance)
  # Required for user quota tagging services to work, as it's mandatory for it's functioning.
  user = appliance.collections.users
  admin = user.instantiate(name: "Administrator")
  update(admin) {
    admin.email = fauxfactory.gen_email()
  }
  yield
  update(admin) {
    admin.email = ""
  }
end
def vm_name()
  return random_vm_name(context: "quota")
end
def template_name(provider)
  if is_bool(provider.one_of(RHEVMProvider))
    return provider.data.templates.get("full_template")["name"]
  else
    if is_bool(provider.one_of(VMwareProvider))
      return provider.data.templates.get("big_template")["name"]
    end
  end
end
def prov_data(vm_name)
  return {"catalog" => {"vm_name" => vm_name}, "environment" => {"automatic_placement" => true}}
end
def domain(appliance)
  domain = appliance.collections.domains.create(fauxfactory.gen_alphanumeric(15, start: "domain_"), fauxfactory.gen_alphanumeric(15, start: "domain_desc_"), enabled: true)
  yield domain
  if is_bool(domain.exists)
    domain.delete()
  end
end
def max_quota_test_instance(appliance, domain)
  miq = appliance.collections.domains.instantiate("ManageIQ")
  original_instance = miq.namespaces.instantiate("System").namespaces.instantiate("CommonMethods").classes.instantiate("QuotaMethods").instances.instantiate("quota_source")
  original_instance.copy_to(domain: domain)
  original_instance = miq.namespaces.instantiate("System").namespaces.instantiate("CommonMethods").classes.instantiate("QuotaStateMachine").instances.instantiate("quota")
  original_instance.copy_to(domain: domain)
  instance = domain.namespaces.instantiate("System").namespaces.instantiate("CommonMethods").classes.instantiate("QuotaStateMachine").instances.instantiate("quota")
  return instance
end
def set_entity_quota_source(max_quota_test_instance, entity)
  update(max_quota_test_instance) {
    max_quota_test_instance.fields = {"quota_source_type" => {"value" => entity}}
  }
end
def entities(appliance, request, max_quota_test_instance)
  collection,entity,description = request.param
  set_entity_quota_source(max_quota_test_instance, entity)
  return appliance.collections.getattr(collection).instantiate(description)
end
def new_tenant(appliance)
  # Fixture is used to Create three tenants.
  #   
  tenant_list = []
  for i in 0.upto(NUM_TENANTS-1)
    collection = appliance.collections.tenants
    tenant = collection.create(name: fauxfactory.gen_alphanumeric(15, start: "tenant_"), description: fauxfactory.gen_alphanumeric(15, start: "tenant_desc_"), parent: collection.get_root_tenant())
    tenant_list.push(tenant)
  end
  yield tenant_list
  for tnt in tenant_list
    if is_bool(tnt.exists)
      tnt.delete()
    end
  end
end
def set_parent_tenant_quota(request, appliance, new_tenant)
  # Fixture is used to set tenant quota one by one to each of the tenant in 'new_tenant' list.
  #   After testing quota(example: testing cpu limit) with particular user and it's current group
  #   which is associated with one of these tenants. Then it disables the current quota
  #   (example: cpu limit) and enable new quota limit(example: Max memory) for testing.
  #   
  for i in 0.upto(NUM_TENANTS-1)
    field,value = request.param
    new_tenant[i].set_quota(None: { => true, "field" => value})
  end
  yield
  appliance.server.login_admin()
  appliance.server.browser.refresh()
  for i in 0.upto(NUM_TENANTS-1)
    new_tenant[i].set_quota(None: { => false})
  end
end
def new_group_list(appliance, new_tenant)
  # Fixture is used to Create Three new groups and assigned to three different tenants.
  #   
  group_list = []
  collection = appliance.collections.groups
  for i in 0.upto(NUM_GROUPS-1)
    group = collection.create(description: fauxfactory.gen_alphanumeric(start: "group_"), role: "EvmRole-super_administrator", tenant: ("My Company/{}").format(new_tenant[i].name))
    group_list.push(group)
  end
  yield group_list
  for grp in group_list
    if is_bool(grp.exists)
      grp.delete()
    end
  end
end
def new_user(appliance, new_group_list, new_credential)
  # Fixture is used to Create new user and User should be member of three groups.
  #   
  collection = appliance.collections.users
  user = collection.create(name: fauxfactory.gen_alphanumeric(start: "user_"), credential: new_credential, email: fauxfactory.gen_email(), groups: new_group_list, cost_center: "Workload", value_assign: "Database")
  yield user
  if is_bool(user.exists)
    user.delete()
  end
end
def custom_prov_data(request, prov_data, vm_name, template_name)
  value = request.param
  prov_data.update(value)
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["catalog"]["catalog_name"] = {"name" => template_name}
end
def test_quota(appliance, provider, custom_prov_data, vm_name, admin_email, entities, template_name, prov_data)
  # This test case checks quota limit using the automate's predefine method 'quota source'
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Quota
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       tags: quota
  #   
  recursive_update(prov_data, custom_prov_data)
  do_vm_provisioning(appliance, template_name: template_name, provider: provider, vm_name: vm_name, provisioning_data: prov_data, wait: false, request: nil)
  request_description = "Provision from [{template}] to [{vm}]".format(template: template_name, vm: vm_name)
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
def test_user_quota_diff_groups(appliance, provider, new_user, set_parent_tenant_quota, extra_msg, custom_prov_data, approve, prov_data, vm_name, template_name)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Quota
  #       caseimportance: high
  #       tags: quota
  #   
  new_user {
    recursive_update(prov_data, custom_prov_data)
    logger.info("Successfully updated VM provisioning data")
    do_vm_provisioning(appliance, template_name: template_name, provider: provider, vm_name: vm_name, provisioning_data: prov_data, wait: false, request: nil)
    request_description = "Provision from [{template}] to [{vm}{msg}]".format(template: template_name, vm: vm_name, msg: extra_msg)
    provision_request = appliance.collections.requests.instantiate(request_description)
    if is_bool(approve)
      provision_request.approve_request(method: "ui", reason: "Approved")
    end
    provision_request.wait_for_request(method: "ui")
    raise unless provision_request.row.reason.text == "Quota Exceeded"
  }
end
