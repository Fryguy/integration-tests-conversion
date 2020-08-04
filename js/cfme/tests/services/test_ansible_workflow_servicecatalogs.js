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
  pytest.mark.tier(2),
  pytest.mark.provider([AnsibleTowerProvider], {scope: "module"}),
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.parametrize("ansible_api_version", ["v1", "v2"]),
  pytest.mark.ignore_stream("upstream")
];

function ansible_workflow_catitem(appliance, provider, dialog, catalog, workflow_type) {
  let config_manager_obj = provider;
  let provider_name = config_manager_obj.data.get("name");

  try {
    let template = config_manager_obj.data.provisioning_data[workflow_type]
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip(`No such Ansible template: ${workflow_type} found in cfme_data.yaml`)
    } else {
      throw $EXCEPTION
    }
  };

  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.ANSIBLE_TOWER,

    {
      name: dialog.label,
      description: "my catalog",
      display_in: true,
      catalog,
      dialog,
      provider: `${provider_name} Automation Manager`,
      config_template: template
    }
  );

  yield(catalog_item);
  catalog_item.delete_if_exists()
};

function test_tower_workflow_item(appliance, ansible_workflow_catitem, workflow_type, ansible_api_version_change) {
  // Tests ordering of catalog items for Ansible Workflow templates
  //   Metadata:
  //       test_flag: provision
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //       caseimportance: high
  //   
  let service_catalogs = ServiceCatalogs(
    appliance,
    ansible_workflow_catitem.catalog,
    ansible_workflow_catitem.name
  );

  service_catalogs.order();

  logger.info(
    "Waiting for cfme provision request for service %s",
    ansible_workflow_catitem.name
  );

  let cells = {Description: ansible_workflow_catitem.name};

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

function test_retire_ansible_workflow(appliance, ansible_workflow_catitem, workflow_type, ansible_api_version_change) {
  // Tests retiring of catalog items for Ansible Workflow templates
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
    ansible_workflow_catitem.catalog,
    ansible_workflow_catitem.name
  );

  service_catalogs.order();

  logger.info(
    "Waiting for cfme provision request for service %s",
    ansible_workflow_catitem.name
  );

  let cells = {Description: ansible_workflow_catitem.name};

  let order_request = appliance.collections.requests.instantiate({
    cells,
    partial_check: true
  });

  order_request.wait_for_request({method: "ui"});
  let msg = `Request failed with the message ${order_request.row.last_message.text}`;
  if (!order_request.is_succeeded({method: "ui"})) throw msg;
  let myservice = MyService(appliance, ansible_workflow_catitem.name);
  myservice.retire()
}
