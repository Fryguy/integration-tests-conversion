# This module tests only cloud specific events
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [pytest.mark.tier(3), pytest.mark.provider([AzureProvider], scope: "module", required_flags: ["events"]), pytest.mark.usefixtures("setup_provider_modscope"), test_requirements.events]
def test_manage_nsg_group(appliance, provider, register_event)
  # 
  #   tests that create/remove azure network security groups events are received and parsed by CFME
  # 
  #   Metadata:
  #       test_flag: events
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       initialEstimate: 1/8h
  #       casecomponent: Events
  #       caseimportance: medium
  #   
  nsg_name = random_vm_name(context: "nsg")
  resource_group = provider.data["provisioning"]["resource_group"]
  add_cmp = lambda do |_, data|
    #  comparison function, data is expected to be a dictionary, containing the keys below 
    if appliance.version < "5.10"
      compare = data["resourceId"].end_with?(nsg_name) && data["status"]["value"] == "Accepted" && data["subStatus"]["value"] == "Created" || data["status"]["value"] == "Succeeded"
    else
      compare = data["resourceId"].end_with?(nsg_name)
    end
    return compare
  end
  fd_add_attr = {"full_data" => "will be ignored", "cmp_func" => add_cmp}
  register_event(fd_add_attr, source: provider.type.upcase(), event_type: "networkSecurityGroups_write_EndRequest")
  rm_cmp = lambda do |_, data|
    #  comparison function, data is expected to be a dictionary, containing the keys below 
    if appliance.version < "5.10"
      compare = data["resourceId"].end_with?(nsg_name) && data["status"]["value"] == "Succeeded"
    else
      compare = data["resourceId"].end_with?(nsg_name)
    end
    return compare
  end
  fd_rm_attr = {"full_data" => "will be ignored", "cmp_func" => rm_cmp}
  register_event(fd_rm_attr, source: provider.type.upcase(), event_type: "networkSecurityGroups_delete_EndRequest")
  provider.mgmt.create_netsec_group(nsg_name, resource_group)
  time.sleep(60)
  provider.mgmt.remove_netsec_group(nsg_name, resource_group)
end
def test_vm_capture(appliance, request, create_vm, provider, register_event)
  # 
  #   tests that generalize and capture vm azure events are received and parsed by CFME
  # 
  #   Metadata:
  #       test_flag: events, provision
  # 
  #   Bugzilla:
  #       1724312
  #       1733383
  # 
  #   Polarion:
  #       assignee: jdupuy
  #       initialEstimate: 1/8h
  #       casecomponent: Events
  #       caseimportance: medium
  #   
  cmp_function = lambda do |_, data|
    #  comparison function, data is expected to be a dictionary containing the keys below 
    if appliance.version < "5.10"
      compare = data["resourceId"].end_with?(create_vm.name) && data["status"]["value"] == "Succeeded"
    else
      compare = data["resourceId"].end_with?(create_vm.name)
    end
    return compare
  end
  full_data_attr = {"full_data" => "will be ignored", "cmp_func" => cmp_function}
  register_event(full_data_attr, source: "AZURE", event_type: "virtualMachines_generalize_EndRequest")
  register_event(full_data_attr, source: "AZURE", event_type: "virtualMachines_capture_EndRequest")
  create_vm.mgmt.capture(container: "templates", image_name: create_vm.name)
  blob_images = provider.mgmt.find_templates(container: "system", name: create_vm.name, only_vhd: false)
  logger.info("Found blobs on system container: %s", blob_images)
  for blob in blob_images
    logger.info("Deleting blob %s", blob)
    blob.cleanup()
  end
end
