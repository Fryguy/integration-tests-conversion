require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/tests/infrastructure/test_provisioning_dialog");
include(Cfme.Tests.Infrastructure.Test_provisioning_dialog);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);

let filter_fields = {required_fields: [
  ["provisioning", "template"],
  ["provisioning", "host"],
  ["provisioning", "datastore"]
]};

let infra_filter = ProviderFilter({
  classes: [InfraProvider],
  None: filter_fields
});

let not_vmware = ProviderFilter({
  classes: [VMwareProvider],
  inverted: true
});

let pytestmark = [
  pytest.mark.meta({roles: "+automate"}),

  pytest.mark.provider({
    gen_func: providers,
    filters: [infra_filter],
    scope: "module"
  }),

  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.long_running
];

function clone_vm_name() {
  let clone_vm_name = fauxfactory.gen_alphanumeric(
    18,
    {start: "test_cloning_"}
  );

  return clone_vm_name
};

function test_vm_clone(appliance, provider, clone_vm_name, create_vm) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  //   
  let provision_type = "VMware";

  create_vm.clone_vm(
    "email@xyz.com",
    "first",
    "last",
    clone_vm_name,
    provision_type
  );

  let request_description = clone_vm_name;

  let request_row = appliance.collections.requests.instantiate(
    request_description,
    {partial_check: true}
  );

  check_all_tabs(request_row, provider);
  request_row.wait_for_request({method: "ui"});
  let msg = `Request failed with the message ${request_row.row.last_message.text}`;
  if (!request_row.is_succeeded({method: "ui"})) throw msg
};

function test_template_clone(request, appliance, provider, clone_vm_name) {
  let provision_type;

  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  //       caseimportance: high
  //   
  let cloned_template_name = provider.data.provisioning.template;

  let vm = appliance.collections.infra_templates.instantiate(
    cloned_template_name,
    provider
  );

  if (is_bool(provider.one_of(VMwareProvider))) {
    provision_type = "VMware"
  } else {
    provision_type = "Native Clone"
  };

  let template_clone_cleanup = () => {
    let cloned_template;
    let collections = appliance.collections;

    if (is_bool(BZ(1797733).blocks)) {
      cloned_template = collections.infra_vms.instantiate(
        method("clone_vm_name"),
        provider
      )
    } else {
      cloned_template = collections.infra_templates.instantiate(
        method("clone_vm_name"),
        provider
      )
    };

    return cloned_template.delete()
  };

  vm.clone_template(
    "email@xyz.com",
    "first",
    "last",
    method("clone_vm_name"),
    provision_type
  );

  let request_row = appliance.collections.requests.instantiate(
    method("clone_vm_name"),
    {partial_check: true}
  );

  if (is_bool(!BZ(1797706).blocks && provider.one_of(RHEVMProvider))) {
    check_all_tabs(request_row, provider)
  };

  request_row.wait_for_request({method: "ui"});
  let msg = `Request failed with the message ${request_row.row.last_message.text}`;
  if (!request_row.is_succeeded({method: "ui"})) throw msg
};

function test_vm_clone_neg(provider, clone_vm_name, create_vm) {
  // Tests that we can't clone non-VMware VM
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Provisioning
  //       initialEstimate: 1/6h
  //   
  let provision_type = "VMware";

  pytest.raises(DropdownItemNotFound, () => (
    create_vm.clone_vm(
      "email@xyz.com",
      "first",
      "last",
      clone_vm_name,
      provision_type
    )
  ))
}
