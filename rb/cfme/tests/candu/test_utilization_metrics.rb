require_relative 'operator'
include Operator
require_relative 'wrapanapi'
include Wrapanapi
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/common/provider'
include Cfme::Common::Provider
require_relative 'cfme/fixtures/provider'
include Cfme::Fixtures::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(1), test_requirements.c_and_u, pytest.mark.provider([VMwareProvider, RHEVMProvider, EC2Provider, OpenStackProvider, AzureProvider], required_fields: [[["cap_and_util", "capandu_vm"], "cu-24x7"]], scope: "module")]
BREADCRUMB_LOCATIONS = {}
def clean_setup_provider(request, provider)
  BaseProvider.clear_providers()
  setup_or_skip(request, provider)
  yield
  BaseProvider.clear_providers()
end
def vm_count(appliance, metrics_tbl, mgmt_system_id)
  return bool(appliance.db.client.session.query(metrics_tbl).filter(metrics_tbl.parent_ems_id == mgmt_system_id).filter(metrics_tbl.resource_type == "VmOrTemplate").count())
end
def host_count(appliance, metrics_tbl, mgmt_system_id)
  return bool(appliance.db.client.session.query(metrics_tbl).filter(metrics_tbl.parent_ems_id == mgmt_system_id).filter(metrics_tbl.resource_type == "Host").count())
end
def metrics_collection(appliance, clean_setup_provider, provider, enable_candu)
  # Check the db is gathering collection data for the given provider.
  # 
  #   Metadata:
  #       test_flag: metrics_collection
  #   
  metrics_tbl = appliance.db.client["metrics"]
  rollups = appliance.db.client["metric_rollups"]
  mgmt_systems_tbl = appliance.db.client["ext_management_systems"]
  vm_name = provider.data["cap_and_util"]["capandu_vm"]
  collection = provider.appliance.provider_based_collection(provider)
  vm = collection.instantiate(vm_name, provider)
  if is_bool(!vm.exists_on_provider)
    pytest.skip("Skipping test, cu-24x7 VM does not exist")
  end
  vm.mgmt.ensure_state(VmState.RUNNING)
  logger.info("Deleting metrics tables")
  appliance.db.client.session.query(metrics_tbl).delete()
  appliance.db.client.session.query(rollups).delete()
  logger.info("Fetching provider ID for %s", provider.key)
  mgmt_system_id = appliance.db.client.session.query(mgmt_systems_tbl).filter(mgmt_systems_tbl.name == conf.cfme_data.get("management_systems", {})[provider.key]["name"]).first().id
  logger.info("ID fetched; testing metrics collection now")
  wait_for(method(:vm_count), [appliance, metrics_tbl, mgmt_system_id], delay: 20, timeout: 1500, fail_condition: false, message: "wait for VMs")
  if provider.category == "infra"
    wait_for(method(:vm_count), [appliance, metrics_tbl, mgmt_system_id], delay: 20, timeout: 1500, fail_condition: false, message: "wait for hosts.")
  end
end
def get_host_name(provider)
  cfme_host = random.choice(provider.data["hosts"])
  return cfme_host.name
end
def query_metric_db(appliance, provider, metric, vm_name: nil, host_name: nil)
  metrics_tbl = appliance.db.client["metrics"]
  ems = appliance.db.client["ext_management_systems"]
  if vm_name === nil
    if !host_name.equal?(nil)
      object_name = host_name
    end
  else
    if !vm_name.equal?(nil)
      object_name = vm_name
    end
  end
  appliance.db.client.transaction {
    provs = ems, metrics_tbl.parent_ems_id == ems.id.appliance.db.client.session.query(metrics_tbl.id).join.filter(metrics_tbl.resource_name == object_name, ems.name == provider.name)
  }
  return appliance.db.client.session.query(metrics_tbl).filter(metrics_tbl.id.in_(provs.subquery()))
