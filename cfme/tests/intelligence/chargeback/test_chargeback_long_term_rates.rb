#  Tests to validate chargeback costs for daily, weekly, monthly rates.
# 
# All infra and cloud providers support chargeback reports.
# But, in order to validate costs for different rates, running the tests on just one provider
# should suffice.
# 
require_relative 'datetime'
include Datetime
require_relative 'wrapanapi'
include Wrapanapi
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(2), pytest.mark.parametrize("interval", ["Daily", "Weekly", "Monthly"], ids: ["daily_rate", "weekly_rate", "monthly_rate"], scope: "module"), pytest.mark.provider([RHEVMProvider], selector: ONE, scope: "module", required_fields: [[["cap_and_util", "test_chargeback"], true]]), pytest.mark.usefixtures("setup_provider_modscope"), test_requirements.chargeback]
DEVIATION = 1
divisor = {"Daily" => 24, "Weekly" => 24 * 7, "Monthly" => 24 * 30}
def vm_ownership(enable_candu, provider, appliance)
  # In these tests, chargeback reports are filtered on VM owner.So,VMs have to be
  #   assigned ownership.
  #   
  collection = appliance.provider_based_collection(provider)
  vm_name = provider.data["cap_and_util"]["chargeback_vm"]
  vm = collection.instantiate(vm_name, provider)
  if is_bool(!vm.exists_on_provider)
    pytest.skip("Skipping test, cu-24x7 VM does not exist")
  end
  vm.mgmt.ensure_state(VmState.RUNNING)
  group_collection = appliance.collections.groups
  cb_group = group_collection.instantiate(description: "EvmGroup-user")
  user = appliance.collections.users.create(name: "#{provider.name}_#{fauxfactory.gen_alphanumeric()}", credential: Credential(principal: fauxfactory.gen_alphanumeric(start: "uid"), secret: "secret"), email: "abc@example.com", groups: cb_group, cost_center: "Workload", value_assign: "Database")
  vm.set_ownership(user: user)
  logger.info("Assigned VM OWNERSHIP for #{vm_name} running on #{provider.name}")
  yield(user.name)
  vm.unset_ownership()
  if is_bool(user)
    user.delete()
  end
end
def enable_candu(appliance)
  # C&U data collection consumes a lot of memory and CPU.So, we are disabling some server roles
  #   that are not needed for Chargeback reporting.
  #   
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
def assign_custom_rate(new_compute_rate)
  # Assign custom Compute rate to the Enterprise and then queue the Chargeback report.
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
  # Verify that hourly rollups are present in the metric_rollups table.
  vm_name = provider.data["cap_and_util"]["chargeback_vm"]
  ems = appliance.db.client["ext_management_systems"]
  rollups = appliance.db.client["metric_rollups"]
  appliance.db.client.transaction {
    result = ems, rollups.parent_ems_id == ems.id.appliance.db.client.session.query(rollups.id).join.filter(rollups.capture_interval_name == "hourly", rollups.resource_name == vm_name, ems.name == provider.name, rollups.timestamp >= date.today())
  }
  for record in appliance.db.client.session.query(rollups).filter(rollups.id.in_(result.subquery()))
    return [record.cpu_usagemhz_rate_average, record.cpu_usage_rate_average, record.derived_memory_used, record.net_usage_rate_average, record.disk_usage_rate_average].is_any?
  end
  return false
end
def verify_records_metrics_table(appliance, provider)
  # Verify that rollups are present in the metric_rollups table.
  vm_name = provider.data["cap_and_util"]["chargeback_vm"]
  ems = appliance.db.client["ext_management_systems"]
  metrics = appliance.db.client["metrics"]
  ret = appliance.ssh_client.run_rails_command("\"vm = Vm.where(:ems_id => {}).where(:name => {})[0];        vm.perf_capture(\'realtime\', 1.hour.ago.utc, Time.now.utc)\"".format(provider.id, repr(vm_name)))
  raise "Failed to capture VM C&U data:" unless ret.success
  appliance.db.client.transaction {
    result = ems, metrics.parent_ems_id == ems.id.appliance.db.client.session.query(metrics.id).join.filter(metrics.capture_interval_name == "realtime", metrics.resource_name == vm_name, ems.name == provider.name, metrics.timestamp >= date.today())
  }
  for record in appliance.db.client.session.query(metrics).filter(metrics.id.in_(result.subquery()))
    return [record.cpu_usagemhz_rate_average, record.cpu_usage_rate_average, record.derived_memory_used, record.net_usage_rate_average, record.disk_usage_rate_average].is_any?
  end
  return false
