require_relative("textwrap");
include(Textwrap);
require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/explorer/klass");
include(Cfme.Automate.Explorer.Klass);
require_relative("cfme/automate/simulation");
include(Cfme.Automate.Simulation);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytestmark = [test_requirements.automate];

function get_namespace(request, domain) {
  let namespace = domain.namespaces.create({
    name: fauxfactory.gen_alpha(),
    description: fauxfactory.gen_alpha()
  });

  if (request.param == "plain") {
    yield(namespace)
  } else {
    namespace = namespace.namespaces.create({
      name: fauxfactory.gen_alpha(),
      description: fauxfactory.gen_alpha()
    });

    yield(namespace)
  };

  namespace.delete_if_exists()
};

function test_class_crud(get_namespace) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: critical
  //       initialEstimate: 1/30h
  //       tags: automate
  //   
  let a_class = get_namespace.classes.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric()
  });

  let orig = a_class.description;
  update(a_class, () => a_class.description = "edited");
  update(a_class, () => a_class.description = orig);
  a_class.delete();
  if (!!a_class.exists) throw new ()
};

function test_schema_crud(get_namespace) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: critical
  //       initialEstimate: 1/20h
  //       tags: automate
  //   
  let a_class = get_namespace.classes.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric()
  });

  let f1 = fauxfactory.gen_alpha();
  let f2 = fauxfactory.gen_alpha();
  let f3 = fauxfactory.gen_alpha();

  a_class.schema.add_fields(
    {name: f1, type: "Relationship"},
    {name: f2, type: "Attribute"}
  );

  a_class.schema.add_field({name: f3, type: "Relationship"});
  a_class.schema.delete_field(f1);

  if (new Set(a_class.schema.schema_field_names) != new Set([f2, f3])) {
    throw new ()
  }
};

function test_schema_duplicate_field_disallowed(klass) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: medium
  //       initialEstimate: 1/16h
  //       tags: automate
  //   
  let field = fauxfactory.gen_alpha();
  klass.schema.add_field({name: field, type: "Relationship"});

  pytest.raises(
    Exception,
    {match: "Name has already been taken"},
    () => klass.schema.add_field({name: field, type: "Relationship"})
  )
};

function test_duplicate_class_disallowed(get_namespace) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseposneg: negative
  //       initialEstimate: 1/30h
  //       tags: automate
  //   
  let name = fauxfactory.gen_alphanumeric();
  get_namespace.classes.create({name});

  pytest.raises(
    Exception,
    {match: "Name has already been taken"},
    () => get_namespace.classes.create({name})
  )
};

function test_same_class_name_different_namespace(domain) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       initialEstimate: 1/16h
  //       tags: automate
  //   
  let ns1 = domain.namespaces.create({
    name: fauxfactory.gen_alpha(),
    description: fauxfactory.gen_alpha()
  });

  let ns2 = domain.namespaces.create({
    name: fauxfactory.gen_alpha(),
    description: fauxfactory.gen_alpha()
  });

  let c1 = ns1.classes.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric()
  });

  let c2 = ns2.classes.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric()
  });

  if (!c1.exists) throw new ();
  if (!c2.exists) throw new ();
  c1.delete();
  if (!!c1.exists) throw new ();
  if (!c2.exists) throw new ()
};

function test_class_display_name_unset_from_ui(get_namespace) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       initialEstimate: 1/30h
  //       tags: automate
  //   
  let a_class = get_namespace.classes.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric()
  });

  update(
    a_class,
    () => a_class.display_name = fauxfactory.gen_alphanumeric()
  );

  if (!a_class.exists) throw new ();
  update(a_class, () => a_class.display_name = "");
  if (!a_class.exists) throw new ()
};

function test_automate_schema_field_without_type(klass) {
  // It shouldn't be possible to add a field without specifying a type.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/12h
  //       tags: automate
  //       testSteps:
  //           1. Create a schema field that does not specify a type
  //           2. Save the schema
  //       expectedResults:
  //           1.
  //           2. it is not possible to add a field that does not specify the type
  //              (assertion, attribute, relationship, ...)
  // 
  //   Bugzilla:
  //       1365442
  //   
  let schema_field = fauxfactory.gen_alphanumeric();

  pytest.raises(
    RuntimeError,
    () => klass.schema.add_fields({name: schema_field, data_type: "String"})
  );

  let view = klass.create_view(ClassSchemaEditView);
  if (!view.schema.save_button.disabled) throw new ();
  if (!view.schema.reset_button.disabled) throw new ();
  if (!!view.schema.cancel_button.disabled) throw new ()
};

function test_state_machine_variable(klass) {
  // 
  //   Test whether storing the state machine variable works and the value is
  //   available in another state.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       tags: automate
  //   
  let [schema_field1, schema_field2, state_var] = (3).times.map(i => (
    fauxfactory.gen_alpha()
  ));

  let script1 = dedent(`\n        $evm.set_state_var(:var1, \"${state_var}\")\n        `);
  let script2 = dedent(`\n        state_value = $evm.get_state_var(:var1)\n        $evm.log('info', \"Value of state var returned \#{state_value}\")\n        `);

  klass.schema.add_fields(...[schema_field1, schema_field2].map(field => ({
    name: field,
    type: "State",
    data_type: "String"
  })));

  let methods = [script1, script2].map(script => (
    klass.methods.create({
      name: fauxfactory.gen_alphanumeric(),
      location: "inline",
      script
    })
  )).to_a;

  let instance = klass.instances.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),

    fields: {
      schema_field1: {value: `METHOD::${methods[0].name}`},
      schema_field2: {value: `METHOD::${methods[1].name}`}
    }
  });

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {matched_patterns: [`.*Value of state var returned ${state_var}.*`]}
  )).waiting({timeout: 120}, () => (
    simulate({
      appliance: klass.appliance,

      attributes_values: {
        namespace: klass.namespace.name,
        class: klass.name,
        instance: instance.name
      },

      message: "create",
      request: "Call_Instance",
      execute_methods: true
    })
  ))
}
