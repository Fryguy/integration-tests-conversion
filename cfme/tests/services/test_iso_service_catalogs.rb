require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/pxe'
include Cfme::Infrastructure::Pxe
require_relative 'cfme/infrastructure/pxe'
include Cfme::Infrastructure::Pxe
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [pytest.mark.meta(server_roles: "+automate"), pytest.mark.usefixtures("uses_infra_providers"), test_requirements.service, pytest.mark.tier(2), pytest.mark.provider([InfraProvider], required_fields: ["iso_datastore", ["provisioning", "host"], ["provisioning", "datastore"], ["provisioning", "iso_template"], ["provisioning", "iso_file"], ["provisioning", "iso_kickstart"], ["provisioning", "iso_root_password"], ["provisioning", "iso_image_type"], ["provisioning", "vlan"]], scope: "module")]
def iso_cust_template(provider, appliance)
  iso_cust_template = provider.data["provisioning"]["iso_kickstart"]
  begin
    return get_template_from_config(iso_cust_template, create: true, appliance: appliance)
  rescue KeyError
    pytest.skip("No such template '{}' available in 'customization_templates'".format(iso_cust_template))
  end
end
def iso_datastore(provider, appliance)
  return ISODatastore(provider.name, appliance: appliance)
end
def setup_iso_datastore(setup_provider, iso_cust_template, iso_datastore, provisioning)
  if is_bool(!iso_datastore.exists())
    iso_datastore.create()
  end
  iso_datastore.set_iso_image_type(provisioning["iso_file"], provisioning["iso_image_type"])
end
def catalog_item(appliance, provider, dialog, catalog, provisioning)
  iso_template,host,datastore,iso_file,iso_kickstart,iso_root_password,iso_image_type,vlan = ["pxe_template", "host", "datastore", "iso_file", "iso_kickstart", "iso_root_password", "iso_image_type", "vlan"].map{|_| provisioning.get(_)}.to_a
  provisioning_data = {"catalog" => {"catalog_name" => {"name" => iso_template, "provider" => provider.name}, "vm_name" => random_vm_name("iso_service"), "provision_type" => "ISO", "iso_file" => {"name" => iso_file}}, "environment" => {"host_name" => {"name" => host}, "datastore_name" => {"name" => datastore}}, "customize" => {"custom_template" => {"name" => iso_kickstart}, "root_password" => iso_root_password}, "network" => {"vlan" => partial_match(vlan)}}
  item_name = fauxfactory.gen_alphanumeric(15, start: "cat_item_")
  return appliance.collections.catalog_items.create(appliance.collections.catalog_items.RHV, name: item_name, description: "my catalog", display_in: true, catalog: catalog, dialog: dialog, prov_data: provisioning_data)
end
def test_rhev_iso_servicecatalog(appliance, provider, setup_provider, setup_iso_datastore, catalog_item, request)
  # Tests RHEV ISO service catalog
  # 
  #   Metadata:
  #       test_flag: iso, provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #   
  vm_name = catalog_item.prov_data["catalog"]["vm_name"]
  request.addfinalizer(lambda{|| appliance.collections.infra_vms.instantiate("#{vm_name}0001", provider).cleanup_on_provider()})
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  service_catalogs.order()
  logger.info("Waiting for cfme provision request for service %s", catalog_item.name)
  request_description = catalog_item.name
  provision_request = appliance.collections.requests.instantiate(request_description, partial_check: true)
  provision_request.wait_for_request()
  msg = "Provisioning failed with the message #{provision_request.rest.message}"
  raise msg unless provision_request.is_succeeded()
end
