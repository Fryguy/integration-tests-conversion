require("None");
require_relative("wrapanapi/utils");
include(Wrapanapi.Utils);
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.meta({server_roles: "+ems_metrics_coordinator +ems_metrics_collector +ems_metrics_processor"}),
  pytest.mark.tier(1),
  pytest.mark.long_running,
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

function node_hardwares_db_data(appliance) {
  // Grabbing hardwares table data for nodes
  let db = appliance.db.client;
  let hardwares_table = db.hardwares;
  let container_nodes = db.container_nodes;
  let out = {};

  for (let node in db.session.query(container_nodes).all()) {
    out[node.name] = hardwares_table.__table__.select().where(hardwares_table.id == node.id).execute().fetchone()
  };

  return out
};

function get_vpor_data_by_name(vporizer_, name) {
  return vporizer_.select(vals => vals.resource_name == name).map(vals => vals)
};

function get_report(appliance, menu_name, { candu = false }) {
  // Queue a report by menu name , wait for finish and return it
  try {
    let saved_report = appliance.collections.reports.instantiate({
      type: "Configuration Management",
      subtype: "Containers",
      menu_name,
      is_candu: candu
    }).queue({wait_for_finish: true})
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      pytest.skip(`Could not find report \"{}\" in containers.\nTraceback:\n{}`.format(
        menu_name,
        format_exc()
      ))
    } else {
      throw $EXCEPTION
    }
  };

  return saved_report
};

function test_container_reports_base_on_options(soft_assert, appliance) {
  // This test verifies that all containers options are available in the report 'based on'
  //   Dropdown in the report creation
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(appliance.collections.reports, "Add");

  for (let base_on in [
    "Chargeback for Images",
    "Container Images",
    "Container Services",
    "Container Templates",
    "Containers",
    re.compile("Performance - Container\\s*Nodes"),
    re.compile("Performance - Container\\s*Projects"),
    "Performance - Containers"
  ]) {
    let compare = (is_bool(base_on.instance_variable_defined("@match")) ? base_on.match : base_on.__eq__);

    let option = view.base_report_on.all_options.select(opt => (
      compare.call(opt.text.to_s)
    )).map(opt => opt);

    soft_assert.call(
      option,
      `Could not find option \"${base_on}\" for base report on.`
    )
  }
};

function test_report_pods_per_ready_status(appliance, soft_assert, provider) {
  // Testing 'Pods per Ready Status' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let pods_per_ready_status = provider.pods_per_ready_status();
  let report = get_report(appliance, "Pods per Ready Status");

  for (let row in report.data.rows) {
    let name = row["# Pods per Ready Status"];
    let readiness_ui = bool(eval_strings([row["Ready Condition Status"]]).pop());

    if (is_bool(soft_assert.call(
      pods_per_ready_status.include(name),
      "Could not find pod \"{}\" in openshift.".format(name)
    ))) {
      let expected_readiness = bool(pods_per_ready_status.get(name, false).map(pod => (
        pod
      )).is_all);

      soft_assert.call(
        expected_readiness == readiness_ui,

        "For pod \"{}\" expected readiness is \"{}\" Found \"{}\"".format(
          name,
          expected_readiness,
          readiness_ui
        )
      )
    }
  }
};

function test_report_nodes_by_capacity(appliance, soft_assert, node_hardwares_db_data) {
  // Testing 'Nodes By Capacity' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let report = get_report(appliance, "Nodes By Capacity");

  for (let row in report.data.rows) {
    let memory_mb_ui, memory_mb_db;
    let hw = node_hardwares_db_data[row.Name];

    soft_assert.call(
      hw.cpu_total_cores == row["CPU Cores"].to_i,

      "Number of CPU cores is wrong: expected {} got {}".format(
        hw.cpu_total_cores,
        row["CPU Cores"]
      )
    );

    let memory_ui = (re.sub("[a-zA-Z,]", "", row.Memory)).to_f;

    if (row.Memory.downcase().include("gb")) {
      memory_mb_ui = memory_ui * 1024;

      memory_mb_db = (round(
        hw.memory_mb / 1024.0.to_f,
        memory_mb_ui.to_s.split_p(".")[1].size
      )) * 1024
    } else {
      memory_mb_ui = memory_ui;
      memory_mb_db = hw.memory_mb
    };

    soft_assert.call(
      memory_mb_ui == memory_mb_db,

      "Memory (MB) is wrong for node \"{}\": expected {} got {}".format(
        row.Name,
        memory_mb_ui,
        memory_mb_db
      )
    )
  }
};

