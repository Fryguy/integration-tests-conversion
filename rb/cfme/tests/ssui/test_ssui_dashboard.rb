require_relative 'datetime'
include Datetime
require_relative 'datetime'
include Datetime
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/services/dashboard'
include Cfme::Services::Dashboard
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.meta(server_roles: "+automate"), pytest.mark.usefixtures("uses_infra_providers"), test_requirements.ssui, pytest.mark.provider([InfraProvider], selector: ONE_PER_TYPE, required_fields: [["provisioning", "template"], ["provisioning", "host"], ["provisioning", "datastore"]], scope: "module")]
def enable_candu(appliance)
  candu = appliance.collections.candus
  server_info = appliance.server.settings
  original_roles = server_info.server_roles_db
  server_info.enable_server_roles("ems_metrics_coordinator", "ems_metrics_collector", "ems_metrics_processor")
  candu.enable_all()
  yield
  server_info.update_server_roles_db(original_roles)
  candu.disable_all()
end
def new_compute_rate(appliance, enable_candu)
  desc = fauxfactory.gen_alphanumeric(12, start: "custom_")
  begin
    compute = appliance.collections.compute_rates.create(description: desc, fields: {"Used CPU" => {"per_time" => "Hourly", "variable_rate" => "3"}, "Allocated CPU Count" => {"per_time" => "Hourly", "fixed_rate" => "2"}, "Used Disk I/O" => {"per_time" => "Hourly", "variable_rate" => "2"}, "Allocated Memory" => {"per_time" => "Hourly", "fixed_rate" => "1"}, "Used Memory" => {"per_time" => "Hourly", "variable_rate" => "2"}})
    storage = appliance.collections.storage_rates.create(description: desc, fields: {"Used Disk Storage" => {"per_time" => "Hourly", "variable_rate" => "3"}, "Allocated Disk Storage" => {"per_time" => "Hourly", "fixed_rate" => "3"}})
  rescue Exception => ex
    pytest.fail("Exception during chargeback creation for test setup: #{ex.message}")
  end
  yield(desc)
  for rate in [compute, storage]
    rate.delete_if_exists()
  end
end
def assign_chargeback_rate(new_compute_rate)
  # Assign custom Compute rate to the Enterprise and then queue the Chargeback report.
  logger.info("Assigning Compute and Storage rates: %s", new_compute_rate)
  make_assignment = lambda do |rate|
    for klass in [cb.ComputeAssign, cb.StorageAssign]
      klass(assign_to: "The Enterprise", selections: {"Enterprise" => {"Rate" => rate}}).assign()
    end
  end
  make_assignment.call(method(:new_compute_rate))
  yield
  make_assignment.call("<Nothing>")
end
def verify_vm_uptime(appliance, provider, vmname)
  # Verifies VM uptime is at least one hour.
  # 
  #   One hour is the shortest duration for which VMs can be charged.
  #   
  vm_creation_time = appliance.rest_api.collections.vms.get(name: vmname).created_on
  return appliance.utc_time() - vm_creation_time > timedelta(hours: 1)
end
def run_service_chargeback_report(provider, appliance, assign_chargeback_rate, order_service)
  catalog_item = order_service
  vmname = catalog_item.prov_data["catalog"]["vm_name"]
  verify_records_rollups_table = lambda do |appliance, provider|
    ems = appliance.db.client["ext_management_systems"]
    rollups = appliance.db.client["metric_rollups"]
    appliance.db.client.transaction {
      result = ems, rollups.parent_ems_id == ems.id.appliance.db.client.session.query(rollups.id).join.filter(rollups.capture_interval_name == "hourly", rollups.resource_name.contains(vmname), ems.name == provider.name, rollups.timestamp >= date.today())
    }
    for record in appliance.db.client.session.query(rollups).filter(rollups.id.in_(result.subquery()))
      if is_bool(!record.cpu_usagemhz_rate_average.equal?(nil) || !record.cpu_usage_rate_average.equal?(nil) || !record.derived_memory_used.equal?(nil) || !record.net_usage_rate_average.equal?(nil) || !record.disk_usage_rate_average.equal?(nil))
        return true
      end
    end
    return false
  end
  if is_bool(provider.one_of(SCVMMProvider))
    wait_for(method(:verify_vm_uptime), [appliance, provider, vmname], timeout: 3610, delay: 10, message: "Waiting for VM to be up for at least one hour")
  else
    wait_for(method(:verify_records_rollups_table), [appliance, provider], timeout: 3600, delay: 10, message: "Waiting for hourly rollups")
  end
  result = appliance.ssh_client.run_rails_command("Service.queue_chargeback_reports")
  raise "Failed to run Service Chargeback report" unless result.success
