require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/instance");
include(Cfme.Cloud.Instance);
require_relative("cfme/cloud/instance");
include(Cfme.Cloud.Instance);
require_relative("cfme/cloud/instance/image");
include(Cfme.Cloud.Instance.Image);
require_relative("cfme/cloud/instance/image");
include(Cfme.Cloud.Instance.Image);
require_relative("cfme/common/host_views");
include(Cfme.Common.Host_views);
require_relative("cfme/configure/tasks");
include(Cfme.Configure.Tasks);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/virtual_machines");
include(Cfme.Infrastructure.Virtual_machines);
require_relative("cfme/infrastructure/virtual_machines");
include(Cfme.Infrastructure.Virtual_machines);
require_relative("cfme/infrastructure/virtual_machines");
include(Cfme.Infrastructure.Virtual_machines);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/services/workloads");
include(Cfme.Services.Workloads);
require_relative("cfme/services/workloads");
include(Cfme.Services.Workloads);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.provider([InfraProvider], {selector: ONE})
];

const SPECIAL_LANDING_PAGES = {
  "Services / Workloads / VMs & Instances": WorkloadsVM,
  "Services / Workloads / Templates & Images": WorkloadsTemplate,
  "Compute / Clouds / Instances / Instances": InstanceAllView,
  "Compute / Clouds / Instances / Images": ImageAllView,
  "Compute / Clouds / Instances / Images By Providers": ImageProviderAllView,
  "Compute / Clouds / Instances / Instances By Providers": InstanceProviderAllView,
  "Compute / Infrastructure / Hosts / Nodes": HostsView,
  "Compute / Infrastructure / Virtual Machines / VMs & Templates": VmsTemplatesAllView,
  "Compute / Infrastructure / Virtual Machines / VMs": VmsOnlyAllView,
  "Compute / Infrastructure / Virtual Machines / Templates": TemplatesOnlyAllView,
  "Settings / Tasks": TasksView
};

const ALL_LANDING_PAGES = SPECIAL_LANDING_PAGES.keys().to_a + ([
  "Automation / Ansible / Credentials",
  "Automation / Ansible / Playbooks",
  "Automation / Ansible / Repositories",
  "Automation / Ansible Tower / Explorer",
  "Automation / Ansible Tower / Jobs",
  "Automation / Automate / Customization",
  "Automation / Automate / Explorer",
  "Automation / Automate / Generic Objects",
  "Automation / Automate / Import / Export",
  "Automation / Automate / Log",
  "Automation / Automate / Requests",
  "Automation / Automate / Simulation",
  "Compute / Clouds / Availability Zones",
  "Compute / Clouds / Flavors",
  "Compute / Clouds / Host Aggregates",
  "Compute / Clouds / Key Pairs",
  "Compute / Clouds / Providers",
  "Compute / Clouds / Stacks",
  "Compute / Clouds / Tenants",
  "Compute / Clouds / Topology",
  "Compute / Containers / Container Builds",
  "Compute / Containers / Container Images",
  "Compute / Containers / Container Nodes",
  "Compute / Containers / Container Services",
  "Compute / Containers / Container Templates",
  "Compute / Containers / Containers",
  "Compute / Containers / Image Registries",
  "Compute / Containers / Overview",
  "Compute / Containers / Pods",
  "Compute / Containers / Projects",
  "Compute / Containers / Providers",
  "Compute / Containers / Replicators",
  "Compute / Containers / Routes",
  "Compute / Containers / Topology",
  "Compute / Containers / Volumes",
  "Compute / Infrastructure / Clusters",
  "Compute / Infrastructure / Datastores",
  "Compute / Infrastructure / Networking",
  "Compute / Infrastructure / PXE",
  "Compute / Infrastructure / Providers",
  "Compute / Infrastructure / Resource Pools",
  "Compute / Infrastructure / Topology",
  "Compute / Physical Infrastructure / Chassis",
  "Compute / Physical Infrastructure / Overview",
  "Compute / Physical Infrastructure / Providers",
  "Compute / Physical Infrastructure / Racks",
  "Compute / Physical Infrastructure / Servers",
  "Compute / Physical Infrastructure / Storages",
  "Compute / Physical Infrastructure / Switches",
  "Compute / Physical Infrastructure / Topology",
  "Configuration / Management",
  "Control / Explorer",
  "Control / Import / Export",
  "Control / Log",
  "Control / Simulation",
  "Monitor / Alerts / All Alerts",
  "Monitor / Alerts / Most Recent Alerts",
  "Monitor / Alerts / Overview",
  "Networks / Floating IPs",
  "Networks / Network Ports",
  "Networks / Network Routers",
  "Networks / Networks",
  "Networks / Providers",
  "Networks / Security Groups",
  "Networks / Subnets",
  "Networks / Topology",
  "Optimize / Bottlenecks",
  "Optimize / Planning",
  "Optimize / Utilization",
  "Services / Catalogs",
  "Services / My Services",
  "Services / Requests",
  "Storage / Block Storage / Managers",
  "Storage / Block Storage / Volume Backups",
  "Storage / Block Storage / Volume Snapshots",
  "Storage / Block Storage / Volume Types",
  "Storage / Block Storage / Volumes",
  "Storage / Object Storage / Managers",
  "Storage / Object Storage / Object Store Containers",
  "Storage / Object Storage / Object Store Objects"
]);

