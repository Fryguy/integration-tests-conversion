// This module contains REST API specific tests which require a provider setup.
// For tests that do not require provider setup, add them to test_providerless_rest.py
require_relative("datetime");
include(Datetime);
require_relative("datetime");
include(Datetime);
require_relative("cfme");
include(Cfme);
require_relative("cfme/fixtures/provider");
include(Cfme.Fixtures.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _vm = vm.bind(this);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/ftp");
include(Cfme.Utils.Ftp);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  test_requirements.rest,

  pytest.mark.provider({
    classes: [VMwareProvider, RHEVMProvider],
    selector: ONE
  }),

  pytest.mark.usefixtures("setup_provider")
];

function api_version(appliance) {
  let entry_point = appliance.rest_api._versions.values().to_a[0];
  return appliance.new_rest_api_instance({entry_point})
};

function vm_obj(request, provider, appliance) {
  return _vm(request, provider, appliance)
};

function wait_for_requests(requests) {
  let _finished = () => {
    for (let request in requests) {
      request.reload();
      if (request.request_state != "finished") return false
    };

    return true
  };

  wait_for(
    method("_finished"),
    {num_sec: 45, delay: 5, message: "requests finished"}
  )
};

const COLLECTIONS_ALL = new Set([
  "actions",
  "alert_definition_profiles",
  "alert_definitions",
  "alerts",
  "authentications",
  "automate",
  "automate_domains",
  "automate_workspaces",
  "automation_requests",
  "availability_zones",
  "categories",
  "chargebacks",
  "cloud_networks",
  "cloud_object_store_containers",
  "cloud_subnets",
  "cloud_templates",
  "cloud_tenants",
  "cloud_volume_types",
  "cloud_volumes",
  "clusters",
  "conditions",
  "configuration_script_payloads",
  "configuration_script_sources",
  "configuration_scripts",
  "container_deployments",
  "container_groups",
  "container_images",
  "container_nodes",
  "container_projects",
  "container_templates",
  "container_volumes",
  "containers",
  "conversion_hosts",
  "currencies",
  "custom_button_sets",
  "custom_buttons",
  "customization_scripts",
  "customization_templates",
  "data_stores",
  "enterprises",
  "event_streams",
  "events",
  "features",
  "firmwares",
  "flavors",
  "floating_ips",
  "generic_object_definitions",
  "generic_objects",
  "groups",
  "guest_devices",
  "hosts",
  "instances",
  "lans",
  "load_balancers",
  "measures",
  "metric_rollups",
  "network_routers",
  "notifications",
  "orchestration_stacks",
  "orchestration_templates",
  "physical_chassis",
  "physical_racks",
  "physical_servers",
  "physical_storages",
  "physical_switches",
  "pictures",
  "policies",
  "policy_actions",
  "policy_profiles",
  "providers",
  "provision_dialogs",
  "provision_requests",
  "pxe_images",
  "pxe_servers",
  "rates",
  "regions",
  "reports",
  "request_tasks",
  "requests",
  "resource_pools",
  "results",
  "roles",
  "search_filters",
  "security_groups",
  "servers",
  "service_catalogs",
  "service_dialogs",
  "service_offerings",
  "service_orders",
  "service_parameters_sets",
  "service_requests",
  "service_templates",
  "services",
  "settings",
  "switches",
  "tags",
  "tasks",
  "templates",
  "tenants",
  "transformation_mappings",
  "users",
  "vms",
  "zones"
]);

const COLLECTIONS_NOT_IN_510 = new Set([
  "customization_templates",
  "pxe_images",
  "pxe_servers"
]);

const COLLECTIONS_NOT_IN_511 = new Set([
  "container_deployments",
  "load_balancers"
]);

const COLLECTIONS_IN_510 = COLLECTIONS_ALL - COLLECTIONS_NOT_IN_510;
const COLLECTIONS_IN_511 = COLLECTIONS_ALL - COLLECTIONS_NOT_IN_511;
const COLLECTIONS_IN_UPSTREAM = COLLECTIONS_IN_510;

