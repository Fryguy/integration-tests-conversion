require_relative("textwrap");
include(Textwrap);
require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("wrapanapi/utils/random");
include(Wrapanapi.Utils.Random);
require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/dialog_import_export");
include(Cfme.Automate.Dialog_import_export);
require_relative("cfme/base/credential");
include(Cfme.Base.Credential);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/provisioning");
include(Cfme.Provisioning);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
let pytestmark = [test_requirements.automate];

function new_users(appliance) {
  // This fixture creates new users
  let users = (2).times.map(_ => (
    appliance.collections.users.create({
      name: fauxfactory.gen_alphanumeric({start: "user_"}).downcase(),

      credential: Credential({
        principal: fauxfactory.gen_alphanumeric({start: "uid"}),
        secret: fauxfactory.gen_alphanumeric(4)
      }),

      email: fauxfactory.gen_email(),
      groups: appliance.collections.groups.instantiate({description: "EvmGroup-super_administrator"}),
      cost_center: "Workload",
      value_assign: "Database"
    })
  ));

  yield(users);

  for (let user in users) {
    user = appliance.rest_api.collections.users.get({name: user.name});
    user.action.delete()
  }
};

function infra_validate_request(domain) {
  domain.parent.instantiate({name: "ManageIQ"}).namespaces.instantiate({name: "Infrastructure"}).namespaces.instantiate({name: "VM"}).namespaces.instantiate({name: "Provisioning"}).namespaces.instantiate({name: "StateMachines"}).classes.instantiate({name: "ProvisionRequestApproval"}).methods.instantiate({name: "validate_request"}).copy_to(domain.name);
  let method = domain.namespaces.instantiate({name: "Infrastructure"}).namespaces.instantiate({name: "VM"}).namespaces.instantiate({name: "Provisioning"}).namespaces.instantiate({name: "StateMachines"}).classes.instantiate({name: "ProvisionRequestApproval"}).methods.instantiate({name: "validate_request"});
  return method
};

function service_validate_request(domain) {
  domain.parent.instantiate({name: "ManageIQ"}).namespaces.instantiate({name: "Service"}).namespaces.instantiate({name: "Provisioning"}).namespaces.instantiate({name: "StateMachines"}).classes.instantiate({name: "ServiceProvisionRequestApproval"}).methods.instantiate({name: "validate_request"}).copy_to(domain.name);
  let method = domain.namespaces.instantiate({name: "Service"}).namespaces.instantiate({name: "Provisioning"}).namespaces.instantiate({name: "StateMachines"}).classes.instantiate({name: "ServiceProvisionRequestApproval"}).methods.instantiate({name: "validate_request"});
  return method
};

function test_user_requester_for_lifecycle_provision(request, appliance, provider, setup_provider, new_users, generic_catalog_item, infra_validate_request, service_validate_request, provisioning) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //       tags: automate
  // 
  //   Bugzilla:
  //        1671563
  //        1720273
  //        1728706
  //   
  let script = `
    user = $evm.root['user']
    $evm.log(:info, \"This is the user: \#{user.userid}\")

    $evm.log(\"info\", \"Listing Root Object Attributes:\")
    $evm.root.attributes.sort.each { |k, v| $evm.log(\"info\", \"\t\#{k}: \#{v}\") }
    $evm.log(\"info\", \"===========================================\")
    `;
  infra_validate_request.update({updates: {script: script}});
  service_validate_request.update({updates: {script: script}});

  new_users[0, () => {
    let result = LogValidator(
      "/var/www/miq/vmdb/log/automation.log",
      {matched_patterns: [(".*This is the user: {name}.*").format({name: new_users[0].credential.principal})]}
    );

    result.start_monitoring();

    let service_catalogs = ServiceCatalogs(appliance, {
      catalog: generic_catalog_item.catalog,
      name: generic_catalog_item.name
    });

    let provision_request = service_catalogs.order();
    provision_request.wait_for_request();
    if (!result.validate({wait: "60s"})) throw new ()
  }];

  new_users[1, () => {
    let result = LogValidator(
      "/var/www/miq/vmdb/log/automation.log",
      {matched_patterns: [(".*This is the user: {name}.*").format({name: new_users[1].credential.principal})]}
    );

    result.start_monitoring();

    let prov_data = {
      catalog: {vm_name: random_vm_name({context: "provision"})},
      environment: {automatic_placement: true}
    };

    do_vm_provisioning(appliance, {
      template_name: provisioning.template,
      provider,
      vm_name: prov_data.catalog.vm_name,
      provisioning_data: prov_data,
      wait: false,
      request: null
    });

    let request_description = "Provision from [{template}] to [{vm}{msg}]".format({
      template: provisioning.template,
      vm: prov_data.catalog.vm_name,
      msg: ""
    });

    let provision_request = appliance.collections.requests.instantiate(request_description);
    provision_request.wait_for_request({method: "ui"});
    request.addfinalizer(provision_request.remove_request);
    if (!result.validate({wait: "60s"})) throw new ()
  }]
};

