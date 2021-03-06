require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.long_running, test_requirements.ansible]
private_key = "
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA6J0DNbInTt35zDDq8obCRUH1uJvqoNEP+yEEHm/C1ipIC7vW
7ROuQMcPpsTgIVWBmFCOAt3TuQASYqo0mQrRHRPFDD0msPMMLcWENJ+4HkPZaZZX
k38HNuxa9NqPi5x/v008g4bER9OrleA2v5QPJHhcfLAjdL104gGeAK0G7+xJoJDA
NishuOkGC/qVBCaQ6qrEBlVHq6v5eSgXSJz3Jdd6GBdHy2xfokYHIEAb+qt3mW0G
ijXPBXDtBVguQ2OIJgEzmMh7sAjnAqogrH8FGRJUB+y7dqhZfmJSmSImoFo9/Akk
Ei+QbgijymVDmCLL16u7I9q6tHOVuhf9e3I0aQIDAQABAoIBAAuzwnKUGNgl4Kg+
GcPDtchILjVwWphmjBhFK/DgDHw7uk4k0AYzREPr/8STCPeEVrWz78EDKeCXuVUP
XQAKBEUjNnmMJgMm5wjyc9k148xZ+3kNYDCCZnmD4HuK90e9wst79jxjrkIyyuIK
Wpa+uxhJmdWIAvCfi17HWAyOp9ewAeKJJ8T2PwT56UyQi3DaR3YHALGra8Z676yT
NHQ/is6TE92GnRictgrmahYO7qke8h39NzHhH6/21PwSeSv3VDw3nKmz+9qY6sZU
GXCCu+ngPdCCXtBWDRewEBO2MMJb2LJwELR6PhXsPHN29vpZtfd8VudSZLYSOuik
0/cSPVUCgYEA9WtKNDJB0Xg0vNRpAiv6DKPovERrcTTwPrWaQI9WWOtxgFKGniAo
p84atPsxXqnpojAp6XAF3o33uf2S0L3pH2afNck5DLNy0AA0Bc0LGIFwzEqfbTGr
c1cpU1jV4N/x6Icbx+NdqfKcgH74t63vZb+4UixSOMnbi5oiM6Qu3DcCgYEA8qRi
ZfWfjQhWn4XZKcIRAWsjV8I3D7JjWyQ7r8mo1h/aLZe3cAmyi9VgRtltuQpwrLrD
1kgNL/l9oRALJoN/hKhpTKzNWiHf0zSNknp/xWlDmik3ToZ0SSwuETR5lNSgT//a
3oJLN8PXaoUBXDcsJy9McK4iZmS8dQ270SW/ZF8CgYEA5xOlY64qcNu49E8frG7R
2tL+UT4u2AHbb4A4hC8yQzk0vnl1zS9EeHPEi8G0g4iCtjaZT/YtYJbVuOb8NNWL
yggrQk58C+xu31BBq3Cb0PAX0BM3N248G7bm71ZG05yovqNwUe5QA7OvDgH/l5sL
PQeeuqiGpnfR4wk2yN7/TFMCgYAXYWWl43wjT9lg97nMP0n6NAOs0icSGSNfxecG
ck0VjO4uFH91iUmuFbp4OT1MZkgjLL/wJvM2WzkSywP4CxW/h6bV35TOCZOSu26k
3a7wK8t60Fvm8ifEYUBzIfZRNAfajZHefPmYfwOD3RsbcqmLgRBBj1X7Pdu2/8LI
TXXaywKBgQCaXeEZ5BTuD7FvMSX95EamDJ/DMyE8TONwDHMIowf2IQbf0Y5U7ntK
6pm5O95cJ7l2m3jUbKIUy0Y8HPW2MgwstcZXKkzlR/IOoSVgdiAnPjVKlIUvVBUx
0u7GxCs5nfyEPjEHTBn1g7Z6U8c6x1r7F50WsLzJftLfqo7tElNO5A==
-----END RSA PRIVATE KEY-----
"
CREDENTIALS = [["Machine", {"username" => fauxfactory.gen_alpha(start: "usr_"), "password" => fauxfactory.gen_alpha(start: "pwd_"), "privilage_escalation" => "sudo", "privilage_escalation_username" => fauxfactory.gen_alpha(start: "usr_"), "privilage_escalation_password" => fauxfactory.gen_alpha(start: "pwd_")}], ["Scm", {"username" => fauxfactory.gen_alpha(start: "usr_"), "password" => fauxfactory.gen_alpha(start: "pwd_")}], ["Amazon", {"access_key" => fauxfactory.gen_alpha(15, start: "acc_key_"), "secret_key" => fauxfactory.gen_alpha(15, start: "sec_key_"), "sts_token" => fauxfactory.gen_alpha(15, start: "token_")}], ["VMware", {"username" => fauxfactory.gen_alpha(start: "usr_"), "password" => fauxfactory.gen_alpha(start: "pwd_"), "vcenter_host" => fauxfactory.gen_alpha(start: "host_")}], ["OpenStack", {"username" => fauxfactory.gen_alpha(start: "usr_"), "password" => fauxfactory.gen_alpha(start: "pwd_"), "authentication_url" => fauxfactory.gen_alpha(start: "url_"), "project" => fauxfactory.gen_alpha(15, start: "project_"), "domain" => fauxfactory.gen_alpha(15, start: "domain_")}], ["Red Hat Virtualization", {"username" => fauxfactory.gen_alpha(start: "usr_"), "password" => fauxfactory.gen_alpha(start: "pwd_"), "host" => fauxfactory.gen_alpha(start: "host_")}], ["Google Compute Engine", {"service_account" => fauxfactory.gen_alpha(start: "acc_"), "priv_key" => private_key, "project" => fauxfactory.gen_alpha(15, start: "project_")}], ["Network", {"username" => fauxfactory.gen_alpha(start: "usr_"), "password" => fauxfactory.gen_alpha(start: "pwd_")}], ["Azure", {"username" => fauxfactory.gen_alpha(start: "usr_"), "password" => fauxfactory.gen_alpha(start: "pwd_"), "subscription_id" => fauxfactory.gen_alpha(15, start: "sub_id_"), "tenant_id" => fauxfactory.gen_alpha(15, start: "tenant_id_"), "client_secret" => fauxfactory.gen_alpha(15, start: "secret_"), "client_id" => fauxfactory.gen_alpha(15, start: "client_id_")}]]
def action_collection(appliance)
  return appliance.collections.actions
