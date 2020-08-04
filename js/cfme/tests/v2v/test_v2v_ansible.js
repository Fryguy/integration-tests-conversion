require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/fixtures/templates");
include(Cfme.Fixtures.Templates);
require_relative("cfme/fixtures/v2v_fixtures");
include(Cfme.Fixtures.V2v_fixtures);
require_relative("cfme/fixtures/v2v_fixtures");
include(Cfme.Fixtures.V2v_fixtures);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.v2v,
  pytest.mark.meta({server_roles: ["+embedded_ansible"]}),

  pytest.mark.provider({
    classes: [OpenStackProvider, RHEVMProvider],
    selector: ONE_PER_VERSION,
    required_flags: ["v2v"],
    scope: "module"
  }),

  pytest.mark.provider({
    classes: [VMwareProvider],
    selector: ONE_PER_TYPE,
    fixture_name: "source_provider",
    required_flags: ["v2v"],
    scope: "module"
  }),

  pytest.mark.usefixtures("v2v_provider_setup")
];

function ansible_repository(appliance) {
  // Fixture to add ansible repository
  appliance.wait_for_embedded_ansible();
  let repositories = appliance.collections.ansible_repositories;

  try {
    let repository = repositories.create({
      name: fauxfactory.gen_alpha(),
      url: cfme_data.ansible_links.playbook_repositories.v2v,
      description: fauxfactory.gen_alpha()
    })
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip("Skipping since no such key found in yaml")
    } else {
      throw $EXCEPTION
    }
  };

  let view = navigate_to(repository, "Details");

  wait_for(
    () => (
      view.entities.summary("Properties").get_text_of("Status") == "successful"
    ),

    {delay: 10, timeout: 60, fail_func: view.toolbar.refresh.click}
  );

  yield(repository);
  if (is_bool(repository.exists)) repository.delete()
};

function catalog_item(request, appliance, machine_credential, ansible_repository, playbook_type) {
  // Add provisioning and retire ansible catalog item
  let cat_item = appliance.collections.catalog_items.create({
    catalog_item_class: appliance.collections.catalog_items.ANSIBLE_PLAYBOOK,
    name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),

    provisioning: {
      repository: ansible_repository.name,
      playbook: `${playbook_type}.yml`,
      machine_credential: machine_credential,
      create_new: true,
      provisioning_dialog_name: fauxfactory.gen_alphanumeric()
    }
  });

  let _cleanup = () => {
    if (is_bool(cat_item.exists)) return cat_item.delete()
  };

  return cat_item
};

function test_migration_playbooks(request, appliance, source_provider, provider, ansible_repository, source_type, dest_type, template_type, mapping_data_vm_obj_single_datastore) {
  // 
  //   Test for migrating vms with pre and post playbooks
  // 
  //   Polarion:
  //       assignee: sshveta
  //       caseimportance: medium
  //       caseposneg: positive
  //       casecomponent: V2V
  //       testtype: functional
  //       initialEstimate: 1/4h
  //       startsin: 5.10
  //       testSteps:
  //           1. Enable embedded ansible role
  //           2. Create repository
  //           3. Create credentials
  //           4. Create ansible catalog item with provision.yml playbook
  //           5. Create ansible catalog item with retire.yml playbook
  //           6. Migrate VM from vmware to RHV/OSP using the above catalog items
  //   
  ["Machine", {
    username: creds.username,
    password: creds.password,
    privilage_escalation: "sudo"
  }];

  let credential = appliance.collections.ansible_credentials.create({
    name: "{type}_credential_{cred}".format({
      type: CREDENTIALS[0],
      cred: fauxfactory.gen_alpha()
    }),

    credential_type: CREDENTIALS[0],
    None: CREDENTIALS[1]
  });

  let provision_catalog = catalog_item(
    request,
    appliance,
    credential.name,
    ansible_repository,
    "provision"
  );

  let retire_catalog = catalog_item(
    request,
    appliance,
    credential.name,
    ansible_repository,
    "retire"
  );

  let infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings;
  let mapping_data = mapping_data_vm_obj_single_datastore.infra_mapping_data;
  let mapping = infrastructure_mapping_collection.create({None: mapping_data});
  let src_vm_obj = mapping_data_vm_obj_single_datastore.vm_list[0];
  let migration_plan_collection = appliance.collections.v2v_migration_plans;

  let migration_plan = migration_plan_collection.create({
    name: fauxfactory.gen_alphanumeric({start: "plan_"}),
    description: fauxfactory.gen_alphanumeric(15, {start: "plan_desc_"}),
    infra_map: mapping.name,
    vm_list: mapping_data_vm_obj_single_datastore.vm_list,
    target_provider: provider,
    pre_playbook: provision_catalog.name,
    post_playbook: retire_catalog.name,
    pre_checkbox: true,
    post_checkbox: true
  });

  if (!migration_plan.wait_for_state("Started")) throw new ();
  if (!migration_plan.wait_for_state("In_Progress")) throw new ();
  if (!migration_plan.wait_for_state("Completed")) throw new ();
  if (!migration_plan.wait_for_state("Successful")) throw new ();
  let view = navigate_to(migration_plan, "CompletedPlanDetails");
  view.download_logs.item_select("Premigration log");
  view.flash.assert_no_error();

  wait_for(
    () => view.download_logs.item_enabled("Postmigration log"),
    {timeout: 5}
  );

  view.download_logs.item_select("Postmigration log");
  view.flash.assert_no_error();
  let migrated_vm = get_migrated_vm(src_vm_obj, provider);

  let _cleanup = () => {
    infrastructure_mapping_collection.delete(mapping);
    return cleanup_target(provider, migrated_vm)
  };

  if (src_vm_obj.mac_address != migrated_vm.mac_address) throw new ()
}
