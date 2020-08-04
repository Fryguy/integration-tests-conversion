require_relative 'riggerlib'
include Riggerlib
require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.service, pytest.mark.meta(server_roles: "+automate"), pytest.mark.tier(2), pytest.mark.provider([CloudProvider], selector: ONE_PER_TYPE, required_fields: [["provisioning", "image"]], scope: "module")]
def vm_name()
  return random_vm_name(context: "provs")
end
def test_cloud_catalog_item(appliance, vm_name, setup_provider, provider, dialog, catalog, request, provisioning)
  # Tests cloud catalog item
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #   
  wait_for(provider.is_refreshed, func_kwargs: {}, timeout: 600)
  vm = appliance.collections.cloud_instances.instantiate("#{vm_name}0001", provider)
  request.addfinalizer(lambda{|| vm.cleanup_on_provider()})
  image = provisioning["image"]["name"]
  item_name = "#{provider.name}-service-#{fauxfactory.gen_alphanumeric()}"
  inst_args = {"catalog" => {"catalog_name" => {"name" => image, "provider" => provider.name}, "vm_name" => vm_name}, "environment" => {"availability_zone" => provisioning.get("availability_zone", nil), "security_groups" => [provisioning.get("security_group", nil)], "cloud_tenant" => provisioning.get("cloud_tenant", nil), "cloud_network" => provisioning.get("cloud_network", nil), "cloud_subnet" => provisioning.get("cloud_subnet", nil), "resource_groups" => provisioning.get("resource_group", nil)}, "properties" => {"instance_type" => partial_match(provisioning.get("instance_type", nil)), "guest_keypair" => provisioning.get("guest_keypair", nil)}}
  if is_bool(provider.one_of(GCEProvider))
    recursive_update(inst_args, {"properties" => {"boot_disk_size" => provisioning["boot_disk_size"], "is_preemptible" => true}})
  end
  if is_bool(provider.one_of(AzureProvider))
    recursive_update(inst_args, {"customize" => {"admin_username" => provisioning["customize_username"], "root_password" => provisioning["customize_password"]}})
  end
  catalog_item = appliance.collections.catalog_items.create(provider.catalog_item_type, name: item_name, description: "my catalog", display_in: true, catalog: catalog, dialog: dialog, prov_data: inst_args)
  request.addfinalizer(catalog_item.delete)
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  service_catalogs.order()
  logger.info("Waiting for cfme provision request for service %s", item_name)
  request_description = item_name
  provision_request = appliance.collections.requests.instantiate(request_description, partial_check: true)
  provision_request.wait_for_request()
  msg = "Request failed with the message #{provision_request.rest.message}"
  raise msg unless provision_request.is_succeeded()
end
