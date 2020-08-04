require_relative 'datetime'
include Datetime
require_relative 'dateutil/relativedelta'
include Dateutil::Relativedelta
require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'wrapanapi'
include Wrapanapi
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/common/vm_views'
include Cfme::Common::Vm_views
require_relative 'cfme/control/explorer/policies'
include Cfme::Control::Explorer::Policies
require_relative 'cfme/infrastructure/host'
include Cfme::Infrastructure::Host
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/infrastructure/virtual_machines'
include Cfme::Infrastructure::Virtual_machines
require_relative 'cfme/provisioning'
include Cfme::Provisioning
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/net'
include Cfme::Utils::Net
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/virtual_machines'
include Cfme::Utils::Virtual_machines
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), pytest.mark.long_running, test_requirements.smartstate]
WINDOWS = {"id" => "Red Hat Enterprise Windows", "icon" => "windows", "os_type" => "windows"}
RPM_BASED = {"rhel" => {"id" => "Red Hat", "release-file" => "/etc/redhat-release", "os_type" => "redhat", "package" => "kernel", "install-command" => "", "package-number" => "rpm -qa | wc -l", "services-number" => "echo $((`ls -lL /etc/init.d | egrep -i -v \"readme|total\" | wc -l` + `ls -l /usr/lib/systemd/system | grep service | wc -l` + `ls -l /usr/lib/systemd/user | grep service | wc -l` + `ls -l /etc/systemd/system | grep -E \"*.service$\" | wc -l`))"}, "centos" => {"id" => "CentOS", "release-file" => "/etc/centos-release", "os_type" => "centos", "package" => "iso-codes", "install-command" => "yum install -y {}", "package-number" => "rpm -qa | wc -l", "services-number" => "echo $((`ls -lL /etc/init.d | egrep -i -v \"readme|total\" | wc -l` + `ls -l /usr/lib/systemd/system | grep service | grep -v network1 |   wc -l` + `ls -l /usr/lib/systemd/user | grep service | wc -l` + `ls -l /etc/systemd/system | grep -E \"*.service$\" | wc -l`))"}, "fedora" => {"id" => "Fedora", "release-file" => "/etc/fedora-release", "os_type" => "fedora", "package" => "iso-codes", "install-command" => "dnf install -y {}", "package-number" => "rpm -qa | wc -l", "services-number" => "echo $((`ls -lL /etc/init.d | egrep -i -v \"readme|total\" | wc -l` + `ls -l /usr/lib/systemd/system | grep service | grep -v network1 |   wc -l` + `ls -l /usr/lib/systemd/user | grep -E \"*.service$\" | wc -l` +  `ls -l /etc/systemd/system | grep -E \"*.service$\" | wc -l`))"}, "suse" => {"id" => "Suse", "release-file" => "/etc/SuSE-release", "os_type" => "suse", "package" => "iso-codes", "install-command" => "zypper install -y {}", "package-number" => "rpm -qa | wc -l", "services-number" => "echo $((`ls -lL /etc/init.d | egrep -i -v \"readme|total\" | wc -l` + `ls -l /usr/lib/systemd/system | grep service | wc -l` + `ls -l /usr/lib/systemd/user | grep service | wc -l`))"}}
DEB_BASED = {"ubuntu" => {"id" => "Ubuntu", "release-file" => "/etc/issue.net", "os_type" => "ubuntu", "package" => "iso-codes", "install-command" => "env DEBIAN_FRONTEND=noninteractive apt-get -y install {}", "package-number" => "dpkg --get-selections | wc -l", "services-number" => "echo $((`ls -alL /etc/init.d | egrep -iv \"readme|total|drwx\" | wc -l` + `ls -alL /etc/systemd/system/ | grep service | wc -l` + `ls -alL /usr/lib/systemd/user | grep service | wc -l`))"}, "debian" => {"id" => "Debian ", "release-file" => "/etc/issue.net", "os_type" => "debian", "package" => "iso-codes", "install-command" => "env DEBIAN_FRONTEND=noninteractive apt-get -y install {}", "package-number" => "dpkg --get-selections | wc -l", "services-number" => "echo $((`ls -alL /etc/init.d | egrep -iv \"readme|total|drwx\" | wc -l` + `ls -alL /etc/systemd/system/ | grep service | wc -l`))"}}
ssa_expect_files = ["/etc/hosts", "/etc/redhat-access-insights/machine-id", "/etc/passwd"]
def pytest_generate_tests(metafunc)
  argnames,argvalues,idlist = testgen.providers_by_class(metafunc, [CloudProvider, InfraProvider], required_fields: ["vm_analysis_new"])
  argnames.push("analysis_type")
  new_idlist = []
  new_argvalues = []
  for (index, argvalue_tuple) in enumerate(argvalues)
    args = {zip_p(argnames, argvalue_tuple).to_a}
    vma_data = args["provider"].data.vm_analysis_new
    if vma_data.include?("vms")
      vms = vma_data.vms
      for vm_analysis_key in vms
        new_idlist.push(("{}-{}").format(idlist[index], vm_analysis_key))
        new_argvalues.push([args["provider"], vm_analysis_key])
      end
    else
      logger.error("Provider %s does not have the correct keys in the yaml", args["provider"].name)
      next
    end
  end
  testgen.parametrize(metafunc, argnames, new_argvalues, ids: new_idlist, scope: "module")
