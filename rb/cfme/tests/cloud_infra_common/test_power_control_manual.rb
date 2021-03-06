# Manual tests
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
pytestmark = [test_requirements.power, pytest.mark.manual]
def test_shutdown_guest_scvmm()
  # 
  #   This test performs the Shutdown Guest from the LifeCycle menu which
  #   invokes the Hyper-V Guest Services Integration command.  This
  #   gracefully exits the Windows OS rather than just powering off.
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/4h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.4
  #       casecomponent: Infra
  #       tags: power
  #       testSteps:
  #           1. Add provider scvmm
  #           2. From collections page, select the VM
  #           3. Click \"Shut down guest\" On SCVMM powershell
  #       expectedResults:
  #           1.
  #           2.
  #           3. Use \"$vm = Get-VM -name \"name_of_vm\"; Find-SCJob-objectId $vm.id -recent\"
  #              to verify VM history shows \"Shut down virtual machine\" instead of \"power off\"
  #   
  # pass
end
def test_vm_relationship_datastore_fileshare_scvmm()
  # 
  #   This test case is valid for SCVMM with Host which have Fileshare storage
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/4h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.7
  #       casecomponent: Infra
  #       tags: power
  #       setup:
  #           1. SCVMM provider should have Host which have Fileshare storage
  #       testSteps:
  #           1. Add provider scvmm
  #           2. Provision Vm into fileshare linked to the host
  #           3. Check VM's relationships - Datastore
  #       expectedResults:
  #           1.
  #           2.
  #           3. Datastore should be 'fileshare'
  #   
  # pass
end
def test_suspend_scvmm2016_from_collection()
  # 
  #   Test the a VM can be Suspended, or Saved, from the Collection Page
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/8h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.7
  #       casecomponent: Infra
  #       tags: power
  #       testSteps:
  #           1. Add provider scvmm2016
  #           2. From collections page, select the VM
  #           3. Click \"suspend\" On SCVMM powershell
  #       expectedResults:
  #           1.
  #           2.
  #           3. Use \"$vm = Get-VM -name \"name_of_vm\"; Find-SCJob-objectId $vm.id -recent\"
  #              to verify VM history shows \"suspend\" instead of \"power off\"
  #   
  # pass
end
def test_restart_guest_scvmm2016()
  # 
  #   This test performs the Restart Guest from the LifeCycle menu which
  #   invokes the Hyper-V Guest Services Integration command.  This
  #   gracefully exits and restarts the Windows OS rather than just powering
  #   off and back on.
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/8h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.7
  #       casecomponent: Infra
  #       tags: power
  #       testSteps:
  #           1. Add provider scvmm2016
  #           2. Provision VM
  #           3. From collections page, Select the VM
  #           4. Click on \"Restart Guest\" On SCVMM powershell
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Use \"$vm = Get-VM -name \"name_of_vm\"; Find-SCJob-objectId $vm.id -recent\"
  #              to verify VM history shows \"Shut down virtual machine\" instead of \"power off\"
  #   
  # pass
end
def test_restart_guest_scvmm()
  # 
  #   This test performs the Restart Guest from the LifeCycle menu which
  #   invokes the Hyper-V Guest Services Integration command.  This
  #   gracefully exits and restarts the Windows OS rather than just powering
  #   off and back on.
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/4h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.4
  #       casecomponent: Infra
  #       tags: power
  #       testSteps:
  #           1. Add provider scvmm
  #           2. Provision VM
  #           3. From collections page, Select the VM
  #           4. Click on \"Restart Guest\" On SCVMM powershell
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Use \"$vm = Get-VM -name \"name_of_vm\"; Find-SCJob-objectId $vm.id -recent\"
  #              to verify VM history shows \"Shut down virtual machine\" instead of \"power off\"
  #   
  # pass
end
def test_power_controls_on_archived_vm()
  # 
  #   This test case is to check power operations are not working on archived VM.
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/10h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.7
  #       casecomponent: Cloud
  #       tags: power
  #       testSteps:
  #           1. Add any Cloud provider
  #           2. Provision VM
  #           3. Delete/Retire this VM (we need Archived VM)
  #           4. Open Archived Vms/or All Vms and find your VM
  #           5. Select it's Quadicon and/or open it's Details page
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5. Power control options drop-down should be disabled
  #   
  # pass
end
def test_power_controls_on_vm_in_stack_cloud()
  # 
  #   This test case is to check power controls on vm in stack cloud.
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/3h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.6
  #       casecomponent: Cloud
  #       tags: power
  #       testSteps:
  #           1. Provision a VM via Service (Orchestration template - azure/ec2/rhos)
  #           2. Navigate to cloud-> stacks-> select a stack
  #           3. Click on the instance in relationship section of stack summary page
  #           4. Select it's Quadicon and/or open it's Details page
  #           5. Check power controls operations on that instance
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5. Power operations applicable for this instance should be working as expected
  #   
  # pass
end
def test_power_operations_from_global_region(provider, context)
  # 
  #   This test case is to check power operations from Global region
  #   Setup is 2 or more appliances(DB should be configured manually). One
  #   is Global region, others are Remote. To get this working enable Central Admin.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/2h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.6
  #       casecomponent: Control
  #       tags: power
  #       testSteps:
  #           1. Take two or more appliances
  #           2. Configure DB manually
  #           3. Make one appliance as Global region and others are Remote
  #           4. Add provider to remote region appliance
  #           5. Provision VM
  #           6. Perform power operations on VM from global region
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5.
  #           6. Power operations applicable for this vm should be working as expected
  #   
  # pass
end
def test_check_compliance_policy_option_on_vm_summery_page()
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/12h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: Control
  #       tags: power
  #       testSteps:
  #           1. Go to Compute--> VM Summary screen.
  #           2. Select VM with compliance policy
  #           3. Click on Policy and Compliance check is greyed out.
  #           4. Click on the actually VM to enter next screen, Check compliance is not greyed out
  #              and is available.
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Run compliance check button should be available on VM summary screen
  # 
  #   Bugzilla:
  #       1560107
  #   
  # pass
end
def test_power_operations_on_paused_provider()
  # 
  #   Bugzilla:
  #       1740285
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       casecomponent: Infra
  #       setup:
  #           1. Add infrastructure provider - RHV
  #       testSteps:
  #           1. Pause a provider (RHV)
  #           2. Navigate to its VMs and power one VM on
  #           3. Go to tasks: Task has been queued
  #           4. Resume the provider, wait for the refresh to finish
  #           5. Go to tasks again, it will be in \"Queued\" state forever.
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5. Power operations to be disabled on paused provider in the first place. If it\'s
  #              possible to queue them, then it should be resumed when provider is resumed.
  #   
  # pass
end
def test_suspend_action_on_off_vm()
  # 
  #   Bugzilla:
  #       1704221
  # 
  #   Polarion:
  #       assignee: prichard
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       casecomponent: Services
  #       testSteps:
  #           1. Have a service that provisions a VM. Shut it down so the VM enters Powered OFF state.
  #           2. In SSUI, check different ways to manipulate with VM power:
  #               - from My Services page
  #               - from service details page
  #               - from VM details page - here is the Suspend action disabled, which is correct
  #       expectedResults:
  #           1.
  #           2. Suspend action should be disabled for powered off VMs, as seen in VM details page in
  #              SSUI
  #   
  # pass
end
