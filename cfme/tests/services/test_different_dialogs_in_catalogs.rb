require_relative 'datetime'
include Datetime
require_relative 'widgetastic/exceptions'
include Widgetastic::Exceptions
require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [test_requirements.dialog, pytest.mark.long_running]
WIDGETS = {"Text Box" => ["input", fauxfactory.gen_alpha(), "default_text_box"], "Check Box" => ["checkbox", true, "default_value"], "Text Area" => ["input", fauxfactory.gen_alpha(), "default_text_box"], "Radio Button" => ["radiogroup", "One", "default_value_dropdown"], "Dropdown" => ["dropdown", "Three", "default_value_dropdown"], "Tag Control" => ["dropdown", "Service Level", "field_category"], "Timepicker" => ["input", date.today().strftime("%m/%d/%Y"), nil]}
def service_dialog(appliance, widget_name)
  service_dialog = appliance.collections.service_dialogs
  element_data = {"element_information" => {"ele_label" => fauxfactory.gen_alphanumeric(start: "label_"), "ele_name" => fauxfactory.gen_alphanumeric(start: "name_"), "ele_desc" => fauxfactory.gen_alphanumeric(start: "desc_"), "choose_type" => widget_name}, "options" => {"field_required" => true}}
  wt,value,field = WIDGETS[widget_name]
  if widget_name != "Timepicker"
    element_data["options"][field] = value
  end
  sd = service_dialog.create(label: fauxfactory.gen_alphanumeric(start: "dialog_"), description: "my dialog")
  tab = sd.tabs.create(tab_label: fauxfactory.gen_alphanumeric(start: "tab_"), tab_desc: "my tab desc")
  box = tab.boxes.create(box_label: fauxfactory.gen_alphanumeric(start: "box_"), box_desc: "my box desc")
  box.elements.create(element_data: [element_data])
  yield([sd, element_data])
  sd.delete_if_exists()
end
def catalog_item(appliance, provider, provisioning, service_dialog, catalog)
  sd,element_data = service_dialog
  template,host,datastore,iso_file,vlan = ["template", "host", "datastore", "iso_file", "vlan"].map{|_| provisioning.get(_)}.to_a
  provisioning_data = {"catalog" => {"catalog_name" => {"name" => template, "provider" => provider.name}, "vm_name" => random_vm_name("service")}, "environment" => {"host_name" => {"name" => host}, "datastore_name" => {"name" => datastore}}, "network" => {"vlan" => partial_match(vlan)}}
  if provider.type == "rhevm"
    provisioning_data["catalog"]["provision_type"] = "Native Clone"
  else
    if provider.type == "virtualcenter"
      provisioning_data["catalog"]["provision_type"] = "VMware"
    end
  end
  catalog_item = appliance.collections.catalog_items.create(provider.catalog_item_type, name: fauxfactory.gen_alphanumeric(15, start: "cat_item_"), description: "my catalog", display_in: true, catalog: catalog, dialog: sd, prov_data: provisioning_data)
  yield(catalog_item)
  catalog_item.delete_if_exists()
end
def generic_catalog_item(appliance, service_dialog, catalog)
  sd,element_data = service_dialog
  item_name = fauxfactory.gen_alphanumeric(15, start: "cat_item_")
  catalog_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.GENERIC, name: item_name, description: fauxfactory.gen_alphanumeric(), display_in: true, catalog: catalog, dialog: sd)
  yield(catalog_item)
  catalog_item.delete_if_exists()
end
def test_tagdialog_catalog_item(appliance, setup_provider, provider, catalog_item, request, service_dialog, widget_name)
  # Tests tag dialog catalog item
  # 
  #   Bugzilla:
  #       1633540
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  sd,element_data = service_dialog
  vm_name = catalog_item.prov_data["catalog"]["vm_name"]
  request.addfinalizer(lambda{|| appliance.collections.infra_vms.instantiate("#{vm_name}0001", provider).cleanup_on_provider()})
  dialog_values = {element_data["element_information"]["ele_name"] => "Gold"}
  service_catalogs = ServiceCatalogs(appliance, catalog: catalog_item.catalog, name: catalog_item.name, dialog_values: dialog_values)
  service_catalogs.order()
  logger.info("Waiting for cfme provision request for service #{catalog_item.name}")
  provision_request = appliance.collections.requests.instantiate(catalog_item.name, partial_check: true)
  provision_request.wait_for_request()
  msg = "Request failed with the message #{provision_request.rest.message}"
  raise msg unless provision_request.is_succeeded()
end
def new_user(appliance, permission)
  collection = appliance.collections.tenants
  tenant = collection.create(name: fauxfactory.gen_alphanumeric(start: "tenant_"), description: fauxfactory.gen_alphanumeric(), parent: collection.get_root_tenant())
  role = appliance.collections.roles.create(name: fauxfactory.gen_alphanumeric(start: "role_"), vm_restriction: "Only User or Group Owned", product_features: permission)
  group = appliance.collections.groups.create(description: fauxfactory.gen_alphanumeric(start: "grp_"), role: role.name, tenant: "My Company/#{tenant.name}")
  creds = Credential(principal: fauxfactory.gen_alphanumeric(4), secret: fauxfactory.gen_alphanumeric(4))
  user = appliance.collections.users.create(name: fauxfactory.gen_alphanumeric(start: "user_"), credential: creds, email: fauxfactory.gen_email(), groups: group, cost_center: "Workload", value_assign: "Database")
  yield(user)
  user.delete_if_exists()
  group.delete_if_exists()
  role.delete_if_exists()
  tenant.delete_if_exists()
end
def test_should_be_able_to_access_services_requests_as_user(appliance, new_user, permission)
  # 
  #   Bugzilla:
  #       1576129
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       testtype: functional
  #       initialEstimate: 1/4h
  #       startsin: 5.9
  #       tags: service
  #   
  new_user {
    if permission == [[["Everything"], true]]
      navigate_to(appliance.collections.requests, "All")
    else
      pytest.raises(NoSuchElementException) {
        navigate_to(appliance.collections.requests, "All")
      }
    end
  }
end
def test_dialog_elements_should_display_default_value(appliance, generic_catalog_item, service_dialog, widget_name)
  # 
  #   Bugzilla:
  #       1385898
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/8h
  #       startsin: 5.10
  #       caseimportance: high
  #       testSteps:
  #           1. Create a dialog. Set default value
  #           2. Use the dialog in a catalog.
  #           3. Order catalog.
  #       expectedResults:
  #           1.
  #           2.
  #           3. Default values should be shown
  #   
  sd,element_data = service_dialog
  service_catalogs = ServiceCatalogs(appliance, generic_catalog_item.catalog, generic_catalog_item.name)
  view = navigate_to(service_catalogs, "Order")
  ele_name = element_data["element_information"]["ele_name"]
  wt,value,field = WIDGETS[widget_name]
  get_attr = view.fields(ele_name).getattr(wt)
  if ["Text Box", "Text Area", "Dropdown", "Timepicker", "Check Box"].include?(widget_name)
    value = is_bool(widget_name == "Timepicker" && appliance.version < "5.11") ? date.today().strftime("%Y-%m-%d") : value
    raise unless get_attr.read() == value
  else
    if widget_name == "Tag Control"
      all_options = ["<Choose>", "Gold", "Platinum", "Silver"]
      for option in get_attr.all_options
        raise unless all_options.include?(option.text)
      end
    else
      raise unless get_attr.selected == value
    end
  end
end
