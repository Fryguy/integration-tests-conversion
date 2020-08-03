require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/config_management/ansible_tower'
include Cfme::Infrastructure::Config_management::Ansible_tower
require_relative 'cfme/services/myservice'
include Cfme::Services::Myservice
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [test_requirements.service, pytest.mark.tier(2), pytest.mark.provider([AnsibleTowerProvider], scope: "module"), pytest.mark.usefixtures("setup_provider"), pytest.mark.parametrize("ansible_api_version", ["v1", "v2"]), pytest.mark.ignore_stream("upstream")]
def ansible_workflow_catitem(appliance, provider, dialog, catalog, workflow_type)
  config_manager_obj = provider
  provider_name = config_manager_obj.data.get("name")
  begin
    template = config_manager_obj.data["provisioning_data"][workflow_type]
  rescue KeyError
    pytest.skip()
  end
  catalog_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.ANSIBLE_TOWER, name: dialog.label, description: "my catalog", display_in: true, catalog: catalog, dialog: dialog, provider: , config_template: template)
  yield catalog_item
  catalog_item.delete_if_exists()
end
def test_tower_workflow_item(appliance, ansible_workflow_catitem, workflow_type, ansible_api_version_change)
  # Tests ordering of catalog items for Ansible Workflow templates
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       caseimportance: high
  #   
  service_catalogs = ServiceCatalogs(appliance, ansible_workflow_catitem.catalog, ansible_workflow_catitem.name)
  service_catalogs.order()
  logger.info("Waiting for cfme provision request for service %s", ansible_workflow_catitem.name)
  cells = {"Description" => ansible_workflow_catitem.name}
  order_request = appliance.collections.requests.instantiate(cells: cells, partial_check: true)
  order_request.wait_for_request(method: "ui")
  msg = 
  raise msg unless order_request.is_succeeded(method: "ui")
  appliance.user.my_settings.default_views.set_default_view("Configuration Management Providers", "List View")
end
def test_retire_ansible_workflow(appliance, ansible_workflow_catitem, workflow_type, ansible_api_version_change)
  # Tests retiring of catalog items for Ansible Workflow templates
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Services
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  service_catalogs = ServiceCatalogs(appliance, ansible_workflow_catitem.catalog, ansible_workflow_catitem.name)
  service_catalogs.order()
  logger.info("Waiting for cfme provision request for service %s", ansible_workflow_catitem.name)
  cells = {"Description" => ansible_workflow_catitem.name}
  order_request = appliance.collections.requests.instantiate(cells: cells, partial_check: true)
  order_request.wait_for_request(method: "ui")
  msg = 
  raise msg unless order_request.is_succeeded(method: "ui")
  myservice = MyService(appliance, ansible_workflow_catitem.name)
  myservice.retire()
end
