// Common tests for infrastructure provider
require_relative("cfme/infrastructure/provider/openstack_infra");
include(Cfme.Infrastructure.Provider.Openstack_infra);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.provider([OpenstackInfraProvider], {scope: "module"})
];

function test_api_port(provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view_details = navigate_to(provider, "Details");
  let port = provider.data.endpoints.default.api_port;
  let api_port = view_details.entities.summary("Properties").get_text_of("API Port").to_i;
  if (api_port != port) throw "Invalid API Port"
};

function test_credentials_quads(provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(provider, "All");

  let prov_item = view.entities.get_entity({
    name: provider.name,
    surf_pages: true
  });

  let valid_message = "Authentication credentials are valid";

  if (provider.appliance.version >= "5.10") {
    if (!prov_item.data.quad.bottomRight.tooltip.include(valid_message)) {
      throw new ()
    }
  } else if (!prov_item.data.get("creds") || !prov_item.data.creds.include("checkmark")) {
    throw new ()
  }
};

function test_delete_provider(provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  provider.delete();
  provider.wait_for_delete();
  let view = navigate_to(provider, "All");

  if (!!view.entities.get_all({surf_pages: true}).map(item => item.name).include(provider.name)) {
    throw new ()
  }
}
