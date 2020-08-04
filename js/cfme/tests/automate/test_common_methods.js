// This module contains tests that test the universally applicable canned methods in Automate.
require_relative("datetime");
include(Datetime);
require_relative("datetime");
include(Datetime);
require_relative("textwrap");
include(Textwrap);
require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/simulation");
include(Cfme.Automate.Simulation);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/infrastructure/virtual_machines");
include(Cfme.Infrastructure.Virtual_machines);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/provisioning");
include(Cfme.Provisioning);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("widgetastic_manageiq");
include(Widgetastic_manageiq);

let pytestmark = [
  test_requirements.automate,
  pytest.mark.meta({server_roles: "+automate"}),

  pytest.mark.provider([InfraProvider], {
    required_fields: [
      ["provisioning", "template"],
      ["provisioning", "host"],
      ["provisioning", "datastore"]
    ],

    scope: "module"
  })
];

function generate_retirement_date({ delta = null }) {
  let gen_date = date.today();
  if (is_bool(delta)) gen_date += timedelta({days: delta});
  return gen_date
};

function test_vm_retire_extend(appliance, request, create_vm, soft_assert) {
  //  Tests extending a retirement using an AE method.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       initialEstimate: 1/3h
  //       setup:
  //           1. A running VM on any provider.
  //       testSteps:
  //           1. It creates a button pointing to ``Request/vm_retire_extend`` instance. The button
  //              should live in the VM and Instance button group.
  //           2. Then it sets a retirement date for the VM
  //           3. Then it waits until the retirement date is set
  //           4. Then it clicks the button that was created and it waits for the retirement date to
  //              extend.
  // 
  //   Bugzilla:
  //       1627758
  //   
  let view = appliance.browser.create_view(TestDropdownView);
  view.group.item_select(button.text);
  let extend_duration_days = 14;
  let extended_retirement_date = retirement_date + timedelta({days: extend_duration_days});

  wait_for(
    () => (
      create_vm.retirement_date >= extended_retirement_date.strftime(vm_retire_date_fmt)
    ),

    {
      num_sec: 60,
      message: "Check for extension of the VM retirement date by {} days".format(extend_duration_days)
    }
  )
};

function test_miq_password_decrypt(appliance, klass) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       initialEstimate: 1/3h
  // 
  //   Bugzilla:
  //       1720432
  //   
  let script = `require \"manageiq-password\"
root_password = ${appliance.password_gem}.encrypt(\"abc\")
$evm.log(\"info\", \"Root Password is \#{root_password}\")
root_password_decrypted = ${appliance.password_gem}.decrypt(root_password)
$evm.log(\"info\", \"Decrypted password is \#{root_password_decrypted}\")`;

  klass.schema.add_fields({
    name: "execute",
    type: "Method",
    data_type: "String"
  });

  let method = klass.methods.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    location: "inline",
    script
  });

  let instance = klass.instances.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),
    fields: {execute: {value: method.name}}
  });

  let result = LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {matched_patterns: [".*Decrypted password is abc.*"]}
  );

  result.start_monitoring();

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
  });

  if (!result.validate()) throw new ()
};

function test_service_retirement_from_automate_method(request, generic_catalog_item, custom_instance) {
  // 
  //   Bugzilla:
  //       1700524
  //       1753669
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       caseposneg: positive
  //       startsin: 5.11
  //       casecomponent: Automate
  //       testSteps:
  //           1. Create service catalog item and order
  //           2. Create a writeable domain and copy ManageIQ/System/Request to this domain
  //           3. Create retire_automation_service instance and set meth5 to retire_automation_service.
  //           4. Create retire_automation_service method with sample code given below:
  //              > service = $evm.root[\'service\']
  //              > $evm.log(:info, \"create_retire_request for  service \#{service}\")
  //              > request = $evm.execute(:create_retire_request, service)
  //              > $evm.log(:info, \"Create request for create_retire_request \#{request}\")
  //           5. Execute this method using simulation
  //       expectedResults:
  //           1. Service provision request should be provisioned successfully
  //           2.
  //           3.
  //           4.
  //           5. Service should be retired successfully
  //   
  let service_request = generic_catalog_item.appliance.rest_api.collections.service_templates.get({name: generic_catalog_item.name}).action.order();
  request.addfinalizer(() => service_request.action.delete());

  wait_for(
    () => service_request.request_state == "finished",
    {fail_func: service_request.reload, timeout: 180, delay: 10}
  );

  let script = dedent(`
        service = $evm.root['service']
        $evm.log(:info, 'create_retire_request for service \#{service}')
        request = $evm.execute(:create_retire_request, service)
        $evm.log(:info, 'Create request for create_retire_request \#{request}')
        `);
  let instance = custom_instance.call({ruby_code: script});

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {matched_patterns: [".*Create request for create_retire_request.*"]}
  )).waiting({timeout: 120}, () => (
    simulate({
      appliance: generic_catalog_item.appliance,
      target_type: "Service",
      target_object: `${generic_catalog_item.name}`,
      message: "create",
      request: `${instance.name}`,
      execute_methods: true
    })
  ));

  let retire_request = generic_catalog_item.appliance.rest_api.collections.requests.get({description: `Service Retire for: ${generic_catalog_item.name}`});

  wait_for(
    () => retire_request.request_state == "finished",
    {fail_func: retire_request.reload, timeout: 180, delay: 10}
  )
};

