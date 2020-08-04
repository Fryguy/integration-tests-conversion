require("None");
require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/image");
include(Cfme.Containers.Image);
require_relative("cfme/containers/image");
include(Cfme.Containers.Image);
require_relative("cfme/containers/pod");
include(Cfme.Containers.Pod);
require_relative("cfme/containers/pod");
include(Cfme.Containers.Pod);
require_relative("cfme/containers/project");
include(Cfme.Containers.Project);
require_relative("cfme/containers/project");
include(Cfme.Containers.Project);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/containers/replicator");
include(Cfme.Containers.Replicator);
require_relative("cfme/containers/replicator");
include(Cfme.Containers.Replicator);
require_relative("cfme/containers/route");
include(Cfme.Containers.Route);
require_relative("cfme/containers/route");
include(Cfme.Containers.Route);
require_relative("cfme/containers/service");
include(Cfme.Containers.Service);
require_relative("cfme/containers/service");
include(Cfme.Containers.Service);
require_relative("cfme/containers/template");
include(Cfme.Containers.Template);
require_relative("cfme/containers/template");
include(Cfme.Containers.Template);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.tier(1),
  pytest.mark.provider([ContainersProvider], {scope: "module"}),
  test_requirements.containers
];

const DataSet = namedtuple("DataSet", ["obj", "collection_obj"]);

const TEST_OBJECTS = [
  DataSet.call(Image, ImageCollection),
  DataSet.call(Pod, PodCollection),
  DataSet.call(Service, ServiceCollection),
  DataSet.call(Route, RouteCollection),
  DataSet.call(Template, TemplateCollection),
  DataSet.call(Replicator, ReplicatorCollection),
  DataSet.call(Project, ProjectCollection)
];

function check_labels_in_ui(instance, name, expected_value) {
  let view = navigate_to(instance, "Details", {force: true});

  if (is_bool(view.entities.labels.is_displayed)) {
    try {
      return view.entities.labels.get_text_of(name) == expected_value.to_s
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NameError) {
        return false
      } else {
        throw $EXCEPTION
      }
    }
  };

  return false
};

function random_labels(provider, appliance) {
  let label_data = namedtuple("label_data", [
    "instance",
    "label_name",
    "label_value",
    "status_code",
    "json_content"
  ]);

  let data_collection = [];

  for (let test_obj in TEST_OBJECTS) {
    let instance = test_obj.collection_obj(appliance).get_random_instances().pop();

    let label_key = fauxfactory.gen_alpha(1) + fauxfactory.gen_alphanumeric(random.randrange(
      1,
      62
    ));

    let value = fauxfactory.gen_alphanumeric(random.randrange(1, 63));

    try {
      let [status_code, json_content] = instance.set_label(
        label_key,
        value
      )
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NameError) {
        let [status_code, json_content] = [null, format_exc()]
      } else {
        throw $EXCEPTION
      }
    };

    data_collection.push(label_data.call(
      instance,
      label_key,
      value,
      status_code,
      json_content
    ))
  };

  return data_collection;

  for (let [_, label_key, status_code, _] in data_collection) {
    if (is_bool(status_code && instance.get_labels().include(label_key))) {
      instance.remove_label(label_key)
    }
  }
};

function test_labels_create(provider, soft_assert, random_labels) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  provider.refresh_provider_relationships();

  for (let [instance, label_name, label_value, status_code, json_content] in random_labels) {
    if (is_bool(soft_assert.call(
      [200, 201].include(status_code),
      json_content.to_s
    ))) {
      soft_assert.call(
        wait_for(
          () => check_labels_in_ui(instance, label_name, label_value),

          {
            num_sec: 180,
            delay: 10,

            message: "Verifying label ({} = {}) for {} {} exists".format(
              label_name,
              label_value,
              instance.__class__.__name__,
              instance.name
            ),

            silent_failure: true
          }
        ),

        "Could not find label ({} = {}) for {} {} in UI.".format(
          label_name,
          label_value,
          instance.__class__.__name__,
          instance.name
        )
      )
    }
  }
};

function test_labels_remove(provider, soft_assert, random_labels) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  for (let [instance, label_name, label_value, status_code, _] in random_labels) {
    if (is_bool(status_code)) {
      instance.remove_label(label_name)
    } else {
      logger.warning("Cannot remove label ({} = {}) for {} {}. (failed to add it previously)".format(
        label_name,
        label_value,
        instance.__class__.__name__,
        instance.name
      ))
    }
  };

  provider.refresh_provider_relationships();

  for (let [instance, label_name, label_value, status_code, _] in random_labels) {
    if (is_bool(status_code)) {
      soft_assert.call(
        wait_for(
          () => !check_labels_in_ui(instance, label_name, label_value),

          {
            num_sec: 180,
            delay: 10,

            message: "Verifying label ({} = {}) for {} {} removed".format(
              label_name,
              label_value,
              instance.__class__.__name__,
              instance.name
            ),

            silent_failure: true
          }
        ),

        "Label ({} = {}) for {} {} found in UI (but should be removed).".format(
          label_name,
          label_value,
          instance.__class__.__name__,
          instance.name
        )
      )
    }
  }
}
