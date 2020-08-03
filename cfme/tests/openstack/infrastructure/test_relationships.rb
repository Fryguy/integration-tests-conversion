# 
# This test can run only after overcloud cloud provider created and linked to
# undercloud infra provider, need to compare the cloud providers with the
# results of the relationships
# 
require_relative 'cfme/infrastructure/provider/openstack_infra'
include Cfme::Infrastructure::Provider::Openstack_infra
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.meta(server_roles: "+smartproxy +smartstate"), pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenstackInfraProvider], scope: "module")]
def test_assigned_roles(provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(provider, "Details")
  begin
    res = view.entities.summary("Relationships").get_text_of("Deployment Roles")
  rescue NameError
    res = view.entities.summary("Relationships").get_text_of("Clusters / Deployment Roles")
  end
  raise unless res.to_i > 0
end
def test_nodes(provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(provider, "Details")
  nodes = provider.mgmt.iapi.node.list().size
  raise unless view.entities.summary("Relationships").get_text_of("Nodes").to_i == nodes
end
def test_templates(provider, soft_assert)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(provider, "Details")
  images = provider.mgmt.images.map{|i| i.name}
  ui_images = view.entities.summary("Relationships").get_text_of("Templates")
  raise unless ui_images.to_i == images.size
  templates_view = navigate_to(provider, "ProviderTemplates")
  template_names = templates_view.entities.entity_names
  for image in images
    soft_assert.(template_names.include?(image), "Missing template: #{image}")
  end
end
def test_stacks(provider)
  # 
  #   Polarion:
  #       assignee: mnadeem
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(provider, "Details")
  # 
  #   todo get the list of tenants from external resource and compare
  #   it with result - currently not 0
  #   
  raise unless view.entities.summary("Relationships").get_text_of("Orchestration stacks").to_i > 0
end
