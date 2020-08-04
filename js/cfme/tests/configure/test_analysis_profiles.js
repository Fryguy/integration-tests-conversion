require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.configuration
];

let files_list = [
  {Name: "/etc/test/true", "Collect Contents?": true},
  {Name: "/etc/test/false", "Collect Contents?": false}
];

let categories_list = ["System", "User Accounts"];

let registry_list = [{
  "Registry Key": "test-reg-key",
  "Registry Value": "test-reg-value"
}];

let events_list = [{
  Name: "test-event",
  "Filter Message": "test-msg",
  Source: "test-src",
  "# of Days": "5"
}];

let updated_files = [{
  Name: files_list[0].Name,
  "Collect Contents?": !files_list[0]["Collect Contents?"]
}];

const TENANT_NAME = fauxfactory.gen_alphanumeric(
  15,
  {start: "tenant_"}
);

const OPERATIONS = ["Add", "Edit", "Delete", "Copy"];

const PRODUCT_FEATURES_DIALOG = OPERATIONS.map(op => (
  [
    "Everything",
    "Automation",
    "Automate",
    "Customization",
    "Dialogs",
    "Modify"
  ] + [op, `${op} (${TENANT_NAME})`]
));

const PRODUCT_FEATURES_QUOTA = ["My Company", TENANT_NAME].map(tenant => (
  [
    "Everything",
    "Settings",
    "Configuration",
    "Access Control",
    "Tenants",
    "Modify",
    "Manage Quotas"
  ] + [`Manage Quotas (${tenant})`]
));

function default_host_profile(analysis_profile_collection) {
  return analysis_profile_collection.instantiate({
    name: "host sample",
    description: "Host Sample",
    profile_type: analysis_profile_collection.HOST_TYPE
  })
};

function analysis_profile_collection(appliance) {
  return appliance.collections.analysis_profiles
};

function test_vm_analysis_profile_crud(appliance, soft_assert, analysis_profile_collection) {
  // CRUD for VM analysis profiles.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       caseimportance: medium
  //       casecomponent: Configuration
  //       initialEstimate: 1/2h
  //       testtype: functional
  //   
  let vm_profile = analysis_profile_collection.create({
    name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),
    profile_type: analysis_profile_collection.VM_TYPE,
    files: files_list,
    categories: categories_list,
    registry: registry_list,
    events: events_list
  });

  let view = appliance.browser.create_view(navigator.get_class(
    analysis_profile_collection,
    "All"
  ).VIEW);

  let vm_flash = (appliance.version < "5.10" ? vm_profile.name : vm_profile.description);
  view.flash.assert_message(`Analysis Profile \"${vm_flash}\" was saved`);
  if (!vm_profile.exists) throw new ();
  update(vm_profile, () => vm_profile.files = updated_files);

  view = appliance.browser.create_view(navigator.get_class(
    vm_profile,
    "Details"
  ).VIEW);

  view.flash.assert_success_message(`Analysis Profile \"${vm_flash}\" was saved`);

  soft_assert.call(
    vm_profile.files == updated_files,
    `Files update failed on profile: ${vm_profile.name}, ${vm_profile.files}`
  );

  update(vm_profile, () => vm_profile.categories = ["System"]);

  soft_assert.call(
    vm_profile.categories == ["System"],
    `Categories update failed on profile: ${vm_profile.name}`
  );

  let copied_profile = vm_profile.copy({new_name: `copied-${vm_profile.name}`});

  view = appliance.browser.create_view(navigator.get_class(
    analysis_profile_collection,
    "All"
  ).VIEW);

  let vm_copied_flash = (appliance.version < "5.10" ? copied_profile.name : copied_profile.description);
  view.flash.assert_message(`Analysis Profile \"${vm_copied_flash}\" was saved`);
  if (!copied_profile.exists) throw new ();
  copied_profile.delete();
  if (!!copied_profile.exists) throw new ();
  vm_profile.delete();
  view.flash.assert_success_message(`Analysis Profile \"${vm_flash}\": Delete successful`);
  if (!!vm_profile.exists) throw new ()
};

