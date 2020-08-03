require_relative 'manageiq_client/api'
include Manageiq_client::Api
require_relative 'manageiq_client/api'
include Manageiq_client::Api
alias MiqApi ManageIQClient
require_relative 'manageiq_client/filters'
include Manageiq_client::Filters
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _dialog dialog
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _dialog_rest dialog_rest
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _orchestration_templates orchestration_templates
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _service_catalog_obj service_catalog_obj
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _service_catalogs service_catalogs
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _service_templates service_templates
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _services services
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _vm vm
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.long_running, test_requirements.service, pytest.mark.tier(2), pytest.mark.provider(classes: [InfraProvider], required_fields: [["provisioning", "template"], ["provisioning", "host"], ["provisioning", "datastore"], ["provisioning", "vlan"]], selector: ONE), pytest.mark.usefixtures("setup_provider")]
NUM_BUNDLE_ITEMS = 4
def wait_for_vm_power_state(vm, resulting_state)
  wait_for(lambda{|| vm.power_state == resulting_state}, num_sec: 1200, delay: 45, fail_func: vm.reload, message: "Wait for VM to {} (current state: {})".format(resulting_state, vm.power_state))
end
def wait_for_retired(entity, num_sec: 1000)
  is_retired = lambda do |entity|
    if is_bool(!entity.collection.find_by(id: entity.id))
      return true
    end
    begin
      entity.reload()
      return entity.retirement_state == "retired"
    rescue Exception
      # pass
    end
    return false
  end
  retval = wait_for(lambda{|| is_retired.call(entity)}, num_sec: num_sec, delay: 10, silent_failure: true)
  if is_bool(!retval)
    raise unless entity.getattr("retirement_state", nil) == "retiring"
  end
end
def service_body(**kwargs)
  uid = fauxfactory.gen_alphanumeric(5)
  body = {"name" => , "description" => }
  body.update(kwargs)
  return body
end
def dialog(request, appliance)
  return _dialog(request, appliance)
end
def service_dialogs(request, appliance, num: 3)
  service_dialogs = num.times.map{|__| _dialog_rest(request, appliance)}
  return service_dialogs
end
def service_catalogs(request, appliance)
  response = _service_catalogs(request, appliance)
  assert_response(appliance)
  return response
end
def catalog_bundle(request, dialog, service_catalog_obj, appliance, provider)
  catalog_items = service_templates_ui(request, appliance, service_dialog: dialog, service_catalog: service_catalog_obj, provider: provider, num: NUM_BUNDLE_ITEMS)
  uid = fauxfactory.gen_alphanumeric()
  bundle_name = 
  bundle = appliance.collections.catalog_bundles.create(bundle_name, description: , display_in: true, catalog: service_catalog_obj, dialog: dialog, catalog_items: catalog_items.map{|item| item.name})
  catalog_rest = appliance.rest_api.collections.service_catalogs.get(name: service_catalog_obj.name)
  bundle_rest = catalog_rest.service_templates.get(name: bundle_name)
  yield bundle_rest
  if is_bool(bundle.exists)
    bundle.delete()
  end
end
def service_catalog_obj(request, appliance)
  return _service_catalog_obj(request, appliance)
end
def services(request, appliance, num: 3)
  bodies = num.times.map{|_| service_body()}
  collection = appliance.rest_api.collections.services
  new_services = collection.action.create(*bodies)
  assert_response(appliance)
  _finished = lambda do
    collection.reload()
    ids = new_services.map{|service| service.id}
    delete_entities = collection.select{|service| ids.include?(service.id)}.map{|service| service}
    if is_bool(delete_entities)
      collection.action.delete(*delete_entities)
    end
  end
  return new_services
end
def service_templates(request, appliance)
  response = _service_templates(request, appliance)
  assert_response(appliance)
  return response
end
def vm_service(request, appliance, provider)
  return _services(request, appliance, provider).pop()
end
def vm(request, provider, appliance)
  return _vm(request, provider, appliance)
end
def delete_carts(appliance)
  # Makes sure there are no carts present before running the tests.
  carts = appliance.rest_api.collections.service_orders.find_by(state: "cart")
  if is_bool(!carts)
    return
  end
  carts = carts.to_a
  cart_hrefs = carts.map{|c| c._ref_repr()}
  appliance.rest_api.collections.service_orders.action.delete(*cart_hrefs)
  assert_response(appliance)
  for cart in carts
    cart.wait_not_exists()
  end
end
def cart(appliance, delete_carts)
  cart = appliance.rest_api.collections.service_orders.action.create(name: "cart")
  assert_response(appliance)
  cart = cart[0]
  yield cart
  if is_bool(cart.exists)
    cart.action.delete()
  end
end
def deny_service_ordering(appliance)
  # 
  #   `allow_api_service_ordering` is set to True by default, which allows ordering services
  #   via API. This fixture sets that value to False, so services cannot be ordered via API.
  #   
  reset_setting = appliance.advanced_settings["product"]["allow_api_service_ordering"]
  appliance.update_advanced_settings({"product" => {"allow_api_service_ordering" => false}})
  raise unless !appliance.advanced_settings["product"]["allow_api_service_ordering"]
  yield
  appliance.update_advanced_settings({"product" => {"allow_api_service_ordering" => reset_setting}})
  raise unless appliance.advanced_settings["product"]["allow_api_service_ordering"] == reset_setting
end
def unassign_templates(templates)
  rest_api = templates[0].collection.api
  for template in templates
    template.reload()
    if is_bool(template.instance_variable_defined? :@service_template_catalog_id)
      scl_a = rest_api.collections.service_catalogs.get(id: template.service_template_catalog_id)
      scl_a.service_templates.action.unassign(template)
      template.reload()
    end
  end