end
def test_total_services(appliance, setup_provider, context, order_service)
  # Tests total services count displayed on dashboard.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SelfServiceUI
  #       initialEstimate: 1/4h
  #       tags: ssui
  #   
  appliance.context.use(context) {
    dashboard = Dashboard(appliance)
    raise unless dashboard.total_services() == dashboard.results()
  }
end
def test_current_service(appliance, context)
  # Tests current services count displayed on dashboard.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SelfServiceUI
  #       initialEstimate: 1/4h
  #       tags: ssui
  #   
  appliance.context.use(context) {
    dashboard = Dashboard(appliance)
    raise unless dashboard.current_services() == dashboard.results()
  }
end
def test_retiring_soon(appliance, context)
  # Tests retiring soon(int displayed) service count on dashboard.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SelfServiceUI
  #       initialEstimate: 1/4h
  #       tags: ssui
  #   
  appliance.context.use(context) {
    dashboard = Dashboard(appliance)
    raise unless dashboard.retiring_soon() == dashboard.results()
  }
end
def test_retired_service(appliance, context)
  # Tests count of retired services(int) displayed on dashboard.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SelfServiceUI
  #       initialEstimate: 1/4h
  #       tags: ssui
  #   
  appliance.context.use(context) {
    dashboard = Dashboard(appliance)
    raise unless dashboard.retired_services() == dashboard.results()
  }
end
def test_monthly_charges(appliance, has_no_providers_modscope, setup_provider, context, order_service, run_service_chargeback_report)
  # Tests chargeback data
  # 
  #   Polarion:
  #       assignee: nachandr
  #       casecomponent: SelfServiceUI
  #       initialEstimate: 1/4h
  #   
  appliance.context.use(context) {
    dashboard = Dashboard(appliance)
    monthly_charges = dashboard.monthly_charges()
    logger.info("Monthly charges is #{monthly_charges}")
    raise unless monthly_charges != "$0"
  }
end
def test_service_chargeback_multiple_vms(appliance, has_no_providers_modscope, setup_provider, context, order_service, run_service_chargeback_report)
  # Tests chargeback data for a service with multiple VMs
  #   Polarion:
  #       assignee: nachandr
  #       casecomponent: SelfServiceUI
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #   
  appliance.context.use(context) {
    dashboard = Dashboard(appliance)
    monthly_charges = dashboard.monthly_charges()
    logger.info("Monthly charges is #{monthly_charges}")
    raise unless monthly_charges != "$0"
  }
end
def test_total_requests(appliance, context)
  # Tests total requests displayed.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SelfServiceUI
  #       initialEstimate: 1/4h
  #       tags: ssui
  #   
  appliance.context.use(context) {
    dashboard = Dashboard(appliance)
    dashboard.total_requests()
  }
end
def test_pending_requests(appliance, context)
  # Tests pending requests displayed on dashboard.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SelfServiceUI
  #       initialEstimate: 1/4h
  #       tags: ssui
  #   
  appliance.context.use(context) {
    dashboard = Dashboard(appliance)
    dashboard.pending_requests()
  }
end
def test_approved_requests(appliance, context)
  # Tests approved requests displayed on dashboard.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SelfServiceUI
  #       initialEstimate: 1/4h
  #       tags: ssui
  #   
  appliance.context.use(context) {
    dashboard = Dashboard(appliance)
    dashboard.approved_requests()
  }
end
def test_denied_requests(appliance, context)
  # Tests denied requests displayed on dashboard.
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SelfServiceUI
  #       initialEstimate: 1/4h
  #       tags: ssui
  #   
  appliance.context.use(context) {
    dashboard = Dashboard(appliance)
    dashboard.denied_requests()
  }
end
