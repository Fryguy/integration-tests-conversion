require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);

let pytestmark = [
  test_requirements.quota,
  pytest.mark.usefixtures("setup_provider_modscope"),

  pytest.mark.provider(
    [OpenStackProvider],
    {required_fields: [["provisioning", "image"]], scope: "module"}
  )
];

function set_default(provider, request) {
  // This fixture is used to return paths for provisioning_entry_point, reconfigure_entry_point
  //      and retirement_entry_point. The value of 'provisioning_entry_point' is required while
  //      creating new catalog item in 'test_service_cloud_tenant_quota_with_default_entry_point' test.
  //      But other tests does not require these values since those tests takes default values hence
  //      providing default value. So in this file, this fixture - 'set_default'
  //      must be used in all tests of quota which are related to services where catalog item needs to
  //      be created with specific values for these entries.
  //   
  let with_prov = [
    "Datastore",
    "ManageIQ (Locked)",
    `${provider.string_name}`,
    "VM",
    "Provisioning",
    "StateMachines",
    "ProvisionRequestApproval",
    "Default"
  ];

  let default = [
    "Service",
    "Provisioning",
    "StateMachines",
    "ServiceProvision_Template",
    "CatalogItemInitialization"
  ];

  return (is_bool(request.param) ? with_prov : default)
};

function vm_name() {
  return random_vm_name({context: "quota"})
};

function template_name(provisioning) {
  return provisioning.image.name
};

function prov_data(vm_name, template_name, provisioning) {
  return {
    catalog: {vm_name: vm_name, catalog_name: {name: template_name}},
    environment: {automatic_placement: true},

    properties: {instance_type: partial_match(provisioning.get(
      "instance_type2",
      "Instance type is not available"
    ))}
  }
};

function custom_prov_data(request, prov_data, vm_name, template_name) {
  let value = request.param;
  prov_data.update(value);
  prov_data.catalog.vm_name = vm_name;
  prov_data.catalog.catalog_name = {name: template_name}
};

function set_roottenant_quota(request, appliance) {
  let roottenant = appliance.collections.tenants.get_root_tenant();
  let [field, value] = request.param;
  roottenant.set_quota({None: {[`${field}_cb`]: true, field: value}});
  yield;
  appliance.server.browser.refresh();
  roottenant.set_quota({None: {[`${field}_cb`]: false}})
};

function catalog_item(appliance, provider, provisioning, template_name, dialog, catalog, prov_data, set_default) {
  let catalog_item = appliance.collections.catalog_items.create(
    provider.catalog_item_type,

    {
      name: fauxfactory.gen_alphanumeric({start: "test_"}),
      description: fauxfactory.gen_alphanumeric({start: "desc_"}),
      display_in: true,
      catalog,
      dialog,
      prov_data,
      provisioning_entry_point: set_default
    }
  );

  yield(catalog_item);
  catalog_item.delete_if_exists()
};

function test_tenant_quota_enforce_via_lifecycle_cloud(request, appliance, provider, set_roottenant_quota, extra_msg, custom_prov_data, approve, prov_data, vm_name, template_name) {
  // Test Tenant Quota in UI
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Cloud
  //       initialEstimate: 1/10h
  //       tags: quota
  //   
  prov_data.update(custom_prov_data);
  prov_data.catalog.vm_name = vm_name;
  prov_data.update({request: {email: fauxfactory.gen_email()}});
  prov_data.update({template_name: template_name});
  let request_description = `Provision from [${template_name}] to [${vm_name}${extra_msg}]`;

  appliance.collections.cloud_instances.create(
    vm_name,
    provider,
    prov_data,
    {auto_approve: approve, override: true, request_description}
  );

  let provision_request = appliance.collections.requests.instantiate(request_description);
  provision_request.wait_for_request({method: "ui"});
  request.addfinalizer(provision_request.remove_request);
  if (provision_request.row.reason.text != "Quota Exceeded") throw new ()
};

function test_tenant_quota_enforce_via_service_cloud(request, appliance, context, set_roottenant_quota, set_default, custom_prov_data, extra_msg, template_name, catalog_item) {
  // Test Tenant Quota in UI and SSUI
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Cloud
  //       initialEstimate: 1/10h
  //       tags: quota
  //   
  appliance.context.use(context, () => {
    let service_catalogs = ServiceCatalogs(
      appliance,
      catalog_item.catalog,
      catalog_item.name
    );

    if (context === ViaSSUI) service_catalogs.add_to_shopping_cart();
    service_catalogs.order()
  });

  let request_description = `Provisioning Service [${catalog_item.name}] from [${catalog_item.name}]`;
  let provision_request = appliance.collections.requests.instantiate(request_description);
  provision_request.wait_for_request({method: "ui"});
  request.addfinalizer(provision_request.remove_request);
  if (provision_request.row.reason.text != "Quota Exceeded") throw new ()
};

