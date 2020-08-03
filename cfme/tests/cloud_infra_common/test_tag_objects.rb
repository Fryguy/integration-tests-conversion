# This module tests tagging of objects in different locations.
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(2), pytest.mark.usefixtures("setup_provider"), test_requirements.tag]
infra_test_items = [["infra_provider", "All"], ["infra_vms", "AllForProvider"], ["infra_templates", "AllForProvider"], ["hosts", "All"], ["clusters", "All"], ["datastores", "All"]]
cloud_test_items = [["cloud_host_aggregates", "All"], ["cloud_provider", "All"], ["cloud_instances", "AllForProvider"], ["cloud_flavors", "All"], ["cloud_av_zones", "All"], ["cloud_tenants", "All"], ["cloud_keypairs", "All"], ["cloud_images", "AllForProvider"], ["block_managers", "All"], ["object_managers", "All"]]
def get_collection_entity(appliance, collection_name, destination, provider)
  if ["infra_provider", "cloud_provider"].include?(collection_name)
    return provider
  else
    collection = appliance.collections.getattr(collection_name)
    collection.filters = {"provider" => provider}
    begin
      return collection.all()[0]
    rescue IndexError
      pytest.skip("No content found for test")
    end
  end
end
def tag_cleanup(test_item, tag)
  tags = test_item.get_tags()
  if is_bool(tags)
    result = tags.map{|object_tags| !object_tags.category.display_name == tag.category.display_name && !object_tags.display_name == tag.display_name}
    if is_bool(!result)
      test_item.remove_tag(tag: tag)
    end
  end
end
def cloud_test_item(request, appliance, provider)
  collection_name,destination = request.param
  return get_collection_entity(appliance, collection_name, destination, provider)
end
def infra_test_item(request, appliance, provider)
  collection_name,destination = request.param
  return get_collection_entity(appliance, collection_name, destination, provider)
end
def tagging_check(tag, request)
  _tagging_check = lambda do |test_item, tag_place|
    #  Check if tagging is working
    #         1. Add tag
    #         2. Check assigned tag on details page
    #         3. Remove tag
    #         4. Check tag unassigned on details page
    #     
    test_item.add_tag(tag: tag, details: tag_place)
    tags = test_item.get_tags()
    raise  unless tags.include?(tag)
    test_item.remove_tag(tag: tag, details: tag_place)
    tags = test_item.get_tags()
    raise  unless !tags.include?(tag)
    request.addfinalizer(lambda{|| tag_cleanup(test_item, tag)})
  end
  return _tagging_check
end
def tag_vm(provider, appliance)
  # Get a random vm to tag
  view = navigate_to(provider, "ProviderVms")
  all_names = view.entities.all_entity_names
  return appliance.collections.infra_vms.instantiate(name: all_names[0], provider: provider)
end
def tag_out_of_10k_values(appliance)
  # Add 10000 values to one of the existing tag category
  result = appliance.ssh_client.run_rails_console("Classification.first.description").output
  category_name = ((result.split_p("description")[-1]).strip()).strip("\"")
  values = appliance.ssh_client.run_rails_console("10000.times { |i| Classification.first.add_entry(:name => i.to_s, :description => i.to_s)}")
  raise unless values.success
  category = appliance.collections.categories.instantiate(category_name)
  tag = category.collections.tags.instantiate(name: "9786", display_name: "9786")
  yield tag
  remove = appliance.ssh_client.run_rails_console("10000.times { |i| Classification.first.entries.last.delete }")
  raise unless remove.success
end
def test_tag_cloud_objects(tagging_check, cloud_test_item, tag_place)
  #  Test for cloud items tagging action from list and details pages
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/12h
  #   
  tagging_check.(cloud_test_item, tag_place)
end
def test_tagvis_cloud_object(check_item_visibility, cloud_test_item, visibility, appliance, request, tag)
  #  Tests infra provider and its items honors tag visibility
  #   Prerequisites:
  #       Catalog, tag, role, group and restricted user should be created
  #   Steps:
  #       1. As admin add tag
  #       2. Login as restricted user, item is visible for user
  #       3. As admin remove tag
  #       4. Login as restricted user, item is not visible for user
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       initialEstimate: 1/4h
  #   
  check_item_visibility.(cloud_test_item, visibility)
  request.addfinalizer(lambda{|| tag_cleanup(cloud_test_item, tag)})
end
def test_tag_infra_objects(tagging_check, infra_test_item, tag_place)
  #  Test for infrastructure items tagging action from list and details pages
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/12h
  #   
  tagging_check.(infra_test_item, tag_place)
