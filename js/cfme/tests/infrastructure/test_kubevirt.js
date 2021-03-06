require_relative("cfme/infrastructure/provider/kubevirt");
include(Cfme.Infrastructure.Provider.Kubevirt);
require_relative("cfme/provisioning");
include(Cfme.Provisioning);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/generators");
include(Cfme.Utils.Generators);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);

let pytestmark = [
  pytest.mark.provider([KubeVirtProvider]),
  pytest.mark.usefixtures("setup_provider")
];

function temp_vm(appliance, provider, provisioning) {
  let template_name = provisioning.template;
  let vm_name = random_vm_name("k6tvm");
  let prov_data = {catalog: {vm_name: vm_name}};

  let vm = appliance.collections.infra_vms.instantiate({
    name: vm_name,
    provider,
    template_name
  });

  let note = `template ${template_name} to vm ${vm_name} on provider ${provider.key}`;

  prov_data.update({request: {
    email: "template_provisioner@example.com",
    first_name: "Template",
    last_name: "Provisioner",
    notes: note
  }});

  let view = navigate_to(vm.parent, "Provision");
  view.form.fill_with(prov_data, {on_change: view.form.submit_button});
  view.flash.assert_no_error();
  vm.wait_to_appear();
  yield(vm);
  vm.retire()
};

function test_k6t_provider_crud(provider) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       initialEstimate: 1/4h
  //       casecomponent: Infra
  //   
  update(
    provider,
    () => provider.name = fauxfactory.gen_alphanumeric({start: "edited_"})
  );

  provider.delete();
  provider.wait_for_delete()
};

function test_k6t_vm_crud(request, appliance, provider, provisioning, custom_prov_data) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       initialEstimate: 1/4h
  //       casecomponent: Infra
  //   
  let vm_name = random_vm_name("k6tvm");
  let prov_data = {catalog: {vm_name: vm_name}};
  provider.refresh_provider_relationships();
  prov_data.update(custom_prov_data);
  let template = provisioning.template;

  do_vm_provisioning(
    appliance,
    template,
    provider,
    vm_name,
    prov_data,
    request,
    {wait: false}
  );

  logger.info("Waiting for cfme provision request for vm %s", vm_name);
  let request_description = `Provision from [${template}] to [${vm_name}]`;
  let provision_request = appliance.collections.requests.instantiate(request_description);
  provision_request.wait_for_request({method: "ui", num_sec: 300});

  if (!provision_request.is_succeeded({method: "ui"})) {
    throw `Provisioning failed with the message ${provision_request.row.last_message.text}`
  }
};

function test_vm_power_management(request, appliance, provider, temp_vm, from_details, power_option, vm_state) {
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       initialEstimate: 1/4h
  //       casecomponent: Infra
  //   
  temp_vm.power_control_from_cfme({from_details, option: power_option});
  provider.refresh_provider_relationships();
  if (!temp_vm.find_quadicon().data.state.include(vm_state)) throw new ()
}
