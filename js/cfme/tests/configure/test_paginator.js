require_relative("widgetastic/exceptions");
include(Widgetastic.Exceptions);
require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/configure/configuration/region_settings");
include(Cfme.Configure.Configuration.Region_settings);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let general_list_pages = [
  ["servers", null, "Details", false],
  ["servers", null, "Authentication", false],
  ["servers", null, "Workers", false],
  ["servers", null, "CustomLogos", false],
  ["servers", null, "Advanced", false],
  ["servers", null, "DiagnosticsDetails", false],
  ["servers", null, "DiagnosticsWorkers", false],
  ["servers", null, "CFMELog", false],
  ["servers", null, "AuditLog", false],
  ["servers", null, "ProductionLog", false],
  ["servers", null, "Utilization", false],
  ["servers", null, "Timelines", false],
  ["servers", null, "ServerDiagnosticsCollectLogs", false],
  ["regions", null, "Details", false],
  ["regions", null, "ImportTags", false],
  ["regions", null, "Import", false],
  ["regions", null, "HelpMenu", false],
  ["regions", null, "Advanced", false],
  ["regions", null, "DiagnosticsZones", false],
  ["regions", null, "OrphanedData", false],
  ["regions", null, "Servers", true],
  ["regions", null, "ServersByRoles", false],
  ["regions", null, "RolesByServers", false],
  ["zones", null, "Zone", false],
  ["zones", null, "SmartProxyAffinity", false],
  ["zones", null, "Advanced", false],
  ["zones", null, "ServersByRoles", false],
  ["zones", null, "Servers", true],
  ["zones", null, "CANDUGapCollection", false],
  ["zones", null, "RolesByServers", false],
  ["zones", null, "CollectLogs", false],
  ["candus", null, "Details", false],
  ["map_tags", null, "All", false],
  ["categories", null, "All", false],
  ["red_hat_updates", RedHatUpdates, "Details", false],
  ["analysis_profiles", null, "All", true],
  ["system_schedules", null, "Add", false],
  ["users", null, "All", true],
  ["groups", null, "All", true],
  ["roles", null, "All", true],
  ["tenants", null, "All", true]
];

let details_pages = [
  ["users", null, "Details", false],
  ["groups", null, "Details", false],
  ["roles", null, "Details", false],
  ["tenants", null, "Details", false],
  ["analysis_profiles", null, "Details", false],
  ["system_schedules", null, "All", true],
  ["system_schedules", null, "Details", false],
  ["tag", null, "All", false]
];

let items_selection = [
  "5 Items",
  "10 Items",
  "20 Items",
  "50 Items",
  "100 Items",
  "200 Items",
  "500 Items",
  "1000 Items"
];

function check_paginator_for_page(view) {
  try {
    let panel = view.browser.element("//ul[@class=\"pagination\"]");
    return panel.is_displayed()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NoSuchElementException) {
      return false
    } else {
      throw $EXCEPTION
    }
  }
};

function schedule(appliance) {
  let schedule = appliance.collections.system_schedules.create({
    name: fauxfactory.gen_alphanumeric(15, {start: "schedule_"}),

    description: fauxfactory.gen_alphanumeric(
      20,
      {start: "schedule_desc_"}
    )
  });

  yield(schedule);
  schedule.delete()
};

function test_paginator_config_pages(appliance, place_info) {
  let test_class;

  // Check paginator is visible for config pages.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let [place_name, place_class, place_navigation, paginator_expected_result] = place_info;

  if (is_bool(place_class)) {
    test_class = place_class
  } else {
    test_class = appliance.collections.getattr(place_name);

    if (place_name == "regions") {
      test_class = test_class.instantiate()
    } else if (place_name == "servers") {
      test_class = appliance.server
    } else if (place_name == "zones") {
      test_class = appliance.server.zone
    }
  };

  let view = navigate_to(test_class, place_navigation);
  if (check_paginator_for_page(view) != paginator_expected_result) throw new ()
};

function test_paginator_details_page(appliance, place_info, schedule) {
  let view;

  // Check paginator is visible for access control pages + schedules.
  //   If paginator is present, check that all options are present in items per page.
  // 
  //   Bugzilla:
  //       1515952
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let [place_name, place_class, place_navigation, paginator_expected_result] = place_info;

  if (place_name == "tag") {
    let category = appliance.collections.categories.instantiate({
      name: "department",
      display_name: "Department"
    });

    let test_class = category.collections.tags;
    view = navigate_to(test_class, place_navigation)
  } else {
    let test_class = (is_bool(place_class) ? place_class : appliance.collections.getattr(place_name));
    view = navigate_to(test_class, "All");
    let table = (is_bool(view.instance_variable_defined("@table")) ? view.table : view.entities.table);
    if (place_navigation == "Details") table[0].click()
  };

  if (check_paginator_for_page(view) != paginator_expected_result) throw new ();

  if (is_bool(check_paginator_for_page(view))) {
    let paginator = view.paginator;

    let items_selector = Dropdown(
      view,
      `${paginator.items_per_page} Items`
    );

    let msg = "Not all options are present in items per page";
    if (new Set(items_selection) != new Set(items_selector.to_a)) throw msg
  }
};

// 
//   Go to Settings -> Configuration -> Diagnostics -> CFME Region
//   and check whether all sub pages are showing.
// 
//   Polarion:
//       assignee: tpapaioa
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/15h
//   
// pass
function test_configure_diagnostics_pages_cfme_region() {}
