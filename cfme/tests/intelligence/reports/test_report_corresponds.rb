require 'None'
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/net'
include Cfme::Utils::Net
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
pytestmark = [test_requirements.report]
def report_vms(appliance, infra_provider)
  report = appliance.collections.reports.create(menu_name: fauxfactory.gen_alphanumeric(), title: fauxfactory.gen_alphanumeric(), base_report_on: "Virtual Machines", report_fields: ["Provider : Name", "Cluster / Deployment Role : Name", "Datastore : Name", "Hardware : Number of CPUs", "Hardware : RAM", "Host / Node : Name", "Name"])
  report.queue(wait_for_finish: true)
  yield sample(report.saved_reports.all()[0].data.rows.to_a.select{|i| i["Provider Name"].strip().size > 0}.map{|i| i}, 2)
  report.delete()
end
def test_custom_vm_report(soft_assert, report_vms)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Reporting
  #       caseimportance: low
  #       initialEstimate: 1/16h
  #   
  cluster = "Cluster / Deployment Role Name"
  host = "Host / Node Name"
  for row in report_vms
    if is_bool(row["Name"].startswith("test_"))
      next
    end
    provider_name = row["Provider Name"]
    provider_mgmt = get_crud_by_name(provider_name).mgmt
    provider_hosts_and_ips = resolve_ips(provider_mgmt.list_host())
    provider_datastores = provider_mgmt.list_datastore()
    provider_clusters = provider_mgmt.list_cluster()
    soft_assert.(provider_mgmt.does_vm_exist(row["Name"]), "VM {} does not exist in {}!".format(row["Name"], provider_name))
    if is_bool(row[cluster])
      soft_assert.(provider_clusters.include?(row[cluster]), "Cluster {} not found in {}!".format(row[cluster], provider_clusters.to_s))
    end
    if is_bool(row["Datastore Name"])
      soft_assert.(provider_datastores.include?(row["Datastore Name"]), "Datastore {} not found in {}!".format(row["Datastore Name"], provider_datastores.to_s))
    end
    if is_bool(row[host])
      found = false
      possible_ips_or_hosts = resolve_ips([row[host]])
      for possible_ip_or_host in possible_ips_or_hosts
        for host_ip in provider_hosts_and_ips
          if is_bool(host_ip.include?(possible_ip_or_host) || possible_ip_or_host.include?(host_ip))
            found = true
          end
        end
      end
      soft_assert.(found, )
    end
  end
end
