require_relative 'selenium/common/exceptions'
include Selenium::Common::Exceptions
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/common'
include Cfme::Common
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _tenants tenants
require_relative 'cfme/services/catalogs/catalog_items'
include Cfme::Services::Catalogs::Catalog_items
require_relative 'cfme/services/catalogs/catalog_items'
include Cfme::Services::Catalogs::Catalog_items
require_relative 'cfme/services/catalogs/catalog_items'
include Cfme::Services::Catalogs::Catalog_items
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [test_requirements.service, pytest.mark.tier(3)]
def catalog_item(appliance, dialog, catalog)
  cat_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.GENERIC, name: fauxfactory.gen_alphanumeric(15, start: "cat_item_"), description: "my catalog item", display_in: true, catalog: catalog, dialog: dialog)
  view = cat_item.create_view(AllCatalogItemView)
  raise unless view.is_displayed
  view.flash.assert_success_message("Service Catalog Item \"{}\" was added".format(cat_item.name))
  yield cat_item
  begin
    cat_item.delete()
  rescue NoSuchElementException
    logger.warning("test_catalog_item: catalog_item yield fixture cleanup, catalog item \"{}\" not found".format(cat_item.name))
  end
end
def catalog_bundle(appliance, catalog_item)
  #  Create catalog bundle
  #       Args:
  #           catalog_item: as resource for bundle creation
  #   
  bundle_name = fauxfactory.gen_alphanumeric(15, start: "cat_bundle_")
  catalog_bundle = appliance.collections.catalog_bundles.create(bundle_name, description: "catalog_bundle", display_in: true, catalog: catalog_item.catalog, dialog: catalog_item.dialog, catalog_items: [catalog_item.name])
  yield catalog_bundle
  begin
    catalog_bundle.delete()
  rescue NoSuchElementException
    logger.warning("test_catalog_item: catalog_item yield fixture cleanup, catalog item \"{}\" not found".format(catalog_bundle.name))
  end
end
def check_catalog_visibility(user_restricted, tag)
  _check_catalog_visibility = lambda do |test_item_object|
    # 
    #         Args:
    #             test_item_object: object for visibility check
    #     
    test_item_object.add_tag(tag)
    user_restricted {
      raise unless test_item_object.exists
    }
    test_item_object.remove_tag(tag)
    user_restricted {
      raise unless !test_item_object.exists
    }
  end
  return _check_catalog_visibility
end
def tenant(appliance, request)
  return _tenants(request, appliance)
end
def test_catalog_item_crud(appliance, dialog, catalog)
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #       tags: service
  #   
  cat_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.GENERIC, name: fauxfactory.gen_alphanumeric(15, start: "cat_item_"), description: "my catalog item", display_in: true, catalog: catalog, dialog: dialog)
  view = cat_item.create_view(AllCatalogItemView)
  raise unless view.is_displayed
  view.flash.assert_success_message("Service Catalog Item \"{}\" was added".format(cat_item.name))
  raise unless cat_item.exists
  update(cat_item) {
    cat_item.description = "my edited description"
  }
  view.flash.assert_success_message("Service Catalog Item \"{}\" was saved".format(cat_item.name))
  view = navigate_to(cat_item, "Edit")
  view.cancel.click()
  view = cat_item.create_view(DetailsCatalogItemView)
  raise unless view.wait_displayed()
  view.flash.assert_message("Edit of Service Catalog Item \"{}\" was cancelled by the user".format(cat_item.description))
  raise unless cat_item.description == "my edited description"
  cat_item.delete()
  msg = (appliance.version > "5.11") ?  : "The selected Catalog Item was deleted"
  view.flash.assert_message(msg)
  raise unless !cat_item.exists
end
def test_add_button(catalog_item, appliance)
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  btn_data = {"text" => fauxfactory.gen_numeric_string(start: "btn_"), "hover" => fauxfactory.gen_numeric_string(15, start: "btn_hvr_"), "image" => "fa-user"}
  catalog_item.add_button(None: btn_data)
  view = appliance.browser.create_view(BaseLoggedInPage)
  message = 
  view.flash.assert_success_message(message)
