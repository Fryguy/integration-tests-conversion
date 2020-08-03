#  Chargeback reports are supported for all infra and cloud providers.
# 
# Chargeback reports report costs based on 1)resource usage, 2)resource allocation
# Costs are reported for the usage of the following resources by VMs:
# memory, cpu, network io, disk io, storage.
# Costs are reported for the allocation of the following resources to VMs:
# memory, cpu, storage
# 
# So, for a provider such as VMware that supports C&U, a chargeback report would show costs for both
# resource usage and resource allocation.
# 
# But, for a provider such as SCVMM that doesn't support C&U,chargeback reports show costs for
# resource allocation only.
# 
# The tests in this module validate costs for resource usage.
# 
# The tests for resource allocation are in :
# cfme/tests/intelligence/chargeback/test_resource_allocation.py
# 
require_relative 'datetime'
include Datetime
require_relative 'wrapanapi'
include Wrapanapi
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
cloud_and_infra = ProviderFilter(classes: [CloudProvider, InfraProvider], required_fields: [[["cap_and_util", "test_chargeback"], true]])
not_scvmm = ProviderFilter(classes: [SCVMMProvider], inverted: true)
not_cloud = ProviderFilter(classes: [CloudProvider], inverted: true)
not_ec2_gce = ProviderFilter(classes: [GCEProvider, EC2Provider], inverted: true)
pytestmark = [pytest.mark.tier(2), pytest.mark.provider(gen_func: providers, filters: [cloud_and_infra, not_scvmm], scope: "module"), pytest.mark.usefixtures("has_no_providers_modscope", "setup_provider_modscope"), test_requirements.chargeback, pytest.mark.meta(blockers: [GH("ManageIQ/manageiq:20237", unblock: lambda{|provider| !provider.one_of(AzureProvider)})])]
DEV = 1
def cost_comparison(estimate, expected)
  subbed = re.sub("[$,]", "", expected)
  return ((estimate - DEV).to_f <= subbed.to_f) and (subbed.to_f <= (estimate + DEV).to_f)
end
def vm_ownership(enable_candu, provider, appliance)
  vm_name = provider.data["cap_and_util"]["chargeback_vm"]
  collection = provider.appliance.provider_based_collection(provider)
  vm = collection.instantiate(vm_name, provider)
  if is_bool(!vm.exists_on_provider)
    pytest.skip("Skipping test, cu-24x7 VM does not exist")
  end
  vm.mgmt.ensure_state(VmState.RUNNING)
  group_collection = appliance.collections.groups
  cb_group = group_collection.instantiate(description: "EvmGroup-user")
  user = nil
  begin
    user = appliance.collections.users.create(name: fauxfactory.gen_alphanumeric(25, start: provider.name), credential: Credential(principal: fauxfactory.gen_alphanumeric(start: "uid"), secret: "secret"), email: "abc@example.com", groups: cb_group, cost_center: "Workload", value_assign: "Database")
    vm.set_ownership(user: user)
    logger.info()
    yield user.name
  ensure
    vm.unset_ownership()
    if is_bool(user)
      user.delete()
    end
  end
end
def enable_candu(provider, appliance)
  candu = appliance.collections.candus
  server_info = appliance.server.settings
  original_roles = server_info.server_roles_db
  server_info.enable_server_roles("ems_metrics_coordinator", "ems_metrics_collector", "ems_metrics_processor")
  server_info.disable_server_roles("automate", "smartstate")
  candu.enable_all()
  yield
  server_info.update_server_roles_db(original_roles)
  candu.disable_all()
end
def assign_default_rate(provider)
  for klass in [cb.ComputeAssign, cb.StorageAssign]
    enterprise = klass(assign_to: "The Enterprise", selections: {"Enterprise" => {"Rate" => "Default"}})
    enterprise.assign()
  end
  logger.info("Assigning DEFAULT Compute rate")
  yield
  for klass in [cb.ComputeAssign, cb.StorageAssign]
    enterprise = klass(assign_to: "The Enterprise", selections: {"Enterprise" => {"Rate" => "<Nothing>"}})
    enterprise.assign()
  end
end
def assign_custom_rate(new_compute_rate, provider)
  description = new_compute_rate
  for klass in [cb.ComputeAssign, cb.StorageAssign]
    enterprise = klass(assign_to: "The Enterprise", selections: {"Enterprise" => {"Rate" => description}})
    enterprise.assign()
  end
  logger.info("Assigning CUSTOM Compute rate")
  yield
  for klass in [cb.ComputeAssign, cb.StorageAssign]
    enterprise = klass(assign_to: "The Enterprise", selections: {"Enterprise" => {"Rate" => "<Nothing>"}})
    enterprise.assign()
  end
