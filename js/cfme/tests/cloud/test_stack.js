require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/cloud/stack");
include(Cfme.Cloud.Stack);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  test_requirements.stack,
  pytest.mark.provider([EC2Provider], {scope: "module"})
];

function stack(setup_provider_modscope, provider, appliance) {
  let collection = appliance.collections.cloud_stacks;

  for (let stack_name in provider.data.provisioning.stacks) {
    let stack = collection.instantiate(stack_name, {provider});

    // pass
    try {
      stack.wait_for_exists();
      return stack
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof Exception) {

      } else {
        throw $EXCEPTION
      }
    }
  };

  pytest.skip("No available stacks found for test")
};

function test_security_group_link(stack) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Stack
  //   
  try {
    let view = navigate_to(stack, "RelationshipSecurityGroups")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof CandidateNotFound) {
      let view = navigate_to(stack, "Details");

      if (!view.sidebar.relationships.nav.is_disabled("Security Groups (0)")) {
        throw new ()
      }
    } else {
      throw $EXCEPTION
    }
  }
};

function test_parameters_link(stack) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/8h
  //       casecomponent: Stack
  //   
  try {
    let view = navigate_to(stack, "RelationshipParameters")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof CandidateNotFound) {
      let view = navigate_to(stack, "Details");

      if (!view.sidebar.relationships.nav.is_disabled("Parameters (0)")) {
        throw new ()
      }
    } else {
      throw $EXCEPTION
    }
  }
};

function test_outputs_link(stack) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Stack
  //   
  try {
    let view = navigate_to(stack, "RelationshipOutputs")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof CandidateNotFound) {
      let view = navigate_to(stack, "Details");
      if (!view.sidebar.relationships.nav.is_disabled("Outputs (0)")) throw new ()
    } else {
      throw $EXCEPTION
    }
  }
};

function test_outputs_link_url(appliance, stack) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Stack
  //   
  try {
    let view = navigate_to(stack, "RelationshipOutputs")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof CandidateNotFound) {
      let view = navigate_to(stack, "Details");
      if (!view.sidebar.relationships.nav.is_disabled("Outputs (0)")) throw new ()
    } else {
      throw $EXCEPTION
    }
  }
};

function test_resources_link(stack) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Stack
  //   
  try {
    let view = navigate_to(stack, "RelationshipResources")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof CandidateNotFound) {
      let view = navigate_to(stack, "Details");
      if (!view.sidebar.relationships.nav.is_disabled("Resources (0)")) throw new ()
    } else {
      throw $EXCEPTION
    }
  }
};

function test_edit_tags_stack(request, stack) {
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Tagging
  //       caseimportance: low
  //       initialEstimate: 1/8h
  //   
  let added_tag = stack.add_tag();
  request.addfinalizer(() => stack.remove_tag(added_tag))
};

function test_delete_stack(stack, provider, request) {
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       initialEstimate: 1/4h
  //       casecomponent: Stack
  //   
  stack.delete();
  if (!!stack.exists) throw new ();
  request.addfinalizer(provider.refresh_provider_relationships)
};

function test_collection_delete(provider, setup_provider_modscope, appliance) {
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       initialEstimate: 1/4h
  //       casecomponent: Stack
  //   
  let collection = appliance.collections.cloud_stacks;

  let stack1 = collection.instantiate(
    provider.data.provisioning.stacks[0],
    {provider}
  );

  let stack2 = collection.instantiate(
    provider.data.provisioning.stacks[1],
    {provider}
  );

  stack1.wait_for_exists();
  stack2.wait_for_exists();
  collection.delete(stack1, stack2)
}
