require_relative("cfme");
include(Cfme);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance/implementations/ssui");
include(Cfme.Utils.Appliance.Implementations.Ssui);

function tagcontrol_dialog(appliance) {
  let service_dialog = appliance.collections.service_dialogs;
  let dialog = fauxfactory.gen_alphanumeric(12, {start: "dialog_"});

  let element_data = {
    element_information: {
      ele_label: "Service Level",
      ele_name: "service_level",
      ele_desc: "service_level_desc",
      choose_type: "Tag Control"
    },

    options: {field_category: "Service Level", field_required: true}
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
  yield(sd);
  sd.delete_if_exists()
};

function catalog(appliance) {
  let catalog = fauxfactory.gen_alphanumeric({start: "cat_"});

  let cat = appliance.collections.catalogs.create({
    name: catalog,
    description: "my catalog"
  });

  yield(cat);
  if (is_bool(cat.exists)) cat.delete()
};

function catalog_item(appliance, tagcontrol_dialog, catalog) {
  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.GENERIC,

    {
      name: fauxfactory.gen_alphanumeric(15, {start: "cat_item_"}),
      description: "my catalog",
      display_in: true,
      catalog,
      dialog: tagcontrol_dialog
    }
  );

  yield(catalog_item);
  if (is_bool(catalog_item.exists)) catalog_item.delete()
};

function test_tag_dialog_catalog_item_ssui(appliance, catalog_item) {
  // Tests tag dialog catalog item required field
  // 
  //    Testing BZ 1569470
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       caseimportance: high
  //       initialEstimate: 1/8h
  //       tags: ssui
  //   
  appliance.context.use(ViaSSUI, () => {
    let dialog_values = {service_level: "Gold"};

    let service = ServiceCatalogs(
      appliance,
      {name: catalog_item.name, dialog_values}
    );

    let view = navigate_to(service, "Details");
    if (!view.add_to_shopping_cart.disabled) throw new ();
    view.fill(dialog_values);
    if (!!view.add_to_shopping_cart.disabled) throw new ()
  })
}
