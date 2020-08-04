require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/net");
include(Cfme.Utils.Net);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
let pytestmark = [test_requirements.report];

function report_vms(appliance, infra_provider) {
  let report = appliance.collections.reports.create({
    menu_name: fauxfactory.gen_alphanumeric(),
    title: fauxfactory.gen_alphanumeric(),
    base_report_on: "Virtual Machines",

    report_fields: [
      "Provider : Name",
      "Cluster / Deployment Role : Name",
      "Datastore : Name",
      "Hardware : Number of CPUs",
      "Hardware : RAM",
      "Host / Node : Name",
      "Name"
    ]
  });

  report.queue({wait_for_finish: true});

  yield(sample(
    report.saved_reports.all()[0].data.rows.to_a.select(i => (
      i["Provider Name"].strip().size > 0
    )).map(i => i),

    2
  ));

  report.delete()
};

function test_custom_vm_report(soft_assert, report_vms) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Reporting
  //       caseimportance: low
  //       initialEstimate: 1/16h
  //   
  let cluster = "Cluster / Deployment Role Name";
  let host = "Host / Node Name";

  for (let row in report_vms) {
    if (is_bool(row.Name.startswith("test_"))) continue;
    let provider_name = row["Provider Name"];
    let provider_mgmt = get_crud_by_name(provider_name).mgmt;
    let provider_hosts_and_ips = resolve_ips(provider_mgmt.list_host());
    let provider_datastores = provider_mgmt.list_datastore();
    let provider_clusters = provider_mgmt.list_cluster();

    soft_assert.call(
      provider_mgmt.does_vm_exist(row.Name),
      "VM {} does not exist in {}!".format(row.Name, provider_name)
    );

    if (is_bool(row[cluster])) {
      soft_assert.call(
        provider_clusters.include(row[cluster]),

        "Cluster {} not found in {}!".format(
          row[cluster],
          provider_clusters.to_s
        )
      )
    };

    if (is_bool(row["Datastore Name"])) {
      soft_assert.call(
        provider_datastores.include(row["Datastore Name"]),

        "Datastore {} not found in {}!".format(
          row["Datastore Name"],
          provider_datastores.to_s
        )
      )
    };

    if (is_bool(row[host])) {
      let found = false;
      let possible_ips_or_hosts = resolve_ips([row[host]]);

      for (let possible_ip_or_host in possible_ips_or_hosts) {
        for (let host_ip in provider_hosts_and_ips) {
          if (is_bool(host_ip.include(possible_ip_or_host) || possible_ip_or_host.include(host_ip))) {
            found = true
          }
        }
      };

      soft_assert.call(
        found,
        `Host ${possible_ips_or_hosts} not found in ${provider_hosts_and_ips}!`
      )
    }
  }
}
