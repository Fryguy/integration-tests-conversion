require_relative("cfme");
include(Cfme);
require_relative("cfme/services");
include(Cfme.Services);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.settings,
  pytest.mark.usefixtures("infra_provider")
];

function test_default_filters_reset(appliance) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: high
  //       initialEstimate: 1/8h
  //       tags: settings
  //   
  let tree_path = [
    "Cloud",
    "Instances",
    "Images",
    "Platform / Openstack"
  ];

  let view = navigate_to(appliance.user.my_settings, "DefaultFilters");
  let node = view.tabs.default_filters.tree.CheckNode(tree_path);
  view.tabs.default_filters.tree.fill(node);
  view.tabs.default_filters.reset.click();
  view.flash.assert_message("All changes have been reset")
};

function test_cloudimage_defaultfilters(appliance) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: settings
  //   
  let filters = [["Cloud", "Instances", "Images", "Platform / Amazon"]];
  let tree_path = ["All Images", "Global Filters", "Platform / Amazon"];

  appliance.user.my_settings.default_filters.update({filters: filters.map(k => (
    [k, true]
  ))});

  let view = navigate_to(appliance.collections.cloud_images, "All");

  if (!view.sidebar.images.tree.has_path(...tree_path)) {
    throw "Default Filter settings Failed!"
  }
};

function test_cloudinstance_defaultfilters(appliance) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: settings
  //   
  let filters = [[
    "Cloud",
    "Instances",
    "Instances",
    "Platform / Openstack"
  ]];

  let tree_path = [
    "All Instances",
    "Global Filters",
    "Platform / Openstack"
  ];

  appliance.user.my_settings.default_filters.update({filters: filters.map(k => (
    [k, true]
  ))});

  let view = navigate_to(appliance.collections.cloud_instances, "All");

  if (!view.sidebar.instances.tree.has_path(...tree_path)) {
    throw "Default Filter settings Failed!"
  }
};

function test_infrastructurehost_defaultfilters(appliance) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: settings
  //   
  let filters = [["Infrastructure", "Hosts", "Platform / HyperV"]];

  appliance.user.my_settings.default_filters.update({filters: filters.map(k => (
    [k, true]
  ))});

  let host_collecton = appliance.collections.hosts;
  let view = navigate_to(host_collecton, "All");

  if (!view.filters.navigation.has_item("Platform / HyperV")) {
    throw "Default Filter settings Failed!"
  }
};

function test_infrastructurevms_defaultfilters(appliance) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: settings
  //   
  let filters = [[
    "Infrastructure",
    "Virtual Machines",
    "VMs",
    "Platform / VMware"
  ]];

  let tree_path = ["All VMs", "Global Filters", "Platform / VMware"];

  appliance.user.my_settings.default_filters.update({filters: filters.map(k => (
    [k, true]
  ))});

  let view = navigate_to(appliance.collections.infra_vms, "VMsOnly");

  if (!view.sidebar.vms.tree.has_path(...tree_path)) {
    throw "Default Filter settings Failed!"
  }
};

function test_infrastructuretemplates_defaultfilters(appliance) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: settings
  //   
  let filters = [[
    "Infrastructure",
    "Virtual Machines",
    "Templates",
    "Platform / Redhat"
  ]];

  let tree_path = [
    "All Templates",
    "Global Filters",
    "Platform / Redhat"
  ];

  appliance.user.my_settings.default_filters.update({filters: filters.map(k => (
    [k, true]
  ))});

  let view = navigate_to(
    appliance.collections.infra_templates,
    "TemplatesOnly"
  );

  if (!view.sidebar.templates.tree.has_path(...tree_path)) {
    throw "Default Filter settings Failed!"
  }
};

function test_servicetemplateandimages_defaultfilters(appliance, request) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: settings
  //   
  let filters = [[
    "Services",
    "Workloads",
    "Templates & Images",
    "Platform / Microsoft"
  ]];

  let tree_path = [
    "All Templates & Images",
    "Global Filters",
    "Platform / Microsoft"
  ];

  appliance.user.my_settings.default_filters.update({filters: filters.map(k => (
    [k, true]
  ))});

  let templates_images = workloads.TemplatesImages(appliance);
  let view = navigate_to(templates_images, "All");

  request.addfinalizer(() => (
    appliance.user.my_settings.default_filters.update({filters: filters.map(k => (
      [k, false]
    ))})
  ));

  if (!view.templates.tree.has_path(...tree_path)) {
    throw "Default Filter settings Failed!"
  }
};

function test_servicevmsandinstances_defaultfilters(appliance, request) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Settings
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       tags: settings
  //   
  let filters = [[
    "Services",
    "Workloads",
    "VMs & Instances",
    "Platform / Openstack"
  ]];

  let tree_path = [
    "All VMs & Instances",
    "Global Filters",
    "Platform / Openstack"
  ];

  appliance.user.my_settings.default_filters.update({filters: filters.map(k => (
    [k, true]
  ))});

  let vms_instance = workloads.VmsInstances(appliance);
  let view = navigate_to(vms_instance, "All");

  request.addfinalizer(() => (
    appliance.user.my_settings.default_filters.update({filters: filters.map(k => (
      [k, false]
    ))})
  ));

  if (!view.vms.tree.has_path(...tree_path)) {
    throw "Default Filter settings Failed!"
  }
}
