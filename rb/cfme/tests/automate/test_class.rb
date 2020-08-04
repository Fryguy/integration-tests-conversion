require_relative 'textwrap'
include Textwrap
require_relative 'cfme'
include Cfme
require_relative 'cfme/automate/explorer/klass'
include Cfme::Automate::Explorer::Klass
require_relative 'cfme/automate/simulation'
include Cfme::Automate::Simulation
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [test_requirements.automate]
def get_namespace(request, domain)
  namespace = domain.namespaces.create(name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha())
  if request.param == "plain"
    yield(namespace)
  else
    namespace = namespace.namespaces.create(name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha())
    yield(namespace)
  end
  namespace.delete_if_exists()
end
def test_class_crud(get_namespace)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: critical
  #       initialEstimate: 1/30h
  #       tags: automate
  #   
  a_class = get_namespace.classes.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric())
  orig = a_class.description
  update(a_class) {
    a_class.description = "edited"
  }
  update(a_class) {
    a_class.description = orig
  }
  a_class.delete()
  raise unless !a_class.exists
end
def test_schema_crud(get_namespace)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: critical
  #       initialEstimate: 1/20h
  #       tags: automate
  #   
  a_class = get_namespace.classes.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric())
  f1 = fauxfactory.gen_alpha()
  f2 = fauxfactory.gen_alpha()
  f3 = fauxfactory.gen_alpha()
  a_class.schema.add_fields({"name" => f1, "type" => "Relationship"}, {"name" => f2, "type" => "Attribute"})
  a_class.schema.add_field(name: f3, type: "Relationship")
  a_class.schema.delete_field(f1)
  raise unless Set.new(a_class.schema.schema_field_names) == Set.new([f2, f3])
end
def test_schema_duplicate_field_disallowed(klass)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/16h
  #       tags: automate
  #   
  field = fauxfactory.gen_alpha()
  klass.schema.add_field(name: field, type: "Relationship")
  pytest.raises(Exception, match: "Name has already been taken") {
    klass.schema.add_field(name: field, type: "Relationship")
  }
end
def test_duplicate_class_disallowed(get_namespace)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseposneg: negative
  #       initialEstimate: 1/30h
  #       tags: automate
  #   
  name = fauxfactory.gen_alphanumeric()
  get_namespace.classes.create(name: name)
  pytest.raises(Exception, match: "Name has already been taken") {
    get_namespace.classes.create(name: name)
  }
end
def test_same_class_name_different_namespace(domain)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       initialEstimate: 1/16h
  #       tags: automate
  #   
  ns1 = domain.namespaces.create(name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha())
  ns2 = domain.namespaces.create(name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha())
  c1 = ns1.classes.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric())
  c2 = ns2.classes.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric())
  raise unless c1.exists
  raise unless c2.exists
  c1.delete()
  raise unless !c1.exists
  raise unless c2.exists
end
def test_class_display_name_unset_from_ui(get_namespace)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       initialEstimate: 1/30h
  #       tags: automate
  #   
  a_class = get_namespace.classes.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric())
  update(a_class) {
    a_class.display_name = fauxfactory.gen_alphanumeric()
  }
  raise unless a_class.exists
  update(a_class) {
    a_class.display_name = ""
  }
  raise unless a_class.exists
end
def test_automate_schema_field_without_type(klass)
  # It shouldn't be possible to add a field without specifying a type.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       caseposneg: negative
  #       initialEstimate: 1/12h
  #       tags: automate
  #       testSteps:
  #           1. Create a schema field that does not specify a type
  #           2. Save the schema
  #       expectedResults:
  #           1.
  #           2. it is not possible to add a field that does not specify the type
  #              (assertion, attribute, relationship, ...)
  # 
  #   Bugzilla:
  #       1365442
  #   
  schema_field = fauxfactory.gen_alphanumeric()
  pytest.raises(RuntimeError) {
    klass.schema.add_fields({"name" => schema_field, "data_type" => "String"})
  }
  view = klass.create_view(ClassSchemaEditView)
  raise unless view.schema.save_button.disabled
  raise unless view.schema.reset_button.disabled
  raise unless !view.schema.cancel_button.disabled
end
def test_state_machine_variable(klass)
  # 
  #   Test whether storing the state machine variable works and the value is
  #   available in another state.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       tags: automate
  #   
  schema_field1,schema_field2,state_var = 3.times.map{|i| fauxfactory.gen_alpha()}
  script1 = dedent("
        $evm.set_state_var(:var1, \"#{state_var}\")
        ")
  script2 = dedent("
        state_value = $evm.get_state_var(:var1)
        $evm.log(\'info\', \"Value of state var returned \#{state_value}\")
        ")
  klass.schema.add_fields(*[schema_field1, schema_field2].map{|field| {"name" => field, "type" => "State", "data_type" => "String"}})
  methods = [script1, script2].map{|script| klass.methods.create(name: fauxfactory.gen_alphanumeric(), location: "inline", script: script)}.to_a
  instance = klass.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), fields: {"schema_field1" => {"value" => "METHOD::#{methods[0].name}"}, "schema_field2" => {"value" => "METHOD::#{methods[1].name}"}})
  (LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*Value of state var returned #{state_var}.*"])).waiting(timeout: 120) {
    simulate(appliance: klass.appliance, attributes_values: {"namespace" => klass.namespace.name, "class" => klass.name, "instance" => instance.name}, message: "create", request: "Call_Instance", execute_methods: true)
  }
end
