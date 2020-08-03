require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.usefixtures("setup_provider"), test_requirements.containers]
TEST_DEST = ["All", "Details"]
def test_nodes_navigate(soft_assert, appliance)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  for dest in TEST_DEST
    if dest == "All"
      test_item = appliance.collections.container_nodes
    else
      if dest == "Details"
        begin
          test_item = appliance.collections.container_nodes.all()[0]
        rescue IndexError
          pytest.skip("No Nodes available, skipping test")
        end
      end
    end
    begin
      view = navigate_to(test_item, dest)
    rescue NodeNotFound
      soft_assert.(false, "Could not navigate to Node \"#{dest}\" .")
    end
  end
end
