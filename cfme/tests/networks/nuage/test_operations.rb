require_relative 'cfme/networks/provider/nuage'
include Cfme::Networks::Provider::Nuage
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.provider([NuageProvider])]
def test_router_add_subnet(provider, with_nuage_sandbox)
  # 
  #   Ensure that subnet is added on network router
  # 
  #   We navigate to router through Provider > Tenant > Network Router
  #   
  sandbox = with_nuage_sandbox
  tenant_name = sandbox["enterprise"].name
  router_name = sandbox["domain"].name
  tenant = provider.collections.cloud_tenants.instantiate(name: tenant_name, provider: provider)
  router = tenant.collections.routers.instantiate(name: router_name)
  subnet_name = fauxfactory.gen_alphanumeric(length: 7)
  router.add_subnet(subnet_name, "192.168.0.0", "255.255.0.0", "192.168.0.1")
  subnet = get_subnet_from_db_with_timeout(provider.appliance, subnet_name, router_name)
  raise unless !subnet.equal?(nil)
end
def get_subnet_from_db_with_timeout(appliance, subnet_name, router_name)
  get_object = lambda do
    logger.info("Looking for Cloud Subnet with name %s in the VMDB...", subnet_name)
    subnets = appliance.db.client["cloud_subnets"]
    network_routers = appliance.db.client["network_routers"]
    return appliance.db.client.session.query(subnets.name).filter(subnets.name == subnet_name, network_routers.name == router_name).first()
  end
  obj,_ = wait_for(method(:get_object), num_sec: 60, delay: 5, fail_condition: nil)
  return obj
end
