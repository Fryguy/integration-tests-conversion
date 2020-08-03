# Common tests for infrastructure provider
require_relative 'cfme/infrastructure/provider/openstack_infra'
include Cfme::Infrastructure::Provider::Openstack_infra
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenstackInfraProvider], scope: "module")]
def test_api_port(provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view_details = navigate_to(provider, "Details")
  port = provider.data["endpoints"]["default"]["api_port"]
  api_port = view_details.entities.summary("Properties").get_text_of("API Port").to_i
  raise "Invalid API Port" unless api_port == port
end
def test_credentials_quads(provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(provider, "All")
  prov_item = view.entities.get_entity(name: provider.name, surf_pages: true)
  valid_message = "Authentication credentials are valid"
  if provider.appliance.version >= "5.10"
    raise unless prov_item.data["quad"]["bottomRight"]["tooltip"].include?(valid_message)
  else
    raise unless prov_item.data.get("creds") && prov_item.data["creds"].include?("checkmark")
  end
end
def test_delete_provider(provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  provider.delete()
  provider.wait_for_delete()
  view = navigate_to(provider, "All")
  raise unless !view.entities.get_all(surf_pages: true).map{|item| item.name}.include?(provider.name)
end
