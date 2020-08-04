require_relative("cfme");
include(Cfme);
require_relative("cfme/generic_objects/instance/ui");
include(Cfme.Generic_objects.Instance.Ui);
require_relative("cfme/services/myservice");
include(Cfme.Services.Myservice);
require_relative("cfme/services/myservice/ui");
include(Cfme.Services.Myservice.Ui);
require_relative("cfme/tests/automate/custom_button");
include(Cfme.Tests.Automate.Custom_button);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.generic_objects];

function categories(request, appliance) {
  return rest_gen_data.categories(request, appliance, 3)
};

function tags(request, appliance, categories) {
  return rest_gen_data.tags(request, appliance, categories)
};

function button_with_dialog(appliance, generic_object, dialog) {
  let generic_definition = generic_object.definition;

  appliance.context.use(ViaUI, () => {
    let button = generic_definition.collections.generic_object_buttons.create({
      name: fauxfactory.gen_alpha({start: "btn_"}),
      description: fauxfactory.gen_alpha(15, {start: "btn_desc_"}),
      request: "call_instance",
      image: "ff ff-network-interface",
      dialog: dialog.label
    });

    yield(button);
    button.delete_if_exists()
  })
};

function test_generic_objects_crud(appliance, context, request) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       tags: 5.9
  //       casecomponent: GenericObjects
  //   
  appliance.context.use(context, () => {
    let definition = appliance.collections.generic_object_definitions.create({
      name: fauxfactory.gen_alphanumeric(
        25,
        {start: "rest_generic_class_"}
      ),

      description: "Generic Object Definition",
      attributes: {addr01: "string"},
      associations: {services: "Service"}
    });

    if (!definition.exists) throw new ();
    request.addfinalizer(definition.delete)
  });

  appliance.context.use(ViaREST, () => {
    let myservices = [];

    for (let _ in (2).times) {
      let service_name = fauxfactory.gen_alphanumeric(
        15,
        {start: "rest_serv_"}
      );

      let rest_service = appliance.rest_api.collections.services.action.create({
        name: service_name,
        display: true
      });

      rest_service = rest_service[0];
      request.addfinalizer(rest_service.action.delete);
      myservices.push(MyService(appliance, {name: service_name}))
    };

    let instance = appliance.collections.generic_objects.create({
      name: fauxfactory.gen_alphanumeric(
        26,
        {start: "rest_generic_instance_"}
      ),

      definition: definition,
      attributes: {addr01: "Test Address"},
      associations: {services: [myservices[0]]}
    });

    request.addfinalizer(instance.delete)
  });

  appliance.context.use(context, () => {
    if (context.name == "UI") appliance.browser.widgetastic.refresh();
    if (!instance.exists) throw new ()
  });

  appliance.context.use(ViaREST, () => {
    update(instance, () => {
      instance.attributes = {addr01: "Changed"};
      instance.associations = {services: myservices}
    });

    let rest_instance = appliance.rest_api.collections.generic_objects.get({name: instance.name});
    let rest_data = appliance.rest_api.get(`${rest_instance.href}?associations=services`);
    if (rest_data.services.size != 2) throw new ();
    if (rest_data.property_attributes.addr01 != "Changed") throw new ();
    instance.delete()
  });

  appliance.context.use(context, () => {
    if (!!instance.exists) throw new ()
  })
};

function test_generic_objects_tag_ui(appliance, generic_object, tag_place) {
  // Tests assigning and unassigning tags using UI.
  // 
  //       Metadata:
  //           test_flag: ui
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: GenericObjects
  //   
  appliance.context.use(ViaUI, () => {
    let assigned_tag = generic_object.add_tag({details: tag_place});
    generic_object.remove_tag(assigned_tag, {details: tag_place})
  })
};

function test_generic_objects_tag_rest(appliance, generic_object, tags) {
  // Tests assigning and unassigning tags using REST.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       initialEstimate: 1/4h
  //       assignee: tpapaioa
  //       casecomponent: Tagging
  //       caseimportance: high
  //   
  let tag = tags[0];

  appliance.context.use(ViaREST, () => {
    generic_object.add_tag(tag);
    let tag_available = generic_object.get_tags();

    if (!tag_available.map(t => t.id).include(tag.id)) {
      throw "Assigned tag was not found"
    };

    generic_object.remove_tag(tag);
    tag_available = generic_object.get_tags();
    if (!!tag_available.map(t => t.id).include(tag.id)) throw new ()
  })
};

function test_generic_object_with_service_button(appliance, generic_object, button_with_dialog) {
  // 
  //   Bugzilla:
  //       1729341
  //       1743266
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/6h
  //       caseimportance: high
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: GenericObjects
  //   
  let myservice = MyService(
    appliance,
    {name: generic_object.associations.get("services")[0].name}
  );

  appliance.context.use(
    ViaREST,
    () => myservice.add_resource_generic_object(generic_object)
  );

  let view = navigate_to(generic_object, "MyServiceDetails");
  view.toolbar.button(button_with_dialog.name).custom_button.click();
  view = generic_object.create_view(TextInputDialogView, {wait: 10});
  view.service_name.fill("Custom Button Execute");
  wait_for(() => !view.submit.disabled, {timeout: "10s"});
  view.submit.click();

  try {
    generic_object.create_view(
      MyServiceGenericObjectInstanceView,
      {wait: 10}
    )
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      pytest.fail("Could not wait for service's generic object view to displayed.")
    } else {
      throw $EXCEPTION
    }
  }
};

function test_generic_object_on_service_breadcrumb(appliance, generic_object) {
  // 
  //   Bugzilla:
  //       1741050
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/6h
  //       casecomponent: GenericObjects
  //       testSteps:
  //           1. Generate a service viewable under My Services
  //           2. Create Generic Object Class & Instance
  //           3. Assign the generic object instance to the service
  //           4. Navigate to the service
  //           5. Click on the generic object instances
  //           6. Check the breadcrumb link
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4.
  //           5.
  //           6. Breadcrumb should work properly
  //   
  let myservice = MyService(
    appliance,
    {name: generic_object.associations.get("services")[0].name}
  );

  appliance.context.use(
    ViaREST,
    () => myservice.add_resource_generic_object(generic_object)
  );

  appliance.context.use(ViaUI, () => {
    let view = navigate_to(generic_object, "MyServiceDetails");
    view.breadcrumb.click_location(myservice.name);
    if (!!view.is_displayed) throw new ();
    view = myservice.create_view(MyServicesView);
    if (!view.is_displayed) throw new ()
  })
}
