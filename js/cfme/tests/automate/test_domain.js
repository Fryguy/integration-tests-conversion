require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/explorer/domain");
include(Cfme.Automate.Explorer.Domain);
require_relative("cfme/automate/explorer/instance");
include(Cfme.Automate.Explorer.Instance);
require_relative("cfme/automate/explorer/klass");
include(Cfme.Automate.Explorer.Klass);
require_relative("cfme/automate/explorer/method");
include(Cfme.Automate.Explorer.Method);
require_relative("cfme/automate/import_export");
include(Cfme.Automate.Import_export);
require_relative("cfme/automate/simulation");
include(Cfme.Automate.Simulation);
require_relative("cfme/base/credential");
include(Cfme.Base.Credential);
require_relative("cfme/exceptions");
include(Cfme.Exceptions);
require_relative("cfme/fixtures/automate");
include(Cfme.Fixtures.Automate);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _groups = groups.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _tenants = tenants.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _users = users.bind(this);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/ftp");
include(Cfme.Utils.Ftp);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytestmark = [test_requirements.automate];

function test_domain_crud(request, enabled, appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: critical
  //       initialEstimate: 1/30h
  //       tags: automate
  //   
  let domain = appliance.collections.domains.create({
    name: fauxfactory.gen_alpha(),
    description: fauxfactory.gen_alpha(),
    enabled
  });

  request.addfinalizer(domain.delete_if_exists);
  if (!domain.exists) throw new ();
  let view = navigate_to(domain, "Details");

  if (is_bool(enabled)) {
    if (!!view.title.text.include("Disabled")) throw new ()
  } else if (!view.title.text.include("Disabled")) {
    throw new ()
  };

  let updated_description = fauxfactory.gen_alpha(
    20,
    {start: "editdescription_"}
  );

  update(domain, () => domain.description = updated_description);
  view = navigate_to(domain, "Edit");
  if (view.description.value != updated_description) throw new ();
  if (!domain.exists) throw new ();
  domain.delete({cancel: true});
  if (!domain.exists) throw new ();
  domain.delete();
  if (!!domain.exists) throw new ()
};

function test_domain_edit_enabled(domain, appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       initialEstimate: 1/16h
  //       caseimportance: high
  //       tags: automate
  //   
  if (!domain.exists) throw new ();
  let view = navigate_to(domain, "Details");
  if (!!view.title.text.include("Disabled")) throw new ();
  update(domain, () => domain.enabled = false);
  view = navigate_to(domain, "Details");
  if (!view.title.text.include("Disabled")) throw new ()
};

function test_domain_lock_disabled(klass) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: medium
  //       initialEstimate: 1/16h
  //       tags: automate
  //   
  let schema_field = fauxfactory.gen_alphanumeric();

  update(
    klass.namespace.domain,
    () => klass.namespace.domain.enabled = false
  );

  klass.schema.add_fields({
    name: schema_field,
    type: "Method",
    data_type: "String"
  });

  let method = klass.methods.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    location: "inline"
  });

  let instance = klass.instances.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),
    fields: {schema_field: {value: method.name}}
  });

  let result = LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {matched_patterns: [".*ERROR.*"]}
  );

  result.start_monitoring();

  simulate({
    appliance: klass.appliance,

    attributes_values: {
      namespace: klass.namespace.name,
      class: klass.name,
      instance: instance.name
    },

    message: "create",
    request: "Call_Instance",
    execute_methods: true
  });

  if (!result.validate({wait: "60s"})) throw new ();
  klass.namespace.domain.lock();
  let view = navigate_to(klass.namespace.domain, "Details");
  if (!view.title.text.include("Disabled")) throw new ();
  if (!view.title.text.include("Locked")) throw new ();
  klass.namespace.domain.unlock()
};

function test_domain_delete_from_table(request, appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: low
  //       initialEstimate: 1/30h
  //       tags: automate
  //   
  let generated = [];

  for (let _ in (3).times) {
    let domain = appliance.collections.domains.create({
      name: fauxfactory.gen_alpha(),
      description: fauxfactory.gen_alpha(),
      enabled: true
    });

    request.addfinalizer(domain.delete_if_exists);
    generated.push(domain)
  };

  appliance.collections.domains.delete(...generated);

  for (let domain in generated) {
    if (!!domain.exists) throw new ()
  }
};

function test_duplicate_domain_disallowed(domain, appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/60h
  //       tags: automate
  //   
  if (!domain.exists) throw new ();

  pytest.raises(
    Exception,
    {match: "Name has already been taken"},

    () => (
      appliance.collections.domains.create({
        name: domain.name,
        description: domain.description,
        enabled: domain.enabled
      })
    )
  )
};

