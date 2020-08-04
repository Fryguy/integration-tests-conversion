require_relative("timeit");
include(Timeit);
require_relative("cfme");
include(Cfme);
require_relative("cfme/base/ui");
include(Cfme.Base.Ui);
require_relative("cfme/services/myservice");
include(Cfme.Services.Myservice);
require_relative("cfme/tests/test_db_migrate");
include(Cfme.Tests.Test_db_migrate);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);

function appliance_with_performance_db(temp_appliance_extended_db) {
  let app = temp_appliance_extended_db;

  try {
    let db_backups = cfme_data.db_backups;
    let performance_db = db_backups.performance_510
  } catch (e) {
    if (e instanceof KeyError) {
      pytest.skip(`Couldn't find the performance DB in the cfme_data: ${e}`)
    } else {
      throw e
    }
  };

  download_and_migrate_db(app, performance_db.url);
  yield(app)
};

function test_services_performance(appliance_with_performance_db) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  // 
  //   Bugzilla:
  //       1688937
  //       1686433
  //   
  let app = appliance_with_performance_db;
  if (50000 != app.rest_api.collections.services.count) throw new ();
  let my_service = MyService(app);

  if (Timeit.timeit(
    () => navigate_to(my_service, "All", {use_resetter: false}),
    {number: 1}
  ) >= 180) throw new ()
}
