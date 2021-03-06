require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(2),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

function test_reload_button_provider(provider) {
  //  This test verifies the data integrity of the fields in
  //       the Relationships table after clicking the \"reload\"
  //       button.
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  provider.validate_stats({ui: true})
}
