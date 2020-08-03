require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/base/ui'
include Cfme::Base::Ui
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/version'
include Cfme::Utils::Version
def test_login(context, method, appliance)
  #  Tests that the appliance can be logged into and shows dashboard page.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Configuration
  #       initialEstimate: 1/8h
  #       tags: rbac
  #   
  appliance.context.use(context) {
    logged_in_page = appliance.server.login()
    raise unless logged_in_page.is_displayed
    logged_in_page.logout()
    logged_in_page = appliance.server.login_admin(method: method)
    raise unless logged_in_page.is_displayed
    logged_in_page.logout()
  }
end
def test_bad_password(context, request, appliance)
  #  Tests logging in with a bad password.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: WebUI
  #       initialEstimate: 1/8h
  #       tags: rbac
  #   
  username = conf.credentials["default"]["username"]
  password = "badpassword@#$"
  cred = Credential(principal: username, secret: password)
  user = appliance.collections.users.instantiate(credential: cred, name: "Administrator")
  appliance.context.use(context) {
    pytest.raises(Exception, match: "Login failed: Unauthorized") {
      appliance.server.login(user)
    }
    view = appliance.browser.create_view(LoginPage)
    raise unless view.password.read() == "" && view.username.read() == ""
  }
end
def test_multiregion_displayed_on_login(context, setup_multi_region_cluster, multi_region_cluster)
  # 
  #   This test case is to check that Global/Remote region is displayed on login page
  # 
  #   Polarion:
  #       assignee: izapolsk
  #       initialEstimate: 1/10h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.11
  #       casecomponent: WebUI
  #       testSteps:
  #           1. Take two or more appliances
  #           2. Configure DB manually
  #           3. Make one appliance as Global region and others are Remote
  #       expectedResults:
  #           1.
  #           2.
  #           3. Global is displayed on login page of appliance in Global region and Remote for others
  #   
  multi_region_cluster.global_appliance {|gapp|
    login_view = navigate_to(gapp.server, "LoginScreen")
    raise unless login_view.is_displayed
    raise unless login_view.details.region.text.include?("Global")
  }
  multi_region_cluster.remote_appliances[0] {|rapp|
    login_view = navigate_to(rapp.server, "LoginScreen")
    raise unless login_view.is_displayed
    raise unless login_view.details.region.text.include?("Remote")
  }
end
def test_update_password(context, request, appliance)
  #  Test updating password from the login screen.
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       casecomponent: Infra
  #       initialEstimate: 1/6h
  #   
  username = fauxfactory.gen_alphanumeric(15, start: "user_temp_").downcase()
  new_creds = Credential(principal: username, secret: "redhat")
  user_group = appliance.collections.groups.instantiate(description: "EvmGroup-vm_user")
  user = appliance.collections.users.create(name: username, credential: new_creds, groups: user_group)
  error_message = "Login failed: Unauthorized"
  logged_in_page = appliance.server.login(user)
  raise unless logged_in_page.is_displayed
  logged_in_page.logout()
  changed_pass_page = appliance.server.update_password(new_password: "changeme", user: user)
  raise unless changed_pass_page.is_displayed
  changed_pass_page.logout()
  pytest.raises(Exception, match: error_message) {
    appliance.server.login(user)
  }
  new_cred = Credential(principal: username, secret: "made_up_invalid_pass")
  user2 = appliance.collections.users.instantiate(credential: new_cred, name: username)
  pytest.raises(Exception, match: error_message) {
    appliance.server.update_password(new_password: "changeme", user: user2)
  }
  appliance.server.browser.refresh()
  user.delete()
end