end
def verify_records_rollups_table(appliance, provider)
  vm_name = provider.data["cap_and_util"]["chargeback_vm"]
  ems = appliance.db.client["ext_management_systems"]
  rollups = appliance.db.client["metric_rollups"]
  appliance.db.client.transaction {
    result = ems, rollups.parent_ems_id == ems.id.appliance.db.client.session.query(rollups.id).join.filter(rollups.capture_interval_name == "hourly", rollups.resource_name == vm_name, ems.name == provider.name, rollups.timestamp >= date.today())
  }
  for record in appliance.db.client.session.query(rollups).filter(rollups.id.in_(result.subquery()))
    if is_bool(record.cpu_usagemhz_rate_average || record.cpu_usage_rate_average || record.derived_memory_used || record.net_usage_rate_average || record.disk_usage_rate_average)
      return true
    end
  end
  return false
end
def resource_usage(vm_ownership, appliance, provider)
  average_cpu_used_in_mhz = 0
  average_memory_used_in_mb = 0
  average_network_io = 0
  average_disk_io = 0
  average_storage_used = 0
  consumed_hours = 0
  vm_name = provider.data["cap_and_util"]["chargeback_vm"]
  metrics = appliance.db.client["metrics"]
  rollups = appliance.db.client["metric_rollups"]
  ems = appliance.db.client["ext_management_systems"]
  logger.info("Deleting METRICS DATA from metrics and metric_rollups tables")
  appliance.db.client.session.query(metrics).delete()
  appliance.db.client.session.query(rollups).delete()
  verify_records_metrics_table = lambda do |appliance, provider|
    vm_name = provider.data["cap_and_util"]["chargeback_vm"]
    ems = appliance.db.client["ext_management_systems"]
    metrics = appliance.db.client["metrics"]
    result = appliance.ssh_client.run_rails_command("\"vm = Vm.where(:ems_id => {}).where(:name => {})[0];            vm.perf_capture(\'realtime\', 1.hour.ago.utc, Time.now.utc)\"".format(provider.id, repr(vm_name)))
    raise  unless result.success
    appliance.db.client.transaction {
      result = ems, metrics.parent_ems_id == ems.id.appliance.db.client.session.query(metrics.id).join.filter(metrics.capture_interval_name == "realtime", metrics.resource_name == vm_name, ems.name == provider.name, metrics.timestamp >= date.today())
    }
    for record in appliance.db.client.session.query(metrics).filter(metrics.id.in_(result.subquery()))
      if is_bool(record.cpu_usagemhz_rate_average || record.cpu_usage_rate_average || record.derived_memory_used || record.net_usage_rate_average || record.disk_usage_rate_average)
        return true
      end
    end
    return false
  end
  wait_for(method(:verify_records_metrics_table), [appliance, provider], timeout: 600, fail_condition: false, message: "Waiting for VM real-time data")
  appliance.server.settings.disable_server_roles("ems_metrics_coordinator", "ems_metrics_collector")
  result = appliance.ssh_client.run_rails_command("\"vm = Vm.where(:ems_id => {}).where(:name => {})[0];        vm.perf_rollup_range(1.hour.ago.utc, Time.now.utc,\'realtime\')\"".format(provider.id, repr(vm_name)))
  raise  unless result.success
  wait_for(method(:verify_records_rollups_table), [appliance, provider], timeout: 600, fail_condition: false, message: "Waiting for hourly rollups")
  appliance.db.client.transaction {
    result = ems, rollups.parent_ems_id == ems.id.appliance.db.client.session.query(rollups.id).join.filter(rollups.capture_interval_name == "hourly", rollups.resource_name == vm_name, ems.name == provider.name, rollups.timestamp >= date.today())
  }
  for record in appliance.db.client.session.query(rollups).filter(rollups.id.in_(result.subquery()))
    consumed_hours = consumed_hours + 1
    if is_bool(record.cpu_usagemhz_rate_average || record.cpu_usage_rate_average || record.derived_memory_used || record.net_usage_rate_average || record.disk_usage_rate_average)
      average_cpu_used_in_mhz = average_cpu_used_in_mhz + record.cpu_usagemhz_rate_average
      average_memory_used_in_mb = average_memory_used_in_mb + record.derived_memory_used
      average_network_io = average_network_io + record.net_usage_rate_average
      average_disk_io = average_disk_io + record.disk_usage_rate_average
    end
  end
  for record in appliance.db.client.session.query(rollups).filter(rollups.id.in_(result.subquery()))
    if is_bool(record.derived_vm_used_disk_storage)
      average_storage_used = average_storage_used + record.derived_vm_used_disk_storage
    end
  end
  average_storage_used = average_storage_used * (math.pow(2, -30))
  yield {}
  appliance.server.settings.enable_server_roles("ems_metrics_coordinator", "ems_metrics_collector")
