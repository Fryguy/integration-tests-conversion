require_relative 'timeit'
include Timeit
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/ui'
include Cfme::Base::Ui
require_relative 'cfme/services/myservice'
include Cfme::Services::Myservice
require_relative 'cfme/tests/test_db_migrate'
include Cfme::Tests::Test_db_migrate
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
def appliance_with_performance_db(temp_appliance_extended_db)
  app = temp_appliance_extended_db
  begin
    db_backups = cfme_data["db_backups"]
    performance_db = db_backups["performance_510"]
  rescue KeyError => e
    pytest.skip("Couldn't find the performance DB in the cfme_data: #{e}")
  end
  download_and_migrate_db(app, performance_db.url)
  yield(app)
end
def test_services_performance(appliance_with_performance_db)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  # 
  #   Bugzilla:
  #       1688937
  #       1686433
  #   
  app = appliance_with_performance_db
  raise unless 50000 == app.rest_api.collections.services.count
  my_service = MyService(app)
  raise unless Timeit::timeit(lambda{|| navigate_to(my_service, "All", use_resetter: false)}, number: 1) < 180
end