end
def credentials_collection(appliance)
  return appliance.collections.ansible_credentials
end
def new_zone(appliance)
  zone_collection = appliance.collections.zones
  zone = zone_collection.create(name: fauxfactory.gen_alphanumeric(5), description: fauxfactory.gen_alphanumeric(8))
  server_settings = appliance.server.settings
  server_settings.update_basic_information({"appliance_zone" => zone.name})
  yield(zone)
  server_settings.update_basic_information({"appliance_zone" => "default"})
  zone.delete()
end
def test_embedded_ansible_repository_crud(ansible_repository, wait_for_ansible)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: critical
  #       initialEstimate: 1/12h
  #       tags: ansible_embed
  #   
  updated_description = fauxfactory.gen_alpha(15, start: "edited_")
  update(ansible_repository) {
    ansible_repository.description = updated_description
  }
  view = navigate_to(ansible_repository, "Edit")
  wait_for(lambda{|| view.description.value != ""}, delay: 1, timeout: 5)
  raise unless view.description.value == updated_description
end
def test_embedded_ansible_repository_branch_crud(appliance, request, wait_for_ansible)
  # 
  #   Ability to add repo with branch (without SCM credentials).
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: critical
  #       initialEstimate: 1/12h
  #       tags: ansible_embed
  #   
  repositories = appliance.collections.ansible_repositories
  begin
    playbooks_yaml = cfme_data.ansible_links.playbook_repositories
    playbook_name = request.getattr("param", "embedded_ansible")
    repository = repositories.create(name: fauxfactory.gen_alpha(start: "repo"), url: playbooks_yaml.getattr(playbook_name), description: fauxfactory.gen_alpha(15, start: "repo_desc_"), scm_branch: "second_playbook_branch")
  rescue [KeyError, NoMethodError]
    message = "Missing ansible_links content in cfme_data, cannot setup repository"
    logger.exception(message)
    pytest.fail(message)
  end
  request.addfinalizer(lambda{|| repository.delete_if_exists()})
  view = navigate_to(repository, "Details")
  scm_branch = view.entities.summary("Repository Options").get_text_of("SCM Branch")
  raise unless scm_branch == repository.scm_branch
  repository.delete()
  raise unless !repository.exists
