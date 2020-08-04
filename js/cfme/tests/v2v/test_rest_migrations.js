// Test to check v2v migration rest API
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/fixtures/templates");
include(Cfme.Fixtures.Templates);
require_relative("cfme/fixtures/v2v_fixtures");
include(Cfme.Fixtures.V2v_fixtures);
require_relative("cfme/fixtures/v2v_fixtures");
include(Cfme.Fixtures.V2v_fixtures);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(1),
  test_requirements.v2v,

  pytest.mark.provider({
    classes: [RHEVMProvider, OpenStackProvider],
    selector: ONE_PER_VERSION,
    required_flags: ["v2v"],
    scope: "module"
  }),

  pytest.mark.provider({
    classes: [VMwareProvider],
    selector: ONE_PER_TYPE,
    required_flags: ["v2v"],
    fixture_name: "source_provider",
    scope: "module"
  }),

  pytest.mark.usefixtures("v2v_provider_setup")
];

function get_clusters(appliance, provider, source_provider) {
  let clusters = {};

  try {
    let source_cluster = source_provider.data.get("clusters")[0];
    let target_cluster = provider.data.get("clusters")[0]
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof IndexError) {
      pytest.skip("Cluster not found in given provider data")
    } else {
      throw $EXCEPTION
    }
  };

  let clusters_obj = appliance.rest_api.collections.clusters.all;

  if (is_bool(provider.one_of(OpenStackProvider))) {
    clusters_obj += appliance.rest_api.collections.cloud_tenants.all
  };

  let cluster_db = clusters_obj.map(cluster => [cluster.name, cluster]).to_h;

  try {
    if (cluster_db.keys().to_a.include(source_cluster)) {
      clusters.source = cluster_db[source_cluster].href
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip("Cluster:{source_cluster} not found in {cluster_list}".format({
        source_cluster,
        cluster_list: cluster_db.keys().to_a
      }))
    } else {
      throw $EXCEPTION
    }
  };

  try {
    if (cluster_db.keys().to_a.include(target_cluster)) {
      clusters.destination = cluster_db[target_cluster].href
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip("Cluster:{target_cluster} not found in {cluster_list}".format({
        target_cluster,
        cluster_list: cluster_db.keys().to_a
      }))
    } else {
      throw $EXCEPTION
    }
  };

  return clusters
};

function get_datastores(appliance, provider, source_provider) {
  let target_type;
  let datastores = {};
  let datastores_obj = appliance.rest_api.collections.data_stores.all;

  if (is_bool(provider.one_of(OpenStackProvider))) {
    target_type = "volume";
    datastores_obj += appliance.rest_api.collections.cloud_volume_types.all
  } else {
    target_type = "nfs"
  };

  try {
    let source_ds = source_provider.data.datastores.select(i => i.type == "nfs").map(i => (
      i.name
    ))[0];

    let target_ds = provider.data.datastores.select(i => i.type == target_type).map(i => (
      i.name
    ))[0]
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof IndexError) {
      pytest.skip("Datastore not found in given provider data")
    } else {
      throw $EXCEPTION
    }
  };

  let datastore_db = datastores_obj.map(ds => [ds.name, ds]).to_h;

  try {
    if (datastore_db.keys().to_a.include(source_ds)) {
      datastores.source = datastore_db[source_ds].href
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip("Datastore:{source_ds} not found in {ds_list}".format({
        source_ds,
        ds_list: datastore_db.keys().to_a
      }))
    } else {
      throw $EXCEPTION
    }
  };

  try {
    if (datastore_db.keys().to_a.include(target_ds)) {
      datastores.destination = datastore_db[target_ds].href
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip("Datastore:{target_ds} not found in {ds_list}".format({
        target_ds,
        ds_list: datastore_db.keys().to_a
      }))
    } else {
      throw $EXCEPTION
    }
  };

  return datastores
};

function get_networks(appliance, provider, source_provider) {
  let networks = {};
  let networks_obj = appliance.rest_api.collections.lans.all;

  try {
    let source_network = source_provider.data.get("vlans", [null])[0];
    let target_network = provider.data.get("vlans", [null])[0]
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof IndexError) {
      pytest.skip("Network not found in given provider data")
    } else {
      throw $EXCEPTION
    }
  };

  if (is_bool(provider.one_of(OpenStackProvider))) {
    networks_obj += appliance.rest_api.collections.cloud_networks.all
  };

  let network_db = networks_obj.map(network => [network.name, network]).to_h;

  try {
    if (network_db.keys().to_a.include(source_network)) {
      networks.source = network_db[source_network].href
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip("Network:{source_network} not found in {network_list}".format({
        source_network,
        network_list: network_db.keys().to_a
      }))
    } else {
      throw $EXCEPTION
    }
  };

  try {
    if (network_db.keys().to_a.include(target_network)) {
      networks.destination = network_db[target_network].href
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      pytest.skip("Network:{target_network} not found in {network_list}".format({
        target_network,
        network_list: network_db.keys().to_a
      }))
    } else {
      throw $EXCEPTION
    }
  };

  return networks
};

