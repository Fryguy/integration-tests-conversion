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
pytestmark = [test_requirements.sdn, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([EC2Provider, AzureProvider, OpenStackProvider, GCEProvider], scope: "module")]
def test_sdn_crud(provider, appliance)
  #  Test for functional addition of network manager with cloud provider
  #       and functional references to components on detail page
  #   Prerequisites: Cloud provider in cfme
  # 
  #   Metadata:
  #       test_flag: sdn
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       initialEstimate: 1/2h
  #   
  collection = appliance.collections.network_providers.filter({"provider" => provider})
  network_provider = collection.all()[0]
  view = navigate_to(network_provider, "Details")
  parent_name = view.entities.relationships.get_text_of("Parent Cloud Provider")
  raise unless parent_name == provider.name
  testing_list = ["Cloud Networks", "Cloud Subnets", "Network Routers", "Security Groups", "Floating IPs", "Network Ports"]
  if appliance.version < "5.11"
    testing_list.push("Load Balancers")
  end
  for testing_name in testing_list
    view = navigate_to(network_provider, "Details")
    view.entities.relationships.click_at(testing_name)
  end
  provider.delete_if_exists(cancel: false)
  provider.wait_for_delete()
  raise unless !network_provider.exists
end
