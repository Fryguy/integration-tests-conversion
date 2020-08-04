require_relative 'deepdiff'
include Deepdiff
require_relative 'cfme'
include Cfme
require_relative 'cfme/roles'
include Cfme::Roles
require_relative 'cfme/roles'
include Cfme::Roles
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/version'
include Cfme::Utils::Version
require_relative 'cfme/utils/version'
include Cfme::Utils::Version
def pytest_generate_tests(metafunc)
  # 
  #   Build a list of tuples containing (group_name, context)
  #   Returns:
  #       tuple containing (group_name, context)
  #       where group_name is a string and context is ViaUI/SSUI
  #   
  parameter_list = []
  id_list = []
  role_access_ui = VersionPicker({Version.lowest() => role_access_ui_510z, "5.11" => role_access_ui_511z}).pick()
  logger.info("Using the role access dict: %s", role_access_ui)
  roles_and_context = [[role_access_ui, ViaUI]]
  for (role_access, context) in roles_and_context
    for group in role_access.keys()
      parameter_list.push([group, role_access, context])
      id_list.push("#{group}-#{context}")
    end
  end
  metafunc.parametrize("group_name, role_access, context", parameter_list)
end
def test_group_roles(temp_appliance_preconfig_long, setup_aws_auth_provider, group_name, role_access, context, soft_assert)
  # Basic default AWS_IAM group role auth + RBAC test
  # 
  #   Validates expected menu and submenu names are present for default
  #   AWS IAM groups
  # 
  #   NOTE: Only tests vertical navigation tree at the moment, not accordions within the page
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       caseimportance: medium
  #       casecomponent: Auth
  #       initialEstimate: 1/4h
  #       tags: rbac
  #   
  group_access = role_access[group_name]
  begin
    iam_group_name = group_name + "_aws_iam"
    username = credentials[iam_group_name]["username"]
    password = credentials[iam_group_name]["password"]
    fullname = credentials[iam_group_name]["fullname"]
  rescue KeyError
    pytest.fail("No match in credentials file for group \"#{iam_group_name}\"")
  end
  temp_appliance_preconfig_long.context.use(context) {
    user = temp_appliance_preconfig_long.collections.users.simple_user(username, password, fullname: fullname)
    user {
      view = navigate_to(temp_appliance_preconfig_long.server, "LoggedIn")
      raise unless temp_appliance_preconfig_long.server.current_full_name() == user.name
      raise unless temp_appliance_preconfig_long.server.group_names().map{|name| name.downcase()}.include?(group_name.downcase())
      nav_visible = view.navigation.nav_item_tree()
      for area in group_access.keys()
        diff = DeepDiff(group_access[area], nav_visible.get(area, {}), verbose_level: 0, ignore_order: true)
        soft_assert.(diff == {}, "{g} RBAC mismatch (expected first) for {a}: {d}".format(g: group_name, a: area, d: diff))
      end
    }
    temp_appliance_preconfig_long.server.login_admin()
    raise unless user.exists
  }
end
