require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.settings,
  pytest.mark.usefixtures("openstack_provider")
];

function value(request) {
  return request.param
};

function page(request) {
  return request.param
};

function set_grid(appliance) {
  let old_grid_limit = appliance.user.my_settings.visual.grid_view_limit;
  appliance.user.my_settings.visual.grid_view_limit = 5;
  yield;
  appliance.user.my_settings.visual.grid_view_limit = old_grid_limit
};

function set_tile(appliance) {
  let tilelimit = appliance.user.my_settings.visual.tile_view_limit;
  appliance.user.my_settings.visual.tile_view_limit = 5;
  yield;
  appliance.user.my_settings.visual.tile_view_limit = tilelimit
};

function set_list(appliance) {
  let listlimit = appliance.user.my_settings.visual.list_view_limit;
  appliance.user.my_settings.visual.list_view_limit = 5;
  yield;
  appliance.user.my_settings.visual.list_view_limit = listlimit
};

function go_to_grid(page) {
  let view = navigate_to(page, "All");
  view.toolbar.view_selector.select("Grid View")
};

function set_cloud_provider_quad(appliance) {
  appliance.user.my_settings.visual.cloud_provider_quad = false;
  yield;
  appliance.user.my_settings.visual.cloud_provider_quad = true
};

function test_cloud_grid_page_per_item(appliance, request, page, value, set_grid) {
  //  Tests grid items per page
  // 
  //   Metadata:
  //       test_flag: visuals
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  if (is_bool(page.is_a(String))) page = appliance.collections.getattr(page);

  if (appliance.user.my_settings.visual.grid_view_limit != value) {
    appliance.user.my_settings.visual.grid_view_limit = value.to_i
  };

  request.addfinalizer(() => go_to_grid(page));
  let limit = appliance.user.my_settings.visual.grid_view_limit;
  let view = navigate_to(page, "All", {use_resetter: false});
  view.toolbar.view_selector.select("Grid View");

  if (is_bool(!view.entities.paginator.is_displayed)) {
    pytest.skip("This page doesn't have entities and/or paginator")
  };

  let max_item = view.entities.paginator.max_item;
  let item_amt = view.entities.paginator.items_amount;
  let items_per_page = view.entities.paginator.items_per_page;
  if (items_per_page.to_i != limit.to_i) throw new ();

  if (item_amt.to_i >= limit.to_i) {
    if (max_item.to_i != limit.to_i) throw `Gridview Failed for page ${page}!`
  };

  if (max_item.to_i > item_amt.to_i) throw new ()
};

function test_cloud_tile_page_per_item(appliance, request, page, value, set_tile) {
  //  Tests tile items per page
  // 
  //   Metadata:
  //       test_flag: visuals
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  if (is_bool(page.is_a(String))) page = appliance.collections.getattr(page);

  if (appliance.user.my_settings.visual.tile_view_limit != value) {
    appliance.user.my_settings.visual.tile_view_limit = value.to_i
  };

  request.addfinalizer(() => go_to_grid(page));
  let limit = appliance.user.my_settings.visual.tile_view_limit;
  let view = navigate_to(page, "All", {use_resetter: false});
  view.toolbar.view_selector.select("Tile View");

  if (is_bool(!view.entities.paginator.is_displayed)) {
    pytest.skip("This page doesn't have entities and/or paginator")
  };

  let max_item = view.entities.paginator.max_item;
  let item_amt = view.entities.paginator.items_amount;
  let items_per_page = view.entities.paginator.items_per_page;
  if (items_per_page.to_i != limit.to_i) throw new ();

  if (item_amt.to_i >= limit.to_i) {
    if (max_item.to_i != limit.to_i) throw `Tileview Failed for page ${page}!`
  };

  if (max_item.to_i > item_amt.to_i) throw new ()
};

function test_cloud_list_page_per_item(appliance, request, page, value, set_list) {
  //  Tests list items per page
  // 
  //   Metadata:
  //       test_flag: visuals
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  if (is_bool(page.is_a(String))) page = appliance.collections.getattr(page);

  if (appliance.user.my_settings.visual.list_view_limit != value) {
    appliance.user.my_settings.visual.list_view_limit = value.to_i
  };

  request.addfinalizer(() => go_to_grid(page));
  let limit = appliance.user.my_settings.visual.list_view_limit;
  let view = navigate_to(page, "All", {use_resetter: false});
  view.toolbar.view_selector.select("List View");

  if (is_bool(!view.entities.paginator.is_displayed)) {
    pytest.skip("This page doesn't have entities and/or paginator")
  };

  let max_item = view.entities.paginator.max_item;
  let item_amt = view.entities.paginator.items_amount;
  let items_per_page = view.entities.paginator.items_per_page;
  if (items_per_page.to_i != limit.to_i) throw new ();

  if (item_amt.to_i >= limit.to_i) {
    if (max_item.to_i != limit.to_i) throw `Listview Failed for page ${page}!`
  };

  if (max_item.to_i > item_amt.to_i) throw new ()
};

function test_cloudprovider_noquads(request, set_cloud_provider_quad) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  let view = navigate_to(CloudProvider, "All");
  view.toolbar.view_selector.select("Grid View");

  if (!!view.entities.get_first_entity().data.get("quad", {}).include("topRight")) {
    throw new ()
  }
}