function test_domain_cannot_delete_builtin(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: critical
  //       caseposneg: negative
  //       initialEstimate: 1/16h
  //       tags: automate
  //   
  let manageiq_domain = appliance.collections.domains.instantiate({name: "ManageIQ"});
  let details_view = navigate_to(manageiq_domain, "Details");
  if (!!details_view.configuration.is_displayed) throw new ()
};

function test_domain_cannot_edit_builtin(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: critical
  //       caseposneg: negative
  //       initialEstimate: 1/16h
  //       tags: automate
  //   
  let manageiq_domain = appliance.collections.domains.instantiate({name: "ManageIQ"});
  let details_view = navigate_to(manageiq_domain, "Details");
  if (!!details_view.configuration.is_displayed) throw new ()
};

function test_wrong_domain_name(request, appliance) {
  // To test whether domain is creating with wrong name or not.
  //      wrong_domain: 'Dummy Domain' (This is invalid name of Domain because there is space
  //      in the name)
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/60h
  //       tags: automate
  //   
  let wrong_domain = "Dummy Domain";
  let domain = appliance.collections.domains;

  pytest.raises(
    RuntimeError,
    () => domain.create({name: wrong_domain})
  );

  let view = domain.create_view(DomainAddView);
  view.flash.assert_message("Name may contain only alphanumeric and _ . - $ characters");
  wrong_domain = domain.instantiate({name: wrong_domain});
  request.addfinalizer(wrong_domain.delete_if_exists);
  if (!!wrong_domain.exists) throw new ()
};

function test_domain_lock_unlock(domain, appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       initialEstimate: 1/16h
  //       caseimportance: medium
  //       tags: automate
  //   
  if (!domain.exists) throw new ();
  let ns1 = domain.namespaces.create({name: "ns1"});
  let ns2 = ns1.namespaces.create({name: "ns2"});
  let cls = ns2.classes.create({name: "class1"});
  cls.schema.add_field({name: "myfield", type: "Relationship"});
  let inst = cls.instances.create({name: "inst"});
  let meth = cls.methods.create({name: "meth", script: "$evm"});
  domain.lock();
  let details = navigate_to(ns1, "Details");
  if (!!details.configuration.is_displayed) throw new ();
  details = navigate_to(ns2, "Details");
  if (!!details.configuration.is_displayed) throw new ();
  details = navigate_to(cls, "Details");
  if (!!details.configuration.is_enabled) throw new ();
  details.schema.select();
  if (!!details.configuration.is_displayed) throw new ();
  details = navigate_to(inst, "Details");
  if (!!details.configuration.is_enabled) throw new ();
  details = navigate_to(meth, "Details");
  if (!!details.configuration.is_enabled) throw new ();
  domain.unlock();
  update(ns1, () => ns1.name = "UpdatedNs1");
  if (!ns1.exists) throw new ();
  update(ns2, () => ns2.name = "UpdatedNs2");
  if (!ns2.exists) throw new ();
  update(cls, () => cls.name = "UpdatedClass");
  if (!cls.exists) throw new ();
  cls.schema.add_field({name: "myfield2", type: "Relationship"});
  update(inst, () => inst.name = "UpdatedInstance");
  if (!inst.exists) throw new ();
  update(meth, () => meth.name = "UpdatedMethod");
  if (!meth.exists) throw new ()
};

function test_object_attribute_type_in_automate_schedule(appliance) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       initialEstimate: 1/15h
  //       startsin: 5.9
  //       tags: automate
  //       testSteps:
  //           1. Go to Configuration > settings > schedules
  //           2. Select \'Add a new schedule\' from configuration drop down
  //           3. selecting \'Automation Tasks\' under Action.
  //           4. Select a value from the drop down list of Object Attribute Type.
  //           5. Undo the selection by selecting \"<Choose>\" from the drop down.
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4. No pop-up window with Internal Server Error.
  //           5. No pop-up window with Internal Server Error.
  // 
  //   Bugzilla:
  //        1479570
  //        1686762
  //   
  let view = navigate_to(appliance.collections.system_schedules, "Add");
  view.form.action_type.select_by_visible_text("Automation Tasks");
  let all_options = view.form.object_type.all_options;

  if (all_options.size < 2) {
    throw new OptionNotAvailable("Options not available")
  };

  for (let option in all_options) {
    if (is_bool(!BZ(1686762).blocks && ["Tenant", "EVM Group"].include(option.text))) {
      view.form.object_type.select_by_visible_text(option.text);
      view.flash.assert_no_error();
      view.form.object_type.select_by_visible_text("<Choose>");
      view.flash.assert_no_error()
    }
  }
};

