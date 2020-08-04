require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/cloud/provider/gce");
include(Cfme.Cloud.Provider.Gce);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/exceptions");
include(Cfme.Exceptions);
require_relative("cfme/exceptions");
include(Cfme.Exceptions);
require_relative("cfme/networks/network_port");
include(Cfme.Networks.Network_port);
require_relative("cfme/networks/provider");
include(Cfme.Networks.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);

let pytestmark = [
  test_requirements.sdn,
  pytest.mark.usefixtures("setup_provider"),

  pytest.mark.provider(
    [AzureProvider, EC2Provider, OpenStackProvider, GCEProvider],
    {scope: "module"}
  )
];

function test_sdn_port_detail_name(provider, appliance) {
  //  Test equality of quadicon and detail names
  // 
  //   Metadata:
  //       test_flag: sdn
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: WebUI
  //       initialEstimate: 1/4h
  //   
  let port_collection = NetworkPortCollection(appliance);
  let ports = port_collection.all();
  if (ports.size > 5) ports = ports[_.range(0, 5)];

  for (let port in ports) {
    // pass
    try {
      let view = navigate_to(port, "Details");
      let det_name = view.entities.properties.get_text_of("Name");
      if (port.name != det_name) throw new ()
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof ManyEntitiesFound) {

      } else {
        throw $EXCEPTION
      }
    }
  }
};

function test_sdn_port_net_prov(provider, appliance) {
  //  Test functionality of quadicon and detail network providers
  // 
  //   Metadata:
  //       test_flag: sdn
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: WebUI
  //       initialEstimate: 1/4h
  //   
  let prov_collection = NetworkProviderCollection(appliance);

  for (let net_provider in prov_collection.all()) {
    for (let port in net_provider.ports.all()) {
      // pass
      try {
        let view = navigate_to(port, "Details");
        let prov_name = view.entities.relationships.get_text_of("Network Manager");
        if (prov_name != net_provider.name) throw new ()
      } catch ($EXCEPTION) {
        if ($EXCEPTION instanceof [ManyEntitiesFound, ItemNotFound]) {

        } else if ($EXCEPTION instanceof NameError) {

        } else {
          throw $EXCEPTION
        }
      }
    }
  };

  provider.delete_if_exists({cancel: false});
  provider.wait_for_delete()
}
