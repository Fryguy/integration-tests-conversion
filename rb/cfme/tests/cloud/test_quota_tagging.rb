require_relative 'riggerlib'
include Riggerlib
require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
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
pytestmark = [test_requirements.quota, pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenStackProvider], required_fields: [["provisioning", "image"]], scope: "module")]
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
def template_name(provisioning)
  return provisioning["image"]["name"]
end
def prov_data(provider, vm_name, template_name, provisioning)
  if is_bool(provider.one_of(OpenStackProvider))
    return {"catalog" => {"vm_name" => vm_name, "catalog_name" => {"name" => template_name}}, "environment" => {"automatic_placement" => true}, "properties" => {"instance_type" => partial_match(provisioning.get("instance_type2", "Instance type is not available"))}}
  end
end
def domain(appliance)
  domain = appliance.collections.domains.create(fauxfactory.gen_alphanumeric(start: "domain_"), fauxfactory.gen_alphanumeric(15, start: "domain_desc_"), enabled: true)
  yield(domain)
  if is_bool(domain.exists)
    domain.delete()
  end
end
def catalog_item(appliance, provider, dialog, catalog, prov_data)
  collection = appliance.collections.catalog_items
  catalog_item = collection.create(provider.catalog_item_type, name: fauxfactory.gen_alphanumeric(15, start: "cat_item_"), description: "test catalog", display_in: true, catalog: catalog, dialog: dialog, prov_data: prov_data)
  yield(catalog_item)
  if is_bool(catalog_item.exists)
    catalog_item.delete()
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
def set_entity_quota_source_change(max_quota_test_instance, request)
  entity_value = request.param
  update(max_quota_test_instance) {
    max_quota_test_instance.fields = {"quota_source_type" => {"value" => entity_value}}
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
def test_quota_tagging_cloud_via_lifecycle(request, appliance, provider, prov_data, set_entity_quota_tag, template_name, vm_name)
  # Test Group and User Quota in UI using tagging
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Cloud
  #       initialEstimate: 1/6h
  #       tags: quota
  #   
  recursive_update(prov_data, {"request" => {"email" => fauxfactory.gen_email()}})
  prov_data.update({"template_name" => template_name})
  appliance.collections.cloud_instances.create(vm_name, provider, prov_data, override: true)
  request_description = "Provision from [{template}] to [{vm}]".format(template: template_name, vm: vm_name)
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(provision_request.remove_request)
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
def test_quota_tagging_cloud_via_services(appliance, request, context, admin_email, set_entity_quota_tag, catalog_item)
  # Test Group and User Quota in UI and SSUI using tagging
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Cloud
  #       initialEstimate: 1/6h
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
def test_cloud_quota_by_lifecycle(request, appliance, provider, set_entity_quota_source_change, prov_data, vm_name, template_name)
  # Testing cloud quota for user and group by provisioning instance via lifecycle
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #       tags: quota
  #       testSteps:
  #           1. Navigate to Automation > automate > Explorer
  #           2. Create new Domain and copy 'quota' and 'quota_source' method
  #           3. Change 'value' of 'open source type' to 'user' or 'group' (one by one) in 'quota'
  #              method
  #           4. Provision instance via lifecycle
  #           5. Make sure that provisioned 'template' is having more than assigned quota
  #           6. Check whether instance provision 'Denied' with reason 'Quota Exceeded'
  #   
  recursive_update(prov_data, {"request" => {"email" => fauxfactory.gen_email()}})
  prov_data.update({"template_name" => template_name})
  appliance.collections.cloud_instances.create(vm_name, provider, prov_data, override: true)
  request_description = "Provision from [{template}] to [{vm}]".format(template: template_name, vm: vm_name)
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(provision_request.remove_request)
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
def test_quota_cloud_via_services(appliance, request, admin_email, entities, prov_data, catalog_item, context)
  # This test case verifies the quota assigned by automation method for user and group
  #      is working correctly for the cloud providers.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #       tags: quota
  #       testSteps:
  #          1. Navigate to Automation > Automate > Explorer
  #          2. Add quota automation methods to domain
  #          3. Change 'quota_source_type' to 'user' or 'group'
  #          4. Test quota by provisioning instances over quota limit via UI or
  #             SSUI for user and group
  #          5. Check whether quota is exceeded or not
  #   
  appliance.context.use(context) {
    service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
    if context === ViaSSUI
      service_catalogs.add_to_shopping_cart()
    end
    service_catalogs.order()
  }
  request_description = "Provisioning Service [{catalog_item_name}] from [{catalog_item_name}]".format(catalog_item_name: catalog_item.name)
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(provision_request.remove_request)
  raise unless provision_request.row.reason.text == "Quota Exceeded"
end