end
def resource_usage(vm_ownership, appliance, provider)
  # Retrieve resource usage values from metric_rollups table.
  # 
  #   Chargeback reporting is done on hourly and daily rollup values and not real-time values.So, we
  #   are capturing C&U data and forcing hourly rollups by running commands through
  #   the Rails console.
  #   
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
  wait_for(method(:verify_records_metrics_table), [appliance, provider], timeout: 600, message: "Waiting for VM real-time data")
  appliance.server.settings.disable_server_roles("ems_metrics_coordinator", "ems_metrics_collector")
  ret = appliance.ssh_client.run_rails_command("\"vm = Vm.where(:ems_id => {}).where(:name => {})[0];        vm.perf_rollup_range(1.hour.ago.utc, Time.now.utc,\'realtime\')\"".format(provider.id, repr(vm_name)))
  raise "Failed to rollup VM C&U data:" unless ret.success
  wait_for(method(:verify_records_rollups_table), [appliance, provider], timeout: 600, message: "Waiting for hourly rollups")
  appliance.db.client.transaction {
    result = ems, rollups.parent_ems_id == ems.id.appliance.db.client.session.query(rollups.id).join.filter(rollups.capture_interval_name == "hourly", rollups.resource_name == vm_name, ems.name == provider.name, rollups.timestamp >= date.today())
  }
  for record in appliance.db.client.session.query(rollups).filter(rollups.id.in_(result.subquery()))
    consumed_hours = consumed_hours + 1
    average_storage_used = average_storage_used + record.derived_vm_used_disk_storage
    if is_bool([record.cpu_usagemhz_rate_average, record.cpu_usage_rate_average, record.derived_memory_used, record.net_usage_rate_average, record.disk_usage_rate_average].is_any?)
      average_cpu_used_in_mhz = average_cpu_used_in_mhz + record.cpu_usagemhz_rate_average
      average_memory_used_in_mb = average_memory_used_in_mb + record.derived_memory_used
      average_network_io = average_network_io + record.net_usage_rate_average
      average_disk_io = average_disk_io + record.disk_usage_rate_average
    end
  end
  average_storage_used = average_storage_used * (math.pow(2, -30))
  return {"average_cpu_used_in_mhz" => average_cpu_used_in_mhz, "average_memory_used_in_mb" => average_memory_used_in_mb, "average_network_io" => average_network_io, "average_disk_io" => average_disk_io, "average_storage_used" => average_storage_used, "consumed_hours" => consumed_hours}
end
def resource_cost(appliance, metric_description, usage, description, rate_type, consumed_hours, interval)
  # Query the DB for Chargeback rates
  tiers = appliance.db.client["chargeback_tiers"]
  details = appliance.db.client["chargeback_rate_details"]
  cb_rates = appliance.db.client["chargeback_rates"]
  list_of_rates = []
  appliance.db.client.transaction {
    result = cb_rates, details.chargeback_rate_id == cb_rates.id.details, tiers.chargeback_rate_detail_id == details.id.appliance.db.client.session.query(tiers).join.join.filter(details.description == metric_description).filter(cb_rates.rate_type == rate_type).filter(cb_rates.description == description).all()
  }
  for row in result
    tiered_rate = ["variable_rate", "fixed_rate", "start", "finish"].map{|var|[var, row.getattr(var)]}.to_h
    list_of_rates.push(tiered_rate)
  end
  for rate in list_of_rates
    if is_bool(usage >= rate["start"] && usage < rate["finish"])
      cost = ((rate["variable_rate"] * usage) + (rate["fixed_rate"] * consumed_hours)) / divisor[interval].to_f
      return cost
    end
  end