end
def vm_analysis_provisioning_data(provider, analysis_type)
  vma_data = provider.data.vm_analysis_new
  provisioning_data = vma_data.provisioning
  if is_bool(!provider.is_a? CloudProvider)
    provisioning_data.setdefault("host", vma_data.provisioning.host)
    provisioning_data.setdefault("datastore", vma_data.provisioning.datastore)
    provisioning_data.setdefault("vlan", vma_data.provisioning.vlan)
  else
    provisioning_data.setdefault("instance_type", vma_data.provisioning.instance_type)
    provisioning_data.setdefault("availability_zone", vma_data.provisioning.availability_zone)
    provisioning_data.setdefault("security_group", vma_data.provisioning.security_group)
    provisioning_data.setdefault("cloud_network", vma_data.provisioning.cloud_network)
  end
  if is_bool(provider.one_of(RHEVMProvider))
    provider_data = provider.data
    if is_bool(!provisioning_data.include?("cluster") && !provider_data.provisioning.include?("cluster"))
      provisioning_data.cluster = provider_data.default_cluster
    else
      provisioning_data.cluster = provider_data.provisioning.cluster
    end
  end
  provisioning_data.update(vma_data.vms.get(analysis_type, {}))
  return provisioning_data
end
def set_hosts_credentials(appliance, request, provider)
  hosts = provider.hosts.all()
  host_collection = appliance.collections.hosts
  for host in hosts
    begin
      host_data, = provider.data["hosts"].select{|data| data["name"] == host.name}.map{|data| data}
    rescue TypeError
      pytest.skip("Multiple hosts with the same name found, only expecting one")
    end
    host_obj = host_collection.instantiate(name: host.name, provider: provider)
    update(host_obj, validate_credentials: true) {
      host_obj.credentials = {"default" => Host.Credential.from_config(host_data["credentials"]["default"])}
    }
  end
  _hosts_remove_creds = lambda do
    for host in hosts
      update(host_obj) {
        host_obj.credentials = {"default" => Host.Credential(principal: "", secret: "", verify_secret: "")}
      }
    end
  end
end
def set_agent_creds(appliance, request, provider)
  version = appliance.version.vstring
  docker_image_name = "simaishi/amazon-ssa:#{version}"
  unique_agent = fauxfactory.gen_alpha(length: 20, start: "test_ssa_agent-")
  agent_data = {"ems" => {"ems_amazon" => {"agent_coordinator" => {"agent_label" => unique_agent, "docker_image" => docker_image_name, "docker_registry" => "docker.io"}}}}
  if is_bool(BZ(1684203, forced_streams: ["5.10"]).blocks)
    new_ami = "RHEL-Atomic_7.6_HVM_GA-20190306-x86_64-0-Access2-GP2"
    agent_data["ems"]["ems_amazon"]["agent_coordinator"]["agent_ami_name"] = new_ami
  end
  appliance.update_advanced_settings(agent_data)
end
def local_setup_provider(request, setup_provider_modscope, provider, appliance)
  if is_bool(provider.one_of(VMwareProvider))
    vddk_url = conf.cfme_data.get("basic_info", {}).get("vddk_url", {}).get("v6_0", nil)
    if vddk_url === nil
      pytest.skip("Could not locate vddk url in cfme_data")
    else
      appliance.install_vddk(vddk_url: vddk_url)
    end
    request.addfinalizer(appliance.uninstall_vddk)
  end
  if is_bool(provider.one_of(EC2Provider))
    set_agent_creds(appliance, request, provider)
  end
  if is_bool(provider.one_of(InfraProvider))
    set_hosts_credentials(appliance, request, provider)
  end
  appliance.server.settings.enable_server_roles("automate", "smartproxy", "smartstate")
