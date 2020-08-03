require_relative 'datetime'
include Datetime
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/fixtures/automate'
include Cfme::Fixtures::Automate
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _services services
require_relative 'cfme/services/myservice'
include Cfme::Services::Myservice
require_relative 'cfme/services/myservice/ui'
include Cfme::Services::Myservice::Ui
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/browser'
include Cfme::Utils::Browser
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider", "catalog_item"), pytest.mark.meta(server_roles: "+automate"), pytest.mark.long_running, test_requirements.service, pytest.mark.tier(2), pytest.mark.provider([VMwareProvider], selector: ONE_PER_TYPE, scope: "module")]
def needs_firefox()
  #  Fixture which skips the test if not run under firefox.
  # 
  #   I recommend putting it in the first place.
  #   
  ensure_browser_open()
  if browser.browser().name != "firefox"
    pytest.skip(msg: "This test needs firefox to run")
  end
end
def test_retire_service_ui(appliance, context, service_vm)
  # Tests my service
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #       tags: service
  #   
  service,_ = service_vm
  appliance.context.use(context) {
    service.retire()
  }
end
def test_retire_service_on_date(appliance, context, service_vm)
  # Tests my service retirement
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #       tags: service
  #   
  service,_ = service_vm
  appliance.context.use(context) {
    dt = Datetime::utcnow()
    service.retire_on_date(dt)
  }
end
def test_crud_set_ownership_and_edit_tags(appliance, context, service_vm)
  # Tests my service crud , edit tags and ownership
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #       tags: service
  #   
  service,_ = service_vm
  appliance.context.use(context) {
    service.set_ownership("Administrator", "EvmGroup-administrator")
    service.add_tag()
    update(service) {
      service.description = "my edited description"
    }
    service.delete()
  }
end
def test_download_file(appliance, context, needs_firefox, service_vm, filetype)
  # Tests my service download files
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/16h
  #       tags: service
  #   
  service,_ = service_vm
  appliance.context.use(context) {
    service.download_file(filetype)
  }
end
def test_service_link(appliance, context, service_vm)
  # Tests service link from VM details page(BZ1443772)
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #       tags: service
  #   
  service,vm = service_vm
  appliance.context.use(context) {
    view = navigate_to(vm, "Details")
    view.entities.summary("Relationships").click_at("Service")
    new_view = service.create_view(MyServiceDetailView)
    raise unless new_view.wait_displayed()
  }
end
def test_retire_service_with_retired_vm(appliance, context, service_vm)
  # Tests retire service with an already retired vm.
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #       tags: service
  # 
  #   Bugzilla:
  #       1720338
  #   
  service,vm = service_vm
  vm.retire()
  retire_vm = appliance.rest_api.collections.vms.get(name: vm.name)
  wait_for(lambda{|| retire_vm.instance_variable_defined? :@retired && retire_vm.retired}, timeout: 1000, delay: 5, fail_func: retire_vm.reload)
  appliance.context.use(context) {
    service.retire()
  }
end
def test_retire_on_date_for_multiple_service()
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       testtype: functional
  #       initialEstimate: 1/8h
  #       startsin: 5.5
  #       tags: service
  #   
  # pass
end
def test_service_state(request, appliance, provider, catalog_item, check)
  # 
  #   Bugzilla:
  #       1678123
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/16h
  #       startsin: 5.11
  #       testSteps:
  #           1. Create catalog and catalog item
  #           2. Order the catalog item
  #           3. Provision the service catalog item or fail the service catalog item
  #           4. Go to My services and check service state
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Service State should be Provisioned or Failed
  #   
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  service = MyService(appliance, catalog_item.name)
  service_request = service_catalogs.order()
  _finalize = lambda do
    service.delete()
  end
  if check == "provisioned"
    expected_state = "Provisioned"
    service_request.wait_for_request(method: "ui", num_sec: 200 * 60, delay: 120)
  else
    expected_state = "Unprovisioned"
    provider.delete_rest()
    provider.wait_for_delete()
  end
  view = navigate_to(service, "Details")
  wait_for(lambda{|| view.entities.lifecycle.get_text_of("State") == expected_state}, fail_condition: 0, num_sec: 300, fail_func: view.browser.refresh)
end
def services_vms_list(appliance, request, provider, catalog_item)
  ui_services,vms = [[], []]
  service_template = appliance.rest_api.collections.service_templates.get(name: catalog_item.name)
  for num in 1.upto(3-1)
    rest_service = _services(request, appliance, provider: provider, service_template: service_template)[0]
    ui_services.push(MyService(appliance, name: rest_service.name, description: rest_service.description))
    vms.push(appliance.rest_api.collections.vms.get(name: ))
  end
  return [ui_services, vms]