end
def chargeback_costs_custom(resource_usage, new_compute_rate, appliance, interval)
  # Estimate Chargeback costs using custom Chargeback rate and resource usage from the DB.
  description = new_compute_rate
  average_cpu_used_in_mhz = resource_usage["average_cpu_used_in_mhz"]
  average_memory_used_in_mb = resource_usage["average_memory_used_in_mb"]
  average_network_io = resource_usage["average_network_io"]
  average_disk_io = resource_usage["average_disk_io"]
  average_storage_used = resource_usage["average_storage_used"]
  consumed_hours = resource_usage["consumed_hours"]
  cpu_used_cost = resource_cost(appliance, "Used CPU", average_cpu_used_in_mhz, description, "Compute", consumed_hours, interval)
  memory_used_cost = resource_cost(appliance, "Used Memory", average_memory_used_in_mb, description, "Compute", consumed_hours, interval)
  network_used_cost = resource_cost(appliance, "Used Network I/O", average_network_io, description, "Compute", consumed_hours, interval)
  disk_used_cost = resource_cost(appliance, "Used Disk I/O", average_disk_io, description, "Compute", consumed_hours, interval)
  storage_used_cost = resource_cost(appliance, "Used Disk Storage", average_storage_used, description, "Storage", consumed_hours, interval)
  return {"cpu_used_cost" => cpu_used_cost, "memory_used_cost" => memory_used_cost, "network_used_cost" => network_used_cost, "disk_used_cost" => disk_used_cost, "storage_used_cost" => storage_used_cost}
end
def chargeback_report_custom(appliance, vm_ownership, assign_custom_rate, interval)
  # Create a Chargeback report based on a custom rate; Queue the report
  owner = vm_ownership
  data = {"menu_name" => interval, "title" => interval, "base_report_on" => "Chargeback for Vms", "report_fields" => ["Memory Used", "Memory Used Cost", "Owner", "CPU Used", "CPU Used Cost", "Disk I/O Used", "Disk I/O Used Cost", "Network I/O Used", "Network I/O Used Cost", "Storage Used", "Storage Used Cost"], "filter" => {"filter_show_costs" => "Owner", "filter_owner" => owner, "interval_end" => "Today (partial)"}}
  report = appliance.collections.reports.create(is_candu: true, None: data)
  logger.info("Queuing chargeback report for #{interval} rate")
  report.queue(wait_for_finish: true)
  if is_bool(!report.saved_reports.all()[0].data.rows.to_a)
    pytest.skip("Empty report")
  else
    yield(report.saved_reports.all()[0].data.rows.to_a)
  end
  if is_bool(report.exists)
    report.delete()
  end
end
def new_compute_rate(appliance, interval)
  # Create a new Compute Chargeback rate
  desc = fauxfactory.gen_alphanumeric(20, start: "custom_#{interval}")
  begin
    compute = appliance.collections.compute_rates.create(description: desc, fields: {"Used CPU" => {"per_time" => interval, "variable_rate" => "720"}, "Used Disk I/O" => {"per_time" => interval, "variable_rate" => "720"}, "Used Network I/O" => {"per_time" => interval, "variable_rate" => "720"}, "Used Memory" => {"per_time" => interval, "variable_rate" => "720"}})
    storage = appliance.collections.storage_rates.create(description: desc, fields: {"Used Disk Storage" => {"per_time" => interval, "variable_rate" => "720"}})
  rescue Exception => ex
    pytest.fail(("Exception while creating compute/storage rates for chargeback long term rate tests. {}").format(ex))
  end
  yield(desc)
  for entity in [compute, storage]
    begin
      entity.delete_if_exists()
    rescue Exception => ex
      pytest.fail(("Exception cleaning up compute/storage rate for chargeback long term rate tests. {}").format(ex))
    end
  end
