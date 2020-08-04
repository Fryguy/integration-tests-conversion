require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
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

const TESTED_ATTRIBUTES_OPENSCAP = [
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

  let filter_image_collection = collection.filter({
    active: true,
    redhat_registry: true
  });

  return random.sample(filter_image_collection.all(), 1).pop()
};

function openscap_assigned_rand_image(provider, random_image_instance) {
  // Returns random Container image that have assigned OpenSCAP policy from image view.
  //   teardown remove this assignment from image view.
  //   
  random_image_instance.assign_policy_profiles("OpenSCAP profile");
  yield(random_image_instance);
  random_image_instance.unassign_policy_profiles("OpenSCAP profile")
};

function set_cve_location(appliance, provider, soft_assert) {
  // Set cve location with cve_url on provider setup
  //   teardown remove this cve_url from provider setting.
  //   
  let provider_edit_view = navigate_to(provider, "Edit");

  if (is_bool(provider_edit_view.advanced.cve_loc.fill("https://www.redhat.com/security/data/metrics/ds"))) {
    try {
      provider_edit_view.save.click();
      let view = appliance.browser.create_view(ContainerProvidersView);
      view.flash.assert_success_message(`Containers Provider \"${provider.name}\" was saved`)
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof RuntimeError) {
        soft_assert.call(false, `${provider.name} wasn't added successfully`)
      } else {
        throw $EXCEPTION
      }
    }
  } else {
    provider_edit_view.cancel.click()
  };

  yield;
  provider_edit_view = navigate_to(provider, "Edit");

  if (is_bool(provider_edit_view.advanced.cve_loc.fill(""))) {
    provider_edit_view.save.click()
  } else {
    provider_edit_view.cancel.click()
  }
};

function set_image_inspector_registry(appliance, provider, soft_assert) {
  // Set image inspector registry with url on provider setup
  //   teardown remove this url from provider setting.
  //   
  let provider_edit_view = navigate_to(provider, "Edit");

  if (is_bool(provider_edit_view.advanced.image_reg.fill("registry.access.redhat.com"))) {
    try {
      provider_edit_view.save.click();
      let view = appliance.browser.create_view(ContainerProvidersView);
      view.flash.assert_success_message(`Containers Provider \"${provider.name}\" was saved`)
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof RuntimeError) {
        soft_assert.call(false, `${provider.name} wasn't added successfully`)
      } else {
        throw $EXCEPTION
      }
    }
  } else {
    provider_edit_view.cancel.click()
  };

  yield;
  provider_edit_view = navigate_to(provider, "Edit");

  if (is_bool(provider_edit_view.advanced.cve_loc.fill(""))) {
    provider_edit_view.save.click()
  } else {
    provider_edit_view.cancel.click()
  }
};

function get_table_attr(instance, table_name, attr) {
  let view = navigate_to(instance, "Details", {force: true});
  let table = view.entities.getattr(table_name, null);
  if (is_bool(table)) return table.read().get(attr)
};

function verify_ssa_image_attributes(provider, soft_assert, rand_image) {
  // After SSA run finished, go over Image Summary tables attributes that related to OpenSCAP
  //   And verify SSA pass as expected
  //   
  let view = navigate_to(rand_image, "Details");

  for (let [tbl, attr, verifier] in TESTED_ATTRIBUTES_OPENSCAP) {
    let table = view.entities.getattr(tbl);
    let table_data = table.read().to_a().map((k, v) => [k.downcase(), v]).to_h;

    if (is_bool(!soft_assert.call(
      table_data.include(attr.downcase()),
      "{} table has missing attribute '{}'".format(tbl, attr)
    ))) continue;

    provider.refresh_provider_relationships();

    let wait_for_retval = wait_for(method("get_table_attr"), {
      func_args: [rand_image, tbl, attr],
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
};

function test_cve_location_update_value(provider, soft_assert, delete_all_container_tasks, set_cve_location, openscap_assigned_rand_image) {
  // This test checks RFE BZ 1459189, Allow to specify per Provider the location of
  //    OpenSCAP CVEs.
  //    In order to verify the above setup, run a smart state analysis on container image.
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

  verify_ssa_image_attributes(
    provider,
    soft_assert,
    openscap_assigned_rand_image
  )
};

function test_image_inspector_registry_update_value(provider, soft_assert, delete_all_container_tasks, set_image_inspector_registry, openscap_assigned_rand_image) {
  // This test checks RFE BZ 1459189, Allow to specify per Provider
  //    The image inspector registry url.
  //    In order to verify the above setup, run a smart state analysis on container image.
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

  verify_ssa_image_attributes(
    provider,
    soft_assert,
    openscap_assigned_rand_image
  )
}