end
def test_retire_multiple_services(services_vms_list)
  # 
  #   Bugzilla:
  #       1722194
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/6h
  #       startsin: 5.11
  #       testSteps:
  #           1. Create catalog and create two catalog item
  #           2. Order the catalog items
  #           3. Go to My services
  #           4. Retire the both services
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Services should retire and vms as well
  #   
  services,vms = services_vms_list
  view = navigate_to(services[0], "All")
  view.entities.get_all(services[0].name).map{|entity| entity.check()}
  view.toolbar.lifecycle.item_select("Retire selected items", handle_alert: true)
  wait_for(lambda{|| services.map{|service| service.rest_api_entity.retired}.is_all?}, delay: 5, timeout: 600)
  raise unless vms.map{|vm| vm.retired}.is_all?
end
def test_load_multiple_services(appliance, generic_service)
  # 
  #   Bugzilla:
  #       1718102
  #       1718898
  #       1741327
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/6h
  #       startsin: 5.10
  #       testSteps:
  #           1. Create catalog and catalog item
  #           2. Order the catalog items
  #           3. create 999 services from rails \"999.times {Service.first.dup.save}\"
  #           4. Go to My services
  #           5. Refresh the page and load the 1000 services
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5. The page should load in less than 10 seconds
  #   
  service,_ = generic_service
  values = appliance.ssh_client.run_rails_console("999.times {Service.first.dup.save}")
  raise unless values.success
  view = navigate_to(service, "All")
  view.toolbar.view_selector.select("List View")
  view.entities.paginator.set_items_per_page(1000)
  view.browser.refresh()
  raise unless wait_for(lambda{|| view.is_displayed}, timeout: 10)
  remove = appliance.ssh_client.run_rails_console("999.times {Service.first.destroy}")
  raise unless remove.success
end
def test_load_service_with_button(request, appliance, generic_service, import_dialog, import_datastore, import_data)
  # 
  #   Bugzilla:
  #       1737559
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/6h
  #       startsin: 5.10
  #       testSteps:
  #           1. Import Datastore and dialog
  #           2. Create button with above dialog
  #           3. Create catalog item
  #           4. Order the service
  #           5. Go to My services
  #           6. Click on created service
  #           7. load the service with a button
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5.
  #           6.
  #           7. Service should load without an error in log
  #   
  service,_ = generic_service
  sd,ele_label = import_dialog
  collection = appliance.collections.button_groups
  button_gp = collection.create(text: fauxfactory.gen_alphanumeric(start: "grp_"), hover: fauxfactory.gen_alphanumeric(15, start: "grp_hvr_"), type: collection.getattr("SERVICE"))
  request.addfinalizer(button_gp.delete_if_exists)
  button = button_gp.buttons.create(text: fauxfactory.gen_alphanumeric(start: "btn_"), hover: fauxfactory.gen_alphanumeric(15, start: "btn_hvr_"), dialog: sd.label, system: "Request", request: "InspectMe")
  request.addfinalizer(button.delete_if_exists)
  view = navigate_to(service, "Details")
  (LogValidator("/var/www/miq/vmdb/log/automation.log", failure_patterns: [".*ERROR.*"])).waiting(timeout: 60) {
    custom_button_group = Dropdown(view, button_gp.text)
    raise unless custom_button_group.is_displayed
    custom_button_group.item_select(button.text)
  }
end
def test_retire_service_bundle_and_vms(appliance, provider, catalog_item, request)
  # 
  #   Bugzilla:
  #       1660637
  # 
  #   Polarion:
  #       assignee: nansari
  #       startsin: 5.10
  #       casecomponent: Services
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. Create service catalog item
  #           2. Create bundle with above catalog item
  #           3. Order the Service bundle
  #           4. Navigate to my service
  #           5. Retire the service
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5. the service should be retired and VM should be retired and archived
  #   
  collection = provider.appliance.provider_based_collection(provider)
  vm_name = "{}0001".format(catalog_item.prov_data["catalog"]["vm_name"])
  vm = collection.instantiate(, provider)
  bundle_name = fauxfactory.gen_alphanumeric(12, start: "bundle_")
  catalog_bundle = appliance.collections.catalog_bundles.create(bundle_name, description: "catalog_bundle", display_in: true, catalog: catalog_item.catalog, dialog: catalog_item.dialog, catalog_items: [catalog_item.name])
  request.addfinalizer(catalog_bundle.delete_if_exists)
  service_catalogs = ServiceCatalogs(appliance, catalog_bundle.catalog, catalog_bundle.name)
  service_catalogs.order()
  request_description = 
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  provision_request.is_succeeded(method: "ui")
  service = MyService(appliance, catalog_item.dialog.label)
  _clear_request_service = lambda do
    if is_bool(provision_request.exists())
      provision_request.remove_request(method: "rest")
    end
    if is_bool(service.exists)
      service.delete()
    end
  end
  raise unless service.exists
  retire_request = service.retire()
  raise unless retire_request.exists()
  _clear_retire_request = lambda do
    if is_bool(retire_request.exists())
      retire_request.remove_request()
    end
  end
  wait_for(lambda{|| service.is_retired}, delay: 5, num_sec: 120, fail_func: service.browser.refresh, message: "waiting for service retire")
  raise unless vm.wait_for_vm_state_change(from_any_provider: true, desired_state: "archived")
end
