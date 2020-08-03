require_relative 'cfme/physical/provider/lenovo'
include Cfme::Physical::Provider::Lenovo
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), pytest.mark.provider([LenovoProvider]), pytest.mark.usefixtures("appliance", "provider", "setup_provider")]
def test_physical_overview_page(appliance)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  providers = appliance.collections.physical_providers
  view = navigate_to(providers, "Overview")
  raise unless view.is_displayed
end
def test_physical_overview_servers_number(appliance, provider)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  providers = appliance.collections.physical_providers
  servers = provider.mgmt.list_servers()
  view = navigate_to(providers, "Overview")
  raise unless view.servers.value == servers.size
end
def test_physical_overview_switches_number(appliance)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  providers = appliance.collections.physical_providers
  switches = appliance.collections.physical_switches.all()
  view = navigate_to(providers, "Overview")
  raise unless view.switches.value == switches.size
end
