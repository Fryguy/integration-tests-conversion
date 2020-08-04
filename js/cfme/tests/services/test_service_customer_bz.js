require("None");
require_relative("wait_for");
include(Wait_for);
require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/dialogs/service_dialogs");
include(Cfme.Automate.Dialogs.Service_dialogs);
require_relative("cfme/fixtures/automate");
include(Cfme.Fixtures.Automate);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.meta({server_roles: "+automate"}),

  pytest.mark.usefixtures(
    "setup_provider_modscope",
    "uses_infra_providers"
  ),

  test_requirements.customer_stories,
  test_requirements.service,
  pytest.mark.long_running,

  pytest.mark.provider([InfraProvider], {
    selector: ONE_PER_TYPE,

    required_fields: [
      ["provisioning", "template"],
      ["provisioning", "host"],
      ["provisioning", "datastore"]
    ],

    scope: "module"
  })
];

function test_edit_bundle_entry_point(appliance, provider, catalog_item, request) {
  // Tests editing a catalog bundle enrty point and check if the value is saved.
  //   Metadata:
  //       test_flag: provision
  // 
  //   Bugzilla:
  //       1698431
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/4h
  //       tags: service
  //   
  let prov_entry_point = [
    "Datastore",
    "ManageIQ (Locked)",
    "Service",
    "Provisioning",
    "StateMachines",
    "ServiceProvision_Template",
    "CatalogItemInitialization"
  ];

  let vm_name = catalog_item.prov_data.catalog.vm_name;

  request.addfinalizer(() => (
    appliance.collections.infra_vms.instantiate(
      `${vm_name}0001`,
      provider
    ).cleanup_on_provider()
  ));

  let bundle_name = fauxfactory.gen_alphanumeric(
    12,
    {start: "bundle_"}
  );

  let catalog_bundle = appliance.collections.catalog_bundles.create(
    bundle_name,

    {
      catalog_items: [catalog_item.name],
      catalog: catalog_item.catalog,
      description: "catalog_bundle",
      display_in: true,
      dialog: catalog_item.dialog,
      provisioning_entry_point: prov_entry_point
    }
  );

  let view = navigate_to(catalog_bundle, "Edit");

  if (view.basic_info.provisioning_entry_point.value != "/Service/Provisioning/StateMachines/ServiceProvision_Template/CatalogItemInitialization") {
    throw new ()
  };

  view.cancel_button.click()
};

function test_refresh_dynamic_field(appliance, import_datastore, import_data, catalog_item_with_imported_dialog) {
  // Tests refresh dynamic field when field name has 'password' in label.
  //   Metadata:
  //       test_flag: provision
  // 
  //   Bugzilla:
  //       1705021
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/4h
  //       tags: service
  //       setup:
  //           1. Import bz dialog
  //           2. Import  bz datastore
  //           3. Create catalog item
  //       testSteps:
  //           1. Order service catalog and refresh dynamic field
  //       expectedResults:
  //           1. Refreshing dynamic field should work and submit button should enable
  //   
  let [cat_item, ele_label] = catalog_item_with_imported_dialog;

  let service_catalogs = ServiceCatalogs(
    appliance,
    cat_item.catalog,
    cat_item.name
  );

  let view = navigate_to(service_catalogs, "Order");
  view.wait_displayed("5s");
  view.fields(ele_label).fill("Password");
  Wait_for.wait_for(() => !view.submit_button.disabled, {timeout: 7})
};

function test_update_dynamic_checkbox_field(appliance, import_datastore, import_data, catalog_item_with_imported_dialog) {
  // Tests update dynamic check box field when Selecting true in dropdown.
  //   Metadata:
  //       test_flag: provision
  // 
  //   Bugzilla:
  //       1570152
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/8h
  //       tags: service
  //       setup:
  //           1. Import bz dialog
  //           2. Import bz datastore
  //           3. Create catalog item
  //       testSteps:
  //           1. Order service catalog and Select True from dropdown
  //       expectedResults:
  //           1. Selecting true from dropdown field should update dynamic check box field
  //   
  let [cat_item, ele_label] = catalog_item_with_imported_dialog;

  let service_catalogs = ServiceCatalogs(
    appliance,
    cat_item.catalog,
    cat_item.name
  );

  let view = navigate_to(service_catalogs, "Order");
  view.wait_displayed("5s");
  view.fields(ele_label).dropdown.fill("true");

  try {
    Wait_for.wait_for(
      () => (
        view.fields("checkbox").checkbox.read() === true && !view.submit_button.disabled
      ),

      {timeout: 60}
    )
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      pytest.fail("Checkbox did not checked and Submit button did not enable in time")
    } else {
      throw $EXCEPTION
    }
  }
};

function test_edit_import_dialog(import_dialog) {
  // Tests update import dialog.
  // 
  //   Bugzilla:
  //       1720617
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //       tags: service
  //   
  let [sd, ele_label] = import_dialog;
  let description = fauxfactory.gen_alphanumeric();
  update(sd, () => sd.description = description);
  let view = sd.create_view(DetailsDialogView);
  view.flash.assert_success_message(`${sd.label} was saved`);
  view = navigate_to(sd.parent, "All");

  if (view.table.row(["Label", sd.label]).description.text != description) {
    throw new ()
  }
};

function test_dialog_with_dynamic_expression(appliance, provider, import_data, import_datastore, catalog_item_with_imported_dialog) {
  // 
  //   Bugzilla:
  //       1583694
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.10
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //   
  let [cat_item, ele_label] = catalog_item_with_imported_dialog;

  let service_catalogs = ServiceCatalogs(
    appliance,
    cat_item.catalog,
    cat_item.name
  );

  let [tmp1, tmp2] = sample(
    provider.appliance.collections.infra_templates.all(),
    2
  );

  let group = appliance.collections.groups.instantiate("EvmGroup-super_administrator");
  tmp1.set_ownership({group});
  tmp2.set_ownership({group});
  let view = navigate_to(service_catalogs, "Order");
  let value = view.fields(ele_label).dropdown.read();

  if (!view.fields(ele_label).dropdown.fill((value == tmp1.name ? tmp2.name : tmp1.name))) {
    throw new ()
  }
}
