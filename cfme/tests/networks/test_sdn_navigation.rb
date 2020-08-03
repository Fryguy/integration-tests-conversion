require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.sdn, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([EC2Provider, AzureProvider, OpenStackProvider, GCEProvider], scope: "function")]
def test_sdn_provider_relationships_navigation(provider, tested_part, appliance)
  # 
  #   Metadata:
  #       test_flag: sdn, relationship
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: WebUI
  #       initialEstimate: 1/4h
  #   
  collection = appliance.collections.network_providers.filter({"provider" => provider})
  network_provider = collection.all()[0]
  view = navigate_to(network_provider, "Details")
  value = view.entities.relationships.get_text_of(tested_part)
  if value != "0"
    navigate_to(network_provider, tested_part.gsub(" ", ""))
  end
end
def test_provider_topology_navigation(provider, appliance)
  # 
  #   Metadata:
  #       test_flag: relationship
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: WebUI
  #       initialEstimate: 1/10h
  #   
  collection = appliance.collections.network_providers.filter({"provider" => provider})
  network_provider = collection.all()[0]
  view = navigate_to(network_provider, "TopologyFromDetails")
  raise unless view.is_displayed
end
