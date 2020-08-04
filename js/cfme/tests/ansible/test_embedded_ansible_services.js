require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/control/explorer/policies");
include(Cfme.Control.Explorer.Policies);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/services/myservice");
include(Cfme.Services.Myservice);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.long_running,
  pytest.mark.meta({blockers: [BZ(1677548, {forced_streams: ["5.11"]})]}),
  test_requirements.ansible
];

const SERVICE_CATALOG_VALUES = [
  ["default", null, "localhost"],
  ["blank", "", "localhost"],
  ["unavailable_host", "unavailable_host", "unavailable_host"]
];

const CREDENTIALS = [
  ["Amazon", "", "list_ec2_instances.yml"],
  ["VMware", "vcenter_host", "gather_all_vms_from_vmware.yml"],
  ["Red Hat Virtualization", "host", "get_vms_facts_rhv.yaml"],
  ["Azure", "", "get_resourcegroup_facts_azure.yml"]
];

function local_ansible_catalog_item(appliance, ansible_repository) {
  // override global ansible_catalog_item for function scope
  //       as these tests modify the catalog item
  //   
  let collection = appliance.collections.catalog_items;

  let cat_item = collection.create(
    collection.ANSIBLE_PLAYBOOK,
    fauxfactory.gen_alphanumeric(),
    fauxfactory.gen_alphanumeric(),

    {
      display_in_catalog: true,

      provisioning: {
        repository: ansible_repository.name,
        playbook: "dump_all_variables.yml",
        machine_credential: "CFME Default Credential",
        create_new: true,
        provisioning_dialog_name: fauxfactory.gen_alphanumeric(),
        extra_vars: [["some_var", "some_value"]]
      },

      retirement: {
        repository: ansible_repository.name,
        playbook: "dump_all_variables.yml",
        machine_credential: "CFME Default Credential",
        extra_vars: [["some_var", "some_value"]]
      }
    }
  );

  yield(cat_item);
  cat_item.delete_if_exists()
};

function dialog_with_catalog_item(appliance, request, ansible_repository, ansible_catalog) {
  let _dialog_with_catalog_item = (ele_name) => {
    let service_dialog = appliance.collections.service_dialogs;
    let dialog = fauxfactory.gen_alphanumeric(12, {start: "dialog_"});

    let element_data = {element_information: {
      ele_label: fauxfactory.gen_alphanumeric(15, {start: "ele_label_"}),

      ele_name: (is_bool(ele_name) ? ele_name : fauxfactory.gen_alphanumeric(
        15,
        {start: "ele_name_"}
      )),

      ele_desc: fauxfactory.gen_alphanumeric(15, {start: "ele_desc_"}),
      choose_type: "Text Box"
    }};

    let sd = service_dialog.create({
      label: dialog,
      description: "my dialog"
    });

    let tab = sd.tabs.create({
      tab_label: fauxfactory.gen_alphanumeric({start: "tab_"}),
      tab_desc: "my tab desc"
    });

    let box = tab.boxes.create({
      box_label: fauxfactory.gen_alphanumeric({start: "box_"}),
      box_desc: "my box desc"
    });

    box.elements.create({element_data: [element_data]});

    let cat_item = appliance.collections.catalog_items.create(
      appliance.collections.catalog_items.ANSIBLE_PLAYBOOK,
      fauxfactory.gen_alphanumeric(15, {start: "ansi_cat_item_"}),
      fauxfactory.gen_alphanumeric(15, {start: "item_desc_"}),

      {display_in_catalog: true, provisioning: {
        repository: ansible_repository.name,
        playbook: "dump_all_variables.yml",
        machine_credential: "CFME Default Credential",
        use_exisiting: true,
        provisioning_dialog_id: sd.label
      }}
    );

    let catalog = appliance.collections.catalogs.create(
      fauxfactory.gen_alphanumeric({start: "ansi_cat_"}),

      {
        description: fauxfactory.gen_alphanumeric({start: "cat_dis_"}),
        items: [cat_item.name]
      }
    );

    let _finalize = () => {
      if (is_bool(catalog.exists)) {
        catalog.delete();
        cat_item.catalog = null
      };

      cat_item.delete_if_exists();
      return sd.delete_if_exists()
    };

    return [cat_item, catalog]
  };

  return _dialog_with_catalog_item
};

