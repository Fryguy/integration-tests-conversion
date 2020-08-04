require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.general_ui,
  pytest.mark.usefixtures("setup_provider"),

  pytest.mark.provider(
    [InfraProvider],
    {required_fields: ["remove_test"], scope: "module"}
  )
];

function test_delete_cluster_appear_after_refresh(provider, appliance) {
  //  Tests delete cluster
  // 
  //   Metadata:
  //       test_flag: delete_object
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: WebUI
  //       initialEstimate: 1/10h
  //   
  let cluster_col = appliance.collections.clusters.filter({provider: provider});
  let test_cluster = cluster_col.all()[0];
  test_cluster.delete({cancel: false, wait: true});
  provider.refresh_provider_relationships();
  test_cluster.wait_for_exists()
};

function test_delete_host_appear_after_refresh(appliance, provider) {
  //  Tests delete host
  // 
  //   Metadata:
  //       test_flag: delete_object
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let host_collection = appliance.collections.hosts;
  let host_name = provider.data.remove_test.host;

  let test_host = host_collection.instantiate({
    name: host_name,
    provider
  });

  test_host.delete({cancel: false});
  test_host.wait_for_delete();
  provider.refresh_provider_relationships();
  test_host.wait_to_appear()
};

function test_delete_vm_appear_after_refresh(provider) {
  //  Tests delete vm
  // 
  //   Metadata:
  //       test_flag: delete_object
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let vm = provider.data.remove_test.vm;

  let test_vm = provider.appliance.collections.infra_vms.instantiate(
    vm,
    provider
  );

  test_vm.delete();
  test_vm.wait_for_delete();
  provider.refresh_provider_relationships();
  test_vm.wait_to_appear()
};

function test_delete_template_appear_after_refresh(provider) {
  //  Tests delete template
  // 
  //   Metadata:
  //       test_flag: delete_object
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let template = provider.data.remove_test.template;

  let test_template = provider.appliance.collections.infra_templates.instantiate(
    template,
    provider
  );

  test_template.delete();
  test_template.wait_for_delete();
  provider.refresh_provider_relationships();
  test_template.wait_to_appear()
};

function test_delete_resource_pool_appear_after_refresh(provider, appliance) {
  //  Tests delete pool
  // 
  //   Metadata:
  //       test_flag: delete_object
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let resourcepool_name = provider.data.remove_test.resource_pool;

  let test_resourcepool = appliance.collections.resource_pools.instantiate({
    name: resourcepool_name,
    provider
  });

  test_resourcepool.delete({cancel: false, wait: true});
  provider.refresh_provider_relationships();
  test_resourcepool.wait_for_exists()
};

function test_delete_datastore_appear_after_refresh(provider, appliance) {
  //  Tests delete datastore
  // 
  //   Metadata:
  //       test_flag: delete_object
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let datastore_collection = appliance.collections.datastores;
  let data_store = provider.data.remove_test.datastore;

  let test_datastore = datastore_collection.instantiate({
    name: data_store,
    provider
  });

  if (test_datastore.host_count > 0) test_datastore.delete_all_attached_hosts();
  if (test_datastore.vm_count > 0) test_datastore.delete_all_attached_vms();
  test_datastore.delete({cancel: false});

  wait_for(() => !test_datastore.exists, {
    delay: 20,
    timeout: 1200,
    message: "Wait datastore to disappear",
    fail_func: test_datastore.browser.refresh
  });

  provider.refresh_provider_relationships();

  wait_for(() => test_datastore.exists, {
    delay: 20,
    timeout: 1200,
    message: "Wait datastore to appear",
    fail_func: test_datastore.browser.refresh
  })
};

function test_delete_cluster_from_table(provider, appliance) {
  //  Tests delete cluster from table
  // 
  //   Metadata:
  //       test_flag: delete_object
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let cluster_col = appliance.collections.clusters.filter({provider: provider});
  let cluster1 = cluster_col.all()[0];
  cluster_col.delete(cluster1)
}
