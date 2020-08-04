function test_vmware_console_support(request, appliance) {
  // Tests that the VMware Console Support setting may be changed.
  // 
  //   Polarion:
  //       assignee: apagac
  //       caseimportance: medium
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //   
  let old_vm_console_type = appliance.server.settings.vmware_console_values.console_type;

  request.addfinalizer(() => (
    appliance.server.settings.update_vmware_console({console_type: old_vm_console_type})
  ));

  if (!old_vm_console_type) {
    throw "The default VMware console type should not be empty"
  };

  for (let new_vm_console_type in appliance.server.settings.CONSOLE_TYPES) {
    appliance.server.settings.update_vmware_console({console_type: new_vm_console_type});
    let cur_vm_console_type = appliance.server.settings.vmware_console_values.console_type;
    if (cur_vm_console_type != new_vm_console_type) throw new ()
  }
}