function ansible_linked_vm_action(appliance, local_ansible_catalog_item, create_vm) {
  update(local_ansible_catalog_item, () => (
    local_ansible_catalog_item.provisioning = {playbook: "add_single_vm_to_service.yml"}
  ));

  let action_values = {run_ansible_playbook: {
    playbook_catalog_item: local_ansible_catalog_item.name,
    inventory: {specific_hosts: true, hosts: create_vm.ip_address}
  }};

  let action = appliance.collections.actions.create(
    fauxfactory.gen_alphanumeric(15, {start: "action_"}),
    {action_type: "Run Ansible Playbook", action_values}
  );

  yield(action);
  action.delete_if_exists()
};

function ansible_policy_linked_vm(appliance, create_vm, ansible_linked_vm_action) {
  let policy = appliance.collections.policies.create(
    VMControlPolicy,
    fauxfactory.gen_alpha(15, {start: "policy_"}),
    {scope: `fill_field(VM and Instance : Name, INCLUDES, ${create_vm.name})`}
  );

  policy.assign_actions_to_event(
    "Tag Complete",
    [ansible_linked_vm_action.description]
  );

  let policy_profile = appliance.collections.policy_profiles.create(
    fauxfactory.gen_alpha(15, {start: "profile_"}),
    {policies: [policy]}
  );

  create_vm.assign_policy_profiles(policy_profile.description);
  yield;
  policy_profile.delete_if_exists();
  policy.delete_if_exists()
};

function provider_credentials(appliance, provider, credential) {
  let [cred_type, hostname, playbook] = credential;
  let creds = provider.get_credentials_from_config(provider.data.credentials);
  let credentials = {};

  if (cred_type == "Amazon") {
    credentials.access_key = creds.principal;
    credentials.secret_key = creds.secret
  } else if (cred_type == "Azure") {
    let azure_creds = conf.credentials[provider.data.credentials];
    credentials.username = azure_creds.ui_username;
    credentials.password = azure_creds.ui_password;
    credentials.subscription_id = azure_creds.subscription_id;
    credentials.tenant_id = azure_creds.tenant_id;
    credentials.client_secret = azure_creds.password;
    credentials.client_id = azure_creds.username
  } else {
    credentials.username = creds.principal;
    credentials.password = creds.secret;
    credentials[hostname] = `https://${provider.hostname}/ovirt-engine/api`
  };

  credential = appliance.collections.ansible_credentials.create(
    `${cred_type}_credential_${fauxfactory.gen_alpha()}`,
    cred_type,
    {None: credentials}
  );

  yield(credential);
  credential.delete_if_exists()
};

function ansible_credential(appliance) {
  let credential = appliance.collections.ansible_credentials.create(
    fauxfactory.gen_alpha({start: "cred_"}),
    "Machine",

    {
      username: fauxfactory.gen_alpha({start: "usr_"}),
      password: fauxfactory.gen_alpha({start: "pwd_"})
    }
  );

  yield(credential);
  credential.delete_if_exists()
};

