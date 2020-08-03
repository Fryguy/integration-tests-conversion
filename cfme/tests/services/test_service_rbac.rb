require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
pytestmark = [pytest.mark.usefixtures("uses_infra_providers", "setup_provider_modscope"), pytest.mark.provider([VMwareProvider], selector: ONE_PER_TYPE, scope: "module")]
def new_role(appliance, product_features)
  collection = appliance.collections.roles
  return collection.create(name: fauxfactory.gen_alphanumeric(start: "role_"), vm_restriction: nil, product_features: product_features)
end
def new_group(appliance, role)
  collection = appliance.collections.groups
  return collection.create(description: fauxfactory.gen_alphanumeric(start: "group_"), role: role, tenant: "My Company")
end
def new_user(appliance, group, credential)
  collection = appliance.collections.users
  return collection.create(name: fauxfactory.gen_alphanumeric(start: "user_"), credential: credential, email: "xyz@redhat.com", groups: group, cost_center: "Workload", value_assign: "Database")
end
def role_user_group(appliance, new_credential)
  vm_access_rule = (appliance.version > "5.11") ? "All VM and Instance Access Rules" : "Access Rules for all Virtual Machines"
  role = new_role(appliance: appliance, product_features: [[["Everything"], false], [["Everything", vm_access_rule], true]])
  group = new_group(appliance: appliance, role: role.name)
  user = new_user(appliance: appliance, group: group, credential: new_credential)
  yield([role, user])
  user.delete_if_exists()
  group.delete_if_exists()
  role.delete_if_exists()
end
def test_service_rbac_no_permission(appliance, role_user_group)
  #  Test service rbac without user permission
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #   
  role,user = role_user_group
  error_message = "The user's role is not authorized for any access, please contact the administrator!"
  pytest.raises(Exception, match: error_message) {
    user {
      appliance.server.login(user)
    }
  }
end
def test_service_rbac_catalog(appliance, role_user_group, catalog)
  #  Test service rbac with catalog
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #   
  role,user = role_user_group
  product_features = [[["Everything"], true], [["Everything"], false]]
  product_features.concat(["Catalogs"].map{|k| [["Everything", "Services", "Catalogs Explorer", k], true]})
  role.update({"product_features" => product_features})
  user {
    appliance.server.login(user)
    raise unless catalog.exists
  }
end
def test_service_rbac_service_catalog(appliance, role_user_group, catalog, catalog_item, request, provider)
  #  Test service rbac with service catalog
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #   
  role,user = role_user_group
  product_features = [[["Everything"], true], [["Everything"], false], [["Everything", "Services", "Requests"], true], [["Everything", "Automation", "Automate", "Customization"], true]]
  product_features.concat(["Catalog Items", "Service Catalogs", "Catalogs"].map{|k| [["Everything", "Services", "Catalogs Explorer", k], true]})
  role.update({"product_features" => product_features})
  user {
    appliance.server.login(user)
    service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
    service_catalogs.order()
    service_request = appliance.collections.requests.instantiate(catalog_item.name, partial_check: true)
    service_request.wait_for_request()
    raise unless service_request.is_succeeded()
  }
  _finalize = lambda do
    rest_vm = appliance.rest_api.collections.vms.get(name: "%#{catalog_item.prov_data["catalog"]["vm_name"]}%")
    vm = appliance.collections.infra_vms.instantiate(name: rest_vm.name, provider: provider)
    vm.delete_if_exists()
    vm.wait_to_disappear()
    request = appliance.collections.requests.instantiate(description: "Provisioning Service [#{catalog_item.dialog.label}] from [#{catalog_item.dialog.label}]")
    request.remove_request()
  end
end
def test_service_rbac_catalog_item(request, appliance, role_user_group, catalog_item)
  #  Test service rbac with catalog item
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #   
  role,user = role_user_group
  product_features = [[["Everything"], true], [["Everything"], false]]
  product_features.concat(["Catalog Items"].map{|k| [["Everything", "Services", "Catalogs Explorer", k], true]})
  role.update({"product_features" => product_features})
  user {
    appliance.server.login(user)
    raise unless catalog_item.exists
  }
end
def test_service_rbac_orchestration(appliance, role_user_group)
  #  Test service rbac with orchestration
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #   
  role,user = role_user_group
  product_features = [[["Everything"], true], [["Everything"], false]]
  product_features.concat(["Orchestration Templates"].map{|k| [["Everything", "Services", "Catalogs Explorer", k], true]})
  role.update({"product_features" => product_features})
  user {
    appliance.server.login(user)
    collection = appliance.collections.orchestration_templates
    template = collection.create(template_name: fauxfactory.gen_alphanumeric(start: "temp_"), template_type: "Amazon CloudFormation", template_group: "CloudFormation Templates", description: "template description", content: fauxfactory.gen_numeric_string())
    raise unless template.exists
    template.delete()
  }
end
def test_service_rbac_request(appliance, role_user_group, catalog_item, request, provider)
  #  Test service rbac with only request module permissions
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #   
  role,user = role_user_group
  product_features = [[["Everything"], true], [["Everything"], false], [["Everything", "Services", "Requests"], true], [["Everything", "Automation", "Automate", "Customization"], true]]
  product_features.concat(["Catalog Items", "Service Catalogs", "Catalogs"].map{|k| [["Everything", "Services", "Catalogs Explorer", k], true]})
  role.update({"product_features" => product_features})
  user {
    appliance.server.login(user)
    service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
    service_catalogs.order()
    cells = {"Description" => catalog_item.name}
    order_request = appliance.collections.requests.instantiate(cells: cells, partial_check: true)
    order_request.wait_for_request(method: "ui")
    raise unless order_request.is_succeeded(method: "ui")
  }
  _finalize = lambda do
    rest_vm = appliance.rest_api.collections.vms.get(name: "%#{catalog_item.prov_data["catalog"]["vm_name"]}%")
    vm = appliance.collections.infra_vms.instantiate(name: rest_vm.name, provider: provider)
    vm.delete_if_exists()
    vm.wait_to_disappear()
    request = appliance.collections.requests.instantiate(description: "Provisioning Service [#{catalog_item.dialog.label}] from [#{catalog_item.dialog.label}]")
    request.remove_request()
  end
end
