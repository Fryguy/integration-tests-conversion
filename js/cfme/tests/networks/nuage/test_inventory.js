require_relative("cfme/networks/provider/nuage");
include(Cfme.Networks.Provider.Nuage);

let pytestmark = [pytest.mark.provider(
  [NuageProvider],
  {scope: "module"}
)];

function test_tenant_details(setup_provider_modscope, provider, with_nuage_sandbox_modscope) {
  let sandbox = with_nuage_sandbox_modscope;
  let tenant_name = sandbox.enterprise.name;

  let tenant = provider.collections.cloud_tenants.instantiate({
    name: tenant_name,
    provider
  });

  tenant.validate_stats({
    [["relationships", "Cloud Subnets"]]: "2",
    [["relationships", "Network Routers"]]: "1",
    [["relationships", "Security Groups"]]: "2",
    [["relationships", "Network Ports"]]: "4"
  })
};

function test_subnet_details(setup_provider_modscope, provider, with_nuage_sandbox_modscope) {
  // 
  //   Ensure L3 subnet details displays expected info.
  // 
  //   L3 subnets are always connected to routers, hence we navigate to them as
  //     Tenant > Router > Subnet
  //   
  let sandbox = with_nuage_sandbox_modscope;
  let tenant_name = sandbox.enterprise.name;
  let subnet_name = sandbox.subnet.name;
  let router_name = sandbox.domain.name;

  let tenant = provider.collections.cloud_tenants.instantiate({
    name: tenant_name,
    provider
  });

  let router = tenant.collections.routers.instantiate({name: router_name});
  let subnet = router.collections.subnets.instantiate({name: subnet_name});

  subnet.validate_stats({
    [["properties", "Name"]]: subnet_name,
    [["properties", "Type"]]: "ManageIQ/Providers/Nuage/Network Manager/Cloud Subnet/L3",
    [["properties", "CIDR"]]: "192.168.0.0/24",
    [["properties", "Gateway"]]: "192.168.0.1",
    [["properties", "Network protocol"]]: "ipv4",
    [["relationships", "Network Router"]]: router_name,
    [["relationships", "Network Ports"]]: "2",
    [["relationships", "Security Groups"]]: "0"
  })
};

function test_l2_subnet_details(setup_provider_modscope, provider, with_nuage_sandbox_modscope) {
  // 
  //   Ensure L2 subnet details displays expected info.
  // 
  //   L2 subnets act as standalone and are thus not connected to any router.
  //   We navigate to them as
  //     Tenant > Subnet
  //   
  let sandbox = with_nuage_sandbox_modscope;
  let tenant_name = sandbox.enterprise.name;
  let subnet_name = sandbox.l2_domain.name;

  let tenant = provider.collections.cloud_tenants.instantiate({
    name: tenant_name,
    provider
  });

  let subnet = tenant.collections.subnets.instantiate({name: subnet_name});

  subnet.validate_stats({
    [["properties", "Name"]]: subnet_name,
    [["properties", "Type"]]: "ManageIQ/Providers/Nuage/Network Manager/Cloud Subnet/L2",
    [["relationships", "Network Ports"]]: "2",
    [["relationships", "Security Groups"]]: "1"
  })
};

function test_network_router_details(setup_provider_modscope, provider, with_nuage_sandbox_modscope) {
  let sandbox = with_nuage_sandbox_modscope;
  let tenant_name = sandbox.enterprise.name;
  let router_name = sandbox.domain.name;

  let tenant = provider.collections.cloud_tenants.instantiate({
    name: tenant_name,
    provider
  });

  let router = tenant.collections.routers.instantiate({name: router_name});

  router.validate_stats({
    [["properties", "Name"]]: router_name,
    [["properties", "Type"]]: "ManageIQ/Providers/Nuage/Network Manager/Network Router",
    [["relationships", "Cloud Subnets"]]: "1",
    [["relationships", "Security Groups"]]: "1"
  })
};

