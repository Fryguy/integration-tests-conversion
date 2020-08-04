require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/provisioning'
include Cfme::Provisioning
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.quota, pytest.mark.meta(server_roles: "+automate"), test_requirements.vm_migrate, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([VMwareProvider, RHEVMProvider], scope: "module", required_fields: [["provisioning", "template"]], selector: ONE_PER_TYPE)]
def set_default(provider, request)
  # This fixture is used to return paths for provisioning_entry_point, reconfigure_entry_point
  #      and retirement_entry_point. The value of 'provisioning_entry_point' is required while
  #      creating new catalog item in 'test_service_infra_tenant_quota_with_default_entry_point' test.
  #      But other tests does not require these values since those tests takes default values hence
  #      providing default value. So in this file, this fixture - 'set_default'
  #      must be used in all tests of quota which are related to services where catalog item needs to
  #      be created with specific values for these entries.
  #   
  with_prov = ["Datastore", "ManageIQ (Locked)", "#{provider.string_name}", "VM", "Provisioning", "StateMachines", "ProvisionRequestApproval", "Default (Default)"]
  default = ["Service", "Provisioning", "StateMachines", "ServiceProvision_Template", "CatalogItemInitialization"]
  return is_bool(request.param) ? with_prov : default
end
def vm_name()
  return random_vm_name(context: "quota")
end
def template_name(provisioning)
  return provisioning["template"]
end
def root_tenant(appliance)
  return appliance.collections.tenants.get_root_tenant()
end
def tenants_setup(appliance)
  tenants = appliance.collections.tenants
  my_company = tenants.get_root_tenant()
  test_parent = tenants.create(name: fauxfactory.gen_alphanumeric(18, start: "test_parent_"), description: fauxfactory.gen_alphanumeric(18, start: "parent_desc_"), parent: my_company)
  test_child = tenants.create(name: fauxfactory.gen_alphanumeric(18, start: "test_child_"), description: fauxfactory.gen_alphanumeric(18, start: "child_desc_"), parent: test_parent)
  yield([test_parent, test_child])
  test_child.delete()
  test_parent.delete()
end
def prov_data(vm_name, provisioning)
  return {"catalog" => {"vm_name" => vm_name}, "environment" => {"automatic_placement" => true}, "network" => {"vlan" => partial_match(provisioning["vlan"])}}
end
def custom_prov_data(request, prov_data, vm_name, template_name)
  value = request.param
  prov_data.update(value)
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["catalog"]["catalog_name"] = {"name" => template_name}
end
def set_root_tenant_quota(request, root_tenant, appliance)
  field,value = request.param
  root_tenant.set_quota(None: {"#{field}_cb" => true, "field" => value})
  yield
  appliance.server.browser.refresh()
  root_tenant.set_quota(None: {"#{field}_cb" => false})
end
def catalog_item(appliance, provider, dialog, catalog, prov_data, set_default)
  collection = appliance.collections.catalog_items
  catalog_item = collection.create(provider.catalog_item_type, name: fauxfactory.gen_alphanumeric(15, start: "cat_item_"), description: "test catalog", display_in: true, catalog: catalog, dialog: dialog, prov_data: prov_data, provider: provider, provisioning_entry_point: set_default)
  yield(catalog_item)
  if is_bool(catalog_item.exists)
    catalog_item.delete()
  end
end
def migration_destination_host(create_vm_modscope, provider)
  # Fixture to return host
  hosts = provider.hosts.all()
  if hosts.size > 1
    view = navigate_to(create_vm_modscope, "Details")
    vm_host = view.entities.summary("Relationships").get_text_of("Host")
    dest_hosts = hosts.select{|vds| vds.name != vm_host}.map{|vds| vds.name}
    return dest_hosts[0]
  else
    pytest.skip("Not enough hosts exist on provider #{provider.name} for VM migration.")
  end
end
def quota_limit(root_tenant)
  in_use_storage = root_tenant.quota["storage"]["in_use"].strip(" GB").to_i
  root_tenant.set_quota(storage_cb: true, storage: in_use_storage + 3)
  yield(root_tenant.quota["storage"]["available"].strip(" GB").to_i)
  root_tenant.set_quota(storage_cb: false)
