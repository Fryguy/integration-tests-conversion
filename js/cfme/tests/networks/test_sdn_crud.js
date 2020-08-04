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
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  test_requirements.sdn,
  pytest.mark.usefixtures("setup_provider"),

  pytest.mark.provider(
    [EC2Provider, AzureProvider, OpenStackProvider, GCEProvider],
    {scope: "module"}
  )
];

function test_sdn_crud(provider, appliance) {
  //  Test for functional addition of network manager with cloud provider
  //       and functional references to components on detail page
  //   Prerequisites: Cloud provider in cfme
  // 
  //   Metadata:
  //       test_flag: sdn
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: Cloud
  //       initialEstimate: 1/2h
  //   
  let collection = appliance.collections.network_providers.filter({provider: provider});
  let network_provider = collection.all()[0];
  let view = navigate_to(network_provider, "Details");
  let parent_name = view.entities.relationships.get_text_of("Parent Cloud Provider");
  if (parent_name != provider.name) throw new ();

  let testing_list = [
    "Cloud Networks",
    "Cloud Subnets",
    "Network Routers",
    "Security Groups",
    "Floating IPs",
    "Network Ports"
  ];

  if (appliance.version < "5.11") testing_list.push("Load Balancers");

  for (let testing_name in testing_list) {
    view = navigate_to(network_provider, "Details");
    view.entities.relationships.click_at(testing_name)
  };

  provider.delete_if_exists({cancel: false});
  provider.wait_for_delete();
  if (!!network_provider.exists) throw new ()
}