function custom_service_button(appliance, local_ansible_catalog_item) {
  let buttongroup = appliance.collections.button_groups.create({
    text: fauxfactory.gen_alphanumeric({start: "grp_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "grp_hvr_"}),
    type: appliance.collections.button_groups.SERVICE
  });

  let button = buttongroup.buttons.create({
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
    dialog: local_ansible_catalog_item.provisioning.provisioning_dialog_name,
    system: "Request",
    request: "Order_Ansible_Playbook"
  });

  yield(button);
  button.delete_if_exists();
  buttongroup.delete_if_exists()
};

function test_service_ansible_playbook_available(appliance) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  let view = navigate_to(
    appliance.collections.catalog_items,
    "Choose Type"
  );

  if (!view.select_item_type.all_options.map(option => option.text).include("Ansible Playbook")) {
    throw new ()
  }
};

function test_service_ansible_playbook_crud(appliance, ansible_repository) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: critical
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  let cat_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.ANSIBLE_PLAYBOOK,
    fauxfactory.gen_alphanumeric(15, "cat_item"),
    fauxfactory.gen_alphanumeric(15, "item_disc_"),

    {provisioning: {
      repository: ansible_repository.name,
      playbook: "dump_all_variables.yml",
      machine_credential: "CFME Default Credential",
      create_new: true,

      provisioning_dialog_name: fauxfactory.gen_alphanumeric(
        12,
        {start: "dialog_"}
      )
    }}
  );

  if (!cat_item.exists) throw new ();

  update(cat_item, () => {
    let new_name = fauxfactory.gen_alphanumeric(15, {start: "edited_"});
    cat_item.name = new_name;
    cat_item.provisioning = {playbook: "copy_file_example.yml"}
  });

  let view = navigate_to(cat_item, "Details");
  if (!view.entities.title.text.include(new_name)) throw new ();

  if (view.entities.provisioning.info.get_text_of("Playbook") != "copy_file_example.yml") {
    throw new ()
  };

  cat_item.delete();
  if (!!cat_item.exists) throw new ()
};

function test_service_ansible_playbook_tagging(ansible_catalog_item) {
  //  Tests ansible_playbook tag addition, check added tag and removal
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       tags: ansible_embed
  //       testSteps:
  //           1. Login as a admin
  //           2. Add tag for ansible_playbook
  //           3. Check added tag
  //           4. Remove the given tag
  //   
  let added_tag = ansible_catalog_item.add_tag();

  if (!ansible_catalog_item.get_tags().include(added_tag)) {
    throw "Assigned tag was not found"
  };

  ansible_catalog_item.remove_tag(added_tag);
  if (!!ansible_catalog_item.get_tags().include(added_tag)) throw new ()
};

function test_service_ansible_playbook_negative(appliance) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  let collection = appliance.collections.catalog_items;

  let cat_item = collection.instantiate(
    collection.ANSIBLE_PLAYBOOK,
    "",
    "",
    {}
  );

  let view = navigate_to(cat_item, "Add");

  view.fill({
    name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric()
  });

  if (!!view.add.active) throw new ();
  view.browser.refresh()
};

function test_service_ansible_playbook_bundle(appliance, ansible_catalog_item) {
  // Ansible playbooks are not designed to be part of a cloudforms service bundle.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  let view = navigate_to(appliance.collections.catalog_bundles, "Add");
  let options = view.resources.select_resource.all_options;

  if (!!options.map(o => o.text).include(ansible_catalog_item.name)) {
    throw new ()
  };

  view.browser.refresh()
};

function test_service_ansible_playbook_provision_in_requests(appliance, ansible_catalog_item, ansible_service, ansible_service_request, request) {
  // Tests if ansible playbook service provisioning is shown in service requests.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  ansible_service.order();
  ansible_service_request.wait_for_request();
  let cat_item_name = ansible_catalog_item.name;
  let request_descr = "Provisioning Service [{0}] from [{0}]".format(cat_item_name);
  let service_request = appliance.collections.requests.instantiate({description: request_descr});
  let service_id = appliance.rest_api.collections.service_requests.get({description: request_descr});

  let _finalize = () => {
    let service = MyService(appliance, cat_item_name);

    if (is_bool(service_request.exists())) {
      service_request.wait_for_request();
      appliance.rest_api.collections.service_requests.action.delete({id: service_id.id})
    };

    if (is_bool(service.exists)) return service.delete()
  };

  if (!service_request.exists()) throw new ()
};