const COLLECTIONS_OMITTED = new Set([
  "automate_workspaces",
  "metric_rollups",
  "settings"
]);

const UNCOLLECT_REASON = "Collection type not valid for appliance version";

function _collection_not_in_this_version(appliance, collection_name) {
  return !COLLECTIONS_IN_UPSTREAM.include(collection_name) && appliance.version.is_in_series("upstream") || !COLLECTIONS_IN_511.include(collection_name) && appliance.version.is_in_series("5.11") || !COLLECTIONS_IN_510.include(collection_name) && appliance.version.is_in_series("5.10")
};

function test_query_simple_collections(appliance, collection_name) {
  // This test tries to load each of the listed collections. 'Simple' collection means that they
  //   have no usable actions that we could try to run
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: high
  //       initialEstimate: 1/3h
  //       testSteps:
  //           1. Send a GET request: /api/<collection_name>
  //       expectedResults:
  //           1. Must receive a 200 OK response.
  //   
  let collection = appliance.rest_api.collections.getattr(collection_name);

  if (COLLECTIONS_OMITTED.include(collection_name)) {
    appliance.rest_api.get(collection._href);
    assert_response(appliance)
  } else {
    assert_response(appliance);
    collection.reload();
    collection.to_a
  }
};

function test_collections_actions(appliance, collection_name, soft_assert) {
  // Tests that there are only actions with POST methods in collections.
  // 
  //   Other methods (like DELETE) are allowed for individual resources inside collections,
  //   not in collections itself.
  // 
  //   Bugzilla:
  //       1392595
  //       1754972
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  let response = appliance.rest_api.get(appliance.rest_api.collections.getattr(collection_name)._href);
  let actions = response.get("actions");
  if (is_bool(!actions)) return;

  for (let action in actions) {
    if (is_bool(BZ(1754972).blocks && collection_name == "pxe_servers")) {
      pytest.skip("pxe_servers contains methods other than post.")
    };

    soft_assert.call(action.method.downcase() == "post")
  }
};

function test_query_with_api_version(api_version, collection_name) {
  // Loads each of the listed collections using /api/<version>/<collection>.
  // 
  //   Steps:
  //       * GET /api/<version>/<collection_name>
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  let collection = api_version.collections.getattr(collection_name);
  assert_response(api_version);
  collection.reload();
  collection.to_a
};

function test_select_attributes(appliance, collection_name) {
  // Tests that it's possible to limit returned attributes.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: high
  //       initialEstimate: 1/8h
  //   
  let collection = appliance.rest_api.collections.getattr(collection_name);

  let response = appliance.rest_api.get("{}{}".format(
    collection._href,
    "?expand=resources&attributes=id"
  ));

  assert_response(appliance);

  for (let resource in response.get("resources", [])) {
    if (!resource.include("id")) throw new ();
    let expected_len = (resource.include("href") ? 2 : 1);
    if (resource.include("fqname")) expected_len++;
    if (resource.size != expected_len) throw new ()
  }
};

function test_http_options(appliance) {
  // Tests OPTIONS http method.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/3h
  //   
  if (!appliance.rest_api.collections.vms.options().attributes.include("boot_time")) {
    throw new ()
  };

  assert_response(appliance)
};

function test_http_options_node_types(appliance, collection_name) {
  // Tests that OPTIONS http method on Hosts and Clusters collection returns node_types.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let collection = appliance.rest_api.collections.getattr(collection_name);
  if (!collection.options().data.include("node_types")) throw new ();
  assert_response(appliance)
};

function test_http_options_subcollections(appliance) {
  // Tests that OPTIONS returns supported subcollections.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  if (!appliance.rest_api.collections.vms.options().subcollections.include("tags")) {
    throw new ()
  };

  assert_response(appliance)
};

