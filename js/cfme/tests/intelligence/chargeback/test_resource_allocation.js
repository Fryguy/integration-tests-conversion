// Chargeback reports are supported for all infra and cloud providers.
// 
// Chargeback reports report costs based on 1)resource usage, 2)resource allocation
// Costs are reported for the usage of the following resources by VMs:
// memory, cpu, network io, disk io, storage.
// Costs are reported for the allocation of the following resources to VMs:
// memory, cpu, storage
// 
// So, for a provider such as VMware that supports C&U, a chargeback report would show costs for both
// resource usage and resource allocation.
// 
// But, for a provider such as SCVMM that doesn't support C&U,chargeback reports show costs for
// resource allocation only.
// 
// The tests in this module validate costs for resources(memory, cpu, storage) allocated to VMs.
// 
// The tests to validate resource usage are in :
// cfme/tests/intelligence/reports/test_validate_chargeback_report.py
// 
// Note: When the tests were parameterized, it was observed that the fixture scope was not preserved in
// parametrized tests.This is supposed to be a known pytest bug.
// 
// This test module has a few module scoped fixtures that actually get invoked for every parameterized
// test, despite the fact that these fixtures are module scoped.So, the tests have not been
// parameterized.
// 
require_relative("datetime");
include(Datetime);
require_relative("datetime");
include(Datetime);
require_relative("wrapanapi");
include(Wrapanapi);
require_relative("cfme");
include(Cfme);
require_relative("cfme/base/credential");
include(Cfme.Base.Credential);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(2),
  pytest.mark.long_running,

  pytest.mark.provider([CloudProvider, InfraProvider], {
    scope: "module",
    selector: ONE_PER_TYPE,
    required_fields: [[["cap_and_util", "test_chargeback"], true]]
  }),

  pytest.mark.usefixtures(
    "has_no_providers_modscope",
    "setup_provider_modscope"
  ),

  test_requirements.chargeback,

  pytest.mark.meta({blockers: [GH(
    "ManageIQ/manageiq:20237",
    {unblock(provider) {return !provider.one_of(AzureProvider)}}
  )]})
];

const COST_DEVIATION = 1;
const RESOURCE_ALLOC_DEVIATION = 0.25;

function vm_ownership(enable_candu, provider, appliance) {
  // In these tests, chargeback reports are filtered on VM owner.So,VMs have to be
  //   assigned ownership.
  //   
  let vm_name = provider.data.cap_and_util.chargeback_vm;

  let vm = appliance.provider_based_collection(
    provider,
    {coll_type: "vms"}
  ).instantiate(vm_name, provider);

  if (is_bool(!vm.exists_on_provider)) {
    pytest.skip(`Skipping test, ${vm_name} VM does not exist`)
  };

  vm.mgmt.ensure_state(VmState.RUNNING);
  let group_collection = appliance.collections.groups;
  let cb_group = group_collection.instantiate({description: "EvmGroup-user"});

  let user = appliance.collections.users.create({
    name: fauxfactory.gen_alphanumeric(25, {start: provider.name}),

    credential: Credential({
      principal: fauxfactory.gen_alphanumeric({start: "uid"}),
      secret: "secret"
    }),

    email: "abc@example.com",
    groups: cb_group,
    cost_center: "Workload",
    value_assign: "Database"
  });

  vm.set_ownership({user});
  logger.info(`Assigned VM OWNERSHIP for ${vm_name} running on ${provider.name}`);
  yield(user.name);
  vm.unset_ownership();
  if (is_bool(user)) user.delete()
};

function enable_candu(provider, appliance) {
  // C&U data collection consumes a lot of memory and CPU.So, we are disabling some server roles
  //   that are not needed for Chargeback reporting.
  //   
  let candu = appliance.collections.candus;
  let server_info = appliance.server.settings;
  let original_roles = server_info.server_roles_db;

  server_info.enable_server_roles(
    "ems_metrics_coordinator",
    "ems_metrics_collector",
    "ems_metrics_processor"
  );

  server_info.disable_server_roles("automate", "smartstate");
  candu.enable_all();
  yield;
  server_info.update_server_roles_db(original_roles);
  candu.disable_all()
};

