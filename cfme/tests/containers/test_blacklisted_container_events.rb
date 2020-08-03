require_relative 'wrapanapi/systems/container/rhopenshift'
include Wrapanapi::Systems::Container::Rhopenshift
require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "function"), test_requirements.containers]
TEST_POD = {"kind" => "Pod", "apiVersion" => "v1", "metadata" => {"name" => "hello-openshift", "creationTimestamp" => nil, "labels" => {"name" => "hello-openshift"}}, "spec" => {"containers" => [{"name" => "hello-openshift", "image" => "openshift/hello-openshift", "ports" => [{"containerPort" => 8080, "protocol" => "TCP"}], "resources" => {}, "volumeMounts" => [{"name" => "tmp", "mountPath" => "/tmp"}], "terminationMessagePath" => "/dev/termination-log", "imagePullPolicy" => "IfNotPresent", "capabilities" => {}, "securityContext" => {"capabilities" => {}, "privileged" => false}}], "volumes" => [{"name" => "tmp", "emptyDir" => {}}], "restartPolicy" => "Always", "dnsPolicy" => "ClusterFirst", "serviceAccount" => ""}, "status" => {}}
def restore_advanced_settings(appliance)
  # Restores the Advanced Settings config
  if appliance.version < "5.10"
    appliance.update_advanced_settings({"ems" => {"ems_openshift" => {"blacklisted_event_names" => []}}})
  else
    appliance.update_advanced_settings({"ems" => {"ems_openshift" => {"blacklisted_event_names" => "<<reset>>"}}})
  end
end
def create_pod(provider, namespace)
  # Creates OpenShift pod in provided namespace
  provider.mgmt.k_api.create_namespaced_pod(namespace: namespace, body: TEST_POD)
  pods = provider.mgmt.list_pods(namespace: namespace)
  raise unless TEST_POD["metadata"]["name"] == pods[0].metadata.name
end
def delete_pod(provider, namespace)
  # Delete OpenShift pod in provided namespace
  provider.mgmt.delete_pod(namespace: namespace, name: TEST_POD["metadata"]["name"])
  wait_for(lambda{|| !provider.mgmt.list_pods(namespace: namespace)}, delay: 5, num_sec: 300, message: "waiting for pod to be deleted")
  raise unless !provider.mgmt.list_pods(namespace: namespace)
end
def appliance_cleanup(provider, appliance, namespace)
  # Returns the appliance and provider to the original state
  restore_advanced_settings(appliance: appliance)
  appliance.ssh_client.run_rails_console("BlacklistedEvent.where(:event_name => 'POD_CREATED').destroy_all")
  appliance.evmserverd.restart()
  appliance.wait_for_web_ui()
  begin
    delete_pod(provider: provider, namespace: namespace)
    provider.mgmt.delete_project(name: namespace)
  rescue ApiException
    logger.info("No Container Pod or Project to delete")
  end
end
def get_blacklisted_event_names(appliance)
  # Returns a list of Blacklisted event names
  rails_result = appliance.ssh_client.run_rails_console("ManageIQ::Providers::Openshift::ContainerManager.first.blacklisted_event_names")
  raise unless rails_result.success
  return rails_result.output
end
def test_blacklisted_container_events(request, appliance, provider, app_creds)
  # 
  #       Test that verifies that container events can be blacklisted.
  # 
  #       Polarion:
  #           assignee: juwatts
  #           caseimportance: high
  #           casecomponent: Containers
  #           initialEstimate: 1/6h
  #   
  project_name = fauxfactory.gen_alpha(8).downcase()
  provider.mgmt.create_project(name: project_name)
  provider.mgmt.wait_project_exist(name: project_name)
  request.addfinalizer(lambda{|| appliance_cleanup(provider: provider, appliance: appliance, namespace: project_name)})
  evm_tail_no_blacklist = LogValidator("/var/www/miq/vmdb/log/evm.log", matched_patterns: [".*event\\_type\\=\\>\\\"POD\\_CREATED\\\".*"])
  evm_tail_no_blacklist.start_monitoring()
  create_pod(provider: provider, namespace: project_name)
  rails_result_no_blacklist = get_blacklisted_event_names(appliance)
  raise unless !rails_result_no_blacklist.include?("POD_CREATED")
  raise unless evm_tail_no_blacklist.validate()
  delete_pod(provider: provider, namespace: project_name)
  appliance.update_advanced_settings({"ems" => {"ems_openshift" => {"blacklisted_event_names" => ["POD_CREATED"]}}})
  appliance.evmserverd.restart()
  appliance.wait_for_web_ui()
  rails_result_blacklist = get_blacklisted_event_names(appliance)
  raise unless rails_result_blacklist.include?("POD_CREATED")
  evm_tail_blacklist = LogValidator("/var/www/miq/vmdb/log/evm.log", failure_patterns: [".*event\\_type\\=\\>\\\"POD\\_CREATED\\\".*"], hostname: appliance.hostname, username: app_creds["sshlogin"], password: app_creds["password"])
  evm_tail_blacklist.start_monitoring()
  create_pod(provider: provider, namespace: project_name)
  raise unless evm_tail_blacklist.validate()
  delete_pod(provider: provider, namespace: project_name)
  restore_advanced_settings(appliance: appliance)
  rails_destroy_blacklist = appliance.ssh_client.run_rails_console("BlacklistedEvent.where(:event_name => 'POD_CREATED').destroy_all")
  raise unless rails_destroy_blacklist.success
  rails_result_default = get_blacklisted_event_names(appliance)
  raise unless !rails_result_default.include?("POD_CREATED")
  appliance.evmserverd.restart()
  appliance.wait_for_web_ui()
  evm_tail_no_blacklist.start_monitoring()
  create_pod(provider: provider, namespace: project_name)
  raise unless evm_tail_no_blacklist.validate(wait: "120s")
end
