# Tests for Openstack cloud networks, subnets and routers
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenStackProvider], scope: "module")]
SUBNET_CIDR = "11.11.11.0/24"
def delete_entity(entity)
  begin
    if is_bool(entity.exists)
      entity.delete()
    end
  rescue Exception
    logger.warning("Exception during network entity deletion - skipping..")
  end
end
def create_network(appliance, provider, is_external)
  collection = appliance.collections.cloud_networks
  network = collection.create(name: fauxfactory.gen_alpha(start: "nwk_"), tenant: provider.data.get("provisioning").get("cloud_tenant"), provider: provider, network_type: "VXLAN", network_manager: "#{provider.name} Network Manager", is_external: is_external)
  return network
end
def create_subnet(appliance, provider, network)
  collection = appliance.collections.network_subnets
  subnet = collection.create(name: fauxfactory.gen_alpha(12, start: "subnet_"), tenant: provider.data.get("provisioning").get("cloud_tenant"), provider: provider, network_manager: "#{provider.name} Network Manager", network_name: network.name, cidr: SUBNET_CIDR)
  return subnet
end
def create_router(appliance, provider, ext_gw, ext_network: nil, ext_subnet: nil)
  collection = appliance.collections.network_routers
  router = collection.create(name: fauxfactory.gen_alpha(12, start: "router_"), tenant: provider.data.get("provisioning").get("cloud_tenant"), provider: provider, network_manager: "#{provider.name} Network Manager", has_external_gw: ext_gw, ext_network: ext_network, ext_network_subnet: ext_subnet)
  return router
end
def network(provider, appliance)
  # Create cloud network
  network = create_network(appliance, provider, is_external: false)
  yield(network)
  delete_entity(network)
end
def ext_network(provider, appliance)
  # Create external cloud network
  network = create_network(appliance, provider, is_external: true)
  yield(network)
  delete_entity(network)
end
def subnet(provider, appliance, network)
  # Creates subnet for the given network
  subnet = create_subnet(appliance, provider, network)
  yield(subnet)
  delete_entity(subnet)
end
def ext_subnet(provider, appliance, ext_network)
  # Creates subnet for the given external network
  subnet = create_subnet(appliance, provider, ext_network)
  yield(subnet)
  delete_entity(subnet)
end
def router(provider, appliance)
  # Creates network router
  router = create_router(appliance, provider, ext_gw: false)
  yield(router)
  delete_entity(router)
end
def router_with_gw(provider, appliance, ext_subnet)
  # Creates network router with external network as a gateway
  router = create_router(appliance, provider, ext_gw: true, ext_network: ext_subnet.network, ext_subnet: ext_subnet.name)
  yield(router)
  delete_entity(router)
end
def test_create_network(network, provider)
  # Creates private cloud network and verifies it's relationships
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  raise unless network.exists
  raise unless network.parent_provider.name == provider.name
  raise unless network.cloud_tenant == provider.data.get("provisioning").get("cloud_tenant")
end
def test_edit_network(network)
  # Edits private cloud network's name
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  network.edit(name: fauxfactory.gen_alpha(12, start: "edited_"))
  wait_for(network.provider_obj.is_refreshed, func_kwargs: {}, timeout: 600, delay: 10)
  wait_for(lambda{|| network.exists}, delay: 15, timeout: 600, fail_func: network.browser.refresh)
  raise unless network.exists
end
def test_delete_network(network)
  # Deletes private cloud network
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  network.delete()
  wait_for(network.provider_obj.is_refreshed, func_kwargs: {}, timeout: 600, delay: 10)
  wait_for(lambda{|| !network.exists}, delay: 15, timeout: 600, fail_func: network.browser.refresh)
  raise unless !network.exists
end
def test_create_subnet(subnet, provider)
  # Creates private subnet and verifies it's relationships
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  raise unless subnet.exists
  raise unless subnet.parent_provider.name == provider.name
  raise unless subnet.cloud_tenant == provider.data.get("provisioning").get("cloud_tenant")
  raise unless subnet.cidr == SUBNET_CIDR
  raise unless subnet.cloud_network == subnet.network
  raise unless subnet.net_protocol == "ipv4"
