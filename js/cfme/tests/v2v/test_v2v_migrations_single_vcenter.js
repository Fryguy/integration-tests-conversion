// Test to validate End-to-End migrations- functional testing.
require_relative("widgetastic/exceptions");
include(Widgetastic.Exceptions);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/fixtures/templates");
include(Cfme.Fixtures.Templates);
require_relative("cfme/fixtures/templates");
include(Cfme.Fixtures.Templates);
require_relative("cfme/fixtures/v2v_fixtures");
include(Cfme.Fixtures.V2v_fixtures);
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
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

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
    selector: ONE_PER_TYPE,
    required_flags: ["v2v"],
    fixture_name: "source_provider",
    scope: "module"
  }),

  pytest.mark.usefixtures("v2v_provider_setup")
];

function test_single_vm_migration_power_state_tags_retirement(appliance, provider, mapping_data_vm_obj_mini, power_state) {
  // 
  //   Polarion:
  //       assignee: sshveta
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1h
  //   
  let src_vm = mapping_data_vm_obj_mini.vm_list[0];

  if (!src_vm.mgmt.state.include(power_state)) {
    if (power_state == "RUNNING") {
      src_vm.mgmt.start()
    } else if (power_state == "STOPPED") {
      src_vm.mgmt.stop()
    }
  };

  let tag = (((appliance.collections.categories.instantiate({display_name: "Owner *"})).collections).tags).instantiate({display_name: "Production Linux Team"});
  src_vm.add_tag(tag);
  src_vm.set_retirement_date({offset: {hours: 1}});
  let migration_plan_collection = appliance.collections.v2v_migration_plans;

  let migration_plan = migration_plan_collection.create({
    name: fauxfactory.gen_alphanumeric({start: "plan_"}),
    description: fauxfactory.gen_alphanumeric(15, {start: "plan_desc_"}),
    infra_map: mapping_data_vm_obj_mini.infra_mapping_data.get("name"),
    vm_list: mapping_data_vm_obj_mini.vm_list,
    target_provider: provider
  });

  if (!migration_plan.wait_for_state("Started")) throw new ();
  if (!migration_plan.wait_for_state("In_Progress")) throw new ();
  if (!migration_plan.wait_for_state("Completed")) throw new ();
  if (!migration_plan.wait_for_state("Successful")) throw new ();
  let migrated_vm = get_migrated_vm(src_vm, provider);
  if (!migrated_vm.mgmt.state.include(power_state)) throw new ();
  let collection = provider.appliance.provider_based_collection(provider);
  let vm_obj = collection.instantiate(migrated_vm.name, provider);
  let owner_tag = null;

  for (let t in vm_obj.get_tags()) {
    if (t.display_name.include(tag.display_name)) owner_tag = t
  };

  if (!!owner_tag.equal(null) || !owner_tag.display_name.include(tag.display_name)) {
    throw new ()
  };

  if (!!vm_obj.retirement_date.include("Never")) throw new ()
};

function test_multi_host_multi_vm_migration(request, appliance, provider, source_type, dest_type, template_type, mapping_data_multiple_vm_obj_single_datastore) {
  let host_creds;

  // 
  //   Polarion:
  //       assignee: sshveta
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1h
  //   
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
  let match = ["Converting", "Migrating"];

  let _is_migration_started = (vm) => {
    if (is_bool(match.map(string => (
      request_details_list.get_message_text(vm).include(string)
    )).is_any)) return true;

    return false
  };

  for (let vm in vms) {
    wait_for({
      func: _is_migration_started,
      func_args: [vm],
      message: "migration has not started for all VMs",
      delay: 5,
      num_sec: 300
    })
  };

  if (is_bool(provider.one_of(OpenStackProvider))) {
    host_creds = provider.appliance.collections.openstack_nodes.all()
  } else {
    host_creds = provider.hosts.all()
  };

  let hosts_dict = host_creds.map(key => [key.name, []]).to_h;

  for (let vm in vms) {
    let popup_text = request_details_list.read_additional_info_popup(vm);
    request_details_list.open_additional_info_popup(vm);

    if (hosts_dict.include(popup_text["Conversion Host"])) {
      hosts_dict[popup_text["Conversion Host"]].push(vm)
    }
  };

  for (let host in hosts_dict) {
    if (hosts_dict[host].size > 0) {
      logger.info("Host: {} is migrating VMs: {}".format(
        host,
        hosts_dict[host]
      ))
    }
  };

  if (!migration_plan.wait_for_state("In_Progress")) throw new ();
  if (!migration_plan.wait_for_state("Completed")) throw new ();
  if (!migration_plan.wait_for_state("Successful")) throw new ()
};

