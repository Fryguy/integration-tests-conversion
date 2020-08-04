require_relative("widgetastic/widget");
include(Widgetastic.Widget);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/fixtures/templates");
include(Cfme.Fixtures.Templates);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/v2v/migration_settings");
include(Cfme.V2v.Migration_settings);

let pytestmark = [
  test_requirements.v2v,

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

function test_migration_throttling(request, appliance, provider, source_type, dest_type, template_type, mapping_data_multiple_vm_obj_single_datastore) {
  let host_names;

  // 
  //   Polarion:
  //       assignee: sshveta
  //       casecomponent: V2V
  //       initialEstimate: 1/4h
  //       caseimportance: high
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //   
  let migration_settings = MigrationSettings(appliance);
  migration_settings.migration_throttling.set_max_migration_per_conv_host("2");
  let infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings;
  let mapping_data = mapping_data_multiple_vm_obj_single_datastore.infra_mapping_data;
  let mapping = infrastructure_mapping_collection.create({None: mapping_data});
  let migration_plan_collection = appliance.collections.v2v_migration_plans;

  let migration_plan = migration_plan_collection.create({
    name: fauxfactory.gen_alphanumeric({start: "plan_"}),
    description: fauxfactory.gen_alphanumeric(15, {start: "plan_desc_"}),
    infra_map: mapping.name,
    vm_list: mapping_data_multiple_vm_obj_single_datastore.vm_list,
    target_provider: provider
  });

  if (!migration_plan.wait_for_state("Started")) throw new ();
  let request_details_list = migration_plan.get_plan_vm_list({wait_for_migration: false});
  let vms = request_details_list.read();

  let _cleanup = () => {
    infrastructure_mapping_collection.delete(mapping);
    return request_details_list.cancel_migration(vm, {confirmed: true})
  };

  let conversion_host_popup = [];

  if (is_bool(provider.one_of(RHEVMProvider))) {
    host_names = provider.hosts.all().map(h => h.name)
  } else {
    host_names = provider.data.conversion_instances
  };

  for (let vm in vms) {
    try {
      let popup_text = request_details_list.read_additional_info_popup(vm);

      if (host_names.include(popup_text["Conversion Host"])) {
        conversion_host_popup.push(popup_text["Conversion Host"]);
        request_details_list.open_additional_info_popup(vm)
      }
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NoSuchElementException) {
        continue
      } else {
        throw $EXCEPTION
      }
    }
  };

  for (let conv_host in conversion_host_popup) {
    if (conversion_host_popup.count(conv_host) > 2) throw new ()
  }
}
