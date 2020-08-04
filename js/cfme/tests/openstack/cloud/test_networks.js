// Tests for Openstack cloud networks, subnets and routers
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.provider([OpenStackProvider], {scope: "module"})
];

const SUBNET_CIDR = "11.11.11.0/24";

function delete_entity(entity) {
  try {
    if (is_bool(entity.exists)) entity.delete()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      logger.warning("Exception during network entity deletion - skipping..")
    } else {
      throw $EXCEPTION
    }
  }
};

function create_network(appliance, provider, is_external) {
  let collection = appliance.collections.cloud_networks;

  let network = collection.create({
    name: fauxfactory.gen_alpha({start: "nwk_"}),
    tenant: provider.data.get("provisioning").get("cloud_tenant"),
    provider,
    network_type: "VXLAN",
    network_manager: `${provider.name} Network Manager`,
    is_external
  });

  return network
};

function create_subnet(appliance, provider, network) {
  let collection = appliance.collections.network_subnets;

  let subnet = collection.create({
    name: fauxfactory.gen_alpha(12, {start: "subnet_"}),
    tenant: provider.data.get("provisioning").get("cloud_tenant"),
    provider,
    network_manager: `${provider.name} Network Manager`,
    network_name: network.name,
    cidr: SUBNET_CIDR
  });

  return subnet
};

function create_router(appliance, provider, ext_gw, { ext_network = null, ext_subnet = null }) {
  let collection = appliance.collections.network_routers;

  let router = collection.create({
    name: fauxfactory.gen_alpha(12, {start: "router_"}),
    tenant: provider.data.get("provisioning").get("cloud_tenant"),
    provider,
    network_manager: `${provider.name} Network Manager`,
    has_external_gw: ext_gw,
    ext_network,
    ext_network_subnet: ext_subnet
  });

  return router
};

function network(provider, appliance) {
  // Create cloud network
  let network = create_network(
    appliance,
    provider,
    {is_external: false}
  );

  yield(network);
  delete_entity(network)
};

function ext_network(provider, appliance) {
  // Create external cloud network
  let network = create_network(
    appliance,
    provider,
    {is_external: true}
  );

  yield(network);
  delete_entity(network)
};

function subnet(provider, appliance, network) {
  // Creates subnet for the given network
  let subnet = create_subnet(appliance, provider, network);
  yield(subnet);
  delete_entity(subnet)
};

function ext_subnet(provider, appliance, ext_network) {
  // Creates subnet for the given external network
  let subnet = create_subnet(appliance, provider, ext_network);
  yield(subnet);
  delete_entity(subnet)
};

function router(provider, appliance) {
  // Creates network router
  let router = create_router(appliance, provider, {ext_gw: false});
  yield(router);
  delete_entity(router)
};

function router_with_gw(provider, appliance, ext_subnet) {
  // Creates network router with external network as a gateway
  let router = create_router(appliance, provider, {
    ext_gw: true,
    ext_network: ext_subnet.network,
    ext_subnet: ext_subnet.name
  });

  yield(router);
  delete_entity(router)
};

function test_create_network(network, provider) {
  // Creates private cloud network and verifies it's relationships
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (!network.exists) throw new ();
  if (network.parent_provider.name != provider.name) throw new ();

  if (network.cloud_tenant != provider.data.get("provisioning").get("cloud_tenant")) {
    throw new ()
  }
};

function test_edit_network(network) {
  // Edits private cloud network's name
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  network.edit({name: fauxfactory.gen_alpha(12, {start: "edited_"})});

  wait_for(
    network.provider_obj.is_refreshed,
    {func_kwargs: {}, timeout: 600, delay: 10}
  );

  wait_for(
    () => network.exists,
    {delay: 15, timeout: 600, fail_func: network.browser.refresh}
  );

  if (!network.exists) throw new ()
};

function test_delete_network(network) {
  // Deletes private cloud network
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  network.delete();

  wait_for(
    network.provider_obj.is_refreshed,
    {func_kwargs: {}, timeout: 600, delay: 10}
  );

  wait_for(
    () => !network.exists,
    {delay: 15, timeout: 600, fail_func: network.browser.refresh}
  );

  if (!!network.exists) throw new ()
};

function test_create_subnet(subnet, provider) {
  // Creates private subnet and verifies it's relationships
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (!subnet.exists) throw new ();
  if (subnet.parent_provider.name != provider.name) throw new ();

  if (subnet.cloud_tenant != provider.data.get("provisioning").get("cloud_tenant")) {
    throw new ()
  };

  if (subnet.cidr != SUBNET_CIDR) throw new ();
  if (subnet.cloud_network != subnet.network) throw new ();
  if (subnet.net_protocol != "ipv4") throw new ()
};

