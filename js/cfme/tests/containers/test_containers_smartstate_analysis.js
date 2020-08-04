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
    "openscap_off",
    {is_openscap: false, tested_attr: TESTED_ATTRIBUTES__openscap_off}
  ),

  ContainersTestItem(
    Image,
    "openscap_on",
    {is_openscap: true, tested_attr: TESTED_ATTRIBUTES__openscap_on}
  )
];

const NUM_SELECTED_IMAGES = 1;

function delete_all_container_tasks(appliance) {
  let col = appliance.collections.tasks.filter({tab: "AllTasks"});
  col.delete_all()
};

function random_image_instance(appliance) {
  let collection = appliance.collections.container_images;

  let filter_image_collection = collection.filter({
    active: true,
    redhat_registry: true
  });

  return random.sample(
    filter_image_collection.all(),
    NUM_SELECTED_IMAGES
  ).pop()
};

function test_manage_policies_navigation(random_image_instance) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  random_image_instance.assign_policy_profiles("OpenSCAP profile")
};

function test_check_compliance(random_image_instance) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  random_image_instance.assign_policy_profiles("OpenSCAP profile");
  random_image_instance.check_compliance()
};

function get_table_attr(instance, table_name, attr) {
  let view = navigate_to(instance, "Details", {force: true});
  let table = view.entities.getattr(table_name, null);
  if (is_bool(table)) return table.read().get(attr)
};

function test_containers_smartstate_analysis(provider, test_item, soft_assert, delete_all_container_tasks, random_image_instance) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  if (is_bool(test_item.is_openscap)) {
    random_image_instance.assign_policy_profiles("OpenSCAP profile")
  } else {
    random_image_instance.unassign_policy_profiles("OpenSCAP profile")
  };

  random_image_instance.perform_smartstate_analysis({wait_for_finish: true});
  let view = navigate_to(random_image_instance, "Details");

  for (let [tbl, attr, verifier] in test_item.tested_attr) {
    let table = view.entities.getattr(tbl);
    let table_data = table.read().to_a().map((k, v) => [k.downcase(), v]).to_h;

    if (is_bool(!soft_assert.call(
      table_data.include(attr.downcase()),
      `${tbl} table has missing attribute '${attr}'`
    ))) continue;

    provider.refresh_provider_relationships();

    let wait_for_retval = wait_for(
      () => get_table_attr(random_image_instance, tbl, attr),

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
};

function test_containers_smartstate_analysis_api(provider, test_item, soft_assert, delete_all_container_tasks, random_image_instance) {
  // 
  //      Test initiating a SmartState Analysis scan via the CFME API through the ManageIQ API Client
  //      entity class.
  // 
  //      RFE: BZ 1486362
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  if (is_bool(test_item.is_openscap)) {
    random_image_instance.assign_policy_profiles("OpenSCAP profile")
  } else {
    random_image_instance.unassign_policy_profiles("OpenSCAP profile")
  };

  let original_scan = random_image_instance.last_scan_attempt_on;
  random_image_instance.scan();

  let task = provider.appliance.collections.tasks.instantiate({
    name: `Container Image Analysis: '${random_image_instance.name}'`,
    tab: "AllTasks"
  });

  task.wait_for_finished();

  soft_assert.call(
    original_scan != random_image_instance.last_scan_attempt_on,
    "SmartState Anaysis scan has failed"
  )
}