end
def resource_cost(appliance, provider, metric_description, usage, description, rate_type, consumed_hours)
  tiers = appliance.db.client["chargeback_tiers"]
  details = appliance.db.client["chargeback_rate_details"]
  cb_rates = appliance.db.client["chargeback_rates"]
  list_of_rates = []
  add_rate = lambda do |tiered_rate|
    list_of_rates.push(tiered_rate)
  end
  appliance.db.client.transaction {
    result = cb_rates, details.chargeback_rate_id == cb_rates.id.details, tiers.chargeback_rate_detail_id == details.id.appliance.db.client.session.query(tiers).join.join.filter(details.description == metric_description).filter(cb_rates.rate_type == rate_type).filter(cb_rates.description == description).all()
  }
  for row in result
    tiered_rate = ["variable_rate", "fixed_rate", "start", "finish"].map{|var|[var, row.getattr(var)]}.to_h
    add_rate.call(tiered_rate)
  end
  for d in list_of_rates
    if is_bool(usage >= d["start"] && usage < d["finish"])
      cost = (d["variable_rate"] * usage) + (d["fixed_rate"] * consumed_hours)
      return cost
    end
  end
end
def chargeback_costs_default(resource_usage, appliance, provider)
  average_cpu_used_in_mhz = resource_usage["average_cpu_used_in_mhz"]
  average_memory_used_in_mb = resource_usage["average_memory_used_in_mb"]
  average_network_io = resource_usage["average_network_io"]
  average_disk_io = resource_usage["average_disk_io"]
  average_storage_used = resource_usage["average_storage_used"]
  consumed_hours = resource_usage["consumed_hours"]
  cpu_used_cost = resource_cost(appliance, provider, "Used CPU", average_cpu_used_in_mhz, "Default", "Compute", consumed_hours)
  memory_used_cost = resource_cost(appliance, provider, "Used Memory", average_memory_used_in_mb, "Default", "Compute", consumed_hours)
  network_used_cost = resource_cost(appliance, provider, "Used Network I/O", average_network_io, "Default", "Compute", consumed_hours)
  disk_used_cost = resource_cost(appliance, provider, "Used Disk I/O", average_disk_io, "Default", "Compute", consumed_hours)
  storage_used_cost = resource_cost(appliance, provider, "Used Disk Storage", average_storage_used, "Default", "Storage", consumed_hours)
  return {"cpu_used_cost" => cpu_used_cost, "memory_used_cost" => memory_used_cost, "network_used_cost" => network_used_cost, "disk_used_cost" => disk_used_cost, "storage_used_cost" => storage_used_cost}
end
def chargeback_costs_custom(resource_usage, new_compute_rate, appliance, provider)
  description = new_compute_rate
  average_cpu_used_in_mhz = resource_usage["average_cpu_used_in_mhz"]
  average_memory_used_in_mb = resource_usage["average_memory_used_in_mb"]
  average_network_io = resource_usage["average_network_io"]
  average_disk_io = resource_usage["average_disk_io"]
  average_storage_used = resource_usage["average_storage_used"]
  consumed_hours = resource_usage["consumed_hours"]
  cpu_used_cost = resource_cost(appliance, provider, "Used CPU", average_cpu_used_in_mhz, description, "Compute", consumed_hours)
  memory_used_cost = resource_cost(appliance, provider, "Used Memory", average_memory_used_in_mb, description, "Compute", consumed_hours)
  network_used_cost = resource_cost(appliance, provider, "Used Network I/O", average_network_io, description, "Compute", consumed_hours)
  disk_used_cost = resource_cost(appliance, provider, "Used Disk I/O", average_disk_io, description, "Compute", consumed_hours)
  storage_used_cost = resource_cost(appliance, provider, "Used Disk Storage", average_storage_used, description, "Storage", consumed_hours)
  return {"cpu_used_cost" => cpu_used_cost, "memory_used_cost" => memory_used_cost, "network_used_cost" => network_used_cost, "disk_used_cost" => disk_used_cost, "storage_used_cost" => storage_used_cost}
