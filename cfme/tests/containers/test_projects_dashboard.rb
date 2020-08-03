require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/container'
include Cfme::Containers::Container
require_relative 'cfme/containers/image'
include Cfme::Containers::Image
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/containers/service'
include Cfme::Containers::Service
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.ignore_stream("5.8"), pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "function"), test_requirements.containers]
PROJECT_NAME = "test-project-dashboard"
def container_project_instance(appliance, provider)
  collection_object = appliance.collections.container_projects
  return collection_object.instantiate(name: PROJECT_NAME, provider: provider)
end
def get_api_object_counts(appliance, project_name, provider)
  #  Fetches amount of Containers/Services/Images from the API per selected project name
  raise unless provider.is_a? ContainersProvider
  return {"Container" => flatten_list(provider.mgmt.list_container(namespace: project_name), flattened_list: []).size, "Service" => provider.mgmt.list_service(namespace: project_name).size, "Image" => sorted(Set.new(provider.mgmt.list_image_id(namespace: project_name))).size}
end
def flatten_list(org_list, flattened_list: [])
  # Expands nested list elements to new flatten list
  #   Use for get len for of nested list
  # 
  #   Args:
  #           org_list: (list) nested list
  #           flattened_list: (list) empty list
  #   Returns: flatten list
  #   
  for elem in org_list
    if is_bool(!elem.is_a? Array)
      flattened_list.push(elem)
    else
      flatten_list(elem, flattened_list: flattened_list)
    end
  end
  return flattened_list
end
def get_container_images_amt(provider, project_name: nil)
  #  Fetches images amount from the API per selected project name
  project_images = provider.mgmt.list_templates().select{|img| img.project == project_name}.map{|img| img}
  return project_images
end
def get_api_pods_names(provider)
  #  Fetches Pod names from the API per selected project name
  pod_name = []
  for pod in provider.mgmt.list_pods(namespace: PROJECT_NAME)
    pod_name.push(pod.metadata.name)
  end
  return pod_name
end
def test_projects_dashboard_pods(provider, soft_assert, container_project_instance)
  # Tests data integrity of Pods names in Pods status box in Projects Dashboard.
  #   Steps:
  #       * Go to Projects / Dashboard View
  #       * Compare the data in the Pods status box to API data for
  #       Pods names
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  api_pod_names = get_api_pods_names(provider)
  view = navigate_to(container_project_instance, "Dashboard")
  for field in view.pods.fields
    soft_assert.(api_pod_names.include?(field), "There is a mismatch between API and UI values: {} (API) != {} (UI)".format(api_pod_names, field))
  end
end
def test_projects_dashboard_icons(provider, appliance, soft_assert, container_project_instance)
  # Tests data integrity of Containers/Images/Services number in
  #   Projects Dashboard's status boxes.
  #   Steps:
  #       * Go to Projects / Dashboard View
  #       * Compare the data in the status boxes to API data forz
  #       Containers/Images/Services numbers
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  api_values = get_api_object_counts(appliance, PROJECT_NAME, provider)
  view = navigate_to(container_project_instance, "Dashboard")
  for containers_cls in api_values.keys()
    statusbox_value = (view.getattr((containers_cls.PLURAL.split_p(" ")[-1]).downcase())).value
    soft_assert.(api_values[containers_cls] == statusbox_value, "There is a mismatch between API and UI values: {}: {} (API) != {} (UI)".format(containers_cls.__name__, api_values[containers_cls], statusbox_value))
  end
end
def test_project_has_provider(appliance, soft_assert, provider)
  # 
  #   Test provider name existence in all projects table.
  #   Steps:
  #     * navigate to all project page
  #     * get through all the project to ensure that the provider column isn't
  #       empty on each on each of the projects
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  projects_collection = appliance.collections.container_projects
  all_project_view = navigate_to(projects_collection, "All")
  all_tables_rows = all_project_view.entities.get_all()
  raise "No table row was found" unless all_tables_rows
  for row in all_tables_rows
    curr_project_name = row.data["name"]
    curr_project_provider = row.data["provider"]
    soft_assert.(curr_project_provider, "No Provider found for project #{curr_project_name}")
  end
end
