require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);

let pytestmark = [
  pytest.mark.usefixtures(
    "uses_infra_providers",
    "setup_provider_modscope"
  ),

  pytest.mark.provider(
    [VMwareProvider],
    {selector: ONE_PER_TYPE, scope: "module"}
  )
];

function new_role(appliance, product_features) {
  let collection = appliance.collections.roles;

  return collection.create({
    name: fauxfactory.gen_alphanumeric({start: "role_"}),
    vm_restriction: null,
    product_features
  })
};

function new_group(appliance, role) {
  let collection = appliance.collections.groups;

  return collection.create({
    description: fauxfactory.gen_alphanumeric({start: "group_"}),
    role,
    tenant: "My Company"
  })
};

function new_user(appliance, group, credential) {
  let collection = appliance.collections.users;

  return collection.create({
    name: fauxfactory.gen_alphanumeric({start: "user_"}),
    credential,
    email: "xyz@redhat.com",
    groups: group,
    cost_center: "Workload",
    value_assign: "Database"
  })
};

function role_user_group(appliance, new_credential) {
  let vm_access_rule = (appliance.version > "5.11" ? "All VM and Instance Access Rules" : "Access Rules for all Virtual Machines");

  let role = new_role({appliance, product_features: [
    [["Everything"], false],
    [["Everything", vm_access_rule], true]
  ]});

  let group = new_group({appliance, role: role.name});
  let user = new_user({appliance, group, credential: new_credential});
  yield([role, user]);
  user.delete_if_exists();
  group.delete_if_exists();
  role.delete_if_exists()
};

function test_service_rbac_no_permission(appliance, role_user_group) {
  //  Test service rbac without user permission
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //   
  let [role, user] = role_user_group;
  let error_message = "The user's role is not authorized for any access, please contact the administrator!";

  pytest.raises(
    Exception,
    {match: error_message},
    () => user(() => appliance.server.login(user))
  )
};

function test_service_rbac_catalog(appliance, role_user_group, catalog) {
  //  Test service rbac with catalog
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //   
  let [role, user] = role_user_group;

  let product_features = [
    [["Everything"], true],
    [["Everything"], false]
  ];

  product_features.concat(["Catalogs"].map(k => (
    [["Everything", "Services", "Catalogs Explorer", k], true]
  )));

  role.update({product_features: product_features});

  user(() => {
    appliance.server.login(user);
    if (!catalog.exists) throw new ()
  })
};

function test_service_rbac_service_catalog(appliance, role_user_group, catalog, catalog_item, request, provider) {
  //  Test service rbac with service catalog
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //   
  let [role, user] = role_user_group;

  let product_features = [
    [["Everything"], true],
    [["Everything"], false],
    [["Everything", "Services", "Requests"], true],
    [["Everything", "Automation", "Automate", "Customization"], true]
  ];

  product_features.concat([
    "Catalog Items",
    "Service Catalogs",
    "Catalogs"
  ].map(k => [["Everything", "Services", "Catalogs Explorer", k], true]));

  role.update({product_features: product_features});

  user(() => {
    appliance.server.login(user);

    let service_catalogs = ServiceCatalogs(
      appliance,
      catalog_item.catalog,
      catalog_item.name
    );

    service_catalogs.order();

    let service_request = appliance.collections.requests.instantiate(
      catalog_item.name,
      {partial_check: true}
    );

    service_request.wait_for_request();
    if (!service_request.is_succeeded()) throw new ()
  });

  let _finalize = () => {
    let rest_vm = appliance.rest_api.collections.vms.get({name: `%${catalog_item.prov_data.catalog.vm_name}%`});

    let vm = appliance.collections.infra_vms.instantiate({
      name: rest_vm.name,
      provider
    });

    vm.delete_if_exists();
    vm.wait_to_disappear();
    request = appliance.collections.requests.instantiate({description: `Provisioning Service [${catalog_item.dialog.label}] from [${catalog_item.dialog.label}]`});
    return request.remove_request()
  }
};

function test_service_rbac_catalog_item(request, appliance, role_user_group, catalog_item) {
  //  Test service rbac with catalog item
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //   
  let [role, user] = role_user_group;

  let product_features = [
    [["Everything"], true],
    [["Everything"], false]
  ];

  product_features.concat(["Catalog Items"].map(k => (
    [["Everything", "Services", "Catalogs Explorer", k], true]
  )));

  role.update({product_features: product_features});

  user(() => {
    appliance.server.login(user);
    if (!catalog_item.exists) throw new ()
  })
};

function test_service_rbac_orchestration(appliance, role_user_group) {
  //  Test service rbac with orchestration
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //   
  let [role, user] = role_user_group;

  let product_features = [
    [["Everything"], true],
    [["Everything"], false]
  ];

  product_features.concat(["Orchestration Templates"].map(k => (
    [["Everything", "Services", "Catalogs Explorer", k], true]
  )));

  role.update({product_features: product_features});

  user(() => {
    appliance.server.login(user);
    let collection = appliance.collections.orchestration_templates;

    let template = collection.create({
      template_name: fauxfactory.gen_alphanumeric({start: "temp_"}),
      template_type: "Amazon CloudFormation",
      template_group: "CloudFormation Templates",
      description: "template description",
      content: fauxfactory.gen_numeric_string()
    });

    if (!template.exists) throw new ();
    template.delete()
  })
};

function test_service_rbac_request(appliance, role_user_group, catalog_item, request, provider) {
  //  Test service rbac with only request module permissions
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //   
  let [role, user] = role_user_group;

  let product_features = [
    [["Everything"], true],
    [["Everything"], false],
    [["Everything", "Services", "Requests"], true],
    [["Everything", "Automation", "Automate", "Customization"], true]
  ];

  product_features.concat([
    "Catalog Items",
    "Service Catalogs",
    "Catalogs"
  ].map(k => [["Everything", "Services", "Catalogs Explorer", k], true]));

  role.update({product_features: product_features});

  user(() => {
    appliance.server.login(user);

    let service_catalogs = ServiceCatalogs(
      appliance,
      catalog_item.catalog,
      catalog_item.name
    );

    service_catalogs.order();
    let cells = {Description: catalog_item.name};

    let order_request = appliance.collections.requests.instantiate({
      cells,
      partial_check: true
    });

    order_request.wait_for_request({method: "ui"});
    if (!order_request.is_succeeded({method: "ui"})) throw new ()
  });

  let _finalize = () => {
    let rest_vm = appliance.rest_api.collections.vms.get({name: `%${catalog_item.prov_data.catalog.vm_name}%`});

    let vm = appliance.collections.infra_vms.instantiate({
      name: rest_vm.name,
      provider
    });

    vm.delete_if_exists();
    vm.wait_to_disappear();
    request = appliance.collections.requests.instantiate({description: `Provisioning Service [${catalog_item.dialog.label}] from [${catalog_item.dialog.label}]`});
    return request.remove_request()
  }
}
