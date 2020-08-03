require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.sdn, pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([AzureProvider, EC2Provider, GCEProvider], scope: "module"), pytest.mark.ignore_stream("5.11", "upstream")]
def network_prov_with_load_balancers(provider)
  prov_collection = provider.appliance.collections.network_providers
  providers = prov_collection.all()
  available_prov = []
  for prov in providers
    begin
      sum_all = prov.balancers.all().size
    rescue DestinationNotFound
      next
    end
    available_prov.push([prov, sum_all])
  end
  return is_bool(available_prov) ? available_prov : pytest.skip("No available load balancers for current providers")
end
def test_sdn_prov_balancers_number(network_prov_with_load_balancers)
  # 
  #   Test number of balancers on 1 provider
  #   Prerequisites:
  #       Only one refreshed cloud provider in cfme database
  # 
  #   Metadata:
  #       test_flag: sdn
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #       endsin: 5.10
  #   
  for (prov, sum_all) in network_prov_with_load_balancers
    view = navigate_to(prov, "Details")
    balancers_number = view.entities.relationships.get_text_of("Load Balancers")
    raise unless balancers_number.to_i == sum_all
  end
end
def test_sdn_balancers_detail(provider, network_prov_with_load_balancers)
  #  Test of getting attribute from balancer object
  # 
  #   Metadata:
  #       test_flag: sdn
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #       endsin: 5.10
  #   
  for (prov, _) in network_prov_with_load_balancers
    for balancer in prov.balancers.all()
      check = balancer.network_provider
      raise unless !check.equal?(nil)
    end
  end
end
def test_sdn_balancers_tagvis(check_item_visibility, visibility, network_prov_with_load_balancers)
  #  Tests network provider and its items honors tag visibility
  #   Prerequisites:
  #       Catalog, tag, role, group and restricted user should be created
  # 
  #   Steps:
  #       1. As admin add tag
  #       2. Login as restricted user, item is visible for user
  #       3. As admin remove tag
  #       4. Login as restricted user, item is not visible for user
  # 
  #   Metadata:
  #       test_flag: tag, sdn
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       initialEstimate: 1/4h
  #       endsin: 5.10
  #   
  network_prov = random.choice(network_prov_with_load_balancers)[0]
  balancers_for_provider = network_prov.balancers.all()
  check_item_visibility.(balancers_for_provider[0], visibility)
end
