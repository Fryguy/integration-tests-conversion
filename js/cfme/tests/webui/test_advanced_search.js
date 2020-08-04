require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/physical/provider");
include(Cfme.Physical.Provider);
require_relative("cfme/services/myservice");
include(Cfme.Services.Myservice);
require_relative("cfme/services/workloads");
include(Cfme.Services.Workloads);
require_relative("cfme/services/workloads");
include(Cfme.Services.Workloads);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);

const SearchParam = namedtuple(
  "SearchParam",
  ["collection", "destination", "entity", "filter", "my_filters"]
);

let pytestmark = [
  pytest.mark.uncollectif(
    (param, appliance) => (
      appliance.version >= "5.11" && param.entity == "network_load_balancers"
    ),

    {reason: "load balancers are no longer supported in 5.11 -> BZ 1672949 "}
  ),

  pytest.mark.meta({automates: [BZ(1402392), BZ(1777493)]})
];

function _navigation(param, appliance) {
  let view;

  if (is_bool(param.collection.is_a(String))) {
    view = navigate_to(
      appliance.collections.getattr(param.collection),
      param.destination
    )
  } else {
    view = navigate_to(param.collection, param.destination)
  };

  return view
};

function _filter_displayed(filters, filter) {
  if (is_bool(filters.is_displayed)) {
    if (!filter) throw "Filter wasn't created!"
  } else {
    pytest.fail("Filter wasn't created or filters tree is not displayed!")
  }
};

function _select_filter(filters, filter_name, param) {
  if (is_bool(param.my_filters)) {
    if (is_bool(param.my_filters.is_a(Array))) {
      filters.tree.click_path(
        param.my_filters[1],
        "My Filters",
        filter_name
      )
    } else {
      filters.tree.click_path("My Filters", filter_name)
    }
  } else {
    filters.navigation.select(filter_name)
  }
};

function _can_open_advanced_search(param, appliance) {
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: critical
  //       initialEstimate: 1/10h
  //   
  let view = _navigation(param, appliance);

  if (!view.search.is_advanced_search_possible) {
    throw `Advanced search not displayed for ${param.entity} on ${param.destination.downcase()}`
  };

  view.search.open_advanced_search();

  if (!view.search.is_advanced_search_opened) {
    throw `Advanced search failed to open for ${param.entity} on ${param.destination.downcase()}`
  };

  view.search.close_advanced_search();

  if (!!view.search.is_advanced_search_opened) {
    throw `Advanced search failed to close for ${param.entity} on ${param.destination.downcase()}`
  }
};

function _filter_crud(param, appliance) {
  let filters;

  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       caseimportance: high
  //       initialEstimate: 1/10h
  //   
  let filter_name = fauxfactory.gen_string("alphanumeric", 10);
  let filter_value = fauxfactory.gen_string("alphanumeric", 10);
  let filter_value_updated = fauxfactory.gen_string("alphanumeric", 10);
  let view = _navigation(param, appliance);

  if (!param.filter.include(":")) {
    filter_value = fauxfactory.gen_numeric_string(3);
    filter_value_updated = fauxfactory.gen_numeric_string(3);

    view.search.save_filter(
      `fill_count(${param.filter}, =, ${filter_value})`,
      filter_name
    )
  } else {
    view.search.save_filter(
      `fill_field(${param.filter}, =, ${filter_value})`,
      filter_name
    )
  };

  view.search.close_advanced_search();
  view.flash.assert_no_error();

  if (is_bool(param.my_filters)) {
    if (is_bool(param.my_filters.is_a(Array))) {
      filters = operator.attrgetter(param.my_filters[0]).call(view);

      _filter_displayed(
        filters,
        filters.tree.has_path(param.my_filters[1], "My Filters", filter_name)
      )
    } else {
      filters = operator.attrgetter(param.my_filters).call(view);

      _filter_displayed(
        filters,
        filters.tree.has_path("My Filters", filter_name)
      )
    }
  } else {
    filters = view.my_filters;
    _filter_displayed(filters, filters.navigation.has_item(filter_name))
  };

  _select_filter(filters, filter_name, param);
  view.search.open_advanced_search();
  view.search.advanced_search_form.search_exp_editor.select_first_expression();

  if (!param.filter.include(":")) {
    view.search.advanced_search_form.search_exp_editor.fill_count({
      count: param.filter,
      key: "=",
      value: filter_value_updated
    })
  } else {
    view.search.advanced_search_form.search_exp_editor.fill_field({
      field: param.filter,
      key: "=",
      value: filter_value_updated
    })
  };

  view.search.advanced_search_form.save_filter_button.click();
  view.search.advanced_search_form.save_filter_button.click();
  view.search.close_advanced_search();
  _select_filter(filters, filter_name, param);
  view.search.open_advanced_search();
  let exp_text = view.search.advanced_search_form.search_exp_editor.expression_text;
  if (!exp_text.include(filter_value_updated)) throw "Filter wasn't changed!";
  view.search.delete_filter();
  view.search.close_advanced_search();

  if (is_bool(param.my_filters)) {
    if (is_bool(filters.is_displayed)) {
      if (is_bool(param.my_filters.is_a(Array))) {
        if (!!filters.tree.has_path(
          param.my_filters[1],
          "My Filters",
          filter_name
        )) throw "Filter wasn't deleted!"
      } else if (!!filters.tree.has_path("My Filters", filter_name)) {
        throw "Filter wasn't deleted!"
      }
    }
  } else if (is_bool(view.my_filters.is_displayed)) {
    if (!!view.my_filters.navigation.has_item(filter_name)) {
      throw "Filter wasn't deleted!"
    }
  }
};

