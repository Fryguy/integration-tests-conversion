require_relative 'riggerlib'
include Riggerlib
require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/fixtures/service_fixtures'
include Cfme::Fixtures::Service_fixtures
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [test_requirements.quota, pytest.mark.long_running, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([AzureProvider], scope: "function", required_fields: [["provisioning", "image"]])]
def prov_data(appliance, provisioning)
  # Keeping it as a fixture because we need to call 'provisioning' from this fixture as well as
  #      using this same fixture in various tests.
  #   
  instance_type = (appliance.version < "5.10") ? "d2s_v3" : "d2s_v3".capitalize()
  return {"catalog" => {"vm_name" => random_vm_name(context: "quota")}, "environment" => {"automatic_placement" => true}, "properties" => {"instance_type" => partial_match(instance_type)}, "customize" => {"admin_username" => provisioning["customize_username"], "root_password" => provisioning["customize_password"]}}
end
def set_child_tenant_quota(request, appliance, new_child)
  # This fixture assigns quota to child tenant
  field,value = request.param
  new_child.set_quota(None: {"#{field}_cb" => true, "field" => value})
  yield
  appliance.server.login_admin()
  new_child.set_quota(None: {"#{field}_cb" => false})
end
def set_project_quota(request, appliance, new_project)
  # This fixture assigns quota to project
  field,value = request.param
  new_project.set_quota(None: {"#{field}_cb" => true, "field" => value})
  yield
  appliance.server.login_admin()
  new_project.set_quota(None: {"#{field}_cb" => false})
end
def new_tenant(appliance)
  # This fixture creates new tenant under root tenant(My Company)
  collection = appliance.collections.tenants
  tenant = collection.create(name: fauxfactory.gen_alphanumeric(12, start: "tenant_"), description: fauxfactory.gen_alphanumeric(15, start: "tenant_des_"), parent: collection.get_root_tenant())
  yield(tenant)
  if is_bool(tenant.exists)
    tenant.delete()
  end
end
def new_child(appliance, new_tenant)
  # The fixture creates new child tenant
  child_tenant = appliance.collections.tenants.create(name: fauxfactory.gen_alphanumeric(12, start: "tenant_"), description: fauxfactory.gen_alphanumeric(15, start: "tenant_des_"), parent: new_tenant)
  yield(child_tenant)
  if is_bool(child_tenant.exists)
    child_tenant.delete()
  end
end
def new_group_child(appliance, new_child, new_tenant)
  # This fixture creates new group assigned by new child tenant
  group = appliance.collections.groups.create(description: fauxfactory.gen_alphanumeric(start: "group_"), role: "EvmRole-super_administrator", tenant: "My Company/#{new_tenant.name}/#{new_child.name}")
  yield(group)
  if is_bool(group.exists)
    group.delete()
  end
end
def new_user_child(appliance, new_group_child)
  # This fixture creates new user which assigned to new child tenant
  user = appliance.collections.users.create(name: fauxfactory.gen_alphanumeric(start: "user_").downcase(), credential: Credential(principal: fauxfactory.gen_alphanumeric(start: "uid"), secret: fauxfactory.gen_alphanumeric(start: "pwd_")), email: fauxfactory.gen_email(), groups: new_group_child, cost_center: "Workload", value_assign: "Database")
  yield(user)
  if is_bool(user.exists)
    user.delete()
  end
end
def new_project(appliance)
  # This fixture creates new project
  collection = appliance.collections.projects
  project = collection.create(name: fauxfactory.gen_alphanumeric(12, start: "project_"), description: fauxfactory.gen_alphanumeric(15, start: "project_desc"), parent: collection.get_root_tenant())
  yield(project)
  if is_bool(project.exists)
    project.delete()
  end
end
def new_group_project(appliance, new_project)
  # This fixture creates new group and assigned by new project
  group = appliance.collections.groups.create(description: fauxfactory.gen_alphanumeric(start: "group_"), role: "EvmRole-super_administrator", tenant: "My Company/#{new_project.name}")
  yield(group)
  if is_bool(group.exists)
    group.delete()
  end