function test_copy_to_domain(domain) {
  // This test case checks whether automate class, instance and method are successfully copying to
  //   domain.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //       startsin: 5.9
  //       tags: automate
  //       setup:
  //           1. Create new custom domain
  //       testSteps:
  //           1. Go to Automation > Automate > Explorer
  //           2. Select any class, instance and method from ManageIQ domain
  //           3. Copy selected things one by one to new custom domain by selecting
  //              \"Copy this Method/Instance/Class\" from configuration toolbar
  //       expectedResults:
  //           1.
  //           2.
  //           3. Class, Instance and Method should be copied to new domain and assert message should
  //              appear after copying these things to new domain.
  // 
  //   Bugzilla:
  //       1500956
  //   
  let miq = domain.appliance.collections.domains.instantiate("ManageIQ").namespaces.instantiate("System").namespaces.instantiate("CommonMethods");
  let original_klass = miq.classes.instantiate("MiqAe");
  original_klass.copy_to({domain});
  let klass = domain.browser.create_view(ClassCopyView);
  klass.flash.wait_displayed();
  klass.flash.assert_message("Copy selected Automate Class was saved");
  let original_instance = miq.classes.instantiate("QuotaMethods").instances.instantiate("quota_source");
  original_instance.copy_to({domain});
  let instance = domain.browser.create_view(InstanceCopyView);
  instance.flash.wait_displayed();
  instance.flash.assert_message("Copy selected Automate Instance was saved");
  let original_method = miq.classes.instantiate("QuotaStateMachine").methods.instantiate("rejected");
  original_method.copy_to({domain});
  let method = domain.browser.create_view(MethodCopyView);
  method.flash.wait_displayed();
  method.flash.assert_message("Copy selected Automate Method was saved")
};

function new_user(request, appliance) {
  // This fixture creates custom user with tenant attached
  let tenant = _tenants(request, appliance);
  let role = appliance.rest_api.collections.roles.get({name: "EvmRole-super_administrator"});
  let group = _groups(request, appliance, role, {tenant});

  let [user, user_data] = _users(
    request,
    appliance,
    {group: group.description}
  );

  yield([
    appliance.collections.users.instantiate({
      name: user[0].name,

      credential: Credential({
        principal: user_data[0].userid,
        secret: user_data[0].password
      })
    }),

    tenant
  ])
};

function test_tenant_attached_with_domain(request, new_user, domain) {
  // 
  //   Note: This RFE which has introduced extra column for tenant on domain all view
  // 
  //   Bugzilla:
  //       1678122
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       caseposneg: positive
  //       startsin: 5.11
  //       casecomponent: Automate
  //       setup: Create new user
  //       testSteps:
  //           1. Log in with admin. Create automate domain and navigate to domains all page
  //           2. Log in with new user. Create automate domain and navigate to domains all page
  //       expectedResults:
  //           1. Automate domain should be assigned with tenant - 'My Company'
  //           2. Automate domain should be assigned with new user's tenant
  //   
  let [user, tenant] = new_user;
  let view = navigate_to(domain.parent, "All");

  if (view.domains.row({name: domain.name}).Tenant.text != "My Company") {
    throw new ()
  };

  user(() => {
    let new_domain = domain.appliance.collections.domains.create({
      name: fauxfactory.gen_alpha(),
      description: fauxfactory.gen_alpha(),
      enabled: true
    });

    request.addfinalizer(new_domain.delete_if_exists);

    for (let domain in view.domains.read()) {
      if (domain.Name == new_domain.name) {
        if (domain.Tenant != tenant.name) throw new ()
      } else if (domain.Tenant != "My Company") {
        throw new ()
      }
    }
  })
};

function user(appliance) {
  // Creates new user with role which does not have permission of modifying automate domains
  let product_features = [[
    [
      "Everything",
      "Automation",
      "Automate",
      "Explorer",
      "Automate Domains",
      "Modify"
    ],

    false
  ]];

  let role = appliance.collections.roles.create({
    name: fauxfactory.gen_alphanumeric(),
    product_features
  });

  let group = appliance.collections.groups.create({
    description: fauxfactory.gen_alphanumeric(),
    role: role.name,
    tenant: appliance.collections.tenants.get_root_tenant().name
  });

  let user = appliance.collections.users.create({
    name: fauxfactory.gen_alphanumeric().downcase(),

    credential: Credential({
      principal: fauxfactory.gen_alphanumeric(4),
      secret: fauxfactory.gen_alphanumeric(4)
    }),

    email: fauxfactory.gen_email(),
    groups: group,
    cost_center: "Workload",
    value_assign: "Database"
  });

  yield(user);
  user.delete_if_exists();
  group.delete_if_exists();
  role.delete_if_exists()
};