end
def test_edit_tags_catalog_item(catalog_item)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Configuration
  #       caseimportance: low
  #       initialEstimate: 1/8h
  #   
  tag = catalog_item.add_tag()
  catalog_item.remove_tag(tag)
end
def test_catalog_item_duplicate_name(appliance, dialog, catalog)
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       tags: service
  #   
  cat_item_name = fauxfactory.gen_alphanumeric(15, start: "cat_item_")
  cat_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.GENERIC, name: cat_item_name, description: "my catalog item", display_in: true, catalog: catalog, dialog: dialog)
  view = cat_item.create_view(AllCatalogItemView, wait: "10s")
  view.flash.assert_success_message()
  pytest.raises(RuntimeError) {
    appliance.collections.catalog_items.create(appliance.collections.catalog_items.GENERIC, name: cat_item_name, description: "my catalog item", display_in: true, catalog: catalog, dialog: dialog)
  }
  view = cat_item.create_view(AddCatalogItemView, wait: "10s")
  view.flash.assert_message("Name has already been taken")
end
def test_permissions_catalog_item_add(appliance, catalog, dialog, request)
  # Test that a catalog can be added only with the right permissions.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #       tags: service
  #   
  _create_catalog = lambda do |appliance|
    cat_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.GENERIC, name: fauxfactory.gen_alphanumeric(15, start: "cat_item_"), description: "my catalog item", display_in: true, catalog: catalog, dialog: dialog)
    request.addfinalizer(lambda{|| cat_item.delete()})
  end
  test_product_features = [["Everything", "Services", "Catalogs Explorer", "Catalog Items"]]
  test_actions = {"Add Catalog Item" => _create_catalog}
  tac.single_task_permission_test(appliance, test_product_features, test_actions)
end
def test_tagvis_catalog_items(check_catalog_visibility, catalog_item)
  #  Checks catalog item tag visibility for restricted user
  #   Prerequisites:
  #       Catalog, tag, role, group and restricted user should be created
  # 
  #   Steps:
  #       1. As admin add tag to catalog item
  #       2. Login as restricted user, catalog item is visible for user
  #       3. As admin remove tag
  #       4. Login as restricted user, catalog item is not visible for user
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Configuration
  #       initialEstimate: 1/8h
  #   
  check_catalog_visibility.(catalog_item)
end
def test_tagvis_catalog_bundle(check_catalog_visibility, catalog_bundle)
  #  Checks catalog bundle tag visibility for restricted user
  #       Prerequisites:
  #           Catalog, tag, role, group, catalog item and restricted user should be created
  # 
  #       Steps:
  #           1. As admin add tag to catalog bundle
  #           2. Login as restricted user, catalog bundle is visible for user
  #           3. As admin remove tag
  #           4. Login as restricted user, catalog bundle is not visible for user
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Configuration
  #       initialEstimate: 1/8h
  #   
  check_catalog_visibility.(catalog_bundle)
end
def test_restricted_catalog_items_select_for_catalog_bundle(appliance, request, catalog_item, user_restricted, tag, soft_assert)
  # Test catalog item restriction while bundle creation
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  catalog_bundles = appliance.collections.catalog_bundles
  user_restricted {
    view = navigate_to(catalog_bundles, "Add")
    available_options = view.resources.select_resource.all_options
    soft_assert.(available_options.size == 1 && available_options[0].text == "<Choose>", "Catalog item list in not empty, but should be")
  }
  catalog_item.add_tag(tag)
  request.addfinalizer(lambda{|| catalog_item.remove_tag(tag)})
  user_restricted {
    view = navigate_to(catalog_bundles, "Add")
    available_options = view.resources.select_resource.all_options
    soft_assert.(available_options.map{|option| option.text == catalog_item.name}.is_any?, "Restricted catalog item is not visible while bundle creation")
  }
