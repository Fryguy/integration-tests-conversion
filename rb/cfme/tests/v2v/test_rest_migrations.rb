# Test to check v2v migration rest API
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/fixtures/templates'
include Cfme::Fixtures::Templates
require_relative 'cfme/fixtures/v2v_fixtures'
include Cfme::Fixtures::V2v_fixtures
require_relative 'cfme/fixtures/v2v_fixtures'
include Cfme::Fixtures::V2v_fixtures
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(1), test_requirements.v2v, pytest.mark.provider(classes: [RHEVMProvider, OpenStackProvider], selector: ONE_PER_VERSION, required_flags: ["v2v"], scope: "module"), pytest.mark.provider(classes: [VMwareProvider], selector: ONE_PER_TYPE, required_flags: ["v2v"], fixture_name: "source_provider", scope: "module"), pytest.mark.usefixtures("v2v_provider_setup")]
def get_clusters(appliance, provider, source_provider)
  clusters = {}
  begin
    source_cluster = source_provider.data.get("clusters")[0]
    target_cluster = provider.data.get("clusters")[0]
  rescue IndexError
    pytest.skip("Cluster not found in given provider data")
  end
  clusters_obj = appliance.rest_api.collections.clusters.all
  if is_bool(provider.one_of(OpenStackProvider))
    clusters_obj += appliance.rest_api.collections.cloud_tenants.all
  end
  cluster_db = clusters_obj.map{|cluster|[cluster.name, cluster]}.to_h
  begin
    if cluster_db.keys().to_a.include?(source_cluster)
      clusters["source"] = cluster_db[source_cluster].href
    end
  rescue KeyError
    pytest.skip("Cluster:{source_cluster} not found in {cluster_list}".format(source_cluster: source_cluster, cluster_list: cluster_db.keys().to_a))
  end
  begin
    if cluster_db.keys().to_a.include?(target_cluster)
      clusters["destination"] = cluster_db[target_cluster].href
    end
  rescue KeyError
    pytest.skip("Cluster:{target_cluster} not found in {cluster_list}".format(target_cluster: target_cluster, cluster_list: cluster_db.keys().to_a))
  end
  return clusters
end
def get_datastores(appliance, provider, source_provider)
  datastores = {}
  datastores_obj = appliance.rest_api.collections.data_stores.all
  if is_bool(provider.one_of(OpenStackProvider))
    target_type = "volume"
    datastores_obj += appliance.rest_api.collections.cloud_volume_types.all
  else
    target_type = "nfs"
  end
  begin
    source_ds = source_provider.data.datastores.select{|i| i.type == "nfs"}.map{|i| i.name}[0]
    target_ds = provider.data.datastores.select{|i| i.type == target_type}.map{|i| i.name}[0]
  rescue IndexError
    pytest.skip("Datastore not found in given provider data")
  end
  datastore_db = datastores_obj.map{|ds|[ds.name, ds]}.to_h
  begin
    if datastore_db.keys().to_a.include?(source_ds)
      datastores["source"] = datastore_db[source_ds].href
    end
  rescue KeyError
    pytest.skip("Datastore:{source_ds} not found in {ds_list}".format(source_ds: source_ds, ds_list: datastore_db.keys().to_a))
  end
  begin
    if datastore_db.keys().to_a.include?(target_ds)
      datastores["destination"] = datastore_db[target_ds].href
    end
  rescue KeyError
    pytest.skip("Datastore:{target_ds} not found in {ds_list}".format(target_ds: target_ds, ds_list: datastore_db.keys().to_a))
  end
  return datastores
end
def get_networks(appliance, provider, source_provider)
  networks = {}
  networks_obj = appliance.rest_api.collections.lans.all
  begin
    source_network = source_provider.data.get("vlans", [nil])[0]
    target_network = provider.data.get("vlans", [nil])[0]
  rescue IndexError
    pytest.skip("Network not found in given provider data")
  end
  if is_bool(provider.one_of(OpenStackProvider))
    networks_obj += appliance.rest_api.collections.cloud_networks.all
  end
  network_db = networks_obj.map{|network|[network.name, network]}.to_h
  begin
    if network_db.keys().to_a.include?(source_network)
      networks["source"] = network_db[source_network].href
    end
  rescue KeyError
    pytest.skip("Network:{source_network} not found in {network_list}".format(source_network: source_network, network_list: network_db.keys().to_a))
  end
  begin
    if network_db.keys().to_a.include?(target_network)
      networks["destination"] = network_db[target_network].href
    end
  rescue KeyError
    pytest.skip("Network:{target_network} not found in {network_list}".format(target_network: target_network, network_list: network_db.keys().to_a))
  end
  return networks
