require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);

let pytestmark = [
  test_requirements.stack,
  pytest.mark.tier(2),

  pytest.mark.parametrize(
    "template_type",
    ["CloudFormation", "Heat", "Azure", "VNF", "vApp"],
    {ids: ["cnf", "heat", "azure", "vnf", "vapp"], indirect: true}
  ),

  pytest.mark.uncollectif(
    template_type => template_type == "VNF",
    {reason: "VNF requires vCloud provider"}
  )
];

const METHOD_TORSO = `
{  \"AWSTemplateFormatVersion\" : \"2010-09-09\",
  \"Description\" : \"AWS CloudFormation Sample Template Rails_Single_Instance.\",

  \"Parameters\" : {
    \"KeyName\": {
      \"Description\" : \"Name of an existing EC2 KeyPair to enable SSH access to the instances\",
      \"Type\": \"AWS::EC2::KeyPair::KeyName\",
      \"ConstraintDescription\" : \"must be the name of an existing EC2 KeyPair.\"
    }
  }
}
`;
const METHOD_TORSO_copied = `
{

\"AWSTemplateFormatVersion\" : \"2010-09-09\",
  \"Description\" : \"AWS CloudFormation Sample Template Rails_Single_Instance.\",

  \"Parameters\" : {
    \"KeyName\": {
      \"Description\" : \"Name of an existing EC2 KeyPair to enable SSH access to the instances\",
      \"Type\": \"AWS::EC2::KeyPair::KeyName\",
      \"ConstraintDescription\" : \"must be the name of an existing EC2 KeyPair.\"
    }
  }
}
`;

let templates = {
  CloudFormation: ["Amazon CloudFormation", "CloudFormation Templates"],
  Heat: ["OpenStack Heat", "Heat Templates"],
  Azure: ["Microsoft Azure", "Azure Templates"],
  VNF: ["VNF", "VNF Templates"],
  vApp: ["VMWare vApp", "vApp Templates"]
};

function template_type(request) {
  return request.param
};

function created_template(appliance, template_type) {
  let method = METHOD_TORSO.gsub(
    "CloudFormation",
    fauxfactory.gen_alphanumeric()
  );

  let collection = appliance.collections.orchestration_templates;

  let template = collection.create({
    template_group: templates.get(template_type)[1],
    template_type: templates.get(template_type)[0],
    template_name: fauxfactory.gen_alphanumeric(),
    description: "my template",
    content: method
  });

  yield(template);
  template.delete()
};

function test_orchestration_template_crud(appliance, template_type) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //       tags: service
  //   
  let method = METHOD_TORSO.gsub(
    "CloudFormation",
    fauxfactory.gen_alphanumeric()
  );

  let collection = appliance.collections.orchestration_templates;

  let template = collection.create({
    template_group: templates.get(template_type)[1],
    template_type: templates.get(template_type)[0],
    template_name: fauxfactory.gen_alphanumeric(),
    description: "my template",
    content: method
  });

  if (!template.exists) throw new ();

  update(
    template,
    () => template.description = "my edited description"
  );

  template.delete();
  if (!!template.exists) throw new ()
};

function test_copy_template(created_template) {
  // Tests Orchestration template copy
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //       tags: service
  //   
  let copied_method = METHOD_TORSO_copied.gsub(
    "CloudFormation",
    fauxfactory.gen_alphanumeric()
  );

  let template = created_template;

  let template_copy = template.copy_template(
    `${template.template_name}_copied`,
    copied_method
  );

  if (!template_copy.exists) throw new ();
  template_copy.delete()
};

function test_name_required_error_validation_orch_template(appliance, template_type) {
  // Tests error validation if Name wasn't specified during template creation
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //       tags: service
  //   
  let copied_method = METHOD_TORSO_copied.gsub(
    "CloudFormation",
    fauxfactory.gen_alphanumeric()
  );

  let collection = appliance.collections.orchestration_templates;

  pytest.raises(RuntimeError, () => (
    collection.create({
      template_group: templates.get(template_type)[1],
      template_type: templates.get(template_type)[0],
      template_name: null,
      description: "my template",
      content: copied_method
    })
  ))
};

function test_empty_all_fields_error_validation(appliance, template_type) {
  // Tests error validation if we try to create template with all empty fields
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //       tags: service
  //   
  let flash_msg = "Error during Orchestration Template creation: new template content cannot be empty";
  let collection = appliance.collections.orchestration_templates;

  pytest.raises(Exception, {match: flash_msg}, () => (
    collection.create({
      template_group: templates.get(template_type)[1],
      template_type: templates.get(template_type)[0],
      template_name: null,
      description: null,
      content: ""
    })
  ))
};

function test_empty_content_error_validation(appliance, template_type) {
  // Tests error validation if content wasn't added during template creation
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //       tags: service
  //   
  let flash_msg = "Error during Orchestration Template creation: new template content cannot be empty";
  let collection = appliance.collections.orchestration_templates;

  pytest.raises(RuntimeError, {match: flash_msg}, () => (
    collection.create({
      template_group: templates.get(template_type)[1],
      template_type: templates.get(template_type)[0],
      template_name: fauxfactory.gen_alphanumeric(),
      description: "my template",
      content: ""
    })
  ))
};

function test_tag_orchestration_template(tag, created_template) {
  // Tests template tagging. Verifies that tag was added, confirms in template details,
  //   removes tag
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //   
  navigate_to(created_template, "Details");
  created_template.add_tag({tag});

  if (!created_template.get_tags().map(tags => (
    [tags.display_name, tags.category.display_name]
  )).include([tag.display_name, tag.category.display_name])) throw new ();

  created_template.remove_tag({tag})
};

function test_duplicated_content_error_validation(appliance, created_template, template_type, action) {
  // Tests that we are not allowed to have duplicated content in different templates
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //       tags: service
  //   
  let collection = appliance.collections.orchestration_templates;

  if (action == "copy") {
    let copy_name = `${created_template.template_name}_copied`;
    let flash_msg = "Unable to create a new template copy \"{}\": old and new template content have to differ.".format(copy_name);

    pytest.raises(
      RuntimeError,
      {match: flash_msg},
      () => created_template.copy_template(copy_name, created_template.content)
    )
  } else if (action == "create") {
    pytest.raises(RuntimeError, () => (
      collection.create({
        template_group: templates.get(template_type)[1],
        template_type: templates.get(template_type)[0],
        template_name: fauxfactory.gen_alphanumeric(),
        description: "my template",
        content: created_template.content
      })
    ))
  }
};

function test_service_dialog_creation_from_customization_template(request, created_template) {
  // Tests Service Dialog creation  from customization template
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //       tags: service
  //   
  let dialog_name = created_template.template_name;
  let service_dialog = created_template.create_service_dialog_from_template(dialog_name);
  request.addfinalizer(service_dialog.delete_if_exists);
  if (!service_dialog.exists) throw new ()
}
