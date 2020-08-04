// This module contains tests that check priority of domains.
require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/explorer/domain");
include(Cfme.Automate.Explorer.Domain);
require_relative("cfme/automate/simulation");
include(Cfme.Automate.Simulation);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.automate];
const FILE_LOCATION = ("/var/www/miq/vmdb/test_ae_{}").format(fauxfactory.gen_alphanumeric(16));
const METHOD_TORSO = `
$evm.log(\"info\", \"Automate Method Started\")
File.open(\"%s\", \"w\") do |file|
    file.write \"{}\"
end
$evm.log(\"info\", \"Automate Method Ended\")
exit MIQ_OK
` % FILE_LOCATION;

function domain_collection(appliance) {
  return DomainCollection(appliance)
};

function copy_domain(request, domain_collection) {
  let domain = domain_collection.create({
    name: fauxfactory.gen_alphanumeric(),
    enabled: true
  });

  request.addfinalizer(domain.delete_if_exists);
  return domain
};

function original_domain(request, domain_collection) {
  let domain = domain_collection.create({
    name: fauxfactory.gen_alphanumeric(),
    enabled: true
  });

  request.addfinalizer(domain.delete_if_exists);
  return domain
};

function original_class(request, domain_collection, original_domain) {
  domain_collection.instantiate({name: "ManageIQ"}).namespaces.instantiate({name: "System"}).classes.instantiate({name: "Request"}).copy_to(original_domain);
  let klass = original_domain.namespaces.instantiate({name: "System"}).classes.instantiate({name: "Request"});
  return klass
};

function original_method_write_data() {
  return fauxfactory.gen_alphanumeric(32)
};

function copy_method_write_data() {
  return fauxfactory.gen_alphanumeric(32)
};

function original_method(request, original_method_write_data, original_class) {
  let method = original_class.methods.create({
    name: fauxfactory.gen_alphanumeric(),
    location: "inline",
    script: METHOD_TORSO.format(original_method_write_data)
  });

  return method
};

function original_instance(request, original_method, original_class) {
  let instance = original_class.instances.create({
    name: fauxfactory.gen_alphanumeric(),
    fields: {meth5: {value: original_method.name}}
  });

  return instance
};

function test_priority(request, appliance, original_method, original_instance, original_domain, copy_domain, original_method_write_data, copy_method_write_data, domain_collection) {
  // This test checks whether method overriding works across domains with the aspect of priority.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       tags: automate
  //       testSteps:
  //           1.If the picked file name exists on the appliance, delete it
  //           2.Create two domains (one for the original method and one for copied method).
  //           3.Create a method in ``System/Request`` (in original domain) containing the method code
  //             as in this testing module, with the file in the method being the file picked and you
  //             pick the contents you want to write to the file.
  //           4.Set the domain order so the original domain is first.
  //           5.Run the simulation on the ``Request/<method_name>`` with executing.
  //           6.The file on appliance should contain the data as you selected.
  //           7.Copy the method to the second (copy) domain.
  //           8.Change the copied method so it writes different data.
  //           9.Set the domain order so the copy domain is first.
  //           10.Run the same simulation again.
  //           11.Check the file contents, it should be the same as the content you entered last.
  //           12.Then pick the domain order so the original domain is first.
  //           13.Run the same simulation again.
  //           14.The contents of the file should be the same as in the first case.
  //   
  let ssh_client = appliance.ssh_client;
  ssh_client.run_command(`rm -f ${FILE_LOCATION}`);
  domain_collection.set_order([original_domain]);

  simulate({
    appliance,
    instance: "Request",
    message: "create",
    request: original_instance.name,
    execute_methods: true
  });

  wait_for(
    () => ssh_client.run_command(`cat ${FILE_LOCATION}`).success,
    {num_sec: 120, delay: 0.5, message: "wait for file to appear"}
  );

  request.addfinalizer(() => ssh_client.run_command(`rm -f ${FILE_LOCATION}`));
  let result = ssh_client.run_command(`cat ${FILE_LOCATION}`);
  if (result.output.strip() != original_method_write_data) throw new ();
  ssh_client.run_command(`rm -f ${FILE_LOCATION}`);
  original_method.copy_to(copy_domain);
  let copied_method = copy_domain.namespaces.instantiate({name: "System"}).classes.instantiate({name: "Request"}).methods.instantiate({name: original_method.name});

  update(
    copied_method,
    () => copied_method.script = METHOD_TORSO.format(copy_method_write_data)
  );

  domain_collection.set_order([copy_domain]);

  simulate({
    appliance,
    instance: "Request",
    message: "create",
    request: original_instance.name,
    execute_methods: true
  });

  wait_for(
    () => ssh_client.run_command(`cat ${FILE_LOCATION}`).success,
    {num_sec: 120, delay: 0.5, message: "wait for file to appear"}
  );

  result = ssh_client.run_command(`cat ${FILE_LOCATION}`);
  if (result.output.strip() != copy_method_write_data) throw new ();
  ssh_client.run_command(`rm -f ${FILE_LOCATION}`);
  domain_collection.set_order([original_domain]);

  simulate({
    appliance,
    instance: "Request",
    message: "create",
    request: original_instance.name,
    execute_methods: true
  });

  wait_for(
    () => ssh_client.run_command(`cat ${FILE_LOCATION}`).success,
    {num_sec: 120, delay: 0.5, message: "wait for file to appear"}
  );

  result = ssh_client.run_command(`cat ${FILE_LOCATION}`);
  if (result.output.strip() != original_method_write_data) throw new ();
  ssh_client.run_command(`rm -f ${FILE_LOCATION}`)
};

function test_automate_disabled_domains_in_domain_priority(request, klass) {
  // When the admin clicks on a instance that has duplicate entries in two different
  //      domains. If one domain is disabled it is still displayed in the UI for the domain priority.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/12h
  //       caseimportance: low
  //       caseposneg: negative
  //       testtype: functional
  //       startsin: 5.7
  //       casecomponent: Automate
  //       tags: automate
  //       testSteps:
  //           1. create two domains
  //           2. attach the same automate code to both domains.
  //           3. disable one domain
  //           4. click on a instance and see domains displayed.
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4. CFME should not display disabled domains or it should be like
  //              'domain_name (Disabled)'
  // 
  //   Bugzilla:
  //       1331017
  //   
  let schema_field = fauxfactory.gen_alphanumeric();

  let other_domain = klass.appliance.collections.domains.create({
    name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alpha(),
    enabled: true
  });

  request.addfinalizer(other_domain.delete_if_exists);

  let method = klass.methods.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    location: "inline",
    script: "$evm.log(:info, \":P\")"
  });

  request.addfinalizer(method.delete_if_exists);

  klass.schema.add_fields({
    name: schema_field,
    type: "Method",
    data_type: "String"
  });

  let instance = klass.instances.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),
    fields: {schema_field: {value: method.name}}
  });

  request.addfinalizer(instance.delete_if_exists);
  method.copy_to(other_domain);
  instance.copy_to(other_domain);
  let view = navigate_to(instance, "Details");
  let domain_priority = view.domain_priority.read().split_p(" ");
  if (!!domain_priority.include("(Disabled)")) throw new ();
  update(other_domain, () => other_domain.enabled = false);
  view = navigate_to(instance, "Details");
  domain_priority = view.domain_priority.read().split_p(" ");
  if (!domain_priority.include("(Disabled)")) throw new ()
}
