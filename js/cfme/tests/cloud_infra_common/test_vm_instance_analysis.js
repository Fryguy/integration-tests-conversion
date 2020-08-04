function set_hosts_credentials(appliance, request, provider) {
  let hosts = provider.hosts.all();
  let host_collection = appliance.collections.hosts;

  for (let host in hosts) {
    try {
      let [host_data] = provider.data.hosts.select(data => data.name == host.name).map(data => (
        data
      ))
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof TypeError) {
        pytest.skip("Multiple hosts with the same name found, only expecting one")
      } else {
        throw $EXCEPTION
      }
    };

    let host_obj = host_collection.instantiate({
      name: host.name,
      provider
    });

    update(host_obj, {validate_credentials: true}, () => (
      host_obj.credentials = {default: Host.Credential.from_config(host_data.credentials.default)}
    ))
  };

  let _hosts_remove_creds = () => {
    for (let host in hosts) {
      update(host_obj, () => (
        host_obj.credentials = {default: Host.Credential({
          principal: "",
          secret: "",
          verify_secret: ""
        })}
      ))
    }
  }
};

function set_agent_creds(appliance, request, provider) {
  let version = appliance.version.vstring;
  let docker_image_name = `simaishi/amazon-ssa:${version}`;

  let unique_agent = fauxfactory.gen_alpha({
    length: 20,
    start: "test_ssa_agent-"
  });

  let agent_data = {ems: {ems_amazon: {agent_coordinator: {
    agent_label: unique_agent,
    docker_image: docker_image_name,
    docker_registry: "docker.io"
  }}}};

  if (is_bool(BZ(1684203, {forced_streams: ["5.10"]}).blocks)) {
    let new_ami = "RHEL-Atomic_7.6_HVM_GA-20190306-x86_64-0-Access2-GP2";
    agent_data.ems.ems_amazon.agent_coordinator.agent_ami_name = new_ami
  };

  appliance.update_advanced_settings(agent_data)
};

function local_setup_provider(request, setup_provider_modscope, provider, appliance) {
  if (is_bool(provider.one_of(VMwareProvider))) {
    let vddk_url = conf.cfme_data.get("basic_info", {}).get(
      "vddk_url",
      {}
    ).get("v6_0", null);

    if (vddk_url === null) {
      pytest.skip("Could not locate vddk url in cfme_data")
    } else {
      appliance.install_vddk({vddk_url})
    };

    request.addfinalizer(appliance.uninstall_vddk)
  };

  if (is_bool(provider.one_of(EC2Provider))) {
    set_agent_creds(appliance, request, provider)
  };

  if (is_bool(provider.one_of(InfraProvider))) {
    set_hosts_credentials(appliance, request, provider)
  };

  appliance.server.settings.enable_server_roles(
    "automate",
    "smartproxy",
    "smartstate"
  )
};

function enable_smartproxy_affinity(request, appliance, provider) {
  if (is_bool(provider.data.get("smartproxy_affinity", false))) {
    let view = navigate_to(appliance.server.zone, "SmartProxyAffinity");
    let changed = view.smartproxy_affinity.check_node(view.smartproxy_affinity.root_item.text);
    if (is_bool(changed)) view.save.click();

    let _disable_smartproxy_affinty = () => {
      view = navigate_to(appliance.server.zone, "SmartProxyAffinity");
      view.smartproxy_affinity.uncheck_node(view.smartproxy_affinity.root_item.text);
      return view.save.click()
    }
  }
};

function ssa_compliance_policy(appliance) {
  let policy = appliance.collections.policies.create(
    VMControlPolicy,
    fauxfactory.gen_alpha(15, {start: "ssa_policy_"})
  );

  policy.assign_events("VM Provision Complete");

  policy.assign_actions_to_event(
    "VM Provision Complete",
    ["Initiate SmartState Analysis for VM"]
  );

  yield(policy);
  policy.unassign_events("VM Provision Complete");
  policy.delete()
};

function ssa_compliance_profile(appliance, provider, ssa_compliance_policy) {
  let profile = appliance.collections.policy_profiles.create(
    fauxfactory.gen_alpha(25, {start: "ssa_policy_profile_"}),
    {policies: [ssa_compliance_policy]}
  );

  provider.assign_policy_profiles(profile.description);
  yield;
  provider.unassign_policy_profiles(profile.description);
  profile.delete()
};