function test_service_ansible_playbook_confirm(appliance, soft_assert) {
  // Tests after selecting playbook additional widgets appear and are pre-populated where
  //   possible.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  let collection = appliance.collections.catalog_items;

  let cat_item = collection.instantiate(
    collection.ANSIBLE_PLAYBOOK,
    "",
    "",
    {}
  );

  let view = navigate_to(cat_item, "Add");
  if (!view.provisioning.is_displayed) throw new ();
  if (!view.retirement.is_displayed) throw new ();
  soft_assert.call(view.provisioning.repository.is_displayed);
  soft_assert.call(view.provisioning.verbosity.is_displayed);
  soft_assert.call(view.provisioning.verbosity.selected_option == "0 (Normal)");
  soft_assert.call(view.provisioning.localhost.is_displayed);
  soft_assert.call(view.provisioning.specify_host_values.is_displayed);
  soft_assert.call(view.provisioning.logging_output.is_displayed);
  soft_assert.call(view.retirement.localhost.is_displayed);
  soft_assert.call(view.retirement.specify_host_values.is_displayed);
  soft_assert.call(view.retirement.logging_output.is_displayed);
  soft_assert.call(view.retirement.remove_resources.selected_option == "Yes");
  soft_assert.call(view.retirement.repository.is_displayed);
  soft_assert.call(view.retirement.verbosity.is_displayed);
  soft_assert.call(view.retirement.remove_resources.is_displayed);
  soft_assert.call(view.retirement.verbosity.selected_option == "0 (Normal)")
};

function test_service_ansible_retirement_remove_resources(request, appliance, ansible_repository) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: critical
  //       initialEstimate: 1/4h
  //       tags: ansible_embed
  //       setup:
  //           1. Go to User-Dropdown right upper corner --> Configuration
  //           2. Under Server roles --> Enable Embedded Ansible role.
  //           3. Wait for 15-20mins to start ansible server role.
  //       testSteps:
  //           1. Open creation screen of Ansible Playbook catalog item.
  //           2. Fill required fields.
  //           3. Open Retirement tab.
  //           4. Fill \"Remove resources?\" field with \"No\" value.
  //           5. Press \"Save\" button.
  //       expectedResults:
  //           1. Catalog should be created without any failure.
  //           2. Check required fields with exact details.
  //           3. Retirement tab should be open with default items.
  //           4. Check \"Remove resources?\" value updated with value \"No\".
  //           5. \"Remove resources\" should have correct value.
  //   
  let cat_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.ANSIBLE_PLAYBOOK,
    fauxfactory.gen_alphanumeric(15, {start: "cat_item_"}),
    fauxfactory.gen_alphanumeric(15, {start: "item_desc_"}),

    {
      provisioning: {
        repository: ansible_repository.name,
        playbook: "dump_all_variables.yml",
        machine_credential: "CFME Default Credential",
        create_new: true,
        provisioning_dialog_name: fauxfactory.gen_alphanumeric()
      },

      retirement: {remove_resources: "No"}
    }
  );

  request.addfinalizer(cat_item.delete_if_exists);
  let view = navigate_to(cat_item, "Details");

  if (view.entities.retirement.info.get_text_of("Remove Resources") != "No") {
    throw new ()
  };

  cat_item.delete();
  if (!!cat_item.exists) throw new ()
};

function test_service_ansible_playbook_order_retire(appliance, ansible_catalog_item, ansible_service_catalog, ansible_service_request, ansible_service, host_type, order_value, result, action, request) {
  // Test ordering and retiring ansible playbook service against default host, blank field and
  //   unavailable host.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       initialEstimate: 1/4h
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       tags: ansible_embed
  //   
  ansible_service_catalog.ansible_dialog_values = {hosts: order_value};
  ansible_service_catalog.order();
  ansible_service_request.wait_for_request();
  let cat_item_name = ansible_catalog_item.name;
  let request_descr = "Provisioning Service [{0}] from [{0}]".format(cat_item_name);
  let service_request = appliance.collections.requests.instantiate({description: request_descr});
  let service_id = appliance.rest_api.collections.service_requests.get({description: request_descr});

  let _finalize = () => {
    let service = MyService(appliance, cat_item_name);

    if (is_bool(service_request.exists())) {
      service_request.wait_for_request();
      appliance.rest_api.collections.service_requests.action.delete({id: service_id.id})
    };

    if (is_bool(service.exists)) return service.delete()
  };

  if (action == "retirement") ansible_service.retire();
  let view = navigate_to(ansible_service, "Details");
  if (result != view.provisioning.details.get_text_of("Hosts")) throw new ()
};

