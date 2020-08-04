require_relative("cfme");
include(Cfme);
require_relative("cfme/base/credential");
include(Cfme.Base.Credential);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
let pytestmark = [test_requirements.auth];

function db_user(appliance) {
  let name = fauxfactory.gen_alpha(15, {start: "test-user-"});

  let creds = Credential({
    principal: name,
    secret: fauxfactory.gen_alpha()
  });

  let user_group = appliance.collections.groups.instantiate({description: "EvmGroup-vm_user"});

  let user = appliance.collections.users.create({
    name,
    credential: creds,
    groups: user_group
  });

  yield(user);
  user.delete_if_exists()
};

function test_validate_lookup_button_provisioning(appliance, provider, small_template, setup_ldap_auth_provider) {
  // 
  //   configure ldap and validate for lookup button in provisioning form
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Auth
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let auth_provider = setup_ldap_auth_provider;
  let user = auth_provider.user_data[0];
  let username = user.username.gsub(" ", "-");
  let domain = auth_provider.as_fill_value().get("user_suffix");
  let view = navigate_to(appliance.collections.infra_vms, "Provision");

  view.form.fill({
    template_name: small_template.name,
    provider_name: provider.name
  });

  view.form.request.fill({email: `${username}@${domain}`});
  if (!!view.form.request.lookup.disabled) throw new ();
  view.form.request.lookup.click();
  view.form.purpose.click();
  view.form.request.click();

  if (view.form.request.first_name.read() != user.fullname.split_p(" ")[0].downcase()) {
    throw new ()
  };

  if (view.form.request.last_name.read() != user.fullname.split_p(" ")[1].downcase()) {
    throw new ()
  }
};

function test_verify_database_user_login_fails_with_external_auth_configured(appliance, setup_ldap_auth_provider, db_user) {
  // 
  //   Login with user registered to cfme internal database.
  //   Authentication expected to fail
  // 
  //   Bugzilla:
  //       1632718
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Configuration
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/4h
  //   
  db_user(() => (
    pytest.raises(
      RuntimeError,
      () => navigate_to(appliance.server, "LoggedIn")
    )
  ))
}
