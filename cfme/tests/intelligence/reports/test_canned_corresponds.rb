require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/net'
include Cfme::Utils::Net
require_relative 'cfme/utils/net'
include Cfme::Utils::Net
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
pytestmark = [pytest.mark.tier(3), pytest.mark.provider(classes: [InfraProvider], scope: "function"), test_requirements.report]
def compare(db_item, report_item)
  # If one of the item is unfilled, check that the other item is as well.
  #   If not, check that they contain the same information.
  if is_bool(!db_item.equal?(nil) || report_item != "")
    return db_item == report_item
  else
    return db_item === nil && report_item == ""
  end
end
def test_providers_summary(appliance, soft_assert, request, setup_provider)
  # Checks some informations about the provider. Does not check memory/frequency as there is
  #   presence of units and rounding.
  # 
  #   Metadata:
  #       test_flag: inventory
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #   
  report = appliance.collections.reports.instantiate(type: "Configuration Management", subtype: "Providers", menu_name: "Providers Summary").queue(wait_for_finish: true)
  request.addfinalizer(report.delete)
  skipped_providers = 
  for provider in report.data.rows
    if skipped_providers.include?(provider["MS Type"])
      next
    end
    provider_object = appliance.collections.infra_providers.instantiate(InfraProvider, name: provider["Name"])
    details_view = navigate_to(provider_object, "Details")
    props = details_view.entities.summary("Properties")
    hostname = (appliance.version > "5.11") ? "Hostname" : "Host Name"
    soft_assert.(props.get_text_of(hostname) == provider["Hostname"], "Hostname does not match at {}".format(provider["Name"]))
    cpu_cores = props.get_text_of("Aggregate Host CPU Cores")
    soft_assert.(cpu_cores == provider["Total Number of Logical CPUs"], "Logical CPU count does not match at {}".format(provider["Name"]))
    host_cpu = props.get_text_of("Aggregate Host CPUs")
    soft_assert.(host_cpu == provider["Total Number of Physical CPUs"], "Physical CPU count does not match at {}".format(provider["Name"]))
  end
end
def test_cluster_relationships(appliance, request, soft_assert, setup_provider)
  # Tests vm power options from on
  # 
  #   Metadata:
  #       test_flag: inventory
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #   
  report = appliance.collections.reports.instantiate(type: "Relationships", subtype: "Virtual Machines, Folders, Clusters", menu_name: "Cluster Relationships").queue(wait_for_finish: true)
  request.addfinalizer(report.delete)
  for relation in report.data.rows
    name = relation["Name"]
    provider_name = relation["Provider Name"]
    if is_bool(!provider_name.strip())
      next
    end
    provider = get_crud_by_name(provider_name)
    host_name = relation["Host Name"].strip()
    cluster_list = is_bool(provider.is_a? SCVMMProvider) ? provider.mgmt.list_clusters() : provider.mgmt.list_cluster()
    verified_cluster = cluster_list.select{|item| item.include?(name)}.map{|item| item}
    soft_assert.(verified_cluster, )
    if is_bool(!host_name)
      next
    end
    host_ip = resolve_hostname(host_name, force: true)
    if host_ip === nil
      next
    end
    host_list = provider.mgmt.list_host()
    __dummy0__ = false
    for host in host_list
      if ip_address.match(host) === nil
        host_is_ip = false
        ip_from_provider = resolve_hostname(host, force: true)
      else
        host_is_ip = true
        ip_from_provider = host
      end
      if is_bool(!host_is_ip)
        if host == host_name
          break
        else
          if is_bool(host_name.startswith(host))
            break
          else
            if is_bool(!ip_from_provider.equal?(nil) && ip_from_provider == host_ip)
              break
            end
          end
        end
      else
        if host_ip == ip_from_provider
          break
        end
      end
      if host == host_list[-1]
        __dummy0__ = true
      end
    end
    if __dummy0__
      soft_assert.(false, )
    end
  end