end
class TestServiceRESTAPI
  def test_query_service_attributes(services, soft_assert)
    # Tests access to service attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/30h
    #         tags: service
    #     
    outcome = query_resource_attributes(services[0])
    for failure in outcome.failed
      if is_bool(failure.name == "reconfigure_dialog" && BZ(1663972).blocks)
        next
      end
      soft_assert.(false, "{} \"{}\": status: {}, error: `{}`".format(failure.type, failure.name, failure.response.status_code, failure.error))
    end
  end
  def test_edit_service(appliance, services)
    # Tests editing a service.
    #     Prerequisities:
    #         * An appliance with ``/api`` available.
    #     Steps:
    #         * POST /api/services (method ``edit``) with the ``name``
    #         * Check if the service with ``new_name`` exists
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/3h
    #         tags: service
    #     
    for service in services
      new_name = fauxfactory.gen_alphanumeric()
      response = service.action.edit(name: new_name)
      assert_response(appliance)
      raise unless response.name == new_name
      service.reload()
      raise unless service.name == new_name
    end
  end
  def test_edit_multiple_services(appliance, services)
    # Tests editing multiple services at a time.
    #     Prerequisities:
    #         * An appliance with ``/api`` available.
    #     Steps:
    #         * POST /api/services (method ``edit``) with the list of dictionaries used to edit
    #         * Check if the services with ``new_name`` each exists
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/3h
    #         tags: service
    #     
    new_names = []
    services_data_edited = []
    for service in services
      new_name = fauxfactory.gen_alphanumeric()
      new_names.push(new_name)
      services_data_edited.push({"href" => service.href, "name" => new_name})
    end
    response = appliance.rest_api.collections.services.action.edit(*services_data_edited)
    assert_response(appliance)
    for (i, resource) in enumerate(response)
      raise unless resource.name == new_names[i]
      service = services[i]
      service.reload()
      raise unless service.name == new_names[i]
    end
  end
  def test_delete_service_post(services)
    # Tests deleting services from detail using POST method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Bugzilla:
    #         1414852
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_detail(services, method: "POST")
  end
  def test_delete_service_delete(services)
    # Tests deleting services from detail using DELETE method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_detail(services, method: "DELETE")
  end
  def test_delete_services(services)
    # Tests deleting services from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/3h
    #         tags: service
    #     
    delete_resources_from_collection(services)
  end
  def test_retire_service_now(appliance, vm_service, from_detail)
    # Test retiring a service now.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    collection = appliance.rest_api.collections.services
    vm = get_vms_in_service(vm_service).pop()
    if is_bool(from_detail)
      vm_service.action.request_retire()
      assert_response(appliance)
    else
      collection.action.request_retire(vm_service)
      assert_response(appliance)
    end
    wait_for_retired(vm_service)
    wait_for_retired(vm)
  end
  def test_retire_service_future(appliance, services, from_detail)
    # Test retiring a service in future.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/3h
    #         tags: service
    #     
    date = (datetime.datetime.now() + datetime.timedelta(days: 5)).strftime("%Y/%m/%d")
    future = {"date" => date, "warn" => "4"}
    if is_bool(from_detail)
      for service in services
        service.action.retire(None: future)
        assert_response(appliance)
      end
    else
      appliance.rest_api.collections.services.action.retire(*services, None: future)
      assert_response(appliance)
    end
    _finished = lambda do |service|
      service.reload()
      return service.instance_variable_defined? :@retires_on && service.instance_variable_defined? :@retirement_warn
    end
    for service in services
      wait_for(lambda{|| _finished.call(service)}, num_sec: 60, delay: 5)
    end
  end
  def test_service_retirement_methods(request, appliance, services, from_detail)
    # Test retiring a service with old method `retire` and new method `request_retire`.
    #     Old method is no longer supported and it puts the service into `intializing` state.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         initialEstimate: 1/4h
    # 
    #     Bugzilla:
    #         1698480
    #         1713477
    #     
    service = services[0]
    auto_log = LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*ERROR -- : <AEMethod start_retirement> Service retire task not found", ".*ERROR -- : <AEMethod start_retirement> The old style retirement is incompatible with the new retirement state machine.", ".*ERROR -- : State=<StartRetirement> running  raised exception: <Method exited with rc=MIQ_ABORT>", ".*ERROR -- : <AEMethod update_service_retirement_status> Service Retire Error:"])
    auto_log.start_monitoring()
    if is_bool(from_detail)
      service.action.retire()
    else
      appliance.rest_api.collections.services.action.retire(service)
    end
    assert_response(appliance)
    wait_for(lambda{|| service.instance_variable_defined? :@retirement_state}, fail_func: service.reload, num_sec: 50, delay: 5)
    raise unless auto_log.validate(wait: "180s")
    raise unless service.retirement_state == "initializing"
    if is_bool(from_detail)
      service.action.request_retire()
    else
      appliance.rest_api.collections.services.action.request_retire(service)
    end
    assert_response(appliance)
    wait_for_retired(service)
  end
  def test_set_service_owner(appliance, services)
    # Tests set_ownership action on /api/services/:id.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    user = appliance.rest_api.collections.users.get(userid: "admin")
    data = {"owner" => {"href" => user.href}}
    for service in services
      service.action.set_ownership(None: data)
      assert_response(appliance)
      service.reload()
      raise unless service.instance_variable_defined? :@evm_owner_id
      raise unless service.evm_owner_id == user.id
    end
  end
  def test_set_services_owner(appliance, services)
    # Tests set_ownership action on /api/services collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    user = appliance.rest_api.collections.users.get(userid: "admin")
    requests = services.map{|service| {"href" => service.href, "owner" => {"href" => user.href}}}
    appliance.rest_api.collections.services.action.set_ownership(*requests)
    assert_response(appliance)
    for service in services
      service.reload()
      raise unless service.instance_variable_defined? :@evm_owner_id
      raise unless service.evm_owner_id == user.id
    end
  end
  def test_power_service(appliance, vm_service, from_detail)
    # Tests power operations on /api/services and /api/services/:id.
    # 
    #     * start, stop and suspend actions
    #     * transition from one power state to another
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    collection = appliance.rest_api.collections.services
    vm = get_vms_in_service(vm_service).pop()
    _action_and_check = lambda do |action, resulting_state|
      if is_bool(from_detail)
        vm_service.action.getattr(action).()
      else
        collection.action.getattr(action).(method(:vm_service))
      end
      assert_response(appliance)
      wait_for_vm_power_state(method(:vm), resulting_state)
    end
    wait_for_vm_power_state(method(:vm), "on")
    _action_and_check.call("stop", "off")
    _action_and_check.call("start", "on")
    _action_and_check.call("suspend", "suspended")
    _action_and_check.call("start", "on")
  end
  def test_service_vm_subcollection(vm_service)
    # Tests /api/services/:id/vms.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    vm = get_vms_in_service(vm_service).pop()
    raise unless vm_service.vms[0].id == vm.id
  end
  def test_service_add_resource(request, appliance, vm)
    # Tests adding resource to service.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    service = services(request, appliance, num: 1).pop()
    rest_vm = appliance.rest_api.collections.vms.get(name: vm)
    raise unless !service.vms
    service.action.add_resource(resource: rest_vm._ref_repr())
    assert_response(appliance)
    raise unless service.vms.size == 1
  end
  def test_service_remove_resource(request, appliance, vm_service)
    # Tests removing resource from service.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    vm = get_vms_in_service(vm_service).pop()
    request.addfinalizer(vm.action.delete)
    vms_num = vm_service.vms.size
    raise unless vms_num >= 1
    vm_service.action.remove_resource(resource: vm._ref_repr())
    assert_response(appliance)
    raise unless vm_service.vms.size == vms_num - 1
  end
  def test_service_remove_all_resources(request, appliance, vm, vm_service)
    # Tests removing all resources from service.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    vm_assigned = get_vms_in_service(vm_service).pop()
    vm_added = appliance.rest_api.collections.vms.get(name: vm)
    _delete_vms = lambda do
      vm_assigned.action.delete()
      vm_added.action.delete()
    end
    vm_service.action.add_resource(resource: vm_added._ref_repr())
    raise unless vm_service.vms.size >= 2
    vm_service.action.remove_all_resources()
    assert_response(appliance)
    raise unless !vm_service.vms
  end
  def test_create_service_from_parent(request, appliance)
    # Tests creation of new service that reference existing service.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    collection = appliance.rest_api.collections.services
    service = collection.action.create(service_body())[0]
    request.addfinalizer(service.action.delete)
    bodies = []
    references = [{"id" => service.id}, {"href" => service.href}]
    for ref in references
      bodies.push(service_body(parent_service: ref))
    end
    response = collection.action.create(*bodies)
    assert_response(appliance)
    for ent in response
      raise unless ent.ancestry == service.id.to_s
    end
  end
  def test_delete_parent_service(appliance)
    # Tests that when parent service is deleted, child service is deleted automatically.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    collection = appliance.rest_api.collections.services
    grandparent = collection.action.create(service_body())[0]
    parent = collection.action.create(service_body(parent_service: {"id" => grandparent.id}))[0]
    child = collection.action.create(service_body(parent_service: {"id" => parent.id}))[0]
    raise unless parent.ancestry == grandparent.id.to_s
    raise unless child.ancestry == 
    grandparent.action.delete()
    assert_response(appliance)
    wait_for(lambda{|| !appliance.rest_api.collections.services.find_by(name: grandparent.name)}, num_sec: 600, delay: 10)
    for gen in [child, parent, grandparent]
      pytest.raises(Exception, match: "ActiveRecord::RecordNotFound") {
        gen.action.delete()
      }
    end
  end
  def test_add_service_parent(request, appliance)
    # Tests adding parent reference to already existing service.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    collection = appliance.rest_api.collections.services
    parent = collection.action.create(service_body())[0]
    request.addfinalizer(parent.action.delete)
    child = collection.action.create(service_body())[0]
    child.action.edit(parent_service: parent._ref_repr())
    assert_response(appliance)
    child.reload()
    raise unless child.ancestry == parent.id.to_s
  end
  def test_add_child_resource(request, appliance)
    # Tests adding parent reference to already existing service using add_resource.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    collection = appliance.rest_api.collections.services
    parent = collection.action.create(service_body())[0]
    request.addfinalizer(parent.action.delete)
    child = collection.action.create(service_body())[0]
    parent.action.add_resource(resource: child._ref_repr())
    assert_response(appliance)
    child.reload()
    raise unless child.ancestry == parent.id.to_s
  end
  def test_power_parent_service(request, appliance, vm_service)
    # Tests that power operations triggered on service parent affects child service.
    # 
    #     * start, stop and suspend actions
    #     * transition from one power state to another
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    collection = appliance.rest_api.collections.services
    service = collection.action.create(service_body())[0]
    request.addfinalizer(service.action.delete)
    child = vm_service
    vm = get_vms_in_service(child).pop()
    service.action.add_resource(resource: child._ref_repr())
    assert_response(appliance)
    _action_and_check = lambda do |action, resulting_state|
      service.action.getattr(action).()
      assert_response(appliance)
      wait_for_vm_power_state(method(:vm), resulting_state)
    end
    wait_for_vm_power_state(method(:vm), "on")
    _action_and_check.call("stop", "off")
    _action_and_check.call("start", "on")
    _action_and_check.call("suspend", "suspended")
    _action_and_check.call("start", "on")
  end
  def test_retire_parent_service_now(request, appliance)
    # Tests that child service is retired together with a parent service.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    collection = appliance.rest_api.collections.services
    parent = collection.action.create(service_body())[0]
    request.addfinalizer(parent.action.delete)
    child = collection.action.create(service_body())[0]
    parent.action.add_resource(resource: child._ref_repr())
    assert_response(appliance)
    parent.action.request_retire()
    assert_response(appliance)
    wait_for_retired(parent)
    wait_for_retired(child)
  end
