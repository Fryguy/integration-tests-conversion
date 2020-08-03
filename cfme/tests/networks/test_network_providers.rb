require_relative 'widgetastic/exceptions'
include Widgetastic::Exceptions
require_relative 'cfme'
include Cfme
require_relative 'cfme/common/provider_views'
include Cfme::Common::Provider_views
require_relative 'cfme/networks/provider/nuage'
include Cfme::Networks::Provider::Nuage
require_relative 'cfme/networks/provider/nuage'
include Cfme::Networks::Provider::Nuage
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [pytest.mark.provider([NetworkProvider], scope: "module"), test_requirements.sdn]
def test_add_cancelled_validation(request, appliance)
  # Tests that the flash message is correct when add is cancelled.
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       initialEstimate: 1/4h
  #       casecomponent: WebUI
  #   
  collection = appliance.collections.network_providers
  begin
    prov = collection.create(prov_class: NuageProvider, name: nil, cancel: true, validate_credentials: false)
    request.addfinalizer(prov.delete_if_exists)
  rescue MoveTargetOutOfBoundsException
    prov = collection.create(prov_class: NuageProvider, name: nil, cancel: true, validate_credentials: false)
  end
  view = prov.browser.create_view(NetworkProvidersView)
  view.flash.assert_success_message("Add of Network Manager was cancelled by the user")
end
def test_network_provider_add_with_bad_credentials(provider)
  #  Tests provider add with bad credentials
  # 
  #   Metadata:
  #       test_flag: crud
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: WebUI
  #       initialEstimate: 1/4h
  #   
  default_credentials = provider.default_endpoint.credentials
  if provider.appliance.version < "5.10"
    flash = "Login failed due to a bad username or password."
  else
    flash = "Login failed due to a bad username, password or unsupported API version."
  end
  default_credentials.principal = "bad"
  default_credentials.secret = "notyourday"
  pytest.raises(Exception, match: flash) {
    provider.create(validate_credentials: true)
  }
end
def test_network_provider_crud(provider, has_no_networks_providers)
  #  Tests provider add with good credentials
  # 
  #   Metadata:
  #       test_flag: crud
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  provider.create()
  provider.validate_stats(ui: true)
  old_name = provider.name
  update(provider) {
    provider.name = fauxfactory.gen_alphanumeric(8)
  }
  update(provider) {
    provider.name = old_name
  }
  provider.delete()
  provider.wait_for_delete()
end