function test_server_info(appliance) {
  // Check that server info is present.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/3h
  //   
  let key_list = [
    "enterprise_href",
    "zone_href",
    "region_href",
    "plugins",
    "appliance",
    "server_href",
    "version",
    "build",
    "time"
  ];

  if (!key_list.map(item => appliance.rest_api.server_info.include(item)).is_all) {
    throw new ()
  }
};

function test_server_info_href(appliance) {
  // Check that appliance's server, zone and region is present.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let items = ["server_href", "zone_href", "region_href"];

  for (let item in items) {
    if (!appliance.rest_api.server_info.include(item)) throw new ();

    if (!appliance.rest_api.get(appliance.rest_api.server_info[item]).include("id")) {
      throw new ()
    }
  }
};

function test_default_region(appliance) {
  // Check that the default region is present.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let reg = appliance.rest_api.collections.regions[0];
  if (!reg.instance_variable_defined("@guid")) throw new ();
  if (!reg.instance_variable_defined("@region")) throw new ()
};

function test_product_info(appliance) {
  // Check that product info is present.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       initialEstimate: 1/3h
  //       casecomponent: Rest
  //   
  if (![
    "copyright",
    "name",
    "name_full",
    "support_website",
    "support_website_text"
  ].map(item => appliance.rest_api.product_info.include(item)).is_all) {
    throw new ()
  }
};

function test_identity(appliance) {
  // Check that user's identity is present.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/3h
  //   
  if (!["userid", "name", "group", "role", "tenant", "groups"].map(item => (
    appliance.rest_api.identity.include(item)
  )).is_all) throw new ()
};

function test_user_settings(appliance) {
  // Check that user's settings are returned.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/3h
  //   
  if (!appliance.rest_api.settings.is_a(Hash)) throw new ()
};

function test_datetime_filtering(appliance, provider) {
  // Tests support for DateTime filtering with timestamps in YYYY-MM-DDTHH:MM:SSZ format.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let collection = appliance.rest_api.collections.vms;

  let url_string = "{}{}".format(
    collection._href,
    "?expand=resources&attributes=created_on&sort_by=created_on&sort_order=asc&filter[]=created_on{}{}"
  );

  collection.reload();
  let vms_num = collection.size;
  if (vms_num <= 3) throw new ();
  let baseline_vm = collection[vms_num / 2];
  let baseline_datetime = baseline_vm._data.created_on;

  let _get_filtered_resources = operator => (
    appliance.rest_api.get(url_string.format(operator, baseline_datetime)).resources
  );

  let older_resources = _get_filtered_resources.call("<");
  let newer_resources = _get_filtered_resources.call(">");
  let matching_resources = _get_filtered_resources.call("=");
  if (!!matching_resources) throw new ();

  if (is_bool(older_resources)) {
    let last_older = collection.get({id: older_resources[-1].id});
    if (last_older.created_on >= baseline_vm.created_on) throw new ()
  };

  if (is_bool(newer_resources)) {
    let first_newer = collection.get({id: newer_resources[0].id});
    if (first_newer.created_on != baseline_vm.created_on) throw new ()
  }
};

function test_date_filtering(appliance, provider) {
  // Tests support for DateTime filtering with timestamps in YYYY-MM-DD format.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let collection = appliance.rest_api.collections.vms;

  let url_string = "{}{}".format(
    collection._href,
    "?expand=resources&attributes=created_on&sort_by=created_on&sort_order=desc&filter[]=created_on{}{}"
  );

  collection.reload();
  let vms_num = collection.size;
  if (vms_num <= 3) throw new ();
  let baseline_vm = collection[vms_num / 2];
  let [baseline_date, _] = baseline_vm._data.created_on.split_p("T");

  let _get_filtered_resources = operator => (
    appliance.rest_api.get(url_string.format(operator, baseline_date)).resources
  );

  let older_resources = _get_filtered_resources.call("<");
  let newer_resources = _get_filtered_resources.call(">");
  let matching_resources = _get_filtered_resources.call("=");
  if (!matching_resources) throw new ();

  if (is_bool(newer_resources)) {
    let last_newer = collection.get({id: newer_resources[-1].id});
    if (last_newer.created_on <= baseline_vm.created_on) throw new ()
  };

  if (is_bool(older_resources)) {
    let first_older = collection.get({id: older_resources[0].id});
    if (first_older.created_on >= baseline_vm.created_on) throw new ()
  }
};

