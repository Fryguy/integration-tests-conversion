require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/fixtures/templates'
include Cfme::Fixtures::Templates
require_relative 'cfme/fixtures/v2v_fixtures'
include Cfme::Fixtures::V2v_fixtures
require_relative 'cfme/fixtures/v2v_fixtures'
include Cfme::Fixtures::V2v_fixtures
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.v2v, pytest.mark.meta(server_roles: ["+embedded_ansible"]), pytest.mark.provider(classes: [OpenStackProvider, RHEVMProvider], selector: ONE_PER_VERSION, required_flags: ["v2v"], scope: "module"), pytest.mark.provider(classes: [VMwareProvider], selector: ONE_PER_TYPE, fixture_name: "source_provider", required_flags: ["v2v"], scope: "module"), pytest.mark.usefixtures("v2v_provider_setup")]
def ansible_repository(appliance)
  # Fixture to add ansible repository
  appliance.wait_for_embedded_ansible()
  repositories = appliance.collections.ansible_repositories
  begin
    repository = repositories.create(name: fauxfactory.gen_alpha(), url: cfme_data.ansible_links.playbook_repositories.v2v, description: fauxfactory.gen_alpha())
  rescue KeyError
    pytest.skip("Skipping since no such key found in yaml")
  end
  view = navigate_to(repository, "Details")
  wait_for(lambda{|| view.entities.summary("Properties").get_text_of("Status") == "successful"}, delay: 10, timeout: 60, fail_func: view.toolbar.refresh.click)
  yield(repository)
  if is_bool(repository.exists)
    repository.delete()
  end
end
def catalog_item(request, appliance, machine_credential, ansible_repository, playbook_type)
  # Add provisioning and retire ansible catalog item
  cat_item = appliance.collections.catalog_items.create(catalog_item_class: appliance.collections.catalog_items.ANSIBLE_PLAYBOOK, name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), provisioning: {"repository" => ansible_repository.name, "playbook" => "#{playbook_type}.yml", "machine_credential" => machine_credential, "create_new" => true, "provisioning_dialog_name" => fauxfactory.gen_alphanumeric()})
  _cleanup = lambda do
    if is_bool(cat_item.exists)
      cat_item.delete()
    end
  end
  return cat_item
end
def test_migration_playbooks(request, appliance, source_provider, provider, ansible_repository, source_type, dest_type, template_type, mapping_data_vm_obj_single_datastore)
  # 
  #   Test for migrating vms with pre and post playbooks
  # 
  #   Polarion:
  #       assignee: sshveta
  #       caseimportance: medium
  #       caseposneg: positive
  #       casecomponent: V2V
  #       testtype: functional
  #       initialEstimate: 1/4h
  #       startsin: 5.10
  #       testSteps:
  #           1. Enable embedded ansible role
  #           2. Create repository
  #           3. Create credentials
  #           4. Create ansible catalog item with provision.yml playbook
  #           5. Create ansible catalog item with retire.yml playbook
  #           6. Migrate VM from vmware to RHV/OSP using the above catalog items
  #   
  begin
    creds = credentials[source_provider.data.templates.get("rhel7_minimal", {})["creds"]]
  rescue KeyError
    pytest.skip("Credentials not found for template")
  end
  CREDENTIALS = ["Machine", {"username" => creds.username, "password" => creds.password, "privilage_escalation" => "sudo"}]
  credential = appliance.collections.ansible_credentials.create(name: "{type}_credential_{cred}".format(type: CREDENTIALS[0], cred: fauxfactory.gen_alpha()), credential_type: CREDENTIALS[0], None: CREDENTIALS[1])
  provision_catalog = catalog_item(request, appliance, credential.name, ansible_repository, "provision")
  retire_catalog = catalog_item(request, appliance, credential.name, ansible_repository, "retire")
  infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings
  mapping_data = mapping_data_vm_obj_single_datastore.infra_mapping_data
  mapping = infrastructure_mapping_collection.create(None: mapping_data)
  src_vm_obj = mapping_data_vm_obj_single_datastore.vm_list[0]
  migration_plan_collection = appliance.collections.v2v_migration_plans
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping.name, vm_list: mapping_data_vm_obj_single_datastore.vm_list, target_provider: provider, pre_playbook: provision_catalog.name, post_playbook: retire_catalog.name, pre_checkbox: true, post_checkbox: true)
  raise unless migration_plan.wait_for_state("Started")
  raise unless migration_plan.wait_for_state("In_Progress")
  raise unless migration_plan.wait_for_state("Completed")
  raise unless migration_plan.wait_for_state("Successful")
  view = navigate_to(migration_plan, "CompletedPlanDetails")
  view.download_logs.item_select("Premigration log")
  view.flash.assert_no_error()
  wait_for(lambda{|| view.download_logs.item_enabled("Postmigration log")}, timeout: 5)
  view.download_logs.item_select("Postmigration log")
  view.flash.assert_no_error()
  migrated_vm = get_migrated_vm(src_vm_obj, provider)
  _cleanup = lambda do
    infrastructure_mapping_collection.delete(mapping)
    cleanup_target(provider, migrated_vm)
  end
  raise unless src_vm_obj.mac_address == migrated_vm.mac_address
end