function ssa_single_vm(request, local_setup_provider, enable_smartproxy_affinity, provider, vm_analysis_provisioning_data, appliance, analysis_type) {
  //  Fixture to provision instance on the provider 
  let _ssa_single_vm = () => {
    let template_name = vm_analysis_provisioning_data.image;
    let vm_name = `test-ssa-${fauxfactory.gen_alphanumeric()}-${analysis_type}`;
    let collection = provider.appliance.provider_based_collection(provider);

    let vm = collection.instantiate(
      vm_name,
      provider,
      {template_name: vm_analysis_provisioning_data.image}
    );

    let provision_data = vm_analysis_provisioning_data.copy();
    provision_data.delete("image");

    if (is_bool(request._pyfuncitem.name.include("test_ssa_compliance") || provider.one_of(RHEVMProvider))) {
      let provisioning_data = {
        catalog: {vm_name: vm_name},
        environment: {automatic_placement: true}
      };

      if (is_bool(provider.one_of(RHEVMProvider))) {
        provisioning_data.update({network: {vlan: partial_match(provision_data.vlan)}})
      };

      do_vm_provisioning({
        vm_name,
        appliance,
        provider,
        provisioning_data,
        template_name,
        request,
        num_sec: 2500
      })
    } else {
      deploy_template(
        vm.provider.key,
        vm_name,
        template_name,
        {timeout: 2500}
      );

      vm.wait_to_appear({timeout: 900, load_details: false})
    };

    request.addfinalizer(() => vm.cleanup_on_provider());

    if (is_bool(provider.one_of(OpenStackProvider))) {
      let public_net = provider.data.public_network;
      vm.mgmt.assign_floating_ip(public_net)
    };

    logger.info(
      "VM %s provisioned, waiting for IP address to be assigned",
      vm_name
    );

    vm.mgmt.ensure_state(VmState.RUNNING);

    try {
      let [connect_ip, _] = wait_for(find_pingable, {
        func_args: [vm.mgmt],
        timeout: "10m",
        delay: 5,
        fail_condition: null
      })
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof TimedOutError) {
        pytest.fail("Timed out waiting for pingable address on SSA VM")
      } else {
        throw $EXCEPTION
      }
    };

    if (!["ntfs", "fat32"].include(vm_analysis_provisioning_data["fs-type"])) {
      logger.info("Waiting for %s to be available via SSH", connect_ip);

      let ssh_client = ssh.SSHClient({
        hostname: connect_ip,
        username: credentials[vm_analysis_provisioning_data.credentials].username,
        password: credentials[vm_analysis_provisioning_data.credentials].password,
        port: 22
      });

      wait_for(ssh_client.uptime, {num_sec: 3600, handle_exception: true});
      vm.ssh = ssh_client
    };

    vm.system_type = detect_system_type(vm);
    logger.info("Detected system type: %s", vm.system_type);
    vm.image = vm_analysis_provisioning_data.image;
    vm.connect_ip = connect_ip;

    if (provider.type == "rhevm") {
      logger.info("Setting a relationship between VM and appliance");
      let cfme_rel = InfraVm.CfmeRelationship(vm);

      Cfme.cfme_rel.set_relationship(
        appliance.server.name,
        appliance.server_id()
      )
    };

    request.addfinalizer(() => (
      (is_bool(vm.getattr("ssh", null)) ? vm.ssh.close() : null)
    ));

    return vm
  };

  return _ssa_single_vm
};

function ssa_vm(ssa_single_vm, assign_profile_to_vm) {
  // Single vm with assigned profile
  let ssa_vm = ssa_single_vm.call();
  assign_profile_to_vm.call(ssa_vm);
  return ssa_vm
};

function vm_system_type(ssa_vm) {
  return ssa_vm.system_type.os_type
};

function ssa_multiple_vms(ssa_single_vm, assign_profile_to_vm) {
  // Create couple vms for test ssa multiple vms
  let vms = [];

  for (let item in (3).times) {
    let vm = ssa_single_vm.call();
    assign_profile_to_vm.call(vm);
    vms.push(vm)
  };

  return vms
};

function assign_profile_to_vm(appliance, ssa_policy, request) {
  //  Assign policy profile to vm
  let _assign_profile_to_vm = (vm) => {
    let profile = appliance.collections.policy_profiles.create(
      fauxfactory.gen_alpha(25, {start: "ssa_policy_profile_"}),
      {policies: [ssa_policy]}
    );

    vm.assign_policy_profiles(profile.description);
    return request.addfinalizer(profile.delete)
  };

  return _assign_profile_to_vm
};