const PAGES_NOT_IN_510 = [
  "Overview / Chargeback",
  "Overview / Dashboard",
  "Overview / Reports",
  "Overview / Utilization",
  "Compute / Physical Infrastructure / Chassis",
  "Compute / Physical Infrastructure / Overview",
  "Compute / Physical Infrastructure / Providers",
  "Compute / Physical Infrastructure / Racks",
  "Compute / Physical Infrastructure / Servers",
  "Compute / Physical Infrastructure / Storages",
  "Compute / Physical Infrastructure / Switches",
  "Compute / Physical Infrastructure / Topology",
  "Storage / Block Storage / Volume Types"
];

const PAGES_NOT_IN_511 = [
  "Cloud Intel / Chargeback",
  "Cloud Intel / Dashboard",
  "Cloud Intel / RSS",
  "Cloud Intel / Reports",
  "Cloud Intel / Timelines",
  "Monitor / Alerts / Most Recent Alerts",
  "Networks / Load Balancers",
  "Optimize / Bottlenecks",
  "Optimize / Planning",
  "Optimize / Utilization"
];

function my_settings(appliance) {
  return appliance.user.my_settings
};

function set_default_page(my_settings) {
  let default_page = my_settings.visual.login_page;
  yield;
  my_settings.visual.login_page = default_page
};

function set_landing_page(appliance, my_settings, start_page) {
  my_settings.visual.login_page = start_page;
  appliance.server.logout()
};

function test_landing_page_admin(appliance, request, set_default_page, set_landing_page, start_page) {
  // 
  //   This test checks the functioning of the landing page; 'Start at Login'
  //   option on 'Visual' tab of setting page for administrator. This test case
  //   check the exact page and verifies that all the landing page options works properly.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Configuration
  //       initialEstimate: 1/8h
  //       tags: settings
  //       setup:
  //           1. Navigate to `My Settings` > `Visual` > `Start Page` and fill `Show at login`.
  //           2. Logout and Login
  //       testSteps:
  //           1. Check the page displayed.
  //       expectedResults:
  //           1. The page displayed must be same as what  was set.
  // 
  //   Bugzilla:
  //       1656722
  //   
  let logged_in_page = appliance.server.login_admin();
  let steps = start_page.split_p("/").map(x => x.strip());

  if (start_page.include("Import / Export")) {
    steps = (steps[_.range(0, -2)]) + (["Import / Export"])
  } else if (start_page.include("Most Recent Alerts")) {
    steps = steps[_.range(0, -1)]
  };

  if (SPECIAL_LANDING_PAGES.include(start_page)) {
    let view = appliance.browser.create_view(SPECIAL_LANDING_PAGES[start_page]);

    if ([
      "Compute / Clouds / Instances / Images By Providers",
      "Compute / Clouds / Instances / Instances By Providers"
    ].include(start_page)) {
      if (view.entities.title.text != "All {} by Provider".format((steps[-1]).split()[0])) {
        throw new ()
      }
    } else if (!view.is_displayed) {
      throw "Landing Page Failed"
    }
  } else if (logged_in_page.navigation.currently_selected != steps) {
    throw "Landing Page Failed"
  }
}
