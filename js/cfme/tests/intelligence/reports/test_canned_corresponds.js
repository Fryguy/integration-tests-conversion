require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/net");
include(Cfme.Utils.Net);
require_relative("cfme/utils/net");
include(Cfme.Utils.Net);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.provider({classes: [InfraProvider], scope: "function"}),
  test_requirements.report
];

function compare(db_item, report_item) {
  // If one of the item is unfilled, check that the other item is as well.
  //   If not, check that they contain the same information.
  if (is_bool(!db_item.equal(null) || report_item != "")) {
    return db_item == report_item
  } else {
    return db_item === null && report_item == ""
  }
};

function test_providers_summary(appliance, soft_assert, request, setup_provider) {
  // Checks some informations about the provider. Does not check memory/frequency as there is
  //   presence of units and rounding.
  // 
  //   Metadata:
  //       test_flag: inventory
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //   
  let report = appliance.collections.reports.instantiate({
    type: "Configuration Management",
    subtype: "Providers",
    menu_name: "Providers Summary"
  }).queue({wait_for_finish: true});

  request.addfinalizer(report.delete);

  let skipped_providers = new Set([
    "ec2",
    "openstack",
    "redhat_network",
    "embedded_ansible_automation"
  ]);

  for (let provider in report.data.rows) {
    if (skipped_providers.include(provider["MS Type"])) continue;

    let provider_object = appliance.collections.infra_providers.instantiate(
      InfraProvider,
      {name: provider.Name}
    );

    let details_view = navigate_to(provider_object, "Details");
    let props = details_view.entities.summary("Properties");
    let hostname = (appliance.version > "5.11" ? "Hostname" : "Host Name");

    soft_assert.call(
      props.get_text_of(hostname) == provider.Hostname,
      "Hostname does not match at {}".format(provider.Name)
    );

    let cpu_cores = props.get_text_of("Aggregate Host CPU Cores");

    soft_assert.call(
      cpu_cores == provider["Total Number of Logical CPUs"],
      "Logical CPU count does not match at {}".format(provider.Name)
    );

    let host_cpu = props.get_text_of("Aggregate Host CPUs");

    soft_assert.call(
      host_cpu == provider["Total Number of Physical CPUs"],
      "Physical CPU count does not match at {}".format(provider.Name)
    )
  }
};

function test_cluster_relationships(appliance, request, soft_assert, setup_provider) {
  // Tests vm power options from on
  // 
  //   Metadata:
  //       test_flag: inventory
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //   
  let report = appliance.collections.reports.instantiate({
    type: "Relationships",
    subtype: "Virtual Machines, Folders, Clusters",
    menu_name: "Cluster Relationships"
  }).queue({wait_for_finish: true});

  request.addfinalizer(report.delete);

  for (let relation in report.data.rows) {
    let name = relation.Name;
    let provider_name = relation["Provider Name"];
    if (is_bool(!provider_name.strip())) continue;
    let provider = get_crud_by_name(provider_name);
    let host_name = relation["Host Name"].strip();
    let cluster_list = (is_bool(provider.is_a(SCVMMProvider)) ? provider.mgmt.list_clusters() : provider.mgmt.list_cluster());

    let verified_cluster = cluster_list.select(item => item.include(name)).map(item => (
      item
    ));

    soft_assert.call(
      verified_cluster,
      `Cluster ${name} not found in ${provider_name}`
    );

    if (is_bool(!host_name)) continue;
    let host_ip = resolve_hostname(host_name, {force: true});
    if (host_ip === null) continue;
    let host_list = provider.mgmt.list_host();
    let __dummy0__ = false;

    for (let host in host_list) {
      let host_is_ip, ip_from_provider;

      if (ip_address.match(host) === null) {
        host_is_ip = false;
        ip_from_provider = resolve_hostname(host, {force: true})
      } else {
        host_is_ip = true;
        ip_from_provider = host
      };

      if (is_bool(!host_is_ip)) {
        if (host == host_name) {
          break
        } else if (is_bool(host_name.startswith(host))) {
          break
        } else if (is_bool(!ip_from_provider.equal(null) && ip_from_provider == host_ip)) {
          break
        }
      } else if (host_ip == ip_from_provider) {
        break
      };

      if (host == host_list[-1]) __dummy0__ = true
    };

    if (__dummy0__) {
      soft_assert.call(
        false,
        `Hostname ${host_name} not found in ${provider_name}`
      )
    }
  }
};