function test_resources_hiding(appliance) {
  // Test that it's possible to hide resources in response.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //   
  let roles = appliance.rest_api.collections.roles;
  let resources_visible = appliance.rest_api.get(roles._href + "?filter[]=read_only=true");
  assert_response(appliance);
  if (!resources_visible.include("resources")) throw new ();
  let resources_hidden = appliance.rest_api.get(roles._href + "?filter[]=read_only=true&hide=resources");
  assert_response(appliance);
  if (!!resources_hidden.include("resources")) throw new ();
  if (resources_hidden.subcount != resources_visible.subcount) throw new ()
};

function test_sorting_by_attributes(appliance) {
  // Test that it's possible to sort resources by attributes.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let url_string = "{}{}".format(
    appliance.rest_api.collections.groups._href,
    "?expand=resources&attributes=id&sort_by=id&sort_order={}"
  );

  let response_asc = appliance.rest_api.get(url_string.format("asc"));
  assert_response(appliance);
  if (!response_asc.include("resources")) throw new ();
  let response_desc = appliance.rest_api.get(url_string.format("desc"));
  assert_response(appliance);
  if (!response_desc.include("resources")) throw new ();
  if (response_asc.subcount != response_desc.subcount) throw new ();
  let id_last = 0;

  for (let resource in response_asc.resources) {
    if (resource.id.to_i <= id_last.to_i) throw new ();
    id_last = resource.id.to_i
  };

  id_last++;

  for (let resource in response_desc.resources) {
    if (resource.id.to_i >= id_last.to_i) throw new ();
    id_last = resource.id.to_i
  }
};

const PAGING_DATA = [[0, 0], [1, 0], [11, 13], [1, 10000]];

function test_rest_paging(appliance, paging) {
  let response, expected_subcount;

  // Tests paging when offset and limit are specified.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let [limit, offset] = paging;

  let url_string = "{}{}".format(
    appliance.rest_api.collections.features._href,
    `?limit=${limit}&offset=${offset}`
  );

  if (limit == 0) {
    pytest.raises(
      Exception,
      {match: "Api::BadRequestError"},
      () => appliance.rest_api.get(url_string)
    );

    return
  } else {
    response = appliance.rest_api.get(url_string)
  };

  if (response.count <= offset) {
    expected_subcount = 0
  } else if (response.count - offset >= limit) {
    expected_subcount = limit
  } else {
    expected_subcount = response.count - offset
  };

  if (response.subcount != expected_subcount) throw new ();
  if (response.resources.size != expected_subcount) throw new ();
  let expected_pages_num = (response.count / limit) + ((is_bool(response.count % limit) ? 1 : 0));
  if (response.pages != expected_pages_num) throw new ();
  let links = response.links;
  if (!links.self.include(`limit=${limit}&offset=${offset}`)) throw new ();

  if (offset + limit < response.count) {
    if (!links.next.include("limit={}&offset={}".format(
      limit,
      offset + limit
    ))) throw new ()
  };

  if (offset > 0) {
    let expected_previous_offset = (offset > limit ? offset - limit : 0);

    if (!links.previous.include(`limit=${limit}&offset=${expected_previous_offset}`)) {
      throw new ()
    }
  };

  if (!links.first.include("limit={}&offset={}".format(limit, 0))) throw new ();
  let expected_last_offset = (response.pages - ((is_bool(response.count % limit) ? 1 : 0))) * limit;

  if (!links.last.include(`limit=${limit}&offset=${expected_last_offset}`)) {
    throw new ()
  }
};

