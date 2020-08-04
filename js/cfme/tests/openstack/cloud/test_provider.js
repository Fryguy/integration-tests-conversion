// Tests for Openstack cloud provider
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.provider([OpenStackProvider], {scope: "function"})
];

const CARDS = [
  ["Flavors", "list_flavor"],
  ["Images", "list_templates"],
  ["Cloud Networks", "list_network"],
  ["Instances", "list_vms"],
  ["Cloud Volumes", "list_volume"]
];

function test_cloud_provider_cards(provider, card, api) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(provider, "Details");
  view.toolbar.view_selector.select("Dashboard View");
  let dashboard_card = view.entities.cards(card);
  let attr = provider.mgmt.getattr(api);
  if (dashboard_card.value != attr.call().size) throw new ()
};

function test_dashboard_card_availability_zones(provider) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(provider, "Details");
  view.toolbar.view_selector.select("Dashboard View");
  let dashboard_card = view.entities.cards("Availability Zones");

  if (dashboard_card.value != provider.mgmt.api.availability_zones.list().size) {
    throw new ()
  }
};

function test_dashboard_card_tenants(provider) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let collection = provider.appliance.collections.cloud_tenants;
  let view = navigate_to(provider, "Details");
  view.toolbar.view_selector.select("Dashboard View");
  let card_tenants = view.entities.cards("Cloud Tenants").value;
  view = navigate_to(collection, "All");
  if (card_tenants != view.entities.paginator.items_amount) throw new ()
};

function test_dashboard_card_security_groups(provider) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(provider, "Details");
  let sec_groups = view.entities.summary("Relationships").get_text_of("Security Groups");
  view.toolbar.view_selector.select("Dashboard View");
  let sec_groups_card = view.entities.cards("Security Groups").value;
  if (sec_groups_card != sec_groups.to_i) throw new ()
}
