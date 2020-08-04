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
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/networks/network_port'
include Cfme::Networks::Network_port
require_relative 'cfme/networks/provider'
include Cfme::Networks::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
pytestmark = [test_requirements.sdn, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([AzureProvider, EC2Provider, OpenStackProvider, GCEProvider], scope: "module")]
def test_sdn_port_detail_name(provider, appliance)
  #  Test equality of quadicon and detail names
  # 
  #   Metadata:
  #       test_flag: sdn
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: WebUI
  #       initialEstimate: 1/4h
  #   
  port_collection = NetworkPortCollection(appliance)
  ports = port_collection.all()
  if ports.size > 5
    ports = ports[0...5]
  end
  for port in ports
    begin
      view = navigate_to(port, "Details")
      det_name = view.entities.properties.get_text_of("Name")
      raise unless port.name == det_name
    rescue ManyEntitiesFound
      # pass
    end
  end
end
def test_sdn_port_net_prov(provider, appliance)
  #  Test functionality of quadicon and detail network providers
  # 
  #   Metadata:
  #       test_flag: sdn
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: WebUI
  #       initialEstimate: 1/4h
  #   
  prov_collection = NetworkProviderCollection(appliance)
  for net_provider in prov_collection.all()
    for port in net_provider.ports.all()
      begin
        view = navigate_to(port, "Details")
        prov_name = view.entities.relationships.get_text_of("Network Manager")
        raise unless prov_name == net_provider.name
      rescue [ManyEntitiesFound, ItemNotFound]
        # pass
      rescue NameError
        # pass
      end
    end
  end
  provider.delete_if_exists(cancel: false)
  provider.wait_for_delete()
end
