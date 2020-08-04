require_relative("widgetastic/exceptions");
include(Widgetastic.Exceptions);
require_relative("widgetastic/exceptions");
include(Widgetastic.Exceptions);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
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
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.v2v,
  pytest.mark.customer_scenario,

  pytest.mark.provider({
    classes: [RHEVMProvider, OpenStackProvider],
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

function infra_map(appliance, source_provider, provider) {
  // Fixture to create infrastructure mapping
  let infra_mapping_data = infra_mapping_default_data(
    source_provider,
    provider
  );

  let infra_mapping_collection = appliance.collections.v2v_infra_mappings;
  let mapping = infra_mapping_collection.create({None: infra_mapping_data});
  yield(mapping);
  infra_mapping_collection.delete(mapping)
};

function migration_plan(appliance, infra_map, { csv = true }) {
  let import_btn;

  // Function to create migration plan and select csv import option
  if (is_bool(csv)) {
    import_btn = "Import a CSV file with a list of VMs to be migrated"
  } else {
    import_btn = "Choose from a list of VMs discovered in the selected infrastructure mapping"
  };

  let plan_obj = appliance.collections.v2v_migration_plans;
  let view = navigate_to(plan_obj, "Add");

  view.general.fill({
    infra_map: infra_map.name,
    name: fauxfactory.gen_alpha(10),
    description: fauxfactory.gen_alpha(10),
    choose_vm: import_btn
  });

  return view
};

function check_vm_status(appliance, infra_map, { filetype = "csv", content = false, table_hover = false, alert = false, security_group = false }) {
  let error_msg;

  // Function to import csv, select vm and return hover error from migration plan table
  let plan_view = migration_plan(appliance, infra_map);
  let temp_file = tempfile.NamedTemporaryFile({suffix: `.${filetype}`});
  if (is_bool(content)) open(temp_file.name, "w", f => f.write(content));

  // pass
  try {
    plan_view.vms.hidden_field.fill(temp_file.name)
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof UnexpectedAlertPresentException) {

    } else {
      throw $EXCEPTION
    }
  };

  if (is_bool(table_hover)) {
    wait_for(
      () => plan_view.vms.is_displayed,
      {timeout: 60, message: "Wait for VMs view", delay: 5}
    );

    if (table_hover == "duplicate") {
      plan_view.vms.table[0][1].widget.click()
    } else {
      plan_view.vms.table[0][1].widget.click()
    };

    if (is_bool(!security_group)) error_msg = plan_view.vms.popover_text.read()
  } else if (is_bool(alert)) {
    error_msg = plan_view.browser.get_alert().text;

    // pass
    try {
      plan_view.browser.handle_alert()
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NoSuchElementException) {

      } else {
        throw $EXCEPTION
      }
    }
  } else {
    error_msg = plan_view.vms.error_text.text
  };

  if (is_bool(security_group)) {
    plan_view.next_btn.click();
    plan_view.instance_properties.table.wait_displayed();
    let table_data = plan_view.instance_properties.table.read()[0];

    error_msg = {
      security_group: table_data["OpenStack Security Group"].to_s,
      flavor: table_data["OpenStack Flavor"].to_s
    }
  };

  plan_view.cancel_btn.click();
  return error_msg
};

function valid_vm(appliance, infra_map) {
  // Fixture to get valid vm name from discovery
  let plan_view = migration_plan(appliance, infra_map, {csv: false});

  wait_for(
    () => plan_view.vms.is_displayed,
    {timeout: 60, delay: 5, message: "Wait for VMs view"}
  );

  let vm_name = plan_view.vms.table.rows().map(row => row.vm_name.text)[0];
  plan_view.cancel_btn.click();
  return vm_name
};

function archived_vm(appliance, source_provider) {
  // Fixture to create archived vm
  let vm_obj = appliance.collections.infra_vms.instantiate(
    random_vm_name({context: "v2v-auto"}),
    source_provider
  );

  if (is_bool(!source_provider.mgmt.does_vm_exist(vm_obj.name))) {
    vm_obj.create_on_provider({find_in_cfme: true, allow_skip: "default"})
  };

  vm_obj.mgmt.delete();

  vm_obj.wait_for_vm_state_change({
    desired_state: "archived",
    timeout: 900,
    from_details: false,
    from_any_provider: true
  });

  return vm_obj.name
};

function test_non_csv(appliance, infra_map) {
  // Test non-csv file import
  //   Polarion:
  //       assignee: sshveta
  //       caseposneg: negative
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1/8h
  //   
  let error_text = "Invalid file extension. Only .csv files are accepted.";

  let hover_error = check_vm_status(
    appliance,
    infra_map,
    {filetype: "txt", alert: true}
  );

  if (error_text != hover_error) throw new ()
};

