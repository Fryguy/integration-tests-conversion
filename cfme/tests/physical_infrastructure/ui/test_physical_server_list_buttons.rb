require_relative 'cfme/common/physical_server_views'
include Cfme::Common::Physical_server_views
require_relative 'cfme/physical/provider/lenovo'
include Cfme::Physical::Provider::Lenovo
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), pytest.mark.provider([LenovoProvider], scope: "module")]
def physical_servers(appliance, provider, setup_provider)
  return appliance.collections.physical_servers.all(provider)
end
def physical_servers_collection(appliance)
  return appliance.collections.physical_servers
end
def test_refresh_relationships(physical_servers_collection, physical_servers, provider)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(physical_servers_collection, "All")
  last_refresh = provider.last_refresh_date()
  item = "Refresh Relationships and Power States"
  physical_servers_collection.custom_button_action("Configuration", item, physical_servers)
  out,time = wait_for(lambda{|| last_refresh != provider.last_refresh_date()}, fail_func: view.browser.refresh, message: "Wait for the servers to be refreshed...", num_sec: 300, delay: 5)
  raise unless out
end
Action = collections.namedtuple("Action", "button item method")
actions = [Action.("Power", "Power Off", "power_off"), Action.("Power", "Power On", "power_on"), Action.("Power", "Power Off Immediately", "power_off_now"), Action.("Power", "Restart", "restart"), Action.("Power", "Restart Immediately", "restart_now"), Action.("Power", "Restart to System Setup", "restart_to_sys_setup"), Action.("Power", "Restart Management Controller", "restart_mgmt_controller"), Action.("Identify", "Blink LED", "blink_loc_led"), Action.("Identify", "Turn Off LED", "turn_off_loc_led"), Action.("Identify", "Turn On LED", "turn_on_loc_led")]
def test_server_actions(physical_servers_collection, physical_servers, provider, button, item, method)
  #  Test the physical server actions are creating a handler alert to each action of the a collection
  #   of physical servers.
  #   Params:
  #       * button: the button to be performed on the physical server list page
  #       * item: the item to be selected inside the dropdrown button
  #       * method: the name of the method that most be used to compare if was invoked the
  #       current method on the manageIQ.
  #   Metadata:
  #       test_flag: crud
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  view = provider.create_view(PhysicalServersView)
  last_part = (physical_servers.size > 1) ? "s" : ""
  message = 
  physical_servers_collection.custom_button_action(button, item, physical_servers)
  assert_handler_displayed = lambda do
    if is_bool(view.flash.is_displayed)
      return view.flash[0].text == message
    end
    return false
  end
  wait_for(method(:assert_handler_displayed), message: "Wait for the handler alert to appear...", num_sec: 20, delay: 5)
  view.browser.refresh()
end
def test_manage_button(physical_servers_collection, physical_servers)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_servers_collection.select_entity_rows(physical_servers)
  view = navigate_to(physical_servers_collection, "ManagePoliciesCollection")
  raise unless view.is_displayed
end
def test_edit_tag(physical_servers_collection, physical_servers)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_servers_collection.select_entity_rows(physical_servers)
  view = navigate_to(physical_servers_collection, "EditTagsCollection")
  raise unless view.is_displayed
end
def test_lifecycle_provision(physical_servers_collection, physical_servers)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  physical_servers_collection.select_entity_rows(physical_servers)
  view = navigate_to(physical_servers_collection, "ProvisionCollection")
  raise unless view.is_displayed
end
