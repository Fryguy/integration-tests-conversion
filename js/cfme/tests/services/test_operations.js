// Tests checking for link access from outside.
require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/browser");
include(Cfme.Utils.Browser);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.meta({server_roles: "-automate"}),
  test_requirements.service,

  pytest.mark.provider({
    classes: [InfraProvider],
    scope: "module",
    selector: ONE
  }),

  pytest.mark.usefixtures("setup_provider_modscope")
];

function provisioning(provider) {
  return provider.data.get("provisioning", {})
};

function template_name(provisioning) {
  return provisioning.get("template")
};

function vm_name() {
  return fauxfactory.gen_alphanumeric({length: 16})
};

function generated_request(appliance, provider, provisioning, template_name, vm_name) {
  // Creates a provision request, that is not automatically approved, and returns the search data.
  // 
  //   After finishing the test, request should be automatically deleted.
  // 
  //   Slightly modified code from :py:module:`cfme.tests.infrastructure.test_provisioning`
  //   
  if (is_bool(provider.one_of(RHEVMProvider) && provisioning.get("vlan") === null)) {
    pytest.skip("rhevm requires a vlan value in provisioning info")
  };

  let first_name = fauxfactory.gen_alphanumeric();
  let last_name = fauxfactory.gen_alphanumeric();
  let notes = fauxfactory.gen_alphanumeric();
  let e_mail = `${first_name}@${last_name}.test`;
  let [host, datastore] = ["host", "datastore"].map(_ => provisioning.get(_)).to_a;

  let vm = appliance.collections.infra_vms.instantiate({
    name: vm_name,
    provider,
    template_name
  });

  let view = navigate_to(vm.parent, "Provision");

  let provisioning_data = {
    request: {
      email: e_mail,
      first_name: first_name,
      last_name: last_name,
      notes: notes
    },

    catalog: {vm_name: vm_name, num_vms: "10"},

    environment: {
      host_name: {name: host},
      datastore_name: {name: datastore}
    },

    network: {vlan: partial_match((is_bool(provisioning.get("vlan")) ? provisioning.vlan : null))}
  };

  if (is_bool(provider.one_of(RHEVMProvider))) {
    provisioning_data.catalog.provision_type = "Native Clone"
  } else if (is_bool(provider.one_of(VMwareProvider))) {
    provisioning_data.catalog.provision_type = "VMware"
  };

  provisioning_data.template_name = template_name;
  provisioning_data.provider_name = provider.name;

  view.form.fill_with(
    provisioning_data,
    {on_change: view.form.submit_button}
  );

  let request_cells = {Description: `Provision from [${template_name}] to [${vm_name}###]`};
  let provision_request = appliance.collections.requests.instantiate({cells: request_cells});
  yield(provision_request);
  browser().get(appliance.url);
  appliance.server.login_admin();
  provision_request.remove_request()
};

function test_services_request_direct_url(appliance, generated_request) {
  // Go to the request page, save the url and try to access it directly.
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/8h
  //       casecomponent: Services
  //   
  let widgetastic = appliance.browser.widgetastic;
  let selenium = widgetastic.selenium;

  if (!navigate_to(generated_request, "Details")) {
    throw "could not find the request!"
  };

  let request_url = selenium.current_url;
  navigate_to(appliance.server, "Configuration");
  selenium.get(request_url);

  wait_for(
    () => widgetastic.is_displayed("//body[contains(@onload, 'miqOnLoad')]"),
    {num_sec: 20, message: "wait for a CFME page appear", delay: 0.5}
  )
};

function test_copy_request(request, generated_request, vm_name, template_name) {
  // Check if request gets properly copied.
  // 
  //   Polarion:
  //       assignee: nansari
  //       initialEstimate: 1/4h
  //       casecomponent: Services
  //   
  let new_vm_name = `${vm_name}-xx`;
  let modifications = {catalog: {vm_name: new_vm_name}};
  let new_request = generated_request.copy_request({values: modifications});
  request.addfinalizer(new_request.remove_request);
  if (!navigate_to(new_request, "Details")) throw new ()
}
