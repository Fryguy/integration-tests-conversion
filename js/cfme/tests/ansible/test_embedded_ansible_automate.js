require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/import_export");
include(Cfme.Automate.Import_export);
require_relative("cfme/automate/simulation");
include(Cfme.Automate.Simulation);
require_relative("cfme/control/explorer");
include(Cfme.Control.Explorer);
require_relative("cfme/fixtures/automate");
include(Cfme.Fixtures.Automate);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/services/service_catalogs/ui");
include(Cfme.Services.Service_catalogs.Ui);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/ftp");
include(Cfme.Utils.Ftp);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.long_running,

  pytest.mark.provider(
    [VMwareProvider],
    {selector: ONE_PER_TYPE, scope: "module"}
  ),

  test_requirements.ansible,
  pytest.mark.tier(3)
];

function ansible_credential(appliance, ansible_repository, full_template_modscope) {
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

function management_event_class(appliance, namespace) {
  appliance.collections.domains.instantiate("ManageIQ").namespaces.instantiate("System").namespaces.instantiate("Event").namespaces.instantiate("CustomEvent").classes.instantiate({name: "Alert"}).copy_to(namespace.domain);
  return appliance.collections.domains.instantiate(namespace.domain.name).namespaces.instantiate("System").namespaces.instantiate("Event").namespaces.instantiate("CustomEvent").classes.instantiate({name: "Alert"})
};

function management_event_method(management_event_class, ansible_repository) {
  return management_event_class.methods.create({
    name: fauxfactory.gen_alphanumeric({start: "meth_"}),
    location: "playbook",
    repository: ansible_repository.name,
    playbook: "copy_file_example.yml",
    machine_credential: "CFME Default Credential",
    playbook_input_parameters: [["key", "value", "string"]]
  })
};

function management_event_instance(management_event_class, management_event_method) {
  return management_event_class.instances.create({
    name: fauxfactory.gen_alphanumeric({start: "inst_"}),
    description: fauxfactory.gen_alphanumeric(),
    fields: {meth1: {value: management_event_method.name}}
  })
};

function custom_vm_button(appliance, ansible_catalog_item) {
  let buttongroup = appliance.collections.button_groups.create({
    text: fauxfactory.gen_alphanumeric({start: "grp_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "grp_hvr_"}),
    type: appliance.collections.button_groups.VM_INSTANCE
  });

  let button = buttongroup.buttons.create({
    type: "Ansible Playbook",
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
    playbook_cat_item: ansible_catalog_item.name
  });

  yield(button);
  button.delete_if_exists();
  buttongroup.delete_if_exists()
};

function alert(appliance, management_event_instance) {
  let _alert = appliance.collections.alerts.create(
    fauxfactory.gen_alpha(30, {start: "Trigger by Un-Tag Complete "}),

    {
      active: true,
      based_on: "VM and Instance",
      evaluate: "Nothing",
      driving_event: "Company Tag: Un-Tag Complete",
      notification_frequency: "1 Minute",
      mgmt_event: management_event_instance.name
    }
  );

  yield(_alert);
  _alert.delete_if_exists()
};

function alert_profile(appliance, alert, create_vm_modscope) {
  let _alert_profile = appliance.collections.alert_profiles.create(
    alert_profiles.VMInstanceAlertProfile,
    `Alert profile for ${create_vm_modscope.name}`,
    {alerts: [alert]}
  );

  _alert_profile.assign_to("The Enterprise");
  yield;
  _alert_profile.delete_if_exists()
};

function test_automate_ansible_playbook_method_type_crud(appliance, ansible_repository, klass) {
  // CRUD test for ansible playbook method.
  // 
  //   Bugzilla:
  //       1729999
  //       1740769
  // 
  //   Polarion:
  //       assignee: ghubale
  //       casecomponent: Automate
  //       initialEstimate: 1/12h
  //   
  let method = klass.methods.create({
    name: fauxfactory.gen_alphanumeric({start: "meth_"}),
    location: "playbook",
    repository: ansible_repository.name,
    playbook: "copy_file_example.yml",
    machine_credential: "CFME Default Credential",
    playbook_input_parameters: [["key", "value", "string"]]
  });

  update(method, () => method.name = fauxfactory.gen_alphanumeric());
  method.delete()
};

function test_automate_ansible_playbook_method_type(request, appliance, ansible_repository, domain, namespace, klass) {
  // Tests execution an ansible playbook via ansible playbook method using Simulation.
  // 
  //   Polarion:
  //       assignee: ghubale
  //       casecomponent: Automate
  //       initialEstimate: 1/4h
  //   
  klass.schema.add_field({
    name: "execute",
    type: "Method",
    data_type: "String"
  });

  let method = klass.methods.create({
    name: fauxfactory.gen_alphanumeric({start: "meth_"}),
    location: "playbook",
    repository: ansible_repository.name,
    playbook: "copy_file_example.yml",
    machine_credential: "CFME Default Credential",
    playbook_input_parameters: [["key", "value", "string"]]
  });

  let instance = klass.instances.create({
    name: fauxfactory.gen_alphanumeric({start: "inst_"}),
    description: fauxfactory.gen_alphanumeric(),
    fields: {execute: {value: method.name}}
  });

  simulate({appliance, request: "Call_Instance", attributes_values: {
    namespace: `${domain.name}/${namespace.name}`,
    class: klass.name,
    instance: instance.name
  }});

  request.addfinalizer(() => (
    appliance.ssh_client.run_command("[[ -f \"/var/tmp/modified-release\" ]] && rm -f \"/var/tmp/modified-release\"")
  ));

  if (!(appliance.ssh_client.run_command("[ -f \"/var/tmp/modified-release\" ]")).success) {
    throw new ()
  }
};

function test_ansible_playbook_button_crud(ansible_catalog_item, appliance, request) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //   
  let buttongroup = appliance.collections.button_groups.create({
    text: fauxfactory.gen_alphanumeric({start: "grp_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "grp_hvr_"}),
    type: appliance.collections.button_groups.VM_INSTANCE
  });

  request.addfinalizer(buttongroup.delete_if_exists);

  let button = buttongroup.buttons.create({
    type: "Ansible Playbook",
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
    playbook_cat_item: ansible_catalog_item.name
  });

  request.addfinalizer(button.delete_if_exists);
  if (!button.exists) throw new ();
  let view = navigate_to(button, "Details");
  if (view.text.text != button.text) throw new ();
  if (view.hover.text != button.hover) throw new ();

  let edited_hover = fauxfactory.gen_alphanumeric(
    15,
    {start: "edited_"}
  );

  update(button, () => button.hover = edited_hover);
  if (!button.exists) throw new ();
  view = navigate_to(button, "Details");
  if (view.hover.text != edited_hover) throw new ();
  button.delete({cancel: true});
  if (!button.exists) throw new ();
  button.delete();
  if (!!button.exists) throw new ()
};

function test_embedded_ansible_custom_button_localhost(create_vm_modscope, custom_vm_button, appliance, ansible_service_request_funcscope, ansible_service_funcscope, ansible_catalog_item) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       initialEstimate: 1/4h
  //   
  update(
    custom_vm_button,
    () => custom_vm_button.inventory = "Localhost"
  );

  let view = navigate_to(create_vm_modscope, "Details");
  view.toolbar.custom_button(custom_vm_button.group.text).item_select(custom_vm_button.text);
  let order_dialog_view = appliance.browser.create_view(OrderServiceCatalogView);
  order_dialog_view.submit_button.wait_displayed();
  order_dialog_view.fields("credential").fill("CFME Default Credential");
  order_dialog_view.submit_button.click();
  wait_for(ansible_service_request_funcscope.exists, {num_sec: 600});
  ansible_service_request_funcscope.wait_for_request();
  view = navigate_to(ansible_service_funcscope, "Details");
  let hosts = view.provisioning.details.get_text_of("Hosts");
  if (hosts != "localhost") throw new ();
  let status = (appliance.version < "5.11" ? "successful" : "Finished");
  if (view.provisioning.results.get_text_of("Status") != status) throw new ()
};

function test_embedded_ansible_custom_button_target_machine(create_vm_modscope, custom_vm_button, ansible_credential, appliance, ansible_service_request_funcscope, ansible_service_funcscope) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       initialEstimate: 1/4h
  //   
  update(
    custom_vm_button,
    () => custom_vm_button.inventory = "Target Machine"
  );

  let view = navigate_to(create_vm_modscope, "Details");
  view.toolbar.custom_button(custom_vm_button.group.text).item_select(custom_vm_button.text);
  let order_dialog_view = appliance.browser.create_view(OrderServiceCatalogView);
  order_dialog_view.submit_button.wait_displayed();
  order_dialog_view.fields("credential").fill(ansible_credential.name);
  order_dialog_view.submit_button.click();
  wait_for(ansible_service_request_funcscope.exists, {num_sec: 600});
  ansible_service_request_funcscope.wait_for_request();
  view = navigate_to(ansible_service_funcscope, "Details");
  let hosts = view.provisioning.details.get_text_of("Hosts");
  if (hosts != create_vm_modscope.ip_address) throw new ();
  let status = (appliance.version < "5.11" ? "successful" : "Finished");
  if (view.provisioning.results.get_text_of("Status") != status) throw new ()
};

function test_embedded_ansible_custom_button_specific_hosts(create_vm_modscope, custom_vm_button, ansible_credential, appliance, ansible_service_request_funcscope, ansible_service_funcscope) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       initialEstimate: 1/4h
  //   
  update(custom_vm_button, () => {
    custom_vm_button.inventory = "Specific Hosts";
    custom_vm_button.hosts = create_vm_modscope.ip_address
  });

  let view = navigate_to(create_vm_modscope, "Details");
  view.toolbar.custom_button(custom_vm_button.group.text).item_select(custom_vm_button.text);
  let order_dialog_view = appliance.browser.create_view(OrderServiceCatalogView);
  order_dialog_view.submit_button.wait_displayed();
  order_dialog_view.fields("credential").fill(ansible_credential.name);
  order_dialog_view.submit_button.click();
  wait_for(ansible_service_request_funcscope.exists, {num_sec: 600});
  ansible_service_request_funcscope.wait_for_request();
  view = navigate_to(ansible_service_funcscope, "Details");
  let hosts = view.provisioning.details.get_text_of("Hosts");
  if (hosts != create_vm_modscope.ip_address) throw new ();
  let status = (appliance.version < "5.11" ? "successful" : "Finished");
  if (view.provisioning.results.get_text_of("Status") != status) throw new ()
};

function test_alert_run_ansible_playbook(create_vm_modscope, alert_profile, request, appliance) {
  // Tests execution of an ansible playbook method by triggering a management event from an
  //   alert.
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Control
  //       initialEstimate: 1/6h
  //   
  let added_tag = create_vm_modscope.add_tag();
  create_vm_modscope.remove_tag(added_tag);

  request.addfinalizer(() => (
    appliance.ssh_client.run_command("[[ -f \"/var/tmp/modified-release\" ]] && rm -f \"/var/tmp/modified-release\"")
  ));

  try {
    wait_for(
      () => (
        (appliance.ssh_client.run_command("[ -f \"/var/tmp/modified-release\" ]")).success
      ),

      {timeout: 60}
    )
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      pytest.fail("Ansible playbook method hasn't been executed.")
    } else {
      throw $EXCEPTION
    }
  }
};

