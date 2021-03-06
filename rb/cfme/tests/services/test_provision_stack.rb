require_relative 'wait_for'
include Wait_for
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/services/myservice'
include Cfme::Services::Myservice
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/datafile'
include Cfme::Utils::Datafile
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/path'
include Cfme::Utils::Path
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
filter_kwargs = {"required_fields" => [["provisioning", "stack_provisioning"]]}
cloud_filter = ProviderFilter(classes: [CloudProvider], None: filter_kwargs)
not_ec2 = ProviderFilter(classes: [EC2Provider], inverted: true)
pytestmark = [pytest.mark.meta(server_roles: "+automate"), pytest.mark.ignore_stream("upstream"), test_requirements.stack, pytest.mark.tier(2), pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider(gen_func: providers, filters: [cloud_filter], selector: ONE_PER_TYPE, scope: "module")]
def stack_data(appliance, provider, provisioning, request)
  random_base = fauxfactory.gen_alphanumeric()
  stackname = "test#{random_base}"
  vm_name = "test-#{random_base}"
  stack_timeout = "20"
  if is_bool(provider.one_of(AzureProvider))
    begin
      template = provider.data.templates.small_template
      vm_user = credentials[template.creds].username
      vm_password = credentials[template.creds].password
    rescue NoMethodError
      pytest.skip("Could not find small_template or credentials for #{provider.name}")
    end
    stack_data = {"stack_name" => stackname, "resource_group" => provisioning.get("resource_group"), "deploy_mode" => provisioning.get("mode"), "location" => provisioning.get("region_api"), "vmname" => vm_name, "vmuser" => vm_user, "vmpassword" => vm_password, "vmsize" => provisioning.get("vm_size"), "cloudnetwork" => provisioning.get("cloud_network").split()[0], "cloudsubnet" => provisioning.get("cloud_subnet").split()[0]}
    if request.node.name.include?("test_error_message_azure")
      stack_data["vmpassword"] = "test"
    end
  else
    if is_bool(provider.one_of(OpenStackProvider))
      stack_prov = provisioning["stack_provisioning"]
      stack_data = {"stack_name" => stackname, "key" => stack_prov["key_name"], "flavor" => stack_prov["instance_type"], "tenant_name" => provisioning["cloud_tenant"], "private_network" => provisioning["cloud_network"]}
    else
      stack_prov = provisioning["stack_provisioning"]
      stack_data = {"stack_name" => stackname, "stack_timeout" => stack_timeout, "param_virtualMachineName" => vm_name, "param_KeyName" => stack_prov["key_name"]}
    end
  end
  return stack_data
end
def dialog_name()
  return fauxfactory.gen_alphanumeric(12, start: "dialog_")
end
def template(appliance, provider, provisioning, dialog_name)
  template_group = provisioning["stack_provisioning"]["template_type"]
  template_type = provisioning["stack_provisioning"]["template_type_dd"]
  template_name = fauxfactory.gen_alphanumeric(start: "temp_")
  file = provisioning["stack_provisioning"]["data_file"]
  data_file = load_data_file(file.orchestration_path.join.to_s)
  content = data_file.read().gsub("CFMETemplateName", template_name)
  collection = appliance.collections.orchestration_templates
  template = collection.create(template_group: template_group, template_name: template_name, template_type: template_type, description: "my template", content: content)
  template.create_service_dialog_from_template(dialog_name)
  yield(template)
  if is_bool(template.exists)
    template.delete()
  end
end
def catalog(appliance)
  cat_name = fauxfactory.gen_alphanumeric(start: "cat_")
  catalog = appliance.collections.catalogs.create(name: cat_name, description: "my catalog")
  yield(catalog)
  if is_bool(catalog.exists)
    catalog.delete()
  end
end
def catalog_item(appliance, dialog, catalog, template, provider, dialog_name)
  item_name = fauxfactory.gen_alphanumeric(15, start: "cat_item_")
  catalog_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.ORCHESTRATION, name: item_name, description: "my catalog", display_in: true, catalog: catalog, dialog: dialog_name, orch_template: template, provider_name: provider.name)
  yield(catalog_item)
  if is_bool(catalog_item.exists)
    catalog_item.delete()
  end
