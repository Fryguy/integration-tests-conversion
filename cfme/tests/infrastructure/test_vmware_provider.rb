# Manual VMware Provider tests
require_relative 'urllib'
include Urllib
alias url_request request
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/host'
include Cfme::Infrastructure::Host
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
filter_fields = [["provisioning", "template"], ["provisioning", "host"], ["provisioning", "datastore"]]
pytestmark = [test_requirements.vmware, pytest.mark.meta(server_roles: "+automate"), pytest.mark.usefixtures("setup_provider_modscope", "uses_infra_providers"), pytest.mark.provider([VMwareProvider], required_fields: filter_fields, scope: "module")]
def test_vmware_provider_filters(appliance, provider, soft_assert)
  # 
  #   N-3 filters for esx provider.
  #   Example: ESXi 6.5 is the current new release.
  #   So filters for 6.7 (n), 6.5 (n-1), 6.0 (n-2) at minimum.
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Provisioning
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1.Integrate VMware provider in CFME
  #           2.Go to Compute->Infrastructure->Hosts
  #           3.Try to use preset filters
  #       expectedResults:
  #           1.
  #           2.All hosts are listed.
  #           3.We should have at least 3 filters based on VMware version.
  #   
  esx_platforms = ["Platform / ESX 6.0", "Platform / ESX 6.5", "Platform / ESX 6.7"]
  view = navigate_to(appliance.collections.hosts, "All")
  all_options = view.filters.navigation.all_options
  logger.info()
  for esx_platform in esx_platforms
    soft_assert.(all_options.include?(esx_platform), "ESX Platform does not exists in options")
  end
end
def test_appliance_scsi_control_vmware(request, appliance)
  # 
  #   Appliance cfme-vsphere-paravirtual-*.ova has SCSI controller as Para
  #   Virtual
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Appliance
  #       caseimportance: critical
  #       initialEstimate: 1/4h
  #   
  begin
    url = conf.cfme_data.basic_info.cfme_images_url.cfme_paravirtual_url_format.format(baseurl: conf.cfme_data.basic_info.cfme_images_url.baseurl, series: appliance.version.series(), ver: appliance.version)
  rescue NoMethodError
    pytest.skip("Skipping as one of the keys might be missing in cfme_yamls.")
  end
  logger.info("Downloading ova file for parvirtual vsphere scsi controller test from %s", url)
  filename = File.basename(url)
  url_request.urlretrieve(url, filename)
  _cleanup = lambda do
    if is_bool(os.path.exists(filename))
      os.remove(filename)
    end
  end
  tarfile.open(filename) {|tar|
    desc_member = tar.getmember("desc.ovf")
    f = tar.extractfile(desc_member)
    content = f.read()
  }
  raise "No content could be read from desc.ovf" unless content
  logger.debug("Desc file contains following text:%s" % content)
  check_string = "<rasd:ResourceSubType>VirtualSCSI</rasd:ResourceSubType>"
  raise "Given OVA does not have paravirtual scsi controller" unless content.to_s.include?(check_string)
end
def test_vmware_vds_ui_display(soft_assert, appliance, provider)
  # 
  #   Virtual Distributed Switch port groups are displayed for VMs assigned
  #   to vds port groups.
  #   Compute > Infrastructure > Host > [Select host] > Properties > Network
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #       testtype: functional
  #       testSteps:
  #           1.Integrate VMware provider in CFME
  #           2.Compute > Infrastructure > Host > [Select host] > Properties > Network
  #           3.Check if host has Distributed Switch and it is displayed on this page
  #       expectedResults:
  #           1.
  #           2.Properties page for the host opens.
  #           3.If DSwitch exists it will be displayed on this page.
  #   
  begin
    host = provider.hosts.all()[0]
  rescue IndexError
    pytest.skip("No hosts found")
  end
  view = navigate_to(host, "Networks")
  soft_assert.(view.network_tree.all_options.include?("DSwitch"), "No DSwitches on Host Network page")
  raise "No DSwitchon networking page" unless appliance.collections.infra_switches.all().map{|s| s.name}.include?("DSwitch")