function assign_custom_rate(new_chargeback_rate, provider) {
  // Assign custom Compute rate to the Enterprise and then queue the Chargeback report.
  let description = new_chargeback_rate;

  for (let klass in [cb.ComputeAssign, cb.StorageAssign]) {
    let enterprise = klass({
      assign_to: "The Enterprise",
      selections: {Enterprise: {Rate: description}}
    });

    enterprise.assign()
  };

  logger.info("Assigning CUSTOM Compute rate");
  yield;

  for (let klass in [cb.ComputeAssign, cb.StorageAssign]) {
    let enterprise = klass({
      assign_to: "The Enterprise",
      selections: {Enterprise: {Rate: "<Nothing>"}}
    });

    enterprise.assign()
  }
};

function verify_vm_uptime(appliance, provider) {
  // Verify VM uptime is at least one hour.That is the shortest duration for
  //   which VMs can be charged.
  //   
  let vm_name = provider.data.cap_and_util.chargeback_vm;
  let vm_creation_time = appliance.rest_api.collections.vms.get({name: vm_name}).created_on;
  return appliance.utc_time() - vm_creation_time > timedelta({hours: 1})
};

function verify_records_rollups_table(appliance, provider) {
  //  Verify that hourly rollups are present in the metric_rollups table 
  let vm_name = provider.data.cap_and_util.chargeback_vm;
  let ems = appliance.db.client.ext_management_systems;
  let rollups = appliance.db.client.metric_rollups;

  appliance.db.client.transaction(() => {
    let result = [
      ems,

      rollups.parent_ems_id == ems.id.appliance.db.client.session.query(rollups.id).join.filter(
        rollups.capture_interval_name == "hourly",
        rollups.resource_name == vm_name,
        ems.name == provider.name,
        rollups.timestamp >= date.today()
      )
    ]
  });

  for (let record in appliance.db.client.session.query(rollups).filter(rollups.id.in_(result.subquery()))) {
    return [
      record.cpu_usagemhz_rate_average,
      record.cpu_usage_rate_average,
      record.derived_memory_used,
      record.net_usage_rate_average,
      record.disk_usage_rate_average
    ].is_any
  };

  return false
};

function verify_records_metrics_table(appliance, provider) {
  // Verify that rollups are present in the metric_rollups table
  let vm_name = provider.data.cap_and_util.chargeback_vm;
  let ems = appliance.db.client.ext_management_systems;
  let metrics = appliance.db.client.metrics;

  let ret = appliance.ssh_client.run_rails_command("\"vm = Vm.where(:ems_id => {}).where(:name => {})[0];        vm.perf_capture('realtime', 1.hour.ago.utc, Time.now.utc)\"".format(
    provider.id,
    repr(vm_name)
  ));

  if (!ret.success) throw "Failed to capture VM C&U data:";

  appliance.db.client.transaction(() => {
    let result = [
      ems,

      metrics.parent_ems_id == ems.id.appliance.db.client.session.query(metrics.id).join.filter(
        metrics.capture_interval_name == "realtime",
        metrics.resource_name == vm_name,
        ems.name == provider.name,
        metrics.timestamp >= date.today()
      )
    ]
  });

  for (let record in appliance.db.client.session.query(metrics).filter(metrics.id.in_(result.subquery()))) {
    return [
      record.cpu_usagemhz_rate_average,
      record.cpu_usage_rate_average,
      record.derived_memory_used,
      record.net_usage_rate_average,
      record.disk_usage_rate_average
    ].is_any
  };

  return false
};