end
def service_catalogs(appliance, catalog_item, stack_data)
  return ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name, stack_data)
end
def stack_created(appliance, provider, order_stack, stack_data)
  provision_request = order_stack
  provision_request.wait_for_request(method: "ui")
  raise unless provision_request.is_succeeded()
  stack = appliance.collections.cloud_stacks.instantiate(stack_data["stack_name"], provider: provider)
  stack.wait_for_exists()
  yield(stack)
end
def order_stack(appliance, provider, stack_data, service_catalogs)
  # Fixture which prepares provisioned stack
  provision_request = service_catalogs.order()
  stack = appliance.collections.cloud_stacks.instantiate(stack_data["stack_name"], provider: provider)
  yield(provision_request)
  prov_req_cleanup(appliance, provision_request)
  if is_bool(stack.delete_if_exists())
    stack.wait_for_not_exists()
  end
end
def guess_svc_name(provision_request)
  matchpairs = [["description", "\\[EVM\\] Service \\[([\\w-]+)\\].*"], ["message", "\\[EVM\\] Service \\[([\\w-]+)\\].*"], ["message", "Server \\[EVM\\] Service \\[([\\w-]+)\\].*"]]
  for (attr, pattern) in matchpairs
    text = provision_request.getattr(attr)
    match = re.match(pattern, text)
    if is_bool(match)
      return match.group(1)
    end
  end
  return nil
end
def prov_req_cleanup(appliance, provision_request)
  provision_request.update()
  svc_name = Wait_for::wait_for(func: guess_svc_name, func_args: [provision_request], fail_func: provision_request.update, fail_condition: nil, timeout: "5m").out
  myservice = MyService(appliance, name: svc_name)
  svc_cleanup(myservice)
end
def svc_cleanup(service)
  service.retire()
  service.delete()
end
def test_provision_stack(order_stack, stack_created)
  # Tests stack provisioning
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/3h
  #       casecomponent: Provisioning
  #   
  provision_request = order_stack
  raise unless provision_request.is_succeeded()
  raise unless stack_created.exists
end
def test_reconfigure_service(appliance, service_catalogs, request)
  # Tests service reconfiguring
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: stack
  #   
  provision_request = service_catalogs.order()
  provision_request.wait_for_request(method: "ui")
  last_message = provision_request.get_request_row_from_ui()["Last Message"].text
  service_name = last_message.split()[2].strip("[]")
  myservice = MyService(appliance, service_name)
  request.addfinalizer(lambda{|| svc_cleanup(myservice)})
  raise unless provision_request.is_succeeded()
  myservice.reconfigure_service()
end
def test_remove_non_read_only_orch_template(appliance, provider, template, service_catalogs, request)
  # 
  #   Steps:
  #   1. Order Service which uses Orchestration template
  #   2. Try to remove this Orchestration template
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: stack
  #   
  provision_request = service_catalogs.order()
  request.addfinalizer(lambda{|| prov_req_cleanup(appliance, provision_request)})
  template.delete()
  Wait_for::wait_for(lambda{|| provision_request.status == "Error"}, timeout: "5m")
  raise unless !template.exists
end
def test_remove_read_only_orch_template_neg(appliance, provider, template, order_stack, request)
  # 
  #   For RHOS/Azure the original template will remain stand-alone while the stack links
  #   to a new template read from the RHOS/Azure provider. Hence we can delete used orchestration
  #   template for RHOS/Azure.
  # 
  #   Steps:
  #   1. Order Service which uses Orchestration template
  #   2. Try to remove this Orchestration template
  #   3. Check if remove item is disabled.
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: stack
  #   
  view = navigate_to(template, "Details")
  msg = "Remove this Orchestration Template from Inventory"
  Wait_for::wait_for(func: view.toolbar.configuration.item_enabled, func_args: [msg], fail_condition: true, fail_func: view.browser.refresh, timeout: "1m")
  if is_bool(provider.one_of(OpenStackProvider, AzureProvider))
    Wait_for::wait_for(func: view.toolbar.configuration.item_enabled, func_args: [msg], fail_condition: false, fail_func: view.browser.refresh, timeout: "3m")
  end
  order_stack.wait_for_request()
  raise unless order_stack.is_succeeded()
