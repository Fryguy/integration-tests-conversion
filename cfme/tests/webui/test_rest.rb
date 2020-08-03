require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
pytestmark = [test_requirements.rest, pytest.mark.provider([InfraProvider], selector: ONE, scope: "module"), pytest.mark.usefixtures("setup_provider")]
def search_filter_obj(appliance, request)
  filter_name = fauxfactory.gen_string("alphanumeric", 10)
  filter_value = fauxfactory.gen_string("alphanumeric", 10)
  param_filter = "Infrastructure Provider : Name"
  view = navigate_to(appliance.collections.infra_providers, "All")
  view.search.save_filter(, filter_name, global_search: request.param)
  view.search.close_advanced_search()
  view.flash.assert_no_error()
  search_filter = appliance.rest_api.collections.search_filters.get(description: filter_name)
  return search_filter
end
def test_delete_advanced_search_filter_from_collection(request, search_filter_obj)
  # Tests deleting search_filter from collection.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #       tags: Rest
  #   
  delete_resources_from_collection([search_filter_obj])
end
def test_delete_advanced_search_filter_from_detail(request, method, search_filter_obj)
  # Tests deleting search_filter from detail.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #       tags: Rest
  #   
  delete_resources_from_detail(resources: [search_filter_obj], method: method)
end
