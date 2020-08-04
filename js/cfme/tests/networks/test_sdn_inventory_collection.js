require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/cloud/provider/gce");
include(Cfme.Cloud.Provider.Gce);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  test_requirements.sdn,
  pytest.mark.tier(1),
  pytest.mark.provider([EC2Provider, AzureProvider, GCEProvider]),
  pytest.mark.usefixtures("setup_provider")
];

function test_sdn_api_inventory_networks(provider, appliance) {
  // Pulls the list of networks from the Provider API and from the appliance. Compare the 2
  //   results. If Similar, then test is successful
  // 
  //   Metadata:
  //       test_flag: sdn, inventory
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: Cloud
  //       initialEstimate: 1/10h
  //   
  let prov_networks = sorted(provider.mgmt.list_network());

  let cfme_networks = sorted(appliance.collections.cloud_networks.all().map(nt => (
    nt.name
  )));

  if (is_bool(provider.one_of(EC2Provider))) {
    if (cfme_networks.size != prov_networks.size) {
      throw "There is NOT the same amount of networks"
    };

    `in CFME than on EC2: ${prov_networks} ${cfme_networks}`
  } else {
    if (cfme_networks != prov_networks) {
      throw "Prov networks list: {networks} different from "
    };

    `cfme list: ${cfme_networks}`
  }
};

function test_sdn_api_inventory_routers(provider, appliance) {
  // Pulls the list of routers from the Provider API and from the appliance. Compare the 2
  //   results. If Similar, then test is successful
  // 
  //   Metadata:
  //       test_flag: sdn, inventory
  // 
  //   Bugzilla:
  //       1550605
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: Cloud
  //       initialEstimate: 1/10h
  //   
  let prov_routers = sorted(provider.mgmt.list_router());

  let cfme_routers = sorted(appliance.collections.network_routers.all().map(rt => (
    rt.name
  )));

  if (cfme_routers != prov_routers) {
    throw "Prov routers list: {router} different from cfme list: "
  };

  `${cfme_routers}`
};

function test_sdn_api_inventory_subnets(provider, appliance) {
  // Pulls the list of subnets from the Provider API and from the appliance. Compare the 2
  //   results. If Similar, then test is successful
  // 
  //   Metadata:
  //       test_flag: sdn, inventory
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: Cloud
  //       initialEstimate: 1/10h
  //   
  let prov_subnets = [];

  let cfme_subnets = appliance.collections.network_subnets.all().map(sb => (
    sb.name
  ));

  if (is_bool(provider.one_of(AzureProvider))) {
    for (let sbn in provider.mgmt.list_subnet().values()) {
      prov_subnets.concat(sbn)
    }
  } else {
    prov_subnets = provider.mgmt.list_subnet()
  };

  if (sorted(cfme_subnets) != sorted(prov_subnets)) {
    throw "Prov subnets list: {sub} "
  };

  `different from cfme list: ${cfme_subnets}`
};

function test_sdn_api_inventory_security_groups(provider, appliance) {
  // Pulls the list of security groups from the Provider API and from the appliance. Compare
  //   the 2 results. If Similar, then test is successful
  // 
  //   Metadata:
  //       test_flag: sdn, inventory
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: Cloud
  //       initialEstimate: 1/10h
  //   
  let prov_sec_gp = sorted(provider.mgmt.list_security_group());

  let cfme_sec_gp = sorted(appliance.collections.network_security_groups.all().map(sec => (
    sec.name
  )));

  if (prov_sec_gp != cfme_sec_gp) {
    throw "Prov security groups list: {sec} different from "
  };

  `cfme list: ${cfme_sec_gp}`
};

function test_sdn_api_inventory_loadbalancers(provider, appliance) {
  // Pulls the list of loadbalancers from the Provider API and from the appliance. Compare the 2
  //   results. If Similar, then test is successful
  // 
  //   Metadata:
  //       test_flag: sdn, inventory
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: Cloud
  //       initialEstimate: 1/10h
  //   
  let prov_load_balancers = sorted(provider.mgmt.list_load_balancer());

  let cfme_load_balancers = sorted(appliance.collections.balancers.all().map(lb => (
    lb.name
  )));

  if (prov_load_balancers != cfme_load_balancers) {
    throw "Provider balancer list: {prov} different "
  };

  `from cfme list: ${cfme_load_balancers}`
};

function secgroup_with_rule(provider) {
  let res_group = provider.data.provisioning.resource_group;

  let secgroup_name = fauxfactory.gen_alpha(
    25,
    {start: "secgroup_with_rule_"}
  ).downcase();

  provider.mgmt.create_netsec_group(secgroup_name, res_group);

  provider.mgmt.create_netsec_group_port_allow(
    secgroup_name,
    "Tcp",
    "*",
    "*",
    "Allow",
    "Inbound",

    {
      description: "Allow port 22",
      source_port_range: "*",
      destination_port_range: "22",
      priority: 100,
      name: "Port_22_allow",
      resource_group: res_group
    }
  );

  provider.refresh_provider_relationships();
  yield(secgroup_name);
  provider.mgmt.remove_netsec_group(secgroup_name, res_group)
};

function test_sdn_nsg_firewall_rules(provider, appliance, secgroup_with_rule) {
  //  Pulls the list of firewall ports from Provider API and from appliance. Compare the 2
  //   results. If same, then test is successful.
  // 
  //   Metadata:
  //       test_flag: sdn, inventory
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let prov_collection = appliance.collections.network_providers.filter({provider: provider});
  let network_provider = prov_collection.all()[0];
  network_provider.refresh_provider_relationships({wait: 600});
  let view = navigate_to(network_provider, "Details");
  let parent_name = view.entities.relationships.get_text_of("Parent Cloud Provider");
  if (parent_name != provider.name) throw new ();
  let secgrp_collection = appliance.collections.network_security_groups;

  let secgroup = secgrp_collection.all().select(i => (
    i.name == secgroup_with_rule
  )).map(i => i)[0];

  view = navigate_to(secgroup, "Details");
  if ("TCP" != view.entities.firewall_rules[0][1].text) throw new ();
  if ("Inbound" != view.entities.firewall_rules[0][2].text) throw new ();
  if ("22" != view.entities.firewall_rules[0][3].text) throw new ();
  if ("*" != view.entities.firewall_rules[0][4].text) throw new ()
}