end
def enable_smartproxy_affinity(request, appliance, provider)
  if is_bool(provider.data.get("smartproxy_affinity", false))
    view = navigate_to(appliance.server.zone, "SmartProxyAffinity")
    changed = view.smartproxy_affinity.check_node(view.smartproxy_affinity.root_item.text)
    if is_bool(changed)
      view.save.click()
    end
    _disable_smartproxy_affinty = lambda do
      view = navigate_to(appliance.server.zone, "SmartProxyAffinity")
      view.smartproxy_affinity.uncheck_node(view.smartproxy_affinity.root_item.text)
      view.save.click()
    end
  end
end
def ssa_compliance_policy(appliance)
  policy = appliance.collections.policies.create(VMControlPolicy, fauxfactory.gen_alpha(15, start: "ssa_policy_"))
  policy.assign_events("VM Provision Complete")
  policy.assign_actions_to_event("VM Provision Complete", ["Initiate SmartState Analysis for VM"])
  yield(policy)
  policy.unassign_events("VM Provision Complete")
  policy.delete()
end
def ssa_compliance_profile(appliance, provider, ssa_compliance_policy)
  profile = appliance.collections.policy_profiles.create(fauxfactory.gen_alpha(25, start: "ssa_policy_profile_"), policies: [ssa_compliance_policy])
  provider.assign_policy_profiles(profile.description)
  yield
  provider.unassign_policy_profiles(profile.description)
  profile.delete()
end
def ssa_single_vm(request, local_setup_provider, enable_smartproxy_affinity, provider, vm_analysis_provisioning_data, appliance, analysis_type)
  #  Fixture to provision instance on the provider 
  _ssa_single_vm = lambda do
    template_name = vm_analysis_provisioning_data["image"]
    vm_name = "test-ssa-#{fauxfactory.gen_alphanumeric()}-#{analysis_type}"
    collection = provider.appliance.provider_based_collection(provider)
    vm = collection.instantiate(vm_name, provider, template_name: vm_analysis_provisioning_data.image)
    provision_data = vm_analysis_provisioning_data.copy()
    provision_data.delete("image")
    if is_bool(request._pyfuncitem.name.include?("test_ssa_compliance") || provider.one_of(RHEVMProvider))
      provisioning_data = {"catalog" => {"vm_name" => vm_name}, "environment" => {"automatic_placement" => true}}
      if is_bool(provider.one_of(RHEVMProvider))
        provisioning_data.update({"network" => {"vlan" => partial_match(provision_data["vlan"])}})
      end
      do_vm_provisioning(vm_name: vm_name, appliance: appliance, provider: provider, provisioning_data: provisioning_data, template_name: template_name, request: request, num_sec: 2500)
    else
      deploy_template(vm.provider.key, vm_name, template_name, timeout: 2500)
      vm.wait_to_appear(timeout: 900, load_details: false)
    end
    request.addfinalizer(lambda{|| vm.cleanup_on_provider()})
    if is_bool(provider.one_of(OpenStackProvider))
      public_net = provider.data["public_network"]
      vm.mgmt.assign_floating_ip(public_net)
    end
    logger.info("VM %s provisioned, waiting for IP address to be assigned", vm_name)
    vm.mgmt.ensure_state(VmState.RUNNING)
    begin
      connect_ip,_ = wait_for(find_pingable, func_args: [vm.mgmt], timeout: "10m", delay: 5, fail_condition: nil)
    rescue TimedOutError
      pytest.fail("Timed out waiting for pingable address on SSA VM")
    end
    if !["ntfs", "fat32"].include?(vm_analysis_provisioning_data["fs-type"])
      logger.info("Waiting for %s to be available via SSH", connect_ip)
      ssh_client = ssh.SSHClient(hostname: connect_ip, username: credentials[vm_analysis_provisioning_data.credentials]["username"], password: credentials[vm_analysis_provisioning_data.credentials]["password"], port: 22)
      wait_for(ssh_client.uptime, num_sec: 3600, handle_exception: true)
      vm.ssh = ssh_client
    end
    vm.system_type = detect_system_type(vm)
    logger.info("Detected system type: %s", vm.system_type)
    vm.image = vm_analysis_provisioning_data["image"]
    vm.connect_ip = connect_ip
    if provider.type == "rhevm"
      logger.info("Setting a relationship between VM and appliance")
      cfme_rel = InfraVm.CfmeRelationship(vm)
      Cfme::cfme_rel.set_relationship(appliance.server.name, appliance.server_id())
    end
    request.addfinalizer(lambda{|| is_bool(vm.getattr("ssh", nil)) ? vm.ssh.close() : nil})
    return vm
  end
  return _ssa_single_vm