function test_migration_special_char_name(appliance, provider, request, mapping_data_vm_obj_mini) {
  // Tests migration where name of migration plan is comprised of special non-alphanumeric
  //      characters, such as '@\#$(&\#@('.
  // 
  //   Polarion:
  //       assignee: sshveta
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1h
  //   
  let migration_plan_collection = appliance.collections.v2v_migration_plans;

  let migration_plan = migration_plan_collection.create({
    name: fauxfactory.gen_alphanumeric({start: "plan_"}),
    description: fauxfactory.gen_alphanumeric({start: "plan_desc_"}),
    infra_map: mapping_data_vm_obj_mini.infra_mapping_data.get("name"),
    vm_list: mapping_data_vm_obj_mini.vm_list,
    target_provider: provider
  });

  if (!migration_plan.wait_for_state("Started")) throw new ();
  if (!migration_plan.wait_for_state("In_Progress")) throw new ();
  if (!migration_plan.wait_for_state("Completed")) throw new ();
  if (!migration_plan.wait_for_state("Successful")) throw new ();
  let src_vm = mapping_data_vm_obj_mini.vm_list[0];
  let migrated_vm = get_migrated_vm(src_vm, provider);
  let _cleanup = () => cleanup_target(provider, migrated_vm);
  if (src_vm.mac_address != migrated_vm.mac_address) throw new ()
};

function test_migration_long_name(request, appliance, provider, source_provider) {
  // Test to check VM name with 64 character should work
  // 
  //   Polarion:
  //       assignee: sshveta
  //       initialEstimate: 1/2h
  //       casecomponent: V2V
  //   
  let source_datastores_list = source_provider.data.get(
    "datastores",
    []
  );

  let source_datastore = source_datastores_list.select(d => d.type == "nfs").map(d => (
    d.name
  ))[0];

  let collection = appliance.provider_based_collection(source_provider);

  let vm_name = "{vm_name}{extra_words}".format({
    vm_name: random_vm_name({context: "v2v"}),
    extra_words: fauxfactory.gen_alpha(51)
  });

  let template = _get_template(
    source_provider,
    Templates.RHEL7_MINIMAL
  );

  let vm_obj = collection.instantiate({
    name: vm_name,
    provider: source_provider,
    template_name: template.name
  });

  vm_obj.create_on_provider({
    timeout: 2400,
    find_in_cfme: true,
    allow_skip: "default",
    datastore: source_datastore
  });

  request.addfinalizer(() => vm_obj.cleanup_on_provider());

  let mapping_data = infra_mapping_default_data(
    source_provider,
    provider
  );

  let infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings;
  let mapping = infrastructure_mapping_collection.create({None: mapping_data});
  let _cleanup = () => infrastructure_mapping_collection.delete(mapping);
  let migration_plan_collection = appliance.collections.v2v_migration_plans;

  let migration_plan = migration_plan_collection.create({
    name: fauxfactory.gen_alphanumeric(20, {start: "long_name_"}),

    description: fauxfactory.gen_alphanumeric(
      25,
      {start: "desc_long_name_"}
    ),

    infra_map: mapping.name,
    vm_list: [vm_obj],
    target_provider: provider
  });

  if (!migration_plan.wait_for_state("Started")) throw new ();
  if (!migration_plan.wait_for_state("In_Progress")) throw new ();
  if (!migration_plan.wait_for_state("Completed")) throw new ();
  if (!migration_plan.wait_for_state("Successful")) throw new ();
  let migrated_vm = get_migrated_vm(vm_obj, provider);
  if (vm_obj.mac_address != migrated_vm.mac_address) throw new ()
};

function test_migration_with_edited_mapping(request, appliance, source_provider, provider, source_type, dest_type, template_type, mapping_data_vm_obj_single_datastore) {
  // 
  //       Test migration with edited infrastructure mapping.
  //       Polarion:
  //           assignee: sshveta
  //           caseimportance: medium
  //           caseposneg: positive
  //           testtype: functional
  //           startsin: 5.10
  //           casecomponent: V2V
  //           initialEstimate: 1h
  //       
  let infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings;

  let mapping_data = infra_mapping_default_data(
    source_provider,
    provider
  );

  let mapping = infrastructure_mapping_collection.create({None: mapping_data});
  mapping.update(mapping_data_vm_obj_single_datastore.infra_mapping_data);
  let src_vm_obj = mapping_data_vm_obj_single_datastore.vm_list[0];
  let migration_plan_collection = appliance.collections.v2v_migration_plans;

  let migration_plan = migration_plan_collection.create({
    name: fauxfactory.gen_alphanumeric({start: "plan_"}),
    description: fauxfactory.gen_alphanumeric(15, {start: "plan_desc_"}),
    infra_map: mapping.name,
    vm_list: mapping_data_vm_obj_single_datastore.vm_list,
    target_provider: provider
  });

  if (!migration_plan.wait_for_state("Started")) throw new ();
  if (!migration_plan.wait_for_state("In_Progress")) throw new ();
  if (!migration_plan.wait_for_state("Completed")) throw new ();
  if (!migration_plan.wait_for_state("Successful")) throw new ();
  let migrated_vm = get_migrated_vm(src_vm_obj, provider);

  let _cleanup = () => {
    infrastructure_mapping_collection.delete(mapping);
    return cleanup_target(provider, migrated_vm)
  };

  if (src_vm_obj.mac_address != migrated_vm.mac_address) throw new ()
};

