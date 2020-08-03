require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/services/workloads'
include Cfme::Services::Workloads
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.meta(server_roles: "+automate"), pytest.mark.usefixtures("setup_provider_modscope", "catalog_item", "uses_infra_providers"), test_requirements.service, pytest.mark.long_running, pytest.mark.provider([InfraProvider], selector: ONE_PER_TYPE, required_fields: [["provisioning", "template"], ["provisioning", "host"], ["provisioning", "datastore"]], scope: "module")]
def test_order_catalog_item(appliance, provider, catalog_item, request, register_event)
  # Tests order catalog item
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #       tags: service
  #   
  vm_name = catalog_item.prov_data["catalog"]["vm_name"]
  request.addfinalizer(lambda{|| appliance.collections.infra_vms.instantiate(, provider).cleanup_on_provider()})
  register_event.(target_type: "Service", target_name: catalog_item.name, event_type: "service_provisioned")
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  service_catalogs.order()
  logger.info()
  request_description = catalog_item.name
  provision_request = appliance.collections.requests.instantiate(request_description, partial_check: true)
  provision_request.wait_for_request()
  msg = 
  raise msg unless provision_request.is_succeeded()
end
def test_order_catalog_item_via_rest(request, appliance, provider, catalog_item, catalog)
  # Same as :py:func:`test_order_catalog_item`, but using REST.
  #   Metadata:
  #       test_flag: provision, rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Services
  #       caseimportance: high
  #       initialEstimate: 1/3h
  #       tags: service
  #   
  vm_name = catalog_item.prov_data["catalog"]["vm_name"]
  request.addfinalizer(lambda{|| appliance.collections.infra_vms.instantiate(vm_name, provider).cleanup_on_provider()})
  request.addfinalizer(catalog_item.delete)
  catalog = appliance.rest_api.collections.service_catalogs.find_by(name: catalog.name)
  raise unless catalog.size == 1
  catalog, = catalog
  template = catalog.service_templates.find_by(name: catalog_item.name)
  raise unless template.size == 1
  template, = template
  req = template.action.order()
  assert_response(appliance)
  request_finished = lambda do
    req.reload()
    logger.info("Request status: {}, Request state: {}, Request message: {}".format(req.status, req.request_state, req.message))
    return req.status.downcase() == "ok" && req.request_state.downcase() == "finished"
  end
end
def test_order_catalog_bundle(appliance, provider, catalog_item, request)
  # Tests ordering a catalog bundle
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #       tags: service
  #   
  vm_name = catalog_item.prov_data["catalog"]["vm_name"]
  request.addfinalizer(lambda{|| appliance.collections.infra_vms.instantiate(, provider).cleanup_on_provider()})
  bundle_name = fauxfactory.gen_alphanumeric(12, start: "bundle_")
  catalog_bundle = appliance.collections.catalog_bundles.create(bundle_name, description: "catalog_bundle", display_in: true, catalog: catalog_item.catalog, dialog: catalog_item.dialog, catalog_items: [catalog_item.name])
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_bundle.name)
  service_catalogs.order()
  logger.info()
  request_description = bundle_name
  provision_request = appliance.collections.requests.instantiate(request_description, partial_check: true)
  provision_request.wait_for_request()
  msg = 
  raise msg unless provision_request.is_succeeded()
end
def test_no_template_catalog_item(has_no_providers, provider, provisioning, dialog, catalog, appliance)
  # Tests no template catalog item
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/8h
  #       tags: service
  #   
  item_name = fauxfactory.gen_alphanumeric(15, start: "cat_item_")
  catalog_item = appliance.collections.catalogs.instantiate(item_type: provider.catalog_name, name: item_name, description: "my catalog", display_in: true, catalog: catalog, dialog: dialog)
  pytest.raises(Exception, match: "'Catalog/Name' is required") {
    catalog_item.create()
  }
end
def test_request_with_orphaned_template(appliance, provider, catalog_item)
  # Tests edit catalog item after deleting provider
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #       tags: service
  #   
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  service_catalogs.order()
  logger.info()
  request_description = catalog_item.name
  provision_request = appliance.collections.requests.instantiate(request_description, partial_check: true)
  provider.delete()
  provider.wait_for_delete()
  provision_request.wait_for_request(method: "ui")
  raise unless provision_request.row.status.text == "Error"
end
def test_advanced_search_registry_element(request, appliance)
  # 
  #       Go to Services -> Workloads
  #       Advanced Search -> Registry element
  #       Element types select bar shouldn't disappear.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/4h
  #       casecomponent: WebUI
  #   
  view = navigate_to(VmsInstances(appliance: appliance), "All")
  view.search.open_advanced_search()
  request.addfinalizer(view.search.close_advanced_search)
  view.search.advanced_search_form.search_exp_editor.registry_form_view.fill({"type" => "Registry"})
  raise unless view.search.advanced_search_form.search_exp_editor.registry_form_view.type.is_displayed
end
def test_order_service_after_deleting_provider(appliance, provider, setup_provider, catalog_item)
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       testtype: functional
  #       initialEstimate: 1/4h
  #       startsin: 5.8
  #       tags: service
  #   
  template_name = catalog_item.prov_data["catalog"]["catalog_name"]["name"]
  template_id = appliance.rest_api.collections.templates.find_by(name: template_name)[0].id
  provider.delete()
  provider.wait_for_delete()
  raise unless !provider.exists
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  provision_request = service_catalogs.order()
  provision_request.wait_for_request()
  view = navigate_to(provision_request, "Details")
  raise unless view.details.request_details.get_text_of("Request State") == "Finished"
  last_msg = 
  raise unless view.details.request_details.get_text_of("Last Message") == last_msg
end
