require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(2),
  test_requirements.cloud,
  pytest.mark.usefixtures("setup_provider_modscope"),

  pytest.mark.provider(
    [CloudProvider],
    {required_fields: ["remove_test"], scope: "module"}
  )
];

function set_grid(appliance) {
  let view = navigate_to(appliance.collections.cloud_images, "All");
  view.toolbar.view_selector.select("Grid View");
  yield;
  view = navigate_to(appliance.collections.cloud_images, "All");
  view.toolbar.view_selector.select("List View")
};

function test_delete_instance_appear_after_refresh(appliance, provider) {
  //  Tests delete instance
  // 
  //   Metadata:
  //       test_flag: delete_object
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: WebUI
  //       initialEstimate: 1/4h
  //   
  let instance_name = provider.data.remove_test.instance;

  let test_instance = appliance.collections.cloud_instances.instantiate(
    instance_name,
    provider
  );

  test_instance.delete({from_details: false});
  test_instance.wait_for_delete();
  provider.refresh_provider_relationships();
  test_instance.wait_to_appear()
};

function test_delete_image_appear_after_refresh(appliance, provider, set_grid, request) {
  //  Tests delete image
  // 
  //   Metadata:
  //       test_flag: delete_object
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let image_name = provider.data.remove_test.image;

  let test_image = appliance.collections.cloud_images.instantiate(
    image_name,
    provider
  );

  test_image.delete({from_details: false});
  test_image.wait_for_delete();
  provider.refresh_provider_relationships();
  test_image.wait_to_appear()
};

function test_delete_stack_appear_after_refresh(appliance, provider, provisioning, request) {
  //  Tests delete stack
  // 
  //   Metadata:
  //       test_flag: delete_object
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: WebUI
  //       initialEstimate: 1/4h
  //   
  let stack = appliance.collections.cloud_stacks.instantiate({
    name: provisioning.stacks[0],
    provider
  });

  stack.delete();

  try {
    stack.wait_for_exists()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      pytest.fail("stack didn't appear after refresh")
    } else {
      throw $EXCEPTION
    }
  }
}
