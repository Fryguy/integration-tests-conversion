require_relative("cfme");
include(Cfme);
require_relative("cfme/base/credential");
include(Cfme.Base.Credential);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _users = users.bind(this);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/ftp");
include(Cfme.Utils.Ftp);
require_relative("cfme/utils/path");
include(Cfme.Utils.Path);
let pytestmark = [pytest.mark.tier(3), test_requirements.report];
const REPORT_CRUD_DIR = "reports_crud".data_path.join;
const GROUPS = ["EvmGroup-super_administrator"];

function shuffle(l) {
  // Simple deterministic shuffle.
  // 
  //   Ensures, that there is a change by moving all fields of iterable by 1.
  // 
  //   We need to ensure change to unlock Save button.
  //   
  return ([l[-1]]) + (l[_.range(0, -1)])
};

function report_menus(group, appliance) {
  let report_menus = appliance.collections.intel_report_menus.instantiate();
  yield(report_menus);
  report_menus.reset_to_default(group)
};

function get_custom_report(appliance) {
  let collection = appliance.collections.reports;
  let fs = FTPClientWrapper(cfme_data.ftpserver.entities.reports);
  let file_path = fs.download("testing_report.yaml");
  collection.import_report(file_path);

  let report = collection.instantiate({
    type: "My Company (All Groups)",
    subtype: "Custom",
    menu_name: "testing report",
    title: "testing report title"
  });

  yield(report);
  report.delete_if_exists()
};

function test_shuffle_top_level(appliance, group, report_menus) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //   
  report_menus.manage_folder(group, (folder) => {
    let order = shuffle(folder.fields);

    for (let item in reversed(order)) {
      folder.move_first(item)
    }
  });

  let view = navigate_to(appliance.collections.reports, "All");
  let table = view.reports_table.map(row => row.Name.text);
  if (table.include(view.mycompany_title)) table = null;
  if (table != order) throw "The order differs!"
};

function test_shuffle_first_level(appliance, group, report_menus) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: medium
  //       initialEstimate: 1/3h
  //   
  let view = navigate_to(appliance.collections.reports, "All");
  let tree = view.reports.tree.read_contents()[1];

  let folders = tree.select(i => i[1].is_a(Array && i[1].size >= 3)).map(i => (
    i[0]
  ));

  let selected_folder = random.choice(folders);

  report_menus.manage_folder(group, selected_folder, (folder) => {
    let order = shuffle(folder.fields);

    for (let item in reversed(order)) {
      folder.move_first(item)
    }
  });

  view = navigate_to(appliance.collections.reports, "All");
  view.reports.tree.click_path("All Reports", selected_folder);
  let table = view.reports_table.map(row => row.Name.text);
  if (table != order) throw "The order differs!"
};

function test_add_reports_to_available_reports_menu(appliance, request, group, report_menus, get_custom_report) {
  // This test case moves custom report to existing menus
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       initialEstimate: 1/10h
  //   
  let folder = random.choice(report_menus.get_folders(group));

  let sub_folder = random.choice(report_menus.get_subfolders(
    group,
    folder
  ));

  report_menus.move_reports(
    group,
    folder,
    sub_folder,
    get_custom_report.menu_name
  );

  let report = appliance.collections.reports.instantiate({
    type: folder,
    subtype: sub_folder,
    menu_name: get_custom_report.menu_name
  });

  if (!report.exists) throw new ()
};

function rbac_user(appliance, request, group) {
  let [user, user_data] = _users(request, appliance, {group});

  return appliance.collections.users.instantiate({
    name: user[0].name,

    credential: Credential({
      principal: user_data[0].userid,
      secret: user_data[0].password
    }),

    groups: [group]
  })
};

function test_rbac_move_custom_report(appliance, request, group, get_custom_report, report_menus, rbac_user) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: medium
  //       initialEstimate: 1/5h
  //       startsin: 5.10
  //       testSteps:
  //           1. Create a custom report, select a group and move the report to a certain menu.
  //           2. Create a user belonging to the previously selected group.
  //           3. Login with the user and check if the report is available under that menu.
  // 
  //   Bugzilla:
  //       1670293
  //   
  let [folder, subfolder] = ["Tenants", "Tenant Quotas"];

  report_menus.move_reports(
    group,
    folder,
    subfolder,
    get_custom_report.menu_name
  );

  rbac_user(() => {
    let rbac_report = appliance.collections.reports.instantiate({
      type: folder,
      subtype: subfolder,
      menu_name: get_custom_report.menu_name
    });

    if (!rbac_report.exists) throw new ()
  })
};