end
class TestServiceDialogsRESTAPI
  def check_returned_dialog(appliance)
    returned = appliance.rest_api.response.json()
    if returned.include?("results")
      results = returned["results"]
    else
      results = [returned]
    end
    for result in results
      dialog_tabs, = result["dialog_tabs"]
      dialog_groups, = dialog_tabs["dialog_groups"]
      dialog_fields, = dialog_groups["dialog_fields"]
      raise unless dialog_fields["name"]
    end
  end
  def test_query_service_dialog_attributes(service_dialogs, soft_assert)
    # Tests access to service dialog attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(service_dialogs[0], soft_assert: soft_assert)
  end
  def test_check_dialog_returned_create(request, appliance)
    # Tests that the full dialog is returned as part of the API response on create.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    _dialog_rest(request, appliance)
    assert_response(appliance)
    check_returned_dialog(appliance)
  end
  def test_edit_service_dialogs(appliance, service_dialogs, from_detail)
    # Tests editing service dialog using the REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    new_descriptions = []
    if is_bool(from_detail)
      edited = []
      for dialog in service_dialogs
        new_description = fauxfactory.gen_alphanumeric(18, start: "Test Dialog ").downcase()
        new_descriptions.push(new_description)
        edited.push(dialog.action.edit(description: new_description))
        assert_response(appliance)
        check_returned_dialog(appliance)
      end
    else
      catalog_edited = []
      for dialog in service_dialogs
        new_description = fauxfactory.gen_alphanumeric(18, start: "Test Dialog ").downcase()
        new_descriptions.push(new_description)
        dialog.reload()
        catalog_edited.push({"href" => dialog.href, "description" => new_description})
      end
      edited = appliance.rest_api.collections.service_dialogs.action.edit(*catalog_edited)
      assert_response(appliance)
      check_returned_dialog(appliance)
    end
    raise unless edited.size == service_dialogs.size
    for (index, dialog) in enumerate(service_dialogs)
      record,__ = wait_for(lambda{|| appliance.rest_api.collections.service_dialogs.find_by(description: new_descriptions[index]) || false}, num_sec: 180, delay: 10)
      dialog.reload()
      raise unless dialog.description == edited[index].description
      raise unless dialog.description == record[0].description
      raise unless dialog.description == new_descriptions[index]
    end
  end
  def test_delete_service_dialog(service_dialogs, method)
    # Tests deleting service dialogs from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_detail(service_dialogs, method: method)
  end
  def test_delete_service_dialogs(service_dialogs)
    # Tests deleting service dialogs from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_collection(service_dialogs)
  end
