# This test contains necessary smoke tests for the Automate.
require_relative 'cfme'
include Cfme
pytestmark = [test_requirements.automate, pytest.mark.smoke, pytest.mark.tier(2), pytest.mark.ignore_stream(["upstream", {"domain_name" => "RedHat"}])]
def test_domain_present(domain_name, soft_assert, appliance)
  # This test verifies presence of domains that are included in the appliance.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: critical
  #       initialEstimate: 1/60h
  #       testtype: functional
  #       tags: automate
  #       testSteps:
  #           1. Clean appliance.
  #           2. Open the Automate Explorer.
  #           3. Verify that all of the required domains are present.
  #   
  domain = appliance.collections.domains.instantiate(name: domain_name)
  soft_assert.(domain.exists, "Domain #{domain_name} does not exist!")
  soft_assert.(domain.locked, "Domain #{domain_name} is not locked!")
  soft_assert.(appliance.check_domain_enabled(domain_name), "Domain #{domain_name} is not enabled!")
end