end
def test_tenant_quota_enforce_via_lifecycle_infra(appliance, provider, set_root_tenant_quota, extra_msg, custom_prov_data, approve, prov_data, vm_name, template_name)
  # Test Tenant Quota in UI and SSUI
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #       tags: quota
  #   
  prov_data.update(custom_prov_data)
  prov_data["catalog"]["vm_name"] = vm_name
  do_vm_provisioning(appliance, template_name: template_name, provider: provider, vm_name: vm_name, provisioning_data: prov_data, wait: false, request: nil)
  request_description = "Provision from [#{template_name}] to [#{vm_name}#{extra_msg}]"
  provision_request = appliance.collections.requests.instantiate(request_description)
  if is_bool(approve)
    provision_request.approve_request(method: "ui", reason: "Approved")
  end
  provision_request.wait_for_request(method: "ui")
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
def test_tenant_quota_enforce_via_service_infra(request, appliance, context, set_root_tenant_quota, extra_msg, set_default, custom_prov_data, catalog_item)
  # Tests quota enforcement via service infra
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #       tags: quota
  #   
  appliance.context.use(context) {
    service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
    if context === ViaSSUI
      service_catalogs.add_to_shopping_cart()
    end
    service_catalogs.order()
  }
  request_description = "Provisioning Service [{0}] from [{0}]".format(catalog_item.name)
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(provision_request.remove_request)
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
def test_tenant_quota_vm_reconfigure(request, appliance, set_root_tenant_quota, create_vm_modscope, custom_prov_data)
  # Tests quota with vm reconfigure
  # 
  #   Bugzilla:
  #       1467644
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #       tags: quota
  #   
  vm = create_vm_modscope
  new_config = vm.configuration.copy()
  setattr(new_config.hw, custom_prov_data["change"], custom_prov_data["value"])
  vm.reconfigure(new_config)
  if custom_prov_data["change"] == "mem_size"
    request_description = "VM Reconfigure for: #{vm.name} - Memory: #{new_config.hw.mem_size} MB"
  else
    request_description = "VM Reconfigure for: #{vm.name} - Processor Sockets: #{new_config.hw.sockets}, Processor Cores Per Socket: #{new_config.hw.cores_per_socket}, Total Processors: #{new_config.hw.cores_per_socket * new_config.hw.sockets}"
  end
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(provision_request.remove_request)
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
def test_setting_child_quota_more_than_parent(appliance, tenants_setup, parent_quota, child_quota, flash_text)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Provisioning
  #       caseimportance: high
  #       initialEstimate: 1/12h
  #       tags: quota
  #   
  test_parent,test_child = tenants_setup
  view = navigate_to(test_parent, "ManageQuotas")
  view.form.fill({"{}_cb".format(parent_quota[0]) => true, "{}_txt".format(parent_quota[0]) => parent_quota[1]})
  view.save_button.click()
  view = navigate_to(test_child, "ManageQuotas")
  view.form.fill({"{}_cb".format(child_quota[0]) => true, "{}_txt".format(child_quota[0]) => child_quota[1]})
  view.save_button.click()
  message = "Error when saving tenant quota: Validation failed: TenantQuota:"
  view.flash.assert_message("{message} {flash_text} allocated quota is over allocated, parent tenant does not have enough quota".format(message: message, flash_text: flash_text))
end
def test_vm_migration_after_assigning_tenant_quota(appliance, create_vm_modscope, set_root_tenant_quota, custom_prov_data, migration_destination_host)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #       tags: quota
  #       testSteps:
  #           1. Create VM
  #           2. Assign tenant quota
  #           3. Migrate VM
  #           4. Check whether migration is successfully done
  #   
  vm = create_vm_modscope
  vm.migrate_vm(fauxfactory.gen_email(), fauxfactory.gen_alpha(), fauxfactory.gen_alpha(), host: migration_destination_host)
  request_description = vm.name
  cells = {"Description" => request_description, "Request Type" => "Migrate"}
  migrate_request = appliance.collections.requests.instantiate(request_description, cells: cells, partial_check: true)
  migrate_request.wait_for_request(method: "ui")
  msg = "Request failed with the message #{migrate_request.row.last_message.text}"
  raise msg unless migrate_request.is_succeeded(method: "ui")
