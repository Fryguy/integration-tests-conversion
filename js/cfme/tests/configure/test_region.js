require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

function test_empty_region_description(appliance) {
  // Test changing region description to empty field
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Configuration
  //   
  let view = navigate_to(
    appliance.server.zone.region,
    "ChangeRegionName"
  );

  view.region_description.fill("");
  view.save.click();
  view.flash.assert_message("Region description is required");
  view.cancel.click()
};

function test_description_change(appliance, request) {
  // Test changing region description
  // 
  //   Bugzilla:
  //       1350808
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Configuration
  //       caseimportance: medium
  //       initialEstimate: 1/20h
  //       testSteps:
  //           1. Go to Settings
  //           -> Configure -> Settings
  //           2. Details -> Region
  //           3. Change region description
  //           4. Check whether description was changed
  //   
  let view = navigate_to(
    appliance.server.zone.region,
    "ChangeRegionName"
  );

  let _reset_region_description = (description, view) => {
    view.details.table.row().click();
    view.region_description.fill(description);
    return view.save.click()
  };

  let region_description = fauxfactory.gen_alphanumeric(5);
  let old_description = view.region_description.read();

  request.addfinalizer(() => (
    _reset_region_description.call(old_description, view)
  ));

  view.region_description.fill(region_description);
  view.save.click();
  view.flash.assert_message(`Region \"${region_description}\" was saved`);
  view.redhat_updates.click();
  let reg = (appliance.version < "5.10" ? "Settings Region" : "CFME Region");

  let expected_title = "{reg} \"{des} [{num}]\"".format({
    reg,
    des: region_description,
    num: appliance.server.zone.region.number
  });

  if (view.title.text != expected_title) throw new ()
}
