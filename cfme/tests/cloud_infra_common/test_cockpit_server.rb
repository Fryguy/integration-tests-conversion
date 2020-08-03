require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.cockpit]
def test_cockpit_server_role(appliance, provider, setup_provider, create_vm, enable)
  #  The test checks the cockpit \"Web Console\" button enable and disabled working.
  # 
  #   Metadata:
  #       test_flag: inventory
  # 
  #   Polarion:
  #       assignee: nansari
  #       caseimportance: medium
  #       casecomponent: Appliance
  #       initialEstimate: 1/4h
  #   
  if is_bool(enable)
    appliance.server.settings.enable_server_roles("cockpit_ws")
    wait_for(lambda{|| appliance.server_roles["cockpit_ws"] === true}, delay: 20, timeout: 300)
    view = navigate_to(create_vm, "Details")
    raise unless view.toolbar.access.item_enabled("Web Console")
    appliance.server.settings.disable_server_roles("cockpit_ws")
  else
    appliance.server.settings.disable_server_roles("cockpit_ws")
    wait_for(lambda{|| appliance.server_roles["cockpit_ws"] === false}, delay: 20, timeout: 300)
    view = navigate_to(create_vm, "Details")
    access = view.toolbar.access
    raise unless !access.is_enabled || !access.item_enabled("Web Console")
  end
end
