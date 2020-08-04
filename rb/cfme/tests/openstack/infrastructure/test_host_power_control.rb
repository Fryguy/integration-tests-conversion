require_relative 'cfme/infrastructure/provider/openstack_infra'
include Cfme::Infrastructure::Provider::Openstack_infra
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenstackInfraProvider], scope: "module")]
def host_collection(appliance)
  return appliance.collections.hosts
end
def host_on(host_collection, provider)
  begin
    my_host_on = provider.nodes.all().pop()
  rescue IndexError
    raise "Missing nodes in provider's details" unless false
  end
  if my_host_on.get_power_state() == "off"
    my_host_on.power_on()
    my_host_on.wait_for_host_state_change("on", 1000)
  end
  return my_host_on
end
def host_off(host_collection, provider)
  begin
    my_host_off = provider.nodes.all().pop()
  rescue IndexError
    raise "Missing nodes in provider's details" unless false
  end
  if my_host_off.get_power_state() == "on"
    my_host_off.power_off()
    my_host_off.wait_for_host_state_change("off", 1000)
  end
  return my_host_off
end
def test_host_power_off(host_on)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  host_on.power_off()
  host_on.refresh()
  result = host_on.wait_for_host_state_change("off", 1000)
  raise unless result
end
def test_host_power_on(host_off)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  host_off.power_on()
  host_off.refresh()
  result = host_off.wait_for_host_state_change("on", 1000)
  raise unless result
end