function test_reports_menu_with_duplicate_reports(appliance, request, group, report_menus) {
  // 
  //   Bugzilla:
  //       1731017
  //       1676638
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       initialEstimate: 1/10h
  //       startsin: 5.11
  //       setup:
  //           1. Create a custom report or copy an existing report.
  //           2. Move the custom report to 'Tenants > Tenant Quotas' menu in user's current group
  //       testSteps:
  //           1. See if the report is available under 'Tenants > Tenant Quotas'.
  //           2. Delete the custom report.
  //           3. See if the report is available under 'Tenants > Tenant Quotas'.
  //           4. Add a new report with the same menu_name.
  //           5. See if the report is available under 'Tenants > Tenant Quotas'.
  //       expectedResults:
  //           1. Report must be visible.
  //           2.
  //           3. Report must not be visible.
  //           4.
  //           5. Report must not be visible.
  //   
  let custom_report_1 = appliance.collections.reports.instantiate({
    type: "Tenants",
    subtype: "Tenant Quotas",
    menu_name: "Tenant Quotas"
  }).copy();

  let [folder, subfolder] = ["Tenants", "Tenant Quotas"];

  report_menus.move_reports(
    group,
    folder,
    subfolder,
    custom_report_1.menu_name
  );

  let expected_report = appliance.collections.reports.instantiate({
    type: folder,
    subtype: subfolder,
    menu_name: custom_report_1.menu_name
  });

  if (!expected_report.exists) throw new ();
  custom_report_1.delete();
  if (!!expected_report.exists) throw new ();

  let custom_report_2 = appliance.collections.reports.instantiate({
    type: "Tenants",
    subtype: "Tenant Quotas",
    menu_name: "Tenant Quotas"
  }).copy();

  request.addfinalizer(custom_report_2.delete_if_exists);
  if (!!expected_report.exists) throw new ()
};

function test_reset_report_menus(appliance, get_custom_report, group, report_menus) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: low
  //       initialEstimate: 1/12h
  //       setup:
  //           1. Create a custom report.
  //       testSteps:
  //           1. Select the custom report and move it to a different menu.
  //           2. Reset it.
  //           3. Check if the report is available under the selected menu.
  //   
  let [folder, subfolder] = ["Tenants", "Tenant Quotas"];

  report_menus.move_reports(
    group,
    folder,
    subfolder,
    get_custom_report.menu_name
  );

  if (!appliance.collections.reports.instantiate({
    type: folder,
    subtype: subfolder,
    menu_name: get_custom_report.menu_name
  }).exists) throw new ();

  report_menus.reset_to_default(group);

  if (!!appliance.collections.reports.instantiate({
    type: folder,
    subtype: subfolder,
    menu_name: get_custom_report.menu_name
  }).exists) throw new ()
};

function test_custom_reports_menu(appliance, group, report_menus, request, get_custom_report) {
  // 
  //   Bugzilla:
  //       1762363
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //       setup:
  //           1. Import a custom report
  //       testSteps:
  //           1. Create a folder for the custom report menu
  //           2. Create a subfolder under the folder
  //           3. Move the custom report to this custom menu.
  //           4. Instantiate the newly moved report and check if it exists.
  //           5. Delete the subfolder first.
  //           6. Delete the folder.
  //           7. Check if the report still exists.
  //   
  let folder = fauxfactory.gen_alpha({start: "folder-"});

  let subfolder = fauxfactory.gen_alpha({
    start: "subfolder-",
    length: 13
  });

  report_menus.add_folder(group, folder);
  report_menus.add_subfolder(group, folder, subfolder);

  report_menus.move_reports(
    group,
    folder,
    subfolder,
    get_custom_report.menu_name
  );

  let report = get_custom_report.parent.instantiate({
    type: folder,
    subtype: subfolder,
    menu_name: get_custom_report.menu_name
  });

  if (!report.exists) throw new ();

  if (is_bool(!BZ(1762363, {forced_streams: ["5.10", "5.11"]}).blocks)) {
    report_menus.remove_subfolder(group, folder, subfolder)
  };

  report_menus.remove_folder(group, folder);
  if (!!report.exists) throw new ()
}
