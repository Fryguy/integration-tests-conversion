require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/stack'
include Cfme::Cloud::Stack
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.stack, pytest.mark.provider([EC2Provider], scope: "module")]
def stack(setup_provider_modscope, provider, appliance)
  collection = appliance.collections.cloud_stacks
  for stack_name in provider.data.provisioning.stacks
    stack = collection.instantiate(stack_name, provider: provider)
    begin
      stack.wait_for_exists()
      return stack
    rescue Exception
      # pass
    end
  end
  pytest.skip("No available stacks found for test")
end
def test_security_group_link(stack)
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Stack
  #   
  begin
    view = navigate_to(stack, "RelationshipSecurityGroups")
  rescue CandidateNotFound
    view = navigate_to(stack, "Details")
    raise unless view.sidebar.relationships.nav.is_disabled("Security Groups (0)")
  end
end
def test_parameters_link(stack)
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/8h
  #       casecomponent: Stack
  #   
  begin
    view = navigate_to(stack, "RelationshipParameters")
  rescue CandidateNotFound
    view = navigate_to(stack, "Details")
    raise unless view.sidebar.relationships.nav.is_disabled("Parameters (0)")
  end
end
def test_outputs_link(stack)
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Stack
  #   
  begin
    view = navigate_to(stack, "RelationshipOutputs")
  rescue CandidateNotFound
    view = navigate_to(stack, "Details")
    raise unless view.sidebar.relationships.nav.is_disabled("Outputs (0)")
  end
end
def test_outputs_link_url(appliance, stack)
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Stack
  #   
  begin
    view = navigate_to(stack, "RelationshipOutputs")
  rescue CandidateNotFound
    view = navigate_to(stack, "Details")
    raise unless view.sidebar.relationships.nav.is_disabled("Outputs (0)")
  end
end
def test_resources_link(stack)
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Stack
  #   
  begin
    view = navigate_to(stack, "RelationshipResources")
  rescue CandidateNotFound
    view = navigate_to(stack, "Details")
    raise unless view.sidebar.relationships.nav.is_disabled("Resources (0)")
  end
end
def test_edit_tags_stack(request, stack)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       caseimportance: low
  #       initialEstimate: 1/8h
  #   
  added_tag = stack.add_tag()
  request.addfinalizer(lambda{|| stack.remove_tag(added_tag)})
end
def test_delete_stack(stack, provider, request)
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       initialEstimate: 1/4h
  #       casecomponent: Stack
  #   
  stack.delete()
  raise unless !stack.exists
  request.addfinalizer(provider.refresh_provider_relationships)
end
def test_collection_delete(provider, setup_provider_modscope, appliance)
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       initialEstimate: 1/4h
  #       casecomponent: Stack
  #   
  collection = appliance.collections.cloud_stacks
  stack1 = collection.instantiate(provider.data["provisioning"]["stacks"][0], provider: provider)
  stack2 = collection.instantiate(provider.data["provisioning"]["stacks"][1], provider: provider)
  stack1.wait_for_exists()
  stack2.wait_for_exists()
  collection.delete(stack1, stack2)
end