function test_host_analysis_profile_crud(appliance, soft_assert, analysis_profile_collection) {
  // CRUD for Host analysis profiles.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/12h
  //   
  let host_profile = analysis_profile_collection.create({
    name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),
    profile_type: analysis_profile_collection.HOST_TYPE,
    files: files_list,
    events: events_list
  });

  let view = appliance.browser.create_view(navigator.get_class(
    analysis_profile_collection,
    "All"
  ).VIEW);

  let host_flash = (appliance.version < "5.10" ? host_profile.name : host_profile.description);
  view.flash.assert_message(`Analysis Profile \"${host_flash}\" was saved`);
  if (!host_profile.exists) throw new ();
  update(host_profile, () => host_profile.files = updated_files);

  soft_assert.call(
    host_profile.files == updated_files,

    "Files update failed on profile: {}, {}".format(
      host_profile.name,
      host_profile.files
    )
  );

  let copied_profile = host_profile.copy({new_name: `copied-${host_profile.name}`});

  view = appliance.browser.create_view(navigator.get_class(
    analysis_profile_collection,
    "All"
  ).VIEW);

  let host_copied_flash = (appliance.version < "5.10" ? copied_profile.name : copied_profile.description);
  view.flash.assert_message(`Analysis Profile \"${host_copied_flash}\" was saved`);
  if (!copied_profile.exists) throw new ();
  copied_profile.delete();
  if (!!copied_profile.exists) throw new ();
  host_profile.delete();
  view.flash.assert_success_message(`Analysis Profile \"${host_flash}\": Delete successful`);
  if (!!host_profile.exists) throw new ()
};

function test_vmanalysis_profile_description_validation(analysis_profile_collection) {
  //  Test to validate description in vm profiles
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/20h
  //   
  pytest.raises(RuntimeError, () => (
    analysis_profile_collection.create({
      name: fauxfactory.gen_alphanumeric(),
      description: null,
      profile_type: analysis_profile_collection.VM_TYPE,
      categories: categories_list
    })
  ));

  let view = analysis_profile_collection.create_view(
    navigator.get_class(analysis_profile_collection, "AddVmProfile").VIEW,
    {wait: "10s"}
  );

  view.flash.assert_message("Description can't be blank");
  view.cancel.click()
};

function test_analysis_profile_duplicate_name(analysis_profile_collection) {
  //  Test to validate duplicate profiles name.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //   
  let profile = analysis_profile_collection.create({
    name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),
    profile_type: analysis_profile_collection.VM_TYPE,
    categories: categories_list
  });

  pytest.raises(RuntimeError, () => (
    analysis_profile_collection.create({
      name: profile.name,
      description: profile.description,
      profile_type: analysis_profile_collection.VM_TYPE,
      categories: profile.categories
    })
  ));

  let view = analysis_profile_collection.create_view(
    navigator.get_class(analysis_profile_collection, "AddVmProfile").VIEW,
    {wait: "10s"}
  );

  view.flash.assert_message("Name has already been taken");
  view.cancel.click()
};

function test_delete_default_analysis_profile(default_host_profile, appliance) {
  //  Test to validate delete default profiles.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //   
  let view = navigate_to(default_host_profile, "Details");

  if (!!view.toolbar.configuration.item_enabled("Delete this Analysis Profile")) {
    throw new ()
  };

  view = navigate_to(default_host_profile.parent, "All");

  let row = view.entities.table.row({
    name: default_host_profile.name,
    description: default_host_profile.description
  });

  row[0].check();

  view.toolbar.configuration.item_select(
    "Delete the selected Analysis Profiles",
    {handle_alert: true}
  );

  view.flash.assert_message("Default Analysis Profile \"{}\" can not be deleted".format(default_host_profile.name))
};

function test_edit_default_analysis_profile(default_host_profile, appliance) {
  //  Test to validate edit default profiles.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/10h
  //   
  let view = navigate_to(default_host_profile, "Details");

  if (!!view.toolbar.configuration.item_enabled("Edit this Analysis Profile")) {
    throw new ()
  };

  view = navigate_to(default_host_profile.parent, "All");

  let row = view.entities.table.row({
    name: default_host_profile.name,
    description: default_host_profile.description
  });

  row[0].check();
  view.toolbar.configuration.item_select("Edit the selected Analysis Profiles");
  view.flash.assert_message("Sample Analysis Profile \"{}\" can not be edited".format(default_host_profile.name))
};

