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
TEST_ITEMS = [ContainersTestItem(Image, "openscap_multi_image_on", is_openscap: false, tested_attr: TESTED_ATTRIBUTES__openscap_off), ContainersTestItem(Image, "openscap_multi_image_off", is_openscap: true, tested_attr: TESTED_ATTRIBUTES__openscap_on)]
TASKS_RUN_PARALLEL = 3
TASK_TIMEOUT = 20
NUM_SELECTED_IMAGES = 4
def delete_all_container_tasks(appliance)
  col = appliance.collections.tasks.filter({"tab" => "AllTasks"})
  col.delete_all()
end
def random_image_instances(appliance)
  collection = appliance.collections.container_images
  filter_image_collection = collection.filter({"active" => true, "redhat_registry" => true})
  return random.sample(filter_image_collection.all(), NUM_SELECTED_IMAGES)
end
def test_check_compliance_on_multiple_images(provider, random_image_instances, appliance)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  collection = appliance.collections.container_images
  conditions = []
  for image_instance in random_image_instances
    conditions.push({"id" => image_instance.id})
  end
  collection.assign_policy_profiles_multiple_entities(random_image_instances, conditions, "OpenSCAP profile")
  collection.check_compliance_multiple_images(random_image_instances)
end
def get_table_attr(instance, table_name, attr)
  view = navigate_to(instance, "Details", force: true)
  table = view.entities.getattr(table_name, nil)
  if is_bool(table)
    return table.read().get(attr)
  end
end
def test_containers_smartstate_analysis_multiple_images(provider, test_item, delete_all_container_tasks, soft_assert, random_image_instances, appliance)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  collection = appliance.collections.container_images
  conditions = []
  for image_instance in random_image_instances
    conditions.push({"id" => image_instance.id})
  end
  if is_bool(test_item.is_openscap)
    collection.assign_policy_profiles_multiple_entities(random_image_instances, conditions, "OpenSCAP profile")
  else
    collection.unassign_policy_profiles_multiple_entities(random_image_instances, conditions, "OpenSCAP profile")
  end
  timeout = "{timeout}M".format(timeout: (NUM_SELECTED_IMAGES % TASKS_RUN_PARALLEL == 0) ? (NUM_SELECTED_IMAGES / TASKS_RUN_PARALLEL.to_f) * TASK_TIMEOUT : ((NUM_SELECTED_IMAGES / TASKS_RUN_PARALLEL.to_f) * TASK_TIMEOUT) + TASK_TIMEOUT)
  raise "Some Images SSA tasks finished with error message, see logger for more details." unless collection.perform_smartstate_analysis_multiple_images(random_image_instances, wait_for_finish: true, timeout: timeout)
  for image_instance in random_image_instances
    view = navigate_to(image_instance, "Details")
    for (tbl, attr, verifier) in test_item.tested_attr
      table = view.entities.getattr(tbl)
      table_data = table.read().to_a().map{|k, v|[k.downcase(), v]}.to_h
      if is_bool(!soft_assert.(table_data.include?(attr.downcase()), ))
        next
      end
      provider.refresh_provider_relationships()
      wait_for_retval = wait_for(lambda{|| get_table_attr(image_instance, tbl, attr)}, message: "Trying to get attribute \"{}\" of table \"{}\"".format(attr, tbl), delay: 5, num_sec: 120, silent_failure: true)
      if is_bool(!wait_for_retval)
        soft_assert.(false, "Could not get attribute \"{}\" for \"{}\" table.".format(attr, tbl))
        next
      end
      value = wait_for_retval.out
      soft_assert.(verifier(value), )
    end
  end
end
