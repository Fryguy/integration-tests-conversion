require_relative 'cfme'
include Cfme
require_relative 'cfme/configure'
include Cfme::Configure
pytestmark = [test_requirements.general_ui]
def test_about_region(appliance)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Open `About` modal and check the value of Region.
  # 
  #   Bugzilla:
  #       1402112
  #   
  about_version = about.get_detail(about.REGION, appliance.server)
  raise unless about_version == appliance.region()[-1]
end
def test_about_zone(appliance)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Open `About` modal and check the value of Zone.
  # 
  #   Bugzilla:
  #       1402112
  #   
  about_version = about.get_detail(about.ZONE, appliance.server)
  raise unless about_version == appliance.server.zone.name
end