end
def test_vmware_reconfigure_vm_controller_type(appliance, provider)
  # 
  #   Edit any VM which is provisioned for vSphere and select \"Reconfigure this VM\" option.
  #   In \"Controller Type\" column we do not see the Controller Type listed.
  #   Controller Type should be listed.
  # 
  #   Bugzilla:
  #       1650441
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       testSteps:
  #           1.Integrate VMware provider in CFME
  #           2.Navigate to Compute->Infrastructure->Virtual Machines
  #           3.Select a virtual machine and select Configure->Reconfigure Selected Item
  #           4.Check if Disks table lists controller type
  #       expectedResults:
  #           1.
  #           2.
  #           3.Reconfigure VM opion should be enabled
  #           4.Controller type should be listed
  #   
  vms_collections = appliance.collections.infra_vms
  vm = vms_collections.instantiate(name: "cu-24x7", provider: provider)
  if is_bool(!vm.exists_on_provider)
    pytest.skip("Skipping test, cu-24x7 VM does not exist")
  end
  view = navigate_to(vm, "Reconfigure")
  row = view.disks_table[0]
  raise "Failed, as the Controller Type Column has no text" unless !row.controller_type.read() == ""
end
def test_vmware_vds_ui_tagging(request, appliance, provider, soft_assert)
  # 
  #   Virtual Distributed Switch port groups are displayed for VMs assigned
  #   to vds port groups. Check to see if you can navigate to DSwitch and tag it.
  #   Compute > Infrastructure > Host > [Select host] > Properties > Network
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #       testtype: functional
  #       testSteps:
  #           1.Integrate VMware provider in CFME
  #           2.Compute > Infrastructure > Networkiong
  #           3.Check if host has Distributed Switch and it is displayed on this page
  #           4.If displayed, try to select Policy->Assign Tag to DSwitch.
  #       expectedResults:
  #           1.
  #           2.Networking Page opens
  #           3.If DSwitch exists it will be displayed on this page.
  #           4.You can assign tags to DSwitch.
  #   
  switches_collection = appliance.collections.infra_switches
  switches = switches_collection.all().select{|switch| switch.name == "DSwitch"}.map{|switch| switch}
  begin
    switch = switches[0]
  rescue IndexError
    pytest.skip("There are no DSwitches for provider %s", provider)
  end
  owner_tag = appliance.collections.categories.instantiate(display_name: "Department").collections.tags.instantiate(display_name: "Accounting")
  switch.add_tag(owner_tag)
  _cleanup = lambda do
    switch.remove_tag(owner_tag)
  end
  raise "Failed to retrieve correct tags" unless switch.get_tags().include?(owner_tag)
end
def test_vmware_inaccessible_datastore()
  # 
  #   VMware sometimes has datastores that are inaccessible, and CloudForms should indicate that.
  # 
  #   Bugzilla:
  #       1684656
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       testSteps:
  #           1.Integrate VMware provider in CFME
  #           2.Compute > Infrastructure > Datastores
  #           3.Check if any of the datastores marked inaccessible and compare it with VMware UI.
  #       expectedResults:
  #           1.
  #           2.Datastores page opens showing all the datastores known to CFME
  #           3.All datastores that are inaccessible in vSphere should be marked such in CFME UI too.
  #   
  # pass