end
def test_embedded_ansible_repository_invalid_url_crud(request, appliance, wait_for_ansible)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: critical
  #       initialEstimate: 1/6h
  #       tags: ansible_embed
  #   
  repositories = appliance.collections.ansible_repositories
  repository = repositories.create(name: fauxfactory.gen_alpha(start: "repo_"), url: "https://github.com/sbulage/invalid_repo_url.git", description: fauxfactory.gen_alpha(15, start: "repo_desc_"))
  view = navigate_to(repository, "Details")
  raise unless (appliance.version < "5.11") ? view.entities.summary("Properties").get_text_of("Status") == "failed" : "error"
  repository.delete_if_exists()
end
def test_embedded_ansible_private_repository_crud(request, ansible_private_repository)
  # 
  #   Add Private Repository by using SCM credentials. Check repository gets added successfully.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: critical
  #       initialEstimate: 1/6h
  #       tags: ansible_embed
  #   
  raise unless ansible_private_repository.exists
  ansible_private_repository.delete()
  raise unless !ansible_private_repository.exists
end
def test_embedded_ansible_credential_crud(credentials_collection, wait_for_ansible, credential_type, credentials, appliance)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: critical
  #       initialEstimate: 1/6h
  #       tags: ansible_embed
  #   
  credential = credentials_collection.create("#{credential_type}_credential_#{fauxfactory.gen_alpha()}", credential_type, None: credentials)
  updated_value = fauxfactory.gen_alpha(15, start: "edited_")
  update(credential) {
    if credential.credential_type == "Google Compute Engine"
      credential.service_account = updated_value
    else
      if credential.credential_type == "Amazon"
        credential.access_key = updated_value
      else
        credential.username = updated_value
      end
    end
  }
  view = navigate_to(credential, "Details")
  wait_for_changes = lambda do |field_name|
    cr_opts = view.entities.summary("Credential Options")
    wait_for(lambda{|| cr_opts.get_text_of(field_name) == updated_value}, fail_func: view.browser.selenium.refresh, delay: 10, timeout: 60)
  end
  if credential.credential_type == "Amazon"
    wait_for_changes.call("Access Key")
  else
    if credential.credential_type == "Google Compute Engine"
      wait_for_changes.call("Service Account Email Address")
    else
      wait_for_changes.call("Username")
    end
  end
  credential.delete()
end
def test_embed_tower_playbooks_list_changed(appliance, wait_for_ansible)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       initialEstimate: 1/6h
  #       tags: ansible_embed
  #   
  # Tests if playbooks list changed after playbooks repo removing
  playbooks = []
  REPOSITORIES = [cfme_data.ansible_links.playbook_repositories.embedded_ansible, cfme_data.ansible_links.playbook_repositories.embedded_tower]
  repositories_collection = appliance.collections.ansible_repositories
  for repo_url in REPOSITORIES
    repository = repositories_collection.create(fauxfactory.gen_alpha(start: "repo_"), repo_url, description: fauxfactory.gen_alpha(15, start: "repo_desc_"))
    playbooks.push(repository.playbooks.all().map{|playbook| playbook.name}.to_set)
    repository.delete()
  end
  raise unless !Set.new(playbooks[1]).issuperset(Set.new(playbooks[0]))
end
def test_control_crud_ansible_playbook_action(request, appliance, ansible_catalog_item, action_collection)
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Control
  #       initialEstimate: 1/12h
  #   
  action = action_collection.create(fauxfactory.gen_alphanumeric(15, start: "action_"), action_type: "Run Ansible Playbook", action_values: {"run_ansible_playbook" => {"playbook_catalog_item" => ansible_catalog_item.name, "inventory" => {"target_machine" => true}}})
  _finalizer = lambda do
    if is_bool(action.exists)
      appliance.rest_api.collections.actions.get(description: action.description).action.delete()
    end
  end
  update(action) {
    ipaddr = fauxfactory.gen_ipaddr()
    new_descr = fauxfactory.gen_alphanumeric(15, start: "edited_")
    action.description = new_descr
    action.run_ansible_playbook = {"inventory" => {"specific_hosts" => true, "hosts" => ipaddr}}
  }
  view = navigate_to(action, "Edit")
  raise unless view.description.value == new_descr
  raise unless view.run_ansible_playbook.inventory.hosts.value == ipaddr
  view.cancel_button.click()
  action.delete()
