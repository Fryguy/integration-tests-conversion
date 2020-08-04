// Test Service Details page functionality.
require_relative("textwrap");
include(Textwrap);
require_relative("timeit");
include(Timeit);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/services/myservice");
include(Cfme.Services.Myservice);
require_relative("cfme/services/myservice/ssui");
include(Cfme.Services.Myservice.Ssui);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance/implementations/ssui");
include(Cfme.Utils.Appliance.Implementations.Ssui);
var ssui_nav = navigate_to.bind(this);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
var ui_nav = navigate_to.bind(this);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.meta({server_roles: "+automate"}),
  test_requirements.ssui,

  pytest.mark.provider({
    selector: ONE_PER_TYPE,
    gen_func: providers,

    filters: [ProviderFilter({
      classes: [InfraProvider, CloudProvider],
      required_fields: ["provisioning"]
    })]
  })
];

function test_myservice_crud(appliance, setup_provider, context, order_service) {
  // Test Myservice crud in SSUI.
  // 
  //   Metadata:
  //       test_flag: ssui, services
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  let catalog_item = order_service;

  appliance.context.use(context, () => {
    let my_service = MyService(appliance, catalog_item.name);
    my_service.set_ownership("Administrator", "EvmGroup-approver");
    my_service.update({description: `${catalog_item.name}_edited`});
    my_service.edit_tags("Cost Center", "Cost Center 002");
    my_service.delete()
  })
};

function test_retire_service_ssui(appliance, setup_provider, context, order_service, request) {
  // Test retire service.
  // 
  //   Metadata:
  //       test_flag: ssui, services
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  let catalog_item = order_service;

  appliance.context.use(context, () => {
    let my_service = MyService(appliance, catalog_item.name);
    my_service.retire();
    let _finalize = () => my_service.delete()
  })
};

function test_service_start(appliance, setup_provider, context, order_service, provider, request) {
  // Test service stop
  // 
  //   Metadata:
  //       test_flag: ssui, services
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  let catalog_item = order_service;

  appliance.context.use(context, () => {
    let my_service = MyService(appliance, catalog_item.name);

    if (is_bool(provider.one_of(
      InfraProvider,
      EC2Provider,
      AzureProvider
    ))) {
      my_service.service_power({power: "Stop"});
      let view = my_service.create_view(DetailsMyServiceView);

      wait_for(() => view.resource_power_status.power_status == "Off", {
        timeout: 1000,
        fail_condition: null,
        message: "Wait for resources off",
        delay: 20
      })
    } else {
      my_service.service_power({power: "Start"});
      let view = my_service.create_view(DetailsMyServiceView);

      wait_for(() => view.resource_power_status.power_status == "On", {
        timeout: 1000,
        fail_condition: null,
        message: "Wait for resources on",
        delay: 20
      })
    };

    let _finalize = () => my_service.delete()
  })
};

// 
//   Test suspending VM from SSUI service details page.
// 
//   Polarion:
//       assignee: apagac
//       casecomponent: Infra
//       caseimportance: medium
//       initialEstimate: 1/4h
//       setup:
//           1. Have a service catalog item that provisions a VM
//       testSteps:
//           1. In SSUI, navigate to My Services -> <service name> to see service details
//           2. In Resources section, choose 'Suspend' from dropdown
//       expectedResults:
//           1. Service details displayed
//           2. VM is suspended; VM is NOT in Unknown Power State
//   Bugzilla:
//       1670373
//   
// pass
function test_suspend_vm_service_details(context) {};

function test_no_error_while_fetching_the_service(request, appliance, user_self_service_role, generic_catalog_item) {
  // 
  // 
  //   Bugzilla:
  //       1677744
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.10
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/6h
  //       testSteps:
  //           1. Provision service in regular UI with user that isn't admin
  //           2. Delete user, then go view the service in the SUI and see if it blows up.
  //       expectedResults:
  //           1.
  //           2. In SUI click on provisioned service
  //   
  let [user, _] = user_self_service_role;

  user(() => (
    appliance.context.use(ViaUI, () => {
      appliance.server.login(user);

      let serv_cat = ServiceCatalogs(appliance, {
        catalog: generic_catalog_item.catalog,
        name: generic_catalog_item.name
      });

      let provision_request = serv_cat.order();
      provision_request.wait_for_request();
      let service = MyService(appliance, generic_catalog_item.dialog.label);
      if (!service.exists) throw new ()
    })
  ));

  let _clear_service = () => {
    if (is_bool(service.exists)) return service.delete()
  };

  provision_request.remove_request({method: "rest"});
  user.delete();
  if (!!user.exists) throw new ();

  for (let context in [ViaUI, ViaSSUI]) {
    appliance.context.use(context, () => {
      if (!service.exists) throw new ()
    })
  }
};

