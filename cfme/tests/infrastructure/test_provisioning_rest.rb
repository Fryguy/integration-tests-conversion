require_relative 'manageiq_client/filters'
include Manageiq_client::Filters
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.rest, pytest.mark.tier(2), pytest.mark.meta(server_roles: "+automate"), pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([VMwareProvider, RHEVMProvider], scope: "module")]
def get_provision_data(rest_api, provider, template_name, auto_approve: true)
  templates = rest_api.collections.templates.find_by(name: template_name)
  __dummy0__ = false
  for template in templates
    begin
      ems_id = template.ems_id
    rescue NoMethodError
      next
    end
    if ems_id == provider.id
      guid = template.guid
      break
    end
    if template == templates[-1]
      __dummy0__ = true
    end
  end
  if __dummy0__
    raise Exception, 
  end
  result = {"version" => "1.1", "template_fields" => {"guid" => guid}, "vm_fields" => {"number_of_cpus" => 1, "vm_name" => fauxfactory.gen_alphanumeric(20, start: "test_rest_prov_"), "vm_memory" => "2048", "vlan" => provider.data["provisioning"]["vlan"]}, "requester" => {"user_name" => "admin", "owner_first_name" => "John", "owner_last_name" => "Doe", "owner_email" => "jdoe@sample.com", "auto_approve" => auto_approve}, "tags" => {"network_location" => "Internal", "cc" => "001"}, "additional_values" => {"request_id" => "1001", "placement_auto" => "true"}, "ems_custom_attributes" => {}, "miq_custom_attributes" => {}}
  if is_bool(provider.one_of(RHEVMProvider))
    result["vm_fields"]["provision_type"] = "native_clone"
    result["vm_fields"]["vlan"] = "<Template>"
  end
  return result
end
def provision_data(appliance, provider, small_template_modscope)
  return get_provision_data(appliance.rest_api, provider, small_template_modscope.name)
end
def clean_vm(appliance, provider, vm_name)
  found_vms = appliance.rest_api.collections.vms.find_by(name: vm_name)
  if is_bool(found_vms)
    vm = found_vms[0]
    vm.action.delete()
    vm.wait_not_exists(num_sec: 15, delay: 2)
  end
  appliance.collections.infra_vms.instantiate(vm_name, provider).cleanup_on_provider()
end
def test_provision(request, appliance, provider, provision_data)
  # Tests provision via REST API.
  #   Prerequisities:
  #       * Have a provider set up with templates suitable for provisioning.
  #   Steps:
  #       * POST /api/provision_requests (method ``create``) the JSON with provisioning data. The
  #           request is returned.
  #       * Query the request by its id until the state turns to ``finished`` or ``provisioned``.
  #   Metadata:
  #       test_flag: rest, provision
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Provisioning
  #       caseimportance: high
  #       initialEstimate: 1/3h
  #   
  vm_name = provision_data["vm_fields"]["vm_name"]
  request.addfinalizer(lambda{|| clean_vm(appliance, provider, vm_name)})
  appliance.rest_api.collections.provision_requests.action.create(None: provision_data)
  assert_response(appliance)
  provision_request = appliance.collections.requests.instantiate(description: vm_name, partial_check: true)
  provision_request.wait_for_request()
  msg = "Provisioning failed with the message {}".format(provision_request.rest.message)
  raise msg unless provision_request.is_succeeded()
  found_vms = appliance.rest_api.collections.vms.find_by(name: vm_name)
  raise  unless found_vms
end
def test_provision_vlan(request, appliance, provision_data, vnic_profile, provider)
  # Tests provision via REST API for vlan Empty/Specific vNic profile.
  #   Prerequisities:
  #       * Have a provider set up with templates suitable for provisioning.
  #   Steps:
  #       * POST /api/provision_requests (method ``create``) the JSON with provisioning data. The
  #           request is returned.
  #       * Apart from the usual provisioning settings, set vlan
  #         to values <Empty>/profile_name (network_name)
  #       * Query the request by its id until the state turns to ``finished`` or ``provisioned``.
  #       * Check the VM's vNic profile is as expected.
  #   Metadata:
  #       test_flag: rest, provision
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Provisioning
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #   
  vm_name = provision_data["vm_fields"]["vm_name"]
  profile_name = provider.data["provisioning"]["vlan"]
  if vnic_profile == "empty_vnic_profile"
    vnic_profile = "<Empty>"
  else
    vnic_profile = profile_name
  end
  provision_data["vm_fields"]["vlan"] = vnic_profile
  request.addfinalizer(lambda{|| clean_vm(appliance, provider, vm_name)})
  appliance.rest_api.collections.provision_requests.action.create(None: provision_data)
  assert_response(appliance)
  provision_request = appliance.collections.requests.instantiate(description: vm_name, partial_check: true)
  provision_request.wait_for_request()
  msg = "Provisioning failed with the message {}".format(provision_request.rest.message)
  raise msg unless provision_request.is_succeeded()
  found_vms = appliance.rest_api.collections.vms.find_by(name: vm_name)
  raise  unless found_vms
  vm = appliance.collections.infra_vms.instantiate(vm_name, provider)
  nics = vm.mgmt.get_nics()
  raise "The VM should have a NIC attached." unless nics
  profile = nics[0].vnic_profile
  if vnic_profile == "<Empty>"
    raise "vNIC profile is not Empty as expected." unless !profile
  else
    vnic_srv = provider.mgmt.api.system_service().vnic_profiles_service()
    profile_via_provider = vnic_srv.profile_service(profile.id).get()
    assert_msg = 
    raise assert_msg unless profile_via_provider.name == profile_name.split()[0]
  end
