// Test for HTML5 Remote Consoles of VMware/RHEV/RHOSP Providers.
require_relative("wait_for");
include(Wait_for);
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);

function test_html5_console_ports_present(appliance, setup_provider, provider) {
  // 
  //   Bugzilla:
  //       1514594
  // 
  //   Check to see if the Add/Edit provider screen has the Host VNC Start Port
  //   and Host VNC End port. Only applicable to versions of VMware that support VNC console.
  // 
  //   Polarion:
  //       assignee: apagac
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //       startsin: 5.8
  //   
  let edit_view = navigate_to(provider, "Edit");
  if (!edit_view.vnc_start_port.is_displayed) throw new ();
  if (!edit_view.vnc_end_port.is_displayed) throw new ()
};

function test_html5_vm_console(appliance, setup_provider, provider, configure_websocket, create_vm, configure_console_vnc, take_screenshot) {
  // 
  //   Test the HTML5 console support for a particular provider.
  // 
  //   The supported providers are:
  // 
  //       VMware
  //       Openstack
  //       RHV
  // 
  //   For a given provider, and a given VM, the console will be opened, and then:
  // 
  //       - The console\'s status will be checked.
  //       - A command that creates a file will be sent through the console.
  //       - Using ssh we will check that the command worked (i.e. that the file
  //         was created.
  //   In the latest 5.11 build, for VMware, if VNC is not available for a VM, CFME Falls forward to
  //   WebMKS. To avoid that from happening, make sure your VM(.vmx)/Template(.vmtx) file
  //   has following two lines in it:
  // 
  //   RemoteDisplay.vnc.enabled = \"true\"
  //   RemoteDisplay.vnc.port = \"5900\"
  // 
  //   If not for above lines, Console may fall forward to WebMKS which is not something we
  //   want in this test case.
  // 
  //   Polarion:
  //       assignee: apagac
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //   
  create_vm.open_console({console: "VM Console"});
  if (!create_vm.vm_console) throw "VMConsole object should be created";
  let vm_console = create_vm.vm_console;

  try {
    if (!vm_console.wait_for_connect(180)) {
      throw "VM Console did not reach 'connected' state"
    };

    if (is_bool(provider.one_of(VMwareProvider))) {
      if (vm_console.console_type != "VNC") {
        throw "Wrong console type: looking for VNC found {}".format(vm_console.console_type)
      }
    };

    Wait_for.wait_for({
      func() {
        return vm_console.get_screen_text() != ""
      },

      delay: 5,
      timeout: 45
    });

    if (!vm_console.get_screen_text()) {
      throw "VM Console screen text returned Empty"
    };

    if (is_bool(!provider.one_of(OpenStackProvider))) {
      if (!vm_console.send_fullscreen()) {
        throw "VM Console Toggle Full Screen button doesn't work"
      }
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
  } finally {
    vm_console.close_console_window();
    appliance.server.logout()
  }
};

// 
//   This testcase is here to reflect testing matrix for html5 consoles. Combinations listed
//   are being tested manually. Originally, there was one testcase for every combination, this
//   approach reduces number of needed testcases.
// 
//   Polarion:
//       assignee: apagac
//       casecomponent: Appliance
//       caseimportance: medium
//       initialEstimate: 1/3h
//       setup:
//           1. Login to CFME Appliance as admin.
//           2. On top right click Administrator|EVM -> Configuration.
//           3. Under VMware Console Support section and click on Dropdown in front
//              of \"Use\" and select \"VNC\".
//           4. Click save at the bottom of the page.
//              This will setup your appliance for using HTML5 VNC Console and not to
//              use VMRC Plug in which is Default when you setup appliance.
//           5. Provision a testing VM.
//       testSteps:
//           1. Navigate to testing VM
//           2. Launch the console by Access -> VM Console
//           3. Make sure the console accepts commands
//           4. Make sure the characters are visible
//       expectedResults:
//           1. VM Details displayed
//           2. Console launched
//           3. Console accepts characters
//           4. Characters not garbled; no visual defect
//   
// pass
function test_html5_console_linux(browser, operating_system, provider) {};

// This testcase is here to reflect testing matrix for html5 consoles. Combinations listed
//   are being tested manually. Originally, there was one testcase for every combination, this
//   approach reduces number of needed testcases.
// 
//   Polarion:
//       assignee: apagac
//       casecomponent: Appliance
//       caseimportance: medium
//       initialEstimate: 1/3h
//       setup:
//           1. Login to CFME Appliance as admin.
//           2. On top right click Administrator|EVM -> Configuration.
//           3. Under VMware Console Support section and click on Dropdown in front
//              of \"Use\" and select \"VNC\".
//           4. Click save at the bottom of the page.
//              This will setup your appliance for using HTML5 VNC Console and not to
//              use VMRC Plug in which is Default when you setup appliance.
//           5. Provision a testing VM.
//       testSteps:
//           1. Navigate to testing VM
//           2. Launch the console by Access -> VM Console
//           3. Make sure the console accepts commands
//           4. Make sure the characters are visible
//       expectedResults:
//           1. VM Details displayed
//           2. Console launched
//           3. Console accepts characters
//           4. Characters not garbled; no visual defect
//   
// pass
function test_html5_console_windows(browser, operating_system, provider) {}