function test_automate_restrict_domain_crud(user, custom_instance) {
  // 
  //   When you create a role that can only view automate domains, it can view automate domains but it
  //   cannot manipulate the domains themselves as well as can not CRUD on namespaces, classes,
  //   instances etc.
  // 
  //   Bugzilla:
  //       1365493
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: automate
  //   
  let instance = custom_instance.call({ruby_code: null});

  user(() => {
    let view = navigate_to(instance, "Details");
    if (!!view.configuration.is_displayed) throw new ();
    view = navigate_to(instance.klass, "Details");
    if (!!view.configuration.is_displayed) throw new ();
    view = navigate_to(instance.klass.namespace, "Details");
    if (!!view.configuration.is_displayed) throw new ();
    view = navigate_to(instance.klass.namespace.domain, "Details");
    if (!!view.configuration.is_displayed) throw new ()
  })
};

function test_redhat_domain_sync_after_upgrade(temp_appliance_preconfig, file_name) {
  // 
  //   Bugzilla:
  //       1693362
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       caseposneg: positive
  //       casecomponent: Automate
  //       testSteps:
  //           1. Either dump database of appliance with version X to appliance with version Y
  //              or upgrade the appliance
  //           2. grep 'domain version on disk differs from db version' /var/www/miq/vmdb/log/evm.log
  //           3. Check last_startup.txt file
  //       expectedResults:
  //           1.
  //           2. You should find this string in logs: RedHat domain version on disk differs from db
  //              version
  //           3. You should find this string in file: RedHat domain version on disk differs from db
  //              version
  //   
  let db_file = FTPClientWrapper(cfme_data.ftpserver.entities.databases).get_file(file_name);
  let db_path = File.join("/tmp", db_file.name);

  if (!(temp_appliance_preconfig.ssh_client.run_command(`curl -o ${db_path} ftp://${db_file.link}`)).success) {
    throw new ()
  };

  (LogValidator("/var/www/miq/vmdb/log/evm.log", {matched_patterns: [
    ".*domain version on disk differs from db version.*",
    ".*RedHat domain version on disk differs from db version.*",
    ".*ManageIQ domain version on disk differs from db version.*"
  ]})).waiting({timeout: 1000}, () => (
    temp_appliance_preconfig.db.restore_database(
      db_path,
      {is_major: bool(temp_appliance_preconfig.version > "5.11")}
    )
  ))
};

function custom_domain(custom_instance) {
  // This fixture creates dastastore setup and updates the name and description of domain. So that
  //      the domain with same name can be imported successfully.
  //   
  let instance = custom_instance.call({ruby_code: null});
  let domain_info = "bz_1752875";
  instance.domain.update({name: domain_info, description: domain_info});

  let domain = instance.appliance.collections.domains.instantiate({
    name: domain_info,
    description: domain_info
  });

  domain.lock();
  yield(domain);
  domain.delete_if_exists()
};

function test_existing_domain_child_override(appliance, custom_domain, import_data) {
  // 
  //   PR:
  //       https://github.com/ManageIQ/manageiq-ui-classic/pull/4912
  // 
  //   Bugzilla:
  //       1752875
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       caseposneg: positive
  //       casecomponent: Automate
  //       setup: First three steps are performed manually to have datastore zip file
  //           1. Create custom domain and copy class - \"ManageIQ/System/Process\"
  //           2. Lock this domain
  //           3. Navigate to Automation > automate > Import/export and click on \"export all classes
  //              and instances to file\"
  //           4. Go to custom domain and unlock it. Remove instance - \"ManageIQ/System/Process/\" and
  //              copy - \"ManageIQ/System/Process/Request\" (you can copy more classes or methods or
  //              instances) to custom domain and again lock the domain.
  //       testSteps:
  //           1. Navigate to Import/Export page and import the exported file
  //           2. Select \"Select domain you wish to import from:\" - \"custom_domain\" and check Toggle
  //              All/None
  //           3. Click on commit button.
  //           4. Then navigate to custom domain and unlock it
  //           5. Perform step 1, 2 and 3(In this case, domain will get imported)
  //           6. Go to custom domain
  //       expectedResults:
  //           1.
  //           2.
  //           3. You should see flash message: \"Error: Selected domain is locked\"
  //           4.
  //           5. Selected domain imported successfully
  //           6. You should see imported namespace, class, instance or method
  //   
  let fs = FTPClientWrapper(cfme_data.ftpserver.entities.datastores);
  let file_path = fs.download(import_data.file_name);

  let datastore = appliance.collections.automate_import_exports.instantiate({
    import_type: "file",
    file_path
  });

  datastore.import_domain_from(
    import_data.from_domain,
    import_data.to_domain
  );

  let view = appliance.browser.create_view(FileImportSelectorView);
  view.flash.assert_message("Error: Selected domain is locked");
  custom_domain.unlock();

  datastore.import_domain_from(
    import_data.from_domain,
    import_data.to_domain
  );

  view.flash.assert_no_error();
  view = navigate_to(custom_domain, "Details");

  if (!view.datastore.tree.has_path(
    "Datastore",
    `${custom_domain.name}`,
    "System",
    "Process"
  )) throw new ()
}