function test_operations_vm_on(soft_assert, temp_appliance_preconfig_funcscope, request, setup_provider_temp_appliance) {
  // Tests vm power options from on
  // 
  //   Metadata:
  //       test_flag: report
  // 
  //   Bugzilla:
  //       1571254
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //   
  let appliance = temp_appliance_preconfig_funcscope;
  let adb = appliance.db.client;
  let vms = adb.vms;
  let hosts = adb.hosts;
  let storages = adb.storages;

  let report = appliance.collections.reports.instantiate({
    type: "Operations",
    subtype: "Virtual Machines",
    menu_name: "Online VMs (Powered On)"
  }).queue({wait_for_finish: true});

  request.addfinalizer(report.delete);

  let vms_in_db = adb.session.query(
    vms.name.label("vm_name"),
    vms.location.label("vm_location"),
    vms.last_scan_on.label("vm_last_scan"),
    storages.name.label("storages_name"),
    hosts.name.label("hosts_name")
  ).outerjoin(hosts, vms.host_id == hosts.id).outerjoin(
    storages,
    vms.storage_id == storages.id
  ).filter(vms.power_state == "on").order_by(vms.name).all();

  if (vms_in_db.size != report.data.rows.to_a.size) throw new ();
  let vm_names = vms_in_db.map(vm => vm.vm_name);

  for (let vm in vms_in_db) {
    if (vm_names.count(vm.vm_name) != 1) {
      throw `There is a duplicate entry in DB for VM ${vm.vm_name}`
    };

    let store_path = vm.vm_location;

    if (is_bool(vm.storages_name)) {
      store_path = `${vm.storages_name}/${store_path}`
    };

    for (let item in report.data.rows) {
      if (vm.vm_name == item["VM Name"]) {
        if (!compare(vm.hosts_name, item.Host)) throw new ();
        if (!compare(vm.storages_name, item.Datastore)) throw new ();
        if (!compare(store_path, item["Datastore Path"])) throw new ();
        if (!compare(vm.vm_last_scan, item["Last Analysis Time"])) throw new ()
      }
    }
  }
};

function test_datastores_summary(soft_assert, temp_appliance_preconfig_funcscope, request, setup_provider_temp_appliance) {
  // Checks Datastores Summary report with DB data. Checks all data in report, even rounded
  //   storage sizes.
  // 
  //   Metadata:
  //       test_flag: inventory
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //   
  let appliance = temp_appliance_preconfig_funcscope;
  let adb = appliance.db.client;
  let storages = adb.storages;
  let vms = adb.vms;
  let host_storages = adb.host_storages;

  let report = appliance.collections.reports.instantiate({
    type: "Configuration Management",
    subtype: "Storage",
    menu_name: "Datastores Summary"
  }).queue({wait_for_finish: true});

  request.addfinalizer(report.delete);

  let storages_in_db = adb.session.query(
    storages.store_type,
    storages.free_space,
    storages.total_space,
    storages.name,
    storages.id
  ).all();

  if (storages_in_db.size != report.data.rows.to_a.size) throw new ();
  let storages_in_db_list = [];
  let report_rows_list = [];

  for (let store in storages_in_db) {
    let number_of_vms = adb.session.query(vms.id).filter(vms.storage_id == store.id).filter(vms.template == "f").count();
    let number_of_hosts = adb.session.query(host_storages.host_id).filter(host_storages.storage_id == store.id).count();

    let store_dict = {
      "Datastore Name": store.name,
      Type: store.store_type,
      "Free Space": round_num(store.free_space),
      "Total Space": round_num(store.total_space),
      "Number of Hosts": number_of_hosts.to_i,
      "Number of VMs": number_of_vms.to_i
    };

    storages_in_db_list.push(store_dict)
  };

  for (let row in report.data.rows) {
    row["Free Space"] = extract_num(row["Free Space"]);
    row["Total Space"] = extract_num(row["Total Space"]);
    row["Number of Hosts"] = row["Number of Hosts"].to_i;
    row["Number of VMs"] = row["Number of VMs"].to_i;
    report_rows_list.push(row)
  };

  if (sorted(storages_in_db_list, {key: String}) != sorted(
    report_rows_list,
    {key: String}
  )) throw new ()
};

function round_num(column) {
  let num = column.to_f;

  while (num > 1024) {
    num = num / 1024.0.to_f
  };

  return round(num, 1)
};

function extract_num(column) {
  return column.split_p(" ")[0].to_f
}
