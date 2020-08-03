require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/testgen'
include Cfme::Utils::Testgen
require_relative 'cfme/utils/testgen'
include Cfme::Utils::Testgen
pytest_generate_tests = generate(gen_func: auth_groups, auth_mode: "ldap")
def test_group_roles(request, temp_appliance_preconfig_long, group_name, group_data)
  # Basic default LDAP group role RBAC test
  # 
  #   Validates expected menu and submenu names are present for default
  #   LDAP group roles
  # 
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       caseimportance: medium
  #       casecomponent: Auth
  #       initialEstimate: 1/4h
  #       tags: rbac
  #   
  appliance = temp_appliance_preconfig_long
  request.addfinalizer(appliance.server.login_admin)
  if ["evmgroup-administrator", "evmgroup-approver", "evmgroup-auditor", "evmgroup-operator", "evmgroup-security", "evmgroup-support", "evmgroup-user"].include?(group_name)
    pytest.skip("This role currently fails this test")
  end
  begin
    username = credentials[group_name]["username"]
    password = credentials[group_name]["password"]
  rescue KeyError
    pytest.fail("No match in credentials file for group \"#{group_name}\"")
  end
  user = appliance.collections.users.simple_user(username, password)
  user {
    navigate_to(appliance.server, "LoggedIn")
  }
end