end
def test_retire_stack(stack_created)
  # Tests stack retirement.
  # 
  #   Steps:
  #   1. Retire Orchestration stack
  #   2. Verify it doesn't exist in UI
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: stack
  #   
  stack_created.retire_stack()
  raise "Stack still visible in UI" unless !stack_created.exists
end
def test_error_message_azure(order_stack)
  # 
  #   Starting with 5.8, error messages generated by azure when provisioning
  #   from orchestration template will be included in the Last Message
  #   field.  Users will no longer have to drill down to Stack/Resources to
  #   figure out the error.
  #   This is currently working correctly as of 5.8.0.12
  # 
  #   Bugzilla:
  #       1410794
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       setup: Easiest way to do this is provision an azure vm from orchestration
  #              catalog item and just add a short password like \"test\".  This will
  #              fail on the azure side and the error will be displayed in the request
  #              details.
  #       startsin: 5.8
  #   
  msg = "Orchestration stack deployment error: The supplied password must be"
  (LogValidator("/var/www/miq/vmdb/log/evm.log", matched_patterns: [msg])).waiting(timeout: 450) {
    provision_request = order_stack
    provision_request.wait_for_request(method: "ui")
    raise unless !provision_request.is_succeeded()
  }
end
def test_stack_template_azure()
  # 
  #   There was a new field added to Orchestration stacks to show which
  #   image was used to create it.  You need to verify the end points of
  #   this image are displayed correctly.
  #   This just needs to be checked every once in a while.  Perhaps once per
  #   build.  Should be able to automate it by comparing the yaml entries to
  #   the value.
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: low
  #       initialEstimate: 1/8h
  #       setup: Create a stack based on a cloud image.  Go to stack details and check
  #              the
  #       upstream: yes
  #   
  # pass
end
def test_retire_catalog_bundle_service_orchestration_item(appliance, request, catalog_item, stack_data)
  # 
  #   Bugzilla:
  #       1684092
  #   Polarion:
  #       assignee: nansari
  #       startsin: 5.10
  #       casecomponent: Services
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. Add ec2 provider
  #           2. Provisioned the catalog bundle with ServiceOrchestration item
  #           3. Navigate to My service page
  #           4. Retired the bundle
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Catalog bundle should retire with no error
  #   
  bundle_name = fauxfactory.gen_alphanumeric(15, start: "cat_bundle_")
  catalog_bundle = appliance.collections.catalog_bundles.create(bundle_name, description: "catalog_bundle", display_in: true, catalog: catalog_item.catalog, dialog: catalog_item.dialog, catalog_items: [catalog_item.name])
  request.addfinalizer(catalog_bundle.delete_if_exists)
  service_catalogs = ServiceCatalogs(appliance, catalog_bundle.catalog, catalog_bundle.name, stack_data)
  provision_request = service_catalogs.order()
  provision_request.wait_for_request(method: "ui")
  provision_request.is_succeeded(method: "ui")
  last_message = provision_request.get_request_row_from_ui()["Last Message"].text
  service_name = last_message.split()[2].strip("[]")
  service = MyService(appliance, service_name)
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
  _clear_retire_request = lambda do
    if is_bool(retire_request.exists())
      retire_request.remove_request()
    end
  end
  Wait_for::wait_for(lambda{|| service.is_retired}, delay: 5, num_sec: 120, fail_func: service.browser.refresh, message: "waiting for service retire")
end
def test_read_dialog_timeout_ec2_stack(order_stack)
  # 
  #   Bugzilla:
  #       1698439
  #   Polarion:
  #       assignee: nansari
  #       startsin: 5.10
  #       casecomponent: Services
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. create an aws template with an optional value \"timeout\"
  #           2. create a dialog that will offer an option to overwrite \"timeout\"
  #              with a custom value typed at input
  #           3. Navigate to order page of service
  #           4. provision using a non-zero value in timeout
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. the value input should be passed
  #   
  msg = "<AEMethod groupsequencecheck>.*dialog_stack_timeout: 20"
  (LogValidator("/var/www/miq/vmdb/log/evm.log", matched_patterns: [msg])).waiting(timeout: 450) {
    provision_request = order_stack
    provision_request.wait_for_request(method: "ui")
    provision_request.is_succeeded()
  }
end
