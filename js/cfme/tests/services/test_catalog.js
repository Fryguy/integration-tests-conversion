require_relative("cfme");
include(Cfme);
require_relative("cfme/services/catalogs/catalog");
include(Cfme.Services.Catalogs.Catalog);
require_relative("cfme/services/catalogs/catalog");
include(Cfme.Services.Catalogs.Catalog);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytestmark = [test_requirements.service, pytest.mark.tier(2)];

function test_catalog_crud(request, appliance) {
  let saved_message, delete_message;

  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/8h
  //       tags: service
  //   
  let catalog_name = fauxfactory.gen_alphanumeric({start: "cat_"});

  let cat = appliance.collections.catalogs.create({
    name: catalog_name,
    description: "my catalog"
  });

  request.addfinalizer(cat.delete_if_exists);
  let view = cat.create_view(CatalogsView, {wait: "10s"});
  if (!view.is_displayed) throw new ();

  if (is_bool(BZ(1766276, {forced_streams: ["5.11"]}).blocks)) {
    saved_message = "Catalog was saved"
  } else {
    saved_message = `Catalog \"${catalog_name}\" was saved`
  };

  view.flash.assert_success_message(saved_message);
  if (!cat.exists) throw new ();
  let update_descr = "my edited description";
  update(cat, () => cat.description = update_descr);
  if (cat.description != update_descr) throw new ();
  view.flash.assert_success_message(saved_message);
  view = navigate_to(cat, "Edit");
  view.fill({value: {description: "test_cancel"}});
  view.cancel_button.click();
  view = cat.create_view(DetailsCatalogView, {wait: "10s"});
  if (!view.is_displayed) throw new ();
  view.flash.assert_message(`Edit of Catalog \"${catalog_name}\" was cancelled by the user`);
  if (cat.description != update_descr) throw new ();
  cat.delete();
  view = cat.create_view(CatalogsView, {wait: "10s"});

  if (is_bool(BZ(1765107).blocks)) {
    delete_message = `Catalog \"${cat.description}\": Delete successful`
  } else {
    delete_message = `Catalog \"${catalog_name}\": Delete successful`
  };

  view.flash.assert_success_message(delete_message);
  if (!!cat.exists) throw new ()
};

function test_permissions_catalog_add(appliance, request) {
  //  Tests that a catalog can be added only with the right permissions
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       tags: service
  //   
  let _create_catalog = (appliance) => {
    let cat = appliance.collections.catalogs.create({
      name: fauxfactory.gen_alphanumeric({start: "cat_"}),
      description: "my catalog"
    });

    return request.addfinalizer(() => cat.delete())
  };

  let test_product_features = [[
    "Everything",
    "Services",
    "Catalogs Explorer",
    "Catalogs"
  ]];

  let test_actions = {"Add Catalog": _create_catalog};

  tac.single_task_permission_test(
    appliance,
    test_product_features,
    test_actions
  )
}
