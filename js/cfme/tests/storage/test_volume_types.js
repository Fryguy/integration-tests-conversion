require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.storage,
  pytest.mark.usefixtures("setup_provider_modscope"),

  pytest.mark.provider(
    [EC2Provider, OpenStackProvider],
    {scope: "module"}
  )
];

function assert_volume_type_should_be_present(block_manager, should_be_present) {
  let view = navigate_to(block_manager, "Details");
  let block_storage_manager_relationship_fields = view.entities.relationships.fields;

  if (block_storage_manager_relationship_fields.include("Cloud Volume Types") != should_be_present) {
    throw new ()
  }
};

function test_storage_volume_type_present(appliance, provider, request) {
  // 
  //   Bugzilla:
  //       1650082
  //   Polarion:
  //       assignee: gtalreja
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       casecomponent: Cloud
  //       testSteps:
  //           1. Add EC2 Provider
  //           2. Check EBS Block Storage Manager Details
  //           3. Add Openstack Provider
  //           4. Check EBS Block Storage Details
  //           5. Check Cinder Storage Manager Details
  //           6. Delete EC2 Provider
  //           7. Check Cinder Storage Manager Details
  //       expectedResults:
  //           1.
  //           2. There are not Cloud Volume Types present in the details
  //           3.
  //           4. There are not Cloud Volume Types present in the details
  //           5. There are Cloud Volume Types present in the details
  //           6.
  //           7. There are Cloud Volume Types present in the details
  //   
  let should_be_present = false;
  let other_provider = list_providers_by_class(OpenStackProvider)[0];

  if (is_bool(provider.one_of(OpenStackProvider))) {
    other_provider = list_providers_by_class(EC2Provider)[0];
    should_be_present = true
  };

  let [block_manager] = appliance.collections.block_managers.filter({provider: provider}).all();

  assert_volume_type_should_be_present(
    block_manager,
    should_be_present
  );

  other_provider.create({validate_inventory: true});
  request.addfinalizer(() => provider.delete_if_exists());

  assert_volume_type_should_be_present(
    block_manager,
    should_be_present
  )
}
