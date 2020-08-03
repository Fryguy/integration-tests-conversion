require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
pytestmark = [test_requirements.auth]
def db_user(appliance)
  name = fauxfactory.gen_alpha(15, start: "test-user-")
  creds = Credential(principal: name, secret: fauxfactory.gen_alpha())
  user_group = appliance.collections.groups.instantiate(description: "EvmGroup-vm_user")
  user = appliance.collections.users.create(name: name, credential: creds, groups: user_group)
  yield(user)
  user.delete_if_exists()
end
def test_validate_lookup_button_provisioning(appliance, provider, small_template, setup_ldap_auth_provider)
  # 
  #   configure ldap and validate for lookup button in provisioning form
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Auth
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  auth_provider = setup_ldap_auth_provider
  user = auth_provider.user_data[0]
  username = user.username.gsub(" ", "-")
  domain = auth_provider.as_fill_value().get("user_suffix")
  view = navigate_to(appliance.collections.infra_vms, "Provision")
  view.form.fill({"template_name" => small_template.name, "provider_name" => provider.name})
  view.form.request.fill({"email" => "#{username}@#{domain}"})
  raise unless !view.form.request.lookup.disabled
  view.form.request.lookup.click()
  view.form.purpose.click()
  view.form.request.click()
  raise unless view.form.request.first_name.read() == user.fullname.split_p(" ")[0].downcase()
  raise unless view.form.request.last_name.read() == user.fullname.split_p(" ")[1].downcase()
end
def test_verify_database_user_login_fails_with_external_auth_configured(appliance, setup_ldap_auth_provider, db_user)
  # 
  #   Login with user registered to cfme internal database.
  #   Authentication expected to fail
  # 
  #   Bugzilla:
  #       1632718
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       caseposneg: negative
  #       initialEstimate: 1/4h
  #   
  db_user {
    pytest.raises(RuntimeError) {
      navigate_to(appliance.server, "LoggedIn")
    }
  }
end