let _tests = [_can_open_advanced_search, _filter_crud];

function methodized(metafunc) {
  // Transform function to method by adding self argument
  // 
  //   works just for specific functions in this file, would be nice to generalize
  //   TODO generalize for more tests with possibly different arguments
  //   
  func.__doc__ = method(metafunc).__doc__;
  return func
};

function inject_tests(metaclass) {
  // Attach tests to decorated class
  // 
  //   uses _tests - list of test functions
  //   
  for (let test in _tests) {
    let method = methodized(test);
    setattr(metaclass, `test${test.__name__}`, method)
  };

  return metaclass
};

function base_pytestmarks(param_values, { setup_prov = false }) {
  return (([
    test_requirements.filtering,

    pytest.mark.parametrize("param", param_values, {
      ids: param_values.map(param => (
        ("{}-{}").format(param.entity, param.destination.downcase())
      )),

      scope: "class"
    })
  ]) + is_bool(setup_prov) ? [pytest.mark.usefixtures("setup_provider")] : [])
};

class TestCloud {
  #params_values;
  #pytestmark;

  static #params_values = [
    SearchParam(
      "cloud_providers",
      "All",
      "cloudprovider",
      "Cloud Provider : Name",
      null
    ),

    SearchParam(
      "cloud_av_zones",
      "All",
      "availabilityzone",
      "Availability Zone : Name",
      null
    ),

    SearchParam(
      "cloud_host_aggregates",
      "All",
      "hostaggregate",
      "Host Aggregate : Name",
      null
    ),

    SearchParam(
      "cloud_tenants",
      "All",
      "tenant",
      "Cloud Tenant : Name",
      null
    ),

    SearchParam("cloud_flavors", "All", "flavor", "Flavor : Name", null),

    SearchParam(
      "cloud_instances",
      "All",
      "instances",
      "Instance : Name",
      ["sidebar.instances", "All Instances"]
    ),

    SearchParam(
      "cloud_images",
      "All",
      "images",
      "Image : Name",
      ["sidebar.images", "All Images"]
    ),

    SearchParam(
      "cloud_stacks",
      "All",
      "orchestration_stacks",
      "Orchestration Stack : Name",
      null
    ),

