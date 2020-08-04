require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [test_requirements.general_ui, pytest.mark.tier(3)];

function some_dialogs(appliance, request) {
  let to_delete = [];
  request.addfinalizer(() => to_delete.map(obj => obj.delete()));

  for (let i in (6).times) {
    let random_str = fauxfactory.gen_alphanumeric(16);

    let element_data = {element_information: {
      ele_label: `ele_${random_str}`,
      ele_name: format(random_str),
      ele_desc: format(random_str),
      choose_type: "Check Box"
    }};

    let service_dialogs = appliance.collections.service_dialogs;

    let sd = service_dialogs.create({
      label: `test_paginator_${random_str}`,
      description: "my dialog"
    });

    let tab = sd.tabs.create({
      tab_label: `tab_${random_str}`,
      tab_desc: "my tab desc"
    });

    let box = tab.boxes.create({
      box_label: `box_${random_str}`,
      box_desc: "my box desc"
    });

    box.elements.create({element_data: [element_data]});
    to_delete.push(sd)
  };

  return to_delete
};

function get_relevant_rows(table) {
  let result = [];

  for (let row in table.rows()) {
    let text = row.label.text;
    if (is_bool(text.startswith("test_paginator_"))) result.push(text)
  };

  return result
};

function test_paginator_service_dialogs(some_dialogs, soft_assert, appliance) {
  //  This test tests weird behaviour of the paginator in Service dialogs.
  // 
  //   Prerequisities:
  //       * There have to be couple of service dialogs, about 16 is recommended.
  // 
  //   Steps:
  //       * Go to service dialogs page
  //       * Set the paginator to 50 results per page, then to 5 results per page.
  //       * Assert there are 5 rows displayed in the table
  //       * Then cycle through the pages. Note all the dialogs you see, in the end the list of all
  //           dialogs must contain all idalogs you created before.
  //       * During the cycling, assert the numbers displayed in the paginator make sense
  //       * During the cycling, assert the paginator does not get stuck.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       initialEstimate: 1/4h
  //   
  let service_dialog = appliance.collections.service_dialogs;
  let view = navigate_to(service_dialog, "All");
  view.paginator.set_items_per_page(50);
  view.paginator.set_items_per_page(5);

  soft_assert.call(
    view.table.rows().to_a.size == 5,
    "Changing number of rows failed!"
  );

  let current_rec_offset = null;
  let dialogs_found = new Set();

  for (let _ in view.paginator.pages()) {
    if (view.paginator.min_item == current_rec_offset) {
      soft_assert.call(
        false,
        "Paginator is locked, it does not advance to next page"
      );

      break
    };

    for (let text in get_relevant_rows(view.table)) {
      dialogs_found.add(text)
    };

    let current_total = view.paginator.items_amount;
    current_rec_offset = view.paginator.min_item;
    let current_rec_end = view.paginator.max_item;

    if (!(current_rec_offset.to_i <= current_rec_end.to_i) || !(current_rec_end.to_i <= current_total.to_i)) {
      throw "Incorrect paginator value, expected {} <= {} <= {}".format(
        current_rec_offset,
        current_rec_end,
        current_total
      )
    }
  };

  if (some_dialogs.map(dlg => dlg.label).to_set > dialogs_found) {
    throw "Could not find all dialogs by clicking the paginator!"
  }
}
