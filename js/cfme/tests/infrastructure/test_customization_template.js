require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/pxe");
include(Cfme.Infrastructure.Pxe);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytestmark = [test_requirements.provision, pytest.mark.tier(3)];

function collection(appliance) {
  return appliance.collections.customization_templates
};

function image_type(appliance) {
  let image_type = appliance.collections.system_image_types.create({
    name: fauxfactory.gen_alphanumeric(8),
    provision_type: SystemImageType.VM_OR_INSTANCE
  });

  yield(image_type);
  image_type.delete()
};

function test_customization_template_crud(collection, script_type, image_type) {
  // Basic CRUD test for customization templates.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: WebUI
  //       initialEstimate: 1/15h
  //   
  let template_crud = collection.create({
    name: fauxfactory.gen_alphanumeric(15, script_type),
    description: fauxfactory.gen_alphanumeric(16),
    image_type: image_type.name,
    script_type,
    script_data: "Testing the script"
  });

  update(
    template_crud,
    () => template_crud.name = `${template_crud.name}_update`
  );

  collection.delete(false, template_crud)
};

function test_name_required_error_validation_cust_template(collection) {
  // Test to validate name in customization templates.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  pytest.raises(Exception, {match: "Name is required"}, () => (
    collection.create({
      name: null,
      description: fauxfactory.gen_alphanumeric(16),
      image_type: "RHEL-6",
      script_type: "Kickstart",
      script_data: "Testing the script"
    })
  ))
};

function test_type_required_error_validation(collection) {
  // Test to validate type in customization templates.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  pytest.raises(Exception, {match: "Type is required"}, () => (
    collection.create({
      name: fauxfactory.gen_alphanumeric(8),
      description: fauxfactory.gen_alphanumeric(16),
      image_type: "RHEL-6",
      script_type: null,
      script_data: "Testing the script"
    })
  ))
};

function test_pxe_image_type_required_error_validation(collection) {
  // Test to validate pxe image type in customization templates.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       upstream: yes
  //   
  pytest.raises(
    Exception,
    {match: "Pxe_image_type can't be blank"},

    () => (
      collection.create({
        name: fauxfactory.gen_alphanumeric(8),
        description: fauxfactory.gen_alphanumeric(16),
        image_type: null,
        script_type: "Kickstart",
        script_data: "Testing the script"
      })
    )
  )
};

function test_cust_template_duplicate_name_error_validation(collection) {
  // Test to validate duplication in customization templates.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let name = fauxfactory.gen_alphanumeric(8);
  let description = fauxfactory.gen_alphanumeric(16);

  let template_name = collection.create({
    name,
    description,
    image_type: "RHEL-6",
    script_type: "Kickstart",
    script_data: "Testing the script"
  });

  pytest.raises(
    Exception,
    {match: "Name has already been taken"},

    () => (
      collection.create({
        name,
        description,
        image_type: "RHEL-6",
        script_type: "Kickstart",
        script_data: "Testing the script"
      })
    )
  );

  collection.delete(false, template_name)
};

function test_name_max_character_validation(collection) {
  // Test to validate name with maximum characters in customization templates.
  //      Max length is controlled by UI elements - we are not allowed to input more than we should
  //      Opens template details to verify that extra symbols were cut
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let template_name = collection.create({
    name: fauxfactory.gen_alphanumeric(256),
    description: fauxfactory.gen_alphanumeric(16),
    image_type: "RHEL-6",
    script_type: "Kickstart",
    script_data: "Testing the script"
  });

  template_name.name = template_name.name[_.range(0, 255)];
  let view = navigate_to(template_name, "Details");

  if (view.entities.basic_information.get_text_of("Name").size >= 256) {
    throw new ()
  };

  collection.delete(false, template_name)
};

function test_customization_template_copy(collection) {
  // 
  //   Test to check the copy operation of customization templates.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/15h
  //   
  let template_crud = collection.create({
    name: fauxfactory.gen_alphanumeric(8),
    description: fauxfactory.gen_alphanumeric(16),
    image_type: "RHEL-6",
    script_type: "Kickstart",
    script_data: "Testing the script"
  });

  let copy_template_crud = template_crud.copy();
  collection.delete(false, template_crud, copy_template_crud)
}