    SearchParam(
      "cloud_keypairs",
      "All",
      "key_pairs",
      "Key Pair : Name",
      null
    )
  ];

  static #pytestmark = base_pytestmarks(
    this.params_values,
    {setup_prov: true}
  );

  static get params_values() {
    return TestCloud.#params_values
  };

  static set params_values(val) {
    TestCloud.#params_values = val
  };

  get params_values() {
    if (this.#params_values.nil) this.#params_values = TestCloud.#params_values;
    return this.#params_values
  };

  set params_values(val) {
    this.#params_values = val
  };

  static get pytestmark() {
    return TestCloud.#pytestmark
  };

  static set pytestmark(val) {
    TestCloud.#pytestmark = val
  };

  get pytestmark() {
    if (this.#pytestmark.nil) this.#pytestmark = TestCloud.#pytestmark;
    return this.#pytestmark
  };

  set pytestmark(val) {
    this.#pytestmark = val
  }
};

class TestNetwork {
  #params_values;
  #pytestmark;

  static #params_values = [
    SearchParam(
      "network_providers",
      "All",
      "network_managers",
      "Network Manager : Name",
      null
    ),

    SearchParam(
      "network_providers",
      "All",
      "network_managers",
      "Network Manager : Name",
      null
    ),

    SearchParam(
      "cloud_networks",
      "All",
      "network_networks",
      "Cloud Network : Name",
      null
    ),

    SearchParam(
      "network_subnets",
      "All",
      "network_subnets",
      "Cloud Subnet : Name",
      null
    ),

    SearchParam(
      "network_routers",
      "All",
      "network_routers",
      "Network Router : Name",
      null
    ),

    SearchParam(
      "network_security_groups",
      "All",
      "network_security_groups",
      "Security Group : Name",
      null
    ),

    SearchParam(
      "network_floating_ips",
      "All",
      "network_floating_ips",
      "Floating IP : Address",
      null
    ),

    SearchParam(
      "network_ports",
      "All",
      "network_ports",
      "Network Port : Name",
      null
    ),

    SearchParam(
      "balancers",
      "All",
      "network_load_balancers",
      "Load Balancer : Name",
      null
    )
  ];

  static #pytestmark = base_pytestmarks(
    this.params_values,
    {setup_prov: true}
  );

  static get params_values() {
    return TestNetwork.#params_values
  };

  static set params_values(val) {
    TestNetwork.#params_values = val
  };

  get params_values() {
    if (this.#params_values.nil) this.#params_values = TestNetwork.#params_values;
    return this.#params_values
  };

  set params_values(val) {
    this.#params_values = val
  };

  static get pytestmark() {
    return TestNetwork.#pytestmark
  };

  static set pytestmark(val) {
    TestNetwork.#pytestmark = val
  };

  get pytestmark() {
    if (this.#pytestmark.nil) this.#pytestmark = TestNetwork.#pytestmark;
    return this.#pytestmark
  };

  set pytestmark(val) {
    this.#pytestmark = val
  }
};

class TestInfra {
  #params_values;
  #pytestmark;

  static #params_values = [
    SearchParam(
      "infra_providers",
      "All",
      "infraproviders",
      "Infrastructure Provider : Name",
      null
    ),

    SearchParam(
      "clusters",
      "All",
      "clusters",
      "Cluster / Deployment Role : Name",
      null
    ),

    SearchParam("hosts", "All", "hosts", "Host / Node : Name", null),
    SearchParam("hosts", "All", "hosts", "Host / Node.VMs", null),

    SearchParam(
      "infra_vms",
      "VMsOnly",
      "vms",
      "Virtual Machine : Name",
      ["sidebar.vms", "All VMs"]
    ),

    SearchParam(
      "infra_templates",
      "TemplatesOnly",
      "templates",
      "Template : Name",
      ["sidebar.templates", "All Templates"]
    ),

    SearchParam(
      "resource_pools",
      "All",
      "resource_pools",
      "Resource Pool : Name",
      null
    ),

    SearchParam(
      "datastores",
      "All",
      "datastores",
      "Datastore : Name",
      ["sidebar.datastores", "All Datastores"]
    ),

    SearchParam(
      VmsInstances,
      "All",
      "workloads_vms",
      "VM and Instance : Name",
      ["vms", "All VMs & Instances"]
    ),

    SearchParam(
      TemplatesImages,
      "All",
      "workloads_templates",
      "VM Template and Image : Name",
      ["templates", "All Templates & Images"]
    )
  ];

  static #pytestmark = base_pytestmarks(
    this.params_values,
    {setup_prov: true}
  );

  static get params_values() {
    return TestInfra.#params_values
  };

  static set params_values(val) {
    TestInfra.#params_values = val
  };

  get params_values() {
    if (this.#params_values.nil) this.#params_values = TestInfra.#params_values;
    return this.#params_values
  };

  set params_values(val) {
    this.#params_values = val
  };

  static get pytestmark() {
    return TestInfra.#pytestmark
  };

  static set pytestmark(val) {
    TestInfra.#pytestmark = val
  };

  get pytestmark() {
    if (this.#pytestmark.nil) this.#pytestmark = TestInfra.#pytestmark;
    return this.#pytestmark
  };

  set pytestmark(val) {
    this.#pytestmark = val
  }
};

class TestPhysical {
  #params_values;
  #pytestmark;

  static #params_values = [
    SearchParam(
      "physical_providers",
      "All",
      "physical_providers",
      "Physical Infrastructure Provider : Name",
      null
    ),

    SearchParam(
      "physical_servers",
      "All",
      "physical_servers",
      "Physical Server : Name",
      null
    )
  ];

  static #pytestmark = base_pytestmarks(
    this.params_values,
    {setup_prov: true}
  );

  static get params_values() {
    return TestPhysical.#params_values
  };

  static set params_values(val) {
    TestPhysical.#params_values = val
  };

  get params_values() {
    if (this.#params_values.nil) this.#params_values = TestPhysical.#params_values;
    return this.#params_values
  };

  set params_values(val) {
    this.#params_values = val
  };

  static get pytestmark() {
    return TestPhysical.#pytestmark
  };

  static set pytestmark(val) {
    TestPhysical.#pytestmark = val
  };

  get pytestmark() {
    if (this.#pytestmark.nil) this.#pytestmark = TestPhysical.#pytestmark;
    return this.#pytestmark
  };

  set pytestmark(val) {
    this.#pytestmark = val
  }
};

class TestContainers {
  #params_values;
  #pytestmark;

  static #params_values = [
    SearchParam(
      "containers_providers",
      "All",
      "container_providers",
      "Containers Provider : Name",
      null
    ),

    SearchParam(
      "container_projects",
      "All",
      "container_projects",
      "Container Project : Name",
      null
    ),

    SearchParam(
      "container_routes",
      "All",
      "container_routes",
      "Container Route : Name",
      null
    ),

    SearchParam(
      "container_services",
      "All",
      "container_services",
      "Container Service : Name",
      null
    ),

    SearchParam(
      "container_replicators",
      "All",
      "container_replicators",
      "Container Replicator : Name",
      null
    ),

    SearchParam(
      "container_pods",
      "All",
      "container_pods",
      "Container Pod : Name",
      null
    ),

    SearchParam(
      "containers",
      "All",
      "containers",
      "Container : Name",
      null
    ),

    SearchParam(
      "container_nodes",
      "All",
      "container_nodes",
      "Container Node : Name",
      null
    ),

    SearchParam(
      "container_volumes",
      "All",
      "container_volumes",
      "Persistent Volume : Name",
      null
    ),

    SearchParam(
      "container_builds",
      "All",
      "container_builds",
      "Container Build : Name",
      null
    ),

    SearchParam(
      "container_image_registries",
      "All",
      "image_registries",
      "Container Image Registry : Name",
      null
    ),

    SearchParam(
      "container_images",
      "All",
      "container_images",
      "Container Image : Name",
      null
    ),

    SearchParam(
      "container_templates",
      "All",
      "container_templates",
      "Container Template : Name",
      null
    )
  ];

  static #pytestmark = base_pytestmarks(
    this.params_values,
    {setup_prov: true}
  );

  static get params_values() {
    return TestContainers.#params_values
  };

  static set params_values(val) {
    TestContainers.#params_values = val
  };

  get params_values() {
    if (this.#params_values.nil) {
      this.#params_values = TestContainers.#params_values
    };

    return this.#params_values
  };

  set params_values(val) {
    this.#params_values = val
  };

  static get pytestmark() {
    return TestContainers.#pytestmark
  };

  static set pytestmark(val) {
    TestContainers.#pytestmark = val
  };

  get pytestmark() {
    if (this.#pytestmark.nil) this.#pytestmark = TestContainers.#pytestmark;
    return this.#pytestmark
  };

  set pytestmark(val) {
    this.#pytestmark = val
  }
};