end
def chargeback_report_default(appliance, vm_ownership, assign_default_rate, provider)
  owner = vm_ownership
  data = {"menu_name" => "cb_" + provider.name, "title" => "cb_" + provider.name, "base_report_on" => "Chargeback for Vms", "report_fields" => ["Memory Used", "Memory Used Cost", "Owner", "CPU Used", "CPU Used Cost", "Disk I/O Used", "Disk I/O Used Cost", "Network I/O Used", "Network I/O Used Cost", "Storage Used", "Storage Used Cost"], "filter" => {"filter_show_costs" => "Owner", "filter_owner" => owner, "interval_end" => "Today (partial)"}}
  report = appliance.collections.reports.create(is_candu: true, None: data)
  logger.info()
  report.queue(wait_for_finish: true)
  yield report.saved_reports.all()[0].data.rows.to_a
  if is_bool(report.exists)
    report.delete()
  end
end
def chargeback_report_custom(appliance, vm_ownership, assign_custom_rate, provider)
  owner = vm_ownership
  data = {"menu_name" => "cb_custom_" + provider.name, "title" => "cb_custom" + provider.name, "base_report_on" => "Chargeback for Vms", "report_fields" => ["Memory Used", "Memory Used Cost", "Owner", "CPU Used", "CPU Used Cost", "Disk I/O Used", "Disk I/O Used Cost", "Network I/O Used", "Network I/O Used Cost", "Storage Used", "Storage Used Cost"], "filter" => {"filter_show_costs" => "Owner", "filter_owner" => owner, "interval_end" => "Today (partial)"}}
  report = appliance.collections.reports.create(is_candu: true, None: data)
  logger.info()
  report.queue(wait_for_finish: true)
  yield report.saved_reports.all()[0].data.rows.to_a
  if is_bool(report.exists)
    report.delete()
  end
end
def new_compute_rate(appliance)
  begin
    desc = "cstm_" + fauxfactory.gen_alphanumeric()
    compute = appliance.collections.compute_rates.create(description: desc, fields: {"Used CPU" => {"per_time" => "Hourly", "variable_rate" => "3"}, "Used Disk I/O" => {"per_time" => "Hourly", "variable_rate" => "2"}, "Used Memory" => {"per_time" => "Hourly", "variable_rate" => "2"}})
    storage = appliance.collections.storage_rates.create(description: desc, fields: {"Used Disk Storage" => {"per_time" => "Hourly", "variable_rate" => "3"}})
  rescue Exception => ex
    pytest.fail(("Exception while creating compute/storage rates for chargeback report tests. {}").format(ex))
  end
  yield desc
  for entity in [compute, storage]
    begin
      entity.delete_if_exists()
    rescue Exception => ex
      pytest.fail(("Exception while cleaning up compute/storage rates for chargeback report tests. {}").format(ex))
    end
  end
end
def test_validate_default_rate_cpu_usage_cost(chargeback_costs_default, chargeback_report_default)
  # Test to validate CPU usage cost.
  #      Calculation is based on default Chargeback rate.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: medium
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #   
  for groups in chargeback_report_default
    if is_bool(groups["CPU Used Cost"])
      est_cpu_cost = chargeback_costs_default["cpu_used_cost"]
      report_cost = groups["CPU Used Cost"]
      raise "CPU report costs does not match" unless cost_comparison(est_cpu_cost, report_cost)
      break
    end
  end
end
def test_validate_default_rate_memory_usage_cost(chargeback_costs_default, chargeback_report_default)
  # Test to validate memory usage cost.
  #      Calculation is based on default Chargeback rate.
  # 
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: medium
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #   
  for groups in chargeback_report_default
    if is_bool(groups["Memory Used Cost"])
      est_memory_cost = chargeback_costs_default["memory_used_cost"]
      report_cost = groups["Memory Used Cost"]
      raise "Memory report cost do not match" unless cost_comparison(est_memory_cost, report_cost)
      break
    end
  end