end
def test_provision_emails(request, provision_data, provider, appliance, smtp_test)
  # 
  #   Test that redundant e-mails are not received when provisioning VM that has some
  #   attributes set to values that differ from template's default.
  # 
  #   Metadata:
  #       test_flag: rest, provision
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Provisioning
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  check_one_approval_mail_received = lambda do
    return (smtp_test.get_emails(subject_like: "%%Your Virtual Machine Request was Approved%%")).size == 1
  end
  check_one_completed_mail_received = lambda do
    return (smtp_test.get_emails(subject_like: "%%Your virtual machine request has Completed%%")).size == 1
  end
  request.addfinalizer(lambda{|| clean_vm(appliance, provider, vm_name)})
  vm_name = provision_data["vm_fields"]["vm_name"]
  if is_bool(!provider.one_of(RHEVMProvider))
    memory = provision_data["vm_fields"]["vm_memory"].to_i
    provision_data["vm_fields"]["vm_memory"] = (memory / 2.to_f).to_s
  end
  provision_data["vm_fields"]["number_of_cpus"] += 1
  appliance.rest_api.collections.provision_requests.action.create(None: provision_data)
  assert_response(appliance)
  request = appliance.collections.requests.instantiate(description: vm_name, partial_check: true)
  request.wait_for_request()
  raise  unless provider.mgmt.does_vm_exist(vm_name)
  wait_for(method(:check_one_approval_mail_received), num_sec: 90, delay: 5)
  wait_for(method(:check_one_completed_mail_received), num_sec: 90, delay: 5)
end
def test_create_pending_provision_requests(request, appliance, provider, small_template)
  # Tests creation and and auto-approval of pending provision request
  #   using /api/provision_requests.
  # 
  #   Metadata:
  #       test_flag: rest, provision
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Provisioning
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  provision_data = get_provision_data(appliance.rest_api, provider, small_template.name, auto_approve: false)
  vm_name = provision_data["vm_fields"]["vm_name"]
  request.addfinalizer(lambda{|| clean_vm(appliance, provider, vm_name)})
  prov_request, = appliance.rest_api.collections.provision_requests.action.create(None: provision_data)
  assert_response(appliance)
  raise unless prov_request.options["auto_approve"] === false
  raise unless prov_request.approval_state == "pending_approval"
  prov_request.reload()
  wait_for(lambda{|| prov_request.approval_state == "approved"}, fail_func: prov_request.reload, num_sec: 300, delay: 10)
  wait_for(lambda{|| prov_request.request_state == "finished"}, fail_func: prov_request.reload, num_sec: 600, delay: 10)
end
def test_provision_attributes(appliance, provider, small_template, soft_assert)
  # Tests that it's possible to display additional attributes in /api/provision_requests/:id.
  # 
  #   Metadata:
  #       test_flag: rest, provision
  # 
  #   Bugzilla:
  #       1592326
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Provisioning
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  provision_data = get_provision_data(appliance.rest_api, provider, small_template.name, auto_approve: false)
  provision_request, = appliance.rest_api.collections.provision_requests.action.create(None: provision_data)
  assert_response(appliance)
  provision_request.action.deny(reason: "denied")
  query_resource_attributes(provision_request, soft_assert: soft_assert)
end
def request_task(appliance, request, provider, provision_data)
  vm_name = provision_data["vm_fields"]["vm_name"]
  request.addfinalizer(lambda{|| clean_vm(appliance, provider, vm_name)})
  provision_request = appliance.rest_api.collections.provision_requests.action.create(None: provision_data)[0]
  assert_response(appliance)
  wait_for(lambda{|| provision_request.request_state == "finished"}, fail_func: provision_request.reload, num_sec: 1800, delay: 20)
  return provision_request.request_tasks.filter(Q("description", "=", )).resources[0]
end
def test_edit_provider_request_task(appliance, request, provider, request_task)
  # 
  #   Polarion:
  #       assignee: pvala
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       casecomponent: Rest
  #       setup:
  #           1. Create a provision request.
  #       testSteps:
  #           1. Edit the provision request task:
  #               POST /api/provision_requests/:id/request_tasks/:request_task_id
  #               {
  #               \"action\" : \"edit\",
  #               \"resource\" : {
  #                   \"options\" : {
  #                   \"request_param_a\" : \"value_a\",
  #                   \"request_param_b\" : \"value_b\"
  #                   }
  #               }
  #               }
  #       expectedResults:
  #           1. Task must be edited successfully.
  #   
  request_task.action.edit(options: {"request_param_a" => "value_a", "request_param_b" => "value_b"})
  assert_response(appliance)
  request_task.reload()
  raise unless request_task.options["request_param_a"] == "value_a"
  raise unless request_task.options["request_param_b"] == "value_b"
end
