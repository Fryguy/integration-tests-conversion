require_relative("cfme");
include(Cfme);
require_relative("cfme/base/ui");
include(Cfme.Base.Ui);
require_relative("cfme/exceptions");
include(Cfme.Exceptions);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytestmark = [test_requirements.configuration];
const NAME_LEN = 5;
const DESC_LEN = 8;

function cancel_zone_add(appliance) {
  // Finalizer method that clicks Cancel for tests that expect zone creation to fail.
  //   This avoids logging of UnexpectedAlertPresentException for the 'Abandon changes?' alert
  //   when the next test tries to navigate elsewhere in the UI.
  let view = appliance.browser.create_view(ZoneAddView);
  if (is_bool(view.is_displayed)) view.cancel_button.click()
};

function create_zone(appliance, name, desc) {
  // Create zone with the given name and description.
  // 
  //   Returns: :py:class:`cfme.base.Zone` object
  //   
  let zc = appliance.collections.zones;
  let region = appliance.server.zone.region;
  zc.create({name, description: desc});
  zc.filters = {parent: region};
  let zones = zc.all();
  let new_zone = null;
  let __dummy0__ = false;

  for (let zone in zones) {
    if (is_bool(zone.name == name && zone.description == desc)) {
      new_zone = zone;
      break
    };

    if (zone == zones[-1]) __dummy0__ = true
  };

  if (__dummy0__) {
    pytest.fail(`Zone with name ${name} and description ${desc} not found in the collection.`)
  };

  return new_zone
};

function test_zone_crud(appliance) {
  // 
  //   Bugzilla:
  //       1216224
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //       casecomponent: WebUI
  //   
  let name = fauxfactory.gen_string("alphanumeric", NAME_LEN);
  let desc = fauxfactory.gen_string("alphanumeric", DESC_LEN);
  let zone = create_zone(appliance, name, desc);

  if (!zone.exists) {
    throw `Zone could not be created with name ${name} and description ${desc}.`
  };

  let new_desc = `${zone.description}_updated`;
  update(zone, () => zone.description = new_desc);

  try {
    navigate_to(zone, "Zone")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof ItemNotFound) {
      pytest.fail(`Zone description could not be updated. Expected: ${new_desc}. Current: ${zone.description}.`)
    } else {
      throw $EXCEPTION
    }
  };

  zone.delete();
  if (!!zone.exists) throw `Zone ${zone.description} could not be deleted.`
};

function test_zone_add_cancel_validation(appliance) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: WebUI
  //       caseimportance: low
  //       initialEstimate: 1/20h
  //   
  let name = fauxfactory.gen_string("alphanumeric", NAME_LEN);
  let desc = fauxfactory.gen_string("alphanumeric", DESC_LEN);

  appliance.collections.zones.create({
    name,
    description: desc,
    cancel: true
  })
};

function test_zone_change_appliance_zone(request, appliance) {
  // Test that an appliance can be assigned to another zone.
  //   Bugzilla:
  //       1216224
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: WebUI
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //   
  let name = fauxfactory.gen_string("alphanumeric", NAME_LEN);
  let desc = fauxfactory.gen_string("alphanumeric", DESC_LEN);
  let zone = create_zone(appliance, name, desc);
  request.addfinalizer(zone.delete);
  let server_settings = appliance.server.settings;

  request.addfinalizer(() => (
    server_settings.update_basic_information({appliance_zone: "default"})
  ));

  server_settings.update_basic_information({appliance_zone: zone.name});
  if (zone.description != appliance.server.zone.description) throw new ()
};