function test_blank_csv(appliance, infra_map) {
  // Test csv with blank file
  //   Polarion:
  //       assignee: sshveta
  //       caseposneg: negative
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1/8h
  //   
  let error_msg = "Error: Possibly a blank .CSV file";
  let hover_error = check_vm_status(appliance, infra_map);
  if (error_msg != hover_error) throw new ()
};

function test_column_headers(appliance, infra_map) {
  // Test csv with unsupported column header
  //   Polarion:
  //       assignee: sshveta
  //       caseposneg: positive
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1/8h
  //   
  let content = fauxfactory.gen_alpha(10);
  let error_msg = "Error: Required column 'Name' does not exist in the .CSV file";
  let hover_error = check_vm_status(appliance, infra_map, {content});
  if (error_msg != hover_error) throw new ()
};

function test_inconsistent_columns(appliance, infra_map) {
  // Test csv with extra inconsistent column value
  //   Polarion:
  //       assignee: sshveta
  //       caseposneg: negative
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1/8h
  //   
  let content = `Name\n{}, {}`.format(
    fauxfactory.gen_alpha(10),
    fauxfactory.gen_alpha(10)
  );

  let error_msg = "Error: Number of columns is inconsistent on line 2";
  let hover_error = check_vm_status(appliance, infra_map, {content});
  if (error_msg != hover_error) throw new ()
};

function test_csv_empty_vm(appliance, infra_map) {
  // Test csv with empty column value
  //   Polarion:
  //       assignee: sshveta
  //       caseposneg: positive
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1/8h
  //   
  let content = `Name\n\n`;
  let error_msg = "Empty name specified";

  let hover_error = check_vm_status(
    appliance,
    infra_map,
    {content, table_hover: true}
  );

  if (error_msg != hover_error) throw new ()
};

function test_csv_invalid_vm(appliance, infra_map) {
  // Test csv with invalid vm name
  //   Polarion:
  //       assignee: sshveta
  //       caseposneg: negative
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1/8h
  //   
  let content = `Name\n{}`.format(fauxfactory.gen_alpha(10));
  let error_msg = "VM does not exist";

  let hover_error = check_vm_status(
    appliance,
    infra_map,
    {content, table_hover: true}
  );

  if (error_msg != hover_error) throw new ()
};

function test_csv_valid_vm(appliance, infra_map, valid_vm) {
  // Test csv with valid vm name
  //   Polarion:
  //       assignee: sshveta
  //       caseposneg: positive
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1/8h
  //   
  let content = `Name\n${valid_vm}`;
  let error_msg = "VM available for migration";

  let hover_error = check_vm_status(
    appliance,
    infra_map,
    {content, table_hover: true}
  );

  if (error_msg != hover_error) throw new ()
};

function test_csv_duplicate_vm(appliance, infra_map, valid_vm) {
  // Test csv with duplicate vm name
  //   Polarion:
  //       assignee: sshveta
  //       caseposneg: positive
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1/8h
  //   
  let content = `Name\n${valid_vm}\n${valid_vm}`;
  let error_msg = "Duplicate VM";

  let hover_error = check_vm_status(
    appliance,
    infra_map,
    {content, table_hover: "duplicate"}
  );

  if (error_msg != hover_error) throw new ()
};

function test_csv_archived_vm(appliance, infra_map, archived_vm) {
  // Test csv with archived vm name
  //   Polarion:
  //       assignee: sshveta
  //       caseposneg: positive
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1/8h
  //   
  let content = `Name\n${archived_vm}`;
  let error_msg = "VM is inactive";

  let hover_error = check_vm_status(
    appliance,
    infra_map,
    {content, table_hover: true}
  );

  if (error_msg != hover_error) throw new ()
};

function test_csv_security_group_flavor(appliance, soft_assert, infra_map, valid_vm, provider) {
  // Test csv with secondary openstack security group and flavor
  //   Polarion:
  //       assignee: mnadeem
  //       caseposneg: positive
  //       startsin: 5.10
  //       casecomponent: V2V
  //       initialEstimate: 1/4h
  //   
  try {
    let security_group = provider.data.security_groups.admin[1];
    let flavor = provider.data.flavors[1]
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof [NoMethodError, KeyError]) {
      pytest.skip("No provider data found.")
    } else {
      throw $EXCEPTION
    }
  };

  let content = `Name,Security Group,Flavor\n${valid_vm},${security_group},${flavor}\n`;

  let expected_attributes = check_vm_status(
    appliance,
    infra_map,
    {content, table_hover: true, security_group: true}
  );

  soft_assert.call(expected_attributes.security_group == security_group);
  if (![flavor, `${flavor} *`].include(expected_attributes.flavor)) throw new ()
}