function test_attributes_present(appliance, collection_name) {
  // Tests that the expected attributes are present in all collections.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Bugzilla:
  //       1510238
  //       1503852
  //       1547852
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/5h
  //   
  let attrs = "href,id,href_slug";
  let collection = appliance.rest_api.collections.getattr(collection_name);

  let response = appliance.rest_api.get("{}{}{}".format(
    collection._href,
    "?expand=resources&attributes=",
    attrs
  ));

  assert_response(appliance);

  for (let resource in response.get("resources", [])) {
    if (!resource.include("id")) throw new ();
    if (!resource.include("href")) throw new ();

    if (resource.href != ("{}/{}").format(collection._href, resource.id)) {
      throw new ()
    };

    if (!resource.include("href_slug")) throw new ();

    if (resource.href_slug != ("{}/{}").format(
      collection.name,
      resource.id
    )) throw new ()
  }
};

function test_collection_class_valid(appliance, provider, vendor) {
  // Tests that it's possible to query using collection_class.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let collection = appliance.rest_api.collections.vms;
  collection.reload();
  let resource_type = collection[0].type;
  let tested_type = `ManageIQ::Providers::${vendor}::InfraManager::Vm`;
  let response = collection.query_string({collection_class: tested_type});
  if (resource_type == tested_type) if (response.count <= 0) throw new ();

  if (is_bool(response.count)) {
    let rand_num = (response.count >= 5 ? 5 : response.count);
    let rand_entities = random.sample(response.resources, rand_num);

    for (let entity in rand_entities) {
      if (entity.type != tested_type) throw new ()
    }
  }
};

function test_collection_class_invalid(appliance, provider) {
  // Tests that it's not possible to query using invalid collection_class.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  pytest.raises(Exception, {match: "Invalid collection_class"}, () => (
    appliance.rest_api.collections.vms.query_string({collection_class: "ManageIQ::Providers::Nonexistent::Vm"})
  ))
};

function test_bulk_delete(request, appliance) {
  // Tests bulk delete from collection.
  // 
  //   Bulk delete operation deletes all specified resources that exist. When the
  //   resource doesn\'t exist at the time of deletion, the corresponding result
  //   has \"success\" set to false.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let collection = appliance.rest_api.collections.services;
  let data = (2).times.map(__ => ({name: fauxfactory.gen_alphanumeric()}));
  let services = collection.action.create(...data);

  let _cleanup = () => {
    for (let service in services) {
      if (is_bool(service.exists)) service.action.delete()
    }
  };

  services[0].action.delete();
  collection.action.delete(...services);
  if (!appliance.rest_api.response) throw new ();
  let results = appliance.rest_api.response.json().results;
  if (results[0].success !== false) throw new ();
  if (results[1].success !== true) throw new ()
};

function test_rest_ping(appliance) {
  // Tests /api/ping.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let ping_addr = `${appliance.rest_api._entry_point}/ping`;
  if (appliance.rest_api._session.get(ping_addr).text != "pong") throw new ()
};

class TestPicturesRESTAPI {
  create_picture(appliance) {
    let picture = appliance.rest_api.collections.pictures.action.create({
      extension: "png",
      content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    });

    assert_response(appliance);
    return picture[0]
  };

  test_query_picture_attributes(appliance, soft_assert) {
    // Tests access to picture attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let picture = this.create_picture(appliance);
    let outcome = query_resource_attributes(picture);

    for (let failure in outcome.failed) {
      soft_assert.call(false, "{} \"{}\": status: {}, error: `{}`".format(
        failure.type,
        failure.name,
        failure.response.status_code,
        failure.error
      ))
    }
  };

  test_add_picture(appliance) {
    // Tests adding picture.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let collection = appliance.rest_api.collections.pictures;
    collection.reload();
    let count = collection.count;
    this.create_picture(appliance);
    collection.reload();
    if (collection.count != count + 1) throw new ();
    if (collection.count != collection.size) throw new ()
  };