end
class TestServiceTemplateRESTAPI
  def test_query_service_templates_attributes(service_templates, soft_assert)
    # Tests access to service template attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(service_templates[0], soft_assert: soft_assert)
  end
  def test_create_service_templates(appliance, service_templates)
    # Tests creation of service templates.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    for service_template in service_templates
      record = appliance.rest_api.collections.service_templates.get(id: service_template.id)
      raise unless record.name == service_template.name
      raise unless record.description == service_template.description
    end
  end
  def test_edit_service_template(appliance, service_templates)
    # Tests editing a service template.
    #     Prerequisities:
    #         * An appliance with ``/api`` available.
    #     Steps:
    #         * POST /api/service_templates (method ``edit``) with the ``name``
    #         * Check if the service_template with ``new_name`` exists
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    for service_template in service_templates
      new_name = fauxfactory.gen_alphanumeric()
      response = service_template.action.edit(name: new_name)
      assert_response(appliance)
      raise unless response.name == new_name
      service_template.reload()
      raise unless service_template.name == new_name
    end
  end
  def test_delete_service_templates(service_templates)
    # Tests deleting service templates from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_collection(service_templates)
  end
  def test_delete_service_template_post(service_templates)
    # Tests deleting service templates from detail using POST method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Bugzilla:
    #         1427338
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_detail(service_templates, method: "POST")
  end
  def test_delete_service_template_delete(service_templates)
    # Tests deleting service templates from detail using DELETE method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_detail(service_templates, method: "DELETE")
  end
  def test_assign_unassign_service_template_to_service_catalog(appliance, service_catalogs, service_templates)
    # Tests assigning and unassigning the service templates to service catalog.
    #     Prerequisities:
    #         * An appliance with ``/api`` available.
    #     Steps:
    #         * POST /api/service_catalogs/<id>/service_templates (method ``assign``)
    #             with the list of dictionaries service templates list
    #         * Check if the service_templates were assigned to the service catalog
    #         * POST /api/service_catalogs/<id>/service_templates (method ``unassign``)
    #             with the list of dictionaries service templates list
    #         * Check if the service_templates were unassigned to the service catalog
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    stpl = service_templates[0]
    scl = service_catalogs[0]
    unassign_templates([stpl])
    scl.service_templates.action.assign(stpl)
    assert_response(appliance)
    scl.reload()
    stpl.reload()
    raise unless scl.service_templates.all.map{|st| st.id}.include?(stpl.id)
    raise unless stpl.service_template_catalog_id == scl.id
    scl.service_templates.action.unassign(stpl)
    assert_response(appliance)
    scl.reload()
    raise unless !scl.service_templates.all.map{|st| st.id}.include?(stpl.id)
    stpl = appliance.rest_api.collections.service_templates.get(id: stpl.id)
    raise unless !stpl.instance_variable_defined? :@service_template_catalog_id
  end
  def test_edit_multiple_service_templates(appliance, service_templates)
    # Tests editing multiple service templates at time.
    # 
    #     Prerequisities:
    #         * An appliance with ``/api`` available.
    #     Steps:
    #         * POST /api/service_templates (method ``edit``)
    #             with the list of dictionaries used to edit
    #         * Check if the service_templates with ``new_name`` each exists
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    new_names = []
    service_tpls_data_edited = []
    for tpl in service_templates
      new_name = fauxfactory.gen_alphanumeric()
      new_names.push(new_name)
      service_tpls_data_edited.push({"href" => tpl.href, "name" => new_name})
    end
    response = appliance.rest_api.collections.service_templates.action.edit(*service_tpls_data_edited)
    assert_response(appliance)
    for (i, resource) in enumerate(response)
      raise unless resource.name == new_names[i]
      service_template = service_templates[i]
      service_template.reload()
      raise unless service_template.name == new_names[i]
    end
  end
end
class TestServiceCatalogsRESTAPI
  def test_query_service_catalog_attributes(service_catalogs, soft_assert)
    # Tests access to service catalog attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    outcome = query_resource_attributes(service_catalogs[0])
    for failure in outcome.failed
      soft_assert.(false, "{} \"{}\": status: {}, error: `{}`".format(failure.type, failure.name, failure.response.status_code, failure.error))
    end
  end
  def test_edit_catalogs(appliance, service_catalogs, from_detail)
    # Tests editing catalog items using the REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    new_descriptions = []
    if is_bool(from_detail)
      edited = []
      for catalog in service_catalogs
        new_description = fauxfactory.gen_alphanumeric(18, start: "Test Catalog ").downcase()
        new_descriptions.push(new_description)
        edited.push(catalog.action.edit(description: new_description))
        assert_response(appliance)
      end
    else
      catalog_edited = []
      for catalog in service_catalogs
        new_description = fauxfactory.gen_alphanumeric(18, start: "Test Catalog ").downcase()
        new_descriptions.push(new_description)
        catalog.reload()
        catalog_edited.push({"href" => catalog.href, "description" => new_description})
      end
      edited = appliance.rest_api.collections.service_catalogs.action.edit(*catalog_edited)
      assert_response(appliance)
    end
    raise unless edited.size == service_catalogs.size
    for (index, catalog) in enumerate(service_catalogs)
      record,__ = wait_for(lambda{|| appliance.rest_api.collections.service_catalogs.find_by(description: new_descriptions[index]) || false}, num_sec: 180, delay: 10)
      catalog.reload()
      raise unless catalog.description == edited[index].description
      raise unless catalog.description == record[0].description
    end
  end
  def test_order_single_catalog_item(request, appliance, service_catalogs, service_templates)
    # Tests ordering single catalog item using the REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    catalog = service_catalogs[0]
    unassign_templates(service_templates)
    for template in service_templates
      catalog.service_templates.action.assign(template)
    end
    catalog.service_templates.reload()
    template = catalog.service_templates[0]
    template.action.order()
    results = appliance.rest_api.response.json()
    assert_response(appliance)
    service_request = appliance.rest_api.get_entity("service_requests", results["id"])
    _order_finished = lambda do
      service_request.reload()
      return service_request.status.downcase() == "ok" && service_request.request_state.downcase() == "finished"
    end
    wait_for(_order_finished, num_sec: 180, delay: 10)
    service_name = get_dialog_service_name(appliance, service_request, template.name)
    raise unless service_request.message.include?()
    source_id = service_request.source_id.to_s
    new_service = appliance.rest_api.collections.services.get(service_template_id: source_id)
    raise unless new_service.name == service_name
    _finished = lambda do
      new_service.action.delete()
    end
  end
  def test_order_multiple_catalog_items(request, appliance, service_catalogs, service_templates)
    # Tests ordering multiple catalog items using the REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    catalog = service_catalogs[0]
    unassign_templates(service_templates)
    for template in service_templates
      catalog.service_templates.action.assign(template)
      template.reload()
    end
    catalog.service_templates.action.order(*service_templates)
    results = appliance.rest_api.response.json()
    results = results["results"]
    assert_response(appliance)
    raise "BZ 1480281 doesn't seem to be fixed" unless results[0].include?("href")
    _order_finished = lambda do |service_request|
      service_request.reload()
      return service_request.status.downcase() == "ok" && service_request.request_state.downcase() == "finished"
    end
    new_services = []
    for result in results
      service_request = appliance.rest_api.get_entity("service_requests", result["id"])
      wait_for(_order_finished, func_args: [service_request], num_sec: 180, delay: 10)
      service_name = get_dialog_service_name(appliance, service_request, *catalog.service_templates.all.map{|t| t.name})
      raise unless service_request.message.include?()
      source_id = service_request.source_id.to_s
      new_service = appliance.rest_api.collections.services.get(service_template_id: source_id)
      raise unless new_service.name == service_name
      new_services.push(new_service)
    end
    _finished = lambda do
      appliance.rest_api.collections.services.action.delete(*new_services)
    end
  end
  def test_order_catalog_bundle(appliance, request, catalog_bundle)
    # Tests ordering catalog bundle using the REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    catalog_bundle.action.order()
    results = appliance.rest_api.response.json()
    assert_response(appliance)
    service_request = appliance.rest_api.get_entity("service_requests", results["id"])
    _order_finished = lambda do
      service_request.reload()
      return service_request.status.downcase() == "ok" && service_request.request_state.downcase() == "finished"
    end
    wait_for(_order_finished, num_sec: 2000, delay: 10)
    service_name = get_dialog_service_name(appliance, service_request, catalog_bundle.name)
    raise unless service_request.message.include?()
    source_id = service_request.source_id.to_s
    new_service = appliance.rest_api.collections.services.get(service_template_id: source_id)
    raise unless new_service.name == service_name
    _finished = lambda do
      new_service.action.delete()
    end
    vms = new_service.vms
    vms.reload()
    raise unless vms.size == NUM_BUNDLE_ITEMS
    children = appliance.rest_api.collections.services.find_by(ancestry: new_service.id.to_s)
    raise unless children.size == NUM_BUNDLE_ITEMS
  end
  def test_delete_catalog_from_detail(service_catalogs, method)
    # Tests delete service catalogs from detail using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_detail(service_catalogs, method: method, num_sec: 100, delay: 5)
  end
  def test_delete_catalog_from_collection(service_catalogs)
    # Tests delete service catalogs from detail using REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_collection(service_catalogs, num_sec: 300, delay: 5)
  end