function test_service_ansible_playbook_plays_table(ansible_service_request, ansible_service, soft_assert) {
  // Plays table in provisioned and retired service should contain at least one row.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: low
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  ansible_service.order();
  ansible_service_request.wait_for_request();
  let view = navigate_to(ansible_service, "Details");

  soft_assert.call(
    view.provisioning.plays.row_count > 1,
    "Plays table in provisioning tab is empty"
  );

  ansible_service.retire();

  soft_assert.call(
    view.provisioning.plays.row_count > 1,
    "Plays table in retirement tab is empty"
  )
};

function test_service_ansible_playbook_order_credentials(local_ansible_catalog_item, ansible_credential, ansible_service_catalog) {
  // Test if credentials avaialable in the dropdown in ordering ansible playbook service
  //   screen.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  update(local_ansible_catalog_item, () => (
    local_ansible_catalog_item.provisioning = {machine_credential: ansible_credential.name}
  ));

  let view = navigate_to(ansible_service_catalog, "Order");

  let options = view.fields("credential").visible_widget.all_options.map(o => (
    o.text
  ));

  if (!new Set(options).include(ansible_credential.name)) throw new ()
};

function test_service_ansible_playbook_pass_extra_vars(ansible_service_catalog, ansible_service_request, ansible_service, action) {
  // Test if extra vars passed into ansible during ansible playbook service provision and
  //   retirement.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       tags: ansible_embed
  //   
  ansible_service_catalog.order();
  ansible_service_request.wait_for_request();
  if (action == "retirement") ansible_service.retire();
  let view = navigate_to(ansible_service, "Details");
  if (action == "provisioning") view.provisioning_tab.click();
  let stdout = view.getattr(action).standart_output;
  stdout.wait_displayed();
  let pre = stdout.text;
  let json_str = pre.split_p("--------------------------------");

  let result_dict = json.loads(json_str[5].gsub("\", \"", "").gsub(
    "\\\"",
    "\""
  ).gsub("\\, \"", "\",").split_p("\" ] } PLAY")[0]);

  if (result_dict.some_var != "some_value") throw new ()
};

function test_service_ansible_execution_ttl(request, ansible_service_catalog, local_ansible_catalog_item, ansible_service, ansible_service_request) {
  // Test if long running processes allowed to finish. There is a code that guarantees to have 100
  //   retries with a minimum of 1 minute per retry. So we need to run ansible playbook service more
  //   than 100 minutes and set max ttl greater than ansible playbook running time.
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       initialEstimate: 2h
  //       tags: ansible_embed
  // 
  //   Bugzilla:
  //       1519275
  //       1515841
  //   
  update(local_ansible_catalog_item, () => (
    local_ansible_catalog_item.provisioning = {
      playbook: "long_running_playbook.yml",
      max_ttl: 200
    }
  ));

  let _revert = () => (
    update(method("local_ansible_catalog_item"), () => (
      local_ansible_catalog_item.provisioning = {
        playbook: "dump_all_variables.yml",
        max_ttl: ""
      }
    ))
  );

  request.addfinalizer(method("_revert"));
  ansible_service_catalog.order();

  ansible_service_request.wait_for_request({
    method: "ui",
    num_sec: 200 * 60,
    delay: 120
  });

  let view = navigate_to(ansible_service, "Details");

  if (view.provisioning.results.get_text_of("Status") != "successful") {
    throw new ()
  }
};