end
def test_service_infra_tenant_quota_with_default_entry_point(request, appliance, context, set_root_tenant_quota, extra_msg, set_default, custom_prov_data, catalog_item)
  # Test Tenant Quota in UI and SSUI by selecting field entry points.
  #      Quota has to be checked if it is working with field entry points also.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #       tags: quota
  #       setup:
  #           1. Add infrastructure provider
  #           2. Set quota for root tenant - \'My Company\'
  #           3. Navigate to services > catalogs
  #           4. Create catalog item with selecting following field entry points:
  #               a.provisioning_entry_point = /ManageIQ (Locked)/Infrastructure/VM/Provisioning
  #               /StateMachines/ProvisionRequestApproval/Default
  #               b.retirement_entry_point = /Service/Retirement/StateMachines/ServiceRetirement
  #               /Default
  #           5. Add other information required in catalog for provisioning VM
  #       testSteps:
  #           1. Order the catalog item via UI and SSUI individually
  #       expectedResults:
  #           1. Request of vm provisioning via service catalog should be denied with reason:
  #              \"Quota Exceeded\"
  #   
  appliance.context.use(context) {
    service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
    if context === ViaSSUI
      service_catalogs.add_to_shopping_cart()
    end
    service_catalogs.order()
  }
  request_description = "Provisioning Service [{name}] from [{name}]".format(name: catalog_item.name)
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(provision_request.remove_request)
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
def configure_mail(domain)
  # This fixture copies email instance to custom domain
  approver = fauxfactory.gen_email()
  default_recipient = fauxfactory.gen_email()
  from_user = fauxfactory.gen_email()
  domain.parent.instantiate(name: "ManageIQ").namespaces.instantiate(name: "Configuration").classes.instantiate(name: "Email").instances.instantiate(name: "Default").copy_to(domain.name)
  instance = domain.namespaces.instantiate(name: "Configuration").classes.instantiate(name: "Email").instances.instantiate(name: "Default")
  update(instance) {
    instance.fields = {"approver" => {"value" => approver}, "default_recipient" => {"value" => default_recipient}, "from" => {"value" => from_user}}
  }
  yield([approver, default_recipient, from_user])
end
def test_quota_exceed_mail_with_more_info_link(configure_mail, appliance, provider, set_root_tenant_quota, custom_prov_data, prov_data, extra_msg, vm_name, template_name)
  # 
  #   Bugzilla:
  #       1579031
  #       1759123
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/12h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: Infra
  #       tags: quota
  #       setup:
  #           1. Copy instance ManageIQ/Configuration/Email/Default to custom domain
  #           2. Enter values for fields: approver, default_recipient, from and signature
  #       testSteps:
  #           1. Provide valid mail address while provisioning Vm to exceed quota
  #       expectedResults:
  #           1. Quota exceed mail should be sent
  #   
  approver,default_recipient,from_user = configure_mail
  mail_to = fauxfactory.gen_email()
  prov_data.update(custom_prov_data)
  prov_data["catalog"]["vm_name"] = vm_name
  (LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: ["\"to\"=>\"#{default_recipient}\", \"from\"=>\"#{from_user}\".*.Virtual Machine Request from #{mail_to} was Denied.\"", "\"to\"=>\"#{mail_to}\", \"from\"=>\"#{from_user}\".*.Your Virtual Machine Request was Approved, pending Quota Validation.\".*"])).waiting(timeout: 120) {
    do_vm_provisioning(appliance, template_name: template_name, provider: provider, vm_name: vm_name, provisioning_data: prov_data, wait: false, request: nil, email: mail_to)
    request_description = "Provision from [#{template_name}] to [#{vm_name}#{extra_msg}]"
    provision_request = appliance.collections.requests.instantiate(request_description)
    provision_request.wait_for_request(method: "ui")
    raise unless provision_request.row.reason.text == "Quota Exceeded"
  }
end
def test_quota_not_fails_after_vm_reconfigure_disk_remove(request, appliance, create_vm)
  # 
  #   Bugzilla:
  #       1644351
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.8
  #       casecomponent: Infra
  #       tags: quota
  #       testSteps:
  #           1. Add infra provider and Add disk(s) to a vm instance
  #           2. Turn quota on
  #           3. Remove the disk(s)
  #           4. Check automation logs
  #       expectedResults:
  #           1.
  #           2.
  #           3. Request should be successful and size of disk(s) should be included in quota
  #              requested.
  #           4. Quota is bypassed while removing disk
  #   
  orig_config = create_vm.configuration.copy()
  new_config = orig_config.copy()
  new_config.add_disk(size: 1024, size_unit: "MB", type: "thin", mode: "persistent")
  add_disk_request = create_vm.reconfigure(new_config)
  wait_for(add_disk_request.is_succeeded, timeout: 360, delay: 45, message: "confirm that disk was added")
  wait_for(lambda{|| create_vm.configuration.num_disks == new_config.num_disks}, timeout: 360, delay: 45, fail_func: create_vm.refresh_relationships, message: "confirm that disk was added")
  root_tenant = appliance.collections.tenants.get_root_tenant()
  view = navigate_to(root_tenant, "ManageQuotas")
  reset_data = view.form.read()
  root_tenant.set_quota(storage_cb: true, storage: "2")
  request.addfinalizer(lambda{|| root_tenant.set_quota(None: reset_data)})
  (LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*VM Reconfigure storage change: -1073741824 Bytes.*", ".*VmReconfigureRequest: Bypassing quota check.*"])).waiting(timeout: 400) {
    remove_disk_request = create_vm.reconfigure(orig_config)
    wait_for(remove_disk_request.is_succeeded, timeout: 360, delay: 45, message: "confirm that previously-added disk was removed")
    raise unless create_vm.configuration.num_disks == orig_config.num_disks
  }
