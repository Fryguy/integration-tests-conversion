# Tests for Openstack cloud provider
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([OpenStackProvider], scope: "function")]
CARDS = [["Flavors", "list_flavor"], ["Images", "list_templates"], ["Cloud Networks", "list_network"], ["Instances", "list_vms"], ["Cloud Volumes", "list_volume"]]
def test_cloud_provider_cards(provider, card, api)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(provider, "Details")
  view.toolbar.view_selector.select("Dashboard View")
  dashboard_card = view.entities.cards(card)
  attr = provider.mgmt.getattr(api)
  raise unless dashboard_card.value == attr.().size
end
def test_dashboard_card_availability_zones(provider)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(provider, "Details")
  view.toolbar.view_selector.select("Dashboard View")
  dashboard_card = view.entities.cards("Availability Zones")
  raise unless dashboard_card.value == provider.mgmt.api.availability_zones.list().size
end
def test_dashboard_card_tenants(provider)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  collection = provider.appliance.collections.cloud_tenants
  view = navigate_to(provider, "Details")
  view.toolbar.view_selector.select("Dashboard View")
  card_tenants = view.entities.cards("Cloud Tenants").value
  view = navigate_to(collection, "All")
  raise unless card_tenants == view.entities.paginator.items_amount
end
def test_dashboard_card_security_groups(provider)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(provider, "Details")
  sec_groups = view.entities.summary("Relationships").get_text_of("Security Groups")
  view.toolbar.view_selector.select("Dashboard View")
  sec_groups_card = view.entities.cards("Security Groups").value
  raise unless sec_groups_card == sec_groups.to_i
end