function test_analysis_profile_item_validation(analysis_profile_collection) {
  //  Test to validate analysis profile items.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //   
  let profile_name = fauxfactory.gen_alphanumeric();

  pytest.raises(RuntimeError, () => (
    analysis_profile_collection.create({
      name: profile_name,
      description: profile_name,
      profile_type: analysis_profile_collection.HOST_TYPE
    })
  ));

  let view = analysis_profile_collection.create_view(
    navigator.get_class(analysis_profile_collection, "AddHostProfile").VIEW,
    {wait: "10s"}
  );

  view.flash.assert_message("At least one item must be entered to create Analysis Profile");
  view.cancel.click()
};

function test_analysis_profile_name_validation(analysis_profile_collection) {
  //  Test to validate profile name.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/20h
  //   
  pytest.raises(RuntimeError, () => (
    analysis_profile_collection.create({
      name: "",
      description: fauxfactory.gen_alphanumeric(),
      profile_type: analysis_profile_collection.HOST_TYPE,
      files: files_list
    })
  ));

  let view = analysis_profile_collection.create_view(
    navigator.get_class(analysis_profile_collection, "AddHostProfile").VIEW,
    {wait: "10s"}
  );

  view.flash.assert_message("Name can't be blank");
  view.cancel.click()
};

function test_analysis_profile_description_validation(analysis_profile_collection) {
  //  Test to validate profile description.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       initialEstimate: 1/4h
  //   
  pytest.raises(RuntimeError, () => (
    analysis_profile_collection.create({
      name: fauxfactory.gen_alphanumeric(),
      description: "",
      profile_type: analysis_profile_collection.HOST_TYPE,
      files: files_list
    })
  ));

  let view = analysis_profile_collection.create_view(
    navigator.get_class(analysis_profile_collection, "AddHostProfile").VIEW,
    {wait: "10s"}
  );

  view.flash.assert_message("Description can't be blank");
  view.cancel.click()
};

function test_custom_role_modify_for_dynamic_product_feature(request, appliance, product_features) {
  // 
  //   Polarion:
  //       assignee: gaikwad
  //       initialEstimate: 1/12h
  //       caseimportance: high
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: Configuration
  //       tags: quota
  //       testSteps:
  //           1. create two tenants
  //           2. create new custom role using existing role
  //           3. Update newly created custom role by doing uncheck in to options provided under
  //              automation > automate > customization > Dialogs > modify > edit/add/copy/delete
  //              > uncheck for any tenant
  //           4. Or Update newly created custom role by doing uncheck in to options provided under
  //              Settings > Configuration > Access Control > Tenants > Modify > Manage Quotas
  //              > uncheck for any tenant
  //           5. You will see save button is not enabled but if you changed 'Name' or
  //              'Access Restriction for Services, VMs, and Templates' then save button is getting
  //              enabled.
  //           6. It updates changes only when we checked or unchecked for all of the tenants under
  //              edit/add/copy/delete options.
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5. 'save' button should be enabled after changing product feature tree.
  //           6. It should work for individual tenant.
  // 
  //   Bugzilla:
  //       1655012
  //   
  let tenant = appliance.collections.tenants.create({
    name: TENANT_NAME,

    description: fauxfactory.gen_alphanumeric(
      15,
      {start: "tenant_desc_"}
    ),

    parent: appliance.collections.tenants.get_root_tenant()
  });

  request.addfinalizer(tenant.delete);
  let role = appliance.collections.roles.instantiate({name: "EvmRole-tenant_quota_administrator"});
  let copied_role = role.copy({name: fauxfactory.gen_alpha({start: role.name})});
  request.addfinalizer(copied_role.delete);
  let view = navigate_to(copied_role, "Details");
  if (!view.features_tree.node_checked(...product_features)) throw new ();
  copied_role.update({product_features: [[product_features, false]]});
  if (!!view.features_tree.node_checked(...product_features)) throw new ()
}
