require 'None'
require 'None'
require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/image'
include Cfme::Containers::Image
require_relative 'cfme/containers/image'
include Cfme::Containers::Image
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
require_relative 'cfme/containers/replicator'
include Cfme::Containers::Replicator
require_relative 'cfme/containers/replicator'
include Cfme::Containers::Replicator
require_relative 'cfme/containers/route'
include Cfme::Containers::Route
require_relative 'cfme/containers/route'
include Cfme::Containers::Route
require_relative 'cfme/containers/service'
include Cfme::Containers::Service
require_relative 'cfme/containers/service'
include Cfme::Containers::Service
require_relative 'cfme/containers/template'
include Cfme::Containers::Template
require_relative 'cfme/containers/template'
include Cfme::Containers::Template
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider_modscope"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "module"), test_requirements.containers]
DataSet = namedtuple("DataSet", ["obj", "collection_obj"])
TEST_OBJECTS = [DataSet.(Image, ImageCollection), DataSet.(Pod, PodCollection), DataSet.(Service, ServiceCollection), DataSet.(Route, RouteCollection), DataSet.(Template, TemplateCollection), DataSet.(Replicator, ReplicatorCollection), DataSet.(Project, ProjectCollection)]
def check_labels_in_ui(instance, name, expected_value)
  view = navigate_to(instance, "Details", force: true)
  if is_bool(view.entities.labels.is_displayed)
    begin
      return view.entities.labels.get_text_of(name) == expected_value.to_s
    rescue NameError
      return false
    end
  end
  return false
end
def random_labels(provider, appliance)
  label_data = namedtuple("label_data", ["instance", "label_name", "label_value", "status_code", "json_content"])
  data_collection = []
  for test_obj in TEST_OBJECTS
    instance = test_obj.collection_obj(appliance).get_random_instances().pop()
    label_key = fauxfactory.gen_alpha(1) + fauxfactory.gen_alphanumeric(random.randrange(1, 62))
    value = fauxfactory.gen_alphanumeric(random.randrange(1, 63))
    begin
      status_code,json_content = instance.set_label(label_key, value)
    rescue NameError
      status_code,json_content = [nil, format_exc()]
    end
    data_collection.push(label_data.(instance, label_key, value, status_code, json_content))
  end
  return data_collection
  for (_, label_key, status_code, _) in data_collection
    if is_bool(status_code && instance.get_labels().include?(label_key))
      instance.remove_label(label_key)
    end
  end
end
def test_labels_create(provider, soft_assert, random_labels)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  provider.refresh_provider_relationships()
  for (instance, label_name, label_value, status_code, json_content) in random_labels
    if is_bool(soft_assert.([200, 201].include?(status_code), json_content.to_s))
      soft_assert.(wait_for(lambda{|| check_labels_in_ui(instance, label_name, label_value)}, num_sec: 180, delay: 10, message: "Verifying label ({} = {}) for {} {} exists".format(label_name, label_value, instance.__class__.__name__, instance.name), silent_failure: true), "Could not find label ({} = {}) for {} {} in UI.".format(label_name, label_value, instance.__class__.__name__, instance.name))
    end
  end
end
def test_labels_remove(provider, soft_assert, random_labels)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  for (instance, label_name, label_value, status_code, _) in random_labels
    if is_bool(status_code)
      instance.remove_label(label_name)
    else
      logger.warning("Cannot remove label ({} = {}) for {} {}. (failed to add it previously)".format(label_name, label_value, instance.__class__.__name__, instance.name))
    end
  end
  provider.refresh_provider_relationships()
  for (instance, label_name, label_value, status_code, _) in random_labels
    if is_bool(status_code)
      soft_assert.(wait_for(lambda{|| !check_labels_in_ui(instance, label_name, label_value)}, num_sec: 180, delay: 10, message: "Verifying label ({} = {}) for {} {} removed".format(label_name, label_value, instance.__class__.__name__, instance.name), silent_failure: true), "Label ({} = {}) for {} {} found in UI (but should be removed).".format(label_name, label_value, instance.__class__.__name__, instance.name))
    end
  end
end
