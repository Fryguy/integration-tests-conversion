require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/config_management/ansible_tower");
include(Cfme.Infrastructure.Config_management.Ansible_tower);
require_relative("cfme/services/myservice");
include(Cfme.Services.Myservice);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);

let pytestmark = [
  test_requirements.service,
  pytest.mark.provider([AnsibleTowerProvider], {scope: "module"}),
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(2),
  pytest.mark.parametrize("ansible_api_version", ["v1", "v2"]),
  pytest.mark.ignore_stream("upstream")
];

function catalog_item(appliance, request, provider, ansible_tower_dialog, catalog, job_type) {
  let config_manager_obj = provider;
  let provider_name = config_manager_obj.data.get("name");
  let template = config_manager_obj.data.provisioning_data[job_type];

  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.ANSIBLE_TOWER,

    {
      name: ansible_tower_dialog.label,
      description: "my catalog",
      display_in: true,
      catalog,
      dialog: ansible_tower_dialog,
      provider: `${provider_name} Automation Manager`,
      config_template: template
    }
  );

  request.addfinalizer(catalog_item.delete);
  return catalog_item
};

function test_order_tower_catalog_item(appliance, provider, catalog_item, request, job_type, ansible_api_version_change) {
  let service_catalogs;

  // Tests ordering of catalog items for Ansible Template and Workflow jobs
  //   Metadata:
  //       test_flag: provision
  // 
  //   Bugzilla:
  //       1717500
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //       caseimportance: high
  //   
  if (job_type == "template_limit") {
    let host = provider.data.provisioning_data.inventory_host;
    let dialog_values = {limit: host};

    service_catalogs = ServiceCatalogs(
      appliance,
      catalog_item.catalog,
      catalog_item.name,
      {dialog_values}
    )
  } else {
    service_catalogs = ServiceCatalogs(
      appliance,
      catalog_item.catalog,
      catalog_item.name
    )
  };

  service_catalogs.order();

  logger.info(
    "Waiting for cfme provision request for service %s",
    catalog_item.name
  );

  let cells = {Description: catalog_item.name};

  let order_request = appliance.collections.requests.instantiate({
    cells,
    partial_check: true
  });

  order_request.wait_for_request({method: "ui"});
  let msg = `Request failed with the message ${order_request.row.last_message.text}`;
  if (!order_request.is_succeeded({method: "ui"})) throw msg;

  appliance.user.my_settings.default_views.set_default_view(
    "Configuration Management Providers",
    "List View"
  )
};

function test_retire_ansible_service(appliance, catalog_item, request, job_type, ansible_api_version_change) {
  // Tests retiring of catalog items for Ansible Template and Workflow jobs
  //   Metadata:
  //       test_flag: provision
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Services
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  service_catalogs.order();

  logger.info(
    "Waiting for cfme provision request for service %s",
    catalog_item.name
  );

  let cells = {Description: catalog_item.name};

  let order_request = appliance.collections.requests.instantiate({
    cells,
    partial_check: true
  });

  order_request.wait_for_request({method: "ui"});
  let msg = `Request failed with the message ${order_request.row.last_message.text}`;
  if (!order_request.is_succeeded({method: "ui"})) throw msg;
  let myservice = MyService(appliance, catalog_item.name);
  myservice.retire()
}
