require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.rest, pytest.mark.tier(1)]
def test_update_advanced_settings_new_key(appliance, request)
  # 
  #   This test case checks updating advanced settings with a new key-value pair
  #   and tests that this change does not break the Configuration page
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  # 
  #   Bugzilla:
  #       1695566
  #   
  data = {"new_key" => "new value"}
  appliance.update_advanced_settings(data)
  _reset_settings = lambda do
    data["new_key"] = "<<reset>>"
    appliance.update_advanced_settings(data)
  end
  raise unless appliance.advanced_settings.include?("new_key")
  view = navigate_to(appliance.server, "Advanced")
  raise unless view.is_displayed
end
