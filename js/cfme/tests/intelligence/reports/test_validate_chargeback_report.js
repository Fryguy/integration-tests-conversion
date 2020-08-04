//  Chargeback reports are supported for all infra and cloud providers.
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
// The tests in this module validate costs for resource usage.
// 
// The tests for resource allocation are in :
// cfme/tests/intelligence/chargeback/test_resource_allocation.py
// 
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
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/cloud/provider/gce");
include(Cfme.Cloud.Provider.Gce);
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
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let cloud_and_infra = ProviderFilter({
  classes: [CloudProvider, InfraProvider],
  required_fields: [[["cap_and_util", "test_chargeback"], true]]
});

let not_scvmm = ProviderFilter({
  classes: [SCVMMProvider],
  inverted: true
});

let not_cloud = ProviderFilter({
  classes: [CloudProvider],
  inverted: true
});

let not_ec2_gce = ProviderFilter({
  classes: [GCEProvider, EC2Provider],
  inverted: true
});

let pytestmark = [
  pytest.mark.tier(2),

  pytest.mark.provider({
    gen_func: providers,
    filters: [cloud_and_infra, not_scvmm],
    scope: "module"
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

const DEV = 1;

function cost_comparison(estimate, expected) {
  let subbed = re.sub("[$,]", "", expected);
  return (estimate - DEV).to_f <= subbed.to_f && (subbed.to_f <= (estimate + DEV).to_f)
};

function vm_ownership(enable_candu, provider, appliance) {
  let vm_name = provider.data.cap_and_util.chargeback_vm;
  let collection = provider.appliance.provider_based_collection(provider);
  let vm = collection.instantiate(vm_name, provider);

  if (is_bool(!vm.exists_on_provider)) {
    pytest.skip("Skipping test, cu-24x7 VM does not exist")
  };

  vm.mgmt.ensure_state(VmState.RUNNING);
  let group_collection = appliance.collections.groups;
  let cb_group = group_collection.instantiate({description: "EvmGroup-user"});
  let user = null;

  try {
    user = appliance.collections.users.create({
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
    yield(user.name)
  } finally {
    vm.unset_ownership();
    if (is_bool(user)) user.delete()
  }
};

function enable_candu(provider, appliance) {
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

function assign_default_rate(provider) {
  for (let klass in [cb.ComputeAssign, cb.StorageAssign]) {
    let enterprise = klass({
      assign_to: "The Enterprise",
      selections: {Enterprise: {Rate: "Default"}}
    });

    enterprise.assign()
  };

  logger.info("Assigning DEFAULT Compute rate");
  yield;

  for (let klass in [cb.ComputeAssign, cb.StorageAssign]) {
    let enterprise = klass({
      assign_to: "The Enterprise",
      selections: {Enterprise: {Rate: "<Nothing>"}}
    });

    enterprise.assign()
  }
};

function assign_custom_rate(new_compute_rate, provider) {
  let description = new_compute_rate;

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

function verify_records_rollups_table(appliance, provider) {
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
    if (is_bool(record.cpu_usagemhz_rate_average || record.cpu_usage_rate_average || record.derived_memory_used || record.net_usage_rate_average || record.disk_usage_rate_average)) {
      return true
    }
  };

  return false
};

function resource_usage(vm_ownership, appliance, provider) {
  let average_cpu_used_in_mhz = 0;
  let average_memory_used_in_mb = 0;
  let average_network_io = 0;
  let average_disk_io = 0;
  let average_storage_used = 0;
  let consumed_hours = 0;
  let vm_name = provider.data.cap_and_util.chargeback_vm;
  let metrics = appliance.db.client.metrics;
  let rollups = appliance.db.client.metric_rollups;
  let ems = appliance.db.client.ext_management_systems;
  logger.info("Deleting METRICS DATA from metrics and metric_rollups tables");
  appliance.db.client.session.query(metrics).delete();
  appliance.db.client.session.query(rollups).delete();

  let verify_records_metrics_table = (appliance, provider) => {
    vm_name = provider.data.cap_and_util.chargeback_vm;
    ems = appliance.db.client.ext_management_systems;
    metrics = appliance.db.client.metrics;

    let result = appliance.ssh_client.run_rails_command("\"vm = Vm.where(:ems_id => {}).where(:name => {})[0];            vm.perf_capture('realtime', 1.hour.ago.utc, Time.now.utc)\"".format(
      provider.id,
      repr(vm_name)
    ));

    if (!result.success) throw "Failed to capture VM C&U data:";

    appliance.db.client.transaction(() => {
      result = [
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
      if (is_bool(record.cpu_usagemhz_rate_average || record.cpu_usage_rate_average || record.derived_memory_used || record.net_usage_rate_average || record.disk_usage_rate_average)) {
        return true
      }
    };

    return false
  };

  wait_for(
    method("verify_records_metrics_table"),
    [appliance, provider],

    {
      timeout: 600,
      fail_condition: false,
      message: "Waiting for VM real-time data"
    }
  );

  appliance.server.settings.disable_server_roles(
    "ems_metrics_coordinator",
    "ems_metrics_collector"
  );

  let result = appliance.ssh_client.run_rails_command("\"vm = Vm.where(:ems_id => {}).where(:name => {})[0];        vm.perf_rollup_range(1.hour.ago.utc, Time.now.utc,'realtime')\"".format(
    provider.id,
    repr(vm_name)
  ));

  if (!result.success) throw "Failed to rollup VM C&U data:";

  wait_for(
    method("verify_records_rollups_table"),
    [appliance, provider],

    {
      timeout: 600,
      fail_condition: false,
      message: "Waiting for hourly rollups"
    }
  );

  appliance.db.client.transaction(() => {
    result = [
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
    consumed_hours = consumed_hours + 1;

    if (is_bool(record.cpu_usagemhz_rate_average || record.cpu_usage_rate_average || record.derived_memory_used || record.net_usage_rate_average || record.disk_usage_rate_average)) {
      average_cpu_used_in_mhz = average_cpu_used_in_mhz + record.cpu_usagemhz_rate_average;
      average_memory_used_in_mb = average_memory_used_in_mb + record.derived_memory_used;
      average_network_io = average_network_io + record.net_usage_rate_average;
      average_disk_io = average_disk_io + record.disk_usage_rate_average
    }
  };

  for (let record in appliance.db.client.session.query(rollups).filter(rollups.id.in_(result.subquery()))) {
    if (is_bool(record.derived_vm_used_disk_storage)) {
      average_storage_used = average_storage_used + record.derived_vm_used_disk_storage
    }
  };

  average_storage_used = average_storage_used * (math.pow(2, -30));
  yield({});

  appliance.server.settings.enable_server_roles(
    "ems_metrics_coordinator",
    "ems_metrics_collector"
  )
};

function resource_cost(appliance, provider, metric_description, usage, description, rate_type, consumed_hours) {
  let tiers = appliance.db.client.chargeback_tiers;
  let details = appliance.db.client.chargeback_rate_details;
  let cb_rates = appliance.db.client.chargeback_rates;
  let list_of_rates = [];
  let add_rate = tiered_rate => list_of_rates.push(tiered_rate);

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

    add_rate.call(tiered_rate)
  };

  for (let d in list_of_rates) {
    if (is_bool(usage >= d.start && usage < d.finish)) {
      let cost = (d.variable_rate * usage) + (d.fixed_rate * consumed_hours);
      return cost
    }
  }
};

function chargeback_costs_default(resource_usage, appliance, provider) {
  let average_cpu_used_in_mhz = resource_usage.average_cpu_used_in_mhz;
  let average_memory_used_in_mb = resource_usage.average_memory_used_in_mb;
  let average_network_io = resource_usage.average_network_io;
  let average_disk_io = resource_usage.average_disk_io;
  let average_storage_used = resource_usage.average_storage_used;
  let consumed_hours = resource_usage.consumed_hours;

  let cpu_used_cost = resource_cost(
    appliance,
    provider,
    "Used CPU",
    average_cpu_used_in_mhz,
    "Default",
    "Compute",
    consumed_hours
  );

  let memory_used_cost = resource_cost(
    appliance,
    provider,
    "Used Memory",
    average_memory_used_in_mb,
    "Default",
    "Compute",
    consumed_hours
  );

  let network_used_cost = resource_cost(
    appliance,
    provider,
    "Used Network I/O",
    average_network_io,
    "Default",
    "Compute",
    consumed_hours
  );

  let disk_used_cost = resource_cost(
    appliance,
    provider,
    "Used Disk I/O",
    average_disk_io,
    "Default",
    "Compute",
    consumed_hours
  );

  let storage_used_cost = resource_cost(
    appliance,
    provider,
    "Used Disk Storage",
    average_storage_used,
    "Default",
    "Storage",
    consumed_hours
  );

  return {
    cpu_used_cost: cpu_used_cost,
    memory_used_cost: memory_used_cost,
    network_used_cost: network_used_cost,
    disk_used_cost: disk_used_cost,
    storage_used_cost: storage_used_cost
  }
};

function chargeback_costs_custom(resource_usage, new_compute_rate, appliance, provider) {
  let description = new_compute_rate;
  let average_cpu_used_in_mhz = resource_usage.average_cpu_used_in_mhz;
  let average_memory_used_in_mb = resource_usage.average_memory_used_in_mb;
  let average_network_io = resource_usage.average_network_io;
  let average_disk_io = resource_usage.average_disk_io;
  let average_storage_used = resource_usage.average_storage_used;
  let consumed_hours = resource_usage.consumed_hours;

  let cpu_used_cost = resource_cost(
    appliance,
    provider,
    "Used CPU",
    average_cpu_used_in_mhz,
    description,
    "Compute",
    consumed_hours
  );

  let memory_used_cost = resource_cost(
    appliance,
    provider,
    "Used Memory",
    average_memory_used_in_mb,
    description,
    "Compute",
    consumed_hours
  );

  let network_used_cost = resource_cost(
    appliance,
    provider,
    "Used Network I/O",
    average_network_io,
    description,
    "Compute",
    consumed_hours
  );

  let disk_used_cost = resource_cost(
    appliance,
    provider,
    "Used Disk I/O",
    average_disk_io,
    description,
    "Compute",
    consumed_hours
  );

  let storage_used_cost = resource_cost(
    appliance,
    provider,
    "Used Disk Storage",
    average_storage_used,
    description,
    "Storage",
    consumed_hours
  );

  return {
    cpu_used_cost: cpu_used_cost,
    memory_used_cost: memory_used_cost,
    network_used_cost: network_used_cost,
    disk_used_cost: disk_used_cost,
    storage_used_cost: storage_used_cost
  }
};

function chargeback_report_default(appliance, vm_ownership, assign_default_rate, provider) {
  let owner = vm_ownership;

  let data = {
    menu_name: "cb_" + provider.name,
    title: "cb_" + provider.name,
    base_report_on: "Chargeback for Vms",

    report_fields: [
      "Memory Used",
      "Memory Used Cost",
      "Owner",
      "CPU Used",
      "CPU Used Cost",
      "Disk I/O Used",
      "Disk I/O Used Cost",
      "Network I/O Used",
      "Network I/O Used Cost",
      "Storage Used",
      "Storage Used Cost"
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

  logger.info(`Queuing chargeback report with default rate for ${provider.name} provider`);
  report.queue({wait_for_finish: true});
  yield(report.saved_reports.all()[0].data.rows.to_a);
  if (is_bool(report.exists)) report.delete()
};

function chargeback_report_custom(appliance, vm_ownership, assign_custom_rate, provider) {
  let owner = vm_ownership;

  let data = {
    menu_name: "cb_custom_" + provider.name,
    title: "cb_custom" + provider.name,
    base_report_on: "Chargeback for Vms",

    report_fields: [
      "Memory Used",
      "Memory Used Cost",
      "Owner",
      "CPU Used",
      "CPU Used Cost",
      "Disk I/O Used",
      "Disk I/O Used Cost",
      "Network I/O Used",
      "Network I/O Used Cost",
      "Storage Used",
      "Storage Used Cost"
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
  yield(report.saved_reports.all()[0].data.rows.to_a);
  if (is_bool(report.exists)) report.delete()
};

function new_compute_rate(appliance) {
  try {
    let desc = "cstm_" + fauxfactory.gen_alphanumeric();

    let compute = appliance.collections.compute_rates.create({
      description: desc,

      fields: {
        "Used CPU": {per_time: "Hourly", variable_rate: "3"},
        "Used Disk I/O": {per_time: "Hourly", variable_rate: "2"},
        "Used Memory": {per_time: "Hourly", variable_rate: "2"}
      }
    });

    let storage = appliance.collections.storage_rates.create({
      description: desc,

      fields: {"Used Disk Storage": {
        per_time: "Hourly",
        variable_rate: "3"
      }}
    })
  } catch (ex) {
    if (ex instanceof Exception) {
      pytest.fail(("Exception while creating compute/storage rates for chargeback report tests. {}").format(ex))
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
        pytest.fail(("Exception while cleaning up compute/storage rates for chargeback report tests. {}").format(ex))
      } else {
        throw ex
      }
    }
  }
};

function test_validate_default_rate_cpu_usage_cost(chargeback_costs_default, chargeback_report_default) {
  // Test to validate CPU usage cost.
  //      Calculation is based on default Chargeback rate.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       caseimportance: medium
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //   
  for (let groups in chargeback_report_default) {
    if (is_bool(groups["CPU Used Cost"])) {
      let est_cpu_cost = chargeback_costs_default.cpu_used_cost;
      let report_cost = groups["CPU Used Cost"];

      if (!cost_comparison(est_cpu_cost, report_cost)) {
        throw "CPU report costs does not match"
      };

      break
    }
  }
};

function test_validate_default_rate_memory_usage_cost(chargeback_costs_default, chargeback_report_default) {
  // Test to validate memory usage cost.
  //      Calculation is based on default Chargeback rate.
  // 
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       caseimportance: medium
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //   
  for (let groups in chargeback_report_default) {
    if (is_bool(groups["Memory Used Cost"])) {
      let est_memory_cost = chargeback_costs_default.memory_used_cost;
      let report_cost = groups["Memory Used Cost"];

      if (!cost_comparison(est_memory_cost, report_cost)) {
        throw "Memory report cost do not match"
      };

      break
    }
  }
};

function test_validate_default_rate_network_usage_cost(chargeback_costs_default, chargeback_report_default) {
  // Test to validate network usage cost.
  //      Calculation is based on default Chargeback rate.
  // 
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       caseimportance: medium
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //   
  for (let groups in chargeback_report_default) {
    if (is_bool(groups["Network I/O Used Cost"])) {
      let est_net_cost = chargeback_costs_default.network_used_cost;
      let report_cost = groups["Network I/O Used Cost"];

      if (!cost_comparison(est_net_cost, report_cost)) {
        throw "Network report cost does not match"
      };

      break
    }
  }
};

function test_validate_default_rate_disk_usage_cost(chargeback_costs_default, chargeback_report_default) {
  // Test to validate disk usage cost.
  //      Calculation is based on default Chargeback rate.
  // 
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //   
  for (let groups in chargeback_report_default) {
    if (is_bool(groups["Disk I/O Used Cost"])) {
      let est_disk_cost = chargeback_costs_default.disk_used_cost;
      let report_cost = groups["Disk I/O Used Cost"];

      if (!cost_comparison(est_disk_cost, report_cost)) {
        throw "Disk report cost does not match"
      };

      break
    }
  }
};

function test_validate_default_rate_storage_usage_cost(chargeback_costs_default, chargeback_report_default) {
  // Test to validate stoarge usage cost.
  //      Calculation is based on default Chargeback rate.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/12h
  //       casecomponent: Reporting
  //   
  for (let groups in chargeback_report_default) {
    if (is_bool(groups["Storage Used Cost"])) {
      let est_stor_cost = chargeback_costs_default.storage_used_cost;
      let report_cost = groups["Storage Used Cost"];

      if (!cost_comparison(est_stor_cost, report_cost)) {
        throw "Storage report cost does not match"
      };

      break
    }
  }
};

function test_validate_custom_rate_cpu_usage_cost(chargeback_costs_custom, chargeback_report_custom) {
  // Test to validate CPU usage cost.
  //      Calculation is based on custom Chargeback rate.
  // 
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       caseimportance: medium
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //   
  for (let groups in chargeback_report_custom) {
    if (is_bool(groups["CPU Used Cost"])) {
      let est_cpu_cost = chargeback_costs_custom.cpu_used_cost;
      let report_cost = groups["CPU Used Cost"];

      if (!cost_comparison(est_cpu_cost, report_cost)) {
        throw "CPU report cost does not match"
      };

      break
    }
  }
};

function test_validate_custom_rate_memory_usage_cost(chargeback_costs_custom, chargeback_report_custom) {
  // Test to validate memory usage cost.
  //      Calculation is based on custom Chargeback rate.
  // 
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //   
  for (let groups in chargeback_report_custom) {
    if (is_bool(groups["Memory Used Cost"])) {
      let est_mem_cost = chargeback_costs_custom.memory_used_cost;
      let report_cost = groups["Memory Used Cost"];

      if (!cost_comparison(est_mem_cost, report_cost)) {
        throw "Memory report cost does not match"
      };

      break
    }
  }
};

function test_validate_custom_rate_network_usage_cost(chargeback_costs_custom, chargeback_report_custom) {
  // Test to validate network usage cost.
  //      Calculation is based on custom Chargeback rate.
  // 
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //   
  for (let groups in chargeback_report_custom) {
    if (is_bool(groups["Network I/O Used Cost"])) {
      let est_net_cost = chargeback_costs_custom.network_used_cost;
      let report_cost = groups["Network I/O Used Cost"];

      if (!cost_comparison(est_net_cost, report_cost)) {
        throw "Network report cost does not match"
      };

      break
    }
  }
};

function test_validate_custom_rate_disk_usage_cost(chargeback_costs_custom, chargeback_report_custom) {
  // Test to validate disk usage cost.
  //      Calculation is based on custom Chargeback rate.
  // 
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Reporting
  //       initialEstimate: 1/4h
  //   
  for (let groups in chargeback_report_custom) {
    if (is_bool(groups["Disk I/O Used Cost"])) {
      let est_disk_cost = chargeback_costs_custom.disk_used_cost;
      let report_cost = groups["Disk I/O Used Cost"];

      if (!cost_comparison(est_disk_cost, report_cost)) {
        throw "Disk report cost does not match"
      };

      break
    }
  }
};

function test_validate_custom_rate_storage_usage_cost(chargeback_costs_custom, chargeback_report_custom) {
  // Test to validate stoarge usage cost.
  //      Calculation is based on custom Chargeback rate.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       caseimportance: medium
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //   
  for (let groups in chargeback_report_custom) {
    if (is_bool(groups["Storage Used Cost"])) {
      let est_stor_cost = chargeback_costs_custom.storage_used_cost;
      let report_cost = groups["Storage Used Cost"];

      if (!cost_comparison(est_stor_cost, report_cost)) {
        throw "Storage report cost does not match"
      };

      break
    }
  }
}
