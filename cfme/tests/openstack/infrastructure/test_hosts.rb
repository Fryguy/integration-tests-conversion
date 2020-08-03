require_relative 'cfme/infrastructure/provider/openstack_infra'
include Cfme::Infrastructure::Provider::Openstack_infra
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenstackInfraProvider], scope: "module")]
VIEWS = ["List View", "Tile View"]
def host_collection(appliance)
  return appliance.collections.hosts
end
def test_host_configuration(host_collection, provider, soft_assert, appliance)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  raise unless hosts
  for host in hosts
    host.run_smartstate_analysis()
    task = appliance.collections.tasks.instantiate(name: , tab: "MyOtherTasks")
    task.wait_for_finished()
    fields = ["Packages", "Services", "Files"]
    view = navigate_to(host, "Details")
    for field in fields
      value = view.entities.summary("Configuration").get_text_of(field).to_i
      soft_assert.(value > 0, )
    end
  end
end
def test_host_cpu_resources(host_collection, provider, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  raise unless hosts
  for host in hosts
    fields = ["Number of CPUs", "Number of CPU Cores", "CPU Cores Per Socket"]
    view = navigate_to(host, "Details")
    for field in fields
      value = view.entities.summary("Properties").get_text_of(field).to_i
      soft_assert.(value > 0, )
    end
  end
end
def test_host_auth(host_collection, provider, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  raise unless hosts
  for host in hosts
    view = navigate_to(host, "Details")
    auth_status = view.entities.summary("Authentication Status").get_text_of("SSH Key Pair Credentials")
    soft_assert.(auth_status == "Valid", )
  end
end
def test_host_devices(host_collection, provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  raise unless hosts
  for host in hosts
    view = navigate_to(host, "Details")
    result = view.entities.summary("Properties").get_text_of("Devices").split()[0].to_i
    raise unless result > 0
  end
end
def test_host_hostname(host_collection, provider, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  raise unless hosts
  for host in hosts
    view = navigate_to(host, "Details")
    result = view.entities.summary("Properties").get_text_of("Hostname")
    soft_assert.(result, "Missing hostname in: " + result.to_s)
  end
end
def test_host_memory(host_collection, provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  raise unless hosts
  for host in hosts
    view = navigate_to(host, "Details")
    result = view.entities.summary("Properties").get_text_of("Memory").split()[0].to_i
    raise unless result > 0
  end
end
def test_host_security(host_collection, provider, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  raise unless hosts
  for host in hosts
    view = navigate_to(host, "Details")
    soft_assert.(view.entities.summary("Security").get_text_of("Users").to_i > 0, "Nodes number of Users is 0")
    soft_assert.(view.entities.summary("Security").get_text_of("Groups").to_i > 0, "Nodes number of Groups is 0")
  end
end
def test_host_smbios_data(host_collection, provider, soft_assert)
  # Checks that Manufacturer/Model values are shown for each infra node
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  raise unless hosts
  for host in hosts
    view = navigate_to(host, "Details")
    res = view.entities.summary("Properties").get_text_of("Manufacturer / Model")
    soft_assert.(res, "Manufacturer / Model value are empty")
    soft_assert.(res != "N/A")
  end
end
def test_host_zones_assigned(host_collection, provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  raise unless hosts
  for host in hosts
    view = navigate_to(host, "Details")
    result = view.entities.summary("Relationships").get_text_of("Availability Zone")
    raise "Availability zone doesn't specified" unless result
  end
end
def test_hypervisor_hostname(host_collection, provider, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hvisors = provider.mgmt.list_host()
  hosts = host_collection.all()
  for host in hosts
    view = navigate_to(host, "Details")
    hv_name = view.entities.summary("Properties").get_text_of("Hypervisor Hostname")
    soft_assert.(hvisors.include?(hv_name), )
  end
end
def test_hypervisor_hostname_views(host_collection, provider, view_type, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hvisors = provider.mgmt.list_host()
  view = navigate_to(host_collection, "All")
  view.toolbar.view_selector.select(view_type)
  items = view.entities.get_all()
  for item in items
    hv_name = item.data["hypervisor_hostname"]
    soft_assert.(hvisors.include?(hv_name), )
  end
end
def test_host_networks(provider, host_collection, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  nodes = provider.mgmt.nodes
  networks = nodes.map{|node|[node.name, provider.mgmt.api.servers.ips(server: node)]}.to_h
  for host in hosts
    view = navigate_to(host, "Details")
    cloud_net = view.entities.summary("Relationships").get_text_of("Cloud Networks")
    host_name = view.entities.summary("Properties").get_text_of("Hypervisor Hostname")
    soft_assert.(cloud_net.to_i == networks[host_name].size, "Networks associated to host does not match between UI and OSP")
  end
end
def test_host_subnets(provider, appliance, host_collection, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  hosts = host_collection.all()
  for host in hosts
    view = navigate_to(host, "Details")
    cloud_subnet = view.entities.summary("Relationships").get_text_of("Cloud Subnets")
    view = navigate_to(host, "Subnets")
    soft_assert.(cloud_subnet.to_i == view.entities.paginator.items_amount, "Subnets associated to host does not match")
  end
end
