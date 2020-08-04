require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/config_management/ansible_tower'
include Cfme::Infrastructure::Config_management::Ansible_tower
require_relative 'cfme/services/myservice'
include Cfme::Services::Myservice
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
pytestmark = [test_requirements.automate, pytest.mark.provider([AnsibleTowerProvider], scope: "module"), pytest.mark.usefixtures("setup_provider")]
def ansible_catalog_item(appliance, request, provider, ansible_tower_dialog, catalog)
  config_manager_obj = provider
  provider_name = config_manager_obj.data.get("name")
  template = config_manager_obj.data["provisioning_data"]["template"]
  cat_list = []
  for _ in 2.times
    catalog_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.ANSIBLE_TOWER, name: ansible_tower_dialog.label, description: fauxfactory.gen_alphanumeric(), display_in: true, catalog: catalog, dialog: ansible_tower_dialog, provider: "#{provider_name} Automation Manager", config_template: template)
    cat_list.push(catalog_item.name)
    request.addfinalizer(catalog_item.delete_if_exists)
  end
  return cat_list
end
def set_roottenant_quota(request, appliance)
  roottenant = appliance.collections.tenants.get_root_tenant()
  field,value = request.param
  roottenant.set_quota(None: {"#{field}_cb" => true, "field" => value})
  yield
  roottenant.set_quota(None: {"#{field}_cb" => false})
end
def test_quota_for_ansible_service(request, appliance, ansible_catalog_item, catalog, ansible_tower_dialog, set_roottenant_quota)
  # 
  #   Bugzilla:
  #       1363901
  # 
  #   Polarion:
  #       assignee: ghubale
  #       initialEstimate: 1/4h
  #       caseimportance: low
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.5
  #       casecomponent: Configuration
  #       testSteps:
  #           1. create a service bundle including an Ansible Tower service type
  #           2. make sure CloudForms quotas are enabled
  #           3. provision the service
  #       expectedResults:
  #           1.
  #           2.
  #           3. No error in service bundle provisioning for Ansible Tower service types when quota
  #              is enforce.
  #   
  bundle_name = fauxfactory.gen_alphanumeric(start: "bundle_")
  catalog_bundle = appliance.collections.catalog_bundles.create(bundle_name, description: "catalog_bundle", display_in: true, catalog: catalog, dialog: ansible_tower_dialog, catalog_items: ansible_catalog_item)
  request.addfinalizer(catalog_bundle.delete_if_exists)
  service_catalogs = ServiceCatalogs(appliance, catalog_bundle.catalog, catalog_bundle.name)
  (LogValidator("/var/www/miq/vmdb/log/automation.log", failure_patterns: [".*ERROR.*"])).waiting(timeout: 120) {
    service_catalogs.order()
    provision_request = appliance.collections.requests.instantiate(bundle_name, partial_check: true)
    delete = lambda do
      navigate_to(appliance.server, "Dashboard")
      provision_request.remove_request()
    end
    provision_request.wait_for_request()
    msg = "Provisioning failed with the message #{provision_request.rest.message}"
    raise msg unless provision_request.is_succeeded()
  }
end
def test_retire_ansible_service_bundle(request, appliance, ansible_catalog_item, catalog, ansible_tower_dialog)
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       testtype: functional
  #       initialEstimate: 1/4h
  #       startsin: 5.5
  #       tags: service
  #   Bugzilla:
  #       1363897
  #   
  bundle_name = fauxfactory.gen_alphanumeric(start: "bundle_")
  catalog_bundle = appliance.collections.catalog_bundles.create(bundle_name, description: "catalog_bundle", display_in: true, catalog: catalog, dialog: ansible_tower_dialog, catalog_items: ansible_catalog_item)
  request.addfinalizer(catalog_bundle.delete_if_exists)
  service_catalogs = ServiceCatalogs(appliance, catalog_bundle.catalog, catalog_bundle.name)
  service_catalogs.order()
  provision_request = appliance.collections.requests.instantiate(bundle_name, partial_check: true)
  provision_request.wait_for_request()
  provision_request.remove_request(method: "rest")
  service = MyService(appliance, ansible_tower_dialog.label)
  retire_request = service.retire()
  raise unless retire_request.exists()
end
