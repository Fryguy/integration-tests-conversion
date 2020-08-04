require_relative 'cfme'
include Cfme
require_relative 'cfme/control/explorer/policies'
include Cfme::Control::Explorer::Policies
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.long_running, pytest.mark.provider([VMwareProvider], selector: ONE_PER_TYPE, scope: "module"), test_requirements.ansible]
def ansible_action(appliance, ansible_catalog_item)
  action_collection = appliance.collections.actions
  action = action_collection.create(fauxfactory.gen_alphanumeric(15, start: "action_"), action_type: "Run Ansible Playbook", action_values: {"run_ansible_playbook" => {"playbook_catalog_item" => ansible_catalog_item.name}})
  yield(action)
  action.delete_if_exists()
end
def policy_for_testing(appliance, create_vm_modscope, provider, ansible_action)
  vm = create_vm_modscope
  policy = appliance.collections.policies.create(VMControlPolicy, fauxfactory.gen_alpha(15, start: "policy_"), scope: "fill_field(VM and Instance : Name, INCLUDES, #{vm.name})")
  policy.assign_actions_to_event("Tag Complete", [ansible_action.description])
  policy_profile = appliance.collections.policy_profiles.create(fauxfactory.gen_alpha(15, start: "profile_"), policies: [policy])
  provider.assign_policy_profiles(policy_profile.description)
  yield
  if is_bool(policy.exists)
    policy.unassign_events("Tag Complete")
    provider.unassign_policy_profiles(policy_profile.description)
    policy_profile.delete()
    policy.delete()
  end
end
def ansible_credential(wait_for_ansible, appliance, full_template_modscope)
  credential = appliance.collections.ansible_credentials.create(fauxfactory.gen_alpha(start: "cred_"), "Machine", username: credentials[full_template_modscope.creds]["username"], password: credentials[full_template_modscope.creds]["password"])
  yield(credential)
  credential.delete_if_exists()
end
def test_action_run_ansible_playbook_localhost(request, ansible_catalog_item, ansible_action, policy_for_testing, create_vm_modscope, ansible_credential, ansible_service_request_funcscope, ansible_service_funcscope, appliance)
  # Tests a policy with ansible playbook action against localhost.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/6h
  #       casecomponent: Ansible
  #   
  update(ansible_action) {
    ansible_action.run_ansible_playbook = {"inventory" => {"localhost" => true}}
  }
  added_tag = create_vm_modscope.add_tag()
  request.addfinalizer(lambda{|| create_vm_modscope.remove_tag(added_tag)})
  wait_for(ansible_service_request_funcscope.exists, num_sec: 600)
  ansible_service_request_funcscope.wait_for_request()
  view = navigate_to(ansible_service_funcscope, "Details")
  raise unless view.provisioning.details.get_text_of("Hosts") == "localhost"
  status = (appliance.version < "5.11") ? "successful" : "Finished"
  raise unless view.provisioning.results.get_text_of("Status") == status
end
def test_action_run_ansible_playbook_manual_address(request, ansible_catalog_item, ansible_action, policy_for_testing, create_vm_modscope, ansible_credential, ansible_service_request_funcscope, ansible_service_funcscope, appliance)
  # Tests a policy with ansible playbook action against manual address.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/6h
  #       casecomponent: Ansible
  #   
  vm = create_vm_modscope
  update(ansible_catalog_item) {
    ansible_catalog_item.provisioning = {"machine_credential" => ansible_credential.name}
  }
  update(ansible_action) {
    ansible_action.run_ansible_playbook = {"inventory" => {"specific_hosts" => true, "hosts" => vm.ip_address}}
  }
  added_tag = vm.add_tag()
  request.addfinalizer(lambda{|| vm.remove_tag(added_tag)})
  wait_for(ansible_service_request_funcscope.exists, num_sec: 600)
  ansible_service_request_funcscope.wait_for_request()
  view = navigate_to(ansible_service_funcscope, "Details")
  raise unless view.provisioning.details.get_text_of("Hosts") == vm.ip_address
  status = (appliance.version < "5.11") ? "successful" : "Finished"
  raise unless view.provisioning.results.get_text_of("Status") == status
end
def test_action_run_ansible_playbook_target_machine(request, ansible_catalog_item, ansible_action, policy_for_testing, create_vm_modscope, ansible_credential, ansible_service_request_funcscope, ansible_service_funcscope, appliance)
  # Tests a policy with ansible playbook action against target machine.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/6h
  #       casecomponent: Ansible
  #   
  vm = create_vm_modscope
  update(ansible_action) {
    ansible_action.run_ansible_playbook = {"inventory" => {"target_machine" => true}}
  }
  added_tag = vm.add_tag()
  request.addfinalizer(lambda{|| vm.remove_tag(added_tag)})
  wait_for(ansible_service_request_funcscope.exists, num_sec: 600)
  ansible_service_request_funcscope.wait_for_request()
  view = navigate_to(ansible_service_funcscope, "Details")
  raise unless view.provisioning.details.get_text_of("Hosts") == vm.ip_address
  status = (appliance.version < "5.11") ? "successful" : "Finished"
  raise unless view.provisioning.results.get_text_of("Status") == status
end
def test_action_run_ansible_playbook_unavailable_address(request, ansible_catalog_item, create_vm_modscope, ansible_action, policy_for_testing, ansible_credential, ansible_service_request_funcscope, ansible_service_funcscope, appliance)
  # Tests a policy with ansible playbook action against unavailable address.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/6h
  #       casecomponent: Ansible
  #   
  vm = create_vm_modscope
  update(ansible_catalog_item) {
    ansible_catalog_item.provisioning = {"machine_credential" => ansible_credential.name}
  }
  update(ansible_action) {
    ansible_action.run_ansible_playbook = {"inventory" => {"specific_hosts" => true, "hosts" => "unavailable_address"}}
  }
  added_tag = vm.add_tag()
  request.addfinalizer(lambda{|| vm.remove_tag(added_tag)})
  wait_for(ansible_service_request_funcscope.exists, num_sec: 600)
  ansible_service_request_funcscope.wait_for_request()
  view = navigate_to(ansible_service_funcscope, "Details")
  raise unless view.provisioning.details.get_text_of("Hosts") == "unavailable_address"
  status = (appliance.version < "5.11") ? "failed" : "Finished"
  raise unless view.provisioning.results.get_text_of("Status") == status
end
def test_control_action_run_ansible_playbook_in_requests(request, create_vm_modscope, policy_for_testing, ansible_service_request_funcscope)
  # Checks if execution of the Action result in a Task/Request being created.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/6h
  #       casecomponent: Ansible
  #   
  vm = create_vm_modscope
  added_tag = vm.add_tag()
  request.addfinalizer(lambda{|| vm.remove_tag(added_tag)})
  raise unless ansible_service_request_funcscope.exists
end