  test_add_picture_invalid_extension(appliance) {
    // Tests adding picture with invalid extension.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let collection = appliance.rest_api.collections.pictures;
    let count = collection.count;

    pytest.raises(Exception, {match: "Extension must be"}, () => (
      collection.action.create({
        extension: "xcf",
        content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      })
    ));

    assert_response(appliance, {http_status: 400});
    collection.reload();
    if (collection.count != count) throw new ()
  };

  test_add_picture_invalid_data(appliance) {
    // Tests adding picture with invalid content.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let collection = appliance.rest_api.collections.pictures;
    let count = collection.count;

    pytest.raises(
      Exception,
      {match: "invalid base64"},
      () => collection.action.create({extension: "png", content: "invalid"})
    );

    assert_response(appliance, {http_status: 400});
    collection.reload();
    if (collection.count != count) throw new ()
  }
};

class TestBulkQueryRESTAPI {
  test_bulk_query(appliance) {
    // Tests bulk query referencing resources by attributes id, href and guid
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let collection = appliance.rest_api.collections.events;

    let [data0, data1, data2] = [
      collection[0]._data,
      collection[1]._data,
      collection[2]._data
    ];

    let response = appliance.rest_api.collections.events.action.query(
      {id: data0.id},
      {href: data1.href},
      {guid: data2.guid}
    );

    assert_response(appliance);
    if (response.size != 3) throw new ();

    if (data0 != response[0]._data || data1 != response[1]._data || data2 != response[2]._data) {
      throw new ()
    }
  };

  test_bulk_query_users(appliance) {
    // Tests bulk query on 'users' collection
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let data = appliance.rest_api.collections.users[0]._data;

    let response = appliance.rest_api.collections.users.action.query(
      {name: data.name},
      {userid: data.userid}
    );

    assert_response(appliance);
    if (response.size != 2) throw new ();

    if (!(data.id == response[0]._data.id) || !(response[0]._data.id == response[1]._data.id)) {
      throw new ()
    }
  };

  test_bulk_query_roles(appliance) {
    // Tests bulk query on 'roles' collection
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let collection = appliance.rest_api.collections.roles;
    let [data0, data1] = [collection[0]._data, collection[1]._data];

    let response = appliance.rest_api.collections.roles.action.query(
      {name: data0.name},
      {name: data1.name}
    );

    assert_response(appliance);
    if (response.size != 2) throw new ();
    if (data0 != response[0]._data || data1 != response[1]._data) throw new ()
  };

  test_bulk_query_groups(appliance) {
    // Tests bulk query on 'groups' collection
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let collection = appliance.rest_api.collections.groups;
    let [data0, data1] = [collection[0]._data, collection[1]._data];

    let response = appliance.rest_api.collections.groups.action.query(
      {description: data0.description},
      {description: data1.description}
    );

    assert_response(appliance);
    if (response.size != 2) throw new ();
    if (data0 != response[0]._data || data1 != response[1]._data) throw new ()
  }
};

class TestNotificationsRESTAPI {
  generate_notifications(appliance) {
    let requests_data = automation_requests_data("nonexistent_vm");

    let requests = appliance.rest_api.collections.automation_requests.action.create(...requests_data[_.range(
      0,
      2
    )]);

    if (requests.size != 2) throw new ();
    wait_for_requests(requests)
  };

  test_query_notification_attributes(appliance, generate_notifications, soft_assert) {
    // Tests access to notification attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let collection = appliance.rest_api.collections.notifications;
    collection.reload();
    query_resource_attributes(collection[-1], {soft_assert})
  };

