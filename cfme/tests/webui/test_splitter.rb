require_relative 'xml/sax/saxutils'
include Xml::Sax::Saxutils
require_relative 'xml/sax/saxutils'
include Xml::Sax::Saxutils
require_relative 'wait_for'
include Wait_for
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/ui'
include Cfme::Base::Ui
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/infrastructure/networking'
include Cfme::Infrastructure::Networking
require_relative 'cfme/modeling/base'
include Cfme::Modeling::Base
require_relative 'cfme/optimize/utilization'
include Cfme::Optimize::Utilization
require_relative 'cfme/services/myservice'
include Cfme::Services::Myservice
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'widgetastic_manageiq'
include Widgetastic_manageiq
LOCATIONS = [[Server, "ControlExplorer"], [Server, "AutomateExplorer"], [Server, "AutomateCustomization"], [MyService, "All"], [Server, "ServiceCatalogsDefault"], [Server, "Configuration"], [UtilizationCollection, "All"], [InfraSwitchesCollection, "All"]]
pytestmark = [pytest.mark.parametrize("model_object,destination", LOCATIONS), test_requirements.general_ui]
def test_pull_splitter_persistence(request, appliance, model_object, destination)
  # 
  #   Polarion:
  #       assignee: pvala
  #       caseimportance: low
  #       casecomponent: WebUI
  #       initialEstimate: 1/20h
  # 
  #   Bugzilla:
  #       1380443
  #   
  splitter = Splitter(parent: appliance.browser.widgetastic)
  request.addfinalizer(splitter.reset)
  if model_object == Server
    model_object = appliance.server
  else
    if is_bool(issubclass(model_object, BaseCollection))
      model_object = model_object.(appliance)
    end
  end
  navigate_to(model_object, destination)
  splitter.pull_left()
  splitter.pull_left()
  navigate_to(appliance.server, "Dashboard")
  begin
    navigate_to(model_object, destination)
  rescue [ArgumentError, CannotScrollException, TimedOutError]
    # pass
  end
  selenium = appliance.browser.widgetastic.selenium
  if is_bool(!selenium.find_element_by_xpath("//div[@id='left_div'][contains(@class, 'hidden-md')]"))
    pytest.fail("Splitter did not persist when on hidden position!")
  end
  for position in ["col-md-2", "col-md-3", "col-md-4", "col-md-5"]
    splitter.pull_right()
    navigate_to(appliance.server, "Dashboard")
    navigate_to(model_object, destination)
    if is_bool(!selenium.find_element_by_xpath(("//div[@id='left_div'][contains(@class, {})]").format(unescape(quoteattr(position)))))
      pytest.fail()
    end
  end
end