end
def test_operations_vm_on(soft_assert, temp_appliance_preconfig_funcscope, request, setup_provider_temp_appliance)
  # Tests vm power options from on
  # 
  #   Metadata:
  #       test_flag: report
  # 
  #   Bugzilla:
  #       1571254
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #   
  appliance = temp_appliance_preconfig_funcscope
  adb = appliance.db.client
  vms = adb["vms"]
  hosts = adb["hosts"]
  storages = adb["storages"]
  report = appliance.collections.reports.instantiate(type: "Operations", subtype: "Virtual Machines", menu_name: "Online VMs (Powered On)").queue(wait_for_finish: true)
  request.addfinalizer(report.delete)
  vms_in_db = adb.session.query(vms.name.label("vm_name"), vms.location.label("vm_location"), vms.last_scan_on.label("vm_last_scan"), storages.name.label("storages_name"), hosts.name.label("hosts_name")).outerjoin(hosts, vms.host_id == hosts.id).outerjoin(storages, vms.storage_id == storages.id).filter(vms.power_state == "on").order_by(vms.name).all()
  raise unless vms_in_db.size == report.data.rows.to_a.size
  vm_names = vms_in_db.map{|vm| vm.vm_name}
  for vm in vms_in_db
    raise  unless vm_names.count(vm.vm_name) == 1
    store_path = vm.vm_location
    if is_bool(vm.storages_name)
      store_path = 
    end
    for item in report.data.rows
      if vm.vm_name == item["VM Name"]
        raise unless compare(vm.hosts_name, item["Host"])
        raise unless compare(vm.storages_name, item["Datastore"])
        raise unless compare(store_path, item["Datastore Path"])
        raise unless compare(vm.vm_last_scan, item["Last Analysis Time"])
      end
    end
  end
end
def test_datastores_summary(soft_assert, temp_appliance_preconfig_funcscope, request, setup_provider_temp_appliance)
  # Checks Datastores Summary report with DB data. Checks all data in report, even rounded
  #   storage sizes.
  # 
  #   Metadata:
  #       test_flag: inventory
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #   
  appliance = temp_appliance_preconfig_funcscope
  adb = appliance.db.client
  storages = adb["storages"]
  vms = adb["vms"]
  host_storages = adb["host_storages"]
  report = appliance.collections.reports.instantiate(type: "Configuration Management", subtype: "Storage", menu_name: "Datastores Summary").queue(wait_for_finish: true)
  request.addfinalizer(report.delete)
  storages_in_db = adb.session.query(storages.store_type, storages.free_space, storages.total_space, storages.name, storages.id).all()
  raise unless storages_in_db.size == report.data.rows.to_a.size
  storages_in_db_list = []
  report_rows_list = []
  for store in storages_in_db
    number_of_vms = adb.session.query(vms.id).filter(vms.storage_id == store.id).filter(vms.template == "f").count()
    number_of_hosts = adb.session.query(host_storages.host_id).filter(host_storages.storage_id == store.id).count()
    store_dict = {"Datastore Name" => store.name, "Type" => store.store_type, "Free Space" => round_num(store.free_space), "Total Space" => round_num(store.total_space), "Number of Hosts" => number_of_hosts.to_i, "Number of VMs" => number_of_vms.to_i}
    storages_in_db_list.push(store_dict)
  end
  for row in report.data.rows
    row["Free Space"] = extract_num(row["Free Space"])
    row["Total Space"] = extract_num(row["Total Space"])
    row["Number of Hosts"] = row["Number of Hosts"].to_i
    row["Number of VMs"] = row["Number of VMs"].to_i
    report_rows_list.push(row)
  end
  raise unless sorted(storages_in_db_list, key: String) == sorted(report_rows_list, key: String)
end
def round_num(column)
  num = column.to_f
  while num > 1024
    num = num / 1024.0.to_f
  end
  return round(num, 1)
end
def extract_num(column)
  return column.split_p(" ")[0].to_f
end