function ssa_analysis_profile(appliance) {
  let collected_files = [];

  for (let file in ssa_expect_files) {
    collected_files.push({Name: file, "Collect Contents?": true})
  };

  let analysis_profile_name = "custom";
  let analysis_profiles_collection = appliance.collections.analysis_profiles;

  let analysis_profile_data = {
    name: analysis_profile_name,
    description: analysis_profile_name,
    profile_type: analysis_profiles_collection.VM_TYPE,

    categories: [
      "System",
      "Software",
      "Services",
      "User Accounts",
      "VM Configuration"
    ],

    files: collected_files
  };

  let analysis_profile = analysis_profiles_collection.instantiate({None: analysis_profile_data});
  if (is_bool(analysis_profile.exists)) analysis_profile.delete();
  analysis_profile = analysis_profiles_collection.create({None: analysis_profile_data});
  yield(analysis_profile);
  if (is_bool(analysis_profile.exists)) analysis_profile.delete()
};

function ssa_action(appliance, ssa_analysis_profile) {
  let action = appliance.collections.actions.create(
    fauxfactory.gen_alpha(15, {start: "ssa_action_"}),
    "Assign Profile to Analysis Task",
    {}
  );

  yield(action);
  action.delete()
};

function ssa_policy(appliance, ssa_action) {
  let policy = appliance.collections.policies.create(
    VMControlPolicy,
    fauxfactory.gen_alpha(15, {start: "ssa_policy_"})
  );

  policy.assign_events("VM Analysis Start");
  policy.assign_actions_to_event("VM Analysis Start", ssa_action);
  yield(policy);
  policy.unassign_events("VM Analysis Start")
};

function detect_system_type(vm) {
  if (is_bool(vm.instance_variable_defined("@ssh"))) {
    let system_release = safe_string((vm.ssh.run_command("cat /etc/os-release")).output);
    let all_systems_dict = RPM_BASED.values().to_a + DEB_BASED.values().to_a;

    for (let systems_type in all_systems_dict) {
      if (system_release.downcase().include(systems_type.id.downcase())) {
        return systems_type
      }
    }
  } else {
    return WINDOWS
  }
};

function scanned_vm(ssa_vm) {
  ssa_vm.smartstate_scan({wait_for_task_result: true})
};

function schedule_ssa(appliance, ssa_vm, { wait_for_task_result = true }) {
  let dt = Datetime.utcnow();
  let delta_min = 5 - (dt.minute % 5);
  if (delta_min < 3) delta_min += 5;
  dt += relativedelta({minutes: delta_min});
  let hour = dt.strftime("%-H");
  let minute = dt.strftime("%-M");

  let schedule_args = {
    name: fauxfactory.gen_alpha(25, {start: "test_ssa_schedule_"}),
    description: "Testing SSA via Schedule",
    active: true,
    filter_level1: "A single VM",
    filter_level2: ssa_vm.name,
    run_type: "Once",
    run_every: null,
    time_zone: "(GMT+00:00) UTC",
    start_hour: hour,
    start_minute: minute
  };

  let ss = appliance.collections.system_schedules.create({None: schedule_args});
  ss.enable();

  if (is_bool(wait_for_task_result)) {
    let task = appliance.collections.tasks.instantiate({
      name: `Scan from Vm ${ssa_vm.name}`,
      tab: "AllTasks"
    });

    task.wait_for_finished()
  };

  return ss
};

function compare_linux_vm_data(soft_assert) {
  let _compare_linux_vm_data = (ssa_vm) => {
    let expected_users = ((ssa_vm.ssh.run_command("cat /etc/passwd | wc -l")).output).strip("\n");
    let expected_groups = ((ssa_vm.ssh.run_command("cat /etc/group | wc -l")).output).strip("\n");
    let expected_packages = ((ssa_vm.ssh.run_command(ssa_vm.system_type["package-number"])).output).strip("\n");
    let expected_services = ((ssa_vm.ssh.run_command(ssa_vm.system_type["services-number"])).output).strip("\n");
    let view = navigate_to(ssa_vm, "Details");
    let current_users = view.entities.summary("Security").get_text_of("Users");
    let current_groups = view.entities.summary("Security").get_text_of("Groups");
    let current_packages = view.entities.summary("Configuration").get_text_of("Packages");
    let current_services = view.entities.summary("Configuration").get_text_of("Init Processes");

    soft_assert(
      current_users == expected_users,
      `users: '${current_users}' != '${expected_users}'`
    );

    soft_assert(
      current_groups == expected_groups,
      `groups: '${current_groups}' != '${expected_groups}'`
    );

    soft_assert(
      current_packages == expected_packages,
      `packages: '${current_packages}' != '${expected_packages}'`
    );

    return soft_assert(
      current_services == expected_services,
      `services: '${current_services}' != '${expected_services}'`
    )
  };

  return _compare_linux_vm_data
};

