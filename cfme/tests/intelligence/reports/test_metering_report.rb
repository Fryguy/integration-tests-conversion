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
require_relative 'cfme/common/provider'
include Cfme::Common::Provider
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
pytestmark = [pytest.mark.tier(2), pytest.mark.provider(gen_func: providers, filters: [cloud_and_infra, not_scvmm], scope: "module"), test_requirements.chargeback, pytest.mark.meta(blockers: [GH("ManageIQ/manageiq:20237", unblock: lambda{|provider| !provider.one_of(AzureProvider)})])]
DEVIATION = 1
def clean_setup_provider(request, has_no_providers_modscope, setup_provider_modscope, provider)
  yield
  BaseProvider.clear_providers()
end
def vm_ownership(enable_candu, clean_setup_provider, provider, appliance)
  vm_name = provider.data["cap_and_util"]["chargeback_vm"]
  collection = provider.appliance.provider_based_collection(provider)
  vm = collection.instantiate(vm_name, provider)
  if is_bool(!vm.exists_on_provider)
    pytest.skip()
  end
  vm.mgmt.ensure_state(VmState.RUNNING)
  group_collection = appliance.collections.groups
  cb_group = group_collection.instantiate(description: "EvmGroup-user")
  user = appliance.collections.users.create(name: fauxfactory.gen_alphanumeric(), credential: Credential(principal: fauxfactory.gen_alphanumeric(start: "uid"), secret: "secret"), email: "abc@example.com", groups: cb_group, cost_center: "Workload", value_assign: "Database")
  begin
    vm.set_ownership(user: user)
    logger.info()
    yield user.name
  ensure
    vm.unset_ownership()
    user.delete()
  end
end
def enable_candu(provider, appliance)
  server_info = appliance.server.settings
  original_roles = server_info.server_roles_db
  server_info.enable_server_roles("ems_metrics_coordinator", "ems_metrics_collector", "ems_metrics_processor")
  server_info.disable_server_roles("automate", "smartstate")
  command = "Metric::Targets.perf_capture_always = {:storage=>true, :host_and_cluster=>true};"
  appliance.ssh_client.run_rails_command(command, timeout: nil)
  yield
  server_info.update_server_roles_db(original_roles)
  command = "Metric::Targets.perf_capture_always = {:storage=>false, :host_and_cluster=>false};"
  appliance.ssh_client.run_rails_command(command, timeout: nil)
end
def verify_records_rollups_table(appliance, provider, vm_name)
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
  cpu_used_in_mhz = 0
  memory_used_in_mb = 0
  network_io = 0
  disk_io = 0
  storage_used = 0
  vm_name = provider.data["cap_and_util"]["chargeback_vm"]
  metrics = appliance.db.client["metrics"]
  rollups = appliance.db.client["metric_rollups"]
  ems = appliance.db.client["ext_management_systems"]
  logger.info("Deleting METRICS DATA from metrics and metric_rollups tables")
  appliance.db.client.session.query(metrics).delete()
  appliance.db.client.session.query(rollups).delete()
  verify_records_metrics_table = lambda do |appliance, provider, vm_name|
    ems = appliance.db.client["ext_management_systems"]
    metrics = appliance.db.client["metrics"]
    ret = appliance.ssh_client.run_rails_command("\"vm = Vm.where(:ems_id => {}).where(:name => {})[0];            vm.perf_capture(\'realtime\', 2.hour.ago.utc, Time.now.utc)\"".format(provider.id, repr(vm_name)))
    raise  unless ret.success
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
  wait_for(method(:verify_records_metrics_table), [appliance, provider, vm_name], timeout: 600, fail_condition: false, message: "Waiting for VM real-time data")
  appliance.server.settings.disable_server_roles("ems_metrics_coordinator", "ems_metrics_collector")
  ret = appliance.ssh_client.run_rails_command("\"vm = Vm.where(:ems_id => {}).where(:name => {})[0];        vm.perf_rollup_range(2.hour.ago.utc, Time.now.utc,\'realtime\')\"".format(provider.id, repr(vm_name)))
  raise  unless ret.success
  wait_for(method(:verify_records_rollups_table), [appliance, provider, vm_name], timeout: 600, fail_condition: false, message: "Waiting for hourly rollups")
  appliance.db.client.transaction {
    result = ems, rollups.parent_ems_id == ems.id.appliance.db.client.session.query(rollups.id).join.filter(rollups.capture_interval_name == "hourly", rollups.resource_name == vm_name, ems.name == provider.name, rollups.timestamp >= date.today())
  }
  for record in appliance.db.client.session.query(rollups).filter(rollups.id.in_(result.subquery()))
    cpu_used_in_mhz = cpu_used_in_mhz + record.cpu_usagemhz_rate_average
    memory_used_in_mb = memory_used_in_mb + record.derived_memory_used
    network_io = network_io + record.net_usage_rate_average
    disk_io = disk_io + record.disk_usage_rate_average
    storage_used = storage_used + record.derived_vm_used_disk_storage
  end
  storage_used = storage_used * (math.pow(2, -30))
  return {"cpu_used" => cpu_used_in_mhz, "memory_used" => memory_used_in_mb, "network_io" => network_io, "disk_io_used" => disk_io, "storage_used" => storage_used}
