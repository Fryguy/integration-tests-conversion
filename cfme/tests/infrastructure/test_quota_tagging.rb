require_relative 'riggerlib'
include Riggerlib
require_relative 'widgetastic/utils'
include Widgetastic::Utils
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
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [test_requirements.quota, pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([RHEVMProvider, VMwareProvider], scope: "module", selector: ONE_PER_TYPE)]
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
def prov_data(provider, vm_name, template_name)
  if is_bool(provider.one_of(RHEVMProvider))
    return {"catalog" => {"vm_name" => vm_name, "catalog_name" => {"name" => template_name}}, "environment" => {"automatic_placement" => true}, "network" => {"vlan" => partial_match("ovirtmgmt")}}
  else
    return {"catalog" => {"vm_name" => vm_name, "catalog_name" => {"name" => template_name}}, "environment" => {"automatic_placement" => true}}
  end
end
def domain(appliance)
  domain = appliance.collections.domains.create(fauxfactory.gen_alphanumeric(15, start: "domain_"), fauxfactory.gen_alphanumeric(15, start: "domain_desc_"), enabled: true)
  yield domain
  if is_bool(domain.exists)
    domain.delete()
  end
end
def catalog_item(appliance, provider, dialog, catalog, prov_data)
  collection = appliance.collections.catalog_items
  catalog_item = collection.create(provider.catalog_item_type, name: fauxfactory.gen_alphanumeric(15, start: "cat_item_"), description: "test catalog", display_in: true, catalog: catalog, dialog: dialog, prov_data: prov_data)
  yield catalog_item
  if is_bool(catalog_item.exists)
    catalog_item.delete()
  end
end
def catalog_bundle(appliance, dialog, catalog, catalog_item)
  collection = appliance.collections.catalog_bundles
  catalog_bundle = collection.create(name: fauxfactory.gen_alphanumeric(15, start: "cat_bundle_"), catalog_items: [catalog_item.name], description: "test catalog bundle", display_in: true, catalog: catalog, dialog: dialog)
  yield catalog_bundle
  if is_bool(catalog_bundle.exists)
    catalog_bundle.delete()
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
def set_entity_quota_tag(request, entities, appliance)
  tag,value = request.param
  tag = appliance.collections.categories.instantiate(display_name: tag).collections.tags.instantiate(display_name: value)
  entities.add_tag(tag)
  yield
  appliance.server.browser.refresh()
  entities.remove_tag(tag)
end
def test_quota_tagging_infra_via_lifecycle(request, appliance, provider, set_entity_quota_tag, custom_prov_data, vm_name, template_name, prov_data)
  # 
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
  request.addfinalizer(provision_request.remove_request)
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
def test_quota_tagging_infra_via_services(request, appliance, admin_email, context, set_entity_quota_tag, custom_prov_data, prov_data, catalog_item)
  # This test case verifies the quota tagging is working correctly for the infra providers.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Quota
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       tags: quota
  #   
  prov_data.update(custom_prov_data)
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
def small_vm(provider, small_template_modscope)
  vm = provider.appliance.collections.infra_vms.instantiate(random_vm_name(context: "reconfig"), provider, small_template_modscope.name)
  vm.create_on_provider(find_in_cfme: true, allow_skip: "default")
  vm.refresh_relationships()
  yield vm
  vm.cleanup_on_provider()
end
def custom_prov_data(request, prov_data, vm_name, template_name)
  prov_data.update(request.param)
  prov_data["catalog"]["vm_name"] = vm_name
  prov_data["catalog"]["catalog_name"] = {"name" => template_name}
end
def test_quota_vm_reconfigure(appliance, admin_email, entities, small_vm, custom_prov_data, prov_data, processor_sockets, processor_cores_per_socket, total_processors, approve)
  # Tests quota with vm reconfigure
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Quota
  #       caseimportance: high
  #       tags: quota
  #       testSteps:
  #           1. Assign Quota to group and user individually
  #           2. Reconfigure the VM above the assigned Quota
  #           3. Check whether VM  reconfiguration 'Denied' with Exceeded Quota or not
  #   
  original_config = small_vm.configuration.copy()
  new_config = small_vm.configuration.copy()
  setattr(new_config.hw, prov_data["change"], prov_data["value"])
  small_vm.reconfigure(new_config)
  if is_bool(approve)
    request_description = ("VM Reconfigure for: {vm_name} - Memory: 102400 MB").format(vm_name: small_vm.name)
  else
    request_description = ("VM Reconfigure for: {vm_name} - Processor Sockets: {sockets}, Processor Cores Per Socket: {cores_per_socket}, Total Processors: {Processors}").format(vm_name: small_vm.name, sockets: processor_sockets, cores_per_socket: processor_cores_per_socket, Processors: total_processors)
  end
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  raise unless provision_request.row.reason.text == "Quota Exceeded"
  raise unless small_vm.configuration == original_config
end
def test_quota_infra(request, appliance, admin_email, entities, custom_prov_data, prov_data, catalog_item, context, vm_name, template_name)
  # This test case verifies the quota assigned by automation method for user and group
  #      is working correctly for the infra providers.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Quota
  #       caseimportance: medium
  #       tags: quota
  #       testSteps:
  #           1. Navigate to Automation > Automate > Explorer
  #           2. Add quota automation methods to domain
  #           3. Change 'quota_source_type' to 'user' or 'group'
  #           4. Test quota by provisioning VMs over quota limit via UI or SSUI for user and group
  #           5. Check whether quota is exceeded or not
  #   
  prov_data.update(custom_prov_data)
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
def test_quota_catalog_bundle_infra(request, appliance, admin_email, entities, custom_prov_data, prov_data, catalog_bundle, context, vm_name, template_name)
  # This test case verifies the quota assigned by automation method for user and group
  #      is working correctly for the infra providers by ordering catalog bundle.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Quota
  #       caseimportance: high
  #       tags: quota
  #       testSteps:
  #           1. Navigate to Automation > Automate > Explorer
  #           2. Add quota automation methods to domain
  #           3. Change 'quota_source_type' to 'user' or 'group'
  #           4. Create one or more catalogs to test quota by provisioning VMs over quota limit via UI
  #              or SSUI for user and group
  #           5. Add more than one catalog to catalog bundle and order catalog bundle
  #           6. Check whether quota is exceeded or not
  #   
  prov_data.update(custom_prov_data)
  appliance.context.use(context) {
    service_catalogs = ServiceCatalogs(appliance, catalog_bundle.catalog, catalog_bundle.name)
    if context === ViaSSUI
      service_catalogs.add_to_shopping_cart()
    end
    service_catalogs.order()
  }
  request_description = "Provisioning Service [{0}] from [{0}]".format(catalog_bundle.name)
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(provision_request.remove_request)
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
