require_relative 'fauxfactory'
include Fauxfactory
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/services/catalogs/catalog_items'
include Cfme::Services::Catalogs::Catalog_items
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance/implementations/ssui'
include Cfme::Utils::Appliance::Implementations::Ssui
alias ssui_nav navigate_to
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
alias ui_nav navigate_to
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
pytestmark = [pytest.mark.tier(2), test_requirements.custom_button]
def test_custom_group_on_catalog_item_crud(generic_catalog_item)
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/8h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       testSteps:
  #           1. Add catalog_item
  #           2. Goto catalog detail page and select `add group` from toolbar
  #           3. Fill info and save button
  #           4. Delete created button group
  #   Bugzilla:
  #       1687289
  #   
  btn_data = {"text" => gen_numeric_string(start: "btn_"), "hover" => gen_numeric_string(15, start: "btn_hvr_"), "image" => "fa-user"}
  btn_gp = generic_catalog_item.add_button_group(None: btn_data)
  view = generic_catalog_item.create_view(DetailsCatalogItemView)
  view.flash.assert_message("Button Group \"{}\" was added".format(btn_data["hover"]))
  raise unless generic_catalog_item.button_group_exists(btn_gp)
  generic_catalog_item.delete_button_group(btn_gp)
  raise unless !generic_catalog_item.button_group_exists(btn_gp)
end
def test_custom_button_on_catalog_item_crud(generic_catalog_item)
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/8h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       testSteps:
  #           1. Add catalog_item
  #           2. Goto catalog detail page and select `add group` from toolbar
  #           3. Fill info and save button
  #           4. Delete created button group
  #   Bugzilla:
  #       1687289
  #   
  btn_data = {"text" => gen_numeric_string(start: "btn_"), "hover" => gen_numeric_string(15, start: "btn_hvr_"), "image" => "fa-user"}
  btn = generic_catalog_item.add_button(None: btn_data)
  view = generic_catalog_item.create_view(DetailsCatalogItemView)
  view.flash.assert_message("Custom Button \"{}\" was added".format(btn_data["hover"]))
  raise unless generic_catalog_item.button_exists(btn)
  generic_catalog_item.delete_button(btn)
  raise unless !generic_catalog_item.button_exists(btn)
end
def test_custom_button_unassigned_behavior_catalog_level(appliance, generic_service)
  #  Test unassigned custom button behavior catalog level
  # 
  #   Note: At catalog level unassigned button (not part of any group) should displayed
  #   for both OPS UI and SSUI.
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/6h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: CustomButton
  #       testSteps:
  #           1. Create custom button directly on catalog item.
  #           2. Check service details page for both OPS UI and SSUI; button should display.
  #   Bugzilla:
  #       1653195
  #   
  service,catalog_item = generic_service
  btn_data = {"text" => gen_numeric_string(start: "btn_"), "hover" => gen_numeric_string(15, start: "btn_hvr_"), "image" => "fa-user"}
  btn = catalog_item.add_button(None: btn_data)
  raise unless catalog_item.button_exists(btn)
  for context in [ViaUI, ViaSSUI]
    navigate_to = (context === ViaSSUI) ? ssui_nav : ui_nav
    appliance.context.use(context) {
      view = navigate_to.(service, "Details")
      button = Button(view, btn)
      raise unless button.is_displayed
    }
  end
end
def test_catalog_item_copy_with_custom_buttons(request, generic_catalog_item)
  # 
  #   Bugzilla:
  #       1740556
  # 
  #   Polarion:
  #       assignee: ndhandre
  #       initialEstimate: 1/4h
  #       caseimportance: high
  #       caseposneg: positive
  #       startsin: 5.11
  #       casecomponent: CustomButton
  #       tags: custom_button
  #       testSteps:
  #           1. Add catalog_item
  #           2. Add custom button over catalog item
  #           3. Copy catalog item
  #           4. Check for button on copied catalog item
  #   
  btn_data = {"text" => gen_numeric_string(start: "button_"), "hover" => gen_numeric_string(start: "hover_"), "image" => "fa-user"}
  btn = generic_catalog_item.add_button(None: btn_data)
  new_cat_item = generic_catalog_item.copy()
  request.addfinalizer(new_cat_item.delete_if_exists)
  raise unless new_cat_item.exists
  raise unless new_cat_item.button_exists(btn)
end
