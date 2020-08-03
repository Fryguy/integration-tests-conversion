require_relative 'cfme'
include Cfme
require_relative 'cfme/common'
include Cfme::Common
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
pytestmark = [test_requirements.generic_objects]
GEN_OBJ_DIRECTORY = "/var/www/miq/vmdb/tmp/generic_object_definitions"
def gen_obj_def_import_export(appliance)
  appliance.context.use(ViaREST) {
    definition = appliance.collections.generic_object_definitions.create(name: fauxfactory.gen_alphanumeric(28, start: "rest_gen_class_imp_exp_"), description: "Generic Object Definition", attributes: {"addr01" => "string"}, methods: ["add_vm", "remove_vm"])
    yield(definition)
    definition.delete_if_exists()
  }
end
def test_generic_object_definition_crud(appliance, context, soft_assert)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: GenericObjects
  #       caseimportance: high
  #       initialEstimate: 1/12h
  #       tags: 5.9
  #   
  appliance.context.use(context) {
    definition = appliance.collections.generic_object_definitions.create(name: "#{context.name.downcase()}_generic_class#{fauxfactory.gen_alphanumeric()}", description: "Generic Object Definition", attributes: {"addr01" => "string"}, associations: {"services" => "Service"}, methods: ["hello_world"])
    if context.name == "UI"
      view = appliance.browser.create_view(BaseLoggedInPage)
      view.flash.assert_success_message("Generic Object Class \"#{definition.name}\" has been successfully added.")
    end
    raise unless definition.exists
    update(definition) {
      definition.name = "#{definition.name}_updated"
      definition.attributes = {"new_address" => "string"}
    }
    if context.name == "UI"
      view.flash.assert_success_message("Generic Object Class \"#{definition.name}\" has been successfully saved.")
      view = navigate_to(definition, "Details")
      soft_assert.(view.summary("Attributes (2)").get_text_of("new_address"))
      soft_assert.(view.summary("Attributes (2)").get_text_of("addr01"))
      soft_assert.(view.summary("Associations (1)").get_text_of("services"))
    else
      rest_definition = appliance.rest_api.collections.generic_object_definitions.get(name: definition.name)
      soft_assert.(rest_definition.properties["attributes"].include?("new_address"))
      soft_assert.(!rest_definition.properties["attributes"].include?("addr01"))
    end
    definition.delete()
    if is_bool(context.name == "UI" && !BZ(bug_id: 1644658, forced_streams: ["5.10"]).blocks)
      view.flash.assert_success_message("Generic Object Class:\"#{definition.name}\" was successfully deleted")
    end
    raise unless !definition.exists
  }
end
def test_generic_objects_class_accordion_should_display_when_locale_is_french()
  #  Generic objects class accordion should display when locale is french
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Services
  #       testtype: functional
  #       initialEstimate: 1/6h
  #       startsin: 5.10
  #       tags: service
  #   Bugzilla:
  #       1594480
  #   
  # pass
end
def test_upload_image_generic_object_definition(appliance)
  # 
  #   Bugzilla:
  #       1650104
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/30h
  #       caseimportance: medium
  #       caseposneg: negative
  #       testtype: functional
  #       startsin: 5.11
  #       casecomponent: GenericObjects
  #   
  view = navigate_to(appliance.collections.generic_object_definitions, "Add")
  view.custom_image_file.upload_chosen_file.click()
  view.flash.assert_message("No file chosen.")
  view.custom_image_file.upload_chosen_file.click()
  raise unless view.flash.read().size == 1
  view.cancel.click()
end
def test_import_export_generic_object_definition(request, appliance, gen_obj_def_import_export)
  # 
  #   Bugzilla:
  #       1595259
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/6h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.11
  #       casecomponent: GenericObjects
  #       testSteps:
  #           1. Create generic object definition via Rest
  #           2. Export the generic object definition
  #           3. Delete the generic object definition
  #           4. Import the generic object definition
  #       expectedResults:
  #           1. The generic object definition should be present in CFME
  #           2. Yaml file should be present on the appliance with the generic object details
  #           3. Generic object definition is deleted
  #           4. Generic object definition once again exists on the appliance
  #   
  raise unless appliance.ssh_client.run_command("mkdir #{GEN_OBJ_DIRECTORY}").success
  cleanup = lambda do
    raise unless (appliance.ssh_client.run_command("rm -rf #{GEN_OBJ_DIRECTORY}")).success
  end
  raise unless (appliance.ssh_client.run_rake_command("evm:export:generic_object_definitions -- --directory #{GEN_OBJ_DIRECTORY}")).success
  begin
    appliance.ssh_client.open_sftp().open("#{GEN_OBJ_DIRECTORY}/#{gen_obj_def_import_export.name}.yaml") {|f|
      data = yaml.safe_load(f)[0]["GenericObjectDefinition"]
    }
  rescue IOError
    pytest.fail(("IOError: {}/{}.yaml not found on the appliance, exporting the generic object definition failed").format(GEN_OBJ_DIRECTORY, gen_obj_def_import_export.name))
  end
  raise unless data.get("description") == gen_obj_def_import_export.description
  raise unless data.get("name") == gen_obj_def_import_export.name
  gen_obj_def_import_export.delete_if_exists()
  raise unless (appliance.ssh_client.run_rake_command(("evm:import:generic_object_definitions -- --source {}/{}.yaml").format(GEN_OBJ_DIRECTORY, gen_obj_def_import_export.name))).success
  raise unless gen_obj_def_import_export.exists
end