end
class TestPendingRequestsRESTAPI
  def _get_instance(miq_domain)
    auto_class = miq_domain.namespaces.instantiate(name: "Service").namespaces.instantiate(name: "Provisioning").namespaces.instantiate(name: "StateMachines").classes.instantiate(name: "ServiceProvisionRequestApproval")
    instance = auto_class.instances.instantiate(name: "Default", display_name: nil, description: nil, fields: nil)
    return instance
  end
  def new_domain(request, appliance)
    # Creates new domain and copy instance from ManageIQ to this domain.
    dc = appliance.collections.domains
    domain = dc.create(name: fauxfactory.gen_alphanumeric(12, start: "domain_"), enabled: true)
    request.addfinalizer(domain.delete_if_exists)
    miq_domain = dc.instantiate(name: "ManageIQ")
    instance = _get_instance(miq_domain)
    instance.copy_to(domain)
    return domain
  end
  def modified_instance(new_domain)
    # Modifies the instance in new domain to change it to manual approval instead of auto.
    instance = _get_instance(new_domain)
    update(instance) {
      instance.fields = {"approval_type" => {"value" => "manual"}}
    }
  end
  def pending_request(request, appliance, service_catalogs, service_templates, modified_instance)
    catalog = service_catalogs[0]
    unassign_templates(service_templates)
    for template in service_templates
      catalog.service_templates.action.assign(template)
    end
    catalog.service_templates.reload()
    template = catalog.service_templates[0]
    template.action.order()
    results = appliance.rest_api.response.json()
    assert_response(appliance)
    service_request = appliance.rest_api.get_entity("service_requests", results["id"])
    _delete_if_exists = lambda do
      begin
        service_request.action.delete()
      rescue Exception
        # pass
      end
    end
    _order_pending = lambda do
      service_request.reload()
      return service_request.request_state.downcase() == "pending" && service_request.approval_state.downcase() == "pending_approval"
    end
    wait_for(_order_pending, num_sec: 30, delay: 2)
    return service_request
  end
  def test_query_service_request_attributes(pending_request, soft_assert)
    # Tests access to service request attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(pending_request, soft_assert: soft_assert)
  end
  def test_create_pending_request(pending_request)
    # Tests creating pending service request using the REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    wait_for(lambda{|| pending_request.approval_state.downcase() != "pending_approval"}, fail_func: pending_request.reload, silent_failure: true, num_sec: 10, delay: 2)
    raise unless pending_request.approval_state.downcase() == "pending_approval"
  end
  def test_delete_pending_request_from_detail(pending_request, method)
    # Tests deleting pending service request from detail using the REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_detail([pending_request], method: method)
  end
  def test_delete_pending_request_from_collection(pending_request)
    # Tests deleting pending service request from detail using the REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_collection([pending_request])
  end
  def test_order_manual_approval(request, appliance, pending_request)
    # Tests ordering single catalog item with manual approval using the REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    pending_request.action.approve(reason: "I said so.")
    assert_response(appliance)
    _order_approved = lambda do
      pending_request.reload()
      return pending_request.request_state.downcase() == "finished" && pending_request.approval_state.downcase() == "approved" && pending_request.status.downcase() == "ok"
    end
    wait_for(_order_approved, num_sec: 180, delay: 10)
    source_id = pending_request.source_id.to_s
    new_service = appliance.rest_api.collections.services.get(service_template_id: source_id)
    raise unless pending_request.message.include?()
    request.addfinalizer(new_service.action.delete)
  end
  def test_order_manual_denial(appliance, pending_request)
    # Tests ordering single catalog item with manual denial using the REST API.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    pending_request.action.deny(reason: "I said so.")
    assert_response(appliance)
    _order_denied = lambda do
      pending_request.reload()
      return pending_request.request_state.downcase() == "finished" && pending_request.approval_state.downcase() == "denied" && pending_request.status.downcase() == "denied"
    end
    wait_for(_order_denied, num_sec: 30, delay: 2)
  end
end
class TestServiceRequests
  def new_role(appliance)
    role = copy_role(appliance, "EvmRole-user_self_service")
    role.action.edit(settings: nil)
    yield role
    role.action.delete()
  end
  def new_group(request, appliance, new_role)
    return groups(request, appliance, new_role, num: 1)
  end
  def user_auth(request, appliance, new_group)
    password = fauxfactory.gen_alphanumeric()
    data = [{"userid" => fauxfactory.gen_alphanumeric(start: "rest_").downcase(), "name" => fauxfactory.gen_alphanumeric(15, start: "REST User "), "password" => password, "group" => {"id" => new_group.id}}]
    user = _creating_skeleton(request, appliance, "users", data)
    user = user[0]
    return [user.userid, password]
  end
  def user_api(appliance, user_auth)
    entry_point = appliance.rest_api._entry_point
    return MiqApi(entry_point, user_auth, verify_ssl: false)
  end
  def test_user_item_order(appliance, request, user_api)
    # Tests ordering a catalog item using the REST API as a non-admin user.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    new_template = _service_templates(request, appliance, num: 1)
    new_template = new_template[0]
    catalog_id = new_template.service_template_catalog_id
    template_id = new_template.id
    catalog = user_api.get_entity("service_catalogs", catalog_id)
    templates_collection = catalog.service_templates
    template_href = 
    templates_collection.action.order(href: template_href)
    raise unless user_api.response
    result = user_api.response.json()
    result = result["results"][0]
    service_request = appliance.rest_api.get_entity("service_requests", result["id"])
    _order_finished = lambda do
      service_request.reload()
      return service_request.status.downcase() == "ok" && service_request.request_state.downcase() == "finished"
    end
    wait_for(_order_finished, num_sec: 180, delay: 10)
    service_name = get_dialog_service_name(appliance, service_request, new_template.name)
    raise unless service_request.message.include?()
    source_id = service_request.source_id.to_s
    new_service = appliance.rest_api.collections.services.get(service_template_id: source_id)
    raise unless new_service.name == service_name
    request.addfinalizer(new_service.action.delete)
  end