function setup_dynamic_dialog(appliance, custom_instance) {
  let code = dedent(`\n        $evm.log(:info, \"Hello World\")\n        `);
  let instance = custom_instance.call({ruby_code: code});

  let element_data = {
    element_information: {
      ele_label: fauxfactory.gen_alphanumeric(15, {start: "ele_label_"}),
      ele_name: fauxfactory.gen_alphanumeric(15, {start: "ele_name_"}),
      ele_desc: fauxfactory.gen_alphanumeric(15, {start: "ele_desc_"}),
      dynamic_chkbox: true,
      choose_type: "Text Box"
    },

    options: {entry_point: instance.tree_path}
  };

  let service_dialog = appliance.collections.service_dialogs.create({
    label: fauxfactory.gen_alphanumeric({start: "dialog_"}),
    description: "my dialog"
  });

  let tab = service_dialog.tabs.create({
    tab_label: fauxfactory.gen_alphanumeric({start: "tab_"}),
    tab_desc: "my tab desc"
  });

  let box = tab.boxes.create({
    box_label: fauxfactory.gen_alphanumeric({start: "box_"}),
    box_desc: "my box desc"
  });

  box.elements.create({element_data: [element_data]});
  yield(service_dialog);
  service_dialog.delete_if_exists()
};

function test_automate_method_with_dialog(request, appliance, catalog, setup_dynamic_dialog) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/15h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.7
  //       casecomponent: Automate
  //       tags: automate
  //   
  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.GENERIC,

    {
      name: fauxfactory.gen_alphanumeric(),
      description: "my catalog",
      display_in: true,
      catalog,
      dialog: setup_dynamic_dialog.label
    }
  );

  request.addfinalizer(catalog_item.delete_if_exists);

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {matched_patterns: [".*Hello World.*"]}
  )).waiting({timeout: 120}, () => {
    let service_catalogs = ServiceCatalogs(
      appliance,
      {catalog: catalog_item.catalog, name: catalog_item.name}
    );

    let provision_request = service_catalogs.order();
    provision_request.wait_for_request();
    request.addfinalizer(provision_request.remove_request)
  })
};

function copy_klass(domain) {
  // This fixture copies ServiceProvision_Template which is required while selecting instance in
  //   catalog item
  domain.parent.instantiate({name: "ManageIQ"}).namespaces.instantiate({name: "Service"}).namespaces.instantiate({name: "Provisioning"}).namespaces.instantiate({name: "StateMachines"}).classes.instantiate({name: "ServiceProvision_Template"}).copy_to(domain.name);
  let klass = domain.namespaces.instantiate({name: "Service"}).namespaces.instantiate({name: "Provisioning"}).namespaces.instantiate({name: "StateMachines"}).classes.instantiate({name: "ServiceProvision_Template"});
  yield(klass);
  klass.delete_if_exists()
};

