require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/explorer/domain");
include(Cfme.Automate.Explorer.Domain);
require_relative("cfme/fixtures/automate");
include(Cfme.Fixtures.Automate);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance/implementations/ssui");
include(Cfme.Utils.Appliance.Implementations.Ssui);
var ssui_nav = navigate_to.bind(this);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.long_running,
  test_requirements.dialog,
  pytest.mark.meta({server_roles: "+automate"})
];

let item_name = fauxfactory.gen_alphanumeric(
  15,
  {start: "cat_item_"}
);

const METHOD_TORSO = `
# Method for logging
def log(level, message)
  @method = 'Service Dialog Provider Select'
  $evm.log(level, \"\#{@method} - \#{message}\")
end

# Start Here
log(:info, \" - Listing Root Object Attributes:\") if @debug
$evm.root.attributes.sort.each { |k, v| $evm.log('info', \"\#{@method} - \t\#{k}: \#{v}\") if @debug }
log(:info, \"===========================================\") if @debug

        dialog_field = $evm.object
        dialog_field['data_type'] = 'string'
        dialog_field['required']  = 'true'
        dialog_field['sort_by']   = 'value'
        dialog_field[\"values\"] = [[1, \"one\"], [2, \"two\"], [10, \"ten\"], [50, \"fifty\"]]
`;

