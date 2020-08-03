require_relative 'cfme'
include Cfme
require_relative 'cfme/common/provider_views'
include Cfme::Common::Provider_views
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [pytest.mark.tier(1), test_requirements.containers, pytest.mark.provider([ContainersProvider], scope: "function", selector: ONE_PER_VERSION)]
def test_container_provider_crud(request, appliance, has_no_providers, provider)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: critical
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  # 
  #   Bugzilla:
  #       1763857
  #   
  provider.create()
  request.addfinalizer(lambda{|| provider.delete_if_exists(cancel: false)})
  view = appliance.browser.create_view(ContainerProvidersView)
  view.flash.assert_success_message("{} Providers \"{}\" was saved".format(provider.string_name, provider.name))
  raise unless provider.exists
  update(provider) {
    provider.name = fauxfactory.gen_alpha(8).downcase()
  }
  raise unless view.is_displayed
  view.flash.assert_success_message("Containers Provider \"#{provider.name}\" was saved")
  raise unless provider.name == view.entities.get_first_entity().data.get("name", {}).to_s
  provider.delete()
  raise unless view.is_displayed
  view.flash.assert_success_message("Delete initiated for 1 {} Provider from the {} Database".format(provider.string_name, appliance.product_name))
  provider.wait_for_delete()
  raise unless !provider.exists
end