end
def test_catalog_all_page_after_deleting_selected_template()
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/12h
  #       caseimportance: low
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: Services
  #       tags: service
  #       testSteps:
  #           1. Add provider (VMware or scvmm)
  #           2. Create catalog item (Remember template you selected.)
  #           3. Order Service catalog item
  #           4. Go to details page of provider and click on templates
  #           5. Either delete this template while provisioning process in progress or after
  #              completing process.
  #           6. Go to service > catalogs > service catalogs or catalog items
  #           7. Click on catalog item you created or ordered
  #   Bugzilla:
  #       1652858
  #   
  # pass
end
def test_rbac_assigning_multiple_tags_from_same_category_to_catalog_item()
  #  RBAC : Assigning multiple tags from same category to catalog Item
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       testtype: functional
  #       initialEstimate: 1/8h
  #       startsin: 5.5
  #       tags: service
  #   Bugzilla:
  #       1339382
  #   
  # pass
end
def test_change_provider_template_in_catalog_item()
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       testtype: functional
  #       initialEstimate: 1/8h
  #       startsin: 5.5
  #       tags: service
  #       testSteps:
  #           1. Create a catalog item and select template for a provider in catalog tab
  #           2. Select datastore etc in environment tab
  #           3. In catalog tab change template from one provider to another
  #       expectedResults:
  #           3. Validation message should be shown
  #   
  # pass
end
def test_able_to_add_long_description_for_playbook_catalog_items()
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       testtype: functional
  #       initialEstimate: 1/4h
  #       startsin: 5.9
  #       tags: service
  #   
  # pass
end
def test_service_reconfigure_in_distributed_environment()
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       testtype: functional
  #       initialEstimate: 1/4h
  #       startsin: 5.10
  #       tags: service
  #       testSteps:
  #           1. Create master and child appliance.
  #           2. raise provisioning request in master and reconfigure in child.
  #   
  # pass
end
def test_copy_catalog_item(request, generic_catalog_item)
  # 
  #   Bugzilla:
  #       1678149
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/16h
  #       startsin: 5.11
  #       testSteps:
  #           1. Create catalog
  #           2. Create catalog item
  #           3. Make a copy of catalog item
  #       expectedResults:
  #           1.
  #           2.
  #           3. Able to copy catalog item
  #   
  new_cat_item = generic_catalog_item.copy()
  request.addfinalizer(new_cat_item.delete_if_exists)
  raise unless new_cat_item.exists
end
def test_service_select_tenants(appliance, request, tenant)
  # 
  #   Bugzilla:
  #       1678123
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/6h
  #       startsin: 5.11
  #       setup:
  #           1. Create a tenant.
  #       testSteps:
  #           1. Create catalog item with the given tenant
  #       expectedResults:
  #           1.  Catalog item is created successfully
  #               and tenant is visible under catalog items's Details page
  #   
  tenants_path = ["All Tenants", "My Company", tenant.name]
  data = {"name" => fauxfactory.gen_alphanumeric(start: "cat_item_", length: 15), "description" => fauxfactory.gen_alphanumeric(start: "cat_item_desc_", length: 20), "zone" => "Default Zone", "currency" => "$ [Australian Dollar]", "price_per_month" => 100, "additional_tenants" => [[tenants_path, true]]}
  catalog_item = appliance.collections.catalog_items.create(appliance.collections.catalog_items.GENERIC, None: data)
  request.addfinalizer(catalog_item.delete)
  view = navigate_to(catalog_item, "Details")
  additional_tenants = CheckableBootstrapTreeview(view, tree_id: "tenants_treebox")
  additional_tenants.expand_path(*tenants_path)
  raise unless view.basic_info.get_text_of("Additional Tenants").include?(tenant.name)
end
def test_service_provisioning_email(request, appliance, catalog_item)
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       caseposneg: negative
  #       initialEstimate: 1/4h
  # 
  #   Bugzilla:
  #       1668004
  #   
  result = LogValidator("/var/www/miq/vmdb/log/automation.log", failure_patterns: [".*Error during substitution.*"])
  result.start_monitoring()
  service_catalogs = ServiceCatalogs(appliance, catalog_item.catalog, catalog_item.name)
  service_catalogs.order()
  request_description = "Provisioning Service [{catalog_item_name}] from [{catalog_item_name}]".format(catalog_item_name: catalog_item.name)
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(provision_request.remove_request)
  raise unless result.validate(wait: "60s")
