// Test for HTML5 Remote Consoles of VMware/RHEV/RHOSP Providers.
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/services/myservice");
include(Cfme.Services.Myservice);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

function test_vm_console_ssui(request, appliance, setup_provider, provider, context, configure_console_webmks, configure_console_vnc, order_service, take_screenshot, configure_websocket, console_template) {
  // Test Myservice VM Console in SSUI.
  // 
  //   Metadata:
  //       test_flag: ssui
  // 
  //   Polarion:
  //       assignee: apagac
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/2h
  //   
  if (is_bool(provider.one_of(VMwareProvider) && appliance.version < "5.11")) {
    appliance.server.settings.update_vmware_console({console_type: "VNC"});

    request.addfinalizer(() => (
      appliance.server.settings.update_vmware_console({console_type: "VMware VMRC Plugin"})
    ))
  };

  let catalog_item = order_service;
  let service_name = catalog_item.name;

  appliance.context.use(context, () => {
    let myservice = MyService(appliance, service_name);
    let vm_obj = myservice.launch_vm_console(catalog_item);
    let vm_console = vm_obj.vm_console;

    if (is_bool(provider.one_of(OpenStackProvider))) {
      let public_net = provider.data.public_network;
      vm_obj.mgmt.assign_floating_ip(public_net)
    };

    request.addfinalizer(vm_console.close_console_window);
    request.addfinalizer(appliance.server.logout);

    try {
      if (!vm_console.wait_for_connect(180)) {
        throw "VM Console did not reach 'connected' state"
      };

      wait_for({
        func() {
          return vm_console.get_screen_text() != ""
        },

        delay: 5,
        timeout: 45
      });

      if (!vm_console.get_screen_text()) {
        throw "VM Console screen text returned Empty"
      }
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof Exception) {
        vm_console.switch_to_console();
        take_screenshot.call("ConsoleScreenshot");
        vm_console.switch_to_appliance();
        throw new ()
      } else {
        throw $EXCEPTION
      }
    }
  })
};

// 
//   This testcase is here to reflect testing matrix for html5 consoles going via ssui.
//   Combinations listed are being tested manually. Originally, there was one testcase for every
//   combination, this approach reduces number of needed testcases.
// 
//   Polarion:
//       assignee: apagac
//       casecomponent: Appliance
//       initialEstimate: 2/3h
//       setup:
//           1. Login to CFME Appliance as admin.
//           2. On top right click Administrator|EVM -> Configuration.
//           3. Under VMware Console Support section and click on Dropdown in front
//              of \"Use\" and select \"VNC\".
//           4. Click save at the bottom of the page.
//              This will setup your appliance for using HTML5 VNC Console and not to
//              use VMRC Plug in which is Default when you setup appliance.
//           6. Create a service dialog and catalog that provisions a VM
//       testSteps:
//           1. Via ssui, order the catalog and wait for VM provision
//           2. Via ssui, navigate to service details and click on
//               Access-> VM Console for testing VM
//           3. Make sure the console accepts commands
//           4. Make sure the characters are visible
//       expectedResults:
//           1. Catalog ordered; VM provisioned
//           3. Console accepts characters
//           4. Characters not garbled; no visual defect
//   
// pass
function test_html5_ssui_console_linux(appliance, browser, operating_system, provider) {};

// 
//   This testcase is here to reflect testing matrix for html5 consoles going via ssui.
//   Combinations listed are being tested manually. Originally, there was one testcase for every
//   combination, this approach reduces number of needed testcases.
// 
//   Polarion:
//       assignee: apagac
//       casecomponent: Appliance
//       initialEstimate: 2/3h
//       setup:
//           1. Login to CFME Appliance as admin.
//           2. On top right click Administrator|EVM -> Configuration.
//           3. Under VMware Console Support section and click on Dropdown in front
//              of \"Use\" and select \"VNC\".
//           4. Click save at the bottom of the page.
//              This will setup your appliance for using HTML5 VNC Console and not to
//              use VMRC Plug in which is Default when you setup appliance.
//           6. Create a service dialog and catalog that provisions a VM
//       testSteps:
//           1. Via ssui, order the catalog and wait for VM provision
//           2. Via ssui, navigate to service details and click on
//               Access-> VM Console for testing VM
//           3. Make sure the console accepts commands
//           4. Make sure the characters are visible
//       expectedResults:
//           1. Catalog ordered; VM provisioned
//           3. Console accepts characters
//           4. Characters not garbled; no visual defect
//   
// pass
function test_html5_ssui_console_windows(appliance, browser, operating_system, provider) {}