  test_mark_notifications(appliance, generate_notifications, from_detail) {
    // Tests marking notifications as seen.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let unseen = appliance.rest_api.collections.notifications.find_by({seen: false});
    let notifications = (1).upto(3 - 1).map(i => unseen[-i]);

    if (is_bool(from_detail)) {
      for (let ent in notifications) {
        ent.action.mark_as_seen();
        assert_response(appliance)
      }
    } else {
      appliance.rest_api.collections.notifications.action.mark_as_seen(...notifications);
      assert_response(appliance)
    };

    for (let ent in notifications) {
      ent.reload();
      if (!ent.seen) throw new ()
    }
  };

  test_delete_notifications_from_detail(appliance, generate_notifications, method) {
    // Tests delete notifications from detail.
    // 
    //     Bugzilla:
    //         1420872
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let notifications = appliance.rest_api.collections.notifications.all[_.range(
      -3,
      0
    )];

    delete_resources_from_detail(notifications, {method})
  };

  test_delete_notifications_from_collection(appliance, generate_notifications) {
    // Tests delete notifications from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let notifications = appliance.rest_api.collections.notifications.all[_.range(
      -3,
      0
    )];

    delete_resources_from_collection(notifications)
  }
};

class TestEventStreamsRESTAPI {
  gen_events(appliance, vm_obj, provider) {
    let vm_name = vm_obj;
    let vm = provider.mgmt.get_vm(vm_name);
    vm.stop();
    vm.delete()
  };

  test_query_event_attributes(appliance, gen_events, soft_assert) {
    // Tests access to event attributes.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let collection = appliance.rest_api.collections.event_streams;
    collection.reload();
    query_resource_attributes(collection[-1], {soft_assert})
  };

  test_find_created_events(appliance, vm_obj, gen_events, provider, soft_assert) {
    // Tests find_by and get functions of event_streams collection
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Rest
    //         caseimportance: medium
    //         initialEstimate: 1/4h
    //     
    let vm_name = vm_obj;
    let collections = appliance.rest_api.collections;
    let vm_id = collections.vms.get({name: vm_name}).id;
    let ems_event_type = "EmsEvent";
    let evt_col = collections.event_streams;

    for (let [evt, params] in provider.ems_events) {
      if (params.include("dest_vm_or_template_id")) {
        params.update({dest_vm_or_template_id: vm_id})
      } else if (params.include("vm_or_template_id")) {
        params.update({vm_or_template_id: vm_id})
      };

      try {
        let msg = "vm's {v} event {evt} of {t} type is not found in event_streams collection".format({
          v: vm_name,
          evt,
          t: ems_event_type
        });

        let [found_evts, __] = wait_for(
          () => evt_col.find_by({type: ems_event_type, None: params}).map(e => e),
          {num_sec: 30, delay: 5, message: msg, fail_condition: []}
        )
      } catch (exc) {
        if (exc instanceof TimedOutError) {
          soft_assert.call(false, exc.to_s)
        } else {
          throw exc
        }
      };

      try {
        evt_col.get({id: (found_evts[-1]).id})
      } catch ($EXCEPTION) {
        if ($EXCEPTION instanceof [IndexError, TypeError]) {
          soft_assert.call(
            false,
            `Couldn't get event ${evt} for vm ${vm_name}`
          )
        } else {
          throw $EXCEPTION
        }
      }
    }
  }
};

function test_rest_metric_rollups(appliance, interval, resource_type) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       testSteps:
  //           1. Send GET request:
  //           /api/metric_rollups?resource_type=:resource_type&capture_interval=:interval
  //           &start_date=:start_date&end_date=:end_date
  //       expectedResults:
  //           1. Successful 200 OK response.
  //   
  let end_date = Datetime.now();
  let start_date = end_date - timedelta({days: 2});

  let url = "{entry_point}?resource_type={resource_type}&capture_interval={interval}&start_date={start_date}&end_date={end_date}&limit=30".format({
    entry_point: appliance.rest_api.collections.metric_rollups._href,
    resource_type,
    interval,
    start_date: start_date.isoformat(),
    end_date: end_date.isoformat()
  });

  appliance.rest_api.get(url);
  assert_response(appliance)
};

