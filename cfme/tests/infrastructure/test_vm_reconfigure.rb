require_relative 'wrapanapi'
include Wrapanapi
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/infrastructure/virtual_machines'
include Cfme::Infrastructure::Virtual_machines
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.reconfigure, pytest.mark.usefixtures("setup_provider"), pytest.mark.long_running, pytest.mark.tier(2), pytest.mark.provider([VMwareProvider, RHEVMProvider], required_fields: ["templates"], scope: "module")]
def prepare_new_config(orig_config, change_type)
  # Prepare configuration object for test case based on change_type.
  new_config = orig_config.copy()
  if change_type == "cores_per_socket"
    new_config.hw.cores_per_socket = new_config.hw.cores_per_socket + 1
  else
    if change_type == "sockets"
      new_config.hw.sockets = new_config.hw.sockets + 1
    else
      if change_type == "memory"
        new_config.hw.mem_size = new_config.hw.mem_size_mb + 512
        new_config.hw.mem_size_unit = "MB"
      end
    end
  end
  return new_config
end
def reconfigure_vm(vm, config)
  # Reconfigure VM to have the supplies config.
  reconfigure_request = vm.reconfigure(config)
  wait_for(reconfigure_request.is_succeeded, timeout: 360, delay: 45, message: "confirm that vm was reconfigured")
  wait_for(lambda{|| vm.configuration == config}, timeout: 360, delay: 45, fail_func: vm.refresh_relationships, message: "confirm that config was applied. Hardware: {}, disks: {}".format(vars(config.hw), config.disks))
end
def full_vm(appliance, provider, full_template)
  # This fixture is function-scoped, because there is no un-ambiguous way how to search for
  #   reconfigure request in UI in situation when you have two requests for the same reconfiguration
  #   and for the same VM name. This happens if you run test_vm_reconfig_add_remove_hw_cold and then
  #   test_vm_reconfig_add_remove_hw_hot or vice versa. Making thix fixture function-scoped will
  #   ensure that the VM under test has a different name each time so the reconfigure requests
  #   are unique as a result.
  vm = appliance.collections.infra_vms.instantiate(random_vm_name(context: "reconfig"), provider, full_template.name)
  vm.create_on_provider(find_in_cfme: true, allow_skip: "default")
  vm.refresh_relationships()
  yield(vm)
  vm.cleanup_on_provider()
end
def ensure_vm_stopped(full_vm)
  if is_bool(full_vm.is_pwr_option_available_in_cfme(full_vm.POWER_OFF))
    full_vm.mgmt.ensure_state(VmState.STOPPED)
    full_vm.wait_for_vm_state_change(full_vm.STATE_OFF)
  else
    raise Exception, "Unknown power state - unable to continue!"
  end
end
def ensure_vm_running(full_vm)
  if is_bool(full_vm.is_pwr_option_available_in_cfme(full_vm.POWER_ON))
    full_vm.mgmt.ensure_state(VmState.RUNNING)
    full_vm.wait_for_vm_state_change(full_vm.STATE_ON)
  else
    raise Exception, "Unknown power state - unable to continue!"
  end
end
def vm_state(request, full_vm)
  if request.param == "cold"
    if is_bool(full_vm.is_pwr_option_available_in_cfme(full_vm.POWER_OFF))
      full_vm.mgmt.ensure_state(VmState.STOPPED)
      full_vm.wait_for_vm_state_change(full_vm.STATE_OFF)
    else
      raise Exception, "Unknown power state - unable to continue!"
    end
  else
    if is_bool(full_vm.is_pwr_option_available_in_cfme(full_vm.POWER_ON))
      full_vm.mgmt.ensure_state(VmState.RUNNING)
      full_vm.wait_for_vm_state_change(full_vm.STATE_ON)
    else
      raise Exception, "Unknown power state - unable to continue!"
    end
  end
  yield(request.param)
end
def enable_hot_plugin(provider, full_vm, ensure_vm_stopped)
  if is_bool(provider.one_of(VMwareProvider))
    vm = provider.mgmt.get_vm(full_vm.name)
    vm.cpu_hot_plug = true
    vm.memory_hot_plug = true
  end
end
def test_vm_reconfig_add_remove_hw_cold(provider, full_vm, ensure_vm_stopped, change_type)
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Infra
  #       initialEstimate: 1/3h
  #       tags: reconfigure
  #   
  orig_config = full_vm.configuration.copy()
  new_config = prepare_new_config(orig_config, change_type)
  reconfigure_vm(full_vm, new_config)
  reconfigure_vm(full_vm, orig_config)