function test_rest_mapping_create(request, appliance, get_clusters, get_datastores, get_networks) {
  // 
  //   Tests infrastructure mapping create
  // 
  //   Polarion:
  //       assignee: sshveta
  //       casecomponent: V2V
  //       testtype: functional
  //       initialEstimate: 1/8h
  //       startsin: 5.9
  //       tags: V2V
  //   
  let transformation_mappings = appliance.rest_api.collections.transformation_mappings.action.create({
    name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),
    state: "draft",

    transformation_mapping_items: [
      get_clusters,
      get_datastores,
      get_networks
    ]
  })[0];

  let _cleanup = () => {
    if (is_bool(transformation_mappings.exists)) {
      return transformation_mappings.action.delete()
    }
  };

  if (!transformation_mappings.exists) throw new ()
};

function test_rest_mapping_bulk_delete_from_collection(request, appliance, get_clusters, get_datastores, get_networks) {
  // 
  //   Tests infrastructure mapping bulk delete from collection.
  // 
  //   Bulk delete operation deletes all specified resources that exist. When the
  //   resource doesn\'t exist at the time of deletion, the corresponding result
  //   has \"success\" set to false.
  // 
  //   Polarion:
  //       assignee: sshveta
  //       casecomponent: V2V
  //       testtype: functional
  //       initialEstimate: 1/8h
  //       startsin: 5.9
  //       tags: V2V
  //   
  let transformation_mappings = appliance.rest_api.collections.transformation_mappings;

  let data = (2).times.map(_ => ({
    name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),
    state: "draft",

    transformation_mapping_items: [
      get_clusters,
      get_datastores,
      get_networks
    ]
  }));

  let mapping = transformation_mappings.action.create(...data);

  let _cleanup = () => {
    for (let m in mapping) {
      if (is_bool(m.exists)) m.action.delete()
    }
  };

  mapping[0].action.delete();
  transformation_mappings.action.delete(...mapping);
  if (!appliance.rest_api.response) throw new ();
  let results = appliance.rest_api.response.json().results;
  if (results[0].success !== false) throw new ();
  if (results[1].success !== true) throw new ()
};

function test_rest_conversion_host_crud(appliance, source_provider, provider, transformation_method) {
  // 
  //   Tests conversion host crud via REST
  //   Polarion:
  //       assignee: sshveta
  //       casecomponent: V2V
  //       testtype: functional
  //       initialEstimate: 1/2h
  //       startsin: 5.9
  //       tags: V2V
  //   
  set_conversion_host_api(
    appliance,
    transformation_method,
    source_provider,
    provider
  );

  let conversion_collection = appliance.rest_api.collections.conversion_hosts;
  let conv_host = conversion_collection.all;
  let fixed_limit = 100;

  let edited_conv_host = conversion_collection.action.edit({
    id: conv_host[0].id,
    max_concurrent_tasks: fixed_limit
  })[0];

  if (edited_conv_host.max_concurrent_tasks != fixed_limit) throw new ();

  for (let c in conv_host) {
    let response = conversion_collection.action.delete({id: c.id})[0];

    wait_for(() => response.state == "Finished", {
      fail_func: response.reload,
      num_sec: 240,
      delay: 3,
      message: "Waiting for conversion host configuration task to be deleted"
    })
  };

  if (!!conversion_collection.all) throw new ()
};

function test_rest_plan_create(request, appliance, get_clusters, get_datastores, get_networks, source_type, dest_type, template_type, source_provider) {
  // 
  //   Tests migration plan create via API
  // 
  //   Polarion:
  //       assignee: sshveta
  //       casecomponent: V2V
  //       testtype: functional
  //       initialEstimate: 1/8h
  //       startsin: 5.9
  //       tags: V2V
  //   
  let transformation_mappings = appliance.rest_api.collections.transformation_mappings.action.create({
    name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),
    state: "draft",

    transformation_mapping_items: [
      get_clusters,
      get_datastores,
      get_networks
    ]
  })[0];

  let vm_obj = get_vm(
    request,
    appliance,
    source_provider,
    Templates.RHEL7_MINIMAL
  );

  let vm = appliance.rest_api.collections.vms.get({name: vm_obj.name});

  let migration_plan = appliance.rest_api.collections.service_templates.action.create({
    name: fauxfactory.gen_alphanumeric(),
    description: fauxfactory.gen_alphanumeric(),
    prov_type: "generic_transformation_plan",

    config_info: {
      transformation_mapping_id: transformation_mappings.id,
      pre_service_id: "",
      post_service_id: "",
      actions: [{vm_id: vm.id, post_service: "false", pre_service: "false"}]
    }
  })[0];

  let _cleanup = () => {
    if (is_bool(migration_plan.exists)) return migration_plan.action.delete()
  };

  if (!migration_plan.exists) throw new ()
}