function test_custom_button_ansible_credential_list(custom_service_button, ansible_service_catalog, ansible_service, ansible_service_request, appliance) {
  // Test if credential list matches when the Ansible Playbook Service Dialog is invoked from a
  //   Button versus a Service Order Screen.
  // 
  //   Bugzilla:
  //       1448918
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Automate
  //       caseimportance: medium
  //       initialEstimate: 1/3h
  //       tags: ansible_embed
  //   
  ansible_service_catalog.order();
  ansible_service_request.wait_for_request();
  let view = navigate_to(ansible_service, "Details");
  view.toolbar.custom_button(custom_service_button.group.text).item_select(custom_service_button.text);

  let credentials_dropdown = BootstrapSelect(
    appliance.browser.widgetastic,
    {locator: ".//select[@id='credential']/.."}
  );

  wait_for(() => credentials_dropdown.is_displayed, {timeout: 30});
  let all_options = credentials_dropdown.all_options.map(option => option.text);
  if (["<Default>", "CFME Default Credential"] != all_options) throw new ()
};

function test_ansible_group_id_in_payload(ansible_service_catalog, ansible_service_request, ansible_service) {
  // Test if group id is presented in manageiq payload.
  // 
  //   Bugzilla:
  //       1480019
  // 
  //   In order to get manageiq payload the service's standard output should be parsed.
  // 
  //   Bugzilla:
  //       1480019
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  ansible_service_catalog.order();
  ansible_service_request.wait_for_request();
  let view = navigate_to(ansible_service, "Details");
  let stdout = view.provisioning.standart_output;
  wait_for(() => stdout.is_displayed, {timeout: 10});
  let pre = stdout.text;
  let json_str = pre.split_p("--------------------------------");

  let result_dict = json.loads(json_str[5].gsub("\", \"", "").gsub(
    "\\\"",
    "\""
  ).gsub("\\, \"", "\",").split_p("\" ] } PLAY")[0]);

  if (!result_dict.manageiq.include("group")) throw new ()
};

function test_embed_tower_exec_play_against(appliance, request, local_ansible_catalog_item, ansible_service, ansible_service_catalog, credential, provider_credentials) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       tags: ansible_embed
  //   
  let playbook = credential[2];

  update(local_ansible_catalog_item, () => (
    local_ansible_catalog_item.provisioning = {
      playbook: playbook,
      cloud_type: provider_credentials.credential_type,
      cloud_credential: provider_credentials.name
    }
  ));

  let _revert = () => {
    update(method("local_ansible_catalog_item"), () => (
      local_ansible_catalog_item.provisioning = {
        playbook: "dump_all_variables.yml",
        cloud_type: "<Choose>"
      }
    ));

    let service = MyService(appliance, local_ansible_catalog_item.name);

    if (is_bool(service_request.exists())) {
      service_request.wait_for_request();
      appliance.rest_api.collections.service_requests.action.delete({id: service_id.id})
    };

    if (is_bool(service.exists)) return service.delete()
  };

  let service_request = ansible_service_catalog.order();
  service_request.wait_for_request({num_sec: 300, delay: 20});
  let request_descr = `Provisioning Service [${local_ansible_catalog_item.name}] from [${local_ansible_catalog_item.name}]`;
  service_request = appliance.collections.requests.instantiate({description: request_descr});
  let service_id = appliance.rest_api.collections.service_requests.get({description: request_descr});
  let view = navigate_to(ansible_service, "Details");

  if (view.provisioning.results.get_text_of("Status") != "successful") {
    throw new ()
  }
};