end
class TestOrchestrationTemplatesRESTAPI
  def orchestration_templates(request, appliance)
    num = 2
    response = _orchestration_templates(request, appliance, num: num)
    assert_response(appliance)
    raise unless response.size == num
    return response
  end
  def test_query_orchestration_templates_attributes(orchestration_templates, soft_assert)
    # Tests access to orchestration templates attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(orchestration_templates[0], soft_assert: soft_assert)
  end
  def test_create_orchestration_templates(appliance, orchestration_templates)
    # Tests creation of orchestration templates.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    for template in orchestration_templates
      record = appliance.rest_api.collections.orchestration_templates.get(id: template.id)
      raise unless record.name == template.name
      raise unless record.description == template.description
      raise unless record.type == template.type
    end
  end
  def test_delete_orchestration_templates_from_collection(orchestration_templates)
    # Tests deleting orchestration templates from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_collection(orchestration_templates, not_found: true)
  end
  def test_delete_orchestration_templates_from_detail_post(orchestration_templates)
    # Tests deleting orchestration templates from detail using POST method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_detail(orchestration_templates, method: "POST")
  end
  def test_delete_orchestration_templates_from_detail_delete(orchestration_templates)
    # Tests deleting orchestration templates from detail using DELETE method.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_detail(orchestration_templates, method: "DELETE")
  end
  def test_edit_orchestration_templates(appliance, orchestration_templates, from_detail)
    # Tests editing of orchestration templates.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    response_len = orchestration_templates.size
    new = response_len.times.map{|_| {"description" => fauxfactory.gen_alphanumeric(26, start: "Updated Test Template ")}}
    if is_bool(from_detail)
      edited = []
      for i in response_len.times
        edited.push(orchestration_templates[i].action.edit(None: new[i]))
        assert_response(appliance)
      end
    else
      for i in response_len.times
        new[i].update(orchestration_templates[i]._ref_repr())
      end
      edited = appliance.rest_api.collections.orchestration_templates.action.edit(*new)
      assert_response(appliance)
    end
    raise unless edited.size == response_len
    for i in response_len.times
      raise unless edited[i].description == new[i]["description"]
      orchestration_templates[i].reload()
      raise unless orchestration_templates[i].description == new[i]["description"]
    end
  end
  def test_copy_orchestration_templates(request, appliance, orchestration_templates, from_detail)
    # Tests copying of orchestration templates.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    num_orch_templates = orchestration_templates.size
    new = []
    for _ in num_orch_templates.times
      uniq = fauxfactory.gen_alphanumeric(5)
      new.push({"name" => , "content" => })
    end
    if is_bool(from_detail)
      copied = []
      for i in num_orch_templates.times
        copied.push(orchestration_templates[i].action.copy(None: new[i]))
        assert_response(appliance)
      end
    else
      for i in num_orch_templates.times
        new[i].update(orchestration_templates[i]._ref_repr())
      end
      copied = appliance.rest_api.collections.orchestration_templates.action.copy(*new)
      assert_response(appliance)
    end
    request.addfinalizer(lambda{|| appliance.rest_api.collections.orchestration_templates.action.delete(*copied)})
    raise unless copied.size == num_orch_templates
    for i in num_orch_templates.times
      orchestration_templates[i].reload()
      raise unless copied[i].name == new[i]["name"]
      raise unless orchestration_templates[i].id != copied[i].id
      raise unless orchestration_templates[i].name != copied[i].name
      raise unless orchestration_templates[i].description == copied[i].description
      new_record = appliance.rest_api.collections.orchestration_templates.get(id: copied[i].id)
      raise unless new_record.name == copied[i].name
    end
  end
  def test_invalid_copy_orchestration_templates(appliance, orchestration_templates, from_detail)
    # Tests copying of orchestration templates without changing content.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    num_orch_templates = orchestration_templates.size
    new = []
    for _ in num_orch_templates.times
      new.push({"name" => fauxfactory.gen_alphanumeric(18, start: "test_copied_")})
    end
    if is_bool(from_detail)
      for i in num_orch_templates.times
        pytest.raises(Exception, match: "content must be unique") {
          orchestration_templates[i].action.copy(None: new[i])
        }
        assert_response(appliance, http_status: 400)
      end
    else
      for i in num_orch_templates.times
        new[i].update(orchestration_templates[i]._ref_repr())
      end
      pytest.raises(Exception, match: "content must be unique") {
        appliance.rest_api.collections.orchestration_templates.action.copy(*new)
      }
      assert_response(appliance, http_status: 400)
    end
  end
  def test_invalid_template_type(appliance)
    # Tests that template creation fails gracefully when invalid type is specified.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    uniq = fauxfactory.gen_alphanumeric(5)
    payload = {"name" => , "description" => , "type" => "InvalidOrchestrationTemplateType", "orderable" => false, "draft" => false, "content" => TEMPLATE_TORSO.gsub("CloudFormation", uniq)}
    pytest.raises(Exception, match: "Api::BadRequestError") {
      appliance.rest_api.collections.orchestration_templates.action.create(payload)
    }
    assert_response(appliance, http_status: 400)
  end
end
class TestServiceOrderCart
  def service_templates_class(request, appliance)
    return service_templates(request, appliance)
  end
  def add_requests(cart, service_templates)
    body = service_templates.map{|tmplt| {"service_template_href" => tmplt.href}}
    response = cart.service_requests.action.add(*body)
    assert_response(cart.collection._api)
    raise unless response.size == service_templates.size
    raise unless cart.service_requests.subcount == response.size
    return response
  end
  def test_query_cart_attributes(cart, soft_assert)
    # Tests access to cart attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Services
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    query_resource_attributes(cart, soft_assert: soft_assert)
  end
  def test_create_empty_cart(appliance, cart)
    # Tests creating an empty cart.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    raise unless cart.state == "cart"
    cart_dict = appliance.rest_api.get()
    raise unless cart_dict["id"] == cart.id
  end
  def test_create_second_cart(request, appliance, cart)
    # Tests that it's not possible to create second cart.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    second_cart = appliance.rest_api.collections.service_orders.action.create(name: "cart2")
    second_cart = second_cart[0]
    request.addfinalizer(second_cart.action.delete)
    raise unless second_cart.state == "cart"
  end
  def test_create_cart(request, appliance, service_templates)
    # Tests creating a cart with service requests.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Bugzilla:
    #         1493785
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    requests = service_templates.map{|tmplt| {"service_template_href" => tmplt.href}}
    body = {"service_requests" => requests}
    href = appliance.rest_api.collections.service_orders._href
    response = appliance.rest_api.post(href, None: body)
    response = response["results"].pop()
    delete_cart = lambda do
      cart = appliance.rest_api.get_entity("service_orders", response["id"])
      cart.action.delete()
    end
    assert_response(appliance)
    cart_dict = appliance.rest_api.get()
    raise unless response["id"] == cart_dict["id"]
  end
  def test_add_to_cart(request, cart, service_templates_class)
    # Tests adding service requests to a cart.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    raise unless cart.service_requests.subcount == 0
    add_requests(cart, service_templates_class)
    request.addfinalizer(cart.action.clear)
    templates_ids = service_templates_class.map{|tmplt| tmplt.id}
    for service_request in cart.service_requests
      raise unless templates_ids.include?(service_request.source_id)
    end
  end
  def test_delete_requests(appliance, cart, service_templates_class)
    # Tests that deleting service requests removes them also from a cart.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    add_requests(cart, service_templates_class)
    cart_req_ids = 
    body = cart.service_requests.map{|req| {"id" => req.id}}
    response = cart.collection._api.collections.service_requests.action.delete(*body)
    assert_response(appliance)
    raise unless response.size == service_templates_class.size
    cart.service_requests.reload()
    raise unless cart.service_requests.subcount == 0
    all_req_ids = 
    raise unless all_req_ids - cart_req_ids == all_req_ids
  end
  def test_remove_from_cart(appliance, cart, service_templates_class)
    # Tests removing service requests from a cart.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    add_requests(cart, service_templates_class)
    cart_req_ids = 
    body = cart.service_requests.map{|req| {"id" => req.id}}
    response = cart.service_requests.action.remove(*body)
    assert_response(appliance)
    raise unless response.size == service_templates_class.size
    cart.service_requests.reload()
    raise unless cart.service_requests.subcount == 0
    all_req_ids = 
    raise unless all_req_ids - cart_req_ids == all_req_ids
  end
  def test_clear_cart(appliance, cart, service_templates_class)
    # Tests removing all service requests from a cart.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    add_requests(cart, service_templates_class)
    cart_req_ids = 
    cart.action.clear()
    assert_response(appliance)
    cart.service_requests.reload()
    raise unless cart.service_requests.subcount == 0
    all_req_ids = 
    raise unless all_req_ids - cart_req_ids == all_req_ids
  end
  def test_copy_cart(appliance, cart)
    # Tests that it's not possible to copy a cart.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    pytest.raises(Exception, match: "Cannot copy a service order in the cart state") {
      cart.action.copy(name: "new_cart")
    }
    assert_response(appliance, http_status: 400)
  end
  def test_order_cart(request, appliance, cart, service_templates_class)
    # Tests ordering service requests in a cart.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    selected_templates = service_templates_class[0...2]
    add_requests(cart, selected_templates)
    cart.action.order()
    assert_response(appliance)
    cart.reload()
    raise unless cart.state == "ordered"
    service_requests = cart.service_requests.to_a
    _order_finished = lambda do
      for sr in service_requests
        sr.reload()
        if is_bool(sr.status.downcase() != "ok" || sr.request_state.downcase() != "finished")
          return false
        end
      end
      return true
    end
    wait_for(_order_finished, num_sec: 180, delay: 10)
    for (index, sr) in enumerate(service_requests)
      service_name = get_dialog_service_name(appliance, sr, *selected_templates.map{|t| t.name})
      raise unless sr.message.include?()
      service_description = selected_templates[index].description
      new_service = appliance.rest_api.collections.services.get(description: service_description)
      request.addfinalizer(new_service.action.delete)
      raise unless service_name == new_service.name
    end
    pytest.raises(Exception, match: "ActiveRecord::RecordNotFound") {
      appliance.rest_api.get()
    }
  end
  def test_delete_cart_from_detail(cart, method)
    # Tests deleting cart from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_detail([cart], method: method)
  end
  def test_delete_cart_from_collection(cart)
    # Tests deleting cart from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: nansari
    #         casecomponent: Rest
    #         initialEstimate: 1/4h
    #         tags: service
    #     
    delete_resources_from_collection([cart])
  end
