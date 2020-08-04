require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider]),
  pytest.mark.usefixtures("appliance", "provider", "setup_provider")
];

function test_physical_overview_page(appliance) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let providers = appliance.collections.physical_providers;
  let view = navigate_to(providers, "Overview");
  if (!view.is_displayed) throw new ()
};

function test_physical_overview_servers_number(appliance, provider) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let providers = appliance.collections.physical_providers;
  let servers = provider.mgmt.list_servers();
  let view = navigate_to(providers, "Overview");
  if (view.servers.value != servers.size) throw new ()
};

function test_physical_overview_switches_number(appliance) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let providers = appliance.collections.physical_providers;
  let switches = appliance.collections.physical_switches.all();
  let view = navigate_to(providers, "Overview");
  if (view.switches.value != switches.size) throw new ()
}