end
def test_raw_metric_vm_cpu(metrics_collection, appliance, provider)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: CandU
  #       initialEstimate: 1/12h
  #   
  vm_name = provider.data["cap_and_util"]["capandu_vm"]
  if provider.category == "infra"
    query = query_metric_db(appliance, provider, "cpu_usagemhz_rate_average", vm_name: vm_name)
    average_rate = attrgetter("cpu_usagemhz_rate_average")
  else
    if provider.category == "cloud"
      query = query_metric_db(appliance, provider, "cpu_usage_rate_average", vm_name: vm_name)
      average_rate = attrgetter("cpu_usage_rate_average")
    end
  end
  for record in query
    if !average_rate.(record).equal?(nil)
      raise "Zero VM CPU Usage" unless average_rate.(record) > 0
      break
    end
  end
end
def test_raw_metric_vm_memory(metrics_collection, appliance, provider)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       caseimportance: medium
  #       casecomponent: CandU
  #       initialEstimate: 1/12h
  #   
  vm_name = provider.data["cap_and_util"]["capandu_vm"]
  if provider.type == "azure"
    query = query_metric_db(appliance, provider, "mem_usage_absolute_average", vm_name: vm_name)
    average_rate = attrgetter("mem_usage_absolute_average")
  else
    query = query_metric_db(appliance, provider, "derived_memory_used", vm_name: vm_name)
    average_rate = attrgetter("derived_memory_used")
  end
  for record in query
    if !average_rate.(record).equal?(nil)
      raise "Zero VM Memory Usage" unless average_rate.(record) > 0
      break
    end
  end
end
def test_raw_metric_vm_network(metrics_collection, appliance, provider)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/12h
  #       casecomponent: CandU
  #   
  vm_name = provider.data["cap_and_util"]["capandu_vm"]
  query = query_metric_db(appliance, provider, "net_usage_rate_average", vm_name: vm_name)
  for record in query
    if !record.net_usage_rate_average.equal?(nil)
      raise "Zero VM Network IO" unless record.net_usage_rate_average > 0
      break
    end
  end
end
def test_raw_metric_vm_disk(metrics_collection, appliance, provider)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       casecomponent: CandU
  #   
  vm_name = provider.data["cap_and_util"]["capandu_vm"]
  query = query_metric_db(appliance, provider, "disk_usage_rate_average", vm_name: vm_name)
  for record in query
    if !record.disk_usage_rate_average.equal?(nil)
      raise "Zero VM Disk IO" unless record.disk_usage_rate_average > 0
      break
    end
  end
end
def test_raw_metric_host_cpu(metrics_collection, appliance, provider)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: CandU
  #       initialEstimate: 1/12h
  #   
  host_name = get_host_name(provider)
  query = query_metric_db(appliance, provider, "cpu_usagemhz_rate_average", vm_name: host_name)
  for record in query
    if !record.cpu_usagemhz_rate_average.equal?(nil)
      raise "Zero Host CPU Usage" unless record.cpu_usagemhz_rate_average > 0
      break
    end
  end
end
def test_raw_metric_host_memory(metrics_collection, appliance, provider)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       caseimportance: low
  #       casecomponent: CandU
  #       initialEstimate: 1/12h
  #   
  host_name = get_host_name(provider)
  query = query_metric_db(appliance, provider, "derived_memory_used", vm_name: host_name)
  for record in query
    if !record.derived_memory_used.equal?(nil)
      raise "Zero Host Memory Usage" unless record.derived_memory_used > 0
      break
    end
  end
end
def test_raw_metric_host_network(metrics_collection, appliance, provider)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       initialEstimate: 1/12h
  #       casecomponent: CandU
  #   
  host_name = get_host_name(provider)
  query = query_metric_db(appliance, provider, "net_usage_rate_average", vm_name: host_name)
  for record in query
    if !record.net_usage_rate_average.equal?(nil)
      raise "Zero Host Network IO" unless record.net_usage_rate_average > 0
      break
    end
  end
