require_relative 'wait_for'
include Wait_for
require_relative 'cfme'
include Cfme
require_relative 'cfme/automate/dialogs/dialog_element'
include Cfme::Automate::Dialogs::Dialog_element
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [test_requirements.dialog, pytest.mark.tier(2)]
def dialog_cat_item(appliance, catalog, request)
  service_dialog = appliance.collections.service_dialogs
  dialog = fauxfactory.gen_alphanumeric(12, start: "dialog_")
  element_data = {"element_information" => {"ele_label" => fauxfactory.gen_alphanumeric(15, start: "ele_label_"), "ele_name" => fauxfactory.gen_alphanumeric(15, start: "ele_name_"), "ele_desc" => fauxfactory.gen_alphanumeric(15, start: "ele_desc_"), "choose_type" => "Text Box"}, "options" => {"validation_switch" => true, "validation" => request.param["validation"]}}
  if appliance.version < "5.10"
    element_data["options"].pop("validation_switch", nil)
  end
  sd = service_dialog.create(label: dialog, description: "my dialog")
  tab = sd.tabs.create(tab_label: fauxfactory.gen_alphanumeric(start: "tab_"), tab_desc: "my tab desc")
  box = tab.boxes.create(box_label: fauxfactory.gen_alphanumeric(start: "box_"), box_desc: "my box desc")
  box.elements.create(element_data: [element_data])
  catalog_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.GENERIC, name: fauxfactory.gen_alphanumeric(15, start: "cat_item_"), description: "my catalog", display_in: true, catalog: catalog, dialog: sd)
  yield [catalog_item, element_data, sd]
  if is_bool(catalog_item.exists)
    catalog_item.delete()
  end
  sd.delete_if_exists()
end
def test_dialog_element_regex_validation(appliance, dialog_cat_item)
  # Tests Service Dialog Elements with regex validation.
  # 
  #   Testing BZ 1518971
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       caseimportance: high
  #       initialEstimate: 1/16h
  #   
  catalog_item,element_data,sd = dialog_cat_item
  ele_name = element_data["element_information"]["ele_name"]
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  view = navigate_to(service_catalogs, "Order")
  view.fields(ele_name).fill("!@#%&")
  Wait_for::wait_for(lambda{|| view.submit_button.disabled}, timeout: 7)
  view.fields(ele_name).fill("test_123")
  Wait_for::wait_for(lambda{|| !view.submit_button.disabled}, timeout: 7)
end
def test_dialog_text_area_element_regex_validation()
  #  Tests Service Dialog Elements with regex validation
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #       startsin: 5.10
  #       caseimportance: high
  #       testSteps:
  #           1. Create a dialog. Set regex_validation in text area
  #           2. Use the dialog in a catalog.
  #           3. Order catalog.
  #       expectedResults:
  #           1.
  #           2.
  #           3. Regex validation should work
  #   
  # pass
end
def test_dialog_regex_validation_button(appliance, dialog_cat_item)
  # 
  #   Bugzilla:
  #       1720245
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/16h
  #       startsin: 5.11
  #       testSteps:
  #           1. Add dialog with Regular Expression - \"^[0-9]*$\"
  #           2. Create catalog and catalog item
  #           3. Navigate to Order page of the service
  #           4. Type \"a\" and it will show a message that does not satisfy the regex.
  #           5. Clear the field
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5. Submit button should have become active when the validate field cleared
  #   
  catalog_item,element_data,sd = dialog_cat_item
  ele_name = element_data["element_information"]["ele_name"]
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  view = navigate_to(service_catalogs, "Order")
  view.fields(ele_name).fill("a")
  element = view.fields(ele_name).input
  msg = 
  raise unless element.warning == msg
  Wait_for::wait_for(lambda{|| view.submit_button.disabled}, timeout: 10)
  view.fields(ele_name).fill("")
  Wait_for::wait_for(lambda{|| view.submit_button.is_enabled}, timeout: 10)
end
def test_regex_dialog_disabled_validation(appliance, catalog, request)
  # 
  #   Bugzilla:
  #       1721814
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/16h
  #       startsin: 5.11
  #       testSteps:
  #           1. Create a dialog. Set regex_validation in text box ->  ^[0-9]*$
  #           2. Save the dialog
  #           3. Edit the dialog and disable the validation button of text box
  #           4. Use the dialog in a catalog
  #           5. Navigate to catalog order page
  #           6. Input anything except the format \" ^[0-9]*$ \"
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5.
  #           6. It shouldn\'t gives the validation error
  #   
  service_dialog = appliance.collections.service_dialogs
  element_data = {"element_information" => {"ele_label" => fauxfactory.gen_alphanumeric(15, start: "ele_label_"), "ele_name" => fauxfactory.gen_alphanumeric(15, start: "ele_name_"), "ele_desc" => fauxfactory.gen_alphanumeric(15, start: "ele_desc_"), "choose_type" => "Text Box"}, "options" => {"validation_switch" => true, "validation" => "^[0-9]*$"}}
  sd = service_dialog.create(label: fauxfactory.gen_alphanumeric(start: "dialog_"), description: "my dialog")
  tab = sd.tabs.create(tab_label: fauxfactory.gen_alphanumeric(start: "tab_"), tab_desc: "my tab desc")
  box = tab.boxes.create(box_label: fauxfactory.gen_alphanumeric(start: "box_"), box_desc: "my box desc")
  box.elements.create(element_data: [element_data])
  navigate_to(sd, "Edit")
  view = appliance.browser.create_view(EditElementView)
  label = element_data["element_information"]["ele_label"]
  view.element.edit_element(label)
  view.options.click()
  raise unless view.options.validation_switch.fill(false)
  view.ele_save_button.click()
  view.save_button.click()
  catalog_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.GENERIC, name: fauxfactory.gen_alphanumeric(15, start: "cat_item_"), description: "my catalog", display_in: true, catalog: catalog, dialog: sd)
  _cleanup = lambda do
    if is_bool(catalog_item.exists)
      catalog_item.delete()
    end
    sd.delete_if_exists()
  end
  ele_name = element_data["element_information"]["ele_name"]
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  view = navigate_to(service_catalogs, "Order")
  input_data_list = [fauxfactory.gen_alpha(length: 3), fauxfactory.gen_number(), fauxfactory.gen_special(length: 5), fauxfactory.gen_alphanumeric(length: 5)]
  msg = 
  for input_data in input_data_list
    logger.info("Entering input data: %s " % input_data)
    view.fields(ele_name).fill(input_data)
    element = view.fields(ele_name).input
    raise unless element.warning != msg
    raise unless view.submit_button.is_enabled
  end
end