function test_retire_owned_service(request, appliance, context, user_self_service_role, generic_catalog_item) {
  // 
  // 
  //   Bugzilla:
  //       1628520
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.11
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/6h
  //       testSteps:
  //           1. Create a catalog item as User
  //           2. Provision service in regular UI with user
  //           3. Login to Service UI as User
  //           4. Try to retire the service
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4. Service should retire
  //   
  let [user, _] = user_self_service_role;

  user(() => (
    appliance.context.use(context, () => {
      appliance.server.login(user);

      let serv_cat = ServiceCatalogs(appliance, {
        catalog: generic_catalog_item.catalog,
        name: generic_catalog_item.name
      });

      if (context == ViaSSUI) serv_cat.add_to_shopping_cart();
      let provision_request = serv_cat.order();
      provision_request.wait_for_request();
      let service = MyService(appliance, generic_catalog_item.dialog.label);

      let _clear_request_service = () => {
        if (is_bool(provision_request.exists())) {
          provision_request.remove_request({method: "rest"})
        };

        if (is_bool(service.exists)) return service.delete()
      };

      if (!service.exists) throw new ();
      let retire_request = service.retire();
      if (!retire_request.exists()) throw new ();

      let _clear_retire_request = () => {
        if (is_bool(retire_request.exists())) return retire_request.remove_request()
      };

      wait_for(() => service.is_retired, {
        delay: 5,
        num_sec: 120,
        fail_func: service.browser.refresh,
        message: "waiting for service retire"
      })
    })
  ))
};

function test_service_dynamic_dialog_execution(appliance, request, custom_instance) {
  // 
  //   Bugzilla:
  //       1695804
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.11
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/6h
  //       testSteps:
  //           1. Create custom instance and method
  //           2. Create dynamic dialog with above method
  //           3. Create Catalog and catalog item having dynamic dialog
  //           4. Order the service
  //           5. Access service with UI, SSUI, REST
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5. In all context, when opening a service automation code should not run
  //   
  let code = dedent(`
        sleep 20 # wait 20 seconds
        $evm.root['default_value'] = Time.now.to_s
        exit MIQ_OK
        `);
  let instance = custom_instance.call({ruby_code: code});
  if (!instance.exists) throw new ();

  let matched_patterns = [
    `System/Request/${instance.fields.meth1.value}`,
    "MIQ_OK"
  ];

  let service_dialog = appliance.collections.service_dialogs;
  let dialog = fauxfactory.gen_alphanumeric(12, {start: "dialog_"});
  let ele_name = fauxfactory.gen_alphanumeric({start: "ele_"});

  let element_data = {
    element_information: {
      ele_label: fauxfactory.gen_alphanumeric(15, {start: "ele_label_"}),
      ele_name: ele_name,
      ele_desc: fauxfactory.gen_alphanumeric(15, {start: "ele_desc_"}),
      dynamic_chkbox: true,
      choose_type: "Text Box"
    },

    options: {entry_point: instance.tree_path}
  };

  dialog = service_dialog.create({
    label: dialog,
    description: "my dialog"
  });

  let tab = dialog.tabs.create({
    tab_label: fauxfactory.gen_alphanumeric({start: "tab_"}),
    tab_desc: "my tab desc"
  });

  let box = tab.boxes.create({
    box_label: fauxfactory.gen_alphanumeric({start: "box_"}),
    box_desc: "my box desc"
  });

  box.elements.create({element_data: [element_data]});
  request.addfinalizer(dialog.delete_if_exists);

  let catalog = appliance.collections.catalogs.create({
    name: fauxfactory.gen_alphanumeric({start: "cat_"}),
    description: fauxfactory.gen_alphanumeric(15, {start: "cat_desc_"})
  });

  if (!catalog.exists) throw new ();
  request.addfinalizer(catalog.delete_if_exists);

  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.GENERIC,

    {
      name: fauxfactory.gen_alphanumeric(15, {start: "cat_item_"}),

      description: fauxfactory.gen_alphanumeric(
        20,
        {start: "cat_item_desc_"}
      ),

      display_in: true,
      catalog,
      dialog
    }
  );

  if (!catalog_item.exists) throw new ();
  request.addfinalizer(catalog_item.delete_if_exists);

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {matched_patterns}
  )).waiting({timeout: 60}, () => {
    let provision_request = service_catalogs.order({wait_for_view: 30})
  });

  provision_request.wait_for_request();
  let service = MyService(appliance, catalog_item.name);

  let _clean_request_service = () => {
    if (is_bool(provision_request.exists)) {
      provision_request.remove_request({method: "rest"})
    };

    if (is_bool(service.exists)) return service.delete()
  };

  for (let context in [ViaUI, ViaSSUI]) {
    appliance.context.use(context, () => {
      let navigate_to = (context === ViaUI ? ui_nav : ssui_nav);
      navigate_to.call(service, "All");

      (LogValidator(
        "/var/www/miq/vmdb/log/automation.log",
        {failure_patterns: matched_patterns}
      )).waiting({timeout: 60}, () => {
        if (Timeit.timeit(
          () => navigate_to.call(service, "Details"),
          {number: 1}
        ) >= 20) throw new ()
      })
    })
  };

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {failure_patterns: matched_patterns}
  )).waiting({timeout: 60}, () => {
    if (Timeit.timeit(() => service.rest_api_entity, {number: 1}) >= 2) {
      throw new ()
    }
  })
};

function test_list_supported_languages_on_ssui(appliance, soft_assert) {
  // 
  //   Bugzilla:
  //       1743734
  // 
  //   Polarion:
  //       assignee: nansari
  //       startsin: 5.11
  //       caseimportance: medium
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/16h
  //       testSteps:
  //           1. Log into SSUI, see what languages are available
  //       expectedResults:
  //           1. Service UI should list the Supported languages:
  //   
  appliance.context.use(ViaSSUI, () => {
    let view = ssui_nav(appliance.server, "LoggedIn")
  });

  for (let lang in [
    "Browser Default",
    "English",
    "Español",
    "Français",
    "日本語"
  ]) {
    if (!soft_assert.call(view.settings.to_a[1].include(lang))) throw new ()
  }
}