end
def ssa_vm(ssa_single_vm, assign_profile_to_vm)
  # Single vm with assigned profile
  ssa_vm = ssa_single_vm.()
  assign_profile_to_vm.(ssa_vm)
  return ssa_vm
end
def vm_system_type(ssa_vm)
  return ssa_vm.system_type["os_type"]
end
def ssa_multiple_vms(ssa_single_vm, assign_profile_to_vm)
  # Create couple vms for test ssa multiple vms
  vms = []
  for item in 3.times
    vm = ssa_single_vm.()
    assign_profile_to_vm.(vm)
    vms.push(vm)
  end
  return vms
end
def assign_profile_to_vm(appliance, ssa_policy, request)
  #  Assign policy profile to vm
  _assign_profile_to_vm = lambda do |vm|
    profile = appliance.collections.policy_profiles.create(fauxfactory.gen_alpha(25, start: "ssa_policy_profile_"), policies: [ssa_policy])
    vm.assign_policy_profiles(profile.description)
    request.addfinalizer(profile.delete)
  end
  return _assign_profile_to_vm
end
def ssa_analysis_profile(appliance)
  collected_files = []
  for file in ssa_expect_files
    collected_files.push({"Name" => file, "Collect Contents?" => true})
  end
  analysis_profile_name = "custom"
  analysis_profiles_collection = appliance.collections.analysis_profiles
  analysis_profile_data = {"name" => analysis_profile_name, "description" => analysis_profile_name, "profile_type" => analysis_profiles_collection.VM_TYPE, "categories" => ["System", "Software", "Services", "User Accounts", "VM Configuration"], "files" => collected_files}
  analysis_profile = analysis_profiles_collection.instantiate(None: analysis_profile_data)
  if is_bool(analysis_profile.exists)
    analysis_profile.delete()
  end
  analysis_profile = analysis_profiles_collection.create(None: analysis_profile_data)
  yield(analysis_profile)
  if is_bool(analysis_profile.exists)
    analysis_profile.delete()
  end
end
def ssa_action(appliance, ssa_analysis_profile)
  action = appliance.collections.actions.create(fauxfactory.gen_alpha(15, start: "ssa_action_"), "Assign Profile to Analysis Task", {})
  yield(action)
  action.delete()
end
def ssa_policy(appliance, ssa_action)
  policy = appliance.collections.policies.create(VMControlPolicy, fauxfactory.gen_alpha(15, start: "ssa_policy_"))
  policy.assign_events("VM Analysis Start")
  policy.assign_actions_to_event("VM Analysis Start", ssa_action)
  yield(policy)
  policy.unassign_events("VM Analysis Start")
end
def detect_system_type(vm)
  if is_bool(vm.instance_variable_defined? :@ssh)
    system_release = safe_string((vm.ssh.run_command("cat /etc/os-release")).output)
    all_systems_dict = RPM_BASED.values().to_a + DEB_BASED.values().to_a
    for systems_type in all_systems_dict
      if system_release.downcase().include?(systems_type["id"].downcase())
        return systems_type
      end
    end
  else
    return WINDOWS
  end
end
def scanned_vm(ssa_vm)
  ssa_vm.smartstate_scan(wait_for_task_result: true)