function test_report_nodes_by_cpu_usage(appliance, soft_assert, vporizer) {
  // Testing 'Nodes By CPU Usage' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let report = get_report(appliance, "Nodes By CPU Usage");

  for (let row in report.data.rows) {
    let vpor_values = get_vpor_data_by_name(vporizer, row.Name)[0];
    let usage_db = round(vpor_values.max_cpu_usage_rate_average, 2);
    let usage_report = round((row["CPU Usage (%)"]).to_f, 2);

    soft_assert.call(
      usage_db == usage_report,

      "CPU usage is wrong for node \"{}\": expected {} got {}".format(
        row.Name,
        usage_db,
        usage_report
      )
    )
  }
};

function test_report_nodes_by_memory_usage(appliance, soft_assert, vporizer) {
  // Testing 'Nodes By Memory Usage' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let report = get_report(appliance, "Nodes By Memory Usage");

  for (let row in report.data.rows) {
    let vpor_values = get_vpor_data_by_name(vporizer, row.Name)[0];
    let usage_db = round(vpor_values.max_mem_usage_absolute_average, 2);
    let usage_report = round((row["Memory Usage (%)"]).to_f, 2);

    soft_assert.call(
      usage_db == usage_report,

      "CPU usage is wrong for node \"{}\": expected {} got {}.".format(
        row.Name,
        usage_db,
        usage_report
      )
    )
  }
};

function test_report_number_of_nodes_per_cpu_cores(appliance, soft_assert, node_hardwares_db_data) {
  // Testing 'Number of Nodes per CPU Cores' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let report = get_report(appliance, "Nodes by Number of CPU Cores");

  for (let row in report.data.rows) {
    let hw = node_hardwares_db_data[row.Name];

    soft_assert.call(
      hw.cpu_total_cores == row["Hardware Number of CPU Cores"].to_i,

      "Hardware Number of CPU Cores is wrong for node \"{}\": expected {} got {}.".format(
        row.Name,
        hw.cpu_total_cores,
        row["Hardware Number of CPU Cores"]
      )
    )
  }
};

function test_report_projects_by_number_of_pods(appliance, soft_assert) {
  // Testing 'Projects by Number of Pods' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let container_projects = appliance.db.client.container_projects;
  let container_pods = appliance.db.client.container_groups;
  let report = get_report(appliance, "Projects by Number of Pods");

  for (let row in report.data.rows) {
    let pods_count = container_pods.__table__.select().where(container_pods.container_project_id == container_projects.__table__.select().where(container_projects.name == row["Project Name"]).execute().fetchone().id).execute().fetchall().size;

    soft_assert.call(
      pods_count == row["Number of Pods"].to_i,

      "Number of pods is wrong for project \"{}\". expected {} got {}.".format(
        row["Project Name"],
        pods_count,
        row["Number of Pods"]
      )
    )
  }
};

function test_report_projects_by_cpu_usage(appliance, soft_assert, vporizer) {
  // Testing 'Projects By CPU Usage' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let report = get_report(appliance, "Projects By CPU Usage");

  for (let row in report.data.rows) {
    let vpor_values = get_vpor_data_by_name(vporizer, row.Name)[0];
    let usage_db = round(vpor_values.max_cpu_usage_rate_average, 2);
    let usage_report = round((row["CPU Usage (%)"]).to_f, 2);

    soft_assert.call(
      usage_db == usage_report,

      "CPU usage is wrong for project \"{}\": expected {} got {}".format(
        row.Name,
        usage_db,
        usage_report
      )
    )
  }
};

function test_report_projects_by_memory_usage(appliance, soft_assert, vporizer) {
  // Testing 'Projects By Memory Usage' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let report = get_report(appliance, "Projects By Memory Usage");

  for (let row in report.data.rows) {
    let vpor_values = get_vpor_data_by_name(vporizer, row.Name)[0];
    let usage_db = round(vpor_values.max_mem_usage_absolute_average, 2);
    let usage_report = round((row["Memory Usage (%)"]).to_f, 2);

    soft_assert.call(
      usage_db == usage_report,

      "CPU usage is wrong for project \"{}\": expected {} got {}.".format(
        row.Name,
        usage_db,
        usage_report
      )
    )
  }
};

