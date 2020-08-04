require_relative("riggerlib");
include(Riggerlib);
require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/provisioning");
include(Cfme.Provisioning);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);

let pytestmark = [
  test_requirements.quota,
  pytest.mark.meta({server_roles: "+automate"}),
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.long_running,

  pytest.mark.provider([VMwareProvider, RHEVMProvider], {
    scope: "module",
    required_fields: [["provisioning", "template"]],
    selector: ONE_PER_TYPE
  })
];

function vm_name() {
  return random_vm_name({context: "quota"})
};

function template_name(provisioning) {
  return provisioning.template
};

function prov_data(vm_name, provisioning) {
  return {
    catalog: {vm_name: vm_name},
    environment: {automatic_placement: true},
    network: {vlan: partial_match(provisioning.vlan)}
  }
};

function set_project_quota(request, appliance, new_project) {
  let [field, value] = request.param;
  new_project.set_quota({None: {[`${field}_cb`]: true, field: value}});
  yield;
  appliance.server.login_admin();
  appliance.server.browser.refresh();
  new_project.set_quota({None: {[`${field}_cb`]: false}})
};

function new_project(appliance) {
  let collection = appliance.collections.projects;

  let project = collection.create({
    name: fauxfactory.gen_alphanumeric(15, {start: "project_"}),

    description: fauxfactory.gen_alphanumeric(
      15,
      {start: "project_desc_"}
    ),

    parent: collection.get_root_tenant()
  });

  yield(project);
  project.delete()
};

function new_role(appliance) {
  let collection = appliance.collections.roles;

  let role = collection.create({
    name: fauxfactory.gen_alphanumeric({start: "role_"}),
    vm_restriction: null,
    product_features: [[["Everything"], true]]
  });

  yield(role);
  role.delete()
};

function new_group(appliance, new_project, new_role) {
  let collection = appliance.collections.groups;

  let group = collection.create({
    description: fauxfactory.gen_alphanumeric({start: "group_"}),
    role: new_role.name,
    tenant: `My Company/${new_project.name}`
  });

  yield(group);
  group.delete()
};

function new_user(appliance, new_group, new_credential) {
  let collection = appliance.collections.users;

  let user = collection.create({
    name: fauxfactory.gen_alphanumeric({start: "user_"}),
    credential: new_credential,
    email: fauxfactory.gen_email(),
    groups: new_group,
    cost_center: "Workload",
    value_assign: "Database"
  });

  yield(user);
  user.delete()
};

function test_project_quota_enforce_via_lifecycle_infra(appliance, provider, new_user, set_project_quota, extra_msg, custom_prov_data, approve, prov_data, vm_name, template_name) {
  // Test project quota via lifecycle method
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Configuration
  //       initialEstimate: 1/4h
  //       tags: quota
  //   
  new_user(() => {
    recursive_update(prov_data, custom_prov_data);

    do_vm_provisioning(appliance, {
      template_name,
      provider,
      vm_name,
      provisioning_data: prov_data,
      wait: false,
      request: null
    });

    let request_description = "Provision from [{template}] to [{vm}{msg}]".format({
      template: template_name,
      vm: vm_name,
      msg: extra_msg
    });

    let provision_request = appliance.collections.requests.instantiate(request_description);

    if (is_bool(approve)) {
      provision_request.approve_request({method: "ui", reason: "Approved"})
    };

    provision_request.wait_for_request({method: "ui"});
    if (provision_request.row.reason.text != "Quota Exceeded") throw new ()
  })
}
