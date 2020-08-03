require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _users users
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/ftp'
include Cfme::Utils::Ftp
require_relative 'cfme/utils/path'
include Cfme::Utils::Path
pytestmark = [pytest.mark.tier(3), test_requirements.report]
REPORT_CRUD_DIR = "reports_crud".data_path.join
GROUPS = ["EvmGroup-super_administrator"]
def shuffle(l)
  # Simple deterministic shuffle.
  # 
  #   Ensures, that there is a change by moving all fields of iterable by 1.
  # 
  #   We need to ensure change to unlock Save button.
  #   
  return ([l[-1]]) + (l[0...-1])
end
def report_menus(group, appliance)
  report_menus = appliance.collections.intel_report_menus.instantiate()
  yield report_menus
  report_menus.reset_to_default(group)
end
def get_custom_report(appliance)
  collection = appliance.collections.reports
  fs = FTPClientWrapper(cfme_data.ftpserver.entities.reports)
  file_path = fs.download("testing_report.yaml")
  collection.import_report(file_path)
  report = collection.instantiate(type: "My Company (All Groups)", subtype: "Custom", menu_name: "testing report", title: "testing report title")
  yield report
  report.delete_if_exists()
end
def test_shuffle_top_level(appliance, group, report_menus)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #   
  report_menus.manage_folder(group) {|folder|
    order = shuffle(folder.fields)
    for item in reversed(order)
      folder.move_first(item)
    end
  }
  view = navigate_to(appliance.collections.reports, "All")
  table = view.reports_table.map{|row| row["Name"].text}
  if table.include?(view.mycompany_title)
    table = nil
  end
  raise "The order differs!" unless table == order
end
def test_shuffle_first_level(appliance, group, report_menus)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: medium
  #       initialEstimate: 1/3h
  #   
  view = navigate_to(appliance.collections.reports, "All")
  tree = view.reports.tree.read_contents()[1]
  folders = tree.select{|i| i[1].is_a? Array && i[1].size >= 3}.map{|i| i[0]}
  selected_folder = random.choice(folders)
  report_menus.manage_folder(group, selected_folder) {|folder|
    order = shuffle(folder.fields)
    for item in reversed(order)
      folder.move_first(item)
    end
  }
  view = navigate_to(appliance.collections.reports, "All")
  view.reports.tree.click_path("All Reports", selected_folder)
  table = view.reports_table.map{|row| row["Name"].text}
  raise "The order differs!" unless table == order
end
def test_add_reports_to_available_reports_menu(appliance, request, group, report_menus, get_custom_report)
  # This test case moves custom report to existing menus
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       initialEstimate: 1/10h
  #   
  folder = random.choice(report_menus.get_folders(group))
  sub_folder = random.choice(report_menus.get_subfolders(group, folder))
  report_menus.move_reports(group, folder, sub_folder, get_custom_report.menu_name)
  report = appliance.collections.reports.instantiate(type: folder, subtype: sub_folder, menu_name: get_custom_report.menu_name)
  raise unless report.exists
end
def rbac_user(appliance, request, group)
  user,user_data = _users(request, appliance, group: group)
  return appliance.collections.users.instantiate(name: user[0].name, credential: Credential(principal: user_data[0]["userid"], secret: user_data[0]["password"]), groups: [group])
end
def test_rbac_move_custom_report(appliance, request, group, get_custom_report, report_menus, rbac_user)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: medium
  #       initialEstimate: 1/5h
  #       startsin: 5.10
  #       testSteps:
  #           1. Create a custom report, select a group and move the report to a certain menu.
  #           2. Create a user belonging to the previously selected group.
  #           3. Login with the user and check if the report is available under that menu.
  # 
  #   Bugzilla:
  #       1670293
  #   
  folder,subfolder = ["Tenants", "Tenant Quotas"]
  report_menus.move_reports(group, folder, subfolder, get_custom_report.menu_name)
  rbac_user {
    rbac_report = appliance.collections.reports.instantiate(type: folder, subtype: subfolder, menu_name: get_custom_report.menu_name)
    raise unless rbac_report.exists
  }