function test_report_pod_counts_for_container_images_by_project(appliance, provider, soft_assert) {
  // Testing 'Pod counts For Container Images by Project' report,    see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let report = get_report(
    appliance,
    "Pod counts For Container Images by Project",
    {candu: true}
  );

  let pods_api = provider.mgmt.list_pods();
  let pods_per_project = {};

  for (let project in provider.mgmt.list_project_names()) {
    pods_per_project[project] = pods_api.select(pd => (
      pd.metadata.namespace == project
    )).map(pd => pd)
  };

  let rows = report.data.rows.to_a;

  for (let row in rows) {
    let [project_name, pod_name] = [row["Project Name"], row["Pod Name"]];

    let pod = pods_per_project[project_name].select(pd => (
      pd.metadata.name == pod_name
    )).map(pd => pd);

    soft_assert.call(
      pod,

      "Could not find pod \"{}\" of project \"{}\" in the report.".format(
        pod_name,
        project_name
      )
    );

    pod = pod.pop();

    for (let pd in pods_per_project[project_name]) {
      let expected_image = pd.spec.containers[0].image;

      let pod_images = rows.select(r => r["Pod Name"] == pod_name).map(r => (
        r["Image Name"]
      ));

      soft_assert.call(
        pod_images.select(img_nm => expected_image.include(img_nm)).map(img_nm => (
          img_nm
        )),

        "Could not find image \"{}\" in pod \"{}\". Pod images in report: {}".format(
          expected_image,
          pod_name,
          pod_images
        )
      )
    }
  }
};

function test_report_recently_discovered_pods(appliance, provider, soft_assert) {
  // Testing 'Recently Discovered Pods' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let report = get_report(appliance, "Recently Discovered Pods");
  let pods_in_report = report.data.rows.map(row => row.Name);
  let pods_per_ready_status = provider.pods_per_ready_status();

  for (let pod in pods_per_ready_status.keys()) {
    soft_assert.call(
      pods_in_report.include(pod),
      `Could not find pod \"${pod}\" in report.`
    )
  }
};

function test_report_number_of_images_per_node(appliance, provider, soft_assert) {
  // Testing 'Number of Images per Node' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let pods_api = provider.mgmt.list_pods();

  let report = get_report(
    appliance,
    "Number of Images per Node",
    {candu: true}
  );

  let report_data = report.data.rows.to_a;

  for (let pod in pods_api) {
    let expected_image = pod.spec.containers[0].image;
    let node = pod.spec.node_name;
    let pod_name = pod.metadata.name;

    let pod_images = report_data.select(row => (
      row["Pod Name"] == pod_name && row["Node Name"] == node
    )).map(row => row["Image Name"]);

    let is_image = pod_images.select(img_nm => expected_image.include(img_nm)).map(img_nm => (
      img_nm
    ));

    soft_assert.call(
      is_image,

      "Expected image for pod \"{}\" in node {} is \"{}\". found images: {}".format(
        pod_name,
        node,
        expected_image,
        pod_images
      )
    )
  }
};

function test_report_projects_by_number_of_containers(appliance, provider, soft_assert) {
  // Testing 'Projects by Number of Containers' report, see polarion case for more info
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let report = get_report(
    appliance,
    "Projects by Number of Containers"
  );

  let pods_api = provider.mgmt.list_pods();
  let projects_containers_count = {};

  for (let row in report.data.rows) {
    if (!projects_containers_count.include(row["Project Name"])) {
      projects_containers_count[row["Project Name"]] = []
    };

    projects_containers_count[row["Project Name"]].push(row["Containers Count"].to_i)
  };

  for (let [project_name, containers_counts] in projects_containers_count.to_a()) {
    let containers_counts_api = pods_api.select(pod => (
      pod.metadata.namespace == project_name
    )).map(pod => pod.spec.containers.size).sum;

    soft_assert.call(
      containers_counts.include(containers_counts_api),

      "Expected containers count for project {} should be {}. Found {} instead.".format(
        project_name,
        containers_counts_api,
        containers_counts_api
      )
    )
  }
}
