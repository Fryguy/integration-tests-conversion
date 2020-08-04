require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/pxe");
include(Cfme.Infrastructure.Pxe);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytestmark = [test_requirements.general_ui, pytest.mark.tier(3)];

function test_system_image_type_crud(appliance) {
  // 
  //   Tests a System Image Type using CRUD operations.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: low
  //       initialEstimate: 1/10h
  //   
  let collection = appliance.collections.system_image_types;

  let sys_image_type = collection.create({
    name: fauxfactory.gen_alphanumeric(8),
    provision_type: SystemImageType.VM_OR_INSTANCE
  });

  update(
    sys_image_type,
    () => sys_image_type.name = sys_image_type.name + "_update"
  );

  sys_image_type.delete({cancel: false})
};

function test_system_image_duplicate_name_error_validation(appliance) {
  // 
  //   Tests a System Image for duplicate name.
  // 
  //   Polarion:
  //       assignee: pvala
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let collection = appliance.collections.system_image_types;
  let name = fauxfactory.gen_alphanumeric(8);

  let sys_image_type = collection.create({
    name,
    provision_type: SystemImageType.VM_OR_INSTANCE
  });

  let error_message = (appliance.version < "5.10" ? "Name has already been taken" : "Name is not unique within region 0");

  pytest.raises(Exception, {match: error_message}, () => (
    collection.create({
      name,
      provision_type: SystemImageType.VM_OR_INSTANCE
    })
  ));

  sys_image_type.delete({cancel: false})
};

function test_name_required_error_validation_system_image(appliance) {
  // 
  //   Tests a System Image with no name.
  // 
  //   Polarion:
  //       assignee: pvala
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let collection = appliance.collections.system_image_types;

  pytest.raises(Exception, {match: "Name is required"}, () => (
    collection.create({
      name: null,
      provision_type: SystemImageType.VM_OR_INSTANCE
    })
  ))
};

function test_system_image_type_selective_delete(appliance) {
  // 
  //   Tests System Image Type for delete operation using select option on All page.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let collection = appliance.collections.system_image_types;

  let sys_image_type1 = collection.create({
    name: fauxfactory.gen_alphanumeric(8),
    provision_type: SystemImageType.VM_OR_INSTANCE
  });

  let sys_image_type2 = collection.create({
    name: fauxfactory.gen_alphanumeric(8),
    provision_type: SystemImageType.VM_OR_INSTANCE
  });

  collection.delete(false, sys_image_type1, sys_image_type2)
}
