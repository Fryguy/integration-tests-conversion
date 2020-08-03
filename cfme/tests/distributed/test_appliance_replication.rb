require_relative 'time'
include Time
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/ui'
include Cfme::Base::Ui
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/infrastructure/virtual_machines'
include Cfme::Infrastructure::Virtual_machines
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.long_running, test_requirements.distributed, pytest.mark.provider([VMwareProvider], selector: ONE_PER_TYPE)]
HTTPD_ROLES = ["cockpit_ws", "user_interface", "remote_console", "web_services"]
def test_appliance_replicate_between_regions(provider, replicated_appliances)
  # Test that a provider added to the remote appliance is replicated to the global
  #   appliance.
  # 
  #   Metadata:
  #       test_flag: replication
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   
  remote_appliance,global_appliance = replicated_appliances
  remote_appliance.browser_steal = true
  remote_appliance {
    provider.create()
    remote_appliance.collections.infra_providers.wait_for_a_provider()
  }
  global_appliance.browser_steal = true
  global_appliance {
    global_appliance.collections.infra_providers.wait_for_a_provider()
    raise unless provider.exists
  }
end
def test_external_database_appliance(provider, distributed_appliances)
  # Test that a second appliance can be configured to join the region of the first,
  #   database-owning appliance, and that a provider created in the first appliance is
  #   visible in the web UI of the second appliance.
  # 
  #   Metadata:
  #       test_flag: replication
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   
  primary_appliance,secondary_appliance = distributed_appliances
  primary_appliance.browser_steal = true
  primary_appliance {
    provider.create()
    primary_appliance.collections.infra_providers.wait_for_a_provider()
  }
  secondary_appliance.browser_steal = true
  secondary_appliance {
    secondary_appliance.collections.infra_providers.wait_for_a_provider()
    raise unless provider.exists
  }
end
def test_appliance_replicate_database_disconnection(provider, replicated_appliances)
  # Test that a provider created on the remote appliance *after* a database restart on the
  #   global appliance is still successfully replicated to the global appliance.
  # 
  #   Metadata:
  #       test_flag: replication
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   
  remote_appliance,global_appliance = replicated_appliances
  global_appliance.db_service.stop()
  sleep(60)
  global_appliance.db_service.start()
  remote_appliance.browser_steal = true
  remote_appliance {
    provider.create()
    remote_appliance.collections.infra_providers.wait_for_a_provider()
  }
  global_appliance.browser_steal = true
  global_appliance {
    global_appliance.collections.infra_providers.wait_for_a_provider()
    raise unless provider.exists
  }
end
def test_appliance_replicate_database_disconnection_with_backlog(provider, replicated_appliances)
  # Test that a provider created on the remote appliance *before* a database restart on the
  #   global appliance is still successfully replicated to the global appliance.
  # 
  #   Metadata:
  #       test_flag: replication
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   
  remote_appliance,global_appliance = replicated_appliances
  remote_appliance.browser_steal = true
  remote_appliance {
    provider.create()
    global_appliance.db_service.stop()
    sleep(60)
    global_appliance.db_service.start()
    remote_appliance.collections.infra_providers.wait_for_a_provider()
  }
  global_appliance.browser_steal = true
  global_appliance {
    global_appliance.collections.infra_providers.wait_for_a_provider()
    raise unless provider.exists
  }
end
def test_replication_vm_power_control(provider, create_vm, register_event, soft_assert, replicated_appliances)
  # Test that the global appliance can power off a VM managed by the remote appliance.
  # 
  #   Metadata:
  #       test_flag: replication
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   
  remote_appliance,global_appliance = replicated_appliances
  remote_appliance.browser_steal = true
  remote_appliance {
    provider.create()
    remote_appliance.collections.infra_providers.wait_for_a_provider()
  }
  global_appliance.browser_steal = true
  global_appliance {
    register_event.(target_type: "VmOrTemplate", target_name: create_vm.name, event_type: "request_vm_poweroff")
    register_event.(target_type: "VmOrTemplate", target_name: create_vm.name, event_type: "vm_poweroff")
    create_vm.power_control_from_cfme(option: create_vm.POWER_OFF, cancel: false)
    navigate_to(create_vm.provider, "Details")
    create_vm.wait_for_vm_state_change(desired_state: create_vm.STATE_OFF, timeout: 900)
    soft_assert.(create_vm.find_quadicon().data["state"] == "off")
    soft_assert.(!create_vm.mgmt.is_running, "vm running")
  }
end
def test_replication_connect_to_vm_in_region(provider, replicated_appliances)
  # Test that the user can view the VM in the global appliance UI, click on the
  #   \"Connect to VM in its Region\" button, and be redirected to the VM in the remote appliance UI.
  # 
  #   Metadata:
  #       test_flag: replication
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #       startsin: 5.11
  #   
  remote_appliance,global_appliance = replicated_appliances
  vm_name = provider.data["cap_and_util"]["chargeback_vm"]
  remote_appliance.browser_steal = true
  remote_appliance {
    provider.create()
    remote_appliance.collections.infra_providers.wait_for_a_provider()
  }
  global_appliance.browser_steal = true
  global_appliance {
    collection = global_appliance.provider_based_collection(provider)
    vm = collection.instantiate(vm_name, provider)
    view = navigate_to(vm, "Details")
    initial_count = view.browser.window_handles.size
    main_window = view.browser.current_window_handle
    view.entities.summary("Multi Region").click_at("Remote Region")
    wait_for(lambda{|| view.browser.window_handles.size > initial_count}, timeout: 30, message: "Check for new browser window")
    open_url_window = (Set.new(view.browser.window_handles) - ).pop()
    view.browser.switch_to_window(open_url_window)
    sleep(5)
    view = global_appliance.browser.create_view(LoginPage)
    wait_for(lambda{|| view.is_displayed}, message: "Wait for Login page")
    view.fill({"username" => conf.credentials["default"]["username"], "password" => conf.credentials["default"]["password"]})
    view.login.click()
    view = vm.create_view(InfraVmDetailsView)
    wait_for(lambda{|| view.is_displayed}, message: "Wait for VM Details page")
  }
