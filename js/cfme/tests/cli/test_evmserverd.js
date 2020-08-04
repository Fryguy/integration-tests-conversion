// This module contains tests that exercise control of evmserverd service.
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

function start_evmserverd_after_module(appliance) {
  appliance.evmserverd.start();
  appliance.wait_for_web_ui();
  yield;
  appliance.evmserverd.restart();
  appliance.wait_for_web_ui()
};

let pytestmark = [
  pytest.mark.uncollectif(
    appliance => appliance.is_pod,
    {reason: "CLI tests not valid on podified"}
  ),

  pytest.mark.usefixtures("start_evmserverd_after_module")
];

function test_evmserverd_stop(appliance, request) {
  // Tests whether stopping the evmserverd really stops the CFME server processes.
  // 
  //   Steps:
  //       * Remember all server names from ``service evmserverd status`` command.
  //           * Or the bin/rake evm:status on 5.5+ since the systemd status does not show that, this
  //               applies also for next references to status.
  //       * Issue a ``service evmserverd stop`` command.
  //       * Periodically check output of ``service evmserverd status`` that all servers are stopped.
  //       * For 5.5+: Really call ``service evmserverd status`` and check that the mentions of
  //           stopping the service are present.
  // 
  //   Polarion:
  //       assignee: sbulage
  //       casecomponent: Appliance
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let server_name_key = "Server";

  let get_server_names = () => (
    appliance.ssh_client.status.servers.map(server => (
      bool(server.get(server_name_key, false))
    )).is_all
  );

  let server_names = appliance.ssh_client.status.servers.map(server => (
    server[server_name_key].rstrip("*")
  )).to_set;

  request.addfinalizer(appliance.evmserverd.start);
  appliance.evmserverd.stop();

  let servers_stopped = () => {
    let server_name_status_map = appliance.ssh_client.status.servers.map(server => (
      [server[server_name_key].rstrip("*"), server]
    )).to_h;

    let __dummy0__ = false;

    for (let server_name in server_names) {
      try {
        if (server_name_status_map[server_name].Status != "stopped") return false
      } catch ($EXCEPTION) {
        if ($EXCEPTION instanceof KeyError) {
          pytest.fail("Expected server name [{}] not found in status map [{}].".format(
            server_name,
            server_name_status_map
          ))
        } else {
          throw $EXCEPTION
        }
      };

      if (server_name == server_names[-1]) __dummy0__ = true
    };

    if (__dummy0__) return true
  };

  let status = appliance.ssh_client.run_command("systemctl status evmserverd");
  if (!status.output.include("Stopped EVM server daemon")) throw new ();
  if (!status.output.include("code=exited")) throw new ()
}