function set_root_tenant_quota(request, appliance) {
  let [field, value] = request.param;
  let root_tenant = appliance.collections.tenants.get_root_tenant();
  let view = navigate_to(root_tenant, "ManageQuotas");
  let reset_data = view.form.read();
  root_tenant.set_quota({None: {[`${field}_cb`]: true, field: value}});
  yield;
  root_tenant.set_quota({None: reset_data})
};

function test_automate_quota_units(setup_provider, provider, request, appliance, set_root_tenant_quota, provisioning) {
  // 
  //   Bugzilla:
  //       1334318
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: low
  //       initialEstimate: 1/4h
  //       tags: automate
  //   
  let vm_name = random_vm_name({context: "quota"});

  let prov_data = {
    catalog: {vm_name: vm_name},
    environment: {automatic_placement: true},
    network: {vlan: partial_match(provisioning.vlan)},
    hardware: {memory: "2048"}
  };

  let _finalize = () => {
    let collection = appliance.provider_based_collection(provider);

    let vm_obj = collection.instantiate(
      vm_name,
      provider,
      provisioning.template
    );

    try {
      vm_obj.cleanup_on_provider()
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof Exception) {
        logger.warning("Failed deleting VM from provider: %s", vm_name)
      } else {
        throw $EXCEPTION
      }
    }
  };

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",
    {matched_patterns: [".*Getting Tenant Quota Values for:.*.memory=>1073741824000.*"]}
  )).waiting({timeout: 120}, () => {
    do_vm_provisioning(appliance, {
      template_name: provisioning.template,
      provider,
      vm_name,
      provisioning_data: prov_data,
      wait: false,
      request: null
    });

    let request_description = `Provision from [${provisioning.template}] to [${vm_name}]`;
    let provision_request = appliance.collections.requests.instantiate(request_description);
    provision_request.wait_for_request({method: "ui"});

    if (!provision_request.is_succeeded({method: "ui"})) {
      throw `Provisioning failed: ${provision_request.row.last_message.text}`
    }
  })
};

function vm_folder(provider) {
  // Create Vm folder on VMWare provider
  let folder = provider.mgmt.create_folder(fauxfactory.gen_alphanumeric({
    start: "test_folder_",
    length: 20
  }));

  yield(folder);
  let fd = folder.Destroy();
  wait_for(() => fd.info.state == "success", {delay: 10, timeout: 150})
};

function test_move_vm_into_folder(appliance, vm_folder, create_vm, custom_instance) {
  // 
  //    Bugzilla:
  //        1716858
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       initialEstimate: 1/4h
  //       tags: automate
  //   
  let script = dedent(`
        vm = $evm.vmdb('vm').find_by_name('${create_vm.name}')
        folder = $evm.vmdb('EmsFolder').find_by(:name => '${vm_folder.name}')
        vm.move_into_folder(folder) unless folder.nil?
        `);
  let instance = custom_instance.call({ruby_code: script});
  let view = navigate_to(create_vm, "Details");
  let tree_path = view.sidebar.vmstemplates.tree.currently_selected;

  simulate({
    appliance,

    attributes_values: {
      namespace: instance.klass.namespace.name,
      class: instance.klass.name,
      instance: instance.name
    },

    message: "create",
    request: "Call_Instance",
    execute_methods: true
  });

  tree_path.pop();
  tree_path.push(vm_folder.name);
  view = navigate_to(create_vm, "Details");

  let _check = () => {
    try {
      view.sidebar.vmstemplates.tree.fill(tree_path);
      return true
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof CandidateNotFound) {
        return false
      } else {
        throw $EXCEPTION
      }
    }
  };

  wait_for(() => _check, {
    fail_func: view.browser.refresh,
    timeout: 600,
    delay: 5,
    message: "Waiting for vm folder name to appear"
  })
};

function test_list_of_diff_vm_storages_via_rails(appliance, setup_provider, provider, testing_vm, custom_instance) {
  // 
  //   Bugzilla:
  //       1574444
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.9
  //       casecomponent: Automate
  //       testSteps:
  //           1. vmware = $evm.vmdb('ems').find_by_name('vmware 6.5 (nested)') ;
  //           2. vm = vmware.vms.select { |v| v.name == 'dgaikwad-cfme510' }.first ;
  //           3. vm.storage
  //           4. vm.storages
  //       expectedResults:
  //           1.
  //           2.
  //           3. Returns only one storage
  //           4. Returns available storages
  //   
  let list_storages = dedent(`vmware = $evm.vmdb(\"ems\").find_by_name(\"${provider.name}\")
vm = vmware.vms.select {|v| v.name == \"${testing_vm.name}\"}.first
storage = vm.storage
storage_name = storage.name
$evm.log(:info, \"storage name: \#{storage_name}\")
storages = vm.storages
storage_name = storages[0].name
$evm.log(:info, \"storages name: \#{storage_name}\")
`);
  let instance = custom_instance.call({ruby_code: list_storages});

  (LogValidator(
    "/var/www/miq/vmdb/log/automation.log",

    {matched_patterns: [
      `.*storage name: ${testing_vm.datastore.name}.*`,
      `.*storages name: ${testing_vm.datastore.name}.*`
    ]}
  )).waiting({timeout: 120}, () => (
    simulate({
      appliance,
      message: "create",
      request: "Call_Instance",
      execute_methods: true,

      attributes_values: {
        namespace: instance.klass.namespace.name,
        class: instance.klass.name,
        instance: instance.name
      }
    })
  ))
}