function compare_windows_vm_data(soft_assert) {
  let _compare_windows_vm_data = (ssa_vm) => {
    // Make sure windows-specific data is not empty
    let view = navigate_to(ssa_vm, "Details");
    let current_patches = view.entities.summary("Security").get_text_of("Patches");
    let current_applications = view.entities.summary("Configuration").get_text_of("Applications");
    let current_win32_services = view.entities.summary("Configuration").get_text_of("Win32 Services");
    let current_kernel_drivers = view.entities.summary("Configuration").get_text_of("Kernel Drivers");
    let current_fs_drivers = view.entities.summary("Configuration").get_text_of("File System Drivers");

    soft_assert(
      current_patches != "0",
      `patches: '${current_patches}' != '0'`
    );

    soft_assert(
      current_applications != "0",
      "applications: '{}' != '0'".format(current_applications)
    );

    soft_assert(
      current_win32_services != "0",
      `win32 services: '${current_win32_services}' != '0'`
    );

    soft_assert(
      current_kernel_drivers != "0",
      `kernel drivers: '${current_kernel_drivers}' != '0'`
    );

    return soft_assert(
      current_fs_drivers != "0",
      `fs drivers: '${current_fs_drivers}' != '0'`
    )
  };

  return _compare_windows_vm_data
};

function test_ssa_template(local_setup_provider, provider, soft_assert, vm_analysis_provisioning_data, appliance, ssa_vm, compare_windows_vm_data) {
  //  Tests SSA can be performed on a template
  // 
  //   Metadata:
  //       test_flag: vm_analysis
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       tags: smartstate
  //   
  let template_name = vm_analysis_provisioning_data.image;

  let template_collection = appliance.provider_based_collection({
    provider,
    coll_type: "templates"
  });

  let template = template_collection.instantiate(
    template_name,
    provider
  );

  template.smartstate_scan({wait_for_task_result: true});
  let quadicon_os_icon = template.find_quadicon().data.os;
  let view = navigate_to(template, "Details");
  let details_os_icon = view.entities.summary("Properties").get_text_of("Operating System");
  logger.info(`Icons: ${details_os_icon}, ${quadicon_os_icon}`);
  let c_users = view.entities.summary("Security").get_text_of("Users");
  let c_groups = view.entities.summary("Security").get_text_of("Groups");
  let c_packages = 0;

  if (!["ntfs", "fat32"].include(vm_analysis_provisioning_data["fs-type"])) {
    c_packages = view.entities.summary("Configuration").get_text_of("Packages")
  };

  logger.info("SSA shows {} users, {} groups and {} packages".format(
    c_users,
    c_groups,
    c_packages
  ));

  if (!["ntfs", "fat32"].include(vm_analysis_provisioning_data["fs-type"])) {
    soft_assert.call(c_users != "0", `users: '${c_users}' != '0'`);
    soft_assert.call(c_groups != "0", `groups: '${c_groups}' != '0'`);

    soft_assert.call(
      c_packages != "0",
      `packages: '${c_packages}' != '0'`
    )
  } else {
    compare_windows_vm_data.call(ssa_vm)
  }
};

