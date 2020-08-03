require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [test_requirements.stack, pytest.mark.tier(2), pytest.mark.parametrize("template_type", ["CloudFormation", "Heat", "Azure", "VNF", "vApp"], ids: ["cnf", "heat", "azure", "vnf", "vapp"], indirect: true), pytest.mark.uncollectif(lambda{|template_type| template_type == "VNF"}, reason: "VNF requires vCloud provider")]
METHOD_TORSO = "
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
"
METHOD_TORSO_copied = "
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
"
templates = {"CloudFormation" => ["Amazon CloudFormation", "CloudFormation Templates"], "Heat" => ["OpenStack Heat", "Heat Templates"], "Azure" => ["Microsoft Azure", "Azure Templates"], "VNF" => ["VNF", "VNF Templates"], "vApp" => ["VMWare vApp", "vApp Templates"]}
def template_type(request)
  return request.param
end
def created_template(appliance, template_type)
  method = METHOD_TORSO.gsub("CloudFormation", fauxfactory.gen_alphanumeric())
  collection = appliance.collections.orchestration_templates
  template = collection.create(template_group: templates.get(template_type)[1], template_type: templates.get(template_type)[0], template_name: fauxfactory.gen_alphanumeric(), description: "my template", content: method)
  yield(template)
  template.delete()
end
def test_orchestration_template_crud(appliance, template_type)
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  method = METHOD_TORSO.gsub("CloudFormation", fauxfactory.gen_alphanumeric())
  collection = appliance.collections.orchestration_templates
  template = collection.create(template_group: templates.get(template_type)[1], template_type: templates.get(template_type)[0], template_name: fauxfactory.gen_alphanumeric(), description: "my template", content: method)
  raise unless template.exists
  update(template) {
    template.description = "my edited description"
  }
  template.delete()
  raise unless !template.exists
end
def test_copy_template(created_template)
  # Tests Orchestration template copy
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  copied_method = METHOD_TORSO_copied.gsub("CloudFormation", fauxfactory.gen_alphanumeric())
  template = created_template
  template_copy = template.copy_template("#{template.template_name}_copied", copied_method)
  raise unless template_copy.exists
  template_copy.delete()
end
def test_name_required_error_validation_orch_template(appliance, template_type)
  # Tests error validation if Name wasn't specified during template creation
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  copied_method = METHOD_TORSO_copied.gsub("CloudFormation", fauxfactory.gen_alphanumeric())
  collection = appliance.collections.orchestration_templates
  pytest.raises(RuntimeError) {
    collection.create(template_group: templates.get(template_type)[1], template_type: templates.get(template_type)[0], template_name: nil, description: "my template", content: copied_method)
  }
end
def test_empty_all_fields_error_validation(appliance, template_type)
  # Tests error validation if we try to create template with all empty fields
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  flash_msg = "Error during Orchestration Template creation: new template content cannot be empty"
  collection = appliance.collections.orchestration_templates
  pytest.raises(Exception, match: flash_msg) {
    collection.create(template_group: templates.get(template_type)[1], template_type: templates.get(template_type)[0], template_name: nil, description: nil, content: "")
  }
end
def test_empty_content_error_validation(appliance, template_type)
  # Tests error validation if content wasn't added during template creation
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  flash_msg = "Error during Orchestration Template creation: new template content cannot be empty"
  collection = appliance.collections.orchestration_templates
  pytest.raises(RuntimeError, match: flash_msg) {
    collection.create(template_group: templates.get(template_type)[1], template_type: templates.get(template_type)[0], template_name: fauxfactory.gen_alphanumeric(), description: "my template", content: "")
  }
end
def test_tag_orchestration_template(tag, created_template)
  # Tests template tagging. Verifies that tag was added, confirms in template details,
  #   removes tag
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Configuration
  #       caseimportance: low
  #       initialEstimate: 1/15h
  #   
  navigate_to(created_template, "Details")
  created_template.add_tag(tag: tag)
  raise unless created_template.get_tags().map{|tags| [tags.display_name, tags.category.display_name]}.include?([tag.display_name, tag.category.display_name])
  created_template.remove_tag(tag: tag)
end
def test_duplicated_content_error_validation(appliance, created_template, template_type, action)
  # Tests that we are not allowed to have duplicated content in different templates
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  collection = appliance.collections.orchestration_templates
  if action == "copy"
    copy_name = "#{created_template.template_name}_copied"
    flash_msg = "Unable to create a new template copy \"{}\": old and new template content have to differ.".format(copy_name)
    pytest.raises(RuntimeError, match: flash_msg) {
      created_template.copy_template(copy_name, created_template.content)
    }
  else
    if action == "create"
      pytest.raises(RuntimeError) {
        collection.create(template_group: templates.get(template_type)[1], template_type: templates.get(template_type)[0], template_name: fauxfactory.gen_alphanumeric(), description: "my template", content: created_template.content)
      }
    end
  end
end
def test_service_dialog_creation_from_customization_template(request, created_template)
  # Tests Service Dialog creation  from customization template
  # 
  #   Polarion:
  #       assignee: nansari
  #       initialEstimate: 1/4h
  #       casecomponent: Services
  #       tags: service
  #   
  dialog_name = created_template.template_name
  service_dialog = created_template.create_service_dialog_from_template(dialog_name)
  request.addfinalizer(service_dialog.delete_if_exists)
  raise unless service_dialog.exists
end