function test_service_ansible_verbosity(appliance, request, local_ansible_catalog_item, ansible_service_catalog, ansible_service_request, ansible_service, verbosity) {
  // Check if the different Verbosity levels can be applied to service and
  //   monitor the std out
  //   Bugzilla:
  //       1460788
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  let pattern = "\"verbosity\"=>{}".format(verbosity[0]);

  update(local_ansible_catalog_item, () => {
    local_ansible_catalog_item.provisioning = {verbosity: verbosity};
    local_ansible_catalog_item.retirement = {verbosity: verbosity}
  });

  let log = LogValidator(
    "/var/www/miq/vmdb/log/evm.log",
    {matched_patterns: [pattern]}
  );

  log.start_monitoring();

  let _revert = () => {
    let service = MyService(appliance, local_ansible_catalog_item.name);

    if (is_bool(ansible_service_request.exists())) {
      ansible_service_request.wait_for_request();
      appliance.rest_api.collections.service_requests.action.delete({id: service_request.id})
    };

    if (is_bool(service.exists)) return service.delete()
  };

  ansible_service_catalog.order();
  ansible_service_request.wait_for_request();
  let request_descr = `Provisioning Service [${local_ansible_catalog_item.name}] from [${local_ansible_catalog_item.name}]`;
  let service_request = appliance.rest_api.collections.service_requests.get({description: request_descr});
  if (!log.validate({wait: "60s"})) throw new ();
  logger.info(`Pattern found ${log.matched_patterns}`);
  let view = navigate_to(ansible_service, "Details");

  if (verbosity[0] != view.provisioning.details.get_text_of("Verbosity")) {
    throw new ()
  };

  if (verbosity[0] != view.retirement.details.get_text_of("Verbosity")) {
    throw new ()
  }
};

function test_ansible_service_linked_vm(appliance, create_vm, ansible_policy_linked_vm, ansible_service_request, ansible_service, request) {
  // Check Whether service has associated VM attached to it.
  // 
  //   Bugzilla:
  //       1448918
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       initialEstimate: 1/3h
  //       tags: ansible_embed
  //   
  create_vm.add_tag();
  wait_for(ansible_service_request.exists, {num_sec: 600});
  ansible_service_request.wait_for_request();
  let view = navigate_to(ansible_service, "Details");
  if (!view.entities.vms.all_entity_names.include(create_vm.name)) throw new ()
};

function test_ansible_service_order_vault_credentials(appliance, request, ansible_catalog_item, ansible_service_catalog, ansible_service_request_funcscope, ansible_service_funcscope) {
  // 
  //   Add vault password and test in the playbook that encrypted yml can be
  //   decrypted.
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       initialEstimate: 1/2h
  //       tags: ansible_embed
  //   
  let creds = conf.credentials.vault_creds.password;
  let creds_dict = {vault_password: creds};

  let vault_creds = appliance.collections.ansible_credentials.create(
    `Vault_Credentials_${fauxfactory.gen_alpha()}`,
    "Vault",
    {None: creds_dict}
  );

  update(ansible_catalog_item, () => (
    ansible_catalog_item.provisioning = {
      playbook: "dump_secret_variable_from_vault.yml",
      vault_credential: vault_creds.name
    }
  ));

  let _revert = () => {
    update(ansible_catalog_item, () => (
      ansible_catalog_item.provisioning = {
        playbook: "dump_all_variables.yml",
        vault_credential: "<Choose>"
      }
    ));

    return vault_creds.delete_if_exists()
  };

  ansible_service_catalog.order();
  ansible_service_request_funcscope.wait_for_request();
  let view = navigate_to(ansible_service_funcscope, "Details");

  if (view.provisioning.credentials.get_text_of("Vault") != vault_creds.name) {
    throw new ()
  };

  let status = (appliance.version < "5.11" ? "successful" : "Finished");
  if (view.provisioning.results.get_text_of("Status") != status) throw new ()
};

