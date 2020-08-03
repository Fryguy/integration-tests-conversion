require_relative 'cfme'
include Cfme
require_relative 'cfme/generic_objects/instance/ui'
include Cfme::Generic_objects::Instance::Ui
require_relative 'cfme/services/myservice'
include Cfme::Services::Myservice
require_relative 'cfme/services/myservice/ui'
include Cfme::Services::Myservice::Ui
require_relative 'cfme/tests/automate/custom_button'
include Cfme::Tests::Automate::Custom_button
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance'
include Cfme::Utils::Appliance
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.generic_objects]
def categories(request, appliance)
  return rest_gen_data.categories(request, appliance, 3)
end
def tags(request, appliance, categories)
  return rest_gen_data.tags(request, appliance, categories)
end
def button_with_dialog(appliance, generic_object, dialog)
  generic_definition = generic_object.definition
  appliance.context.use(ViaUI) {
    button = generic_definition.collections.generic_object_buttons.create(name: fauxfactory.gen_alpha(start: "btn_"), description: fauxfactory.gen_alpha(15, start: "btn_desc_"), request: "call_instance", image: "ff ff-network-interface", dialog: dialog.label)
    yield(button)
    button.delete_if_exists()
  }
end
def test_generic_objects_crud(appliance, context, request)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       tags: 5.9
  #       casecomponent: GenericObjects
  #   
  appliance.context.use(context) {
    definition = appliance.collections.generic_object_definitions.create(name: fauxfactory.gen_alphanumeric(25, start: "rest_generic_class_"), description: "Generic Object Definition", attributes: {"addr01" => "string"}, associations: {"services" => "Service"})
    raise unless definition.exists
    request.addfinalizer(definition.delete)
  }
  appliance.context.use(ViaREST) {
    myservices = []
    for _ in 2.times
      service_name = fauxfactory.gen_alphanumeric(15, start: "rest_serv_")
      rest_service = appliance.rest_api.collections.services.action.create(name: service_name, display: true)
      rest_service = rest_service[0]
      request.addfinalizer(rest_service.action.delete)
      myservices.push(MyService(appliance, name: service_name))
    end
    instance = appliance.collections.generic_objects.create(name: fauxfactory.gen_alphanumeric(26, start: "rest_generic_instance_"), definition: definition, attributes: {"addr01" => "Test Address"}, associations: {"services" => [myservices[0]]})
    request.addfinalizer(instance.delete)
  }
  appliance.context.use(context) {
    if context.name == "UI"
      appliance.browser.widgetastic.refresh()
    end
    raise unless instance.exists
  }
  appliance.context.use(ViaREST) {
    update(instance) {
      instance.attributes = {"addr01" => "Changed"}
      instance.associations = {"services" => myservices}
    }
    rest_instance = appliance.rest_api.collections.generic_objects.get(name: instance.name)
    rest_data = appliance.rest_api.get("#{rest_instance.href}?associations=services")
    raise unless rest_data["services"].size == 2
    raise unless rest_data["property_attributes"]["addr01"] == "Changed"
    instance.delete()
  }
  appliance.context.use(context) {
    raise unless !instance.exists
  }
end
def test_generic_objects_tag_ui(appliance, generic_object, tag_place)
  # Tests assigning and unassigning tags using UI.
  # 
  #       Metadata:
  #           test_flag: ui
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: GenericObjects
  #   
  appliance.context.use(ViaUI) {
    assigned_tag = generic_object.add_tag(details: tag_place)
    generic_object.remove_tag(assigned_tag, details: tag_place)
  }
end
def test_generic_objects_tag_rest(appliance, generic_object, tags)
  # Tests assigning and unassigning tags using REST.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       initialEstimate: 1/4h
  #       assignee: tpapaioa
  #       casecomponent: Tagging
  #       caseimportance: high
  #   
  tag = tags[0]
  appliance.context.use(ViaREST) {
    generic_object.add_tag(tag)
    tag_available = generic_object.get_tags()
    raise "Assigned tag was not found" unless tag_available.map{|t| t.id}.include?(tag.id)
    generic_object.remove_tag(tag)
    tag_available = generic_object.get_tags()
    raise unless !tag_available.map{|t| t.id}.include?(tag.id)
  }
end
def test_generic_object_with_service_button(appliance, generic_object, button_with_dialog)
  # 
  #   Bugzilla:
  #       1729341
  #       1743266
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/6h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: GenericObjects
  #   
  myservice = MyService(appliance, name: generic_object.associations.get("services")[0].name)
  appliance.context.use(ViaREST) {
    myservice.add_resource_generic_object(generic_object)
  }
  view = navigate_to(generic_object, "MyServiceDetails")
  view.toolbar.button(button_with_dialog.name).custom_button.click()
  view = generic_object.create_view(TextInputDialogView, wait: 10)
  view.service_name.fill("Custom Button Execute")
  wait_for(lambda{|| !view.submit.disabled}, timeout: "10s")
  view.submit.click()
  begin
    generic_object.create_view(MyServiceGenericObjectInstanceView, wait: 10)
  rescue TimedOutError
    pytest.fail("Could not wait for service's generic object view to displayed.")
  end
end
def test_generic_object_on_service_breadcrumb(appliance, generic_object)
  # 
  #   Bugzilla:
  #       1741050
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/6h
  #       casecomponent: GenericObjects
  #       testSteps:
  #           1. Generate a service viewable under My Services
  #           2. Create Generic Object Class & Instance
  #           3. Assign the generic object instance to the service
  #           4. Navigate to the service
  #           5. Click on the generic object instances
  #           6. Check the breadcrumb link
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5.
  #           6. Breadcrumb should work properly
  #   
  myservice = MyService(appliance, name: generic_object.associations.get("services")[0].name)
  appliance.context.use(ViaREST) {
    myservice.add_resource_generic_object(generic_object)
  }
  appliance.context.use(ViaUI) {
    view = navigate_to(generic_object, "MyServiceDetails")
    view.breadcrumb.click_location(myservice.name)
    raise unless !view.is_displayed
    view = myservice.create_view(MyServicesView)
    raise unless view.is_displayed
  }
end
