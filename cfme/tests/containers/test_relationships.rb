require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/container'
include Cfme::Containers::Container
require_relative 'cfme/containers/container'
include Cfme::Containers::Container
require_relative 'cfme/containers/image'
include Cfme::Containers::Image
require_relative 'cfme/containers/image'
include Cfme::Containers::Image
require_relative 'cfme/containers/image_registry'
include Cfme::Containers::Image_registry
require_relative 'cfme/containers/image_registry'
include Cfme::Containers::Image_registry
require_relative 'cfme/containers/node'
include Cfme::Containers::Node
require_relative 'cfme/containers/node'
include Cfme::Containers::Node
require_relative 'cfme/containers/pod'
include Cfme::Containers::Pod
require_relative 'cfme/containers/pod'
include Cfme::Containers::Pod
require_relative 'cfme/containers/project'
include Cfme::Containers::Project
require_relative 'cfme/containers/project'
include Cfme::Containers::Project
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/containers/replicator'
include Cfme::Containers::Replicator
require_relative 'cfme/containers/replicator'
include Cfme::Containers::Replicator
require_relative 'cfme/containers/service'
include Cfme::Containers::Service
require_relative 'cfme/containers/service'
include Cfme::Containers::Service
require_relative 'cfme/containers/template'
include Cfme::Containers::Template
require_relative 'cfme/containers/template'
include Cfme::Containers::Template
require_relative 'cfme/containers/volume'
include Cfme::Containers::Volume
require_relative 'cfme/containers/volume'
include Cfme::Containers::Volume
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "module"), test_requirements.containers]
TEST_ITEMS = [ContainersTestItem(ContainersProvider, "container_provider_relationships", collection_obj: nil), ContainersTestItem(Container, "container_relationships", collection_obj: ContainerCollection), ContainersTestItem(Pod, "pod_relationships", collection_obj: PodCollection), ContainersTestItem(Service, "service_relationships", collection_obj: ServiceCollection), ContainersTestItem(Node, "node_relationships", collection_obj: NodeCollection), ContainersTestItem(Replicator, "replicator_relationships", collection_obj: ReplicatorCollection), ContainersTestItem(Image, "image_relationships", collection_obj: ImageCollection), ContainersTestItem(ImageRegistry, "image_registry_relationships", collection_obj: ImageRegistryCollection), ContainersTestItem(Project, "project_relationships", collection_obj: ProjectCollection), ContainersTestItem(Template, "template_relationships", collection_obj: TemplateCollection), ContainersTestItem(Volume, "volume_relationships", collection_obj: VolumeCollection)]
def test_relationships_tables(soft_assert, provider, has_persistent_volume, appliance, test_item)
  # This test verifies the integrity of the Relationships table.
  #   clicking on each field in the Relationships table takes the user
  #   to either Summary page where we verify that the field that appears
  #   in the Relationships table also appears in the Properties table,
  #   or to the page where the number of rows is equal to the number
  #   that is displayed in the Relationships table.
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  instances = (test_item.obj === ContainersProvider) ? [provider] : test_item.collection_obj(appliance).all()
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
  relationships_rows = view.entities.summary("Relationships").fields
  for row_entry in relationships_rows
    text_of_field = view.entities.summary("Relationships").get_text_of(row_entry)
    if text_of_field == "0"
      next
    end
    view.entities.summary("Relationships").click_at(row_entry)
    if is_bool(text_of_field.isdigit())
      new_view = appliance.browser.create_view(test_item.obj.all_view)
      value = text_of_field.to_i
      items_amount = new_view.paginator.items_amount.to_i
      soft_assert.(items_amount == value, "Mismatch between relationships table value and item amount in the object table: field: {}; relationships_table: {}; object table: {};".format(text_of_field, value, instance.name, items_amount))
    else
      new_view = appliance.browser.create_view(test_item.obj.details_view)
      raise unless new_view.breadcrumb.active_location.include?(text_of_field)
    end
    view = navigate_to(test_obj, "Details")
  end
end