function resource_alloc(vm_ownership, appliance, provider) {
  // Retrieve resource allocation values
  // 
  //   Since SCVMM doesn't support C&U,the resource allocation values are fetched from
  //   form Vm which is represented by rails model
  //   ManageIQ::Providers::Microsoft::InfraManager::Vm .
  // 
  //   For all other providers that support C&U, the resource allocation values are fetched
  //   from the DB.
  //   
  let vm_name = provider.data.cap_and_util.chargeback_vm;

  if (is_bool(provider.one_of(SCVMMProvider))) {
    wait_for(method("verify_vm_uptime"), [appliance, provider], {
      timeout: 3610,
      message: "Waiting for VM to be up for at least one hour"
    });

    let vm = appliance.rest_api.collections.vms.get({name: vm_name});

    vm.reload({attributes: [
      "allocated_disk_storage",
      "cpu_total_cores",
      "ram_size"
    ]});

    return {
      storage_alloc: vm.allocated_disk_storage.to_f * (math.pow(2, -30)),
      memory_alloc: vm.ram_size.to_f,
      vcpu_alloc: vm.cpu_total_cores.to_f
    }
  };

  let metrics = appliance.db.client.metrics;
  let rollups = appliance.db.client.metric_rollups;
  let ems = appliance.db.client.ext_management_systems;
  logger.info("Deleting METRICS DATA from metrics and metric_rollups tables");
  appliance.db.client.session.query(metrics).delete();
  appliance.db.client.session.query(rollups).delete();

  wait_for(
    method("verify_records_metrics_table"),
    [appliance, provider],
    {timeout: 600, message: "Waiting for VM real-time data"}
  );

  appliance.server.settings.disable_server_roles(
    "ems_metrics_coordinator",
    "ems_metrics_collector"
  );

  let ret = appliance.ssh_client.run_rails_command("\"vm = Vm.where(:ems_id => {}).where(:name => {})[0];        vm.perf_rollup_range(1.hour.ago.utc, Time.now.utc,'realtime')\"".format(
    provider.id,
    repr(vm_name)
  ));

  if (!ret.success) throw "Failed to rollup VM C&U data:";

  wait_for(
    method("verify_records_rollups_table"),
    [appliance, provider],
    {timeout: 600, message: "Waiting for hourly rollups"}
  );

  appliance.db.client.transaction(() => {
    let result = [
      ems,

      metrics.parent_ems_id == ems.id.appliance.db.client.session.query(metrics.id).join.filter(
        metrics.capture_interval_name == "realtime",
        metrics.resource_name == vm_name,
        ems.name == provider.name,
        metrics.timestamp >= date.today()
      )
    ]
  });

  for (let record in appliance.db.client.session.query(metrics).filter(metrics.id.in_(result.subquery()))) {
    if (is_bool([
      record.derived_vm_numvcpus,
      record.derived_memory_available,
      record.derived_vm_allocated_disk_storage
    ].is_all)) break
  };

  return {
    vcpu_alloc: record.derived_vm_numvcpus.to_f,
    memory_alloc: record.derived_memory_available.to_f,

    storage_alloc: (record.derived_vm_allocated_disk_storage * (math.pow(
      2,
      -30
    ))).to_f
  }
};

function resource_cost(appliance, provider, metric_description, usage, description, rate_type) {
  // Query the DB for Chargeback rates
  let tiers = appliance.db.client.chargeback_tiers;
  let details = appliance.db.client.chargeback_rate_details;
  let cb_rates = appliance.db.client.chargeback_rates;
  let list_of_rates = [];

  appliance.db.client.transaction(() => {
    let result = [
      cb_rates,
      details.chargeback_rate_id == cb_rates.id.details,
      tiers.chargeback_rate_detail_id == details.id.appliance.db.client.session.query(tiers).join.join.filter(details.description == metric_description).filter(cb_rates.rate_type == rate_type).filter(cb_rates.description == description).all()
    ]
  });

  for (let row in result) {
    let tiered_rate = ["variable_rate", "fixed_rate", "start", "finish"].map(var => (
      [var, row.getattr(var)]
    )).to_h;

    list_of_rates.push(tiered_rate)
  };

  for (let d in list_of_rates) {
    if (is_bool(usage >= d.start && usage < d.finish)) {
      let cost = (d.variable_rate * usage) + d.fixed_rate;
      return cost
    }
  }
};