end
def test_vm_reconfig_add_remove_disk(provider, full_vm, vm_state, disk_type, disk_mode)
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/6h
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: Infra
  #       tags: reconfigure
  #       testSteps:
  #           1. Add and remove the disk while VM is stopped and running
  #           2. Go to Compute -> infrastructure -> Virtual Machines -> Select Vm
  #           3. Go to VM reconfiguration
  #           4. Click on Add Disk -> select disk_type and disk_mode , save and submit
  #           5. Check the count in VM details page
  #           6. Remove the disk and Check the count in VM details page
  #   
  orig_config = full_vm.configuration.copy()
  new_config = orig_config.copy()
  new_config.add_disk(size: 500, size_unit: "MB", type: disk_type, mode: disk_mode)
  add_disk_request = full_vm.reconfigure(new_config)
  wait_for(add_disk_request.is_succeeded, timeout: 360, delay: 45, message: "confirm that disk was added")
  wait_for(lambda{|| full_vm.configuration.num_disks == new_config.num_disks}, timeout: 360, delay: 45, fail_func: full_vm.refresh_relationships, message: "confirm that disk was added")
  msg = "Disk wasn't added to VM config"
  raise msg unless full_vm.configuration.num_disks == new_config.num_disks
  remove_disk_request = full_vm.reconfigure(orig_config)
  wait_for(remove_disk_request.is_succeeded, timeout: 360, delay: 45, message: "confirm that previously-added disk was removed")
  wait_for(lambda{|| full_vm.configuration.num_disks == orig_config.num_disks}, timeout: 360, delay: 45, fail_func: full_vm.refresh_relationships, message: "confirm that previously-added disk was removed")
  msg = "Disk wasn't removed from VM config"
  raise msg unless full_vm.configuration.num_disks == orig_config.num_disks
end
def test_reconfig_vm_negative_cancel(provider, full_vm, ensure_vm_stopped)
  #  Cancel reconfiguration changes
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Infra
  #       initialEstimate: 1/3h
  #       tags: reconfigure
  #   
  config_vm = full_vm.configuration.copy()
  config_vm.hw.cores_per_socket = config_vm.hw.cores_per_socket + 1
  config_vm.hw.sockets = config_vm.hw.sockets + 1
  config_vm.hw.mem_size = config_vm.hw.mem_size_mb + 512
  config_vm.hw.mem_size_unit = "MB"
  config_vm.add_disk(size: 5, size_unit: "GB", type: "thin", mode: "persistent")
  full_vm.reconfigure(config_vm, cancel: true)
end
def test_vm_reconfig_add_remove_hw_hot(provider, full_vm, enable_hot_plugin, ensure_vm_running, change_type)
  # Change number of CPU sockets and amount of memory while VM is runnng.
  #   Changing number of cores per socket on running VM is not supported by RHV.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #       tags: reconfigure
  #   
  orig_config = full_vm.configuration.copy()
  new_config = prepare_new_config(orig_config, change_type)
  raise unless vars(orig_config.hw) != vars(new_config.hw)
  reconfigure_vm(full_vm, new_config)
  raise unless vars(full_vm.configuration.hw) == vars(new_config.hw)
  if is_bool(provider.one_of(RHEVMProvider))
    reconfigure_vm(full_vm, orig_config)
  end
end
def test_vm_reconfig_resize_disk(appliance, full_vm, vm_state, disk_type, disk_mode)
  #  Resize the disk while VM is running and not running
  #    Polarion:
  #        assignee: nansari
  #        initialEstimate: 1/6h
  #        testtype: functional
  #        startsin: 5.9
  #        casecomponent: Infra
  #    
  initial_disks = full_vm.configuration.disks.map{|disk| disk.filename}
  add_data = [{"disk_size_in_mb" => 20, "sync" => true, "persistent" => disk_mode != "independent_nonpersistent", "thin_provisioned" => disk_type == "thin", "dependent" => !disk_mode.include?("independent"), "bootable" => false}]
  vm_reconfig_via_rest(appliance, "disk_add", full_vm.rest_api_entity.id, add_data)
  raise unless wait_for(lambda{|| full_vm.configuration.num_disks > initial_disks.size}, fail_func: full_vm.refresh_relationships, delay: 5, timeout: 200)
  disks_present = full_vm.configuration.disks.map{|disk| disk.filename}
  begin
    disk_added = Set.new(disks_present) - Set.new(initial_disks).to_a[0]
  rescue IndexError
    pytest.fail("Added disk not found in diff between initial and present disks")
  end
  disk_size = 500
  new_config = full_vm.configuration.copy()
  new_config.resize_disk(size_unit: "MB", size: disk_size, filename: disk_added)
  resize_disk_request = full_vm.reconfigure(new_configuration: new_config)
  wait_for(resize_disk_request.is_succeeded, timeout: 360, delay: 45, message: "confirm that disk was Resize")
  view = navigate_to(full_vm, "Reconfigure")
  raise unless view.disks_table.row(name: disk_added)["Size"].text.to_i == disk_size
