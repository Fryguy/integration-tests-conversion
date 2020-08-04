require_relative("datetime");
include(Datetime);
require_relative("datetime");
include(Datetime);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/services/dashboard");
include(Cfme.Services.Dashboard);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.meta({server_roles: "+automate"}),
  pytest.mark.usefixtures("uses_infra_providers"),
  test_requirements.ssui,

  pytest.mark.provider([InfraProvider], {
    selector: ONE_PER_TYPE,

    required_fields: [
      ["provisioning", "template"],
      ["provisioning", "host"],
      ["provisioning", "datastore"]
    ],

    scope: "module"
  })
];

function enable_candu(appliance) {
  let candu = appliance.collections.candus;
  let server_info = appliance.server.settings;
  let original_roles = server_info.server_roles_db;

  server_info.enable_server_roles(
    "ems_metrics_coordinator",
    "ems_metrics_collector",
    "ems_metrics_processor"
  );

  candu.enable_all();
  yield;
  server_info.update_server_roles_db(original_roles);
  candu.disable_all()
};

function new_compute_rate(appliance, enable_candu) {
  let desc = fauxfactory.gen_alphanumeric(12, {start: "custom_"});

  try {
    let compute = appliance.collections.compute_rates.create({
      description: desc,

      fields: {
        "Used CPU": {per_time: "Hourly", variable_rate: "3"},
        "Allocated CPU Count": {per_time: "Hourly", fixed_rate: "2"},
        "Used Disk I/O": {per_time: "Hourly", variable_rate: "2"},
        "Allocated Memory": {per_time: "Hourly", fixed_rate: "1"},
        "Used Memory": {per_time: "Hourly", variable_rate: "2"}
      }
    });

    let storage = appliance.collections.storage_rates.create({
      description: desc,

      fields: {
        "Used Disk Storage": {per_time: "Hourly", variable_rate: "3"},
        "Allocated Disk Storage": {per_time: "Hourly", fixed_rate: "3"}
      }
    })
  } catch (ex) {
    if (ex instanceof Exception) {
      pytest.fail(`Exception during chargeback creation for test setup: ${ex.message}`)
    } else {
      throw ex
    }
  };

  yield(desc);

  for (let rate in [compute, storage]) {
    rate.delete_if_exists()
  }
};

function assign_chargeback_rate(new_compute_rate) {
  // Assign custom Compute rate to the Enterprise and then queue the Chargeback report.
  logger.info(
    "Assigning Compute and Storage rates: %s",
    new_compute_rate
  );

  let make_assignment = (rate) => {
    for (let klass in [cb.ComputeAssign, cb.StorageAssign]) {
      klass({
        assign_to: "The Enterprise",
        selections: {Enterprise: {Rate: rate}}
      }).assign()
    }
  };

  make_assignment.call(method("new_compute_rate"));
  yield;
  make_assignment.call("<Nothing>")
};

function verify_vm_uptime(appliance, provider, vmname) {
  // Verifies VM uptime is at least one hour.
  // 
  //   One hour is the shortest duration for which VMs can be charged.
  //   
  let vm_creation_time = appliance.rest_api.collections.vms.get({name: vmname}).created_on;
  return appliance.utc_time() - vm_creation_time > timedelta({hours: 1})
};

