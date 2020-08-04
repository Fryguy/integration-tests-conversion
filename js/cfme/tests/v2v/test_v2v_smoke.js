// Test to validate End-to-End migrations- functional testing.
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

let pytestmark = [
  test_requirements.v2v,

  pytest.mark.provider({
    classes: [RHEVMProvider, OpenStackProvider],
    selector: ONE_PER_VERSION,
    required_flags: ["v2v"],
    scope: "module"
  }),

  pytest.mark.provider({
    classes: [VMwareProvider],
    selector: ONE_PER_VERSION,
    fixture_name: "source_provider",
    required_flags: ["v2v"],
    scope: "module"
  }),

  pytest.mark.usefixtures("v2v_provider_setup")
];

function test_single_vm_migration_with_ssh_and_vddk(request, appliance, provider, source_type, dest_type, template_type, mapping_data_vm_obj_single_datastore) {
  // 
  //   Polarion:
  //       assignee: nachandr
  //       caseimportance: high
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1h
  //   
  let infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings;
  let mapping_data = mapping_data_vm_obj_single_datastore.infra_mapping_data;
  let mapping = infrastructure_mapping_collection.create({None: mapping_data});
  let migration_plan_collection = appliance.collections.v2v_migration_plans;

  let migration_plan = migration_plan_collection.create({
    name: fauxfactory.gen_alphanumeric({start: "plan_"}),
    description: fauxfactory.gen_alphanumeric(15, {start: "plan_desc_"}),
    infra_map: mapping.name,
    target_provider: provider,
    vm_list: mapping_data_vm_obj_single_datastore.vm_list
  });

  if (!migration_plan.wait_for_state("Started")) throw new ();
  if (!migration_plan.wait_for_state("In_Progress")) throw new ();
  if (!migration_plan.wait_for_state("Completed")) throw new ();
  if (!migration_plan.wait_for_state("Successful")) throw new ();
  let src_vm = mapping_data_vm_obj_single_datastore.vm_list.pop();
  let migrated_vm = get_migrated_vm(src_vm, provider);

  let _cleanup = () => {
    infrastructure_mapping_collection.delete(mapping);
    return cleanup_target(provider, migrated_vm)
  };

  if (src_vm.mac_address != migrated_vm.mac_address) throw new ()
}
