require_relative 'cfme'
include Cfme
require_relative 'cfme/services/myservice'
include Cfme::Services::Myservice
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
pytestmark = [pytest.mark.meta(server_roles: "+automate"), test_requirements.ssui, pytest.mark.long_running]
def test_service_catalog_crud_ui(appliance, context, order_ansible_service_in_ops_ui, request)
  # Tests Ansible Service Catalog in SSUI.
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  service_name = order_ansible_service_in_ops_ui
  appliance.context.use(context) {
    service = ServiceCatalogs(appliance, name: service_name)
    service.add_to_shopping_cart()
    service.order()
    _finalize = lambda do
      _service = MyService(appliance, service_name)
      _service.delete()
    end
  }
end
