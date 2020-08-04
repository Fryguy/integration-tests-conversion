require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/image");
include(Cfme.Containers.Image);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.meta({server_roles: "+smartproxy"}),
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(1),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

const AttributeToVerify = namedtuple(
  "AttributeToVerify",
  ["table", "attr", "verifier"]
);

const TESTED_ATTRIBUTES__openscap_off = [
  AttributeToVerify.call("configuration", "OpenSCAP Results", bool),

  AttributeToVerify.call(
    "configuration",
    "OpenSCAP HTML",
    val => val == "Available"
  ),

  AttributeToVerify.call(
    "configuration",
    "Last scan",
    dateparser.parse
  )
];

const TESTED_ATTRIBUTES__openscap_on = TESTED_ATTRIBUTES__openscap_off + [
  AttributeToVerify.call(
    "compliance",
    "Status",
    val => val.downcase() != "never verified"
  ),

  AttributeToVerify.call(
    "compliance",
    "History",
    val => val == "Available"
  )
];

const TEST_ITEMS = [
  ContainersTestItem(
    Image,
    "openscap_multi_image_on",
    {is_openscap: false, tested_attr: TESTED_ATTRIBUTES__openscap_off}
  ),

  ContainersTestItem(
    Image,
    "openscap_multi_image_off",
    {is_openscap: true, tested_attr: TESTED_ATTRIBUTES__openscap_on}
  )
];

const TASKS_RUN_PARALLEL = 3;
const TASK_TIMEOUT = 20;
const NUM_SELECTED_IMAGES = 4;

function delete_all_container_tasks(appliance) {
  let col = appliance.collections.tasks.filter({tab: "AllTasks"});
  col.delete_all()
};

function random_image_instances(appliance) {
  let collection = appliance.collections.container_images;

  let filter_image_collection = collection.filter({
    active: true,
    redhat_registry: true
  });

  return random.sample(
    filter_image_collection.all(),
    NUM_SELECTED_IMAGES
  )
};

function test_check_compliance_on_multiple_images(provider, random_image_instances, appliance) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let collection = appliance.collections.container_images;
  let conditions = [];

  for (let image_instance in random_image_instances) {
    conditions.push({id: image_instance.id})
  };

  collection.assign_policy_profiles_multiple_entities(
    random_image_instances,
    conditions,
    "OpenSCAP profile"
  );

  collection.check_compliance_multiple_images(random_image_instances)
};

function get_table_attr(instance, table_name, attr) {
  let view = navigate_to(instance, "Details", {force: true});
  let table = view.entities.getattr(table_name, null);
  if (is_bool(table)) return table.read().get(attr)
};

function test_containers_smartstate_analysis_multiple_images(provider, test_item, delete_all_container_tasks, soft_assert, random_image_instances, appliance) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let collection = appliance.collections.container_images;
  let conditions = [];

  for (let image_instance in random_image_instances) {
    conditions.push({id: image_instance.id})
  };

  if (is_bool(test_item.is_openscap)) {
    collection.assign_policy_profiles_multiple_entities(
      random_image_instances,
      conditions,
      "OpenSCAP profile"
    )
  } else {
    collection.unassign_policy_profiles_multiple_entities(
      random_image_instances,
      conditions,
      "OpenSCAP profile"
    )
  };

  let timeout = "{timeout}M".format({timeout: (NUM_SELECTED_IMAGES % TASKS_RUN_PARALLEL == 0 ? (NUM_SELECTED_IMAGES / TASKS_RUN_PARALLEL.to_f) * TASK_TIMEOUT : ((NUM_SELECTED_IMAGES / TASKS_RUN_PARALLEL.to_f) * TASK_TIMEOUT) + TASK_TIMEOUT)});

  if (!collection.perform_smartstate_analysis_multiple_images(
    random_image_instances,
    {wait_for_finish: true, timeout}
  )) {
    throw "Some Images SSA tasks finished with error message, see logger for more details."
  };

  for (let image_instance in random_image_instances) {
    let view = navigate_to(image_instance, "Details");

    for (let [tbl, attr, verifier] in test_item.tested_attr) {
      let table = view.entities.getattr(tbl);
      let table_data = table.read().to_a().map((k, v) => [k.downcase(), v]).to_h;

      if (is_bool(!soft_assert.call(
        table_data.include(attr.downcase()),
        `${tbl} table has missing attribute '${attr}'`
      ))) continue;

      provider.refresh_provider_relationships();

      let wait_for_retval = wait_for(
        () => get_table_attr(image_instance, tbl, attr),

        {
          message: "Trying to get attribute \"{}\" of table \"{}\"".format(
            attr,
            tbl
          ),

          delay: 5,
          num_sec: 120,
          silent_failure: true
        }
      );

      if (is_bool(!wait_for_retval)) {
        soft_assert.call(
          false,
          "Could not get attribute \"{}\" for \"{}\" table.".format(attr, tbl)
        );

        continue
      };

      let value = wait_for_retval.out;

      soft_assert.call(
        verifier(value),
        `${tbl}.${attr} attribute has unexpected value (${value})`
      )
    }
  }
}