end
def test_validate_cpu_usage_cost(chargeback_costs_custom, chargeback_report_custom, interval, provider, soft_assert)
  # Test to validate CPU usage cost reported in chargeback reports.
  #   The cost reported in the Chargeback report should be approximately equal to the
  #   cost estimated in the chargeback_costs_custom fixture.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  #   
  if is_bool(!chargeback_report_custom[0]["CPU Used Cost"])
    pytest.skip("missing column in report")
  else
    estimated_cpu_usage_cost = chargeback_costs_custom["cpu_used_cost"]
    cost_from_report = chargeback_report_custom[0]["CPU Used Cost"]
    cost = cost_from_report.gsub("$", "").gsub(",", "")
    soft_assert.((estimated_cpu_usage_cost - DEVIATION <= cost.to_f) && (cost.to_f <= estimated_cpu_usage_cost + DEVIATION), "Estimated cost and report cost do not match")
  end
end
def test_validate_memory_usage_cost(chargeback_costs_custom, chargeback_report_custom, interval, provider, soft_assert)
  # Test to validate memory usage cost reported in chargeback reports.
  #   The cost reported in the Chargeback report should be approximately equal to the
  #   cost estimated in the chargeback_costs_custom fixture.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  #   
  if is_bool(!chargeback_report_custom[0]["Memory Used Cost"])
    pytest.skip("missing column in report")
  else
    estimated_memory_usage_cost = chargeback_costs_custom["memory_used_cost"]
    cost_from_report = chargeback_report_custom[0]["Memory Used Cost"]
    cost = cost_from_report.gsub("$", "").gsub(",", "")
    soft_assert.((estimated_memory_usage_cost - DEVIATION <= cost.to_f) && (cost.to_f <= estimated_memory_usage_cost + DEVIATION), "Estimated cost and report cost do not match")
  end
end
def test_validate_network_usage_cost(chargeback_costs_custom, chargeback_report_custom, interval, provider, soft_assert)
  # Test to validate network usage cost reported in chargeback reports.
  #   The cost reported in the Chargeback report should be approximately equal to the
  #   cost estimated in the chargeback_costs_custom fixture.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  #   
  if is_bool(!chargeback_report_custom[0]["Network I/O Used Cost"])
    pytest.skip("missing column in report")
  else
    estimated_network_usage_cost = chargeback_costs_custom["network_used_cost"]
    cost_from_report = chargeback_report_custom[0]["Network I/O Used Cost"]
    cost = cost_from_report.gsub("$", "").gsub(",", "")
    soft_assert.((estimated_network_usage_cost - DEVIATION <= cost.to_f) && (cost.to_f <= estimated_network_usage_cost + DEVIATION), "Estimated cost and report cost do not match")
  end
end
def test_validate_disk_usage_cost(chargeback_costs_custom, chargeback_report_custom, interval, provider, soft_assert)
  # Test to validate disk usage cost reported in chargeback reports.
  #   The cost reported in the Chargeback report should be approximately equal to the
  #   cost estimated in the chargeback_costs_custom fixture.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  #   
  if is_bool(!chargeback_report_custom[0]["Disk I/O Used Cost"])
    pytest.skip("missing column in report")
  else
    estimated_disk_usage_cost = chargeback_costs_custom["disk_used_cost"]
    cost_from_report = chargeback_report_custom[0]["Disk I/O Used Cost"]
    cost = cost_from_report.gsub("$", "").gsub(",", "")
    soft_assert.((estimated_disk_usage_cost - DEVIATION <= cost.to_f) && (cost.to_f <= estimated_disk_usage_cost + DEVIATION), "Estimated cost and report cost do not match")
  end
end
def test_validate_storage_usage_cost(chargeback_costs_custom, chargeback_report_custom, interval, provider, soft_assert)
  # Test to validate storage usage cost reported in chargeback reports.
  #   The cost reported in the Chargeback report should be approximately equal to the
  #   cost estimated in the chargeback_costs_custom fixture.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  #   
  if is_bool(!chargeback_report_custom[0]["Storage Used Cost"])
    pytest.skip("missing column in report")
  else
    estimated_storage_usage_cost = chargeback_costs_custom["storage_used_cost"]
    cost_from_report = chargeback_report_custom[0]["Storage Used Cost"]
    cost = cost_from_report.gsub("$", "").gsub(",", "")
    soft_assert.((estimated_storage_usage_cost - DEVIATION <= cost.to_f) && (cost.to_f <= estimated_storage_usage_cost + DEVIATION), "Estimated cost and report cost do not match")
  end
end
