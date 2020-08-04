require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/infrastructure/provider/openstack_infra'
include Cfme::Infrastructure::Provider::Openstack_infra
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenstackInfraProvider], scope: "module")]
def host(provider)
  # Find a host for test scenario
  host_collection = provider.appliance.collections.openstack_nodes
  hosts = host_collection.all(provider)
  for host in hosts
    view = navigate_to(method(:host), "Details")
    vms = view.entities.summary("Relationships").get_text_of("VMs").to_i
    if is_bool(host.name.include?("Compute") && vms == 0)
      return host
    end
  end
  raise ItemNotFound, "There is no proper host for tests"
end
def has_mistral_service(provider)
  # Skip test if there is no Mistral service on OSPd provider
  services = provider.mgmt.kapi.services.list()
  if !services.map{|s| s.name}.include?("mistral")
    pytest.skip("Skipping because no Mistral service found on OSPD deployment")
  end
end
def test_scale_provider_down(provider, host, has_mistral_service)
  # Scale down Openstack Infrastructure provider
  #   Metadata:
  #       test_flag: openstack_scale
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  host.toggle_maintenance_mode()
  host_uuid = host.name.split()[0]
  wait_for(lambda{|| provider.mgmt.iapi.node.get(host_uuid).maintenance}, timeout: 600, delay: 5)
  wait_for(provider.is_refreshed, func_kwargs: {}, timeout: 600)
  host.browser.refresh()
  view = navigate_to(host, "Details")
  wait_for(lambda{|| view.entities.summary("Properties").get_text_of("Maintenance Mode") == "Enabled"}, delay: 15, timeout: 300, message: "Maintenance Mode of host #{host.name} becomes Enabled", fail_func: host.browser.refresh)
  raise unless view.entities.summary("Properties").get_text_of("Maintenance Mode") == "Enabled"
  provider.scale_down()
  wait_for(lambda{|| provider.mgmt.iapi.node.get(host_uuid).provision_state == "available"}, delay: 5, timeout: 1200)
  host.name = host_uuid
  host.browser.refresh()
  wait_for(lambda{|| host.exists}, delay: 15, timeout: 600, message: "Hostname changed to #{host.name} after scale down", fail_func: provider.browser.refresh)
  view = navigate_to(host, "Details")
  wait_for(lambda{|| view.entities.summary("Openstack Hardware").get_text_of("Provisioning State") == "available"}, delay: 15, timeout: 600, message: "Provisioning State of host #{host.name} is available", fail_func: host.browser.refresh)
  prov_state = view.entities.summary("Openstack Hardware").get_text_of("Provisioning State")
  raise unless prov_state == "available"
end
def test_delete_host(appliance, host, provider, has_mistral_service)
  # Remove host from appliance and Ironic service
  #   Metadata:
  #       test_flag: openstack_scale
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  is_host_disappeared = lambda do
    return !provider.mgmt.iapi.node.list().map{|h| h.uuid}.include?(host.name)
  end
  host.delete(cancel: false)
  wait_for(method(:is_host_disappeared), timeout: 300, delay: 5)
  wait_for(provider.is_refreshed, func_kwargs: {}, timeout: 600)
  host.browser.refresh()
  host_collection = appliance.collections.hosts
  raise unless !host_collection.all(provider).include?(host.name)
end
def test_register_host(provider, host, has_mistral_service)
  # Register new host by uploading instackenv.json file
  #   Metadata:
  #       test_flag: openstack_scale
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  hosts_before = provider.mgmt.iapi.node.list().map{|h| h.uuid}
  provider.register(provider.data["instackenv_file_path"])
  wait_for(lambda{|| provider.mgmt.iapi.node.list().size == hosts_before.size + 1}, timeout: 300, delay: 5)
  hosts_after = provider.mgmt.iapi.node.list().map{|h| h.uuid}
  for h in hosts_after
    if !hosts_before.include?(h)
      host.name = h
    end
  end
  provider.browser.refresh()
  wait_for(provider.is_refreshed, func_kwargs: {}, timeout: 600)
  wait_for(lambda{|| host.exists}, delay: 15, timeout: 600, message: "Host #{host.name} become visible", fail_func: host.browser.refresh)
  raise unless host.exists
end
def test_introspect_host(host, provider, has_mistral_service)
  # Introspect host
  #   Metadata:
  #       test_flag: openstack_scale
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  host.run_introspection()
  wait_for(lambda{|| provider.mgmt.iapi.node.get(host.name).inspection_finished_at}, delay: 15, timeout: 600)
  wait_for(provider.is_refreshed, func_kwargs: {}, timeout: 600)
  host.browser.refresh()
  view = navigate_to(host, "Details")
  wait_for(lambda{|| view.entities.summary("Openstack Hardware").get_text_of("Introspected") == "true"}, delay: 15, timeout: 600, fail_func: host.browser.refresh, message: "Introspected state of host #{host.name} is true")
  raise unless view.entities.summary("Openstack Hardware").get_text_of("Introspected") == "true"
end
def test_provide_host(host, provider, has_mistral_service)
  # Provide host
  #   Metadata:
  #       test_flag: openstack_scale
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  host.provide_node()
  wait_for(lambda{|| provider.mgmt.iapi.node.get(host.name).provision_state == "available"}, delay: 5, timeout: 300)
  wait_for(provider.is_refreshed, func_kwargs: {}, timeout: 600)
  host.browser.refresh()
  view = navigate_to(host, "Details")
  prov_state = view.entities.summary("Openstack Hardware").get_text_of("Provisioning State")
  raise unless prov_state == "available"
end
def test_scale_provider_out(host, provider, has_mistral_service)
  # Scale out Infra provider
  #   Metadata:
  #       test_flag: openstack_scale
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  params = [{"path" => "/properties/capabilities", "value" => "profile:compute,boot_option:local", "op" => "replace"}]
  provider.mgmt.iapi.node.update(host.name, params)
  provider.scale_out(1)
  wait_for(lambda{|| provider.mgmt.iapi.node.get(host.name).provision_state == "active"}, delay: 120, timeout: 1800)
  wait_for(provider.is_refreshed, func_kwargs: {}, timeout: 600)
  host.name += " (NovaCompute)"
  host.browser.refresh()
  raise unless host.exists
  view = navigate_to(host, "Details")
  prov_state = view.entities.summary("Openstack Hardware").get_text_of("Provisioning State")
  raise unless prov_state == "active"
end