end
def test_appliance_httpd_roles(distributed_appliances)
  # Test that a secondary appliance only runs httpd if a server role requires it.
  #   Disable all server roles that require httpd, and verify that httpd is stopped. For each server
  #   role that requires httpd, enable it (with all other httpd server roles disabled), and verify
  #   that httpd starts.
  # 
  #   Bugzilla:
  #       1449766
  # 
  #   Metadata:
  #       test_flag: configuration
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Appliance
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  primary_appliance,secondary_appliance = distributed_appliances
  fill_values = HTTPD_ROLES.map{|k|[k, false]}.to_h
  sid = secondary_appliance.server.sid
  secondary_server = primary_appliance.collections.servers.instantiate(sid: sid)
  primary_appliance.browser_steal = true
  primary_appliance {
    view = navigate_to(secondary_server, "Server")
    for role in HTTPD_ROLES
      view.server_roles.fill(fill_values)
      view.save.click()
      view.flash.assert_no_error()
      wait_for(lambda{|| !secondary_appliance.httpd.running}, delay: 10)
      view.server_roles.fill({"role" => true})
      view.save.click()
      view.flash.assert_no_error()
      wait_for(lambda{|| secondary_appliance.httpd.running}, delay: 10)
    end
  }
end
def test_appliance_reporting_role(distributed_appliances)
  # Test that a report queued from an appliance with the User Interface role but not the
  #   Reporting role gets successfully run by a worker appliance that does have the Reporting
  #   role.
  # 
  #   Bugzilla:
  #       1629945
  # 
  #   Metadata:
  #       test_flag: configuration
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Appliance
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  primary_appliance,secondary_appliance = distributed_appliances
  primary_appliance.server.settings.disable_server_roles("reporting")
  wait_for(lambda{|| !primary_appliance.server.settings.server_roles_db["reporting"]})
  primary_appliance.collections.reports.instantiate(type: "Operations", subtype: "EVM", menu_name: "EVM Server UserID Usage Report").queue(wait_for_finish: true)
end
def test_server_role_failover(distributed_appliances)
  # Test that server roles failover successfully to a secondary appliance if evmserverd stops
  #   on the primary appliance.
  # 
  #   Metadata:
  #       test_flag: configuration
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Appliance
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #   
  primary_appliance,secondary_appliance = distributed_appliances
  all_server_roles = Cfme::cfme_data.get("server_roles", {"all" => []})["all"]
  if is_bool(!all_server_roles)
    pytest.skip("Empty server_roles dictionary in cfme_data, skipping test")
  end
  remove_roles = ["websocket"]
  server_roles = all_server_roles.select{|r| !remove_roles.include?(r)}.map{|r| r}
  fill_values = server_roles.map{|k|[k, true]}.to_h
  for appliance in distributed_appliances
    appliance.browser_steal = true
    appliance {
      view = navigate_to(appliance.server, "Server")
      view.server_roles.fill(fill_values)
      view.save.click()
      view.flash.assert_no_error()
    }
  end
  secondary_appliance.evmserverd.stop()
  wait_for(lambda{|| primary_appliance.server_roles == fill_values})
  secondary_appliance.evmserverd.start()
  primary_appliance.evmserverd.stop()
  wait_for(lambda{|| secondary_appliance.server_roles == fill_values})
end
def test_appliance_replicate_zones(replicated_appliances)
  # 
  #   Verify that no remote zones can be selected when changing the server's zone
  #   in the global appliance UI.
  # 
  #   Bugzilla:
  #       1470283
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  remote_appliance,global_appliance = replicated_appliances
  remote_zone = "remote-A"
  remote_appliance.collections.zones.create(name: remote_zone, description: remote_zone)
  global_zone = "global-A"
  global_appliance.collections.zones.create(name: global_zone, description: global_zone)
  view = navigate_to(global_appliance.server, "Server")
  global_zones = view.basic_information.appliance_zone.all_options.map{|o| o.text}
  raise unless global_zones.include?(global_zone) && !global_zones.include?(remote_zone)
end
def test_appliance_replicate_remote_down(replicated_appliances)
  # Test that the Replication tab displays in the global appliance UI when the remote appliance
  #   database cannot be reached.
  # 
  #   Bugzilla:
  #       1796681
  # 
  #   Metadata:
  #       test_flag: replication
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   
  remote_appliance,global_appliance = replicated_appliances
  global_region = global_appliance.server.zone.region
  raise "Remote appliance not found on Replication tab after initial configuration." unless global_region.replication.get_replication_status(host: remote_appliance.hostname)
  result = global_appliance.ssh_client.run_command()
  raise "Could not create firewall rule on global appliance." unless result.success
  global_appliance.browser.widgetastic.refresh()
  raise "Remote appliance not found on Replication tab after dropped connection." unless global_region.replication.get_replication_status(host: remote_appliance.hostname)
end
