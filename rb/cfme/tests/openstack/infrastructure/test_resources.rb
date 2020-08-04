require_relative 'cfme/infrastructure/provider/openstack_infra'
include Cfme::Infrastructure::Provider::Openstack_infra
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.meta(server_roles: "+smartproxy +smartstate"), pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenstackInfraProvider], scope: "module")]
def test_number_of_cpu(provider, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view_details = navigate_to(provider, "Details")
  v = view_details.entities.summary("Properties").get_text_of("Aggregate Node CPU Resources")
  soft_assert.(v.split()[0].to_f > 0, "Aggregate Node CPU Resources is 0")
  v = view_details.entities.summary("Properties").get_text_of("Aggregate Node CPUs")
  soft_assert.(v.to_i > 0, "Aggregate Node CPUs is 0")
  v = view_details.entities.summary("Properties").get_text_of("Aggregate Node CPU Cores")
  raise "Aggregate Node CPU Cores is 0" unless v.to_i > 0
end
def test_node_memory(provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view_details = navigate_to(provider, "Details")
  node_memory = view_details.entities.summary("Properties").get_text_of("Aggregate Node Memory")
  raise unless node_memory.split()[0].to_f > 0
end