end
def test_vm_reconfig_resize_disk_snapshot(request, disk_type, disk_mode, full_vm, memory: false)
  # 
  # 
  #   Bugzilla:
  #       1631448
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/8h
  #       startsin: 5.11
  #       casecomponent: Infra
  #       caseposneg: negative
  #       setup:
  #           1. Have a VM running on vsphere provider
  #       testSteps:
  #           1. Go to Compute -> infrastructure -> Virtual Machines -> Select Vm
  #           2. Create a snapshot for selected VM
  #           3. Go to VM reconfiguration and try to resize disk of the VM
  #       expectedResults:
  #           1. VM selected
  #           2. Snapshot created
  #           3. Resize is not allowed when snapshots are attached
  #   
  snapshot = InfraVm.Snapshot(name: fauxfactory.gen_alphanumeric(start: "snap_"), description: fauxfactory.gen_alphanumeric(start: "desc_"), memory: memory, parent_vm: full_vm)
  snapshot.create()
  request.addfinalizer(snapshot.delete)
  view = navigate_to(full_vm, "Reconfigure")
  row = next(view.disks_table.rows().map{|r| r})
  raise unless row.actions.widget.is_enabled
  raise unless !row[9].widget.is_displayed
end
def test_vm_reconfig_add_remove_network_adapters(request, adapters_type, full_vm)
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/6h
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: Infra
  #       tags: reconfigure
  #       testSteps:
  #           1. Go to Compute -> infrastructure -> Virtual Machines -> Select Vm
  #           2. Go to VM reconfiguration
  #           3. Click on Add Adapters -> select type , save and submit
  #           4. Check the changes in VM reconfiguration page
  #           5. Remove the Adapters
  #   
  orig_config = full_vm.configuration.copy()
  new_config = orig_config.copy()
  new_config.add_network_adapter("Network adapter #{orig_config.num_network_adapters + 1}", vlan: adapters_type)
  add_adapter_request = full_vm.reconfigure(new_config)
  add_adapter_request.wait_for_request(method: "ui")
  request.addfinalizer(add_adapter_request.remove_request)
  wait_for(lambda{|| full_vm.configuration.num_network_adapters == new_config.num_network_adapters}, timeout: 120, delay: 10, fail_func: full_vm.refresh_relationships, message: "confirm that network adapter was added")
  remove_adapter_request = full_vm.reconfigure(orig_config)
  remove_adapter_request.wait_for_request(method: "ui")
  request.addfinalizer(remove_adapter_request.remove_request)
  wait_for(lambda{|| full_vm.configuration.num_network_adapters == orig_config.num_network_adapters}, timeout: 120, delay: 10, fail_func: full_vm.refresh_relationships, message: "confirm that network adapter was added")
end
def test_reconfigure_vm_vmware_mem_multiple()
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/6h
  #       testtype: functional
  #       startsin: 5.6
  #       casecomponent: Infra
  #       tags: reconfigure
  #       setup:
  #           1. get new configured appliance ->add vmware provider
  #           2. provision 2 new vms
  #       testSteps:
  #           1. Hot increase
  #           2. Hot Decrease
  #           3. Cold Increase
  #           4. Cold Decrease
  #           5. Hot + Cold Increase
  #           6. Hot + Cold Decrease
  #       expectedResults:
  #           1. Action should succeed
  #           2. Action should fail
  #           3. Action should succeed
  #           4. Action should succeed
  #           5. Action should succeed
  #           6. Action should Error
  #   
  # pass
end
def test_reconfigure_vm_vmware_sockets_multiple()
  #  Test changing the cpu sockets of multiple vms at the same time.
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/6h
  #       testtype: functional
  #       startsin: 5.6
  #       casecomponent: Infra
  #       tags: reconfigure
  #       testSteps:
  #           1. get new configured appliance ->add vmware provider
  #           2. provision 2 new vms
  #           3. power off 1 vm -> select both vms
  #           4. configure-->reconfigure vm
  #           5. increase/decrease counts
  #           6. power on vm
  #           7. check changes
  #   
  # pass