end
def test_validate_default_rate_network_usage_cost(chargeback_costs_default, chargeback_report_default)
  # Test to validate network usage cost.
  #      Calculation is based on default Chargeback rate.
  # 
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: medium
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #   
  for groups in chargeback_report_default
    if is_bool(groups["Network I/O Used Cost"])
      est_net_cost = chargeback_costs_default["network_used_cost"]
      report_cost = groups["Network I/O Used Cost"]
      raise "Network report cost does not match" unless cost_comparison(est_net_cost, report_cost)
      break
    end
  end
end
def test_validate_default_rate_disk_usage_cost(chargeback_costs_default, chargeback_report_default)
  # Test to validate disk usage cost.
  #      Calculation is based on default Chargeback rate.
  # 
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #   
  for groups in chargeback_report_default
    if is_bool(groups["Disk I/O Used Cost"])
      est_disk_cost = chargeback_costs_default["disk_used_cost"]
      report_cost = groups["Disk I/O Used Cost"]
      raise "Disk report cost does not match" unless cost_comparison(est_disk_cost, report_cost)
      break
    end
  end
end
def test_validate_default_rate_storage_usage_cost(chargeback_costs_default, chargeback_report_default)
  # Test to validate stoarge usage cost.
  #      Calculation is based on default Chargeback rate.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/12h
  #       casecomponent: Reporting
  #   
  for groups in chargeback_report_default
    if is_bool(groups["Storage Used Cost"])
      est_stor_cost = chargeback_costs_default["storage_used_cost"]
      report_cost = groups["Storage Used Cost"]
      raise "Storage report cost does not match" unless cost_comparison(est_stor_cost, report_cost)
      break
    end
  end
end
def test_validate_custom_rate_cpu_usage_cost(chargeback_costs_custom, chargeback_report_custom)
  # Test to validate CPU usage cost.
  #      Calculation is based on custom Chargeback rate.
  # 
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: medium
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #   
  for groups in chargeback_report_custom
    if is_bool(groups["CPU Used Cost"])
      est_cpu_cost = chargeback_costs_custom["cpu_used_cost"]
      report_cost = groups["CPU Used Cost"]
      raise "CPU report cost does not match" unless cost_comparison(est_cpu_cost, report_cost)
      break
    end
  end
end
def test_validate_custom_rate_memory_usage_cost(chargeback_costs_custom, chargeback_report_custom)
  # Test to validate memory usage cost.
  #      Calculation is based on custom Chargeback rate.
  # 
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #   
  for groups in chargeback_report_custom
    if is_bool(groups["Memory Used Cost"])
      est_mem_cost = chargeback_costs_custom["memory_used_cost"]
      report_cost = groups["Memory Used Cost"]
      raise "Memory report cost does not match" unless cost_comparison(est_mem_cost, report_cost)
      break
    end
  end
end
def test_validate_custom_rate_network_usage_cost(chargeback_costs_custom, chargeback_report_custom)
  # Test to validate network usage cost.
  #      Calculation is based on custom Chargeback rate.
  # 
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #   
  for groups in chargeback_report_custom
    if is_bool(groups["Network I/O Used Cost"])
      est_net_cost = chargeback_costs_custom["network_used_cost"]
      report_cost = groups["Network I/O Used Cost"]
      raise "Network report cost does not match" unless cost_comparison(est_net_cost, report_cost)
      break
    end
  end
end
def test_validate_custom_rate_disk_usage_cost(chargeback_costs_custom, chargeback_report_custom)
  # Test to validate disk usage cost.
  #      Calculation is based on custom Chargeback rate.
  # 
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Reporting
  #       initialEstimate: 1/4h
  #   
  for groups in chargeback_report_custom
    if is_bool(groups["Disk I/O Used Cost"])
      est_disk_cost = chargeback_costs_custom["disk_used_cost"]
      report_cost = groups["Disk I/O Used Cost"]
      raise "Disk report cost does not match" unless cost_comparison(est_disk_cost, report_cost)
      break
    end
  end
end
def test_validate_custom_rate_storage_usage_cost(chargeback_costs_custom, chargeback_report_custom)
  # Test to validate stoarge usage cost.
  #      Calculation is based on custom Chargeback rate.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: medium
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #   
  for groups in chargeback_report_custom
    if is_bool(groups["Storage Used Cost"])
      est_stor_cost = chargeback_costs_custom["storage_used_cost"]
      report_cost = groups["Storage Used Cost"]
      raise "Storage report cost does not match" unless cost_comparison(est_stor_cost, report_cost)
      break
    end
  end
end