function catalog_item_setup(request, copy_klass, domain, catalog, dialog) {
  // 
  //   This fixture is used to create custom instance pointing to method. Selecting this instance as
  //   provisioning entry point for generic catalog item.
  //   
  let script1 = dedent(`\n        $evm.set_service_var('service_var', \"test value for service var\")\n        `);
  let script2 = dedent(`\n        var = $evm.service_var_exists?('service_var') && $evm.get_service_var('service_var')\n        $evm.log(\"info\", \"service var: service_var = \#{var}\")\n        `);
  let script = [script1, script2];
  let var = fauxfactory.gen_alpha();
  copy_klass.schema.add_fields({name: var, type: "State"});
  let cat_list = [];

  for (let i in (2).times) {
    let method = copy_klass.methods.create({
      name: fauxfactory.gen_alphanumeric(),
      display_name: fauxfactory.gen_alphanumeric(),
      location: "inline",
      script: script[i]
    });

    let instance = copy_klass.instances.create({
      name: fauxfactory.gen_alphanumeric(),
      display_name: fauxfactory.gen_alphanumeric(),
      description: fauxfactory.gen_alphanumeric(),
      fields: {var: {value: `METHOD::${method.name}`}}
    });

    let entry_point = [
      "Datastore",
      `${domain.name}`,
      "Service",
      "Provisioning",
      "StateMachines",
      `${copy_klass.name}`,
      `${instance.display_name} (${instance.name})`
    ];

    let catalog_item = domain.appliance.collections.catalog_items.create(
      domain.appliance.collections.catalog_items.GENERIC,

      {
        name: fauxfactory.gen_alphanumeric(),
        description: fauxfactory.gen_alphanumeric(),
        display_in: true,
        catalog,
        dialog,
        provisioning_entry_point: entry_point
      }
    );

    cat_list.push(catalog_item);
    request.addfinalizer(cat_list[i].delete_if_exists)
  };

  yield([catalog_item, cat_list])
};

function test_passing_value_between_catalog_items(request, appliance, catalog_item_setup) {
  // 
  //   Bugzilla:
  //        1678136
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Automate
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //       startsin: 5.11
  //       tags: automate
  //   
  let [catalog_item, cat_list] = catalog_item_setup;

  let catalog_bundle = appliance.collections.catalog_bundles.create({
    name: fauxfactory.gen_alphanumeric(),
    description: "catalog_bundle",
    display_in: true,
    catalog: catalog_item.catalog,
    dialog: catalog_item.dialog,
    catalog_items: [cat_list[0].name, cat_list[1].name]
  });

  request.addfinalizer(catalog_bundle.delete_if_exists);

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {matched_patterns: [".*service var:.*service_var = test value for service var.*"]}
  )).waiting({timeout: 120}, () => {
    let service_catalogs = ServiceCatalogs(
      appliance,
      catalog_bundle.catalog,
      catalog_bundle.name
    );

    service_catalogs.order();
    let request_description = `Provisioning Service [${catalog_bundle.name}] from [${catalog_bundle.name}]`;
    let provision_request = appliance.collections.requests.instantiate(request_description);
    provision_request.wait_for_request({method: "ui"});
    request.addfinalizer(provision_request.remove_request);
    if (!provision_request.is_succeeded({method: "ui"})) throw new ()
  })
};

// 
//   Bugzilla:
//       1748353
// 
//   Polarion:
//       assignee: dgaikwad
//       initialEstimate: 1/8h
//       caseposneg: positive
//       casecomponent: Automate
//       testSteps:
//           1. Create email retirement method & add it to automate
//           2. Provision service with a retirement date
//           3. Reach retirement date
//           4. See automation logs
//       expectedResults:
//           1.
//           2.
//           3.
//           4. The retirement should not run multiple times at the same time
//   
// pass
function test_service_retire_automate() {};

function test_import_dialog_file_without_selecting_file(appliance, dialog) {
  // 
  //   Bugzilla:
  //       1740796
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/8h
  //       caseposneg: positive
  //       casecomponent: Automate
  //       testSteps:
  //           1. \"Automation-->Automate--> Customization-->Import/Export--> Click export without a
  //              service dialog selected.
  //           2. Exit this screen and edit a service dialog and save
  //       expectedResults:
  //           1. Flash message: \"At least 1 item must be selected for export\"
  //           2. Error flash message should not appear
  //   
  let import_export = DialogImportExport(appliance);
  let view = navigate_to(import_export, "DialogImportExport");
  view.export.click();
  view.flash.assert_message("At least 1 item must be selected for export");
  dialog.update({label: fauxfactory.gen_alphanumeric()})
};