function run_service_chargeback_report(provider, appliance, assign_chargeback_rate, order_service) {
  let catalog_item = order_service;
  let vmname = catalog_item.prov_data.catalog.vm_name;

  let verify_records_rollups_table = (appliance, provider) => {
    let ems = appliance.db.client.ext_management_systems;
    let rollups = appliance.db.client.metric_rollups;

    appliance.db.client.transaction(() => {
      let result = [
        ems,

        rollups.parent_ems_id == ems.id.appliance.db.client.session.query(rollups.id).join.filter(
          rollups.capture_interval_name == "hourly",
          rollups.resource_name.contains(vmname),
          ems.name == provider.name,
          rollups.timestamp >= date.today()
        )
      ]
    });

    for (let record in appliance.db.client.session.query(rollups).filter(rollups.id.in_(result.subquery()))) {
      if (is_bool(!record.cpu_usagemhz_rate_average.equal(null) || !record.cpu_usage_rate_average.equal(null) || !record.derived_memory_used.equal(null) || !record.net_usage_rate_average.equal(null) || !record.disk_usage_rate_average.equal(null))) {
        return true
      }
    };

    return false
  };

  if (is_bool(provider.one_of(SCVMMProvider))) {
    wait_for(method("verify_vm_uptime"), [appliance, provider, vmname], {
      timeout: 3610,
      delay: 10,
      message: "Waiting for VM to be up for at least one hour"
    })
  } else {
    wait_for(
      method("verify_records_rollups_table"),
      [appliance, provider],
      {timeout: 3600, delay: 10, message: "Waiting for hourly rollups"}
    )
  };

  let result = appliance.ssh_client.run_rails_command("Service.queue_chargeback_reports");
  if (!result.success) throw "Failed to run Service Chargeback report"
};

function test_total_services(appliance, setup_provider, context, order_service) {
  // Tests total services count displayed on dashboard.
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  appliance.context.use(context, () => {
    let dashboard = Dashboard(appliance);
    if (dashboard.total_services() != dashboard.results()) throw new ()
  })
};

function test_current_service(appliance, context) {
  // Tests current services count displayed on dashboard.
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  appliance.context.use(context, () => {
    let dashboard = Dashboard(appliance);
    if (dashboard.current_services() != dashboard.results()) throw new ()
  })
};

function test_retiring_soon(appliance, context) {
  // Tests retiring soon(int displayed) service count on dashboard.
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  appliance.context.use(context, () => {
    let dashboard = Dashboard(appliance);
    if (dashboard.retiring_soon() != dashboard.results()) throw new ()
  })
};

function test_retired_service(appliance, context) {
  // Tests count of retired services(int) displayed on dashboard.
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  appliance.context.use(context, () => {
    let dashboard = Dashboard(appliance);
    if (dashboard.retired_services() != dashboard.results()) throw new ()
  })
};

function test_monthly_charges(appliance, has_no_providers_modscope, setup_provider, context, order_service, run_service_chargeback_report) {
  // Tests chargeback data
  // 
  //   Polarion:
  //       assignee: nachandr
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //   
  appliance.context.use(context, () => {
    let dashboard = Dashboard(appliance);
    let monthly_charges = dashboard.monthly_charges();
    logger.info(`Monthly charges is ${monthly_charges}`);
    if (monthly_charges == "$0") throw new ()
  })
};

function test_service_chargeback_multiple_vms(appliance, has_no_providers_modscope, setup_provider, context, order_service, run_service_chargeback_report) {
  // Tests chargeback data for a service with multiple VMs
  //   Polarion:
  //       assignee: nachandr
  //       casecomponent: SelfServiceUI
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //   
  appliance.context.use(context, () => {
    let dashboard = Dashboard(appliance);
    let monthly_charges = dashboard.monthly_charges();
    logger.info(`Monthly charges is ${monthly_charges}`);
    if (monthly_charges == "$0") throw new ()
  })
};

function test_total_requests(appliance, context) {
  // Tests total requests displayed.
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  appliance.context.use(context, () => {
    let dashboard = Dashboard(appliance);
    dashboard.total_requests()
  })
};

function test_pending_requests(appliance, context) {
  // Tests pending requests displayed on dashboard.
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  appliance.context.use(context, () => {
    let dashboard = Dashboard(appliance);
    dashboard.pending_requests()
  })
};

function test_approved_requests(appliance, context) {
  // Tests approved requests displayed on dashboard.
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  appliance.context.use(context, () => {
    let dashboard = Dashboard(appliance);
    dashboard.approved_requests()
  })
};

function test_denied_requests(appliance, context) {
  // Tests denied requests displayed on dashboard.
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SelfServiceUI
  //       initialEstimate: 1/4h
  //       tags: ssui
  //   
  appliance.context.use(context, () => {
    let dashboard = Dashboard(appliance);
    dashboard.denied_requests()
  })
}
