require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider(gen_func: providers, filters: [ProviderFilter(classes: [ContainersProvider], required_flags: ["cockpit"])], scope: "function"), test_requirements.containers]
def test_cockpit_button_access(appliance, provider, cockpit, request)
  #  The test verifies the existence of cockpit \"Web Console\"
  #       button on each node, click the button if enabled, verify no errors are displayed.
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  request.addfinalizer(lambda{|| appliance.server.settings.disable_server_roles("cockpit_ws")})
  if is_bool(cockpit)
    appliance.server.settings.enable_server_roles("cockpit_ws")
    wait_for(lambda{|| appliance.server_roles["cockpit_ws"] === true}, delay: 10, timeout: 300)
  else
    if is_bool(!cockpit)
      appliance.server.settings.disable_server_roles("cockpit_ws")
      wait_for(lambda{|| appliance.server_roles["cockpit_ws"] === false}, delay: 10, timeout: 300)
    else
      pytest.skip("Cockpit should be either enabled or disabled.")
    end
  end
  collection = appliance.collections.container_nodes
  nodes = collection.all()
  for node in nodes
    view = is_bool(node) ? navigate_to(node, "Details", force: true) : pytest.skip()
    if is_bool(cockpit)
      raise unless !view.toolbar.web_console.disabled
      view.toolbar.web_console.click()
      webconsole = node.vm_console
      webconsole.switch_to_console()
      raise unless !view.is_displayed
      raise unless appliance.server.browser.url.include?(node.name)
      webconsole.close_console_window()
      raise unless view.is_displayed
      view.flash.assert_no_error()
    else
      raise unless view.toolbar.web_console.disabled
    end
  end
end
