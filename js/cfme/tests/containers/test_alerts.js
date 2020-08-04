require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);

let pytestmark = [
  pytest.mark.provider({
    classes: [ContainersProvider],
    required_flags: ["prometheus_alerts"]
  }),

  test_requirements.containers
];

function test_add_alerts_provider(provider) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       initialEstimate: 1/4h
  //       caseimportance: low
  //       casecomponent: Containers
  //   
  provider.setup()
}