end
def metering_report(appliance, vm_ownership, provider)
  owner = vm_ownership
  data = {"menu_name" => "cb_" + provider.name, "title" => "cb_" + provider.name, "base_report_on" => "Metering for VMs", "report_fields" => ["Owner", "Memory Used", "CPU Used", "Disk I/O Used", "Network I/O Used", "Storage Used", "Existence Hours Metric", "Metering Used Metric"], "filter" => {"filter_show_costs" => "Owner", "filter_owner" => owner, "interval_end" => "Today (partial)"}}
  report = appliance.collections.reports.create(is_candu: true, None: data)
  logger.info()
  report.queue(wait_for_finish: true)
  yield report.saved_reports.all()[0].data.rows.to_a
  report.delete()
end
def test_validate_cpu_usage(resource_usage, metering_report)
  # Test to validate CPU usage.This metric is not collected for cloud providers.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: medium
  #       casecomponent: Reporting
  #       initialEstimate: 1/4h
  #   
  for groups in metering_report
    if is_bool(groups["CPU Used"])
      estimated_cpu_usage = resource_usage["cpu_used"]
      usage_from_report = groups["CPU Used"]
      if usage_from_report.include?("GHz")
        estimated_cpu_usage = estimated_cpu_usage * (math.pow(2, -10))
      end
      usage = re.sub("(MHz|GHz|,)", "", usage_from_report)
      raise "Estimated cost and report cost do not match" unless (estimated_cpu_usage - DEVIATION <= usage.to_f) and (usage.to_f <= estimated_cpu_usage + DEVIATION)
      break
    end
  end
end
def test_validate_memory_usage(resource_usage, metering_report)
  # Test to validate memory usage.This metric is not collected for GCE, EC2.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Reporting
  #   
  for groups in metering_report
    if is_bool(groups["Memory Used"])
      estimated_memory_usage = resource_usage["memory_used"]
      usage_from_report = groups["Memory Used"]
      if usage_from_report.include?("GB")
        estimated_memory_usage = estimated_memory_usage * (math.pow(2, -10))
      end
      usage = re.sub("(MB|GB|,)", "", usage_from_report)
      raise "Estimated cost and report cost do not match" unless (estimated_memory_usage - DEVIATION <= usage.to_f) and (usage.to_f <= estimated_memory_usage + DEVIATION)
      break
    end
  end
end
def test_validate_network_usage(resource_usage, metering_report)
  # Test to validate network usage.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       casecomponent: Reporting
  #   
  for groups in metering_report
    if is_bool(groups["Network I/O Used"])
      estimated_network_usage = resource_usage["network_io"]
      usage_from_report = groups["Network I/O Used"]
      usage = re.sub("(KBps|,)", "", usage_from_report)
      raise "Estimated cost and report cost do not match" unless (estimated_network_usage - DEVIATION <= usage.to_f) and (usage.to_f <= estimated_network_usage + DEVIATION)
      break
    end
  end
end
def test_validate_disk_usage(resource_usage, metering_report)
  # Test to validate disk usage.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Reporting
  #   
  for groups in metering_report
    if is_bool(groups["Disk I/O Used"])
      estimated_disk_usage = resource_usage["disk_io_used"]
      usage_from_report = groups["Disk I/O Used"]
      usage = re.sub("(KBps|,)", "", usage_from_report)
      raise "Estimated cost and report cost do not match" unless (estimated_disk_usage - DEVIATION <= usage.to_f) and (usage.to_f <= estimated_disk_usage + DEVIATION)
      break
    end
  end
end
def test_validate_storage_usage(resource_usage, metering_report)
  # Test to validate storage usage.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: Reporting
  #   
  for groups in metering_report
    if is_bool(groups["Storage Used"])
      estimated_storage_usage = resource_usage["storage_used"]
      usage_from_report = groups["Storage Used"]
      usage = re.sub("(MB|GB|,)", "", usage_from_report)
      raise "Estimated cost and report cost do not match" unless (estimated_storage_usage - DEVIATION <= usage.to_f) and (usage.to_f <= estimated_storage_usage + DEVIATION)
      break
    end
  end
end