function test_ssa_compliance(local_setup_provider, ssa_compliance_profile, ssa_vm, soft_assert, appliance, vm_system_type, compare_linux_vm_data, compare_windows_vm_data) {
  //  Tests SSA can be performed and returns sane results
  // 
  //   Metadata:
  //       test_flag: vm_analysis
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       tags: smartstate
  //   
  ssa_vm.smartstate_scan({wait_for_task_result: true});

  let task = appliance.collections.tasks.instantiate({
    name: `Scan from Vm ${ssa_vm.name}`,
    tab: "AllTasks"
  });

  task.wait_for_finished();
  let quadicon_os_icon = ssa_vm.find_quadicon().data.os;
  let view = navigate_to(ssa_vm, "Details");
  let details_os_icon = view.entities.summary("Properties").get_text_of("Operating System");
  logger.info("Icons: %s, %s", details_os_icon, quadicon_os_icon);
  let c_lastanalyzed = ssa_vm.last_analysed;

  soft_assert.call(
    c_lastanalyzed != "Never",
    "Last Analyzed is set to Never"
  );

  soft_assert.call(
    details_os_icon.downcase().include(vm_system_type),
    `details icon: '${vm_system_type}' not in '${details_os_icon}'`
  );

  soft_assert.call(
    quadicon_os_icon.downcase().include(vm_system_type),
    `quad icon: '${vm_system_type}' not in '${quadicon_os_icon}'`
  );

  if (ssa_vm.system_type != WINDOWS) {
    compare_linux_vm_data.call(ssa_vm)
  } else {
    compare_windows_vm_data.call(ssa_vm)
  }
};

function test_ssa_schedule(ssa_vm, schedule_ssa, soft_assert, vm_system_type, compare_linux_vm_data, compare_windows_vm_data) {
  //  Tests SSA can be performed and returns sane results
  // 
  //   Metadata:
  //       test_flag: vm_analysis
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: critical
  //       initialEstimate: 1/2h
  //       tags: smartstate
  //   
  let quadicon_os_icon = ssa_vm.find_quadicon().data.os;
  let view = navigate_to(ssa_vm, "Details");
  let details_os_icon = view.entities.summary("Properties").get_text_of("Operating System");
  logger.info("Icons: %s, %s", details_os_icon, quadicon_os_icon);
  let c_lastanalyzed = ssa_vm.last_analysed;

  soft_assert.call(
    c_lastanalyzed != "Never",
    "Last Analyzed is set to Never"
  );

  let os_type = (vm_system_type != "redhat" ? vm_system_type : "red hat");

  soft_assert.call(
    details_os_icon.downcase().include(os_type),
    `details icon: '${vm_system_type}' not in '${details_os_icon}'`
  );

  soft_assert.call(
    quadicon_os_icon.downcase().include(vm_system_type),
    `quad icon: '${vm_system_type}' not in '${quadicon_os_icon}'`
  );

  if (ssa_vm.system_type != WINDOWS) {
    compare_linux_vm_data.call(ssa_vm)
  } else {
    compare_windows_vm_data.call(ssa_vm)
  }
};

function test_ssa_vm(ssa_vm, scanned_vm, soft_assert, vm_system_type, compare_linux_vm_data, compare_windows_vm_data) {
  //  Tests SSA can be performed and returns sane results
  // 
  //   Metadata:
  //       test_flag: vm_analysis
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       tags: smartstate
  //   
  let quadicon_os_icon = ssa_vm.find_quadicon().data.os;
  let view = navigate_to(ssa_vm, "Details");
  let details_os_icon = view.entities.summary("Properties").get_text_of("Operating System");
  logger.info("Icons: %s, %s", details_os_icon, quadicon_os_icon);
  let c_lastanalyzed = ssa_vm.last_analysed;

  soft_assert.call(
    c_lastanalyzed != "Never",
    "Last Analyzed is set to Never"
  );

  let os_type = (vm_system_type != "redhat" ? vm_system_type : "red hat");

  soft_assert.call(
    details_os_icon.downcase().include(os_type),
    `details icon: '${os_type}' not in '${details_os_icon}'`
  );

  soft_assert.call(
    quadicon_os_icon.downcase().include(vm_system_type),
    `quad icon: '${vm_system_type}' not in '${quadicon_os_icon}'`
  );

  if (ssa_vm.system_type != WINDOWS) {
    compare_linux_vm_data.call(ssa_vm)
  } else {
    compare_windows_vm_data.call(ssa_vm)
  }
};