function test_ansible_service_ansible_galaxy_role(appliance, request, ansible_catalog_item, ansible_service_catalog, ansible_service_funcscope, ansible_service_request_funcscope) {
  // Check Role is fetched from Ansible Galaxy by using roles/requirements.yml file
  //   from playbook.
  // 
  //   Bugzilla:
  //       1734904
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       initialEstimate: 1/3h
  //       tags: ansible_embed
  //   
  let old_playbook_value = ansible_catalog_item.provisioning;

  update(method("local_ansible_catalog_item"), () => (
    local_ansible_catalog_item.provisioning = {playbook: "ansible_galaxy_role_users.yaml"}
  ));

  let _revert = () => (
    update(method("local_ansible_catalog_item"), () => (
      local_ansible_catalog_item.provisioning.playbook = old_playbook_value.playbook
    ))
  );

  let service_request = ansible_service_catalog.order();
  service_request.wait_for_request({num_sec: 300, delay: 20});
  let view = navigate_to(ansible_service_funcscope, "Details");

  if (!(appliance.version < "5.11" ? view.provisioning.results.get_text_of("Status") == "successful" : "Finished")) {
    throw new ()
  }
};

function test_ansible_service_with_operations_role_disabled(appliance, ansible_catalog_item, ansible_service_catalog, ansible_service_funcscope, ansible_service_request_funcscope) {
  // If the embedded ansible role is *not* on the same server as the ems_operations role,
  //   then the run will never start.
  //   Bugzilla:
  //       1742839
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       initialEstimate: 1/3h
  //       tags: ansible_embed
  //   
  let service_request = ansible_service_catalog.order();
  service_request.wait_for_request({num_sec: 300, delay: 20});
  if (ansible_service_funcscope.status != "Finished") throw new ()
};

function test_ansible_service_cloud_credentials(appliance, request, local_ansible_catalog_item, ansible_service_catalog, credential, provider_credentials, ansible_service_funcscope, ansible_service_request_funcscope) {
  // 
  //       When the service is viewed in my services it should also show that the Cloud Credentials
  //       were attached to the service.
  // 
  //   Bugzilla:
  //       1444092
  //       1515561
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       initialEstimate: 1/4h
  //       tags: ansible_embed
  //   
  let old_playbook_value = local_ansible_catalog_item.provisioning;
  let playbook = credential[2];

  update(local_ansible_catalog_item, () => (
    local_ansible_catalog_item.provisioning = {
      playbook: playbook,
      cloud_type: provider_credentials.credential_type,
      cloud_credential: provider_credentials.name
    }
  ));

  let _revert = () => (
    update(method("local_ansible_catalog_item"), () => (
      local_ansible_catalog_item.provisioning.playbook = old_playbook_value.playbook
    ))
  );

  let service_request = ansible_service_catalog.order();
  service_request.wait_for_request({num_sec: 300, delay: 20});
  let view = navigate_to(ansible_service_funcscope, "Details");

  if (view.provisioning.credentials.get_text_of("Cloud") != provider_credentials.name) {
    throw new ()
  }
};

function test_service_ansible_service_name(request, appliance, dialog_with_catalog_item) {
  // 
  //   After creating the service using ansible playbook type add a new text
  //   field to service dialog named \"service_name\" and then use that service
  //   to order the service which will have a different name than the service
  //   catalog item.
  // 
  //   Bugzilla:
  //       1505929
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: medium
  //       initialEstimate: 1/2h
  //       tags: ansible_embed
  //   
  let ele_name = "service_name";
  let [ansible_cat_item, ansible_catalog] = dialog_with_catalog_item.call(ele_name);

  let service_catalogs = ServiceCatalogs(
    appliance,
    ansible_catalog,
    ansible_cat_item.name
  );

  let view = navigate_to(service_catalogs, "Order");

  let service_name = fauxfactory.gen_alphanumeric(
    20,
    {start: "diff_service_name"}
  );

  view.fields(ele_name).fill(service_name);
  time.sleep(5);
  view.submit_button.click();
  let request_descr = `Provisioning Service [${ansible_cat_item.name}] from [${ansible_cat_item.name}]`;
  let service_request = appliance.collections.requests.instantiate({description: request_descr});
  service_request.wait_for_request();

  let _revert = () => {
    if (is_bool(service_request.exists)) {
      service_request.wait_for_request();
      service_request.remove_request()
    };

    if (is_bool(service.exists)) return service.delete()
  };

  let service = MyService(appliance, service_name);
  if (!service.exists) throw new ()
}
