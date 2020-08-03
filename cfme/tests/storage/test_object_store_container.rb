require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.provider([OpenStackProvider], scope: "module")]
def container(appliance, provider)
  collection = appliance.collections.object_store_containers.filter({"provider" => provider})
  conts = collection.all()
  if is_bool(!conts)
    cont = collection.instantiate(key: fauxfactory.gen_alpha(start: "cont_"), provider: provider)
    provider.mgmt.create_container(cont.key)
    collection.manager.refresh()
    wait_for(lambda{|| cont.exists}, delay: 30, timeout: 1200, fail_func: provider.browser.refresh)
    return cont
  else
    return conts[0]
  end
end
def test_storage_object_store_container_add_remove_tag(container)
  # 
  #   Requires:
  #       OpenstackProvider
  # 
  #   Polarion:
  #       assignee: anikifor
  #       caseimportance: medium
  #       casecomponent: Cloud
  #       initialEstimate: 1/8h
  #       startsin: 5.7
  #       testSteps:
  #           1. Add Object Store Container
  #           2. go to summery pages
  #           3. add tag : [Policy > Edit Tags]
  #           4. remove tag: [Policy > Edit Tags]
  #       expectedResults:
  #           1.
  #           2.
  #           3. Verify the tag is assigned
  #           4. Verify the tag is removed
  #   
  added_tag = container.add_tag()
  tag_available = container.get_tags()
  raise unless tag_available[0].display_name == added_tag.display_name
  raise unless tag_available[0].category.display_name == added_tag.category.display_name
  container.remove_tag(added_tag)
  tag_available = container.get_tags()
  raise unless !tag_available
end
