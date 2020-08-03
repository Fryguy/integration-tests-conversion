require 'None'
require_relative 'cfme/infrastructure/provider/openstack_infra'
include Cfme::Infrastructure::Provider::Openstack_infra
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenstackInfraProvider], scope: "module")]
ROLES = ["NovaCompute", "Controller", "Compute", "BlockStorage", "SwiftStorage", "CephStorage"]
def roles(appliance, provider)
  collection = appliance.collections.deployment_roles.filter({"provider" => provider})
  roles = collection.all()
  yield is_bool(roles) ? roles : pytest.skip("No Roles Available")
end
def test_host_role_association(appliance, provider, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  host_collection = appliance.collections.hosts
  hosts = host_collection.all()
  raise unless hosts.size > 0
  for host in hosts
    host.run_smartstate_analysis()
    task = appliance.collections.tasks.instantiate(name: , tab: "MyOtherTasks")
    task.wait_for_finished()
    view = navigate_to(host, "Details")
    role_name = view.title.text.split()[1].to_s.translate(nil, "()")
    role_name = (role_name == "NovaCompute") ? "Compute" : role_name
    begin
      role_assoc = view.entities.summary("Relationships").get_text_of("Deployment Role")
    rescue NameError
      role_assoc = view.entities.summary("Relationships").get_text_of("Cluster / Deployment Role")
    end
    soft_assert.(role_assoc.include?(role_name), "Deployment roles misconfigured")
  end
end
def test_roles_name(roles)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  for role in roles
    role_name = role.name.split_p("-")[1]
    raise unless ROLES.include?(role_name)
  end
end
def test_roles_summary(roles, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  err_ptrn = "{} are shown incorrectly"
  for role in roles
    view = navigate_to(role, "DetailsFromProvider")
    for v in ["Nodes", "Direct VMs", "All VMs"]
      res = view.entities.relationships.get_text_of(v)
      soft_assert.(res.isdigit(), err_ptrn.format(v))
    end
    for v in ["Total CPUs", "Total Node CPU Cores"]
      res = view.entities.total_for_node.get_text_of(v)
      soft_assert.(res.isdigit() && res.to_i > 0, err_ptrn.format(v))
    end
    total_cpu = view.entities.total_for_node.get_text_of("Total CPU Resources")
    soft_assert.(total_cpu.include?("GHz"), err_ptrn.format("Total CPU Resources"))
    total_memory = view.entities.total_for_node.get_text_of("Total Memory")
    soft_assert.(total_memory.include?("GB"), err_ptrn.format("Total Memory"))
    for v in ["Total Configured Memory", "Total Configured CPUs"]
      res = view.entities.total_for_vm.get_text_of(v)
      soft_assert.(res, err_ptrn.format(v))
    end
  end
end
def test_role_delete(roles)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  role = choice(roles)
  role.delete()
  view = navigate_to(role, "AllForProvider")
  available_roles = view.entities.get_all()
  raise unless !available_roles.include?(role)
end