end
def test_edit_subnet(subnet)
  # Edits private subnet's name
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  subnet.edit(new_name: fauxfactory.gen_alpha(12, start: "edited_"))
  wait_for(subnet.provider_obj.is_refreshed, func_kwargs: {}, timeout: 600, delay: 10)
  wait_for(lambda{|| subnet.exists}, delay: 15, timeout: 600, fail_func: subnet.browser.refresh)
  raise unless subnet.exists
end
def test_delete_subnet(subnet)
  # Deletes private subnet
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  subnet.delete()
  wait_for(subnet.provider_obj.is_refreshed, func_kwargs: {}, timeout: 800, delay: 30)
  wait_for(lambda{|| !subnet.exists}, delay: 30, timeout: 800, fail_func: subnet.browser.refresh)
  raise unless !subnet.exists
end
def test_create_router(router, provider)
  # Create router without gateway
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  raise unless router.exists
  raise unless router.cloud_tenant == provider.data.get("provisioning").get("cloud_tenant")
end
def test_create_router_with_gateway(router_with_gw, provider)
  # Creates router with gateway (external network)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  raise unless router_with_gw.exists
  raise unless router_with_gw.cloud_tenant == provider.data.get("provisioning").get("cloud_tenant")
  raise unless router_with_gw.cloud_network == router_with_gw.ext_network
end
def test_edit_router(router)
  # Edits router's name
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  router.edit(name: fauxfactory.gen_alpha(12, start: "edited_"))
  wait_for(router.provider_obj.is_refreshed, func_kwargs: {}, timeout: 600, delay: 10)
  wait_for(lambda{|| router.exists}, delay: 15, timeout: 600, fail_func: router.browser.refresh)
  raise unless router.exists
end
def test_delete_router(router, appliance)
  # Deletes router
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  router.delete()
  wait_for(router.provider_obj.is_refreshed, func_kwargs: {}, timeout: 800, delay: 30)
  navigate_to(appliance.collections.network_routers, "All")
  wait_for(lambda{|| !router.exists}, delay: 30, timeout: 800, fail_func: router.browser.refresh)
  raise unless !router.exists
end
def test_clear_router_gateway(router_with_gw)
  # Deletes a gateway from the router
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  router_with_gw.edit(change_external_gw: false)
  wait_for(router_with_gw.provider_obj.is_refreshed, func_kwargs: {}, timeout: 600, delay: 10)
  router_with_gw.browser.refresh()
  view = navigate_to(router_with_gw, "Details")
  wait_for(lambda{|| !view.entities.relationships.fields.include?("Cloud Network")}, delay: 15, timeout: 600, fail_func: router_with_gw.browser.refresh)
  raise unless !view.entities.relationships.fields.include?("Cloud Network")
end
def test_add_gateway_to_router(router, ext_subnet)
  # Adds gateway to the router
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  router.edit(change_external_gw: true, ext_network: ext_subnet.network, ext_network_subnet: ext_subnet.name)
  wait_for(router.provider_obj.is_refreshed, func_kwargs: {}, timeout: 600, delay: 10)
  wait_for(lambda{|| router.cloud_network == ext_subnet.network}, delay: 15, timeout: 600, fail_func: router.browser.refresh)
  raise unless router.cloud_network == ext_subnet.network
end
def test_add_interface_to_router(router, subnet)
  # Adds interface (subnet) to router
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(router, "Details")
  subnets_count_before_adding = view.entities.relationships.get_text_of("Cloud Subnets").to_i
  router.add_interface(subnet.name)
  wait_for(router.provider_obj.is_refreshed, func_kwargs: {}, timeout: 800, delay: 30)
  begin
    wait_for(lambda{|| view.entities.relationships.get_text_of("Cloud Subnets").to_i == subnets_count_before_adding + 1}, delay: 30, timeout: 800, fail_func: router.browser.refresh)
  rescue TimedOutError
    raise "After waiting an interface to the router is still not added" unless false
  end
end
def test_list_networks(provider, appliance)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  networks = provider.mgmt.api.networks.list().map{|n| n.label}
  displayed_networks = appliance.collections.cloud_networks.all().map{|n| n.name}
  for n in networks
    raise unless displayed_networks.include?(n)
  end
end