end
def test_deny_service_ordering_via_api(appliance, deny_service_ordering, service_templates)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Services
  #       caseimportance: high
  #       initialEstimate: 1/10h
  #       setup:
  #           1. In advanced settings, update `:product:`-`:allow_api_service_ordering:` to `false`
  #           2. Create a dialog, catalog and catalog item.
  #       testSteps:
  #           1. Order the service via API.
  #       expectedResults:
  #           1. Service must not be ordered and response must return error.
  # 
  #   Bugzilla:
  #       1632416
  #   
  template = service_templates[0]
  pytest.raises(APIException) {
    template.action.order()
  }
  assert_response(appliance, http_status: 400)
end
def set_run_automate_method(appliance)
  reset_setting = appliance.advanced_settings["product"]["run_automate_methods_on_service_api_submit"]
  appliance.update_advanced_settings({"product" => {"run_automate_methods_on_service_api_submit" => true}})
  yield
  appliance.update_advanced_settings({"product" => {"run_automate_methods_on_service_api_submit" => reset_setting}})
end
def automate_env_setup(klass)
  script = "
    dialog_field = $evm.object
    dialog_field[\"sort_by\"] = \"value\"
    dialog_field[\"sort_order\"] = \"ascending\"
    dialog_field[\"data_type\"] = \"integer\"
    dialog_field[\"required\"] = \"true\"
    dialog_field[\"default_value\"] = 7
    dialog_field[\"values\"] = {1 => \"one\", 2 => \"two\", 10 => \"ten\", 7 => \"seven\", 50 => \"fifty\"}
    "
  method = klass.methods.create(name: fauxfactory.gen_alphanumeric(start: "meth_"), display_name: fauxfactory.gen_alphanumeric(start: "meth_"), location: "inline", script: script)
  klass.schema.add_fields({"name" => "meth", "type" => "Method", "data_type" => "Integer"})
  instance = klass.instances.create(name: fauxfactory.gen_alphanumeric(start: "inst_"), display_name: fauxfactory.gen_alphanumeric(start: "inst_"), description: fauxfactory.gen_alphanumeric(), fields: {"meth" => {"value" => method.name}})
  yield instance
  method.delete()
  instance.delete()
end
def get_service_template(appliance, request, automate_env_setup)
  instance = automate_env_setup
  data = {"buttons" => "submit, cancel", "label" => fauxfactory.gen_alpha(12, start: "dialog_"), "dialog_tabs" => [{"display" => "edit", "label" => "Basic Information", "position" => 0, "dialog_groups" => [{"display" => "edit", "label" => "New section", "position" => 0, "dialog_fields" => [{"name" => "static", "data_type" => "integer", "display" => "edit", "required" => true, "default_value" => "2", "values" => [["1", "One"], ["2", "Two"], ["3", "Three"]], "label" => "Static Dropdown", "position" => 0, "dynamic" => false, "read_only" => true, "type" => "DialogFieldDropDownList", "resource_action" => {"resource_type" => "DialogField"}}, {"name" => "dynamic", "data_type" => "integer", "display" => "edit", "required" => true, "default_value" => "", "label" => "Dynamic Dropdown", "position" => 1, "dynamic" => true, "read_only" => true, "type" => "DialogFieldDropDownList", "resource_action" => {"resource_type" => "DialogField", "ae_namespace" => instance.namespace.name, "ae_class" => instance.klass.name, "ae_instance" => instance.name}}]}]}]}
  service_dialog = appliance.rest_api.collections.service_dialogs.action.create(None: data)[0]
  service_catalog = _service_catalogs(request, appliance, num: 1)[0]
  service_template = _service_templates(request, appliance, service_dialog: service_dialog, service_catalog: service_catalog)[0]
  yield service_template
  service_template.action.delete()
  service_catalog.action.delete()
  service_dialog.action.delete()
end
def test_populate_default_dialog_values(appliance, request, auth_type, set_run_automate_method, get_service_template)
  # 
  #   This test case checks if the default value set for static and dynamic elements are returned
  #   when ordering service via API with both basic and token based authentication.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Services
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #       setup:
  #           1. Update appliance advanced settings by setting
  #               `run_automate_methods_on_service_api_submit` to `true`.
  #           2. Create a new domain, namespace, klass, method, schema, and instance.
  #               (Method is attached in the Bugzilla 1639413).
  #               This method sets value 7 for dynamic element
  #           3. Create a Dialog with one static element(name=\"static\") with some default value,
  #               and one dynamic element(name=\"dynamic\") with the endpoint pointing to
  #               the newly created instance which returns a default value.
  #               (value_type=\"Integer\", read_only=True, required=True)
  #           4. Create a catalog and create a generic catalog item assigned to it.
  #       testSteps:
  #           1. Order the catalog item with the given auth_type
  #               and check if the response contains default values that were initially set.
  #       expectedResults:
  #           1. Response must include default values that were initially set.
  # 
  #   Bugzilla:
  #       1635673
  #       1650252
  #       1639413
  #       1660237
  #   
  if auth_type == "token"
    auth_token = appliance.rest_api.get(appliance.url_path("/api/auth"))
    assert_response(appliance)
    api = appliance.new_rest_api_instance(auth: {"token" => auth_token["auth_token"]})
    template = api.collections.service_templates.get(id: get_service_template.id)
  else
    template = get_service_template
  end
  response = template.action.order()
  assert_response(appliance)
  raise unless response.options["dialog"]["dialog_static"] == 2
  raise unless response.options["dialog"]["dialog_dynamic"] == 7
end
def request_task(appliance, service_templates)
  service_request = service_templates[0].action.order()
  assert_response(appliance)
  wait_for(lambda{|| service_request.request_state == "finished"}, fail_func: service_request.reload, num_sec: 200, delay: 5)
  service_template_name = service_templates[0].name
  return service_request.request_tasks.filter(Q("description", "=", )).resources[0]
end
def test_edit_service_request_task(appliance, request_task)
  # 
  #       Polarion:
  #       assignee: pvala
  #       caseimportance: medium
  #       casecomponent: Rest
  #       initialEstimate: 1/4h
  #       setup:
  #           1. Create a service request.
  #       testSteps:
  #           1. Edit the service request task:
  #               POST /api/service_requests/:id/request_tasks/:request_task_id
  #               {
  #               \"action\" : \"edit\",
  #               \"resource\" : {
  #                   \"options\" : {
  #                   \"request_param_a\" : \"value_a\",
  #                   \"request_param_b\" : \"value_b\"
  #                   }
  #               }
  #       expectedResults:
  #           1. Task must be edited successfully.
  # 
  #   
  request_task.action.edit(options: {"request_param_a" => "value_a", "request_param_b" => "value_b"})
  assert_response(appliance)
  request_task.reload()
  raise unless request_task.options["request_param_a"] == "value_a"
  raise unless request_task.options["request_param_b"] == "value_b"
end
def test_embedded_ansible_cat_item_edit_rest(appliance, request, ansible_catalog_item)
  # 
  #   Bugzilla:
  #       1716847
  #       1732117
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       initialEstimate: 1/4h
  #       setup:
  #           1. Create an Ansible Playbook Catalog Item
  #       testSteps:
  #           1. Edit the Catalog Item via REST and check if it is updated.
  #   
  service_template = appliance.rest_api.collections.service_templates.get(name: ansible_catalog_item.name)
  new_data = {"name" => fauxfactory.gen_alphanumeric(), "description" => fauxfactory.gen_alphanumeric()}
  service_template.action.edit(None: new_data)
  assert_response(appliance)
  service_template.reload()
  raise unless service_template.name == new_data["name"]
  raise unless service_template.description == new_data["description"]
end
def test_service_refresh_dialog_fields_default_values(appliance, request, file_name, import_dialog, soft_assert)
  # 
  #   Bugzilla:
  #       1730813
  #       1731977
  # 
  #   Polarion:
  #       assignee: pvala
  #       caseimportance: high
  #       casecomponent: Rest
  #       initialEstimate: 1/4h
  #       setup:
  #           1. Import dialog `RTP Testgear Client Provision` from the BZ attachments and create
  #               a service_template and service catalog to attach it.
  #       testSteps:
  #           1. Perform action `refresh_dialog_fields` by sending a request
  #               POST /api/service_catalogs/<:id>/sevice_templates/<:id>
  #                   {
  #                   \"action\": \"refresh_dialog_fields\",
  #                   \"resource\": {
  #                       \"fields\": [
  #                           \"tag_1_region\",
  #                           \"tag_0_function\"
  #                           ]
  #                       }
  #                   }
  #       expectedResults:
  #           1. Request must be successful and evm must have the default values
  #               for the fields mentioned in testStep 1.
  #   
  dialog,_ = import_dialog
  service_template = _service_templates(request, appliance, service_dialog: dialog.rest_api_entity, num: 1)[0]
  service_catalog = appliance.rest_api.collections.service_catalogs.get(id: service_template.service_template_catalog_id)
  service_catalog.service_templates.get(id: service_template.id).action.refresh_dialog_fields(None: {"fields" => ["tag_1_region", "tag_0_function"]})
  assert_response(appliance)
  response = appliance.rest_api.response.json()["result"]
  expected_tag_1_region = [["rtp", "rtp-vaas-vc.cisco.com"]]
  expected_tag_0_function = [["ixia", "IXIA"]]
  soft_assert.(expected_tag_1_region == response["tag_1_region"]["values"], "Default values for 'tag_1_region' did not match.")
  soft_assert.(expected_tag_0_function == response["tag_0_function"]["values"], "Default values for 'tag_0_function' did not match.")
end
def test_crud_service_template_with_picture(appliance, request, service_catalog_obj, dialog)
  # 
  #   Bugzilla:
  #       1702479
  #       1683723
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       initialEstimate: 1/4h
  #       setup:
  #           1. Create a service catalog and service dialog.
  #       testSteps:
  #           1. Create a service template via REST with picture.
  #           2. Note the picture md5 by querying `picture` attribute of the service template.
  #           3. Edit the service template via REST for a different picture.
  #           4. Note the picture md5 by querying `picture` attribute of the service template.
  #           5. Compare both the md5 from testStep 2 and 4.
  #       expectedResults:
  #           1. Service template created successfully without any error.
  #           2.
  #           3. Service template edited successfully without any error.
  #           4.
  #           5. Both the md5 values must be different.
  #   
  data = {"name" => fauxfactory.gen_alpha(start: "Name_"), "prov_type" => "generic", "service_template_catalog_id" => service_catalog_obj.rest_api_entity.id, "config_info" => {"retirement" => {"fqname" => "/Service/Retirement/StateMachines/ServiceRetirement/Default", "dialog_id" => dialog.rest_api_entity.id}, "provision" => {"fqname" => "/Service/Provisioning/StateMachines/ServiceProvision_Template/CatalogItemInitialization", "dialog_id" => dialog.rest_api_entity.id}}, "service_type" => "atomic", "display" => true, "description" => fauxfactory.gen_alpha(start: "Description ", length: 25), "picture" => {"content" => "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAAADUlEQVQIHWNgYGCwBQAAQgA+3N0+xQAAAABJRU5ErkJggg==", "extension" => "jpg"}}
  service_template = appliance.rest_api.collections.service_templates.action.create(None: data)[0]
  assert_response(appliance)
  request.addfinalizer(service_template.action.delete)
  picture_1_md5 = appliance.rest_api.get()["picture"]["md5"]
  updated_data = {"picture" => {"content" => "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "extension" => "jpg"}}
  service_template.action.edit(None: updated_data)
  assert_response(appliance)
  picture_2_md5 = appliance.rest_api.get()["picture"]["md5"]
  raise unless picture_1_md5 != picture_2_md5
end
