require_relative 'cfme'
include Cfme
require_relative 'cfme/base/ui'
include Cfme::Base::Ui
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [test_requirements.configuration]
NAME_LEN = 5
DESC_LEN = 8
def cancel_zone_add(appliance)
  # Finalizer method that clicks Cancel for tests that expect zone creation to fail.
  #   This avoids logging of UnexpectedAlertPresentException for the 'Abandon changes?' alert
  #   when the next test tries to navigate elsewhere in the UI.
  view = appliance.browser.create_view(ZoneAddView)
  if is_bool(view.is_displayed)
    view.cancel_button.click()
  end
end
def create_zone(appliance, name, desc)
  # Create zone with the given name and description.
  # 
  #   Returns: :py:class:`cfme.base.Zone` object
  #   
  zc = appliance.collections.zones
  region = appliance.server.zone.region
  zc.create(name: name, description: desc)
  zc.filters = {"parent" => region}
  zones = zc.all()
  new_zone = nil
  __dummy0__ = false
  for zone in zones
    if is_bool(zone.name == name && zone.description == desc)
      new_zone = zone
      break
    end
    if zone == zones[-1]
      __dummy0__ = true
    end
  end
  if __dummy0__
    pytest.fail("Zone with name #{name} and description #{desc} not found in the collection.")
  end
  return new_zone
end
def test_zone_crud(appliance)
  # 
  #   Bugzilla:
  #       1216224
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       caseimportance: low
  #       initialEstimate: 1/15h
  #       casecomponent: WebUI
  #   
  name = fauxfactory.gen_string("alphanumeric", NAME_LEN)
  desc = fauxfactory.gen_string("alphanumeric", DESC_LEN)
  zone = create_zone(appliance, name, desc)
  raise "Zone could not be created with name #{name} and description #{desc}." unless zone.exists
  new_desc = "#{zone.description}_updated"
  update(zone) {
    zone.description = new_desc
  }
  begin
    navigate_to(zone, "Zone")
  rescue ItemNotFound
    pytest.fail("Zone description could not be updated. Expected: #{new_desc}. Current: #{zone.description}.")
  end
  zone.delete()
  raise "Zone #{zone.description} could not be deleted." unless !zone.exists
end
def test_zone_add_cancel_validation(appliance)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/20h
  #   
  name = fauxfactory.gen_string("alphanumeric", NAME_LEN)
  desc = fauxfactory.gen_string("alphanumeric", DESC_LEN)
  appliance.collections.zones.create(name: name, description: desc, cancel: true)
end
def test_zone_change_appliance_zone(request, appliance)
  # Test that an appliance can be assigned to another zone.
  #   Bugzilla:
  #       1216224
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/15h
  #   
  name = fauxfactory.gen_string("alphanumeric", NAME_LEN)
  desc = fauxfactory.gen_string("alphanumeric", DESC_LEN)
  zone = create_zone(appliance, name, desc)
  request.addfinalizer(zone.delete)
  server_settings = appliance.server.settings
  request.addfinalizer(lambda{|| server_settings.update_basic_information({"appliance_zone" => "default"})})
  server_settings.update_basic_information({"appliance_zone" => zone.name})
  raise unless zone.description == appliance.server.zone.description
end
def test_zone_add_duplicate(request, appliance)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #   
  name = fauxfactory.gen_string("alphanumeric", NAME_LEN)
  desc = fauxfactory.gen_string("alphanumeric", DESC_LEN)
  zone = create_zone(appliance, name, desc)
  raise "Zone could not be created with name #{name} and description #{desc}." unless zone.exists
  request.addfinalizer(zone.delete)
  request.addfinalizer(lambda{|| cancel_zone_add(appliance)})
  pytest.raises(Exception, match: "Name is not unique within region #{appliance.server.zone.region.number}") {
    create_zone(appliance, name, desc)
  }
end
def test_zone_add_maxlength(request, appliance)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #   
  name = fauxfactory.gen_string("alphanumeric", 50)
  desc = fauxfactory.gen_string("alphanumeric", 50)
  zone = create_zone(appliance, name, desc)
  request.addfinalizer(zone.delete)
  raise "Zone does not exist." unless zone.exists
end
def test_zone_add_punctuation(request, appliance)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #   
  name = fauxfactory.gen_string("punctuation", NAME_LEN)
  desc = fauxfactory.gen_string("punctuation", DESC_LEN)
  zone = create_zone(appliance, name, desc)
  request.addfinalizer(zone.delete)
  raise "Zone does not exist." unless zone.exists
end
def test_zone_add_whitespace(request, appliance)
  # When creating a new zone, the name can have whitespace, including leading and trailing
  #   characters. After saving, the whitespace should be displayed correctly in the web UI.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Appliance
  #       caseimportance: medium
  #       initialEstimate: 1/30h
  #   
  name = "    " + fauxfactory.gen_string("alphanumeric", 5)
  desc = "    " + fauxfactory.gen_string("alphanumeric", 8)
  zone = create_zone(appliance, name, desc)
  request.addfinalizer(zone.delete)
  raise "Zone with name #{name} and description #{desc}could not be found in the UI." unless zone.exists
end
def test_zone_add_blank_name(request, appliance)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       caseposneg: negative
  #       initialEstimate: 1/8h
  #   
  name = ""
  desc = fauxfactory.gen_string("alphanumeric", DESC_LEN)
  request.addfinalizer(lambda{|| cancel_zone_add(appliance)})
  pytest.raises(Exception, match: "Name can't be blank") {
    create_zone(appliance, name, desc)
  }
end
def test_zone_add_blank_description(request, appliance)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       caseposneg: negative
  #       initialEstimate: 1/8h
  #   
  name = fauxfactory.gen_string("alphanumeric", NAME_LEN)
  desc = ""
  request.addfinalizer(lambda{|| cancel_zone_add(appliance)})
  pytest.raises(Exception, match: "(Description can't be blank|Description is required)") {
    create_zone(appliance, name, desc)
  }
end
def test_add_zone_windows_domain_credentials(request, appliance)
  # 
  #   Testing Windows Domain credentials add
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: WebUI
  #   
  zone = appliance.collections.zones.all()[0]
  values = {"username" => "userid", "password" => "password", "verify" => "password"}
  zone.update(values)
  _cleanup = lambda do
    values = {"username" => "", "password" => "", "verify" => ""}
    zone.update(values)
  end
  request.addfinalizer(method(:_cleanup))
  view = navigate_to(zone, "Edit")
  username = view.username.read()
  raise "Current username is #{username}" unless username == values["username"]
end
def test_remove_zone_windows_domain_credentials(appliance)
  # 
  #   Testing Windows Domain credentials removal
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: WebUI
  #   
  zone = appliance.collections.zones.all()[0]
  values = {"username" => "userid", "password" => "password", "verify" => "password"}
  zone.update(values)
  view = navigate_to(zone, "Edit")
  username = view.username.read()
  raise "Username wasn't updated" unless username == values["username"]
  values = {"username" => "", "password" => "", "verify" => ""}
  zone.update(values)
  view = navigate_to(zone, "Edit")
  username = view.username.read()
  raise "Username wasn't removed" unless username == values["username"]
end
