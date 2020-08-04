require_relative 'cfme'
include Cfme
require_relative 'cfme/base/ui'
include Cfme::Base::Ui
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
def test_configuration_dropdown_roles_by_server(appliance, request)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Configuration
  #       caseimportance: high
  #       initialEstimate: 1/15h
  #       testSteps:
  #           1. Navigate to Settings -> Configuration -> Diagnostics -> CFME Region ->
  #               Roles by Servers.
  #           2. Select a Role and check the `Configuration` dropdown in toolbar.
  #           3. Check the `Suspend Role` option.
  #           4. Click the `Suspend Role` option and suspend the role
  #               and monitor production.log for error -
  #               `Error caught: [ActiveRecord::RecordNotFound] Couldn't find MiqServer with 'id'=0`
  #       expectedResults:
  #           1.
  #           2. `Configuration` dropdown must be enabled/active.
  #           3. `Suspend Role` must be enabled.
  #           4. Role must be suspended and there must be no error in the logs.
  # 
  #   Bugzilla:
  #       1715466
  #       1455283
  #       1404280
  #       1734393
  #   
  view = navigate_to(appliance.server.zone.region, "RolesByServers")
  view.rolesbyservers.tree.select_item("SmartState Analysis")
  raise unless view.rolesbyservers.configuration.is_displayed
  raise unless view.rolesbyservers.configuration.item_enabled("Suspend Role")
  log = LogValidator("/var/www/miq/vmdb/log/production.log", failure_patterns: [".*Error caught: .*ActiveRecord::RecordNotFound.* Couldn't find MiqServer with 'id'=.*"])
  log.start_monitoring()
  view.rolesbyservers.configuration.item_select("Suspend Role", handle_alert: true)
  request.addfinalizer(lambda{|| view.rolesbyservers.configuration.item_select("Start Role", handle_alert: true)})
  view.flash.assert_message("Suspend successfully initiated")
  raise unless log.validate(wait: "20s")
  if is_bool(BZ(1734393, forced_streams: ["5.10"]).blocks)
    view.rolesbyservers.tree.select_item("SmartState Analysis")
  end
  raise unless view.rolesbyservers.tree.currently_selected_role.include?("available")
end
def test_diagnostics_server(appliance, obj)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #       testSteps:
  #           1. Navigate to Configuration and go to Diagnostics accordion.
  #           2. Click on Region, click on `Servers` tab
  #               and select a server from the table and check the landing page.
  #           3. Click on Zone, click on `Servers` tab
  #               and select a server from the table and check the landing page.
  #       expectedResults:
  #           1.
  #           2. Landing page must be `Diagnostics Server` summary page.
  #           3. Landing page must be `Diagnostics Server` summary page.
  # 
  #   Bugzilla:
  #       1498090
  #   
  context_obj = (obj == "Region") ? appliance.server.zone.region : appliance.server.zone
  required_view = appliance.server.create_view(ServerDiagnosticsView)
  view = navigate_to(context_obj, "Servers")
  view.servers.table.row(name: appliance.server.name).click()
  raise unless required_view.is_displayed
  raise unless required_view.summary.is_active()
end