end
def test_vmware_cdrom_dropdown_not_blank(appliance, provider)
  # 
  #   Test CD/DVD Drives dropdown lists ISO files, dropdown is not blank
  # 
  #   Bugzilla:
  #       1689369
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       testSteps:
  #           1.Integrate VMware provider in CFME
  #           2.Compute > Infrastructure > Datastores
  #           3.Run SSA on datastore which contains ISO files
  #           4.Navigate to Compute>Infrastructure>Virtual Machines, select any virtual machine
  #           5.Reconfigure it to have new ISO file attached to it in CD/DVD drive
  #       expectedResults:
  #           1.
  #           2.Datastores page opens showing all the datastores known to CFME
  #           3.SSA runs successfully, and you can see files in datastore
  #           4.Virtual machine is selected
  #           5.Dropdown of ISO files is not empty for CD/DVD Drive
  #   
  datastore_collection = appliance.collections.datastores
  ds = provider.data["datastores"].select{|ds| ds.type == "iso" && ds.get("tag") == "ssa"}.map{|ds| ds.name}
  begin
    iso_ds = datastore_collection.instantiate(name: ds[0], provider: provider)
  rescue IndexError
    pytest.skip()
  end
  iso_ds.run_smartstate_analysis()
  vms_collections = appliance.collections.infra_vms
  vm = vms_collections.instantiate(name: "cu-24x7", provider: provider)
  if is_bool(!vm.exists_on_provider)
    pytest.skip("Skipping test, cu-24x7 VM does not exist")
  end
  view = navigate_to(vm, "Reconfigure")
  begin
    actions_column = view.cd_dvd_table[0]["Actions"]
  rescue IndexError
    pytest.skip("CD DVD Table is empty, has no rows.")
  end
  raise unless actions_column.text == "Connect Disconnect"
  actions_column.click()
  raise unless actions_column.text == "Confirm"
  actions_column.click()
  raise unless actions_column.text == "Connect"
  actions_column.click()
  host_file_column = view.cd_dvd_table[0]["Host File"]
  raise unless host_file_column.widget.is_displayed
  raise unless !host_file_column.widget.all_options == []
  all_isos = host_file_column.widget.all_options.select{|opt| opt.text.include?("iso")}.map{|opt| opt.text}
  raise "Dropdown for isos is empty" unless all_isos
end
def test_vmware_inaccessible_datastore_vm_provisioning(request, appliance, provider)
  # 
  #   VMware sometimes has datastores that are inaccessible, and CloudForms should not pick this
  #   during provisioning when using \"Choose Automatically\" as an option under environment tab.
  # 
  #   Bugzilla:
  #       1694137
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       testSteps:
  #           1.Integrate VMware provider in CFME
  #           2.Compute > Infrastructure > Virtual Machines > Templates
  #           3.Provision a VM from template, make sure to have at least 1 Datastore on VMware that is
  #             inaccssible & while provisioning use \"Choose Automatically\" option in Environment Tab.
  #       expectedResults:
  #           1.
  #           2.See all available templates
  #           3.CFME should provision VM on datastore other than the one that is inaccessible.
  #   
  inaccessible_datastores = provider.mgmt.list_datastore().select{|datastore| !provider.mgmt.get_datastore(datastore).summary.accessible}.map{|datastore| datastore}
  if is_bool(inaccessible_datastores)
    logger.info()
  else
    pytest.skip()
  end
  vm = appliance.collections.infra_vms.create(fauxfactory.gen_alphanumeric(18, start: "test-vmware-"), provider, find_in_cfme: true, wait: true, form_values: {"environment" => {"automatic_placement" => true}})
  request.addfinalizer(vm.delete)
  raise unless !inaccessible_datastores.include?(vm.datastore.name)
end
def test_vmware_provisioned_vm_host_relationship(request, appliance, provider)
  # 
  #   VMware VMs provisioned through cloudforms should have host relationship.
  # 
  #   Bugzilla:
  #       1657341
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       testtype: functional
  #       testSteps:
  #           1.Integrate VMware provider in CFME
  #           2.Compute > Infrastructure > Virtual Machines > Templates
  #           3.Provision a VM from template
  #       expectedResults:
  #           1.
  #           2.See all available templates
  #           3.CFME Provisioned VM should have host relationship.
  #   
  vm = appliance.collections.infra_vms.create(fauxfactory.gen_alphanumeric(18, start: "test-vmware-"), provider, find_in_cfme: true, wait: true, form_values: {"environment" => {"automatic_placement" => true}})
  request.addfinalizer(vm.delete)
  raise unless vm.host.is_a? Host
  view = navigate_to(vm, "Details")
  raise unless view.entities.summary("Relationships").get_text_of("Host") == vm.host.name