end
def test_raw_metric_host_disk(metrics_collection, appliance, provider)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       caseimportance: high
  #       casecomponent: CandU
  #       initialEstimate: 1/12h
  #   
  host_name = get_host_name(provider)
  query = query_metric_db(appliance, provider, "disk_usage_rate_average", vm_name: host_name)
  for record in query
    if !record.disk_usage_rate_average.equal?(nil)
      raise "Zero Host Disk IO" unless record.disk_usage_rate_average > 0
      break
    end
  end
end
def query_metric_rollup_table(appliance, provider, metric, azone_name)
  # 
  #   These queries return all records pertaining to a specific Availability zone
  #   specified by $azone_name from the metric_rollups table.
  #   
  metrics_tbl = appliance.db.client["metric_rollups"]
  ems = appliance.db.client["ext_management_systems"]
  appliance.db.client.transaction {
    provs = ems, metrics_tbl.parent_ems_id == ems.id.appliance.db.client.session.query(metrics_tbl.id).join.filter(metrics_tbl.resource_name == azone_name, ems.name == provider.name)
  }
  return appliance.db.client.session.query(metrics_tbl).filter(metrics_tbl.id.in_(provs.subquery()))
end
def generic_test_azone_rollup(appliance, provider, metric)
  # 
  #   The test_azone* tests require that the metrics_collection fixture be run.
  #   The first metric collection is scheduled through this fixture. The first
  #   metric collection itself takes at least 15 minutes(sometimes longer).
  #   The three tests that are run per provider take at least 20 minutes each
  #   for completion(considering provider add, provider refresh etc.). But, without
  #   parametrization, the three tests could be run in under 20 minutes.So, the tests
  #   haven't been parametrized.
  # 
  #   In an effort to reduce DRY code, I've written this generic function that
  #   checks if any of the table records have a metric with a non-zero value.
  #   
  azone_name = provider.data["cap_and_util"]["capandu_azone"]
  query = query_metric_rollup_table(appliance, provider, metric, azone_name)
  for record in query
    if is_bool(record.getattr(metric, 0).to_i)
      return true
    else
      raise TypeError, "The record had a zero in it!"
    end
  end
end
class TestAzone
  def test_azone_cpu_usage(appliance, provider)
    # 
    #     Polarion:
    #         assignee: gtalreja
    #         caseimportance: high
    #         casecomponent: CandU
    #         initialEstimate: 1/12h
    #     
    generic_test_azone_rollup(appliance, provider, "cpu_usage_rate_average")
  end
  def test_azone_memory_usage(appliance, provider)
    # 
    #     Polarion:
    #         assignee: gtalreja
    #         caseimportance: high
    #         casecomponent: CandU
    #         initialEstimate: 1/12h
    #     
    generic_test_azone_rollup(appliance, provider, "mem_usage_absolute_average")
  end
  def test_azone_network_io(appliance, provider)
    # 
    #     Polarion:
    #         assignee: gtalreja
    #         caseimportance: high
    #         casecomponent: CandU
    #         initialEstimate: 1/12h
    #     
    generic_test_azone_rollup(appliance, provider, "net_usage_rate_average")
  end
  def test_azone_disk_io(appliance, provider)
    # 
    #     Polarion:
    #         assignee: gtalreja
    #         caseimportance: high
    #         casecomponent: CandU
    #         initialEstimate: 1/12h
    #     
    generic_test_azone_rollup(appliance, provider, "disk_usage_rate_average")
  end
end
def test_utilization_breadcrumbs(appliance)
  # 
  #   Bugzilla:
  #       1741188
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: CandU
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #   
  view = navigate_to(appliance.collections.utilization, "All")
  raise unless view.breadcrumb.locations == BREADCRUMB_LOCATIONS["OverviewUtilization"]
  raise unless view.breadcrumb.is_displayed
end