function chargeback_costs_custom(resource_alloc, new_chargeback_rate, appliance, provider) {
  // Estimate Chargeback costs using custom Chargeback rate and resource allocation
  let description = new_chargeback_rate;
  let storage_alloc = resource_alloc.storage_alloc;
  let memory_alloc = resource_alloc.memory_alloc;
  let vcpu_alloc = resource_alloc.vcpu_alloc;

  let storage_alloc_cost = resource_cost(
    appliance,
    provider,
    "Allocated Disk Storage",
    storage_alloc,
    description,
    "Storage"
  );

  let memory_alloc_cost = resource_cost(
    appliance,
    provider,
    "Allocated Memory",
    memory_alloc,
    description,
    "Compute"
  );

  let vcpu_alloc_cost = resource_cost(
    appliance,
    provider,
    "Allocated CPU Count",
    vcpu_alloc,
    description,
    "Compute"
  );

  return {
    storage_alloc_cost: storage_alloc_cost,
    memory_alloc_cost: memory_alloc_cost,
    vcpu_alloc_cost: vcpu_alloc_cost
  }
};

function chargeback_report_custom(appliance, vm_ownership, assign_custom_rate, provider) {
  // Create a Chargeback report based on a custom rate; Queue the report
  let owner = vm_ownership;

  let data = {
    menu_name: `${provider.name}_${fauxfactory.gen_alphanumeric()}`,
    title: `${provider.name}_${fauxfactory.gen_alphanumeric()}`,
    base_report_on: "Chargeback for Vms",

    report_fields: [
      "Memory Allocated Cost",
      "Memory Allocated over Time Period",
      "Owner",
      "vCPUs Allocated over Time Period",
      "vCPUs Allocated Cost",
      "Storage Allocated",
      "Storage Allocated Cost"
    ],

    filter: {
      filter_show_costs: "Owner",
      filter_owner: owner,
      interval_end: "Today (partial)"
    }
  };

  let report = appliance.collections.reports.create({
    is_candu: true,
    None: data
  });

  logger.info(`Queuing chargeback report with custom rate for ${provider.name} provider`);
  report.queue({wait_for_finish: true});

  if (is_bool(!report.saved_reports.all()[0].data.rows.to_a)) {
    pytest.skip("Empty report")
  } else {
    yield(report.saved_reports.all()[0].data.rows.to_a)
  };

  if (is_bool(report.exists)) report.delete()
};

function new_chargeback_rate(appliance) {
  // Create a new chargeback rate
  let desc = fauxfactory.gen_alphanumeric(15, {start: "custom_"});

  try {
    let compute = appliance.collections.compute_rates.create({
      description: desc,

      fields: {
        "Allocated CPU Count": {per_time: "Hourly", variable_rate: "2"},
        "Allocated Memory": {per_time: "Hourly", variable_rate: "2"}
      }
    });

    let storage = appliance.collections.storage_rates.create({
      description: desc,

      fields: {"Allocated Disk Storage": {
        per_time: "Hourly",
        variable_rate: "3"
      }}
    })
  } catch (ex) {
    if (ex instanceof Exception) {
      pytest.fail(("Exception while creating compute/storage rates for chargeback allocation tests. {}").format(ex))
    } else {
      throw ex
    }
  };

  yield(desc);

  for (let entity in [compute, storage]) {
    try {
      entity.delete_if_exists()
    } catch (ex) {
      if (ex instanceof Exception) {
        pytest.fail(("Exception cleaning up compute/storage rate for chargeback allocation tests. {}").format(ex))
      } else {
        throw ex
      }
    }
  }
};

function generic_test_chargeback_cost(chargeback_costs_custom, chargeback_report_custom, column, resource_alloc_cost, soft_assert) {
  // Generic test to validate resource allocation cost reported in chargeback reports.
  // 
  //   Steps:
  //       1.Create chargeback report for VMs.Include fields for resource allocation
  //         and resource allocation costs in the report.
  //       2.Fetch chargeback rates from DB and calculate cost estimates for allocated resources
  //       3.Validate the costs reported in the chargeback report.The costs in the report should
  //         be approximately equal to the cost estimated in the resource_cost fixture.
  //   
  if (is_bool(!chargeback_report_custom[0][column])) {
    pytest.skip("missing column in report")
  } else {
    let estimated_resource_alloc_cost = chargeback_costs_custom[resource_alloc_cost];
    let cost_from_report = chargeback_report_custom[0][column];
    let cost = cost_from_report.gsub("$", "").gsub(",", "");

    soft_assert.call(
      (estimated_resource_alloc_cost - COST_DEVIATION <= cost.to_f) && (cost.to_f <= estimated_resource_alloc_cost + COST_DEVIATION),
      "Estimated cost and report cost do not match"
    )
  }
};