function test_network_port_vm(setup_provider_modscope, provider, with_nuage_sandbox_modscope) {
  // 
  //   Ensure vm network port details displays expected info.
  // 
  //   L3 subnets are always connected to routers, hence we navigate to network ports as
  //     Tenant > Router > Subnet > Network Port
  //   
  let sandbox = with_nuage_sandbox_modscope;
  let tenant_name = sandbox.enterprise.name;
  let subnet_name = sandbox.subnet.name;
  let router_name = sandbox.domain.name;
  let vport_name = sandbox.vm_vport.name;

  let tenant = provider.collections.cloud_tenants.instantiate({
    name: tenant_name,
    provider
  });

  let router = tenant.collections.routers.instantiate({name: router_name});
  let subnet = router.collections.subnets.instantiate({name: subnet_name});
  let network_port = subnet.collections.network_ports.instantiate({name: vport_name});

  network_port.validate_stats({
    [["properties", "Name"]]: vport_name,
    [["properties", "Type"]]: "ManageIQ/Providers/Nuage/Network Manager/Network Port/Vm",
    [["relationships", "Cloud tenant"]]: tenant_name,
    [["relationships", "Cloud subnets"]]: "1"
  })
};

function test_network_port_container(setup_provider_modscope, provider, with_nuage_sandbox_modscope) {
  // 
  //   Ensure container network port details displays expected info.
  // 
  //   L3 subnets are always connected to routers, hence we navigate to network ports as
  //     Tenant > Router > Subnet > Network Port
  //   
  let sandbox = with_nuage_sandbox_modscope;
  let tenant_name = sandbox.enterprise.name;
  let subnet_name = sandbox.subnet.name;
  let router_name = sandbox.domain.name;
  let vport_name = sandbox.cont_vport.name;

  let tenant = provider.collections.cloud_tenants.instantiate({
    name: tenant_name,
    provider
  });

  let router = tenant.collections.routers.instantiate({name: router_name});
  let subnet = router.collections.subnets.instantiate({name: subnet_name});
  let network_port = subnet.collections.network_ports.instantiate({name: vport_name});

  network_port.validate_stats({
    [["properties", "Name"]]: vport_name,
    [["properties", "Type"]]: "ManageIQ/Providers/Nuage/Network Manager/Network Port/Container",
    [["relationships", "Cloud tenant"]]: tenant_name,
    [["relationships", "Cloud subnets"]]: "1"
  })
};

function test_network_port_l2_vm(setup_provider_modscope, provider, with_nuage_sandbox_modscope) {
  // 
  //   Ensure vm network port details displays expected info.
  // 
  //   L2 subnets act as standalone and are thus not connected to any router.
  //   We navigate to network ports as
  //     Tenant > Subnet > Network Port
  //   
  let sandbox = with_nuage_sandbox_modscope;
  let tenant_name = sandbox.enterprise.name;
  let subnet_name = sandbox.l2_domain.name;
  let vport_name = sandbox.l2_vm_vport.name;

  let tenant = provider.collections.cloud_tenants.instantiate({
    name: tenant_name,
    provider
  });

  let subnet = tenant.collections.subnets.instantiate({name: subnet_name});
  let network_port = subnet.collections.network_ports.instantiate({name: vport_name});

  network_port.validate_stats({
    [["properties", "Name"]]: vport_name,
    [["properties", "Type"]]: "ManageIQ/Providers/Nuage/Network Manager/Network Port/Vm",
    [["relationships", "Cloud tenant"]]: tenant_name,
    [["relationships", "Cloud subnets"]]: "1"
  })
};

function test_network_port_l2_container(setup_provider_modscope, provider, with_nuage_sandbox_modscope) {
  // 
  //   Ensure container network port details displays expected info.
  // 
  //   L2 subnets act as standalone and are thus not connected to any router.
  //   We navigate to network ports as
  //     Tenant > Subnet > Network Port
  //   
  let sandbox = with_nuage_sandbox_modscope;
  let tenant_name = sandbox.enterprise.name;
  let subnet_name = sandbox.l2_domain.name;
  let vport_name = sandbox.l2_cont_vport.name;

  let tenant = provider.collections.cloud_tenants.instantiate({
    name: tenant_name,
    provider
  });

  let subnet = tenant.collections.subnets.instantiate({name: subnet_name});
  let network_port = subnet.collections.network_ports.instantiate({name: vport_name});

  network_port.validate_stats({
    [["properties", "Name"]]: vport_name,
    [["properties", "Type"]]: "ManageIQ/Providers/Nuage/Network Manager/Network Port/Container",
    [["relationships", "Cloud tenant"]]: tenant_name,
    [["relationships", "Cloud subnets"]]: "1"
  })
}