end
def test_reports_menu_with_duplicate_reports(appliance, request, group, report_menus)
  # 
  #   Bugzilla:
  #       1731017
  #       1676638
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       initialEstimate: 1/10h
  #       startsin: 5.11
  #       setup:
  #           1. Create a custom report or copy an existing report.
  #           2. Move the custom report to 'Tenants > Tenant Quotas' menu in user's current group
  #       testSteps:
  #           1. See if the report is available under 'Tenants > Tenant Quotas'.
  #           2. Delete the custom report.
  #           3. See if the report is available under 'Tenants > Tenant Quotas'.
  #           4. Add a new report with the same menu_name.
  #           5. See if the report is available under 'Tenants > Tenant Quotas'.
  #       expectedResults:
  #           1. Report must be visible.
  #           2.
  #           3. Report must not be visible.
  #           4.
  #           5. Report must not be visible.
  #   
  custom_report_1 = appliance.collections.reports.instantiate(type: "Tenants", subtype: "Tenant Quotas", menu_name: "Tenant Quotas").copy()
  folder,subfolder = ["Tenants", "Tenant Quotas"]
  report_menus.move_reports(group, folder, subfolder, custom_report_1.menu_name)
  expected_report = appliance.collections.reports.instantiate(type: folder, subtype: subfolder, menu_name: custom_report_1.menu_name)
  raise unless expected_report.exists
  custom_report_1.delete()
  raise unless !expected_report.exists
  custom_report_2 = appliance.collections.reports.instantiate(type: "Tenants", subtype: "Tenant Quotas", menu_name: "Tenant Quotas").copy()
  request.addfinalizer(custom_report_2.delete_if_exists)
  raise unless !expected_report.exists
end
def test_reset_report_menus(appliance, get_custom_report, group, report_menus)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #       setup:
  #           1. Create a custom report.
  #       testSteps:
  #           1. Select the custom report and move it to a different menu.
  #           2. Reset it.
  #           3. Check if the report is available under the selected menu.
  #   
  folder,subfolder = ["Tenants", "Tenant Quotas"]
  report_menus.move_reports(group, folder, subfolder, get_custom_report.menu_name)
  raise unless appliance.collections.reports.instantiate(type: folder, subtype: subfolder, menu_name: get_custom_report.menu_name).exists
  report_menus.reset_to_default(group)
  raise unless !appliance.collections.reports.instantiate(type: folder, subtype: subfolder, menu_name: get_custom_report.menu_name).exists
end
def test_custom_reports_menu(appliance, group, report_menus, request, get_custom_report)
  # 
  #   Bugzilla:
  #       1762363
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #       setup:
  #           1. Import a custom report
  #       testSteps:
  #           1. Create a folder for the custom report menu
  #           2. Create a subfolder under the folder
  #           3. Move the custom report to this custom menu.
  #           4. Instantiate the newly moved report and check if it exists.
  #           5. Delete the subfolder first.
  #           6. Delete the folder.
  #           7. Check if the report still exists.
  #   
  folder = fauxfactory.gen_alpha(start: "folder-")
  subfolder = fauxfactory.gen_alpha(start: "subfolder-", length: 13)
  report_menus.add_folder(group, folder)
  report_menus.add_subfolder(group, folder, subfolder)
  report_menus.move_reports(group, folder, subfolder, get_custom_report.menu_name)
  report = get_custom_report.parent.instantiate(type: folder, subtype: subfolder, menu_name: get_custom_report.menu_name)
  raise unless report.exists
  if is_bool(!BZ(1762363, forced_streams: ["5.10", "5.11"]).blocks)
    report_menus.remove_subfolder(group, folder, subfolder)
  end
  report_menus.remove_folder(group, folder)
  raise unless !report.exists
end