function test_service_cloud_tenant_quota_with_default_entry_point(request, appliance, context, set_roottenant_quota, set_default, custom_prov_data, extra_msg, catalog_item) {
  // Test Tenant Quota in UI and SSUI by selecting field entry points.
  //      Quota has to be checked if it is working with field entry points also.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Cloud
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //       tags: quota
  //       testSteps:
  //           1. Add cloud provider
  //           2. Set quota for root tenant - 'My Company'
  //           3. Navigate to services > catalogs
  //           4. Create catalog item with selecting following field entry points:
  //               a.provisioning_entry_point = /ManageIQ (Locked)/Cloud/VM/Provisioning
  //               /StateMachines/ProvisionRequestApproval/Default
  //               b.retirement_entry_point = /Service/Retirement/StateMachines/ServiceRetirement
  //               /Default
  //           5. Add other information required in catalog for provisioning VM
  //           6. Order the catalog item via UI and SSUI individually
  //   
  appliance.context.use(context, () => {
    let service_catalogs = ServiceCatalogs(
      appliance,
      catalog_item.catalog,
      catalog_item.name
    );

    if (context === ViaSSUI) service_catalogs.add_to_shopping_cart();
    service_catalogs.order()
  });

  let request_description = `Provisioning Service [${catalog_item.name}] from [${catalog_item.name}]`;
  let provision_request = appliance.collections.requests.instantiate(request_description);
  provision_request.wait_for_request({method: "ui"});
  request.addfinalizer(provision_request.remove_request);
  if (provision_request.row.reason.text != "Quota Exceeded") throw new ()
};

function instance(appliance, provider, small_template, setup_provider) {
  // Fixture to provision instance on the provider
  let instance = appliance.collections.cloud_instances.instantiate(
    random_vm_name("pwr-c"),
    provider,
    small_template.name
  );

  if (is_bool(!instance.exists_on_provider)) {
    instance.create_on_provider({
      allow_skip: "default",
      find_in_cfme: true
    })
  };

  yield(instance);
  instance.cleanup_on_provider()
};

function test_instance_quota_reconfigure_with_flavors(request, instance, set_roottenant_quota) {
  // 
  //   Note: Test reconfiguration of instance using flavors after setting quota but this is RFE which
  //   is not yet implemented. Hence this test cases is based on existing scenario. Where instance
  //   reconfiguration does honour quota. Also one more RFE(1506471) - 'Instance reconfiguration with
  //   flavors should work with request' is closed as WONTFIX. So this scenario is not considered in
  //   this test case.
  // 
  //   # TODO(ghubale@redhat.com): Update scenario of this test cases if RFE(1473325) got fixed for any
  //   # future version of cfme
  // 
  //   Bugzilla:
  //       1473325
  //       1506471
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/6h
  //       caseimportance: low
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.8
  //       casecomponent: Cloud
  //       tags: quota
  //       testSteps:
  //           1. Add openstack provider
  //           2. Provision instance
  //           3. Set quota limit
  //           4. Reconfigure this instance with changing flavors
  //       expectedResults:
  //           1.
  //           2. Provision instance successfully
  //           3.
  //           4. Reconfiguring instance request should succeed
  //   
  let current_instance_type = instance.appliance.rest_api.collections.flavors.get({id: instance.rest_api_entity.flavor_id}).name;
  let flavor_name = (current_instance_type != "m1.small" ? "m1.small (1 CPU, 2.0 GB RAM, 20.0 GB Root Disk)" : "m1.tiny (1 CPU, 0.5 GB RAM, 1.0 GB Root Disk)");
  instance.reconfigure(flavor_name);
  let provision_request = instance.appliance.collections.requests.instantiate(`VM Cloud Reconfigure for: ${instance.name} - Flavor: ${flavor_name.split_p(" ")[0]}`);
  provision_request.wait_for_request({method: "ui"});
  request.addfinalizer(provision_request.remove_request);

  if (!provision_request.is_succeeded({method: "ui"})) {
    throw "Instance reconfigure failed: {}".format(provision_request.row.last_message.text)
  }
}