function new_user(appliance) {
  // This fixture creates new user which has permissions to perform operation on Vm
  let user = appliance.collections.users.create({
    name: `user_${fauxfactory.gen_alphanumeric().downcase()}`,

    credential: Credential({
      principal: `uid${fauxfactory.gen_alphanumeric(4)}`,
      secret: fauxfactory.gen_alphanumeric(4)
    }),

    email: fauxfactory.gen_email(),
    groups: appliance.collections.groups.instantiate({description: "EvmGroup-vm_user"}),
    cost_center: "Workload",
    value_assign: "Database"
  });

  yield(user);
  user = appliance.rest_api.collections.users.get({name: user.name});
  user.action.delete()
};

function test_retire_vm_now(setup_provider, create_vm, new_user) {
  // 
  //   Bugzilla:
  //       1747159
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       caseposneg: positive
  //       casecomponent: Automate
  //       setup:
  //           1. Add infrastructure provider
  //           2. Provision VM
  //           3. Create new user with group EvmGroup-vm_user
  //       testSteps:
  //           1. Select 'Retire this vm' from the UI to retire the VM
  //           2. Check evm.logs
  //       expectedResults:
  //           1. VM should be retired
  //           2. No errors in evm logs
  //   
  new_user(() => (
    (LogValidator(
      "/var/www/miq/vmdb/log/evm.log",
      {failure_patterns: [".*ERROR.*NoMethodError]: undefined method `tenant_id'.*"]}
    )).waiting({timeout: 720}, () => {
      create_vm.retire();

      if (!create_vm.wait_for_vm_state_change({
        desired_state: "retired",
        timeout: 720,
        from_details: true
      })) throw new ()
    })
  ))
};

function custom_prov_data(request, provisioning) {
  let prov_data = {
    catalog: {vm_name: random_name({prefix: "test_"})},
    environment: {automatic_placement: true},
    network: {vlan: partial_match(provisioning.vlan)}
  };

  prov_data.update(request.param);
  prov_data.catalog.catalog_name = {name: provisioning.template};
  return prov_data
};

function domain_setup(domain) {
  // This fixture used to setup the domain structure
  let klass = domain.parent.instantiate({name: "ManageIQ"}).namespaces.instantiate({name: "System"}).namespaces.instantiate({name: "CommonMethods"}).classes.instantiate({name: "QuotaMethods"});
  klass.methods.instantiate({name: "requested"}).copy_to(domain.name);
  let method = domain.parent.instantiate({name: `${domain.name}`}).namespaces.instantiate({name: "System"}).namespaces.instantiate({name: "CommonMethods"}).classes.instantiate({name: "QuotaMethods"}).methods.instantiate({name: "requested"});
  yield;
  method.delete_if_exists()
};

function tenants_setup(appliance) {
  // This fixture creates two parent tenants
  let parent_tenant = appliance.collections.tenants.create({
    name: fauxfactory.gen_alphanumeric(18, {start: "test_parent_"}),

    description: fauxfactory.gen_alphanumeric(
      18,
      {start: "parent_desc_"}
    ),

    parent: appliance.collections.tenants.get_root_tenant()
  });

  let child_tenant = appliance.collections.tenants.create({
    name: fauxfactory.gen_alphanumeric(18, {start: "test_parent_"}),

    description: fauxfactory.gen_alphanumeric(
      18,
      {start: "parent_desc_"}
    ),

    parent: parent_tenant
  });

  yield([parent_tenant, child_tenant]);
  child_tenant.delete_if_exists();
  parent_tenant.delete_if_exists()
};

