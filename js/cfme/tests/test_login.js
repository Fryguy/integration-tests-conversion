require_relative("cfme");
include(Cfme);
require_relative("cfme/base/credential");
include(Cfme.Base.Credential);
require_relative("cfme/base/ui");
include(Cfme.Base.Ui);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);

function test_login(context, method, appliance) {
  //  Tests that the appliance can be logged into and shows dashboard page.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       initialEstimate: 1/8h
  //       tags: rbac
  //   
  appliance.context.use(context, () => {
    let logged_in_page = appliance.server.login();
    if (!logged_in_page.is_displayed) throw new ();
    logged_in_page.logout();
    logged_in_page = appliance.server.login_admin({method});
    if (!logged_in_page.is_displayed) throw new ();
    logged_in_page.logout()
  })
};

function test_bad_password(context, request, appliance) {
  //  Tests logging in with a bad password.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: WebUI
  //       initialEstimate: 1/8h
  //       tags: rbac
  //   
  let username = conf.credentials.default.username;
  let password = "badpassword@\#$";
  let cred = Credential({principal: username, secret: password});

  let user = appliance.collections.users.instantiate({
    credential: cred,
    name: "Administrator"
  });

  appliance.context.use(context, () => {
    pytest.raises(
      Exception,
      {match: "Login failed: Unauthorized"},
      () => appliance.server.login(user)
    );

    let view = appliance.browser.create_view(LoginPage);
    if (view.password.read() != "" || view.username.read() != "") throw new ()
  })
};

function test_multiregion_displayed_on_login(context, setup_multi_region_cluster, multi_region_cluster) {
  // 
  //   This test case is to check that Global/Remote region is displayed on login page
  // 
  //   Polarion:
  //       assignee: izapolsk
  //       initialEstimate: 1/10h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.11
  //       casecomponent: WebUI
  //       testSteps:
  //           1. Take two or more appliances
  //           2. Configure DB manually
  //           3. Make one appliance as Global region and others are Remote
  //       expectedResults:
  //           1.
  //           2.
  //           3. Global is displayed on login page of appliance in Global region and Remote for others
  //   
  multi_region_cluster.global_appliance((gapp) => {
    let login_view = navigate_to(gapp.server, "LoginScreen");
    if (!login_view.is_displayed) throw new ();
    if (!login_view.details.region.text.include("Global")) throw new ()
  });

  multi_region_cluster.remote_appliances[0, (rapp) => {
    let login_view = navigate_to(rapp.server, "LoginScreen");
    if (!login_view.is_displayed) throw new ();
    if (!login_view.details.region.text.include("Remote")) throw new ()
  }]
};

function test_update_password(context, request, appliance) {
  //  Test updating password from the login screen.
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Infra
  //       initialEstimate: 1/6h
  //   
  let username = fauxfactory.gen_alphanumeric(
    15,
    {start: "user_temp_"}
  ).downcase();

  let new_creds = Credential({principal: username, secret: "redhat"});
  let user_group = appliance.collections.groups.instantiate({description: "EvmGroup-vm_user"});

  let user = appliance.collections.users.create({
    name: username,
    credential: new_creds,
    groups: user_group
  });

  let error_message = "Login failed: Unauthorized";
  let logged_in_page = appliance.server.login(user);
  if (!logged_in_page.is_displayed) throw new ();
  logged_in_page.logout();

  let changed_pass_page = appliance.server.update_password({
    new_password: "changeme",
    user
  });

  if (!changed_pass_page.is_displayed) throw new ();
  changed_pass_page.logout();

  pytest.raises(
    Exception,
    {match: error_message},
    () => appliance.server.login(user)
  );

  let new_cred = Credential({
    principal: username,
    secret: "made_up_invalid_pass"
  });

  let user2 = appliance.collections.users.instantiate({
    credential: new_cred,
    name: username
  });

  pytest.raises(Exception, {match: error_message}, () => (
    appliance.server.update_password({
      new_password: "changeme",
      user: user2
    })
  ));

  appliance.server.browser.refresh();
  user.delete()
}
