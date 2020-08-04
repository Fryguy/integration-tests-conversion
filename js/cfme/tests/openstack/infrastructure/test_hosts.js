require_relative("cfme/infrastructure/provider/openstack_infra");
include(Cfme.Infrastructure.Provider.Openstack_infra);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.provider([OpenstackInfraProvider], {scope: "module"})
];

const VIEWS = ["List View", "Tile View"];

function host_collection(appliance) {
  return appliance.collections.hosts
};

function test_host_configuration(host_collection, provider, soft_assert, appliance) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();
  if (!hosts) throw new ();

  for (let host in hosts) {
    host.run_smartstate_analysis();

    let task = appliance.collections.tasks.instantiate({
      name: `SmartState Analysis for '${host.name}'`,
      tab: "MyOtherTasks"
    });

    task.wait_for_finished();
    let fields = ["Packages", "Services", "Files"];
    let view = navigate_to(host, "Details");

    for (let field in fields) {
      let value = view.entities.summary("Configuration").get_text_of(field).to_i;
      soft_assert.call(value > 0, `Nodes number of ${field} is 0`)
    }
  }
};

function test_host_cpu_resources(host_collection, provider, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();
  if (!hosts) throw new ();

  for (let host in hosts) {
    let fields = [
      "Number of CPUs",
      "Number of CPU Cores",
      "CPU Cores Per Socket"
    ];

    let view = navigate_to(host, "Details");

    for (let field in fields) {
      let value = view.entities.summary("Properties").get_text_of(field).to_i;
      soft_assert.call(value > 0, `Aggregate Node ${field} is 0`)
    }
  }
};

function test_host_auth(host_collection, provider, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();
  if (!hosts) throw new ();

  for (let host in hosts) {
    let view = navigate_to(host, "Details");
    let auth_status = view.entities.summary("Authentication Status").get_text_of("SSH Key Pair Credentials");

    soft_assert.call(
      auth_status == "Valid",
      `Incorrect SSH authentication status ${auth_status}`
    )
  }
};

function test_host_devices(host_collection, provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();
  if (!hosts) throw new ();

  for (let host in hosts) {
    let view = navigate_to(host, "Details");
    let result = view.entities.summary("Properties").get_text_of("Devices").split()[0].to_i;
    if (result <= 0) throw new ()
  }
};

function test_host_hostname(host_collection, provider, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();
  if (!hosts) throw new ();

  for (let host in hosts) {
    let view = navigate_to(host, "Details");
    let result = view.entities.summary("Properties").get_text_of("Hostname");
    soft_assert.call(result, "Missing hostname in: " + result.to_s)
  }
};

function test_host_memory(host_collection, provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();
  if (!hosts) throw new ();

  for (let host in hosts) {
    let view = navigate_to(host, "Details");
    let result = view.entities.summary("Properties").get_text_of("Memory").split()[0].to_i;
    if (result <= 0) throw new ()
  }
};

function test_host_security(host_collection, provider, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();
  if (!hosts) throw new ();

  for (let host in hosts) {
    let view = navigate_to(host, "Details");

    soft_assert.call(
      view.entities.summary("Security").get_text_of("Users").to_i > 0,
      "Nodes number of Users is 0"
    );

    soft_assert.call(
      view.entities.summary("Security").get_text_of("Groups").to_i > 0,
      "Nodes number of Groups is 0"
    )
  }
};

function test_host_smbios_data(host_collection, provider, soft_assert) {
  // Checks that Manufacturer/Model values are shown for each infra node
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();
  if (!hosts) throw new ();

  for (let host in hosts) {
    let view = navigate_to(host, "Details");
    let res = view.entities.summary("Properties").get_text_of("Manufacturer / Model");
    soft_assert.call(res, "Manufacturer / Model value are empty");
    soft_assert.call(res != "N/A")
  }
};

function test_host_zones_assigned(host_collection, provider) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();
  if (!hosts) throw new ();

  for (let host in hosts) {
    let view = navigate_to(host, "Details");
    let result = view.entities.summary("Relationships").get_text_of("Availability Zone");
    if (!result) throw "Availability zone doesn't specified"
  }
};

function test_hypervisor_hostname(host_collection, provider, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hvisors = provider.mgmt.list_host();
  let hosts = host_collection.all();

  for (let host in hosts) {
    let view = navigate_to(host, "Details");
    let hv_name = view.entities.summary("Properties").get_text_of("Hypervisor Hostname");

    soft_assert.call(
      hvisors.include(hv_name),
      `Hypervisor hostname ${hv_name} is not in Hypervisor list`
    )
  }
};

function test_hypervisor_hostname_views(host_collection, provider, view_type, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hvisors = provider.mgmt.list_host();
  let view = navigate_to(host_collection, "All");
  view.toolbar.view_selector.select(view_type);
  let items = view.entities.get_all();

  for (let item in items) {
    let hv_name = item.data.hypervisor_hostname;

    soft_assert.call(
      hvisors.include(hv_name),
      `Hypervisor hostname ${hv_name} is not in Hypervisor list`
    )
  }
};

function test_host_networks(provider, host_collection, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();
  let nodes = provider.mgmt.nodes;

  let networks = nodes.map(node => (
    [node.name, provider.mgmt.api.servers.ips({server: node})]
  )).to_h;

  for (let host in hosts) {
    let view = navigate_to(host, "Details");
    let cloud_net = view.entities.summary("Relationships").get_text_of("Cloud Networks");
    let host_name = view.entities.summary("Properties").get_text_of("Hypervisor Hostname");

    soft_assert.call(
      cloud_net.to_i == networks[host_name].size,
      "Networks associated to host does not match between UI and OSP"
    )
  }
};

function test_host_subnets(provider, appliance, host_collection, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let hosts = host_collection.all();

  for (let host in hosts) {
    let view = navigate_to(host, "Details");
    let cloud_subnet = view.entities.summary("Relationships").get_text_of("Cloud Subnets");
    view = navigate_to(host, "Subnets");

    soft_assert.call(
      cloud_subnet.to_i == view.entities.paginator.items_amount,
      "Subnets associated to host does not match"
    )
  }
}