end
def test_reconfigure_vm_vmware_cores_multiple()
  #  Test changing the cpu cores of multiple vms at the same time.
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/6h
  #       testtype: functional
  #       startsin: 5.6
  #       casecomponent: Infra
  #       tags: reconfigure
  #       setup:
  #           1. get new configured appliance ->add vmware provider
  #           2. provision 2 new vms
  #       testSteps:
  #           1. Hot increase
  #           2. Hot Decrease
  #           3. Cold Increase
  #           4. Cold Decrease
  #           5. Hot + Cold Increase
  #           6. Hot + Cold Decrease
  #       expectedResults:
  #           1. Action should fail
  #           2. Action should fail
  #           3. Action should succeed
  #           4. Action should succeed
  #           5. Action should fail
  #           6. Action should Error
  #   
  # pass
end
def test_reconfigure_add_disk_cold()
  #  Test adding 16th disk to test how a new scsi controller is handled.
  # 
  #   Bugzilla:
  #       1337310
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/6h
  #       testtype: functional
  #       startsin: 5.7
  #       casecomponent: Infra
  #       tags: reconfigure
  #       testSteps:
  #           1. get new configured appliance ->add vmware provider
  #           2. provision a new vm with 15 disks
  #           3. Add a new disk with CloudForms using the VM Reconfigure dialog
  #           4. Check new SCSI controller in vm
  #   
  # pass
end
def test_reconfigure_add_disk_cold_controller_sas()
  # 
  # 
  #   Bugzilla:
  #       1445874
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/6h
  #       testtype: functional
  #       startsin: 5.5
  #       casecomponent: Infra
  #       tags: reconfigure
  #       testSteps:
  #           1. get new configured appliance ->add vmware provider
  #           2. Add 15 disks to an existing VM with Controller type set to SAS
  #           3. look at the 16th Disk Controller Type
  #           4. Check controller type
  #           5. Should be SAS like exiting Controller
  #   
  # pass
end
def vm_reconfig_via_rest(appliance, config_type, vm_id, config_data)
  payload = {"action" => "create", "options" => {"src_ids" => [vm_id], "request_type" => "vm_reconfigure", "config_type" => config_data}, "auto_approve" => false}
  appliance.rest_api.collections.requests.action.create(None: payload)
  assert_response(appliance)
  return
end
def test_vm_disk_reconfig_via_rest(appliance, full_vm)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/10h
  #       setup:
  #           1. Add an infrastructure provider. Test for vcenter and rhv provider.
  #           2. Provision a VM.
  #       testSteps:
  #           1. Add a disk to the VM.
  #           2. Remove the disk from VM
  #       expectedResults:
  #           1. The disk must be added successfully.
  #           2. The disk must be removed successfully.
  #   Bugzilla:
  #       1618517
  #       1666593
  #       1620161
  #       1691635
  #       1692801
  #   
  vm_id = appliance.rest_api.collections.vms.get(name: full_vm.name).id
  initial_disks = full_vm.configuration.disks.map{|disk| disk.filename}
  add_data = [{"disk_size_in_mb" => 20, "sync" => true, "persistent" => true, "thin_provisioned" => false, "dependent" => true, "bootable" => false}]
  vm_reconfig_via_rest(appliance, "disk_add", vm_id, add_data)
  raise unless wait_for(lambda{|| full_vm.configuration.num_disks > initial_disks.size}, fail_func: full_vm.refresh_relationships, delay: 5, timeout: 200)
  if is_bool(!BZ(1691635).blocks && full_vm.provider.one_of(RHEVMProvider))
    disks_present = full_vm.configuration.disks.map{|disk| disk.filename}
    disk_added = Set.new(disks_present) - Set.new(initial_disks).to_a[0]
    delete_data = [{"disk_name" => disk_added, "delete_backing" => false}]
    vm_reconfig_via_rest(appliance, "disk_remove", vm_id, delete_data)
    begin
      wait_for(lambda{|| full_vm.configuration.num_disks == initial_disks.size}, fail_func: full_vm.refresh_relationships, delay: 5, timeout: 200)
    rescue TimedOutError
      raise "Number of disks expected was {expected}, found {actual}".format(expected: initial_disks.size, actual: full_vm.configuration.num_disks) unless false
    end
  end
end
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
  #           2.
  #           3. VM reconfigured, no errors.
  #   
  # pass
end
