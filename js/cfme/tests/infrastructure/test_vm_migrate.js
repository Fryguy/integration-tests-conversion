require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);

let pytestmark = [
  pytest.mark.meta({server_roles: "+automate"}),
  test_requirements.vm_migrate,
  pytest.mark.tier(2),

  pytest.mark.provider(
    [VMwareProvider, RHEVMProvider],
    {scope: "module"}
  )
];

function new_vm(setup_provider, provider) {
  // Fixture to provision appliance to the provider being tested if necessary
  let vm_name = random_vm_name({context: "migrate"});

  try {
    let template_name = provider.data.templates.small_template.name
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NoMethodError) {
      pytest.skip("Could not find templates.small_template.name in provider yaml: {}".format(provider.data))
    } else {
      throw $EXCEPTION
    }
  };

  let vm = provider.appliance.collections.infra_vms.instantiate(
    vm_name,
    provider,
    template_name
  );

  if (is_bool(!provider.mgmt.does_vm_exist(vm_name))) {
    vm.create_on_provider({find_in_cfme: true, allow_skip: "default"})
  };

  yield(vm);
  vm.cleanup_on_provider()
};

function test_vm_migrate(appliance, new_vm, provider) {
  let migrate_to;

  // Tests migration of a vm
  // 
  //   Metadata:
  //       test_flag: migrate, provision
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Provisioning
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(new_vm, "Details");
  let vm_host = view.entities.summary("Relationships").get_text_of("Host");

  let hosts = provider.hosts.all().select(vds => !vm_host.include(vds.name)).map(vds => (
    vds.name
  ));

  if (is_bool(hosts)) {
    migrate_to = hosts[0]
  } else {
    pytest.skip("There is only one host in the provider")
  };

  new_vm.migrate_vm(
    "email@xyz.com",
    "first",
    "last",
    {host: migrate_to}
  );

  let request_description = new_vm.name;

  let cells = {
    Description: request_description,
    "Request Type": "Migrate"
  };

  let migrate_request = appliance.collections.requests.instantiate(
    request_description,
    {cells, partial_check: true}
  );

  migrate_request.wait_for_request({method: "ui"});
  let msg = `Request failed with the message ${migrate_request.row.last_message.text}`;
  if (!migrate_request.is_succeeded({method: "ui"})) throw msg
};

function test_vm_migrate_should_create_notifications_when_migrations_fail(appliance, create_vm, provider) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: WebUI
  //       testtype: functional
  //       initialEstimate: 1/4h
  //       startsin: 5.10
  //       tags: service
  //       caseposneg: negative
  //       testSteps:
  //           1. add provider to appliance
  //           2. create vm
  //           3. migrate vm, use same host and datastore is None
  //       expectedResults:
  //           1.
  //           2.
  //           3. check error on UI and in the log file.
  //   Bugzilla:
  //       1478462
  //   
  let view = navigate_to(create_vm, "Details");
  let vm_host = view.entities.summary("Relationships").get_text_of("Host");

  let hosts = provider.hosts.all().select(vds => vm_host.include(vds.name)).map(vds => (
    vds.name
  ));

  let err_msg = "Status [Error Migrating VM] Message";

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {matched_patterns: [err_msg], hostname: appliance.hostname}
  )).waiting({timeout: 900}, () => {
    create_vm.migrate_vm(
      fauxfactory.gen_email(),
      fauxfactory.gen_string("alphanumeric", 5),
      fauxfactory.gen_string("alphanumeric", 5),
      hosts[0],
      "<None>"
    );

    let request_description = create_vm.name;

    let cells = {
      Description: request_description,
      "Request Type": "Migrate"
    };

    let migrate_request = appliance.collections.requests.instantiate(
      request_description,
      {cells, partial_check: true}
    );

    migrate_request.wait_for_request({method: "ui"});

    if (!!migrate_request.is_succeeded({method: "ui"})) {
      throw "VM migration does not failed"
    };

    if (!migrate_request.row.last_message.text.include(err_msg)) {
      throw migrate_request.row.last_message.text
    }
  })
}
