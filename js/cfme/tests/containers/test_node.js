require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/exceptions");
include(Cfme.Exceptions);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  test_requirements.containers
];

const TEST_DEST = ["All", "Details"];

function test_nodes_navigate(soft_assert, appliance) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  for (let dest in TEST_DEST) {
    let test_item;

    if (dest == "All") {
      test_item = appliance.collections.container_nodes
    } else if (dest == "Details") {
      try {
        test_item = appliance.collections.container_nodes.all()[0]
      } catch ($EXCEPTION) {
        if ($EXCEPTION instanceof IndexError) {
          pytest.skip("No Nodes available, skipping test")
        } else {
          throw $EXCEPTION
        }
      }
    };

    try {
      let view = navigate_to(test_item, dest)
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NodeNotFound) {
        soft_assert.call(false, `Could not navigate to Node \"${dest}\" .`)
      } else {
        throw $EXCEPTION
      }
    }
  }
}
