require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/explorer/namespace");
include(Cfme.Automate.Explorer.Namespace);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytestmark = [test_requirements.automate];

function parent_namespace(request, domain) {
  if (request.param == "plain") {
    return domain
  } else {
    return domain.namespaces.create({
      name: fauxfactory.gen_alpha(),
      description: fauxfactory.gen_alpha()
    })
  }
};

function test_namespace_crud(parent_namespace) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: critical
  //       initialEstimate: 1/16h
  //       tags: automate
  //   
  let ns = parent_namespace.namespaces.create({
    name: fauxfactory.gen_alpha(),
    description: fauxfactory.gen_alpha()
  });

  if (!ns.exists) throw new ();

  let updated_description = fauxfactory.gen_alpha(
    20,
    {start: "editdescription_"}
  );

  update(ns, () => ns.description = updated_description);
  if (!ns.exists) throw new ();
  ns.delete({cancel: true});
  if (!ns.exists) throw new ();
  ns.delete();
  if (!!ns.exists) throw new ()
};

function test_namespace_delete_from_table(parent_namespace) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: medium
  //       initialEstimate: 1/30h
  //       tags: automate
  //   
  let generated = [];

  for (let _ in (3).times) {
    let namespace = parent_namespace.namespaces.create({
      name: fauxfactory.gen_alpha(),
      description: fauxfactory.gen_alpha()
    });

    generated.push(namespace)
  };

  parent_namespace.namespaces.delete(...generated);

  for (let namespace in generated) {
    if (!!namespace.exists) throw new ()
  }
};

function test_duplicate_namespace_disallowed(parent_namespace) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseposneg: negative
  //       initialEstimate: 1/16h
  //       tags: automate
  //   
  let ns = parent_namespace.namespaces.create({
    name: fauxfactory.gen_alpha(),
    description: fauxfactory.gen_alpha()
  });

  pytest.raises(
    Exception,
    {match: "Name has already been taken"},

    () => (
      parent_namespace.namespaces.create({
        name: ns.name,
        description: ns.description
      })
    )
  )
};

function test_wrong_namespace_name(request, domain) {
  // To test whether namespace is creating with wrong name or not.
  //      wrong_namespace: 'Dummy Namespace' (This is invalid name of Namespace because there is space
  //      in the name)
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/60h
  //       tags: automate
  //       testSteps:
  //           1. Navigate to Automation> Automate> Explorer
  //           2. Try to create namespace with name `Dummy Namespace` (I put space which is invalid)
  //       expectedResults:
  //           1.
  //           2. Should give proper flash message
  // 
  //   Bugzilla:
  //       1650071
  //   
  let wrong_namespace = "Dummy Namespace";
  let namespace = domain.namespaces;

  pytest.raises(
    RuntimeError,
    () => namespace.create({name: wrong_namespace})
  );

  let view = namespace.create_view(NamespaceAddView);
  view.flash.assert_message("Name may contain only alphanumeric and _ . - $ characters");
  wrong_namespace = namespace.instantiate({name: wrong_namespace});
  request.addfinalizer(wrong_namespace.delete_if_exists);
  if (!!wrong_namespace.exists) throw new ()
};

function test_remove_openshift_deployment_in_automate(appliance) {
  // This test case will test successful removal of OpenShift \"Deployment\" from Automate domain -
  //   ManageIQ.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/20h
  //       caseimportance: high
  //       caseposneg: negative
  //       testtype: functional
  //       startsin: 5.11
  //       casecomponent: Automate
  // 
  //   Bugzilla:
  //       1672937
  //   
  let view = navigate_to(appliance.collections.domains, "All");

  if (!!view.datastore.tree.has_path(
    "Datastore",
    "ManageIQ (Locked)",
    "Deployment"
  )) throw new ()
}
