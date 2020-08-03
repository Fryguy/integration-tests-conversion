require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/storage/manager'
include Cfme::Storage::Manager
require_relative 'cfme/storage/manager'
include Cfme::Storage::Manager
require_relative 'cfme/storage/manager'
include Cfme::Storage::Manager
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), test_requirements.storage, pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([EC2Provider, OpenStackProvider], scope: "module"), pytest.mark.uncollectif(lambda{|manager, provider| provider.one_of(EC2Provider) && manager.include?("object_managers")}, reason: "Object Storage not supported by EC2Provider")]
def provider_cleanup(provider)
  yield
  if is_bool(provider.exists)
    provider.delete_rest()
    provider.wait_for_delete()
  end
end
def manager(request, appliance, provider)
  begin
    collection = appliance.collections.getattr(request.param).filter({"provider" => provider})
  rescue NoMethodError
    pytest.skip("Appliance collections did not include parametrized storage manager type ({})".format(request.param))
  end
  yield(collection.all()[0])
end
def test_manager_navigation(manager)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #       caseimportance: critical
  #   
  view = navigate_to(manager.parent, "All")
  raise unless view.is_displayed
  view = navigate_to(manager, "Details")
  raise unless view.is_displayed
  manager.refresh()
end
def test_storage_manager_edit_tag(manager)
  #  Test add and remove tag to storage manager
  # 
  #   prerequisites:
  #       * Storage provider
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       testSteps:
  #           * Add tag and check
  #           * Remove tag and check
  #   
  added_tag = manager.add_tag()
  tag_available = manager.get_tags()
  raise unless tag_available[0].display_name == added_tag.display_name
  raise unless tag_available[0].category.display_name == added_tag.category.display_name
  manager.remove_tag(added_tag)
  tag_available = manager.get_tags()
  raise unless !tag_available
end
def test_storage_manager_delete(manager, provider_cleanup)
  #  Test delete storage manager
  # 
  #   prerequisites:
  #       * Storage provider
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       testSteps:
  #           * Delete storage manager from inventory
  #           * Assert flash message
  #           * Check storage manager exists or not
  #   
  manager.delete()
  view = manager.create_view(StorageManagerDetailsView)
  view.flash.assert_success_message("Delete initiated for 1 Storage Manager from the CFME Database")
  raise unless !manager.exists
end
def test_storage_manager_navigation_from_cloudprovider(manager, provider)
  #  Test whether Storage Manager is accessible from Cloud Provider
  # 
  #   prerequisites:
  #       * Storage provider
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #       caseimportance: high
  #       testSteps:
  #           * Go to Cloud Provider summary
  #           * Check whether Cloud Provider has any Storage Managers
  #           * Click on Storage managers
  #           * Select Storage Manager from list
  #           * Check whether Storage Manager's Summary is displayed correctly
  #   
  view = navigate_to(provider, "Details")
  manager_count = view.entities.summary("Relationships").get_text_of("Storage Managers").to_i
  raise unless manager_count > 0
  view.entities.summary("Relationships").click_at("Storage Managers")
  storage_view = view.browser.create_view(ProviderStorageManagerAllView)
  raise unless storage_view.table.row_count == manager_count
  storage_view.paginator.find_row_on_pages(storage_view.table, Name: manager.name).click()
  storage_detail_view = storage_view.browser.create_view(StorageManagerDetailsView)
  raise unless storage_detail_view.title.text == "#{manager.name} (Summary)"
end
def test_storage_manager_quadicon_numbers(manager, provider, provider_cleanup, request)
  #  Test whether Storage Manager QuadIcon shows correct numbers
  #   Bugzilla: 1650086
  # 
  #   prerequisites:
  #       * Storage provider
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/8h
  #       casecomponent: Cloud
  #       caseimportance: high
  #       testSteps:
  #           * Go to Cloud Provider List
  #           * Check Quadicon
  #           * Compare quadicon with provider's relationships
  #   
  view = navigate_to(manager.parent, "All")
  view.toolbar.view_selector.select("Grid View")
  quad_data = view.entities.get_entities_by_keys(name: manager.name)[0].data.get("quad", {})
  if is_bool(manager.parent.is_a? ObjectManagerCollection)
    quad_container_count = quad_data["topLeft"]["text"].to_i
    view = navigate_to(manager, "Details")
    container_count = view.entities.relationships.get_text_of("Cloud object store containers").to_i
    raise unless quad_container_count == container_count
  else
    quad_volume_count = quad_data["topLeft"]["text"].to_i
    quad_snapshot_count = quad_data["topRight"]["text"].to_i
    view = navigate_to(manager, "Details")
    volume_count = view.entities.relationships.get_text_of("Cloud Volumes").to_i
    snapshot_count = view.entities.relationships.get_text_of("Cloud Volume Snapshots").to_i
    raise unless quad_volume_count == volume_count
    raise unless quad_snapshot_count == snapshot_count
  end
end
