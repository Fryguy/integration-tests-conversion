def test_vmware_console_support(request, appliance)
  # Tests that the VMware Console Support setting may be changed.
  # 
  #   Polarion:
  #       assignee: apagac
  #       caseimportance: medium
  #       casecomponent: Appliance
  #       initialEstimate: 1/4h
  #   
  old_vm_console_type = appliance.server.settings.vmware_console_values["console_type"]
  request.addfinalizer(lambda{|| appliance.server.settings.update_vmware_console({"console_type" => old_vm_console_type})})
  raise "The default VMware console type should not be empty" unless old_vm_console_type
  for new_vm_console_type in appliance.server.settings.CONSOLE_TYPES
    appliance.server.settings.update_vmware_console({"console_type" => new_vm_console_type})
    cur_vm_console_type = appliance.server.settings.vmware_console_values["console_type"]
    raise unless cur_vm_console_type == new_vm_console_type
  end
end
