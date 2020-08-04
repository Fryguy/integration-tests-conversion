require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(2), pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([ContainersProvider], scope: "function"), test_requirements.containers]
objects_mapping = {"Containers Providers" => ContainersProvider, "Nodes" => "container_nodes", "Pods" => "container_pods", "Services" => "container_services", "Routes" => "container_routes", "Containers" => "containers", "Projects" => "container_projects", "Replicators" => "container_replicators", "Container Images" => "container_images", "Image Registries" => "container_image_registries"}
def test_default_views(request, appliance, group_name, new_default_view)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  collection_name = objects_mapping[group_name]
  default_views = appliance.user.my_settings.default_views
  orig_default = default_views.get_default_view(group_name)
  default_views.set_default_view(group_name, new_default_view)
  request.addfinalizer(lambda{|| default_views.set_default_view(group_name, orig_default)})
  obj = (collection_name === ContainersProvider) ? ContainersProvider : appliance.collections.getattr(collection_name)
  view = navigate_to(obj, "All", use_resetter: false)
  raise unless view.toolbar.view_selector.selected == new_default_view
  default_views.set_default_view(group_name, orig_default)
end
def test_table_views(appliance, selected_view, container_obj)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  collection_name = objects_mapping[container_obj]
  obj = (collection_name === ContainersProvider) ? ContainersProvider : appliance.collections.getattr(collection_name)
  view = navigate_to(obj, "All")
  view.toolbar.view_selector.select(selected_view)
  raise "Failed to set view #{view} For #{collection_name}" unless selected_view == view.toolbar.view_selector.selected
end