end
def new_tenants(request, appliance)
  # This fixture creates two parent tenants
  tenants = []
  for _ in 2.times
    tenant = appliance.collections.tenants.create(name: fauxfactory.gen_alphanumeric(18, start: "test_parent_"), description: fauxfactory.gen_alphanumeric(18, start: "parent_desc_"), parent: appliance.collections.tenants.get_root_tenant())
    tenants.push(tenant)
    request.addfinalizer(tenant.delete_if_exists)
  end
  return tenants
end
def new_project(appliance, new_tenants)
  # This fixture create project under parent tenant1
  tenant1,_ = new_tenants
  collection = appliance.collections.projects
  project = collection.create(name: fauxfactory.gen_alphanumeric(15, start: "project_"), description: fauxfactory.gen_alphanumeric(15, start: "project_desc_"), parent: tenant1)
  yield(project)
  project.delete_if_exists()
end
def set_project_quota(request, appliance, new_project)
  field_value = request.param
  tenant_quota_data = {}
  for (field, value) in field_value
    tenant_quota_data.update({"#{field}_cb" => true, "field" => value})
  end
  new_project.set_quota(None: tenant_quota_data)
  yield
  for (field, value) in field_value
    tenant_quota_data.update({"#{field}_cb" => false})
    tenant_quota_data.pop(field)
  end
  new_project.set_quota(None: tenant_quota_data)
end
def new_group_project(appliance, new_project)
  # This fixture creates new group and assigned by new project
  role = appliance.collections.roles.instantiate(name: "EvmRole-user_self_service")
  user_role = role.copy(name: fauxfactory.gen_alphanumeric(25, "self_service_role_"), vm_restriction: "None")
  group = appliance.collections.groups.create(description: fauxfactory.gen_alphanumeric(start: "group_"), role: user_role.name, tenant: "My Company/#{new_project.parent_tenant.name}/#{new_project.name}")
  yield(group)
  group.delete_if_exists()
  user_role.delete_if_exists()
end
def new_user_project(appliance, new_group_project)
  # This fixture creates new user which is assigned to new group and project
  user = appliance.collections.users.create(name: fauxfactory.gen_alphanumeric(start: "user_").downcase(), credential: Credential(principal: fauxfactory.gen_alphanumeric(start: "uid"), secret: fauxfactory.gen_alphanumeric(start: "pwd")), email: fauxfactory.gen_email(), groups: new_group_project, cost_center: "Workload", value_assign: "Database")
  yield(user)
  user.delete_if_exists()
end
def test_simultaneous_tenant_quota(request, appliance, context, new_project, new_user_project, set_project_quota, custom_prov_data, catalog_item, set_default)
  # 
  #   Bugzilla:
  #       1456819
  #       1401251
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/6h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.8
  #       casecomponent: Provisioning
  #       tags: quota
  #       setup:
  #           1. Create tenant1 and tenant2.
  #           2. Create a project under tenant1 or tenant2
  #           3. Enable quota for cpu, memory or storage etc
  #           4. Create a group and add role super_administrator
  #           5. Create a user and add it to the group
  #       testSteps:
  #           1. Login with the newly created user in the service portal. Take multiple items which go
  #              over the allocated quota
  #       expectedResults:
  #           1. CFME should deny request with quota exceeded reason
  #   
  new_user_project {
    appliance.context.use(context) {
      appliance.server.login(new_user_project)
      service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
      if context === ViaSSUI
        service_catalogs.add_to_shopping_cart()
      end
      provision_request = service_catalogs.order()
    }
  }
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(provision_request.remove_request)
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
def test_quota_with_reconfigure_resize_disks(create_vm_modscope, quota_limit)
  # Test that Quota gets checked against the resize of the disk of VMs.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Infra
  #       initialEstimate: 1/6h
  #       setup:
  #           1. Add an infra provider
  #           2. Provision a VM
  #           3. Note the storage space in use and set the quota limit to something more than
  #               the current in_use_storage space.
  #       testSteps:
  #           1. Resize the disk of the VM over quota limit.
  #       expectedResults:
  #           1. VM reconfiguration request for resizing the disk should be denied with reason quota
  #              exceeded.
  # 
  #   Bugzilla:
  #       1533263
  #   
  vm = create_vm_modscope
  config = vm.configuration.copy()
  disk = config.disks[0]
  resize_value = (disk.size + quota_limit) + 3
  config.resize_disk(resize_value, disk.filename)
  request = vm.reconfigure(config)
  request.wait_for_request(method: "ui")
  raise unless request.status == "Denied"
  raise unless request.row.reason.text == "Quota Exceeded"
end