end
def new_user_project(appliance, new_group_project)
  # This fixture creates new user which is assigned to new group and project
  user = appliance.collections.users.create(name: fauxfactory.gen_alphanumeric(start: "user_").downcase(), credential: Credential(principal: fauxfactory.gen_alphanumeric(start: "uid"), secret: fauxfactory.gen_alphanumeric(start: "pwd")), email: fauxfactory.gen_email(), groups: new_group_project, cost_center: "Workload", value_assign: "Database")
  yield(user)
  if is_bool(user.exists)
    user.delete()
  end
end
def test_child_tenant_quota_enforce_via_lifecycle_cloud(request, appliance, provider, new_user_child, set_child_tenant_quota, extra_msg, approve, custom_prov_data, prov_data, provisioning)
  # Test Child Quota in UI
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #       tags: quota
  #       testSteps:
  #           1. Create a child tenant
  #           2. Assign quota to child tenant
  #           3. Provision instance over the assigned child's quota
  #           4. Check whether quota is exceeded or not
  #   
  new_user_child {
    recursive_update(prov_data, custom_prov_data)
    recursive_update(prov_data, {"request" => {"email" => fauxfactory.gen_email(), "first_name" => fauxfactory.gen_alphanumeric(start: "first_"), "last_name" => fauxfactory.gen_alphanumeric(start: "last_"), "manager_name" => fauxfactory.gen_alphanumeric(start: "manager_")}})
    prov_data.update({"template_name" => provisioning["image"]["name"]})
    request_description = "Provision from [{template}] to [{vm}{msg}]".format(template: provisioning["image"]["name"], vm: prov_data["catalog"]["vm_name"], msg: extra_msg)
    appliance.collections.cloud_instances.create(prov_data["catalog"]["vm_name"], provider, prov_data, auto_approve: approve, override: true, request_description: request_description)
    provision_request = appliance.collections.requests.instantiate(request_description)
    provision_request.wait_for_request(method: "ui")
    request.addfinalizer(provision_request.remove_request)
    raise unless provision_request.row.reason.text == "Quota Exceeded"
  }
end
def test_project_quota_enforce_via_lifecycle_cloud(request, appliance, provider, new_user_project, set_project_quota, extra_msg, approve, custom_prov_data, prov_data, provisioning)
  # Test Project Quota in UI
  # 
  #   Polarion:
  #       assignee: ghubale
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #       tags: quota
  #       testSteps:
  #           1. Create a project
  #           2. Assign quota to project
  #           3. Provision instance over the assigned project's quota
  #           4. Check whether quota is exceeded or not
  #   
  new_user_project {
    recursive_update(prov_data, custom_prov_data)
    recursive_update(prov_data, {"request" => {"email" => fauxfactory.gen_email(), "first_name" => fauxfactory.gen_alphanumeric(start: "first_"), "last_name" => fauxfactory.gen_alphanumeric(start: "last_"), "manager_name" => fauxfactory.gen_alphanumeric(start: "manager_")}})
    prov_data.update({"template_name" => provisioning["image"]["name"]})
    request_description = "Provision from [{template}] to [{vm}{msg}]".format(template: provisioning["image"]["name"], vm: prov_data["catalog"]["vm_name"], msg: extra_msg)
    appliance.collections.cloud_instances.create(prov_data["catalog"]["vm_name"], provider, prov_data, auto_approve: approve, override: true, request_description: request_description)
    provision_request = appliance.collections.requests.instantiate(request_description)
    provision_request.wait_for_request(method: "ui")
    request.addfinalizer(provision_request.remove_request)
    raise unless provision_request.row.reason.text == "Quota Exceeded"
  }
end
def admin_email(appliance)
  # Required for user quota tagging services to work, as it's mandatory for it's functioning.
  user = appliance.collections.users
  admin = user.instantiate(name: "Administrator")
  update(admin) {
    admin.email = fauxfactory.gen_email()
  }
  yield
  update(admin) {
    admin.email = ""
  }
