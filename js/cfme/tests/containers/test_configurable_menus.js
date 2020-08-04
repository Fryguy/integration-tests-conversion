require_relative("cfme");
include(Cfme);
require_relative("cfme/common");
include(Cfme.Common);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

function is_menu_visible(appliance, link_text) {
  navigate_to(ContainersProvider, "All");
  let logged_in_page = appliance.browser.create_view(BaseLoggedInPage);
  return logged_in_page.navigation.nav_links().include(link_text)
};

function is_datawarehouse_menu_visible(appliance) {
  return is_menu_visible(appliance, "Datawarehouse")
};

function is_monitoring_menu_visible(appliance) {
  return is_menu_visible(appliance, "Monitor")
};

function test_datawarehouse_invisible(is_datawarehouse_menu_visible) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/4h
  //   
  if (!!is_datawarehouse_menu_visible) throw new ()
}
