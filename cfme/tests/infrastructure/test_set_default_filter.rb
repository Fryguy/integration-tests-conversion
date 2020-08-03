require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/datastore'
include Cfme::Infrastructure::Datastore
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), pytest.mark.usefixtures("virtualcenter_provider"), test_requirements.filtering]
def test_set_default_host_filter(request, appliance)
  #  Test for setting default filter for hosts.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #   
  host_collection = appliance.collections.hosts
  unset_default_host_filter = lambda do
    view = navigate_to(host_collection, "All")
    view.filters.navigation.select("ALL")
    view.default_filter_btn.click()
  end
  request.addfinalizer(method(:unset_default_host_filter))
  view = navigate_to(host_collection, "All")
  view.filters.navigation.select("Status / Running")
  view.default_filter_btn.click()
  appliance.server.logout()
  appliance.server.login_admin()
  navigate_to(host_collection, "All")
  raise unless view.filters.navigation.currently_selected[0] == "Status / Running (Default)"
end
def test_clear_host_filter_results(appliance)
  #  Test for clearing filter results for hosts.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/30h
  #   
  host_collection = appliance.collections.hosts
  view = navigate_to(host_collection, "All")
  view.filters.navigation.select("Status / Stopped")
  view.entities.search.remove_search_filters()
  page_title = view.title.text
  raise "Clear filter results failed" unless page_title == "Hosts"
end
def test_clear_datastore_filter_results(appliance)
  #  Test for clearing filter results for datastores.
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #   
  dc = DatastoreCollection(appliance)
  view = navigate_to(dc, "All")
  view.sidebar.datastores.tree.click_path("All Datastores", "Global Filters", "Store Type / VMFS")
  view.entities.search.remove_search_filters()
  raise "Clear filter results failed" unless view.entities.title.text == "All Datastores"
end
