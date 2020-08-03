require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.meta(server_roles: "+automate"), pytest.mark.usefixtures("uses_infra_providers", "setup_provider"), pytest.mark.long_running, test_requirements.service, pytest.mark.tier(3), pytest.mark.provider([VMwareProvider], selector: ONE_PER_TYPE, scope: "module")]
def test_copy_request_bz1194479(appliance, provider, catalog_item, request)
  # Automate BZ 1194479
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  vm_name = catalog_item.prov_data["catalog"]["vm_name"]
  request.addfinalizer(lambda{|| appliance.collections.infra_vms.instantiate("#{vm_name}0001", provider).cleanup_on_provider()})
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  service_catalogs.order()
  request_description = catalog_item.name
  service_request = appliance.collections.requests.instantiate(request_description, partial_check: true)
  service_request.wait_for_request()
  raise unless navigate_to(service_request, "Details")
end
def test_services_requester_dropdown_sorting()
  # 
  #   Bugzilla:
  #       1749953
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/6h
  #       startsin: 5.10
  #       testSteps:
  #           1. Create catalog
  #           2. Order the catalog items
  #           3. Go to Services -> Requests
  #           4. click on the Requester dropdown
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Requester dropdown should Be Organized alphabetically
  #   
  # pass
end
