require_relative 'cfme'
include Cfme
require_relative 'cfme/configure'
include Cfme::Configure
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.general_ui]
def test_server_name(request, appliance)
  # Tests that changing the server name updates the about page
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Configuration
  #       caseimportance: low
  #       initialEstimate: 1/15h
  #   
  view = navigate_to(appliance.server, "Details")
  old_server_name = view.server.basic_information.appliance_name.read()
  raise unless old_server_name != ""
  _ensure_name_reset = lambda do
    appliance.rename(old_server_name)
  end
  new_server_name = fauxfactory.gen_alpha(length: 20)
  raise unless view.server.basic_information.appliance_name.fill(new_server_name)
  raise unless view.server.save.is_enabled
  view.server.save.click()
  raise unless appliance.server.name == new_server_name
  view.flash.assert_success_message("Configuration settings saved for {} Server \"{} [{}]\" in Zone \"{}\"".format(appliance.product_name, appliance.server.name, appliance.server.sid, appliance.server.zone.name))
  view = navigate_to(appliance.server, "Dashboard")
  view.browser.refresh()
  raise "Server name in About section does not match the new name" unless new_server_name == about.get_detail(about.SERVER, server: appliance.server)
end