end
def test_control_add_ansible_playbook_action_invalid_address(request, appliance, ansible_catalog_item, action_collection)
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Control
  #       initialEstimate: 1/12h
  #   
  action = action_collection.create(fauxfactory.gen_alphanumeric(15, start: "action_"), action_type: "Run Ansible Playbook", action_values: {"run_ansible_playbook" => {"playbook_catalog_item" => ansible_catalog_item.name, "inventory" => {"specific_hosts" => true, "hosts" => "invalid_address_!@\#$%^&*"}}})
  _finalizer = lambda do
    if is_bool(action.exists)
      appliance.rest_api.collections.actions.get(description: action.description).action.delete()
    end
  end
  raise unless action.exists
  view = navigate_to(action, "Edit")
  raise unless view.run_ansible_playbook.inventory.hosts.value == "invalid_address_!@\#$%^&*"
  view.cancel_button.click()
end
def test_embedded_ansible_credential_with_private_key(request, wait_for_ansible, credentials_collection)
  # Automation for BZ https://bugzilla.redhat.com/show_bug.cgi?id=1439589
  # 
  #   Adding new ssh credentials via Automation/Ansible/Credentials, add new credentials does not
  #   actually create new credentials with ssh keys.
  # 
  #   Bugzilla:
  #       1439589
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       tags: ansible_embed
  #   
  credential = credentials_collection.create(fauxfactory.gen_alpha(start: "cred_"), "Machine", username: fauxfactory.gen_alpha(start: "usr_"), password: fauxfactory.gen_alpha(start: "pwd_"), private_key: private_key)
  request.addfinalizer(credential.delete)
  raise unless credential.exists
end
def test_embedded_ansible_repository_playbook_link(ansible_repository)
  # 
  #   Test clicking on playbooks cell from repository page and
  #   check it will navigate to the Playbooks area.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       initialEstimate: 1/6h
  #       tags: ansible_embed
  #   
  view = navigate_to(ansible_repository, "Playbooks")
  raise unless view.is_displayed
end
def test_embedded_ansible_repository_playbook_sub_dir(ansible_repository)
  # 
  #   The Embedded Ansible role should find playbooks in sub folders.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       initialEstimate: 1/6h
  #       tags: ansible_embed
  #   
  playbook_view = navigate_to(ansible_repository, "Playbooks")
  all_playbooks = playbook_view.entities.all_entity_names
  raise unless all_playbooks.include?("more_playbooks/hello_world.yml")
end
def test_embed_tower_repo_add_new_zone(appliance, ansible_repository, new_zone, request)
  # 
  #   Test whether repository or credentials on New Zone.
  # 
  #   Bugzilla:
  #       1656308
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       initialEstimate: 1/2h
  #       testSteps:
  #           1. Configure a CFME appliance with the Embedded Ansible provider
  #           2. Create a new zone
  #           3. Move the appliance into the new zone
  #           4. Add an embedded Ansible repository or credential
  #       expectedResults:
  #           1. Check Embedded Ansible Role is started.
  #           2.
  #           3.
  #           4. Check Repository or Credentials were added.
  #   
  raise unless ansible_repository.exists
  raise unless new_zone.description == appliance.server.zone.description
  repositories = appliance.collections.ansible_repositories
  begin
    playbooks_yaml = cfme_data.ansible_links.playbook_repositories
    playbook_name = request.getattr("param", "embedded_ansible")
  rescue [KeyError, NoMethodError]
    message = "Missing ansible_links content in cfme_data, cannot setup repository"
    logger.exception(message)
    pytest.skip(message)
  end
  repository = repositories.create(name: fauxfactory.gen_alpha(), url: playbooks_yaml.getattr(playbook_name), description: fauxfactory.gen_alpha(), scm_branch: "second_playbook_branch")
  view = navigate_to(repository, "Details")
  wait_for(lambda{|| repository.status == "successful"}, num_sec: 120, delay: 5, fail_func: view.toolbar.refresh.click)
  request.addfinalizer(repository.delete_if_exists)
  raise unless repository.exists
end
def test_embedded_ansible_repository_refresh(ansible_repository)
  # 
  #   Test if ansible playbooks list is updated in the UI when \"Refresh this
  #   Repository\"
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: critical
  #       initialEstimate: 1/6h
  #       tags: ansible_embed
  #   
  view = navigate_to(ansible_repository, "Details")
  view.toolbar.configuration.item_select("Refresh this Repository", handle_alert: true)
  wait_for(lambda{|| ansible_repository.created_date < ansible_repository.updated_date}, fail_func: view.toolbar.refresh.click, delay: 2, timeout: "5m")
end