function dialog(appliance, copy_instance, create_method) {
  let service_dialogs = appliance.collections.service_dialogs;
  let dialog = fauxfactory.gen_alphanumeric(12, {start: "dialog_"});

  let sd = service_dialogs.create({
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

  let element_data = {
    element_information: {
      ele_label: fauxfactory.gen_alphanumeric({start: "ele_"}),
      ele_name: fauxfactory.gen_alphanumeric(),
      ele_desc: fauxfactory.gen_alphanumeric(),
      choose_type: "Dropdown"
    },

    options: {dynamic_chkbox: true}
  };

  box.elements.create({element_data: [element_data]});
  yield(sd)
};

function catalog(appliance) {
  let cat_name = fauxfactory.gen_alphanumeric({start: "cat_"});

  let catalog = appliance.collections.catalogs.create({
    name: cat_name,
    description: "my catalog"
  });

  yield(catalog)
};

function copy_domain(request, appliance) {
  let domain = DomainCollection(appliance).create({
    name: "new_domain",
    enabled: true
  });

  request.addfinalizer(domain.delete_if_exists);
  return domain
};

function create_method(request, copy_domain) {
  return copy_domain.namespaces.instantiate({name: "System"}).classes.instantiate({name: "Request"}).methods.create({
    name: "InspectMe",
    location: "inline",
    script: METHOD_TORSO
  })
};

function copy_instance(request, copy_domain, appliance) {
  let miq_domain = DomainCollection(appliance).instantiate({name: "ManageIQ"});
  let instance = miq_domain.namespaces.instantiate({name: "System"}).classes.instantiate({name: "Request"}).instances.instantiate({name: "InspectMe"});
  instance.copy_to(copy_domain)
};

function test_dynamicdropdown_dialog(appliance, dialog, catalog) {
  // 
  //   Bugzilla:
  //       1514584
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       tags: service
  //   
  let item_name = fauxfactory.gen_alphanumeric(
    15,
    {start: "cat_item_"}
  );

  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.GENERIC,

    {
      name: item_name,
      description: "my catalog",
      display_in: true,
      catalog,
      dialog
    }
  );

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  service_catalogs.order()
};

function test_dynamic_submit_cancel_button_service(request, appliance, generic_service, import_dialog, import_datastore, import_data) {
  // 
  //   Bugzilla:
  //       1611527
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/6h
  //       startsin: 5.10
  //       testSteps:
  //           1. Import Datastore and dialog
  //           2. Create button with above dialog
  //           3. Create catalog item
  //           4. Order the service
  //           5. Go to My services
  //           6. Click on created service
  //           7. load the service with a button
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5.
  //           6.
  //           7. Submit and Cancel button should be enabled
  //   
  let [service, _] = generic_service;
  let [sd, ele_label] = import_dialog;
  let collection = appliance.collections.button_groups;

  let button_gp = collection.create({
    text: fauxfactory.gen_alphanumeric({start: "grp_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "grp_hvr_"}),
    type: collection.getattr("SERVICE")
  });

  request.addfinalizer(button_gp.delete_if_exists);

  let button = button_gp.buttons.create({
    text: fauxfactory.gen_alphanumeric({start: "btn_"}),
    hover: fauxfactory.gen_alphanumeric(15, {start: "btn_hvr_"}),
    dialog: sd.label,
    system: "Request",
    request: "InspectMe"
  });

  request.addfinalizer(button.delete_if_exists);
  let view = navigate_to(service, "Details");
  let custom_button_group = Dropdown(view, button_gp.text);
  if (!custom_button_group.is_displayed) throw new ();
  custom_button_group.item_select(button.text);
  view = view.browser.create_view(DropdownDialogView, {wait: "60s"});
  let serv = view.service_name(ele_label);
  serv.dropdown.wait_displayed();

  wait_for(
    () => !view.submit.disabled && view.cancel.disabled,
    {timeout: 120}
  )
};

function test_dropdown_dialog_descending_values(appliance, generic_catalog_item_with_imported_dialog) {
  // 
  //   Bugzilla:
  //       1593874
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //       startsin: 5.10
  //   testSteps:
  //           1. Create a dropdown dialog with values 'X', 'S', 'A', 'B'
  //           2. 'Sort by' is set to 'None'
  //           3. Add catalog item
  //           4. Go to service order page
  //           5. Check the values in dropdown
  //   expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5. Drop down list should not be sorted
  //   
  let [catalog_item, sd, ele_label] = generic_catalog_item_with_imported_dialog;

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  let value = ["<None>", "X", "S", "A", "B"];
  let view = navigate_to(service_catalogs, "Order");

  let options_list = view.fields(ele_label).dropdown.all_options.map(option => (
    option.text
  ));

  if (options_list != value) throw new ()
};

function test_dynamic_dropdown_load_value_on_init(appliance, import_datastore, import_data, generic_catalog_item_with_imported_dialog, context) {
  // 
  //   Bugzilla:
  //       1322594
  //       1581996
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.10
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //   
  let [catalog_item, _, _] = generic_catalog_item_with_imported_dialog;

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  appliance.context.use(context, () => {
    let view;

    if (context == ViaSSUI) {
      view = ssui_nav(service_catalogs, "Details")
    } else {
      view = navigate_to(service_catalogs, "Order")
    };

    wait_for(
      () => (
        view.fields("dropdown_list_1").read() == "fifty" && view.fields("dropdown_list_2_1_1").read() == "10"
      ),

      {timeout: 60}
    )
  })
};

function test_dynamic_field_on_textbox(request, appliance, import_datastore, import_data, import_dialog, file_name, catalog) {
  // 
  //   Bugzilla:
  //       1613443
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.9
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //       testSteps:
  //           1. Import Datastore and dialog
  //           2. Add service catalog with above created dialog
  //           3. Navigate to order page of service
  //           4. In service Order page
  //           5. Add value in first textbox
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5. Second textbox should update with value
  //   
  let [sd, ele_label] = import_dialog;

  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.GENERIC,

    {
      name: fauxfactory.gen_alpha(),
      description: fauxfactory.gen_alpha(),
      display_in: true,
      catalog,
      dialog: sd
    }
  );

  request.addfinalizer(catalog_item.delete_if_exists);

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  let view = navigate_to(service_catalogs, "Order");
  view.fields(ele_label).fill(fauxfactory.gen_alphanumeric());

  wait_for(
    () => view.fields("name_validation").read() == "indice_1",
    {timeout: 7}
  )
};

function test_dialog_dynamic_field_refresh_in_log(appliance, import_datastore, import_data, generic_catalog_item_with_imported_dialog) {
  // 
  //   Bugzilla:
  //       1559999
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.10
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //       setup:
  //           1. Import Datastore and dialog
  //       testSteps:
  //           1. Add service catalog with above imported dialog
  //           2. Navigate to order page of service
  //           3. In service Order page
  //           4. Click on \"refresh\" for field 2
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4. Only text Field2 should be refreshed in automation log
  //   
  let [catalog_item, sd, ele_label] = generic_catalog_item_with_imported_dialog;

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  let view = navigate_to(service_catalogs, "Order");

  (LogValidator("/var/www/miq/vmdb/log/automation.log", {
    matched_patterns: [".*Refreshing field : RefreshField2.*"],
    failure_patterns: [".*Refreshing field : RefreshField1.*"]
  })).waiting(
    {timeout: 120},
    () => view.fields("Refresh2").refresh.click()
  )
};

function test_read_dynamic_textbox_dialog_element(appliance, import_datastore, import_data, generic_catalog_item_with_imported_dialog) {
  // 
  //   Bugzilla:
  //       1576107
  //       1704695
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.10
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //   
  let [catalog_item, sd, ele_label] = generic_catalog_item_with_imported_dialog;

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  let view = navigate_to(service_catalogs, "Order");
  view.fields("DYNAMIC TXTBOX2").refresh.click();

  wait_for(
    () => view.fields("dyna_txtbox2").read() == "YES",
    {timeout: 7}
  )
};

function test_dynamic_field_update_on_refresh(appliance, import_datastore, import_data, file_name, generic_catalog_item_with_imported_dialog) {
  // 
  //   Bugzilla:
  //       1580535
  //       1694737
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.10
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //       testSteps:
  //           1. Import Datastore and dialog
  //           2. Add service catalog with above created dialog
  //           3. Navigate to order page of service
  //           4. In service Order page
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4. dynamic field should update correctly
  //   
  let [catalog_item, sd, ele_label] = generic_catalog_item_with_imported_dialog;

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  let view = navigate_to(service_catalogs, "Order");
  view.fields("Menu").refresh.click();
  let menu = view.fields("menu").read();
  let topping = view.fields("dropdown_list_1").read();

  let data = {
    Burger: "Black Bean",
    Fries: "Sweet Potato",
    Shake: "Vanilla",
    "Empty Set": "Nothing selected for parent dialog"
  };

  if (topping != data[menu]) throw new ()
};

function test_update_dynamic_field_on_refresh(appliance, import_datastore, import_data, generic_catalog_item_with_imported_dialog) {
  // 
  //   Bugzilla:
  //       1364407
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.10
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //   
  let [catalog_item, sd, ele_label] = generic_catalog_item_with_imported_dialog;

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  let view = navigate_to(service_catalogs, "Order");
  view.fields("Configuration Type Required").radiogroup.select("Configure with reboot");

  wait_for(
    () => (
      view.fields("dynamic_1").read() == "reboot" && view.fields("dynamic_2").read() == "reboot"
    ),

    {timeout: 7}
  )
};

function test_load_service_dialog(appliance, import_datastore, generic_catalog_item_with_imported_dialog) {
  // 
  //   Bugzilla:
  //       1595776
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.10
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //   
  let auto_log = "/var/www/miq/vmdb/log/automation.log";
  let [catalog_item, _, _] = generic_catalog_item_with_imported_dialog;

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  (LogValidator(
    auto_log,
    {matched_patterns: ["Service dialog load - Begin"]}
  )).waiting({timeout: 120}, () => {
    let view = navigate_to(service_catalogs, "Order")
  });

  (LogValidator(
    auto_log,
    {failure_patterns: ["Service dialog load - Begin"]}
  )).waiting({timeout: 120}, () => {
    view.submit_button.click();
    let description = `Provisioning Service [${catalog_item.name}] from [${catalog_item.name}]`;
    let provision_request = appliance.collections.requests.instantiate(description);
    provision_request.wait_for_request({method: "ui"})
  })
}
