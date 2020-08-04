require_relative("cfme");
include(Cfme);
require_relative("cfme/configure");
include(Cfme.Configure);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [test_requirements.general_ui];

function test_server_name(request, appliance) {
  // Tests that changing the server name updates the about page
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //   
  let view = navigate_to(appliance.server, "Details");
  let old_server_name = view.server.basic_information.appliance_name.read();
  if (old_server_name == "") throw new ();
  let _ensure_name_reset = () => appliance.rename(old_server_name);
  let new_server_name = fauxfactory.gen_alpha({length: 20});

  if (!view.server.basic_information.appliance_name.fill(new_server_name)) {
    throw new ()
  };

  if (!view.server.save.is_enabled) throw new ();
  view.server.save.click();
  if (appliance.server.name != new_server_name) throw new ();

  view.flash.assert_success_message("Configuration settings saved for {} Server \"{} [{}]\" in Zone \"{}\"".format(
    appliance.product_name,
    appliance.server.name,
    appliance.server.sid,
    appliance.server.zone.name
  ));

  view = navigate_to(appliance.server, "Dashboard");
  view.browser.refresh();

  if (new_server_name != about.get_detail(
    about.SERVER,
    {server: appliance.server}
  )) throw "Server name in About section does not match the new name"
}