end
def automate_flavor_method(appliance, klass, namespace)
  # This fixture used to create automate method using following script
  script = "
                FLAVOR_CLASS = \'Flavor\'.freeze

                begin

                    values_hash = {}

                    cloud_flavors = $evm.vmdb(FLAVOR_CLASS).all

                $evm.log(\"info\", \"Listing Root Object Attributes:\")

                $evm.root.attributes.sort.each { |k, v| $evm.log(\"info\", \"\t#{k}: #{v}\") }

                $evm.log(\"info\", \"===========================================\")

                    unless cloud_flavors.empty?

                        cloud_flavors.each do |flavor|

                            values_hash[flavor.id] = flavor.name

                    end

                end

                list_values = {

                    \'sort_by\'    => :value,

                    \'data_type\'  => :string,

                    \'required\'   => true,

                    \'values\'     => values_hash

                }

                list_values.each { |key, value| $evm.object[key] = value }

                rescue => err

                  $evm.log(:error, \"[#{err}]
#{err.backtrace.join(\"
\")}\")

                  exit MIQ_STOP

                end

    "
  schema_field = fauxfactory.gen_alphanumeric()
  klass.schema.add_fields({"name" => schema_field, "type" => "Method", "data_type" => "String"})
  method = klass.methods.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), location: "inline", script: script)
  instance = klass.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), fields: {"schema_field" => {"value" => method.name}})
  yield(instance)
  instance.delete()
  method.delete()
end
def set_roottenant_quota(request, appliance)
  field,value = request.param
  roottenant = appliance.collections.tenants.get_root_tenant()
  roottenant.set_quota(None: {"#{field}_cb" => true, "field" => value})
  yield
  roottenant.set_quota(None: {"#{field}_cb" => false})
end
def dialog(appliance, automate_flavor_method)
  # This fixture is used to create dynamic service dialog
  data = {"buttons" => "submit,cancel", "label" => fauxfactory.gen_alphanumeric(20, start: "flavour_dialog_"), "dialog_tabs" => [{"display" => "edit", "label" => "New Tab", "position" => 0, "dialog_groups" => [{"display" => "edit", "label" => "New section", "position" => 0, "dialog_fields" => [{"name" => "option_0_instance_type", "description" => "flavor_dialog", "data_type" => "string", "display" => "edit", "display_method_options" => {}, "required_method_options" => {}, "default_value" => "", "values_method_options" => {}, "required" => true, "label" => "instance_type", "dynamic" => true, "show_refresh_button" => true, "load_values_on_init" => true, "read_only" => false, "auto_refresh" => false, "visible" => true, "type" => "DialogFieldDropDownList", "resource_action" => {"resource_type" => "DialogField", "ae_namespace" => automate_flavor_method.namespace.name, "ae_class" => automate_flavor_method.klass.name, "ae_instance" => automate_flavor_method.name}}]}]}]}
  dialog_rest = appliance.rest_api.collections.service_dialogs.action.create(None: data)[0]
  yield(appliance.collections.service_dialogs.instantiate(label: dialog_rest.label))
  dialog_rest.action.delete()
end
def get_quota_message(request, appliance, catalog, catalog_item_name, dialog_values: nil)
  # Returns the quota requested by particular type of flavor type
  service_catalogs = ServiceCatalogs(appliance, catalog, catalog_item_name, dialog_values)
  service_catalogs.order()
  request_description = "Provisioning Service [{0}] from [{0}]".format(catalog_item_name)
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(provision_request.remove_request)
  raise unless provision_request.row.reason.text == "Quota Exceeded"
  last_message = provision_request.row.last_message.text
  result = re.findall("requested.*\\w", last_message)
  delete_request = appliance.rest_api.collections.service_requests.get(description: request_description)
  delete_request.action.delete()
  return result
end
def test_custom_service_dialog_quota_flavors(request, provider, provisioning, dialog, catalog, appliance, admin_email, set_roottenant_quota)
  # Test quota with instance/flavor type in custom dialog
  # 
  #   Polarion:
  #       assignee: ghubale
  #       initialEstimate: 1/4h
  #       startsin: 5.8
  #       casecomponent: Quota
  # 
  #   Bugzilla:
  #       1499193
  #       1581288
  #       1657628
  #   
  catalog_item = create_catalog_item(appliance, provider, provisioning, dialog, catalog)
  request.addfinalizer(catalog_item.delete_if_exists)
  result = []
  flavors = random.sample(appliance.rest_api.collections.flavors.all, 2)
  for flavor in flavors
    flavor_type = {"option_0_instance_type" => flavor.name}
    requested_storage = get_quota_message(request: request, appliance: appliance, catalog: catalog_item.catalog, catalog_item_name: catalog_item.name, dialog_values: flavor_type)
    result.push(requested_storage)
  end
  raise unless result[0] != result[1]
end
