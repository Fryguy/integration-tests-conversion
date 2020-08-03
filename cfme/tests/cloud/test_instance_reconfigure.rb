require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.long_running]
def test_vm_reconfigure_from_global_region(context)
  # 
  #   reconfigure a VM via CA
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: medium
  #       casecomponent: Infra
  #       initialEstimate: 1/3h
  #       testSteps:
  #           1. Have a VM created in the provider in the Remote region which is
  #              subscribed to Global.
  #           2. Reconfigure the VM using the Global appliance.
  #       expectedResults:
  #           1.
  #           2. VM reconfigured, no errors.
  #   
  # pass
end
