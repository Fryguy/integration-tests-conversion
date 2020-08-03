require_relative 'cfme'
include Cfme
require_relative 'cfme/services/catalogs/catalog'
include Cfme::Services::Catalogs::Catalog
require_relative 'cfme/services/catalogs/catalog'
include Cfme::Services::Catalogs::Catalog
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [test_requirements.service, pytest.mark.tier(2)]
def test_catalog_crud(request, appliance)
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       initialEstimate: 1/8h
  #       tags: service
  #   
  catalog_name = fauxfactory.gen_alphanumeric(start: "cat_")
  cat = appliance.collections.catalogs.create(name: catalog_name, description: "my catalog")
  request.addfinalizer(cat.delete_if_exists)
  view = cat.create_view(CatalogsView, wait: "10s")
  raise unless view.is_displayed
  if is_bool(BZ(1766276, forced_streams: ["5.11"]).blocks)
    saved_message = 
  else
    saved_message = 
  end
  view.flash.assert_success_message(saved_message)
  raise unless cat.exists
  update_descr = "my edited description"
  update(cat) {
    cat.description = update_descr
  }
  raise unless cat.description == update_descr
  view.flash.assert_success_message(saved_message)
  view = navigate_to(cat, "Edit")
  view.fill(value: {"description" => "test_cancel"})
  view.cancel_button.click()
  view = cat.create_view(DetailsCatalogView, wait: "10s")
  raise unless view.is_displayed
  view.flash.assert_message()
  raise unless cat.description == update_descr
  cat.delete()
  view = cat.create_view(CatalogsView, wait: "10s")
  if is_bool(BZ(1765107).blocks)
    delete_message = 
  else
    delete_message = 
  end
  view.flash.assert_success_message(delete_message)
  raise unless !cat.exists
end
def test_permissions_catalog_add(appliance, request)
  #  Tests that a catalog can be added only with the right permissions
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Services
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       tags: service
  #   
  _create_catalog = lambda do |appliance|
    cat = appliance.collections.catalogs.create(name: fauxfactory.gen_alphanumeric(start: "cat_"), description: "my catalog")
    request.addfinalizer(lambda{|| cat.delete()})
  end
  test_product_features = [["Everything", "Services", "Catalogs Explorer", "Catalogs"]]
  test_actions = {"Add Catalog" => _create_catalog}
  tac.single_task_permission_test(appliance, test_product_features, test_actions)
end