function set_child_tenant_quota(request, appliance, tenants_setup) {
  let [parent_tenant, child_tenant] = tenants_setup;
  let field_value = request.param;
  let tenant_quota_data = {};

  for (let [field, value] in field_value) {
    tenant_quota_data.update({[`${field}_cb`]: true, field: value})
  };

  child_tenant.set_quota({None: tenant_quota_data});
  yield;

  for (let [field, value] in field_value) {
    tenant_quota_data.update({[`${field}_cb`]: false});
    tenant_quota_data.pop(field)
  };

  child_tenant.set_quota({None: tenant_quota_data})
};

function new_group_tenant(appliance, tenants_setup) {
  // This fixture creates new group and assigned by new project
  let [parent_tenant, child_tenant] = tenants_setup;
  let role = appliance.collections.roles.instantiate({name: "EvmRole-user_self_service"});

  let user_role = role.copy({
    name: fauxfactory.gen_alphanumeric(25, "self_service_role_"),
    vm_restriction: "None"
  });

  let group = appliance.collections.groups.create({
    description: fauxfactory.gen_alphanumeric({start: "group_"}),
    role: user_role.name,
    tenant: `My Company/${child_tenant.parent_tenant.name}/${child_tenant.name}`
  });

  yield(group);
  group.delete_if_exists()
};

function new_child_tenant_user(appliance, new_group_tenant) {
  // This fixture creates new user which is assigned to new group and project
  let user = appliance.collections.users.create({
    name: fauxfactory.gen_alphanumeric({start: "user_"}).downcase(),

    credential: Credential({
      principal: fauxfactory.gen_alphanumeric({start: "uid"}),
      secret: fauxfactory.gen_alphanumeric({start: "pwd"})
    }),

    email: fauxfactory.gen_email(),
    groups: new_group_tenant,
    cost_center: "Workload",
    value_assign: "Database"
  });

  yield(user);
  user.delete_if_exists()
};

function test_quota_calculation_using_service_dialog_overrides(request, appliance, setup_provider, provider, domain_setup, set_child_tenant_quota, context, custom_prov_data, import_dialog, file_name, catalog, new_child_tenant_user) {
  // 
  //   This test case is to check Quota calculation using service dialog overrides.
  //   Bugzilla:
  //       1492158
  // 
  //   Polarion:
  //       assignee: ghubale
  //       initialEstimate: 1/6h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.8
  //       casecomponent: Infra
  //       tags: quota
  //       testSteps:
  //           1. create a new domain quota_test
  //           2. Using the Automate Explorer, copy the
  //              ManageIQ/System/CommonMethods/QuotaMethods/requested method
  //              to the quota_test domain.
  //           3. Import the attached dialog. create catalog and catalog
  //              item using this dialog
  //           4. create a child tenant and set quota. create new group and
  //              user for this tenant.
  //           5. login with this user and provision by overriding values
  //           6. Also test the same for user and group quota source type
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5. Quota should be denied with reason for quota exceeded message
  //           6. Quota should be denied with reason for quota exceeded message
  //   
  let [sd, ele_label] = import_dialog;
  let prov_data = custom_prov_data;

  let catalog_item = appliance.collections.catalog_items.create(
    provider.catalog_item_type,

    {
      name: fauxfactory.gen_alphanumeric({start: "test_"}),
      description: fauxfactory.gen_alphanumeric({start: "desc_"}),
      display_in: true,
      catalog,
      dialog: sd,
      prov_data
    }
  );

  request.addfinalizer(catalog_item.delete_if_exists);

  new_child_tenant_user(() => (
    appliance.context.use(context, () => {
      appliance.server.login(new_child_tenant_user);

      let service_catalogs = ServiceCatalogs(
        appliance,
        catalog_item.catalog,
        catalog_item.name
      );

      if (context === ViaSSUI) service_catalogs.add_to_shopping_cart();
      service_catalogs.order()
    })
  ));

  let request_description = `Provisioning Service [${catalog_item.name}] from [${catalog_item.name}]`;
  let provision_request = appliance.collections.requests.instantiate(request_description);
  provision_request.wait_for_request({method: "ui"});
  request.addfinalizer(provision_request.remove_request);
  if (provision_request.row.reason.text != "Quota Exceeded") throw new ()
}
