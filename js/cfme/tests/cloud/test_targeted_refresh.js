require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.ec2,
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.provider([EC2Provider], {scope: "module"})
];

const DELAY = 15;
const TIMEOUT = 1500;

function wait_for_power_state(vms_collection, instance_name, power_state) {
  wait_for(
    () => vms_collection.get({name: instance_name}).power_state == power_state,
    {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
  )
};

function wait_for_deleted(collection, entity_name) {
  wait_for(
    () => collection.all.map(e => e.name != entity_name).is_all,
    {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
  )
};

function cleanup_if_exists(entity) {
  try {
    if (is_bool(entity.exists)) return entity.cleanup()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      return false
    } else {
      throw $EXCEPTION
    }
  }
};

function test_targeted_refresh_instance(appliance, create_vm, provider, request) {
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: Cloud
  //       initialEstimate: 1 1/6h
  //       startsin: 5.9
  //       testSteps:
  //           1. Instance CREATE
  //           2. Instance RUNNING
  //           3. Instance STOPPED
  //           4. Instance UPDATE
  //           5. Instance RUNNING
  //           6. Instance DELETE - or - Instance TERMINATE
  //   
  let vms_collection = appliance.rest_api.collections.vms;
  let flavors_collection = appliance.rest_api.collections.flavors;
  let instance = create_vm;
  wait_for_power_state(vms_collection, instance.mgmt.name, "on");
  instance.mgmt.stop();
  wait_for_power_state(vms_collection, instance.mgmt.name, "off");
  instance.mgmt.rename(random_vm_name("refr"));
  instance.mgmt.change_type("t1.small");

  wait_for(
    () => (
      flavors_collection.get({id: vms_collection.get({name: instance.mgmt.name}).flavor_id}).name == instance.mgmt.type
    ),

    {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
  );

  instance.mgmt.start();
  wait_for_power_state(vms_collection, instance.mgmt.name, "on");
  instance.mgmt.delete();

  wait_for_power_state(
    vms_collection,
    instance.mgmt.name,
    "terminated"
  )
};

// 
//   AWS naming is Elastic IP
// 
//   Polarion:
//       assignee: mmojzis
//       casecomponent: Cloud
//       caseimportance: medium
//       initialEstimate: 1 1/2h
//       startsin: 5.9
//       testSteps:
//           1. Classic Floating IP Allocate
//           2. VPC Floating IP Allocate
//           3. Classic Floating IP Allocate to Instance (Check both IP and Instance)
//           4. Classic Floating IP Allocate to Network Port (Check both IP and Port)
//           5. VPC Floating IP Allocate to Instance (Check both IP and Instance)
//           6. VPC Floating IP Allocate to Network Port (Check both IP and Port)
//           7. Floating IP UPDATE
//           8. Floating IP DELETE
//   
// pass
function test_ec2_targeted_refresh_floating_ip() {};

function test_targeted_refresh_network(appliance, provider, request) {
  // 
  //   AWS naming is VPC
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: Cloud
  //       caseimportance: medium
  //       initialEstimate: 2/3h
  //       startsin: 5.9
  //       testSteps:
  //           1. Network CREATE
  //           2. Network UPDATE
  //           3. Network DELETE
  //   
  let network = provider.mgmt.create_network();

  if (is_bool(!network)) {
    pytest.fail("Network wasn't successfully created using API!")
  };

  request.addfinalizer(() => cleanup_if_exists(network));
  let network_collection = appliance.rest_api.collections.cloud_networks;

  wait_for(
    () => network_collection.get({ems_ref: network.uuid}),
    {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
  );

  let new_name = `test-network-${fauxfactory.gen_alpha()}`;
  network.rename(new_name);

  wait_for(
    () => network_collection.get({name: new_name}),
    {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
  );

  network.delete();
  wait_for_deleted(network_collection, new_name)
};

// 
//   AWS naming is Route Table
// 
//   Polarion:
//       assignee: mmojzis
//       casecomponent: Cloud
//       caseimportance: medium
//       initialEstimate: 2/3h
//       startsin: 5.9
//       testSteps:
//           1. Network Router CREATE
//           2. Network Router DELETE
//           3. Network Router UPDATE
//   
// pass
function test_ec2_targeted_refresh_network_router() {};

// 
//   AWS naming is Network Interface
// 
//   Polarion:
//       assignee: mmojzis
//       casecomponent: Cloud
//       caseimportance: medium
//       initialEstimate: 2/3h
//       startsin: 5.9
//       testSteps:
//           1. Network port CREATE
//           2. Network port UPDATE
//           3. Assign private IP
//           4. Unassign private IP
//           5. Network port DELETE
//   
// pass
function test_ec2_targeted_refresh_network_port() {};

// 
//   Polarion:
//       assignee: mmojzis
//       casecomponent: Cloud
//       caseimportance: medium
//       initialEstimate: 1/2h
//       startsin: 5.9
//       testSteps:
//           1. Stack CREATE
//           2. Stack DELETE
//   
// pass
function test_ec2_targeted_refresh_stack() {};

function test_targeted_refresh_volume(appliance, create_vm, provider, request) {
  // 
  //   AWS naming is EBS
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: Cloud
  //       initialEstimate: 2/3h
  //       startsin: 5.9
  //       testSteps:
  //           1. Volume CREATE
  //           2. Volume UPDATE
  //           3. Volume ATTACH
  //           4. Volume DETACH
  //           5. Volume DELETE
  //   
  let volume_name = fauxfactory.gen_alpha();
  let volume_collection = appliance.rest_api.collections.cloud_volumes;
  let instance = create_vm;

  let volume = provider.mgmt.create_volume(
    instance.mgmt.az,
    {name: volume_name}
  );

  if (is_bool(!volume)) {
    pytest.fail("Volume wasn't successfully created using API!")
  };

  request.addfinalizer(() => cleanup_if_exists(volume));

  wait_for(
    () => volume_collection.get({name: volume_name}),
    {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
  );

  let new_volume_name = fauxfactory.gen_alpha();
  volume.rename(new_volume_name);

  wait_for(
    () => volume_collection.get({name: new_volume_name}),
    {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
  );

  if (is_bool(!BZ(1754874, {forced_streams: ["5.10", "5.11"]}).blocks)) {
    let new_size = 20;
    volume.resize(new_size);

    wait_for(
      () => (
        volume_collection.get({name: new_volume_name}).size == ((new_size * 1024) * 1024) * 1024
      ),

      {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
    )
  };

  volume.attach(instance.mgmt.uuid);

  wait_for(
    () => volume_collection.get({name: new_volume_name}),
    {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
  );

  volume.detach(instance.mgmt.uuid);

  wait_for(
    () => volume_collection.get({name: new_volume_name}),
    {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
  );

  wait_for(
    () => volume.cleanup(),
    {delay: DELAY, timeout: TIMEOUT, handle_exception: true}
  );

  wait_for_deleted(volume_collection, new_volume_name)
};

// 
//   Polarion:
//       assignee: mmojzis
//       casecomponent: Cloud
//       caseimportance: medium
//       initialEstimate: 2/3h
//       startsin: 5.9
//       testSteps:
//           1. Subnet CREATE
//           2. Subnet UPDATE
//           3. Subnet DELETE
//   
// pass
function test_ec2_targeted_refresh_subnet() {};

// 
//   AWS naming is ELB
//   Polarion:
//       assignee: mmojzis
//       casecomponent: Cloud
//       caseimportance: medium
//       initialEstimate: 2/3h
//       startsin: 5.9
//       testSteps:
//           1. Apply Security group
//           2. Floating IP CREATE
//           3. Floating IP UPDATE
//           4. Floating IP DELETE
//   
// pass
function test_ec2_targeted_refresh_load_balancer() {};

// 
//   Polarion:
//       assignee: mmojzis
//       casecomponent: Cloud
//       caseimportance: medium
//       initialEstimate: 2/3h
//       startsin: 5.9
//       testSteps:
//           1. Security group CREATE
//           2. Security group UPDATE
//           3. Security group DELETE
//   
// pass
function test_ec2_targeted_refresh_security_group() {};

// 
//   AWS naming is AMI
//   Polarion:
//       assignee: mmojzis
//       casecomponent: Cloud
//       caseimportance: high
//       initialEstimate: 2/3h
//       startsin: 5.9
//       testSteps:
//           1. Template CREATE
//           2. Template UPDATE
//           3. Template DELETE
//   
// pass
function test_targeted_refresh_template() {}