function test_edit_subnet(subnet) {
  // Edits private subnet's name
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  subnet.edit({new_name: fauxfactory.gen_alpha(12, {start: "edited_"})});

  wait_for(
    subnet.provider_obj.is_refreshed,
    {func_kwargs: {}, timeout: 600, delay: 10}
  );

  wait_for(
    () => subnet.exists,
    {delay: 15, timeout: 600, fail_func: subnet.browser.refresh}
  );

  if (!subnet.exists) throw new ()
};

function test_delete_subnet(subnet) {
  // Deletes private subnet
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  subnet.delete();

  wait_for(
    subnet.provider_obj.is_refreshed,
    {func_kwargs: {}, timeout: 800, delay: 30}
  );

  wait_for(
    () => !subnet.exists,
    {delay: 30, timeout: 800, fail_func: subnet.browser.refresh}
  );

  if (!!subnet.exists) throw new ()
};

function test_create_router(router, provider) {
  // Create router without gateway
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (!router.exists) throw new ();

  if (router.cloud_tenant != provider.data.get("provisioning").get("cloud_tenant")) {
    throw new ()
  }
};

function test_create_router_with_gateway(router_with_gw, provider) {
  // Creates router with gateway (external network)
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  if (!router_with_gw.exists) throw new ();

  if (router_with_gw.cloud_tenant != provider.data.get("provisioning").get("cloud_tenant")) {
    throw new ()
  };

  if (router_with_gw.cloud_network != router_with_gw.ext_network) throw new ()
};

function test_edit_router(router) {
  // Edits router's name
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  router.edit({name: fauxfactory.gen_alpha(12, {start: "edited_"})});

  wait_for(
    router.provider_obj.is_refreshed,
    {func_kwargs: {}, timeout: 600, delay: 10}
  );

  wait_for(
    () => router.exists,
    {delay: 15, timeout: 600, fail_func: router.browser.refresh}
  );

  if (!router.exists) throw new ()
};

function test_delete_router(router, appliance) {
  // Deletes router
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  router.delete();

  wait_for(
    router.provider_obj.is_refreshed,
    {func_kwargs: {}, timeout: 800, delay: 30}
  );

  navigate_to(appliance.collections.network_routers, "All");

  wait_for(
    () => !router.exists,
    {delay: 30, timeout: 800, fail_func: router.browser.refresh}
  );

  if (!!router.exists) throw new ()
};

function test_clear_router_gateway(router_with_gw) {
  // Deletes a gateway from the router
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  router_with_gw.edit({change_external_gw: false});

  wait_for(
    router_with_gw.provider_obj.is_refreshed,
    {func_kwargs: {}, timeout: 600, delay: 10}
  );

  router_with_gw.browser.refresh();
  let view = navigate_to(router_with_gw, "Details");

  wait_for(
    () => !view.entities.relationships.fields.include("Cloud Network"),
    {delay: 15, timeout: 600, fail_func: router_with_gw.browser.refresh}
  );

  if (!!view.entities.relationships.fields.include("Cloud Network")) {
    throw new ()
  }
};

function test_add_gateway_to_router(router, ext_subnet) {
  // Adds gateway to the router
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  router.edit({
    change_external_gw: true,
    ext_network: ext_subnet.network,
    ext_network_subnet: ext_subnet.name
  });

  wait_for(
    router.provider_obj.is_refreshed,
    {func_kwargs: {}, timeout: 600, delay: 10}
  );

  wait_for(
    () => router.cloud_network == ext_subnet.network,
    {delay: 15, timeout: 600, fail_func: router.browser.refresh}
  );

  if (router.cloud_network != ext_subnet.network) throw new ()
};

function test_add_interface_to_router(router, subnet) {
  // Adds interface (subnet) to router
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(router, "Details");
  let subnets_count_before_adding = view.entities.relationships.get_text_of("Cloud Subnets").to_i;
  router.add_interface(subnet.name);

  wait_for(
    router.provider_obj.is_refreshed,
    {func_kwargs: {}, timeout: 800, delay: 30}
  );

  try {
    wait_for(
      () => (
        view.entities.relationships.get_text_of("Cloud Subnets").to_i == subnets_count_before_adding + 1
      ),

      {delay: 30, timeout: 800, fail_func: router.browser.refresh}
    )
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      if (!false) {
        throw "After waiting an interface to the router is still not added"
      }
    } else {
      throw $EXCEPTION
    }
  }
};

function test_list_networks(provider, appliance) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let networks = provider.mgmt.api.networks.list().map(n => n.label);

  let displayed_networks = appliance.collections.cloud_networks.all().map(n => (
    n.name
  ));

  for (let n in networks) {
    if (!displayed_networks.include(n)) throw new ()
  }
}