function test_supported_provider_options(appliance, soft_assert) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Rest
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       testSteps:
  //           1. Send a request: OPTIONS /api/providers
  //           2. Check if `supported_providers` is present in the response.
  //           3. Check if `regions` is present in the response under data > supported_providers
  //               > providers_that_support_regions such as EC2 and Azure.
  //   
  let data = appliance.rest_api.collections.providers.options().data;

  soft_assert.call(
    data.include("supported_providers"),
    "Supported Providers data not present in the response."
  );

  for (let provider in data.supported_providers) {
    if ([
      "ManageIQ::Providers::Azure::CloudManager",
      "ManageIQ::Providers::Amazon::CloudManager"
    ].include(provider.type)) {
      soft_assert.call(
        provider.include("regions"),
        "Regions information not present in the provider OPTIONS."
      )
    }
  }
};

function image_file_path(file_name) {
  //  Returns file path of the file
  let fs = FTPClientWrapper(cfme_data.ftpserver.entities.others);
  let file_path = fs.download(file_name, File.join("/tmp", file_name));
  return file_path
};

function test_custom_logos_via_api(appliance, image_type, request) {
  let image, expected_name;

  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Configuration
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       setup:
  //           1. Navigate to Configuration > Server > Custom Logos
  //           2. Change the brand, logo, login_logo and favicon
  //       testSteps:
  //           1.  Send a GET request: /api/product_info and
  //               check the value of image type in branding_info
  //       expectedResults:
  //           1. Response: {
    //               ...
    //               \"branding_info\": {
      //                   \"brand\": \"/upload/custom_brand.png\",
      //                   \"logo\": \"/upload/custom_logo.png\",
      //                   \"login_logo\": \"/upload/custom_login_logo.png\",
      //                   \"favicon\": \"/upload/custom_favicon.ico\"
      //               }
      //           }
      // 
      //   Bugzilla:
      //       1578076
      //   
      if (image_type == "favicon") {
        image = image_file_path("icon.ico");
        expected_name = "/upload/custom_{}.ico"
      } else {
        image = image_file_path("logo.png");
        expected_name = "/upload/custom_{}.png"
      };

      appliance.server.upload_custom_logo({
        file_type: image_type,
        file_data: image
      });

      let _finalize = () => (
        appliance.server.upload_custom_logo({
          file_type: image_type,
          enable: false
        })
      );

      let href = `https://${appliance.hostname}/api/product_info`;
      let api = appliance.rest_api;

      wait_for(
        () => api.product_info != api.get(href),
        {delay: 5, timeout: 100}
      );

      let branding_info = api.get(href).branding_info;

      if (branding_info[image_type] != expected_name.format(image_type)) {
        throw new ()
      }
    };

    function test_provider_specific_vm(appliance, request, soft_assert, provider, second_provider) {
      // 
      //   Polarion:
      //       assignee: pvala
      //       casecomponent: Infra
      //       caseimportance: medium
      //       initialEstimate: 1/4h
      //       testSteps:
      //           1. Add multiple provider and query vms related to a specific provider.
      //               GET /api/providers/:provider_id/vms
      //       expectedResults:
      //           1. Should receive all VMs related to the provider.
      //   
      setup_or_skip(request, second_provider);

      for (let provider_obj in [provider, second_provider]) {
        for (let vm in provider_obj.rest_api_entity.vms.all) {
          soft_assert.call(vm.ems.name == provider_obj.name)
        }
      }
    };

    function test_release_server_info(appliance) {
      // 
      //   Bugzilla:
      //       1546108
      // 
      //   Polarion:
      //       assignee: pvala
      //       casecomponent: Appliance
      //       caseimportance: medium
      //       initialEstimate: 1/4h
      //       testSteps:
      //           1. Check the server release info at GET /api
      //   
      if (appliance.rest_api.server_info.release != (appliance.ssh_client.run_command("cd /var/www/miq/vmdb; cat RELEASE")).output) {
        throw new ()
      }
    }
