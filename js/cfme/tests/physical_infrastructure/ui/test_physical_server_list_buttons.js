require_relative("cfme/common/physical_server_views");
include(Cfme.Common.Physical_server_views);
require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider([LenovoProvider], {scope: "module"})
];

function physical_servers(appliance, provider, setup_provider) {
  return appliance.collections.physical_servers.all(provider)
};

function physical_servers_collection(appliance) {
  return appliance.collections.physical_servers
};

function test_refresh_relationships(physical_servers_collection, physical_servers, provider) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(physical_servers_collection, "All");
  let last_refresh = provider.last_refresh_date();
  let item = "Refresh Relationships and Power States";

  physical_servers_collection.custom_button_action(
    "Configuration",
    item,
    physical_servers
  );

  let [out, time] = wait_for(
    () => last_refresh != provider.last_refresh_date(),

    {
      fail_func: view.browser.refresh,
      message: "Wait for the servers to be refreshed...",
      num_sec: 300,
      delay: 5
    }
  );

  if (!out) throw new ()
};

const Action = collections.namedtuple("Action", "button item method");

let actions = [
  Action.call("Power", "Power Off", "power_off"),
  Action.call("Power", "Power On", "power_on"),
  Action.call("Power", "Power Off Immediately", "power_off_now"),
  Action.call("Power", "Restart", "restart"),
  Action.call("Power", "Restart Immediately", "restart_now"),

  Action.call(
    "Power",
    "Restart to System Setup",
    "restart_to_sys_setup"
  ),

  Action.call(
    "Power",
    "Restart Management Controller",
    "restart_mgmt_controller"
  ),

  Action.call("Identify", "Blink LED", "blink_loc_led"),
  Action.call("Identify", "Turn Off LED", "turn_off_loc_led"),
  Action.call("Identify", "Turn On LED", "turn_on_loc_led")
];

function test_server_actions(physical_servers_collection, physical_servers, provider, button, item, method) {
  //  Test the physical server actions are creating a handler alert to each action of the a collection
  //   of physical servers.
  //   Params:
  //       * button: the button to be performed on the physical server list page
  //       * item: the item to be selected inside the dropdrown button
  //       * method: the name of the method that most be used to compare if was invoked the
  //       current method on the manageIQ.
  //   Metadata:
  //       test_flag: crud
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  let view = provider.create_view(PhysicalServersView);
  let last_part = (physical_servers.size > 1 ? "s" : "");
  let message = `Requested Server ${method} for the selected server${last_part}`;

  physical_servers_collection.custom_button_action(
    button,
    item,
    physical_servers
  );

  let assert_handler_displayed = () => {
    if (is_bool(view.flash.is_displayed)) return view.flash[0].text == message;
    return false
  };

  wait_for(method("assert_handler_displayed"), {
    message: "Wait for the handler alert to appear...",
    num_sec: 20,
    delay: 5
  });

  view.browser.refresh()
};

function test_manage_button(physical_servers_collection, physical_servers) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  physical_servers_collection.select_entity_rows(physical_servers);

  let view = navigate_to(
    physical_servers_collection,
    "ManagePoliciesCollection"
  );

  if (!view.is_displayed) throw new ()
};

function test_edit_tag(physical_servers_collection, physical_servers) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  physical_servers_collection.select_entity_rows(physical_servers);

  let view = navigate_to(
    physical_servers_collection,
    "EditTagsCollection"
  );

  if (!view.is_displayed) throw new ()
};

function test_lifecycle_provision(physical_servers_collection, physical_servers) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  physical_servers_collection.select_entity_rows(physical_servers);

  let view = navigate_to(
    physical_servers_collection,
    "ProvisionCollection"
  );

  if (!view.is_displayed) throw new ()
}