end
def test_esxi_reboot_not_orphan_vms(appliance, provider)
  # 
  #   By mimicking ESXi reboot effect on VMs in CFME, make sure they are not getting marked orphaned.
  # 
  #   Bugzilla:
  #       1695008
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: critical
  #       initialEstimate: 1/2h
  #       testtype: functional
  #       testSteps:
  #           1.Add VMware provider to CFME
  #           2.SSH to CFME appliance and perform following steps in rails console
  #               \'\'\'
  #               ems = ManageIQ::Providers::Vmware::InfraManager.find_by(:name => \"name of your vc\")
  #               vm = ems.vms.last # Or do vms[index] and find a vm to work with
  #               puts \"VM_ID [#{vm.id}],name [#{vm.name}],uid[#{vm.uid_ems}]\"
  #               vm.update_attributes(:uid_ems => SecureRandom.uuid)
  #               \'\'\'
  #           3.Refresh the provider
  #       expectedResults:
  #           1.Provider added successfully and is refreshed
  #           2.VM\'s uid_ems is modified
  #           3.After a full refresh, VM is still active and usable in cfme, not archived/orphaned.
  #   
  command = ("\'ems=ManageIQ::Providers::Vmware::InfraManager.find_by(:name =>\"" + provider.name) + "\");                vm = ems.vms.last;                puts \"VM_ID=#{vm.id} name=[#{vm.name}] uid=#{vm.uid_ems}\";                vm.update_attributes(:uid_ems => SecureRandom.uuid);                puts \"VM_ID=#{vm.id} name=[#{vm.name}] uid=#{vm.uid_ems}\"\'"
  result = appliance.ssh_client.run_rails_command(command)
  provider.refresh_provider_relationships()
  raise  unless result.success
  if is_bool(!result.output)
    logger.info()
    vm_name = ((re.findall("\\[.+\\]", result.output)[0]).split_p("[")[1]).split_p("]")[0]
    vm = appliance.collections.infra_vms.instantiate(name: vm_name, provider: provider)
    view = vm.load_details(from_any_provider: true)
    power_state = view.entities.summary("Power Management").get_text_of("Power State")
    raise unless !power_state == "orphaned"
    raise unless !power_state == "archived"
  end
end
def test_switches_class_present_ems(appliance, provider)
  # 
  #   Under this customer requested enhancement, ems should have switches class.
  # 
  #   Bugzilla:
  #       1688900
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: critical
  #       initialEstimate: 1/2h
  #       testtype: functional
  #       testSteps:
  #           1.Add VMware provider to CFME
  #           2.SSH to CFME appliance and perform following steps in rails console
  #               '''
  #               $evm = MiqAeMethodService::MiqAeService.new(MiqAeEngine::MiqAeWorkspaceRuntime.new)
  #               p = $evm.vmdb(:ems_infra).first
  #               p.class.name
  #               p.switches.first.class.name
  #               '''
  #       expectedResults:
  #           1.Provider added successfully and is refreshed
  #           2.p.switches.first.class.name returns exit status 0(success) and lists class name
  #           containing HostVirtualSwitch
  #   
  command = "\'$evm = MiqAeMethodService::MiqAeService.new(MiqAeEngine::MiqAeWorkspaceRuntime.new);                p = $evm.vmdb(:ems_infra).first;                p.class.name;                puts \"class name [#{p.switches.first.class.name}]\"\'
                "
  result = appliance.ssh_client.run_rails_command(command)
  raise  unless result.success
  logger.info("output of rails command: %s", result.output)
  raise unless result.output.downcase().include?("switch")
