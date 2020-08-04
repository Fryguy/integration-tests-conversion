require_relative("cfme");
include(Cfme);
require_relative("cfme/control/explorer/policies");
include(Cfme.Control.Explorer.Policies);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.long_running,

  pytest.mark.provider(
    [VMwareProvider],
    {selector: ONE_PER_TYPE, scope: "module"}
  ),

  test_requirements.ansible
];

function ansible_action(appliance, ansible_catalog_item) {
  let action_collection = appliance.collections.actions;

  let action = action_collection.create(
    fauxfactory.gen_alphanumeric(15, {start: "action_"}),

    {
      action_type: "Run Ansible Playbook",
      action_values: {run_ansible_playbook: {playbook_catalog_item: ansible_catalog_item.name}}
    }
  );

  yield(action);
  action.delete_if_exists()
};

function policy_for_testing(appliance, create_vm_modscope, provider, ansible_action) {
  let vm = create_vm_modscope;

  let policy = appliance.collections.policies.create(
    VMControlPolicy,
    fauxfactory.gen_alpha(15, {start: "policy_"}),
    {scope: `fill_field(VM and Instance : Name, INCLUDES, ${vm.name})`}
  );

  policy.assign_actions_to_event(
    "Tag Complete",
    [ansible_action.description]
  );

  let policy_profile = appliance.collections.policy_profiles.create(
    fauxfactory.gen_alpha(15, {start: "profile_"}),
    {policies: [policy]}
  );

  provider.assign_policy_profiles(policy_profile.description);
  yield;

  if (is_bool(policy.exists)) {
    policy.unassign_events("Tag Complete");
    provider.unassign_policy_profiles(policy_profile.description);
    policy_profile.delete();
    policy.delete()
  }
};

function ansible_credential(wait_for_ansible, appliance, full_template_modscope) {
  let credential = appliance.collections.ansible_credentials.create(
    fauxfactory.gen_alpha({start: "cred_"}),
    "Machine",

    {
      username: credentials[full_template_modscope.creds].username,
      password: credentials[full_template_modscope.creds].password
    }
  );

  yield(credential);
  credential.delete_if_exists()
};

function test_action_run_ansible_playbook_localhost(request, ansible_catalog_item, ansible_action, policy_for_testing, create_vm_modscope, ansible_credential, ansible_service_request_funcscope, ansible_service_funcscope, appliance) {
  // Tests a policy with ansible playbook action against localhost.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/6h
  //       casecomponent: Ansible
  //   
  update(
    ansible_action,
    () => ansible_action.run_ansible_playbook = {inventory: {localhost: true}}
  );

  let added_tag = create_vm_modscope.add_tag();
  request.addfinalizer(() => create_vm_modscope.remove_tag(added_tag));
  wait_for(ansible_service_request_funcscope.exists, {num_sec: 600});
  ansible_service_request_funcscope.wait_for_request();
  let view = navigate_to(ansible_service_funcscope, "Details");

  if (view.provisioning.details.get_text_of("Hosts") != "localhost") {
    throw new ()
  };

  let status = (appliance.version < "5.11" ? "successful" : "Finished");
  if (view.provisioning.results.get_text_of("Status") != status) throw new ()
};

function test_action_run_ansible_playbook_manual_address(request, ansible_catalog_item, ansible_action, policy_for_testing, create_vm_modscope, ansible_credential, ansible_service_request_funcscope, ansible_service_funcscope, appliance) {
  // Tests a policy with ansible playbook action against manual address.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/6h
  //       casecomponent: Ansible
  //   
  let vm = create_vm_modscope;

  update(ansible_catalog_item, () => (
    ansible_catalog_item.provisioning = {machine_credential: ansible_credential.name}
  ));

  update(ansible_action, () => (
    ansible_action.run_ansible_playbook = {inventory: {
      specific_hosts: true,
      hosts: vm.ip_address
    }}
  ));

  let added_tag = vm.add_tag();
  request.addfinalizer(() => vm.remove_tag(added_tag));
  wait_for(ansible_service_request_funcscope.exists, {num_sec: 600});
  ansible_service_request_funcscope.wait_for_request();
  let view = navigate_to(ansible_service_funcscope, "Details");

  if (view.provisioning.details.get_text_of("Hosts") != vm.ip_address) {
    throw new ()
  };

  let status = (appliance.version < "5.11" ? "successful" : "Finished");
  if (view.provisioning.results.get_text_of("Status") != status) throw new ()
};

function test_action_run_ansible_playbook_target_machine(request, ansible_catalog_item, ansible_action, policy_for_testing, create_vm_modscope, ansible_credential, ansible_service_request_funcscope, ansible_service_funcscope, appliance) {
  // Tests a policy with ansible playbook action against target machine.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/6h
  //       casecomponent: Ansible
  //   
  let vm = create_vm_modscope;

  update(ansible_action, () => (
    ansible_action.run_ansible_playbook = {inventory: {target_machine: true}}
  ));

  let added_tag = vm.add_tag();
  request.addfinalizer(() => vm.remove_tag(added_tag));
  wait_for(ansible_service_request_funcscope.exists, {num_sec: 600});
  ansible_service_request_funcscope.wait_for_request();
  let view = navigate_to(ansible_service_funcscope, "Details");

  if (view.provisioning.details.get_text_of("Hosts") != vm.ip_address) {
    throw new ()
  };

  let status = (appliance.version < "5.11" ? "successful" : "Finished");
  if (view.provisioning.results.get_text_of("Status") != status) throw new ()
};

function test_action_run_ansible_playbook_unavailable_address(request, ansible_catalog_item, create_vm_modscope, ansible_action, policy_for_testing, ansible_credential, ansible_service_request_funcscope, ansible_service_funcscope, appliance) {
  // Tests a policy with ansible playbook action against unavailable address.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/6h
  //       casecomponent: Ansible
  //   
  let vm = create_vm_modscope;

  update(ansible_catalog_item, () => (
    ansible_catalog_item.provisioning = {machine_credential: ansible_credential.name}
  ));

  update(ansible_action, () => (
    ansible_action.run_ansible_playbook = {inventory: {
      specific_hosts: true,
      hosts: "unavailable_address"
    }}
  ));

  let added_tag = vm.add_tag();
  request.addfinalizer(() => vm.remove_tag(added_tag));
  wait_for(ansible_service_request_funcscope.exists, {num_sec: 600});
  ansible_service_request_funcscope.wait_for_request();
  let view = navigate_to(ansible_service_funcscope, "Details");

  if (view.provisioning.details.get_text_of("Hosts") != "unavailable_address") {
    throw new ()
  };

  let status = (appliance.version < "5.11" ? "failed" : "Finished");
  if (view.provisioning.results.get_text_of("Status") != status) throw new ()
};

function test_control_action_run_ansible_playbook_in_requests(request, create_vm_modscope, policy_for_testing, ansible_service_request_funcscope) {
  // Checks if execution of the Action result in a Task/Request being created.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/6h
  //       casecomponent: Ansible
  //   
  let vm = create_vm_modscope;
  let added_tag = vm.add_tag();
  request.addfinalizer(() => vm.remove_tag(added_tag));
  if (!ansible_service_request_funcscope.exists) throw new ()
}
