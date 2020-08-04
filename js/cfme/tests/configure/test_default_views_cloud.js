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

let gtl_params = {
  "Cloud Providers": CloudProvider,
  "Availability Zones": "cloud_av_zones",
  Flavors: "cloud_flavors",
  Instances: "cloud_instances",
  Images: "cloud_images"
};

function test_default_view_cloud_reset(appliance) {
  // This test case performs Reset button test.
  // 
  //   Steps:
  //       * Navigate to DefaultViews page
  //       * Check Reset Button is disabled
  //       * Select 'availability_zones' button from cloud region and change it's default mode
  //       * Check Reset Button is enabled
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: high
  //       initialEstimate: 1/20h
  //       tags: settings
  //   
  let view = navigate_to(appliance.user.my_settings, "DefaultViews");
  if (!view.tabs.default_views.reset.disabled) throw new ();
  let cloud_btn = view.tabs.default_views.clouds.availability_zones;
  let views = ["Tile View", "Grid View", "List View"];
  views.remove(cloud_btn.active_button);
  cloud_btn.select_button(random.choice(views));
  if (!!view.tabs.default_views.reset.disabled) throw new ()
};

function test_cloud_default_view(appliance, group_name, expected_view) {
  // This test case changes the default view of a cloud related page and asserts the change.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: high
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  let page = gtl_params[group_name];
  let default_views = appliance.user.my_settings.default_views;

  let old_default = default_views.get_default_view(
    group_name,
    {fieldset: "Clouds"}
  );

  default_views.set_default_view(
    group_name,
    expected_view,
    {fieldset: "Clouds"}
  );

  let nav_cls = (is_bool(page.is_a(String)) ? appliance.collections.getattr(page) : page);

  let selected_view = navigate_to(
    nav_cls,
    "All",
    {use_resetter: false}
  ).toolbar.view_selector.selected;

  if (expected_view != selected_view) {
    throw `${expected_view} view setting failed`
  };

  default_views.set_default_view(
    group_name,
    old_default,
    {fieldset: "Clouds"}
  )
};

function test_cloud_compare_view(appliance, expected_view) {
  let group_name, selector_type;

  // This test changes the default view/mode for comparison between cloud provider instances
  //   and asserts the change.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: high
  //       initialEstimate: 1/10h
  //       tags: settings
  //   
  if (["Expanded View", "Compressed View"].include(expected_view)) {
    let [group_name, selector_type] = ["Compare", "views_selector"]
  } else {
    [group_name, selector_type] = ["Compare Mode", "modes_selector"]
  };

  let default_views = appliance.user.my_settings.default_views;
  let old_default = default_views.get_default_view(group_name);
  default_views.set_default_view(group_name, expected_view);

  let inst_view = navigate_to(
    appliance.collections.cloud_instances,
    "All"
  );

  let e_slice = slice(0, 2, null);
  inst_view.entities.get_all({slice: e_slice}).map(e => e.ensure_checked());
  inst_view.toolbar.configuration.item_select("Compare Selected items");
  let selected_view = inst_view.actions.getattr(selector_type).selected;
  if (expected_view != selected_view) throw `${expected_view} setting failed`;
  default_views.set_default_view(group_name, old_default)
}