class TestStorage {
  #params_values;
  #pytestmark;

  static #params_values = [
    SearchParam(
      "volumes",
      "All",
      "block_store_volumes",
      "Cloud Volume : Name",
      null
    ),

    SearchParam(
      "volume_snapshots",
      "All",
      "block_store_snapshots",
      "Cloud Volume Snapshot : Name",
      null
    ),

    SearchParam(
      "volume_backups",
      "All",
      "block_store_backups",
      "Cloud Volume Backup : Name",
      null
    ),

    SearchParam(
      "object_store_containers",
      "All",
      "object_store_containers",
      "Cloud Object Store Container : Name",
      null
    ),

    SearchParam(
      "object_store_objects",
      "All",
      "object_store_objects",
      "Cloud Object Store Object : Name",
      null
    )
  ];

  static #pytestmark = base_pytestmarks(this.params_values);

  static get params_values() {
    return TestStorage.#params_values
  };

  static set params_values(val) {
    TestStorage.#params_values = val
  };

  get params_values() {
    if (this.#params_values.nil) this.#params_values = TestStorage.#params_values;
    return this.#params_values
  };

  set params_values(val) {
    this.#params_values = val
  };

  static get pytestmark() {
    return TestStorage.#pytestmark
  };

  static set pytestmark(val) {
    TestStorage.#pytestmark = val
  };

  get pytestmark() {
    if (this.#pytestmark.nil) this.#pytestmark = TestStorage.#pytestmark;
    return this.#pytestmark
  };

  set pytestmark(val) {
    this.#pytestmark = val
  }
};

class TestConfigManagement {
  #params_values;
  #pytestmark;

  static #params_values = [
    SearchParam(
      "satellite_systems",
      "All",
      "configuration_management_systems",
      "Configured System (Red Hat Satellite) : Hostname",
      ["sidebar.configured_systems", "All Configured Systems"]
    ),

    SearchParam(
      "ansible_tower_systems",
      "All",
      "ansible_tower_explorer_system",
      "Configured System (Ansible Tower) : Hostname",

      [
        "sidebar.configured_systems",
        "All Ansible Tower Configured Systems"
      ]
    ),

    SearchParam(
      "ansible_tower_jobs",
      "All",
      "ansible_tower_jobs",
      "Ansible Tower Job : Name",
      null
    )
  ];

  static #pytestmark = base_pytestmarks(this.params_values);

  static get params_values() {
    return TestConfigManagement.#params_values
  };

  static set params_values(val) {
    TestConfigManagement.#params_values = val
  };

  get params_values() {
    if (this.#params_values.nil) {
      this.#params_values = TestConfigManagement.#params_values
    };

    return this.#params_values
  };

  set params_values(val) {
    this.#params_values = val
  };

  static get pytestmark() {
    return TestConfigManagement.#pytestmark
  };

  static set pytestmark(val) {
    TestConfigManagement.#pytestmark = val
  };

  get pytestmark() {
    if (this.#pytestmark.nil) this.#pytestmark = TestConfigManagement.#pytestmark;
    return this.#pytestmark
  };

  set pytestmark(val) {
    this.#pytestmark = val
  }
};

class TestServices {
  #params_values;
  #pytestmark;

  static #params_values = [SearchParam(
    MyService,
    "All",
    "myservices",
    "Service : Name",
    "myservice"
  )];

  static #pytestmark = base_pytestmarks(this.params_values);

  static get params_values() {
    return TestServices.#params_values
  };

  static set params_values(val) {
    TestServices.#params_values = val
  };

  get params_values() {
    if (this.#params_values.nil) this.#params_values = TestServices.#params_values;
    return this.#params_values
  };

  set params_values(val) {
    this.#params_values = val
  };

  static get pytestmark() {
    return TestServices.#pytestmark
  };

  static set pytestmark(val) {
    TestServices.#pytestmark = val
  };

  get pytestmark() {
    if (this.#pytestmark.nil) this.#pytestmark = TestServices.#pytestmark;
    return this.#pytestmark
  };

  set pytestmark(val) {
    this.#pytestmark = val
  }
}
