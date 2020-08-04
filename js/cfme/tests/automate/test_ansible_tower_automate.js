require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/config_management/ansible_tower");
include(Cfme.Infrastructure.Config_management.Ansible_tower);
require_relative("cfme/services/myservice");
include(Cfme.Services.Myservice);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);

let pytestmark = [
  test_requirements.automate,
  pytest.mark.provider([AnsibleTowerProvider], {scope: "module"}),
  pytest.mark.usefixtures("setup_provider")
];

function ansible_catalog_item(appliance, request, provider, ansible_tower_dialog, catalog) {
  let config_manager_obj = provider;
  let provider_name = config_manager_obj.data.get("name");
  let template = config_manager_obj.data.provisioning_data.template;
  let cat_list = [];

  for (let _ in (2).times) {
    let catalog_item = appliance.collections.catalog_items.create(
      appliance.collections.catalog_items.ANSIBLE_TOWER,

      {
        name: ansible_tower_dialog.label,
        description: fauxfactory.gen_alphanumeric(),
        display_in: true,
        catalog,
        dialog: ansible_tower_dialog,
        provider: `${provider_name} Automation Manager`,
        config_template: template
      }
    );

    cat_list.push(catalog_item.name);
    request.addfinalizer(catalog_item.delete_if_exists)
  };

  return cat_list
};

function set_roottenant_quota(request, appliance) {
  let roottenant = appliance.collections.tenants.get_root_tenant();
  let [field, value] = request.param;
  roottenant.set_quota({None: {[`${field}_cb`]: true, field: value}});
  yield;
  roottenant.set_quota({None: {[`${field}_cb`]: false}})
};

function test_quota_for_ansible_service(request, appliance, ansible_catalog_item, catalog, ansible_tower_dialog, set_roottenant_quota) {
  // 
  //   Bugzilla:
  //       1363901
  // 
  //   Polarion:
  //       assignee: ghubale
  //       initialEstimate: 1/4h
  //       caseimportance: low
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.5
  //       casecomponent: Configuration
  //       testSteps:
  //           1. create a service bundle including an Ansible Tower service type
  //           2. make sure CloudForms quotas are enabled
  //           3. provision the service
  //       expectedResults:
  //           1.
  //           2.
  //           3. No error in service bundle provisioning for Ansible Tower service types when quota
  //              is enforce.
  //   
  let bundle_name = fauxfactory.gen_alphanumeric({start: "bundle_"});

  let catalog_bundle = appliance.collections.catalog_bundles.create(
    bundle_name,

    {
      description: "catalog_bundle",
      display_in: true,
      catalog,
      dialog: ansible_tower_dialog,
      catalog_items: ansible_catalog_item
    }
  );

  request.addfinalizer(catalog_bundle.delete_if_exists);

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_bundle.catalog,
    catalog_bundle.name
  );

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {failure_patterns: [".*ERROR.*"]}
  )).waiting({timeout: 120}, () => {
    service_catalogs.order();

    let provision_request = appliance.collections.requests.instantiate(
      bundle_name,
      {partial_check: true}
    );

    let delete = () => {
      navigate_to(appliance.server, "Dashboard");
      return provision_request.remove_request()
    };

    provision_request.wait_for_request();
    let msg = `Provisioning failed with the message ${provision_request.rest.message}`;
    if (!provision_request.is_succeeded()) throw msg
  })
};

function test_retire_ansible_service_bundle(request, appliance, ansible_catalog_item, catalog, ansible_tower_dialog) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       testtype: functional
  //       initialEstimate: 1/4h
  //       startsin: 5.5
  //       tags: service
  //   Bugzilla:
  //       1363897
  //   
  let bundle_name = fauxfactory.gen_alphanumeric({start: "bundle_"});

  let catalog_bundle = appliance.collections.catalog_bundles.create(
    bundle_name,

    {
      description: "catalog_bundle",
      display_in: true,
      catalog,
      dialog: ansible_tower_dialog,
      catalog_items: ansible_catalog_item
    }
  );

  request.addfinalizer(catalog_bundle.delete_if_exists);

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_bundle.catalog,
    catalog_bundle.name
  );

  service_catalogs.order();

  let provision_request = appliance.collections.requests.instantiate(
    bundle_name,
    {partial_check: true}
  );

  provision_request.wait_for_request();
  provision_request.remove_request({method: "rest"});
  let service = MyService(appliance, ansible_tower_dialog.label);
  let retire_request = service.retire();
  if (!retire_request.exists()) throw new ()
}
