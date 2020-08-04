require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.ansible];

function embedded_appliance(appliance) {
  appliance.enable_embedded_ansible_role();
  if (!appliance.is_embedded_ansible_running) throw new ();
  yield(appliance);
  appliance.disable_embedded_ansible_role()
};

function test_embedded_ansible_enable(embedded_appliance) {
  // Tests whether the embedded ansible role and all workers have started correctly
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: critical
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  if (!wait_for(
    () => embedded_appliance.is_embedded_ansible_running,
    {num_sec: 30}
  )) throw new ();

  if (embedded_appliance.version < "5.11") {
    if (!wait_for(
      () => embedded_appliance.supervisord.is_active,
      {num_sec: 30}
    )) throw new ();

    if (!wait_for(
      () => embedded_appliance.rabbitmq_server.running,
      {num_sec: 30}
    )) throw new ();

    if (!wait_for(() => embedded_appliance.nginx.running, {num_sec: 30})) {
      throw new ()
    };

    let endpoint = (is_bool(embedded_appliance.is_pod) ? "api" : "ansibleapi");

    if (!embedded_appliance.ssh_client.run_command(
      `curl -kL https://localhost/${endpoint} | grep \"AWX REST API\"`,
      {container: embedded_appliance.ansible_pod_name}
    )) throw new ()
  }
};

function test_embedded_ansible_disable(embedded_appliance) {
  // Tests whether the embedded ansible role and all workers have stopped correctly
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: critical
  //       initialEstimate: 1/6h
  //       tags: ansible_embed
  //   
  if (embedded_appliance.version < "5.11") {
    if (!wait_for(
      () => embedded_appliance.rabbitmq_server.running,
      {num_sec: 30}
    )) throw new ();

    if (!wait_for(() => embedded_appliance.nginx.running, {num_sec: 50})) {
      throw new ()
    }
  };

  embedded_appliance.disable_embedded_ansible_role();

  if (!wait_for(
    () => !embedded_appliance.server_roles.get("embedded_ansible"),
    {timeout: 120}
  )) throw new ();

  if (is_bool(!embedded_appliance.is_pod && embedded_appliance.version < "5.11")) {
    if (!wait_for(
      () => !embedded_appliance.supervisord.is_active,
      {num_sec: 180}
    )) throw new ();

    if (!wait_for(
      () => !embedded_appliance.rabbitmq_server.is_active,
      {num_sec: 80}
    )) throw new ();

    if (!wait_for(
      () => !embedded_appliance.nginx.is_active,
      {num_sec: 30}
    )) throw new ()
  } else if (!wait_for(
    () => embedded_appliance.is_ansible_pod_stopped,
    {num_sec: 300}
  )) {
    throw new ()
  }
};

function test_embedded_ansible_event_catcher_process(embedded_appliance) {
  // 
  //   EventCatcher process is started after Ansible role is enabled (rails
  //   evm:status)
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: critical
  //       initialEstimate: 1/4h
  //       tags: ansible_embed
  //   
  if (embedded_appliance.version < "5.11") {
    let result = embedded_appliance.ssh_client.run_rake_command("evm:status | grep 'EmbeddedAnsible'").output;

    for (let data in result.split("\n")) {
      logger.info(`Checking service/process ${data} started or not`);
      if (!data.include("started")) throw new ()
    }
  } else {
    let rpm_check = (embedded_appliance.ssh_client.run_command("rpm -qa | grep 'ansible-runner'")).output;

    for (let data in rpm_check.split("\n")) {
      logger.info(`Checking ${data} is present or not`);
      if (!data.include("ansible-runner")) throw new ()
    }
  }
};

function test_embedded_ansible_logs(embedded_appliance) {
  // 
  //   Separate log files should be generated for Ansible to aid debugging.
  //   p1 (/var/log/tower)
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: Ansible
  //       caseimportance: critical
  //       initialEstimate: 1/4h
  //       tags: ansible_embed
  //   
  let log_checks = [
    "callback_receiver.log",
    "dispatcher.log",
    "fact_receiver.log",
    "management_playbooks.log",
    "task_system.log",
    "tower.log",
    "tower_rbac_migrations.log",
    "tower_system_tracking_migrations.log"
  ];

  let tower_log_folder = embedded_appliance.ssh_client.run_command("ls /var/log/tower/");
  if (!tower_log_folder.success) throw new ();
  let logs = tower_log_folder.output.split("\n");
  let diff = new Set(logs) - new Set(log_checks).to_a;
  if (1 != diff.size) throw new ();
  if (!diff[0].include("setup")) throw new ()
}
