require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
pytestmark = [pytest.mark.meta(server_roles: "+automate"), pytest.mark.long_running]
def test_service_provision_retire_from_global_region(item_type, catalog_location, context)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: high
  #       casecomponent: Services
  #       initialEstimate: 1/3h
  #       testSteps:
  #           1. Take two or more appliances
  #           2. Configure DB manually
  #           3. Make one appliance as Global region and second are Remote
  #           4. Add appropriate provider to remote region appliance
  #           5. Create Dialog
  #           6. Create Catalog
  #           7. Create Catalog Item of above provider type in remote appliance
  #           8. Order appearing service catalog in global appliance
  #           9. Retire provisioned service in global appliance
  # 
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5.
  #           6.
  #           7.
  #           8. service catalog has been successfully provisioned
  #           9. service has been successfully retired
  #   
  # pass
end
