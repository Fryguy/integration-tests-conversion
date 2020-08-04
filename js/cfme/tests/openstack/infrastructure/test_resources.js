require_relative("cfme/infrastructure/provider/openstack_infra");
include(Cfme.Infrastructure.Provider.Openstack_infra);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.meta({server_roles: "+smartproxy +smartstate"}),
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.provider([OpenstackInfraProvider], {scope: "module"})
];

function test_number_of_cpu(provider, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view_details = navigate_to(provider, "Details");
  let v = view_details.entities.summary("Properties").get_text_of("Aggregate Node CPU Resources");

  soft_assert.call(
    v.split()[0].to_f > 0,
    "Aggregate Node CPU Resources is 0"
  );

  v = view_details.entities.summary("Properties").get_text_of("Aggregate Node CPUs");
  soft_assert.call(v.to_i > 0, "Aggregate Node CPUs is 0");
  v = view_details.entities.summary("Properties").get_text_of("Aggregate Node CPU Cores");
  if (v.to_i <= 0) throw "Aggregate Node CPU Cores is 0"
};

function test_node_memory(provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view_details = navigate_to(provider, "Details");
  let node_memory = view_details.entities.summary("Properties").get_text_of("Aggregate Node Memory");
  if (node_memory.split()[0].to_f <= 0) throw new ()
}
