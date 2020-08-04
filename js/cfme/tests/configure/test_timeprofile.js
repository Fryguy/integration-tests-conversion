require_relative("cfme");
include(Cfme);
require_relative("cfme/configure/settings");
include(Cfme.Configure.Settings);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytestmark = [pytest.mark.tier(3), test_requirements.settings];

function test_time_profile_crud(appliance) {
  // 
  //       This test case performs the CRUD operation.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: high
  //       initialEstimate: 1/8h
  //       tags: settings
  //   
  let collection = appliance.collections.time_profiles;

  let time_profile = collection.create({
    description: fauxfactory.gen_alphanumeric(
      15,
      {start: "time_profile"}
    ),

    scope: "Current User",
    days: true,
    hours: true,
    timezone: "(GMT-10:00) Hawaii"
  });

  update(time_profile, () => time_profile.scope = "All Users");
  collection.delete(false, time_profile)
};

function test_time_profile_name_max_character_validation(appliance) {
  // 
  //   This test case performs the check for max character validation.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       tags: settings
  //   
  let collection = appliance.collections.time_profiles;

  let time_profile = collection.create({
    description: fauxfactory.gen_alphanumeric(50),
    scope: "Current User",
    days: true,
    hours: true,
    timezone: "(GMT-10:00) Hawaii"
  });

  collection.delete(false, time_profile)
};

function test_days_required_error_validation(appliance, soft_assert) {
  // 
  //   This test case performs the error validation of days field.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //   
  let collection = appliance.collections.time_profiles;

  let time_profile = collection.instantiate({
    description: "UTC",
    scope: "Current User",
    days: true,
    hours: true
  });

  update(time_profile, () => time_profile.days = false);
  let view = appliance.browser.create_view(TimeProfileEditView);
  soft_assert.call(view.form.help_block.text == "At least one day needs to be selected");
  soft_assert.call(view.form.save.disabled);
  view.form.cancel.click()
};

function test_hours_required_error_validation(appliance, soft_assert) {
  // 
  //   This test case performs the error validation of hours field.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: low
  //       initialEstimate: 1/30h
  //   
  let collection = appliance.collections.time_profiles;

  let time_profile = collection.instantiate({
    description: "UTC",
    scope: "Current User",
    days: true,
    hours: true
  });

  update(time_profile, () => time_profile.hours = false);
  let view = appliance.browser.create_view(TimeProfileEditView);
  soft_assert.call(view.form.help_block.text == "At least one hour needs to be selected");
  soft_assert.call(view.form.save.disabled);
  view.form.cancel.click()
};

function test_time_profile_description_required_error_validation(appliance, soft_assert) {
  // 
  //   This test case performs the error validation of description field.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       tags: settings
  //   
  let collection = appliance.collections.time_profiles;

  let time_profile = collection.instantiate({
    description: "UTC",
    scope: "Current User",
    days: true,
    hours: true
  });

  update(time_profile, () => time_profile.description = "");
  let view = appliance.browser.create_view(TimeProfileEditView);
  soft_assert.call(view.form.description.help_block == "Required");
  soft_assert.call(view.form.save.disabled);
  view.form.cancel.click()
};

function test_time_profile_copy(appliance) {
  // 
  //   This test case checks the copy operation of the time_profile.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       tags: settings
  //   
  let collection = appliance.collections.time_profiles;

  let time_profile = collection.create({
    description: fauxfactory.gen_alphanumeric(
      20,
      {start: "time_profile_"}
    ),

    scope: "Current User",
    days: true,
    hours: true,
    timezone: "(GMT-10:00) Hawaii"
  });

  let copied_time_profile = time_profile.copy({description: `check_copy${time_profile.description}`});
  collection.delete(false, time_profile, copied_time_profile)
}