end
def test_tag_vm_10k_category(tag_out_of_10k_values, tag_vm, request)
  #  Test tagging a VM is successful even when a category has 10k values in it
  # 
  #   Bugzilla:
  #       1726313
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/6h
  #   
  tag_vm.add_tag(tag: tag_out_of_10k_values)
  tags = tag_vm.get_tags()
  request.addfinalizer(lambda{|| tag_cleanup(tag_vm, tag_out_of_10k_values)})
  raise unless tags.include?(tag_out_of_10k_values)
end
def test_tagvis_infra_object(infra_test_item, check_item_visibility, visibility, request, tag)
  #  Tests infra provider and its items honors tag visibility
  #   Prerequisites:
  #       Catalog, tag, role, group and restricted user should be created
  #   Steps:
  #       1. As admin add tag
  #       2. Login as restricted user, item is visible for user
  #       3. As admin remove tag
  #       4. Login as restricted user, iten is not visible for user
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       initialEstimate: 1/12h
  #   
  check_item_visibility.(infra_test_item, visibility)
  request.addfinalizer(lambda{|| tag_cleanup(infra_test_item, tag)})
end
def test_tagvis_tag_host_vm_combination()
  # 
  #   Combine My Company tag tab restriction, with Clusters&Host tab and
  #   VM&templates
  #   User should be restricted to see tagged host and vm, template
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_config_manager_provider()
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       startsin: 5.9
  #       testSteps:
  #           1. Add Configuration Manager Provider
  #           2. Add tag
  #           3. Check item as restricted user
  #   
  # pass
end
def test_tagvis_storage_provider_children()
  # 
  #   Providers children should not be visible for
  #   restricted user
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       testSteps:
  #           1. Tag provider
  #           2. Login as restricted user
  #           3. Check Providers children visibility
  #   
  # pass
end
def test_tagvis_cluster_change()
  # 
  #   Enable / Disable a Cluster in the group and check its visibility
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_vm_and_template_modified()
  # 
  #   Enable / Disable a VM's and Template's in the group and check its
  #   visibility
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_host_change()
  # 
  #   Enable / Disable a host in the group and check its visibility
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_tag_and_cluster_combination()
  # 
  #   Combine My Company tag tab restriction, with Clusters&Host tab
  #   Visible cluster should match both tab restrictions
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_tag_cluster_vm_combination()
  # 
  #   Combine My Company tag, Cluster and VM/Template
  #   All restriction should be applied for vm and template
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_cluster_and_vm_combination()
  # 
  #   Combine Host&Cluster with VM&Templates
  #   Check restricted user can see Cluster and only VMs and Templates from
  #   this cluster
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_tag_and_host_combination()
  # 
  #   Combine My Company tag tab restriction, with Clusters&Host tab
  #   Visible host should match both tab restrictions
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_tag_and_vm_combination()
  # 
  #   Combine My Company tag restriction tab with VM&Tepmlates restriction
  #   tab
  #   Vm , template should match both tab restrictions
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_ldap_group_host()
  # 
  #   Add LDAP group, assign a host permission and check for the visibility
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_configuration_management_configured_system()
  # 
  #   Tag a configuration management's configured system and check for its
  #   visibility
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  # pass
end
def test_tagvis_group_filter_network_provider()
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       testSteps:
  #           1. Add cloud provider
  #           2. Create group and select cloud network provider in \"Cluster&Hosts\"
  #           filter
  #           3. Create user assigned to group from step 1
  #           4. As restricted user, login and navigate to Network Provider
  #           User should see network provider + all its children
  #           5.Repeat this case with tag filter
  #   
  # pass
end
def test_tagvis_infra_networking_switch()
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: low
  #       initialEstimate: 1/8h
  #       testSteps:
  #           1. Create group with tag, use this group for user creation
  #           2. Add tag(used in group) for infra networking switch via detail page
  #           3. Remove tag for infra networking switch via detail page
  #           4. Add tag for infra networking switch via list
  #           5. Check infra networking switch is visible for restricted user
  #           6. Remove tag for infra networking switch via list
  #           7 . Check infra networking switch isn\"t visible for restricted user
  #   
  # pass
end
def test_tagvis_performance_reports()
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/3h
  #       testSteps:
  #           1. Create role with group and user restriction
  #           2. Create groups with tag
  #           3. Create user with selected group
  #           4. Set the group ownership and tag for one of VMs
  #           5. Generate performance report
  #           6. As user add widget to dashboard
  #           7. Check widget content -> User should see only one vm with set
  #           ownership and tag
  #   
  # pass
end
