// 
// This test can run only after overcloud cloud provider created and linked to
// undercloud infra provider, need to compare the cloud providers with the
// results of the relationships
// 
require_relative("cfme/infrastructure/provider/openstack_infra");
include(Cfme.Infrastructure.Provider.Openstack_infra);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.meta({server_roles: "+smartproxy +smartstate"}),
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.provider([OpenstackInfraProvider], {scope: "module"})
];

function test_assigned_roles(provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(provider, "Details");

  try {
    let res = view.entities.summary("Relationships").get_text_of("Deployment Roles")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NameError) {
      let res = view.entities.summary("Relationships").get_text_of("Clusters / Deployment Roles")
    } else {
      throw $EXCEPTION
    }
  };

  if (res.to_i <= 0) throw new ()
};

function test_nodes(provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(provider, "Details");
  let nodes = provider.mgmt.iapi.node.list().size;

  if (view.entities.summary("Relationships").get_text_of("Nodes").to_i != nodes) {
    throw new ()
  }
};

function test_templates(provider, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(provider, "Details");
  let images = provider.mgmt.images.map(i => i.name);
  let ui_images = view.entities.summary("Relationships").get_text_of("Templates");
  if (ui_images.to_i != images.size) throw new ();
  let templates_view = navigate_to(provider, "ProviderTemplates");
  let template_names = templates_view.entities.entity_names;

  for (let image in images) {
    soft_assert.call(
      template_names.include(image),
      `Missing template: ${image}`
    )
  }
};

function test_stacks(provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(provider, "Details");

  // 
  //   todo get the list of tenants from external resource and compare
  //   it with result - currently not 0
  //   
  if (view.entities.summary("Relationships").get_text_of("Orchestration stacks").to_i <= 0) {
    throw new ()
  }
}