end
def test_rebuilt_vcenter_duplicate_hosts(appliance, provider)
  # 
  #   If vCenter rebuilt without removing from CFME, hosts should not be archived and
  #   duplicate records should not be created.
  # 
  #   Bugzilla:
  #       1719399
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: critical
  #       initialEstimate: 1/2h
  #       testtype: functional
  #       testSteps:
  #           1.Add VMware provider to CFME
  #           2.Check hosts count on hosts page
  #           3.SSH to CFME appliance & run given steps in rails console(to mimic vCenter rebuild)
  #               '''
  #               Host.all.each { |h| h.ems_id = nil; h.ems_ref = h.id.to_s; h.save! }
  #               '''
  #           4.Refresh provider and check hosts count/name.
  #       expectedResults:
  #           1.Provider added successfully and is refreshed
  #           2.Note hosts count
  #           3.Command runs successfully
  #           4.Host count does not change, no duplicate hosts found.
  #   
  hosts_before = appliance.rest_api.collections.hosts.all.size
  command = "'Host.all.each { |h| h.ems_id = nil; h.ems_ref = h.id.to_s; h.save! }'"
  result = appliance.ssh_client.run_rails_command(command)
  raise  unless result.success
  logger.info("output of rails command: %s", result.output)
  provider.refresh_provider_relationships(wait: 300, delay: 30, refresh_delta: 120)
  hosts_after = appliance.rest_api.collections.hosts.all.size
  raise unless hosts_before == hosts_after
end
def test_vm_notes_ui(appliance, provider)
  # 
  #   Check if the VM Notes are shown in the CFME UI for VMs on VMware.
  # 
  #   Bugzilla:
  #       1755070
  # 
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/2h
  #       testtype: functional
  #       testSteps:
  #           1.Add VMware provider to CFME
  #           2.Navigate to Compute->Infrastructure->Virtual Machines
  #           3.Select a VM to view details and click on \"Container\" in the \"Basic Information\" table
  #           4.Check if Notes field exists and Notes are shown
  #   
  vms_collections = appliance.collections.infra_vms
  vm = vms_collections.instantiate(name: "cu-24x7", provider: provider)
  view = navigate_to(vm, "VmContainer")
  raise unless view.basic_information.get_field("Notes").is_displayed
  raise "VM notes field is empty in CFME orVM does not have any notes" unless view.basic_information.read()["Notes"] != ""
end
def test_delete_vm_archive(appliance, provider, create_vm)
  # 
  #   Bugzilla:
  #       1644770
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/2h
  #       testtype: functional
  #       testSteps:
  #           1.Add VMware provider to CFME
  #           2.Create a new Vm
  #           3.Remove it from vmware using delete operation and check status of that vm in CFME -
  #           should be archived
  #       expectedResults:
  #           1.VMware provider added successfully.
  #           2.New VM visible in CFME
  #           3.VM is Archived in CFME
  #   
  create_vm.mgmt.delete()
  begin
    create_vm.wait_for_vm_state_change(from_any_provider: true, desired_state: "archived")
  rescue TimedOutError
    pytest.fail("VM did not reach desired state - Archived.")
  end
  quadicon = create_vm.find_quadicon(from_any_provider: true)
  raise unless quadicon.data[(appliance.version > "5.11") ? "power_state" : "state"] == "archived"
end
def test_vm_remove_from_inventory_orphan(appliance, provider, create_vm)
  # 
  #   Bugzilla:
  #       1644770
  #   Polarion:
  #       assignee: kkulkarn
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/2h
  #       testtype: functional
  #       testSteps:
  #           1.Add VMware provider to CFME
  #           2.Create a new Vm
  #           3.Remove it from vmware using unregister(remove from inventory) operation and
  #           check status of that vm in CFME- should be orphaned
  #       expectedResults:
  #           1.VMware provider added successfully.
  #           2.New VM visible in CFME
  #           3.VM is Orphaned in CFME
  #   
  create_vm.mgmt.unregister()
  begin
    create_vm.wait_for_vm_state_change(from_any_provider: true, desired_state: "orphaned")
  rescue TimedOutError
    pytest.fail("VM did not reach desired state - Orphaned.")
  end
  quadicon = create_vm.find_quadicon(from_any_provider: true)
  raise unless quadicon.data[(appliance.version > "5.11") ? "power_state" : "state"] == "orphaned"
end
