require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
pytestmark = [pytest.mark.long_running, pytest.mark.tier(2), pytest.mark.manual, pytest.mark.provider([VMwareProvider, RHEVMProvider, OpenStackProvider], scope: "module")]
def test_snapshot_image_copies_system_info()
  # 
  #   Verify that system info is copied to image during making a snapshot of vm
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Appliance
  #       initialEstimate: 1/2h
  #       tags: smartstate, providers
  #       testSteps:
  #           1. Add a Provider.
  #           2. provision vm and make sure it has os_version and os_distro set
  #           3. make an image of it by creating snapshot
  #       expectedResults:
  #           1.
  #           2.
  #           3. vm/system info is present in the image
  #   
end
