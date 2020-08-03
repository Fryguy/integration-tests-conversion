# This module contains tests that exercise control of evmserverd service.
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
def start_evmserverd_after_module(appliance)
  appliance.evmserverd.start()
  appliance.wait_for_web_ui()
  yield
  appliance.evmserverd.restart()
  appliance.wait_for_web_ui()
end
pytestmark = [pytest.mark.uncollectif(lambda{|appliance| appliance.is_pod}, reason: "CLI tests not valid on podified"), pytest.mark.usefixtures("start_evmserverd_after_module")]
def test_evmserverd_stop(appliance, request)
  # Tests whether stopping the evmserverd really stops the CFME server processes.
  # 
  #   Steps:
  #       * Remember all server names from ``service evmserverd status`` command.
  #           * Or the bin/rake evm:status on 5.5+ since the systemd status does not show that, this
  #               applies also for next references to status.
  #       * Issue a ``service evmserverd stop`` command.
  #       * Periodically check output of ``service evmserverd status`` that all servers are stopped.
  #       * For 5.5+: Really call ``service evmserverd status`` and check that the mentions of
  #           stopping the service are present.
  # 
  #   Polarion:
  #       assignee: sbulage
  #       casecomponent: Appliance
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  server_name_key = "Server"
  get_server_names = lambda do
    #  Wait for the server name to appear on the appliance.
    #         This test was experiencing KeyErrors before this wait was included.
    #     
    return appliance.ssh_client.status["servers"].map{|server| bool(server.get(server_name_key, false))}.is_all?
  end
  server_names = appliance.ssh_client.status["servers"].map{|server| server[server_name_key].rstrip("*")}.to_set
  request.addfinalizer(appliance.evmserverd.start)
  appliance.evmserverd.stop()
  servers_stopped = lambda do
    server_name_status_map = appliance.ssh_client.status["servers"].map{|server|[server[server_name_key].rstrip("*"), server]}.to_h
    __dummy0__ = false
    for server_name in server_names
      begin
        if server_name_status_map[server_name]["Status"] != "stopped"
          return false
        end
      rescue KeyError
        pytest.fail("Expected server name [{}] not found in status map [{}].".format(server_name, server_name_status_map))
      end
      if server_name == server_names[-1]
        __dummy0__ = true
      end
    end
    if __dummy0__
      return true
    end
  end
  status = appliance.ssh_client.run_command("systemctl status evmserverd")
  raise unless status.output.include?("Stopped EVM server daemon")
  raise unless status.output.include?("code=exited")
end