end
def test_rest_mapping_create(request, appliance, get_clusters, get_datastores, get_networks)
  # 
  #   Tests infrastructure mapping create
  # 
  #   Polarion:
  #       assignee: sshveta
  #       casecomponent: V2V
  #       testtype: functional
  #       initialEstimate: 1/8h
  #       startsin: 5.9
  #       tags: V2V
  #   
  transformation_mappings = appliance.rest_api.collections.transformation_mappings.action.create(name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), state: "draft", transformation_mapping_items: [get_clusters, get_datastores, get_networks])[0]
  _cleanup = lambda do
    if is_bool(transformation_mappings.exists)
      transformation_mappings.action.delete()
    end
  end
  raise unless transformation_mappings.exists
end
def test_rest_mapping_bulk_delete_from_collection(request, appliance, get_clusters, get_datastores, get_networks)
  # 
  #   Tests infrastructure mapping bulk delete from collection.
  # 
  #   Bulk delete operation deletes all specified resources that exist. When the
  #   resource doesn\'t exist at the time of deletion, the corresponding result
  #   has \"success\" set to false.
  # 
  #   Polarion:
  #       assignee: sshveta
  #       casecomponent: V2V
  #       testtype: functional
  #       initialEstimate: 1/8h
  #       startsin: 5.9
  #       tags: V2V
  #   
  transformation_mappings = appliance.rest_api.collections.transformation_mappings
  data = 2.times.map{|_| {"name" => fauxfactory.gen_alphanumeric(), "description" => fauxfactory.gen_alphanumeric(), "state" => "draft", "transformation_mapping_items" => [get_clusters, get_datastores, get_networks]}}
  mapping = transformation_mappings.action.create(*data)
  _cleanup = lambda do
    for m in mapping
      if is_bool(m.exists)
        m.action.delete()
      end
    end
  end
  mapping[0].action.delete()
  transformation_mappings.action.delete(*mapping)
  raise unless appliance.rest_api.response
  results = appliance.rest_api.response.json()["results"]
  raise unless results[0]["success"] === false
  raise unless results[1]["success"] === true
end
def test_rest_conversion_host_crud(appliance, source_provider, provider, transformation_method)
  # 
  #   Tests conversion host crud via REST
  #   Polarion:
  #       assignee: sshveta
  #       casecomponent: V2V
  #       testtype: functional
  #       initialEstimate: 1/2h
  #       startsin: 5.9
  #       tags: V2V
  #   
  set_conversion_host_api(appliance, transformation_method, source_provider, provider)
  conversion_collection = appliance.rest_api.collections.conversion_hosts
  conv_host = conversion_collection.all
  fixed_limit = 100
  edited_conv_host = conversion_collection.action.edit(id: conv_host[0].id, max_concurrent_tasks: fixed_limit)[0]
  raise unless edited_conv_host.max_concurrent_tasks == fixed_limit
  for c in conv_host
    response = conversion_collection.action.delete(id: c.id)[0]
    wait_for(lambda{|| response.state == "Finished"}, fail_func: response.reload, num_sec: 240, delay: 3, message: "Waiting for conversion host configuration task to be deleted")
  end
  raise unless !conversion_collection.all
end
def test_rest_plan_create(request, appliance, get_clusters, get_datastores, get_networks, source_type, dest_type, template_type, source_provider)
  # 
  #   Tests migration plan create via API
  # 
  #   Polarion:
  #       assignee: sshveta
  #       casecomponent: V2V
  #       testtype: functional
  #       initialEstimate: 1/8h
  #       startsin: 5.9
  #       tags: V2V
  #   
  transformation_mappings = appliance.rest_api.collections.transformation_mappings.action.create(name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), state: "draft", transformation_mapping_items: [get_clusters, get_datastores, get_networks])[0]
  vm_obj = get_vm(request, appliance, source_provider, Templates.RHEL7_MINIMAL)
  vm = appliance.rest_api.collections.vms.get(name: vm_obj.name)
  migration_plan = appliance.rest_api.collections.service_templates.action.create(name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), prov_type: "generic_transformation_plan", config_info: {"transformation_mapping_id" => transformation_mappings.id, "pre_service_id" => "", "post_service_id" => "", "actions" => [{"vm_id" => vm.id, "post_service" => "false", "pre_service" => "false"}]})[0]
  _cleanup = lambda do
    if is_bool(migration_plan.exists)
      migration_plan.action.delete()
    end
  end
  raise unless migration_plan.exists
end
