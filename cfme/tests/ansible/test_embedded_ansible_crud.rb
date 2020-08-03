require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.ansible]
def embedded_appliance(appliance)
  appliance.enable_embedded_ansible_role()
  raise unless appliance.is_embedded_ansible_running
  yield(appliance)
  appliance.disable_embedded_ansible_role()
end
def test_embedded_ansible_enable(embedded_appliance)
  # Tests whether the embedded ansible role and all workers have started correctly
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: critical
  #       initialEstimate: 1/6h
  #       tags: ansible_embed
  #   
  raise unless wait_for(lambda{|| embedded_appliance.is_embedded_ansible_running}, num_sec: 30)
  if embedded_appliance.version < "5.11"
    raise unless wait_for(lambda{|| embedded_appliance.supervisord.is_active}, num_sec: 30)
    raise unless wait_for(lambda{|| embedded_appliance.rabbitmq_server.running}, num_sec: 30)
    raise unless wait_for(lambda{|| embedded_appliance.nginx.running}, num_sec: 30)
    endpoint = is_bool(embedded_appliance.is_pod) ? "api" : "ansibleapi"
    raise unless embedded_appliance.ssh_client.run_command("curl -kL https://localhost/#{endpoint} | grep \"AWX REST API\"", container: embedded_appliance.ansible_pod_name)
  end
end
def test_embedded_ansible_disable(embedded_appliance)
  # Tests whether the embedded ansible role and all workers have stopped correctly
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: critical
  #       initialEstimate: 1/6h
  #       tags: ansible_embed
  #   
  if embedded_appliance.version < "5.11"
    raise unless wait_for(lambda{|| embedded_appliance.rabbitmq_server.running}, num_sec: 30)
    raise unless wait_for(lambda{|| embedded_appliance.nginx.running}, num_sec: 50)
  end
  embedded_appliance.disable_embedded_ansible_role()
  raise unless wait_for(lambda{|| !embedded_appliance.server_roles.get("embedded_ansible")}, timeout: 120)
  if is_bool(!embedded_appliance.is_pod && embedded_appliance.version < "5.11")
    raise unless wait_for(lambda{|| !embedded_appliance.supervisord.is_active}, num_sec: 180)
    raise unless wait_for(lambda{|| !embedded_appliance.rabbitmq_server.is_active}, num_sec: 80)
    raise unless wait_for(lambda{|| !embedded_appliance.nginx.is_active}, num_sec: 30)
  else
    raise unless wait_for(lambda{|| embedded_appliance.is_ansible_pod_stopped}, num_sec: 300)
  end
end
def test_embedded_ansible_event_catcher_process(embedded_appliance)
  # 
  #   EventCatcher process is started after Ansible role is enabled (rails
  #   evm:status)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: critical
  #       initialEstimate: 1/4h
  #       tags: ansible_embed
  #   
  if embedded_appliance.version < "5.11"
    result = embedded_appliance.ssh_client.run_rake_command("evm:status | grep 'EmbeddedAnsible'").output
    for data in result.split("
")
      logger.info("Checking service/process #{data} started or not")
      raise unless data.include?("started")
    end
  else
    rpm_check = (embedded_appliance.ssh_client.run_command("rpm -qa | grep 'ansible-runner'")).output
    for data in rpm_check.split("
")
      logger.info("Checking #{data} is present or not")
      raise unless data.include?("ansible-runner")
    end
  end
end
def test_embedded_ansible_logs(embedded_appliance)
  # 
  #   Separate log files should be generated for Ansible to aid debugging.
  #   p1 (/var/log/tower)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: Ansible
  #       caseimportance: critical
  #       initialEstimate: 1/4h
  #       tags: ansible_embed
  #   
  log_checks = ["callback_receiver.log", "dispatcher.log", "fact_receiver.log", "management_playbooks.log", "task_system.log", "tower.log", "tower_rbac_migrations.log", "tower_system_tracking_migrations.log"]
  tower_log_folder = embedded_appliance.ssh_client.run_command("ls /var/log/tower/")
  raise unless tower_log_folder.success
  logs = tower_log_folder.output.split("
")
  diff = Set.new(logs) - Set.new(log_checks).to_a
  raise unless 1 == diff.size
  raise unless diff[0].include?("setup")
end