function test_ssa_users(ssa_vm) {
  //  Tests SSA fetches correct results for users list
  // 
  //   Metadata:
  //       test_flag: vm_analysis
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       tags: smartstate
  //   
  let username = fauxfactory.gen_alphanumeric();
  let expected_users = null;

  if (ssa_vm.system_type != WINDOWS) {
    ssa_vm.ssh.close();
    ssa_vm.ssh.run_command("userdel {0} || useradd {0}".format(username));
    expected_users = ((ssa_vm.ssh.run_command("cat /etc/passwd | wc -l")).output).strip("\n")
  };

  ssa_vm.smartstate_scan({wait_for_task_result: true});
  let view = navigate_to(ssa_vm, "Details");
  let current_users = view.entities.summary("Security").get_text_of("Users");

  if (ssa_vm.system_type != WINDOWS) {
    if (current_users != expected_users) throw new ()
  };

  let details_property_view = ssa_vm.open_details(["Security", "Users"]);

  if (ssa_vm.system_type != WINDOWS) {
    try {
      details_property_view.paginator.find_row_on_pages(
        details_property_view.table,
        {name: username}
      )
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NoSuchElementException) {
        pytest.fail(`User ${username} was not found in details table after SSA run`)
      } else {
        throw $EXCEPTION
      }
    }
  }
};

function test_ssa_groups(ssa_vm) {
  //  Tests SSA fetches correct results for groups
  // 
  //   Metadata:
  //       test_flag: vm_analysis
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       tags: smartstate
  //   
  let group = fauxfactory.gen_alphanumeric();
  let expected_group = null;

  if (ssa_vm.system_type != WINDOWS) {
    ssa_vm.ssh.close();
    ssa_vm.ssh.run_command("groupdel {0} || groupadd {0}".format(group));
    expected_group = ((ssa_vm.ssh.run_command("cat /etc/group | wc -l")).output).strip("\n")
  };

  ssa_vm.smartstate_scan({wait_for_task_result: true});
  let view = navigate_to(ssa_vm, "Details");
  let current_group = view.entities.summary("Security").get_text_of("Groups");

  if (ssa_vm.system_type != WINDOWS) {
    if (current_group != expected_group) throw new ()
  };

  let details_property_view = ssa_vm.open_details([
    "Security",
    "Groups"
  ]);

  if (ssa_vm.system_type != WINDOWS) {
    try {
      details_property_view.paginator.find_row_on_pages(
        details_property_view.table,
        {name: group}
      )
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NoSuchElementException) {
        pytest.fail(`Group ${group} was not found in details table after SSA run`)
      } else {
        throw $EXCEPTION
      }
    }
  }
};

function test_ssa_packages(ssa_vm) {
  //  Tests SSA fetches correct results for packages
  // 
  //   Metadata:
  //       test_flag: vm_analysis
  // 
  //   Bugzilla:
  //       1551273
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       tags: smartstate
  //   
  if (ssa_vm.system_type == WINDOWS) pytest.skip("Windows has no packages");

  if (!ssa_vm.system_type.keys().to_a.include("package")) {
    pytest.skip(`Don't know how to update packages for ${ssa_vm.system_type}`)
  };

  let package_name = ssa_vm.system_type.package;
  let package_command = ssa_vm.system_type["install-command"];
  let package_number_command = ssa_vm.system_type["package-number"];
  let cmd = package_command.format(package_name);
  ssa_vm.ssh.close();
  let output = ssa_vm.ssh.run_command(cmd.format(package_name)).output;
  logger.info(`%s output:\n%s`, cmd, output);
  let expected = ssa_vm.ssh.run_command(package_number_command).output.strip("\n");
  let view = navigate_to(ssa_vm, "Details");
  let current = view.entities.summary("Configuration").get_text_of("Packages");
  if (current != expected) throw new ();

  let details_property_view = ssa_vm.open_details([
    "Configuration",
    "Packages"
  ]);

  try {
    details_property_view.paginator.find_row_on_pages(
      details_property_view.table,
      {name: package_name}
    )
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NoSuchElementException) {
      pytest.fail(`Package ${package_name} was not found in details table after SSA run`)
    } else {
      throw $EXCEPTION
    }
  }
};

function test_ssa_files(ssa_vm) {
  // Tests that instances can be scanned for specific file.
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       tags: smartstate
  //   
  if (ssa_vm.system_type == WINDOWS) {
    pytest.skip("We cannot verify Windows files yet")
  };

  let view = navigate_to(ssa_vm, "Details");
  let current = view.entities.summary("Configuration").get_text_of("Files");
  if (current == "0") throw "No files were scanned";

  let details_property_view = ssa_vm.open_details([
    "Configuration",
    "Files"
  ]);

  try {
    details_property_view.paginator.find_row_on_pages(
      details_property_view.table,
      {name: ssa_expect_files[0]}
    )
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NoSuchElementException) {
      pytest.fail("File {} was not found in details table after SSA run".format(ssa_expect_files[0]))
    } else {
      throw $EXCEPTION
    }
  }
};

