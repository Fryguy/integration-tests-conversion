require_relative 'cfme'
include Cfme
require_relative 'cfme/automate/explorer/domain'
include Cfme::Automate::Explorer::Domain
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/services/requests'
include Cfme::Services::Requests
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [pytest.mark.meta(server_roles: "+automate"), pytest.mark.usefixtures("setup_provider_modscope", "catalog_item", "uses_infra_providers"), test_requirements.service, pytest.mark.long_running, pytest.mark.provider([InfraProvider], selector: ONE_PER_TYPE, required_fields: [["provisioning", "template"], ["provisioning", "host"], ["provisioning", "datastore"]], scope: "module")]
def service_retirement_request(domain)
  domain.parent.instantiate(name: "ManageIQ").namespaces.instantiate(name: "Service").namespaces.instantiate(name: "Retirement").namespaces.instantiate(name: "StateMachines").classes.instantiate(name: "ServiceRetirementRequestApproval").instances.instantiate(name: "Default").copy_to(domain.name)
  method = domain.namespaces.instantiate(name: "Service").namespaces.instantiate(name: "Retirement").namespaces.instantiate(name: "StateMachines").classes.instantiate(name: "ServiceRetirementRequestApproval").instances.instantiate(name: "Default")
  update(method) {
    method.fields = {"approval_type" => {"value" => "manual"}}
  }
  return method
end
def create_domain(request, appliance)
  # Create new domain and copy instance from ManageIQ to this domain
  dc = DomainCollection(appliance)
  new_domain = dc.create(name: fauxfactory.gen_alphanumeric(12, start: "domain_"), enabled: true)
  request.addfinalizer(new_domain.delete_if_exists)
  instance = dc.instantiate(name: "ManageIQ").namespaces.instantiate(name: "Service").namespaces.instantiate(name: "Provisioning").namespaces.instantiate(name: "StateMachines").classes.instantiate(name: "ServiceProvisionRequestApproval").instances.instantiate(name: "Default")
  instance.copy_to(new_domain)
  return new_domain
end
def modify_instance(create_domain)
  # Modify the instance in new domain to change it to manual approval instead of auto
  instance = create_domain.namespaces.instantiate(name: "Service").namespaces.instantiate(name: "Provisioning").namespaces.instantiate(name: "StateMachines").classes.instantiate(name: "ServiceProvisionRequestApproval").instances.instantiate(name: "Default")
  update(instance) {
    instance.fields = {"approval_type" => {"value" => "manual"}}
  }
end
def test_service_manual_approval(appliance, provider, modify_instance, catalog_item, request)
  # Tests order catalog item
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  vm_name = catalog_item.prov_data["catalog"]["vm_name"]
  request.addfinalizer(lambda{|| appliance.collections.infra_vms.instantiate(vm_name, provider).cleanup_on_provider()})
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  service_catalogs.order()
  logger.info()
  request_description = catalog_item.name
  service_request = appliance.collections.requests.instantiate(description: request_description, partial_check: true)
  service_request.update(method: "ui")
  raise unless service_request.row.approval_state.text == "Pending Approval"
end
def test_service_retire_manual_approval(request, appliance, service_retirement_request, service_vm)
  #  Test service retirement manual approval
  # 
  #   Bugzilla:
  #       1697600
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/2h
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: Services
  #       setup:
  #           1. Set Service retirement manual approval instead of auto
  #       testSteps:
  #           1. Add Service Catalog, Order the Service
  #           2. Retire the service
  #           3. Navigate to Service retirement request Details page
  #           4. Manually approve the service retirement request
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Admin should be able to approve the retirement request
  #   
  service,_ = service_vm
  appliance.context.use(ViaUI) {
    service.retire(wait: false)
    request_description = 
    service_request = appliance.collections.requests.instantiate(description: request_description, partial_check: true)
    service_request.update(method: "ui")
    raise unless service_request.row.approval_state.text == "Pending Approval"
    navigate_to(service_request, "Details")
    view = appliance.browser.create_view(RequestDetailsToolBar)
    if is_bool(!view.approve.is_displayed && BZ(1721479, forced_streams: ["5.10", "5.11"]).blocks)
      navigate_to(appliance.server, "Dashboard")
      service_request.approve_request(method: "ui", reason: "Approved")
    else
      service_request.approve_request(method: "ui", reason: "Approved")
    end
    raise unless service_request.row.approval_state.text == "Approved"
    service_request.wait_for_request()
    msg = 
    request.addfinalizer(service_request.remove_request)
    raise msg unless service_request.is_succeeded()
  }
end