end
def schedule_ssa(appliance, ssa_vm, wait_for_task_result: true)
  dt = Datetime::utcnow()
  delta_min = 5 - (dt.minute % 5)
  if delta_min < 3
    delta_min += 5
  end
  dt += relativedelta(minutes: delta_min)
  hour = dt.strftime("%-H")
  minute = dt.strftime("%-M")
  schedule_args = {"name" => fauxfactory.gen_alpha(25, start: "test_ssa_schedule_"), "description" => "Testing SSA via Schedule", "active" => true, "filter_level1" => "A single VM", "filter_level2" => ssa_vm.name, "run_type" => "Once", "run_every" => nil, "time_zone" => "(GMT+00:00) UTC", "start_hour" => hour, "start_minute" => minute}
  ss = appliance.collections.system_schedules.create(None: schedule_args)
  ss.enable()
  if is_bool(wait_for_task_result)
    task = appliance.collections.tasks.instantiate(name: "Scan from Vm #{ssa_vm.name}", tab: "AllTasks")
    task.wait_for_finished()
  end
  return ss
end
def compare_linux_vm_data(soft_assert)
  _compare_linux_vm_data = lambda do |ssa_vm|
    expected_users = ((ssa_vm.ssh.run_command("cat /etc/passwd | wc -l")).output).strip("
")
    expected_groups = ((ssa_vm.ssh.run_command("cat /etc/group | wc -l")).output).strip("
")
    expected_packages = ((ssa_vm.ssh.run_command(ssa_vm.system_type["package-number"])).output).strip("
")
    expected_services = ((ssa_vm.ssh.run_command(ssa_vm.system_type["services-number"])).output).strip("
")
    view = navigate_to(ssa_vm, "Details")
    current_users = view.entities.summary("Security").get_text_of("Users")
    current_groups = view.entities.summary("Security").get_text_of("Groups")
    current_packages = view.entities.summary("Configuration").get_text_of("Packages")
    current_services = view.entities.summary("Configuration").get_text_of("Init Processes")
    soft_assert(current_users == expected_users, "users: '#{current_users}' != '#{expected_users}'")
    soft_assert(current_groups == expected_groups, "groups: '#{current_groups}' != '#{expected_groups}'")
    soft_assert(current_packages == expected_packages, "packages: '#{current_packages}' != '#{expected_packages}'")
    soft_assert(current_services == expected_services, "services: '#{current_services}' != '#{expected_services}'")
  end
  return _compare_linux_vm_data
end
def compare_windows_vm_data(soft_assert)
  _compare_windows_vm_data = lambda do |ssa_vm|
    # Make sure windows-specific data is not empty
    view = navigate_to(ssa_vm, "Details")
    current_patches = view.entities.summary("Security").get_text_of("Patches")
    current_applications = view.entities.summary("Configuration").get_text_of("Applications")
    current_win32_services = view.entities.summary("Configuration").get_text_of("Win32 Services")
    current_kernel_drivers = view.entities.summary("Configuration").get_text_of("Kernel Drivers")
    current_fs_drivers = view.entities.summary("Configuration").get_text_of("File System Drivers")
    soft_assert(current_patches != "0", "patches: '#{current_patches}' != '0'")
    soft_assert(current_applications != "0", "applications: '{}' != '0'".format(current_applications))
    soft_assert(current_win32_services != "0", "win32 services: '#{current_win32_services}' != '0'")
    soft_assert(current_kernel_drivers != "0", "kernel drivers: '#{current_kernel_drivers}' != '0'")
    soft_assert(current_fs_drivers != "0", "fs drivers: '#{current_fs_drivers}' != '0'")
  end
  return _compare_windows_vm_data
end
def test_ssa_template(local_setup_provider, provider, soft_assert, vm_analysis_provisioning_data, appliance, ssa_vm, compare_windows_vm_data)
  #  Tests SSA can be performed on a template
  # 
  #   Metadata:
  #       test_flag: vm_analysis
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       tags: smartstate
  #   
  template_name = vm_analysis_provisioning_data["image"]
  template_collection = appliance.provider_based_collection(provider: provider, coll_type: "templates")
  template = template_collection.instantiate(template_name, provider)
  template.smartstate_scan(wait_for_task_result: true)
  quadicon_os_icon = template.find_quadicon().data["os"]
  view = navigate_to(template, "Details")
  details_os_icon = view.entities.summary("Properties").get_text_of("Operating System")
  logger.info("Icons: #{details_os_icon}, #{quadicon_os_icon}")
  c_users = view.entities.summary("Security").get_text_of("Users")
  c_groups = view.entities.summary("Security").get_text_of("Groups")
  c_packages = 0
  if !["ntfs", "fat32"].include?(vm_analysis_provisioning_data["fs-type"])
    c_packages = view.entities.summary("Configuration").get_text_of("Packages")
  end
  logger.info("SSA shows {} users, {} groups and {} packages".format(c_users, c_groups, c_packages))
  if !["ntfs", "fat32"].include?(vm_analysis_provisioning_data["fs-type"])
    soft_assert.(c_users != "0", "users: '#{c_users}' != '0'")
    soft_assert.(c_groups != "0", "groups: '#{c_groups}' != '0'")
    soft_assert.(c_packages != "0", "packages: '#{c_packages}' != '0'")
  else
    compare_windows_vm_data.(ssa_vm)
  end
end
def test_ssa_compliance(local_setup_provider, ssa_compliance_profile, ssa_vm, soft_assert, appliance, vm_system_type, compare_linux_vm_data, compare_windows_vm_data)
  #  Tests SSA can be performed and returns sane results
  # 
  #   Metadata:
  #       test_flag: vm_analysis
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       tags: smartstate
  #   
  ssa_vm.smartstate_scan(wait_for_task_result: true)
  task = appliance.collections.tasks.instantiate(name: "Scan from Vm #{ssa_vm.name}", tab: "AllTasks")
  task.wait_for_finished()
  quadicon_os_icon = ssa_vm.find_quadicon().data["os"]
  view = navigate_to(ssa_vm, "Details")
  details_os_icon = view.entities.summary("Properties").get_text_of("Operating System")
  logger.info("Icons: %s, %s", details_os_icon, quadicon_os_icon)
  c_lastanalyzed = ssa_vm.last_analysed
  soft_assert.(c_lastanalyzed != "Never", "Last Analyzed is set to Never")
  soft_assert.(details_os_icon.downcase().include?(vm_system_type), "details icon: '#{vm_system_type}' not in '#{details_os_icon}'")
  soft_assert.(quadicon_os_icon.downcase().include?(vm_system_type), "quad icon: '#{vm_system_type}' not in '#{quadicon_os_icon}'")
  if ssa_vm.system_type != WINDOWS
    compare_linux_vm_data.(ssa_vm)
  else
    compare_windows_vm_data.(ssa_vm)
  end
end
def test_ssa_schedule(ssa_vm, schedule_ssa, soft_assert, vm_system_type, compare_linux_vm_data, compare_windows_vm_data)
  #  Tests SSA can be performed and returns sane results
  # 
  #   Metadata:
  #       test_flag: vm_analysis
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: critical
  #       initialEstimate: 1/2h
  #       tags: smartstate
  #   
  quadicon_os_icon = ssa_vm.find_quadicon().data["os"]
  view = navigate_to(ssa_vm, "Details")
  details_os_icon = view.entities.summary("Properties").get_text_of("Operating System")
  logger.info("Icons: %s, %s", details_os_icon, quadicon_os_icon)
  c_lastanalyzed = ssa_vm.last_analysed
  soft_assert.(c_lastanalyzed != "Never", "Last Analyzed is set to Never")
  os_type = (vm_system_type != "redhat") ? vm_system_type : "red hat"
  soft_assert.(details_os_icon.downcase().include?(os_type), "details icon: '#{vm_system_type}' not in '#{details_os_icon}'")
  soft_assert.(quadicon_os_icon.downcase().include?(vm_system_type), "quad icon: '#{vm_system_type}' not in '#{quadicon_os_icon}'")
  if ssa_vm.system_type != WINDOWS
    compare_linux_vm_data.(ssa_vm)
  else
    compare_windows_vm_data.(ssa_vm)
  end
end
def test_ssa_vm(ssa_vm, scanned_vm, soft_assert, vm_system_type, compare_linux_vm_data, compare_windows_vm_data)
  #  Tests SSA can be performed and returns sane results
  # 
  #   Metadata:
  #       test_flag: vm_analysis
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       tags: smartstate
  #   
  quadicon_os_icon = ssa_vm.find_quadicon().data["os"]
  view = navigate_to(ssa_vm, "Details")
  details_os_icon = view.entities.summary("Properties").get_text_of("Operating System")
  logger.info("Icons: %s, %s", details_os_icon, quadicon_os_icon)
  c_lastanalyzed = ssa_vm.last_analysed
  soft_assert.(c_lastanalyzed != "Never", "Last Analyzed is set to Never")
  os_type = (vm_system_type != "redhat") ? vm_system_type : "red hat"
  soft_assert.(details_os_icon.downcase().include?(os_type), "details icon: '#{os_type}' not in '#{details_os_icon}'")
  soft_assert.(quadicon_os_icon.downcase().include?(vm_system_type), "quad icon: '#{vm_system_type}' not in '#{quadicon_os_icon}'")
  if ssa_vm.system_type != WINDOWS
    compare_linux_vm_data.(ssa_vm)
  else
    compare_windows_vm_data.(ssa_vm)
  end
end
def test_ssa_users(ssa_vm)
  #  Tests SSA fetches correct results for users list
  # 
  #   Metadata:
  #       test_flag: vm_analysis
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       tags: smartstate
  #   
  username = fauxfactory.gen_alphanumeric()
  expected_users = nil
  if ssa_vm.system_type != WINDOWS
    ssa_vm.ssh.close()
    ssa_vm.ssh.run_command("userdel {0} || useradd {0}".format(username))
    expected_users = ((ssa_vm.ssh.run_command("cat /etc/passwd | wc -l")).output).strip("
")
  end
  ssa_vm.smartstate_scan(wait_for_task_result: true)
  view = navigate_to(ssa_vm, "Details")
  current_users = view.entities.summary("Security").get_text_of("Users")
  if ssa_vm.system_type != WINDOWS
    raise unless current_users == expected_users
  end
  details_property_view = ssa_vm.open_details(["Security", "Users"])
  if ssa_vm.system_type != WINDOWS
    begin
      details_property_view.paginator.find_row_on_pages(details_property_view.table, name: username)
    rescue NoSuchElementException
      pytest.fail("User #{username} was not found in details table after SSA run")
    end
  end
end
def test_ssa_groups(ssa_vm)
  #  Tests SSA fetches correct results for groups
  # 
  #   Metadata:
  #       test_flag: vm_analysis
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       tags: smartstate
  #   
  group = fauxfactory.gen_alphanumeric()
  expected_group = nil
  if ssa_vm.system_type != WINDOWS
    ssa_vm.ssh.close()
    ssa_vm.ssh.run_command("groupdel {0} || groupadd {0}".format(group))
    expected_group = ((ssa_vm.ssh.run_command("cat /etc/group | wc -l")).output).strip("
")
  end
  ssa_vm.smartstate_scan(wait_for_task_result: true)
  view = navigate_to(ssa_vm, "Details")
  current_group = view.entities.summary("Security").get_text_of("Groups")
  if ssa_vm.system_type != WINDOWS
    raise unless current_group == expected_group
  end
  details_property_view = ssa_vm.open_details(["Security", "Groups"])
  if ssa_vm.system_type != WINDOWS
    begin
      details_property_view.paginator.find_row_on_pages(details_property_view.table, name: group)
    rescue NoSuchElementException
      pytest.fail("Group #{group} was not found in details table after SSA run")
    end
  end
end
def test_ssa_packages(ssa_vm)
  #  Tests SSA fetches correct results for packages
  # 
  #   Metadata:
  #       test_flag: vm_analysis
  # 
  #   Bugzilla:
  #       1551273
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       tags: smartstate
  #   
  if ssa_vm.system_type == WINDOWS
    pytest.skip("Windows has no packages")
  end
  if !ssa_vm.system_type.keys().to_a.include?("package")
    pytest.skip("Don't know how to update packages for #{ssa_vm.system_type}")
  end
  package_name = ssa_vm.system_type["package"]
  package_command = ssa_vm.system_type["install-command"]
  package_number_command = ssa_vm.system_type["package-number"]
  cmd = package_command.format(package_name)
  ssa_vm.ssh.close()
  output = ssa_vm.ssh.run_command(cmd.format(package_name)).output
  logger.info("%s output:
%s", cmd, output)
  expected = ssa_vm.ssh.run_command(package_number_command).output.strip("
")
  view = navigate_to(ssa_vm, "Details")
  current = view.entities.summary("Configuration").get_text_of("Packages")
  raise unless current == expected
  details_property_view = ssa_vm.open_details(["Configuration", "Packages"])
  begin
    details_property_view.paginator.find_row_on_pages(details_property_view.table, name: package_name)
  rescue NoSuchElementException
    pytest.fail("Package #{package_name} was not found in details table after SSA run")
  end
end
def test_ssa_files(ssa_vm)
  # Tests that instances can be scanned for specific file.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       tags: smartstate
  #   
  if ssa_vm.system_type == WINDOWS
    pytest.skip("We cannot verify Windows files yet")
  end
  view = navigate_to(ssa_vm, "Details")
  current = view.entities.summary("Configuration").get_text_of("Files")
  raise "No files were scanned" unless current != "0"
  details_property_view = ssa_vm.open_details(["Configuration", "Files"])
  begin
    details_property_view.paginator.find_row_on_pages(details_property_view.table, name: ssa_expect_files[0])
  rescue NoSuchElementException
    pytest.fail("File {} was not found in details table after SSA run".format(ssa_expect_files[0]))
  end
end
def test_drift_analysis(request, ssa_vm, soft_assert, appliance)
  #  Tests drift analysis is correct
  # 
  #   Metadata:
  #       test_flag: vm_analysis
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       tags: smartstate
  #   
  ssa_vm.load_details()
  drift_num_orig = 0
  view = navigate_to(ssa_vm, "Details")
  drift_orig = view.entities.summary("Relationships").get_text_of("Drift History")
  if drift_orig != "None"
    drift_num_orig = drift_orig.to_i
  end
  ssa_vm.smartstate_scan(wait_for_task_result: true)
  view = navigate_to(ssa_vm, "Details")
  wait_for(lambda{|| view.entities.summary("Relationships").get_text_of("Drift History") == (drift_num_orig + 1).to_s}, delay: 20, num_sec: 360, message: "Waiting for Drift History count to increase", fail_func: view.toolbar.reload.click)
  drift_new = view.entities.summary("Relationships").get_text_of("Drift History").to_i
  added_tag = appliance.collections.categories.instantiate(display_name: "Department").collections.tags.instantiate(display_name: "Accounting")
  ssa_vm.add_tag(added_tag)
  request.addfinalizer(lambda{|| ssa_vm.remove_tag(added_tag)})
  ssa_vm.smartstate_scan(wait_for_task_result: true)
  view = navigate_to(ssa_vm, "Details")
  wait_for(lambda{|| view.entities.summary("Relationships").get_text_of("Drift History") == (drift_new + 1).to_s}, delay: 20, num_sec: 360, message: "Waiting for Drift History count to increase", fail_func: view.toolbar.reload.click)
  soft_assert.(ssa_vm.equal_drift_results("#{added_tag.category.display_name} (1)", "My Company Tags", 0, 1), "Drift analysis results are equal when they shouldn't be")
  drift_analysis_view = appliance.browser.create_view(DriftAnalysis)
  drift_analysis_view.toolbar.same_values_attributes.click()
  soft_assert.(!drift_analysis_view.drift_analysis.check_section_attribute_availability("#{added_tag.category.display_name}"), "#{added_tag.display_name} row should be hidden, but not")
  drift_analysis_view.toolbar.different_values_attributes.click()
  soft_assert.(drift_analysis_view.drift_analysis.check_section_attribute_availability("#{added_tag.category.display_name} (1)"), "#{added_tag.display_name} row should be visible, but not")
end
def test_ssa_multiple_vms(ssa_multiple_vms, soft_assert, appliance, compare_linux_vm_data, compare_windows_vm_data)
  #  Tests SSA run while selecting multiple vms at once
  # 
  #   Metadata:
  #       test_flag: vm_analysis
  # 
  #   Bugzilla:
  #       1551273
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       tags: smartstate
  #   
  view = navigate_to(ssa_multiple_vms[0], "AllForProvider")
  view.toolbar.view_selector.select("List View")
  view.paginator.set_items_per_page(1000)
  for ssa_vm in ssa_multiple_vms
    view.entities.get_entity(name: ssa_vm.name, surf_pages: true).ensure_checked()
  end
  view.toolbar.configuration.item_select("Perform SmartState Analysis", handle_alert: true)
  view.flash.assert_message("Analysis initiated for 3 VMs and Instances from the CFME Database")
  for ssa_vm in ssa_multiple_vms
    task = appliance.collections.tasks.instantiate(name: "Scan from Vm #{ssa_vm.name}", tab: "AllTasks")
    task.wait_for_finished()
    current_lastanalyzed = ssa_vm.last_analysed
    soft_assert.(current_lastanalyzed != "Never", "Last Analyzed is set to Never")
    if ssa_vm.system_type != WINDOWS
      compare_linux_vm_data.(method(:ssa_vm))
    else
      compare_windows_vm_data.(method(:ssa_vm))
    end
  end
end