function test_zone_add_duplicate(request, appliance) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: WebUI
  //       caseimportance: low
  //       initialEstimate: 1/4h
  //   
  let name = fauxfactory.gen_string("alphanumeric", NAME_LEN);
  let desc = fauxfactory.gen_string("alphanumeric", DESC_LEN);
  let zone = create_zone(appliance, name, desc);

  if (!zone.exists) {
    throw `Zone could not be created with name ${name} and description ${desc}.`
  };

  request.addfinalizer(zone.delete);
  request.addfinalizer(() => cancel_zone_add(appliance));

  pytest.raises(
    Exception,
    {match: `Name is not unique within region ${appliance.server.zone.region.number}`},
    () => create_zone(appliance, name, desc)
  )
};

function test_zone_add_maxlength(request, appliance) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: WebUI
  //       caseimportance: low
  //       initialEstimate: 1/4h
  //   
  let name = fauxfactory.gen_string("alphanumeric", 50);
  let desc = fauxfactory.gen_string("alphanumeric", 50);
  let zone = create_zone(appliance, name, desc);
  request.addfinalizer(zone.delete);
  if (!zone.exists) throw "Zone does not exist."
};

function test_zone_add_punctuation(request, appliance) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: WebUI
  //       caseimportance: low
  //       initialEstimate: 1/4h
  //   
  let name = fauxfactory.gen_string("punctuation", NAME_LEN);
  let desc = fauxfactory.gen_string("punctuation", DESC_LEN);
  let zone = create_zone(appliance, name, desc);
  request.addfinalizer(zone.delete);
  if (!zone.exists) throw "Zone does not exist."
};

function test_zone_add_whitespace(request, appliance) {
  // When creating a new zone, the name can have whitespace, including leading and trailing
  //   characters. After saving, the whitespace should be displayed correctly in the web UI.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: Appliance
  //       caseimportance: medium
  //       initialEstimate: 1/30h
  //   
  let name = "    " + fauxfactory.gen_string("alphanumeric", 5);
  let desc = "    " + fauxfactory.gen_string("alphanumeric", 8);
  let zone = create_zone(appliance, name, desc);
  request.addfinalizer(zone.delete);

  if (!zone.exists) {
    throw `Zone with name ${name} and description ${desc}could not be found in the UI.`
  }
};

function test_zone_add_blank_name(request, appliance) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/8h
  //   
  let name = "";
  let desc = fauxfactory.gen_string("alphanumeric", DESC_LEN);
  request.addfinalizer(() => cancel_zone_add(appliance));

  pytest.raises(
    Exception,
    {match: "Name can't be blank"},
    () => create_zone(appliance, name, desc)
  )
};

function test_zone_add_blank_description(request, appliance) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/8h
  //   
  let name = fauxfactory.gen_string("alphanumeric", NAME_LEN);
  let desc = "";
  request.addfinalizer(() => cancel_zone_add(appliance));

  pytest.raises(
    Exception,
    {match: "(Description can't be blank|Description is required)"},
    () => create_zone(appliance, name, desc)
  )
};

function test_add_zone_windows_domain_credentials(request, appliance) {
  // 
  //   Testing Windows Domain credentials add
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let zone = appliance.collections.zones.all()[0];

  let values = {
    username: "userid",
    password: "password",
    verify: "password"
  };

  zone.update(values);

  let _cleanup = () => {
    values = {username: "", password: "", verify: ""};
    return zone.update(values)
  };

  request.addfinalizer(method("_cleanup"));
  let view = navigate_to(zone, "Edit");
  let username = view.username.read();
  if (username != values.username) throw `Current username is ${username}`
};

function test_remove_zone_windows_domain_credentials(appliance) {
  // 
  //   Testing Windows Domain credentials removal
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let zone = appliance.collections.zones.all()[0];

  let values = {
    username: "userid",
    password: "password",
    verify: "password"
  };

  zone.update(values);
  let view = navigate_to(zone, "Edit");
  let username = view.username.read();
  if (username != values.username) throw "Username wasn't updated";
  values = {username: "", password: "", verify: ""};
  zone.update(values);
  view = navigate_to(zone, "Edit");
  username = view.username.read();
  if (username != values.username) throw "Username wasn't removed"
}