function setup_ansible_repository(appliance, wait_for_ansible) {
  let repositories = appliance.collections.ansible_repositories;

  let repository = repositories.create({
    name: "test_playbooks_automate",
    url: cfme_data.ansible_links.playbook_repositories.embedded_ansible,
    description: fauxfactory.gen_alpha()
  });

  let view = navigate_to(repository, "Details");

  wait_for(
    () => repository.status == "successful",
    {timeout: 60, fail_func: view.toolbar.refresh.click}
  );

  yield(repository);
  repository.delete_if_exists()
};

function test_variable_pass(request, appliance, setup_ansible_repository, import_datastore, import_data, instance, dialog, catalog) {
  // 
  //   Bugzilla:
  //       1678132
  //       1678135
  // 
  //   Polarion:
  //       assignee: ghubale
  //       initialEstimate: 1/8h
  //       caseposneg: positive
  //       casecomponent: Automate
  //       startsin: 5.11
  //       setup:
  //           1. Enable embedded ansible role
  //           2. Add Ansible repo called billy -
  //              https://github.com/ManageIQ/integration_tests_playbooks
  //           3. Copy Export zip (Ansible_State_Machine_for_Ansible_stats3.zip) to downloads
  //              directory(Zip file named - \'Automate domain\' is attached with BZ(1678135))
  //           4. Go to Automation>Automate>Import/Export and import zip file
  //           5. Click on \"Toggle All/None\" and hit the submit button
  //           6. Go to Automation>Automate>Explorer and Enable the imported domain
  //           7. Make sure all the playbook methods have all the information (see if Repository,
  //              Playbook and Machine credentials have values), update if needed
  //           8. Import or create hello_world (simple ansible dialog with Machine credentials and
  //              hosts fields)
  //       testSteps:
  //           1. Create a Generic service using the hello_world dialog.
  //           1a. Select instance \'CatalogItemInitialization_jira23\'(Note: This is the state machine
  //               which executes playbooks and inline method successively) then order service
  //           1b. Select instance \'CatalogItemInitialization_jira24\'(Note: This is the state machine
  //               which executes playbooks successively) then order service
  //           2. Run \"grep dump_vars2 automation.log\" from log directory
  //       expectedResults:
  //           1. Generic service catalog item created
  //           2. For 1a scenario: Variables should be passed through successive playbooks and you
  //              should see logs like this(https://bugzilla.redhat.com/show_bug.cgi?id=1678132#c5)
  //              For 1b scenario: Variables should be passed through successive playbooks and you
  //              should see logs like this(https://bugzilla.redhat.com/show_bug.cgi?id=1678135#c13)
  //   
  let entry_point = [
    "Datastore",
    `${import_datastore.name}`,
    "Service",
    "Provisioning",
    "StateMachines",
    "ServiceProvision_Template",
    `${instance}`
  ];

  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.GENERIC,

    {
      name: fauxfactory.gen_alphanumeric(15, {start: "cat_item_"}),
      description: fauxfactory.gen_alphanumeric(15, {start: "item_disc_"}),
      display_in: true,
      catalog,
      dialog,
      provisioning_entry_point: entry_point
    }
  );

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {matched_patterns: [".*if Fred is married to Wilma and Barney is married to Betty and Peebles and BamBam are the kids, then the tests work !!!.*"]}
  )).waiting({timeout: 120}, () => {
    let service_catalogs = ServiceCatalogs(
      appliance,
      catalog_item.catalog,
      catalog_item.name
    );

    service_catalogs.order();
    let request_description = "Provisioning Service [{0}] from [{0}]".format(catalog_item.name);
    let provision_request = appliance.collections.requests.instantiate(request_description);
    provision_request.wait_for_request({method: "ui"});
    request.addfinalizer(provision_request.remove_request)
  })
};

