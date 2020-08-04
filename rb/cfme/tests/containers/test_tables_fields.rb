require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/container'
include Cfme::Containers::Container
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
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/containers/replicator'
include Cfme::Containers::Replicator
require_relative 'cfme/containers/route'
include Cfme::Containers::Route
require_relative 'cfme/containers/service'
include Cfme::Containers::Service
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "function"), test_requirements.containers]
TEST_ITEMS = [ContainersTestItem(ContainersProvider, "container_provider_table_fields", fields_to_verify: ["hostname", "port", "type"], collection_name: nil), ContainersTestItem(Route, "route__table_fields", fields_to_verify: ["provider", "project_name"], collection_name: "container_routes"), ContainersTestItem(Container, "container__table_fields", fields_to_verify: ["pod_name", "image", "state"], collection_name: "containers"), ContainersTestItem(Pod, "pod__table_fields", fields_to_verify: ["provider", "project_name", "ready", "containers", "phase", "restart_policy", "dns_policy"], collection_name: "container_pods"), ContainersTestItem(Service, "service_table_fields9", fields_to_verify: ["provider", "project_name", "type", "portal_ip", "session_affinity", "pods"], collection_name: "container_services"), ContainersTestItem(Node, "node_table_fields", fields_to_verify: ["provider", "ready", "operating_system", "kernel_version", "runtime_version"], collection_name: "container_nodes"), ContainersTestItem(Replicator, "replicator_table_fields", fields_to_verify: ["provider", "project_name", "replicas", "current_replicas"], collection_name: "container_replicators"), ContainersTestItem(Image, "image_table_fields", fields_to_verify: ["provider", "tag", "id", "image_registry"], collection_name: "container_images"), ContainersTestItem(ImageRegistry, "image_registry_table_fields", fields_to_verify: ["port", "provider"], collection_name: "container_image_registries"), ContainersTestItem(Project, "project_table_fields", fields_to_verify: ["provider", "container_routes", "container_services", "container_replicators", "pods", "containers", "images"], collection_name: "container_projects")]
def test_tables_fields(provider, test_item, soft_assert, appliance)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  view = navigate_to((test_item.obj === ContainersProvider) ? test_item.obj : appliance.collections.getattr(test_item.collection_name), "All")
  view.toolbar.view_selector.select("List View")
  for row in view.entities.elements.rows()
    name_field = row.getattr("name", row.getattr("host", nil))
    name = name_field.text
    for field in test_item.fields_to_verify
      begin
        value = row.getattr(field)
      rescue NoMethodError
        soft_assert.(false, "{}'s list table: field  not exist: {}".format(test_item.obj.__name__, field))
        next
      end
      soft_assert.(value, ("{}'s list table: {} row - has empty field: {}").format(test_item.obj.__name__, name, field))
    end
  end
end
def test_containers_details_view_title(appliance)
  # 
  #   The word summery has to apper as part of the container title
  #   In this test the detail container view is tested
  #   Test based on BZ1338801
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  random_container = appliance.collections.containers.all().pop()
  view = navigate_to(random_container, "Details")
  raise "The word \"Summary\" is missing in container details view" unless view.title.text.include?("Summary")
end
