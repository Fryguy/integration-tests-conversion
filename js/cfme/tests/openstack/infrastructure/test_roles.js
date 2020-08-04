require("None");
require_relative("cfme/infrastructure/provider/openstack_infra");
include(Cfme.Infrastructure.Provider.Openstack_infra);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.provider([OpenstackInfraProvider], {scope: "module"})
];

const ROLES = [
  "NovaCompute",
  "Controller",
  "Compute",
  "BlockStorage",
  "SwiftStorage",
  "CephStorage"
];

function roles(appliance, provider) {
  let collection = appliance.collections.deployment_roles.filter({provider: provider});
  let roles = collection.all();
  yield((is_bool(roles) ? roles : pytest.skip("No Roles Available")))
};

function test_host_role_association(appliance, provider, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let host_collection = appliance.collections.hosts;
  let hosts = host_collection.all();
  if (hosts.size <= 0) throw new ();

  for (let host in hosts) {
    host.run_smartstate_analysis();

    let task = appliance.collections.tasks.instantiate({
      name: `SmartState Analysis for '${host.name}'`,
      tab: "MyOtherTasks"
    });

    task.wait_for_finished();
    let view = navigate_to(host, "Details");
    let role_name = view.title.text.split()[1].to_s.translate(null, "()");
    role_name = (role_name == "NovaCompute" ? "Compute" : role_name);

    try {
      let role_assoc = view.entities.summary("Relationships").get_text_of("Deployment Role")
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NameError) {
        let role_assoc = view.entities.summary("Relationships").get_text_of("Cluster / Deployment Role")
      } else {
        throw $EXCEPTION
      }
    };

    soft_assert.call(
      role_assoc.include(role_name),
      "Deployment roles misconfigured"
    )
  }
};

function test_roles_name(roles) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  for (let role in roles) {
    let role_name = role.name.split_p("-")[1];
    if (!ROLES.include(role_name)) throw new ()
  }
};

function test_roles_summary(roles, soft_assert) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let err_ptrn = "{} are shown incorrectly";

  for (let role in roles) {
    let view = navigate_to(role, "DetailsFromProvider");

    for (let v in ["Nodes", "Direct VMs", "All VMs"]) {
      let res = view.entities.relationships.get_text_of(v);
      soft_assert.call(res.isdigit(), err_ptrn.format(v))
    };

    for (let v in ["Total CPUs", "Total Node CPU Cores"]) {
      let res = view.entities.total_for_node.get_text_of(v);
      soft_assert.call(res.isdigit() && res.to_i > 0, err_ptrn.format(v))
    };

    let total_cpu = view.entities.total_for_node.get_text_of("Total CPU Resources");

    soft_assert.call(
      total_cpu.include("GHz"),
      err_ptrn.format("Total CPU Resources")
    );

    let total_memory = view.entities.total_for_node.get_text_of("Total Memory");

    soft_assert.call(
      total_memory.include("GB"),
      err_ptrn.format("Total Memory")
    );

    for (let v in ["Total Configured Memory", "Total Configured CPUs"]) {
      let res = view.entities.total_for_vm.get_text_of(v);
      soft_assert.call(res, err_ptrn.format(v))
    }
  }
};

function test_role_delete(roles) {
  // 
  //   Polarion:
  //       assignee: mnadeem
  //       casecomponent: Cloud
  //       initialEstimate: 1/4h
  //   
  let role = choice(roles);
  role.delete();
  let view = navigate_to(role, "AllForProvider");
  let available_roles = view.entities.get_all();
  if (!!available_roles.include(role)) throw new ()
}
