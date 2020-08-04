require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure");
include(Cfme.Infrastructure);
var vms = virtual_machines.bind(this);
require_relative("cfme/infrastructure/datastore");
include(Cfme.Infrastructure.Datastore);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.settings,
  pytest.mark.usefixtures("infra_provider")
];

function page(request) {
  return request.param
};

function value(request) {
  return request.param
};

function get_report(appliance) {
  let saved_report = appliance.collections.reports.instantiate({
    type: "Configuration Management",
    subtype: "Virtual Machines",
    menu_name: "VMs Snapshot Summary"
  }).queue({wait_for_finish: true});

  yield(saved_report);
  saved_report.delete({cancel: false})
};

function set_grid(appliance) {
  let gridlimit = appliance.user.my_settings.visual.grid_view_limit;
  yield;
  appliance.user.my_settings.visual.grid_view_limit = gridlimit
};

function set_tile(appliance) {
  let tilelimit = appliance.user.my_settings.visual.tile_view_limit;
  yield;
  appliance.user.my_settings.visual.tile_view_limit = tilelimit
};

function set_list(appliance) {
  let listlimit = appliance.user.my_settings.visual.list_view_limit;
  yield;
  appliance.user.my_settings.visual.list_view_limit = listlimit
};

function set_report(appliance) {
  let reportlimit = appliance.user.my_settings.visual.report_view_limit;
  yield;
  appliance.user.my_settings.visual.report_view_limit = reportlimit
};

function go_to_grid(page) {
  let view = navigate_to(page, "All");
  view.toolbar.view_selector.select("Grid View")
};

function set_infra_provider_quad(appliance) {
  appliance.user.my_settings.visual.infra_provider_quad = false;
  yield;
  appliance.user.my_settings.visual.infra_provider_quad = true
};

function set_host_quad(appliance) {
  appliance.user.my_settings.visual.host_quad = false;
  yield;
  appliance.user.my_settings.visual.host_quad = true
};

function set_datastore_quad(appliance) {
  appliance.user.my_settings.visual.datastore_quad = false;
  yield;
  appliance.user.my_settings.visual.datastore_quad = true
};

function set_vm_quad(appliance) {
  appliance.user.my_settings.visual.vm_quad = false;
  yield;
  appliance.user.my_settings.visual.vm_quad = true
};

function set_template_quad(appliance) {
  appliance.user.my_settings.visual.template_quad = false;
  yield;
  appliance.user.my_settings.visual.template_quad = true
};

function test_infra_grid_page_per_item(appliance, request, page, value, set_grid) {
  //  Tests grid items per page
  // 
  //   Metadata:
  //       test_flag: visuals
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/12h
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

function test_infra_tile_page_per_item(appliance, request, page, value, set_tile) {
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

function test_infra_list_page_per_item(appliance, request, page, value, set_list) {
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

function test_infra_report_page_per_item(appliance, value, set_report, get_report) {
  //  Tests report items per page
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
  appliance.user.my_settings.visual.report_view_limit = value;
  let limit = appliance.user.my_settings.visual.report_view_limit;
  let view = navigate_to(get_report.report, "Details");
  let max_item = view.saved_reports.paginator.max_item;
  let item_amt = view.saved_reports.paginator.items_amount;
  let items_per_page = view.saved_reports.paginator.items_per_page;
  if (items_per_page.to_i != limit.to_i) throw new ();

  if (item_amt.to_i >= limit.to_i) {
    if (max_item.to_i != limit.to_i) throw "Reportview Failed!"
  };

  if (max_item.to_i > item_amt.to_i) throw new ()
};

function test_infraprovider_noquads(request, set_infra_provider_quad) {
  // 
  //       This test checks that Infraprovider Quadrant when switched off from Mysetting page under
  //       Visual Tab under \"Show Infrastructure Provider Quadrants\" option works properly.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  let view = navigate_to(InfraProvider, "All");
  view.toolbar.view_selector.select("Grid View");

  if (!!view.entities.get_first_entity().data.get("quad", {}).include("topRight")) {
    throw new ()
  }
};

function test_host_noquads(appliance, request, set_host_quad) {
  // 
  //       This test checks that Host Quadrant when switched off from Mysetting page under
  //       Visual Tab under \"Show Host Quadrants\" option works properly.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  let host_collection = appliance.collections.hosts;
  let view = navigate_to(host_collection, "All");
  view.toolbar.view_selector.select("Grid View");

  if (!!view.entities.get_first_entity().data.get("quad", {}).include("topRight")) {
    throw new ()
  }
};

function test_datastore_noquads(request, set_datastore_quad, appliance) {
  // 
  //       This test checks that Host Quadrant when switched off from Mysetting page under
  //       Visual Tab under \"Show Datastores Quadrants\" option works properly.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  let dc = DatastoreCollection(appliance);
  let view = navigate_to(dc, "All");
  view.toolbar.view_selector.select("Grid View");

  if (!!view.entities.get_first_entity().data.get("quad", {}).include("topRight")) {
    throw new ()
  }
};

function test_vm_noquads(appliance, request, set_vm_quad) {
  // 
  //       This test checks that VM Quadrant when switched off from Mysetting page under
  //       Visual Tab under \"Show VM Quadrants\" option works properly.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  let view = navigate_to(appliance.collections.infra_vms, "VMsOnly");
  view.toolbar.view_selector.select("Grid View");

  if (!!view.entities.get_first_entity().data.get("quad", {}).include("topRight")) {
    throw new ()
  }
};

function test_template_noquads(appliance, set_template_quad) {
  // 
  //       This test checks that Template Quadrant when switched off from Mysetting page under
  //       Visual Tab under \"Show Template Quadrants\" option works properly.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  let view = navigate_to(
    appliance.collections.infra_templates,
    "TemplatesOnly"
  );

  view.toolbar.view_selector.select("Grid View");

  if (!!view.entities.get_first_entity().data.get("quad", {}).include("topRight")) {
    throw new ()
  }
};

function test_change_truncate_long_text_save_button_enabled(appliance) {
  // 
  //       This test checks if setting long_text enables the save button
  //       and if it is saved successfully
  // 
  //   Bugzilla:
  //       1650461
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       tags: settings
  //       setup:
  //           1. Navigate to Visual tab.
  //           2. Change the value of long_text.
  //       testSteps:
  //           1. See if save button is enabled.
  //           2. Save and check if the value was updated.
  //       expectedResults:
  //           1. Save button is enabled.
  //           2. Value is changed successfully.
  //   
  let view = navigate_to(appliance.user.my_settings, "Visual");
  let visual = view.tabs.visual;

  let available_options = visual.grid_tile_icons.long_text.all_options.map(option => (
    option.text
  ));

  available_options.remove(visual.grid_tile_icons.long_text.selected_option);
  let selected_choice = choice(available_options);
  visual.grid_tile_icons.long_text.fill(selected_choice);
  if (!!view.tabs.visual.save.disabled) throw new ();
  visual.save.click();

  if (visual.grid_tile_icons.long_text.selected_option != selected_choice) {
    throw new ()
  }
}
