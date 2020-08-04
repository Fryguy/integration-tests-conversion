require 'None'
require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/image'
include Cfme::Containers::Image
require_relative 'cfme/containers/image_registry'
include Cfme::Containers::Image_registry
require_relative 'cfme/containers/node'
include Cfme::Containers::Node
require_relative 'cfme/containers/pod'
include Cfme::Containers::Pod
require_relative 'cfme/containers/project'
include Cfme::Containers::Project
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/containers/replicator'
include Cfme::Containers::Replicator
require_relative 'cfme/containers/route'
include Cfme::Containers::Route
require_relative 'cfme/containers/service'
include Cfme::Containers::Service
require_relative 'cfme/containers/template'
include Cfme::Containers::Template
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "module"), test_requirements.containers]
DataSet = namedtuple("DataSet", ["obj", "collection_obj"])
TESTED_OBJECTS = [DataSet.(Service, "container_services"), DataSet.(Route, "container_routes"), DataSet.(Project, "container_projects"), DataSet.(Pod, "container_pods"), DataSet.(Image, "container_images"), DataSet.(ContainersProvider, "containers_providers"), DataSet.(ImageRegistry, "container_image_registries"), DataSet.(Node, "container_nodes"), DataSet.(Replicator, "container_replicators"), DataSet.(Template, "container_templates")]
def clear_search(view)
  view.entities.search.clear_simple_search()
  view.entities.search.search_button.click()
end
def test_breadcrumbs(provider, appliance, soft_assert)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  for data_set in TESTED_OBJECTS
    instances = (data_set.collection_obj == "containers_providers") ? [provider] : appliance.collections.getattr(data_set.collection_obj).all()
    __dummy0__ = false
    for instance in instances
      if is_bool(instance.exists)
        test_obj = instance
        break
      end
      if instance == instances[-1]
        __dummy0__ = true
      end
    end
    if __dummy0__
      pytest.skip("No content found for test")
    end
    view = navigate_to(test_obj, "Details")
    soft_assert.(view.breadcrumb.is_displayed, "Breadcrumbs not found in {} {} summary page".format(data_set.obj.__name__, test_obj.name))
    soft_assert.(view.breadcrumb.locations.include?(view.summary_text), "Could not find breadcrumb \"{}\" in {} {} summary page. breadcrumbs: {}".format(view.summary_text, view.breadcrumb.locations, data_set.obj.__name__, test_obj.name))
    view.breadcrumb.click_location(view.SUMMARY_TEXT)
    view = appliance.browser.create_view(data_set.obj.all_view)
    clear_search(view)
    soft_assert.(view.is_displayed, "Breadcrumb link \"{summary}\" in {obj} {name} page should navigate to {obj}s all page. navigated instead to: {url}".format(summary: view.summary_text, obj: data_set.obj.__name__, name: test_obj.name, url: view.browser.url))
  end
end
