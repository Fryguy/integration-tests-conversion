require("None");
require_relative("cfme");
include(Cfme);
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

const TESTED_ATTRIBUTES__openscap = [
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
  ),

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

function delete_all_container_tasks(appliance) {
  let col = appliance.collections.tasks.filter({tab: "AllTasks"});
  col.delete_all()
};

function random_image_instance(appliance) {
  let collection = appliance.collections.container_images;
  return random.sample(collection.all(), 1).pop()
};

function openscap_assigned_rand_image(provider, random_image_instance) {
  // Returns random Container image that have assigned OpenSCAP policy from provider view.
  //   teardown remove this assignment from provider view.
  //   
  random_image_instance.unassign_policy_profiles("OpenSCAP profile");
  provider.assign_policy_profiles("OpenSCAP profile");
  yield(random_image_instance);
  provider.unassign_policy_profiles("OpenSCAP profile")
};

function get_table_attr(instance, table_name, attr) {
  let view = navigate_to(instance, "Details", {force: true});
  let table = view.entities.getattr(table_name, null);
  if (is_bool(table)) return table.read().get(attr)
};

function test_check_compliance_provider_policy(provider, soft_assert, delete_all_container_tasks, openscap_assigned_rand_image) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  openscap_assigned_rand_image.perform_smartstate_analysis({
    wait_for_finish: true,
    timeout: "20M"
  });

  let view = navigate_to(openscap_assigned_rand_image, "Details");

  for (let [tbl, attr, verifier] in TESTED_ATTRIBUTES__openscap) {
    let table = view.entities.getattr(tbl);
    let table_data = table.read().to_a().map((k, v) => [k.downcase(), v]).to_h;

    if (is_bool(!soft_assert.call(
      table_data.include(attr.downcase()),
      "{} table has missing attribute '{}'".format(tbl, attr)
    ))) continue;

    provider.refresh_provider_relationships();

    let wait_for_retval = wait_for(method("get_table_attr"), {
      func_args: [openscap_assigned_rand_image, tbl, attr],
      message: `Trying to get attribute \"${attr}\" of table \"${tbl}\"`,
      delay: 5,
      num_sec: 120,
      silent_failure: true
    });

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
      "{}.{} attribute has unexpected value ({})".format(tbl, attr, value)
    )
  }
}