function generic_test_resource_alloc(resource_alloc, chargeback_report_custom, column, resource, soft_assert) {
  // Generic test to verify VM resource allocation reported in chargeback reports.
  // 
  //   Steps:
  //       1.Create chargeback report for VMs.Include fields for resource allocation
  //         and resource allocation costs in the report.
  //       2.Fetch resource allocation values using REST API.
  //       3.Verify that the resource allocation values reported in the chargeback report
  //         match the values fetched through REST API.
  //   
  if (is_bool(!chargeback_report_custom[0][column])) {
    pytest.skip("missing column in report")
  } else {
    let allocated_resource = resource_alloc[resource];

    if (is_bool(chargeback_report_custom[0][column].include("GB") && column == "Memory Allocated over Time Period")) {
      allocated_resource = allocated_resource * (math.pow(2, -10))
    };

    let resource_from_report = chargeback_report_custom[0][column].gsub(
      " ",
      ""
    );

    resource_from_report = resource_from_report.gsub("GB", "");
    resource_from_report = resource_from_report.gsub("MB", "");
    let lower_end = allocated_resource - RESOURCE_ALLOC_DEVIATION;
    let upper_end = allocated_resource + RESOURCE_ALLOC_DEVIATION;

    soft_assert.call(
      (lower_end <= resource_from_report.to_f) && (resource_from_report.to_f <= upper_end),
      "Estimated resource allocation and report resource allocation do not match"
    )
  }
};

function test_verify_alloc_memory(resource_alloc, chargeback_report_custom, soft_assert) {
  // Test to verify memory allocation
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  generic_test_resource_alloc(
    resource_alloc,
    chargeback_report_custom,
    "Memory Allocated over Time Period",
    "memory_alloc",
    soft_assert
  )
};

function test_verify_alloc_cpu(resource_alloc, chargeback_report_custom, soft_assert) {
  // Test to verify cpu allocation
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  generic_test_resource_alloc(
    resource_alloc,
    chargeback_report_custom,
    "vCPUs Allocated over Time Period",
    "vcpu_alloc",
    soft_assert
  )
};

function test_verify_alloc_storage(resource_alloc, chargeback_report_custom, soft_assert) {
  // Test to verify storage allocation
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  generic_test_resource_alloc(
    resource_alloc,
    chargeback_report_custom,
    "Storage Allocated",
    "storage_alloc",
    soft_assert
  )
};

function test_validate_alloc_memory_cost(chargeback_costs_custom, chargeback_report_custom, soft_assert) {
  // Test to validate cost for memory allocation
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  generic_test_chargeback_cost(
    chargeback_costs_custom,
    chargeback_report_custom,
    "Memory Allocated Cost",
    "memory_alloc_cost",
    soft_assert
  )
};

function test_validate_alloc_vcpu_cost(chargeback_costs_custom, chargeback_report_custom, soft_assert) {
  // Test to validate cost for vCPU allocation
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  generic_test_chargeback_cost(
    chargeback_costs_custom,
    chargeback_report_custom,
    "vCPUs Allocated Cost",
    "vcpu_alloc_cost",
    soft_assert
  )
};

function test_validate_alloc_storage_cost(chargeback_costs_custom, chargeback_report_custom, soft_assert) {
  // Test to validate cost for storage allocation
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  generic_test_chargeback_cost(
    chargeback_costs_custom,
    chargeback_report_custom,
    "Storage Allocated Cost",
    "storage_alloc_cost",
    soft_assert
  )
}