function test_drift_analysis(request, ssa_vm, soft_assert, appliance) {
  //  Tests drift analysis is correct
  // 
  //   Metadata:
  //       test_flag: vm_analysis
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       tags: smartstate
  //   
  ssa_vm.load_details();
  let drift_num_orig = 0;
  let view = navigate_to(ssa_vm, "Details");
  let drift_orig = view.entities.summary("Relationships").get_text_of("Drift History");
  if (drift_orig != "None") drift_num_orig = drift_orig.to_i;
  ssa_vm.smartstate_scan({wait_for_task_result: true});
  view = navigate_to(ssa_vm, "Details");

  wait_for(
    () => (
      view.entities.summary("Relationships").get_text_of("Drift History") == (drift_num_orig + 1).to_s
    ),

    {
      delay: 20,
      num_sec: 360,
      message: "Waiting for Drift History count to increase",
      fail_func: view.toolbar.reload.click
    }
  );

  let drift_new = view.entities.summary("Relationships").get_text_of("Drift History").to_i;
  let added_tag = appliance.collections.categories.instantiate({display_name: "Department"}).collections.tags.instantiate({display_name: "Accounting"});
  ssa_vm.add_tag(added_tag);
  request.addfinalizer(() => ssa_vm.remove_tag(added_tag));
  ssa_vm.smartstate_scan({wait_for_task_result: true});
  view = navigate_to(ssa_vm, "Details");

  wait_for(
    () => (
      view.entities.summary("Relationships").get_text_of("Drift History") == (drift_new + 1).to_s
    ),

    {
      delay: 20,
      num_sec: 360,
      message: "Waiting for Drift History count to increase",
      fail_func: view.toolbar.reload.click
    }
  );

  soft_assert.call(
    ssa_vm.equal_drift_results(
      `${added_tag.category.display_name} (1)`,
      "My Company Tags",
      0,
      1
    ),

    "Drift analysis results are equal when they shouldn't be"
  );

  let drift_analysis_view = appliance.browser.create_view(DriftAnalysis);
  drift_analysis_view.toolbar.same_values_attributes.click();

  soft_assert.call(
    !drift_analysis_view.drift_analysis.check_section_attribute_availability(`${added_tag.category.display_name}`),
    `${added_tag.display_name} row should be hidden, but not`
  );

  drift_analysis_view.toolbar.different_values_attributes.click();

  soft_assert.call(
    drift_analysis_view.drift_analysis.check_section_attribute_availability(`${added_tag.category.display_name} (1)`),
    `${added_tag.display_name} row should be visible, but not`
  )
};

function test_ssa_multiple_vms(ssa_multiple_vms, soft_assert, appliance, compare_linux_vm_data, compare_windows_vm_data) {
  //  Tests SSA run while selecting multiple vms at once
  // 
  //   Metadata:
  //       test_flag: vm_analysis
  // 
  //   Bugzilla:
  //       1551273
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       tags: smartstate
  //   
  let view = navigate_to(ssa_multiple_vms[0], "AllForProvider");
  view.toolbar.view_selector.select("List View");
  view.paginator.set_items_per_page(1000);

  for (let ssa_vm in ssa_multiple_vms) {
    view.entities.get_entity({name: ssa_vm.name, surf_pages: true}).ensure_checked()
  };

  view.toolbar.configuration.item_select(
    "Perform SmartState Analysis",
    {handle_alert: true}
  );

  view.flash.assert_message("Analysis initiated for 3 VMs and Instances from the CFME Database");

  for (let ssa_vm in ssa_multiple_vms) {
    let task = appliance.collections.tasks.instantiate({
      name: `Scan from Vm ${ssa_vm.name}`,
      tab: "AllTasks"
    });

    task.wait_for_finished();
    let current_lastanalyzed = ssa_vm.last_analysed;

    soft_assert.call(
      current_lastanalyzed != "Never",
      "Last Analyzed is set to Never"
    );

    if (ssa_vm.system_type != WINDOWS) {
      compare_linux_vm_data.call(method("ssa_vm"))
    } else {
      compare_windows_vm_data.call(method("ssa_vm"))
    }
  }
}