function test_migration_restart(request, appliance, provider, source_type, dest_type, template_type, mapping_data_vm_obj_single_datastore) {
  // 
  //   Test migration by restarting evmserverd in middle of the process
  // 
  //   Polarion:
  //       assignee: sshveta
  //       initialEstimate: 1h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: V2V
  //   
  let infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings;
  let mapping_data = mapping_data_vm_obj_single_datastore.infra_mapping_data;
  let mapping = infrastructure_mapping_collection.create({None: mapping_data});
  let src_vm_obj = mapping_data_vm_obj_single_datastore.vm_list[0];
  let migration_plan_collection = appliance.collections.v2v_migration_plans;

  let migration_plan = migration_plan_collection.create({
    name: fauxfactory.gen_alphanumeric({start: "plan_"}),
    description: fauxfactory.gen_alphanumeric(15, {start: "plan_desc_"}),
    infra_map: mapping.name,
    target_provider: provider,
    vm_list: mapping_data_vm_obj_single_datastore.vm_list
  });

  let view = navigate_to(migration_plan, "InProgress");
  if (!migration_plan.wait_for_state("Started")) throw new ();

  let _system_reboot = () => {
    let ds_percent = view.progress_card.get_progress_percent(migration_plan.name).datastores.to_i;

    if (ds_percent > 10) {
      appliance.restart_evm_rude();
      return true
    } else {
      return false
    }
  };

  wait_for({
    func: _system_reboot,
    message: "migration plan is in progress, be patient please",
    delay: 10,
    num_sec: 1800
  });

  appliance.wait_for_web_ui();

  // pass
  try {
    if (!migration_plan.wait_for_state("In_Progress")) throw new ()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof WebDriverException) {

    } else {
      throw $EXCEPTION
    }
  };

  if (!migration_plan.wait_for_state("Completed")) throw new ();
  if (!migration_plan.wait_for_state("Successful")) throw new ();
  let migrated_vm = get_migrated_vm(src_vm_obj, provider);

  let _cleanup = () => {
    infrastructure_mapping_collection.delete(mapping);
    return cleanup_target(provider, migrated_vm)
  };

  if (src_vm_obj.mac_address != migrated_vm.mac_address) throw new ()
};

function test_if_no_password_is_exposed_in_logs_during_migration(appliance, source_provider, provider, request, mapping_data_vm_obj_mini) {
  // 
  //   title: OSP: Test if no password is exposed in logs during migration
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: V2V
  //       initialEstimate: 1/8h
  //       startsin: 5.10
  //       subcomponent: OSP
  //       testSteps:
  //           1. Create infrastructure mapping for Vmware to OSP/RHV
  //           2. Create migration plan
  //           3. Start migration
  //       expectedResults:
  //           1. Mapping created and visible in UI
  //           2.
  //           3. logs should not show password during migration
  //   
  let cred = [];
  let ssh_key_name = source_provider.data["private-keys"]["vmware-ssh-key"].credentials;
  cred.push(credentials[source_provider.data.get("credentials")].password);
  cred.push(credentials[ssh_key_name].password);
  cred.push(credentials[provider.data.get("credentials")].password);

  if (is_bool(provider.one_of(OpenStackProvider))) {
    let osp_key_name = provider.data["private-keys"].conversion_host_ssh_key.credentials;
    cred.push(credentials[osp_key_name].password)
  };

  let automation_log = LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {failure_patterns: cred, hostname: appliance.hostname}
  );

  let evm_log = LogValidator(
    "/var/www/miq/vmdb/log/evm.log",
    {failure_patterns: cred, hostname: appliance.hostname}
  );

  automation_log.start_monitoring();
  evm_log.start_monitoring();
  let migration_plan_collection = appliance.collections.v2v_migration_plans;

  let migration_plan = migration_plan_collection.create({
    name: fauxfactory.gen_alphanumeric({start: "plan_"}),
    description: fauxfactory.gen_alphanumeric({start: "plan_desc_"}),
    infra_map: mapping_data_vm_obj_mini.infra_mapping_data.get("name"),
    vm_list: mapping_data_vm_obj_mini.vm_list,
    target_provider: provider
  });

  if (!migration_plan.wait_for_state("Started")) throw new ();
  if (!migration_plan.wait_for_state("In_Progress")) throw new ();
  if (!migration_plan.wait_for_state("Completed")) throw new ();
  if (!migration_plan.wait_for_state("Successful")) throw new ();
  let src_vm = mapping_data_vm_obj_mini.vm_list[0];
  let migrated_vm = get_migrated_vm(src_vm, provider);

  let _cleanup = () => {
    cleanup_target(provider, migrated_vm);
    return migration_plan.delete_completed_plan()
  };

  if (!automation_log.validate()) throw new ();
  if (!evm_log.validate()) throw new ()
}
