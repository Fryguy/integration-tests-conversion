require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.general_ui, pytest.mark.tier(3)]
def some_dialogs(appliance, request)
  to_delete = []
  request.addfinalizer(lambda{|| to_delete.map{|obj| obj.delete()}})
  for i in 6.times
    random_str = fauxfactory.gen_alphanumeric(16)
    element_data = {"element_information" => {"ele_label" => "ele_#{random_str}", "ele_name" => format(random_str), "ele_desc" => format(random_str), "choose_type" => "Check Box"}}
    service_dialogs = appliance.collections.service_dialogs
    sd = service_dialogs.create(label: "test_paginator_#{random_str}", description: "my dialog")
    tab = sd.tabs.create(tab_label: "tab_#{random_str}", tab_desc: "my tab desc")
    box = tab.boxes.create(box_label: "box_#{random_str}", box_desc: "my box desc")
    box.elements.create(element_data: [element_data])
    to_delete.push(sd)
  end
  return to_delete
end
def get_relevant_rows(table)
  result = []
  for row in table.rows()
    text = row.label.text
    if is_bool(text.startswith("test_paginator_"))
      result.push(text)
    end
  end
  return result
end
def test_paginator_service_dialogs(some_dialogs, soft_assert, appliance)
  #  This test tests weird behaviour of the paginator in Service dialogs.
  # 
  #   Prerequisities:
  #       * There have to be couple of service dialogs, about 16 is recommended.
  # 
  #   Steps:
  #       * Go to service dialogs page
  #       * Set the paginator to 50 results per page, then to 5 results per page.
  #       * Assert there are 5 rows displayed in the table
  #       * Then cycle through the pages. Note all the dialogs you see, in the end the list of all
  #           dialogs must contain all idalogs you created before.
  #       * During the cycling, assert the numbers displayed in the paginator make sense
  #       * During the cycling, assert the paginator does not get stuck.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       initialEstimate: 1/4h
  #   
  service_dialog = appliance.collections.service_dialogs
  view = navigate_to(service_dialog, "All")
  view.paginator.set_items_per_page(50)
  view.paginator.set_items_per_page(5)
  soft_assert.(view.table.rows().to_a.size == 5, "Changing number of rows failed!")
  current_rec_offset = nil
  dialogs_found = Set.new()
  for _ in view.paginator.pages()
    if view.paginator.min_item == current_rec_offset
      soft_assert.(false, "Paginator is locked, it does not advance to next page")
      break
    end
    for text in get_relevant_rows(view.table)
      dialogs_found.add(text)
    end
    current_total = view.paginator.items_amount
    current_rec_offset = view.paginator.min_item
    current_rec_end = view.paginator.max_item
    raise "Incorrect paginator value, expected {} <= {} <= {}".format(current_rec_offset, current_rec_end, current_total) unless (current_rec_offset.to_i <= current_rec_end.to_i) and (current_rec_end.to_i <= current_total.to_i)
  end
  raise "Could not find all dialogs by clicking the paginator!" unless some_dialogs.map{|dlg| dlg.label}.to_set <= dialogs_found
end
