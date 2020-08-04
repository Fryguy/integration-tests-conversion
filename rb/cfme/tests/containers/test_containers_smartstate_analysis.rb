require 'None'
require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/image'
include Cfme::Containers::Image
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.meta(server_roles: "+smartproxy"), pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "function"), test_requirements.containers]
AttributeToVerify = namedtuple("AttributeToVerify", ["table", "attr", "verifier"])
TESTED_ATTRIBUTES__openscap_off = [AttributeToVerify.("configuration", "OpenSCAP Results", bool), AttributeToVerify.("configuration", "OpenSCAP HTML", lambda{|val| val == "Available"}), AttributeToVerify.("configuration", "Last scan", dateparser.parse)]
TESTED_ATTRIBUTES__openscap_on = TESTED_ATTRIBUTES__openscap_off + [AttributeToVerify.("compliance", "Status", lambda{|val| val.downcase() != "never verified"}), AttributeToVerify.("compliance", "History", lambda{|val| val == "Available"})]
TEST_ITEMS = [ContainersTestItem(Image, "openscap_off", is_openscap: false, tested_attr: TESTED_ATTRIBUTES__openscap_off), ContainersTestItem(Image, "openscap_on", is_openscap: true, tested_attr: TESTED_ATTRIBUTES__openscap_on)]
NUM_SELECTED_IMAGES = 1
def delete_all_container_tasks(appliance)
  col = appliance.collections.tasks.filter({"tab" => "AllTasks"})
  col.delete_all()
end
def random_image_instance(appliance)
  collection = appliance.collections.container_images
  filter_image_collection = collection.filter({"active" => true, "redhat_registry" => true})
  return random.sample(filter_image_collection.all(), NUM_SELECTED_IMAGES).pop()
end
def test_manage_policies_navigation(random_image_instance)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  random_image_instance.assign_policy_profiles("OpenSCAP profile")
end
def test_check_compliance(random_image_instance)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  random_image_instance.assign_policy_profiles("OpenSCAP profile")
  random_image_instance.check_compliance()
end
def get_table_attr(instance, table_name, attr)
  view = navigate_to(instance, "Details", force: true)
  table = view.entities.getattr(table_name, nil)
  if is_bool(table)
    return table.read().get(attr)
  end
end
def test_containers_smartstate_analysis(provider, test_item, soft_assert, delete_all_container_tasks, random_image_instance)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  if is_bool(test_item.is_openscap)
    random_image_instance.assign_policy_profiles("OpenSCAP profile")
  else
    random_image_instance.unassign_policy_profiles("OpenSCAP profile")
  end
  random_image_instance.perform_smartstate_analysis(wait_for_finish: true)
  view = navigate_to(random_image_instance, "Details")
  for (tbl, attr, verifier) in test_item.tested_attr
    table = view.entities.getattr(tbl)
    table_data = table.read().to_a().map{|k, v|[k.downcase(), v]}.to_h
    if is_bool(!soft_assert.(table_data.include?(attr.downcase()), "#{tbl} table has missing attribute '#{attr}'"))
      next
    end
    provider.refresh_provider_relationships()
    wait_for_retval = wait_for(lambda{|| get_table_attr(random_image_instance, tbl, attr)}, message: "Trying to get attribute \"{}\" of table \"{}\"".format(attr, tbl), delay: 5, num_sec: 120, silent_failure: true)
    if is_bool(!wait_for_retval)
      soft_assert.(false, "Could not get attribute \"{}\" for \"{}\" table.".format(attr, tbl))
      next
    end
    value = wait_for_retval.out
    soft_assert.(verifier(value), "#{tbl}.#{attr} attribute has unexpected value (#{value})")
  end
end
def test_containers_smartstate_analysis_api(provider, test_item, soft_assert, delete_all_container_tasks, random_image_instance)
  # 
  #      Test initiating a SmartState Analysis scan via the CFME API through the ManageIQ API Client
  #      entity class.
  # 
  #      RFE: BZ 1486362
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  if is_bool(test_item.is_openscap)
    random_image_instance.assign_policy_profiles("OpenSCAP profile")
  else
    random_image_instance.unassign_policy_profiles("OpenSCAP profile")
  end
  original_scan = random_image_instance.last_scan_attempt_on
  random_image_instance.scan()
  task = provider.appliance.collections.tasks.instantiate(name: "Container Image Analysis: '#{random_image_instance.name}'", tab: "AllTasks")
  task.wait_for_finished()
  soft_assert.(original_scan != random_image_instance.last_scan_attempt_on, "SmartState Anaysis scan has failed")
end