end
def test_assigned_unassigned_catalog_items()
  # 
  #   Bugzilla:
  #       1746344
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       caseimportance: medium
  #       initialEstimate: 1/16h
  #       startsin: 5.10
  #       testSteps:
  #           1. Create two or more Catalog items
  #           2. Go to Services->Catalogs->Catalogs
  #           3. Choose Configuration->Add a new Catalog
  #           4. Select several items in unassigned catalog items list using shift+arrows on keyboard
  #           5. Click \"Move selected items right\" button
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5. Selected items should be moved
  #   
  # pass
end
def test_reorder_buttons_in_catalog_items()
  # 
  #   Bugzilla:
  #       1744459
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       caseimportance: medium
  #       initialEstimate: 1/16h
  #       startsin: 5.10
  #       testSteps:
  #           1. Add a catalog item
  #           2. Add a few custom buttons from its summary from the toolbar (Configuration)
  #           3. Select the actions treenode
  #           4. In the toolbar select Configuration -> Reorder
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Cancel/save button should be present on the bottom
  #   
  # pass
end
def test_change_ansible_tower_job_template()
  # 
  #   Bugzilla:
  #       1740814
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       caseimportance: medium
  #       initialEstimate: 1/16h
  #       startsin: 5.11
  #       testSteps:
  #           1. Add a Ansible Tower provider
  #           2. Add an Ansible Tower Catalog Item with 'Display in Catalog' Checked
  #           3. Edit the Catalog item, change the Tower job template
  #       expectedResults:
  #           1.
  #           2.
  #           3. 'Display in Catalog' remains checked after template change
  #   
  # pass
end
def test_catalog_item_price_currency()
  # 
  #   Bugzilla:
  #       1602072
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/6h
  #       startsin: 5.11
  #       testSteps:
  #           1. Add a generic item with price and currency
  #           2. Add an ansible playbook item with price and currency
  #           3. Add generic item with currency but no price
  #           4. Add generic item with currency but non-float price
  #           5. Add ansible playbook item with currency but no price
  #           6. Add Ansible Playbook item with currency but non-float price
  #           7. Unset currency in generic
  #       expectedResults:
  #           1. Able to add price and currency
  #           2. Able to add price and currency
  #           3. Validation should be fail for generic item with currency but no price
  #           4. Validation should be fail for generic item with currency but non-float price
  #           5. Validation Should be fail for ansible playbook item with currency but no price
  #           6. Validation should be fail for ansible playbook item with currency but non-float price
  #           7. Able to unset currency in generic catalog item
  #   
  # pass
end
def test_copy_catalog_item_with_tags(request, generic_catalog_item, tag)
  # 
  #   Bugzilla:
  #       1740399
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/4h
  #       startsin: 5.11
  #       testSteps:
  #           1. Create catalog
  #           2. Create catalog item
  #           3. Assign some tags from Policy > Edit Tags
  #           4. Make a copy of catalog item
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Tags to be copied with catalog item
  #   
  generic_catalog_item.add_tag(tag)
  new_cat_item = generic_catalog_item.copy()
  request.addfinalizer(new_cat_item.delete_if_exists)
  raise "Assigned tag was not found on the details page" unless new_cat_item.get_tags().map{|tag_available| tag_available.category.display_name == tag.category.display_name && tag_available.display_name == tag.display_name}.is_all?
end
def test_add_bundle_in_bundle(appliance, catalog_bundle)
  # 
  #   Bugzilla:
  #       1671522
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/16h
  #       startsin: 5.11
  #       testSteps:
  #           1. Create catalog bundle1
  #           2. Navigate catalog bundle Add page-> Resources tab
  #           3. Check bundle1 is available or not
  #       expectedResults:
  #           1.
  #           2.
  #           3. There should be no bundle in resources list
  #   
  view = navigate_to(appliance.collections.catalog_bundles, "Add")
  options = view.resources.select_resource.all_options
  raise unless !options.map{|o| o.text}.include?(catalog_bundle.name)
  view.cancel_button.click()
end
