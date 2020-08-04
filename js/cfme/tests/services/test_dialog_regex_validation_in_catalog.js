require_relative("wait_for");
include(Wait_for);
require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/dialogs/dialog_element");
include(Cfme.Automate.Dialogs.Dialog_element);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
let pytestmark = [test_requirements.dialog, pytest.mark.tier(2)];

function dialog_cat_item(appliance, catalog, request) {
  let service_dialog = appliance.collections.service_dialogs;
  let dialog = fauxfactory.gen_alphanumeric(12, {start: "dialog_"});

  let element_data = {
    element_information: {
      ele_label: fauxfactory.gen_alphanumeric(15, {start: "ele_label_"}),
      ele_name: fauxfactory.gen_alphanumeric(15, {start: "ele_name_"}),
      ele_desc: fauxfactory.gen_alphanumeric(15, {start: "ele_desc_"}),
      choose_type: "Text Box"
    },

    options: {
      validation_switch: true,
      validation: request.param.validation
    }
  };

  if (appliance.version < "5.10") {
    element_data.options.pop("validation_switch", null)
  };

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

  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.GENERIC,

    {
      name: fauxfactory.gen_alphanumeric(15, {start: "cat_item_"}),
      description: "my catalog",
      display_in: true,
      catalog,
      dialog: sd
    }
  );

  yield([catalog_item, element_data, sd]);
  if (is_bool(catalog_item.exists)) catalog_item.delete();
  sd.delete_if_exists()
};

function test_dialog_element_regex_validation(appliance, dialog_cat_item) {
  // Tests Service Dialog Elements with regex validation.
  // 
  //   Testing BZ 1518971
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       caseimportance: high
  //       initialEstimate: 1/16h
  //   
  let [catalog_item, element_data, sd] = dialog_cat_item;
  let ele_name = element_data.element_information.ele_name;

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  let view = navigate_to(service_catalogs, "Order");
  view.fields(ele_name).fill("!@#%&");
  Wait_for.wait_for(() => view.submit_button.disabled, {timeout: 7});
  view.fields(ele_name).fill("test_123");
  Wait_for.wait_for(() => !view.submit_button.disabled, {timeout: 7})
};

//  Tests Service Dialog Elements with regex validation
// 
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       initialEstimate: 1/4h
//       startsin: 5.10
//       caseimportance: high
//       testSteps:
//           1. Create a dialog. Set regex_validation in text area
//           2. Use the dialog in a catalog.
//           3. Order catalog.
//       expectedResults:
//           1.
//           2.
//           3. Regex validation should work
//   
// pass
function test_dialog_text_area_element_regex_validation() {};

function test_dialog_regex_validation_button(appliance, dialog_cat_item) {
  // 
  //   Bugzilla:
  //       1720245
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //       startsin: 5.11
  //       testSteps:
  //           1. Add dialog with Regular Expression - \"^[0-9]*$\"
  //           2. Create catalog and catalog item
  //           3. Navigate to Order page of the service
  //           4. Type \"a\" and it will show a message that does not satisfy the regex.
  //           5. Clear the field
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5. Submit button should have become active when the validate field cleared
  //   
  let [catalog_item, element_data, sd] = dialog_cat_item;
  let ele_name = element_data.element_information.ele_name;

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  let view = navigate_to(service_catalogs, "Order");
  view.fields(ele_name).fill("a");
  let element = view.fields(ele_name).input;
  let msg = `Entered text should match the format: ${element_data.options.validation}`;
  if (element.warning != msg) throw new ();
  Wait_for.wait_for(() => view.submit_button.disabled, {timeout: 10});
  view.fields(ele_name).fill("");
  Wait_for.wait_for(() => view.submit_button.is_enabled, {timeout: 10})
};

function test_regex_dialog_disabled_validation(appliance, catalog, request) {
  // 
  //   Bugzilla:
  //       1721814
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //       startsin: 5.11
  //       testSteps:
  //           1. Create a dialog. Set regex_validation in text box ->  ^[0-9]*$
  //           2. Save the dialog
  //           3. Edit the dialog and disable the validation button of text box
  //           4. Use the dialog in a catalog
  //           5. Navigate to catalog order page
  //           6. Input anything except the format \" ^[0-9]*$ \"
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5.
  //           6. It shouldn\'t gives the validation error
  //   
  let service_dialog = appliance.collections.service_dialogs;

  let element_data = {
    element_information: {
      ele_label: fauxfactory.gen_alphanumeric(15, {start: "ele_label_"}),
      ele_name: fauxfactory.gen_alphanumeric(15, {start: "ele_name_"}),
      ele_desc: fauxfactory.gen_alphanumeric(15, {start: "ele_desc_"}),
      choose_type: "Text Box"
    },

    options: {validation_switch: true, validation: "^[0-9]*$"}
  };

  let sd = service_dialog.create({
    label: fauxfactory.gen_alphanumeric({start: "dialog_"}),
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
  navigate_to(sd, "Edit");
  let view = appliance.browser.create_view(EditElementView);
  let label = element_data.element_information.ele_label;
  view.element.edit_element(label);
  view.options.click();
  if (!view.options.validation_switch.fill(false)) throw new ();
  view.ele_save_button.click();
  view.save_button.click();

  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.GENERIC,

    {
      name: fauxfactory.gen_alphanumeric(15, {start: "cat_item_"}),
      description: "my catalog",
      display_in: true,
      catalog,
      dialog: sd
    }
  );

  let _cleanup = () => {
    if (is_bool(catalog_item.exists)) catalog_item.delete();
    return sd.delete_if_exists()
  };

  let ele_name = element_data.element_information.ele_name;

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  view = navigate_to(service_catalogs, "Order");

  let input_data_list = [
    fauxfactory.gen_alpha({length: 3}),
    fauxfactory.gen_number(),
    fauxfactory.gen_special({length: 5}),
    fauxfactory.gen_alphanumeric({length: 5})
  ];

  let msg = `Entered text should match the format: ${element_data.options.validation}`;

  for (let input_data in input_data_list) {
    logger.info("Entering input data: %s " % input_data);
    view.fields(ele_name).fill(input_data);
    let element = view.fields(ele_name).input;
    if (element.warning == msg) throw new ();
    if (!view.submit_button.is_enabled) throw new ()
  }
}