function test_import_domain_containing_playbook_method(request, appliance, setup_ansible_repository, import_data) {
  // This test case tests support of Export/Import of Domain with Ansible Method
  // 
  //   Bugzilla:
  //       1677575
  // 
  //   Polarion:
  //       assignee: ghubale
  //       initialEstimate: 1/8h
  //       caseimportance: high
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.11
  //       casecomponent: Automate
  //       tags: automate
  //       setup:
  //           1. Add playbook repository
  //           2. Create a new automate method with playbook type.
  //           3. Fill the required fields, for instance repository and playbook.
  //           4. Export this datastore.
  //           5. Playbook method fields are stored as a names instead of IDs. (this is not
  //              possible via automate need to check manually in method yaml)
  //       testSteps:
  //           1. Import the exported datastore and change name of playbook in method yaml to invalid
  //              playbook name(Note: These test steps needs to execute manually and then import
  //              datastore)
  //       expectedResults:
  //           1. Proper error should be displayed while importing datastore with invalid playbook
  //   
  let fs = FTPClientWrapper(cfme_data.ftpserver.entities.datastores);
  let file_path = fs.download(import_data.file_name);

  let datastore = appliance.collections.automate_import_exports.instantiate({
    import_type: "file",
    file_path
  });

  let domain = datastore.import_domain_from(
    import_data.from_domain,
    import_data.to_domain
  );

  request.addfinalizer(domain.delete_if_exists);
  let view = appliance.browser.create_view(FileImportSelectorView);
  let error_msg = `Playbook 'invalid_1677575.yml' not found in repository '${setup_ansible_repository.name}'`;
  view.flash.assert_message({text: error_msg, partial: true})
}
