//  Fetches amount of Containers/Services/Images from the API per selected project name
// Expands nested list elements to new flatten list
//   Use for get len for of nested list
// 
//   Args:
//           org_list: (list) nested list
//           flattened_list: (list) empty list
//   Returns: flatten list
//   
function get_container_images_amt(provider, { project_name = null }) {
  //  Fetches images amount from the API per selected project name
  let project_images = provider.mgmt.list_templates().select(img => (
    img.project == project_name
  )).map(img => img);

  return project_images
};

function get_api_pods_names(provider) {
  //  Fetches Pod names from the API per selected project name
  let pod_name = [];

  for (let pod in provider.mgmt.list_pods({namespace: PROJECT_NAME})) {
    pod_name.push(pod.metadata.name)
  };

  return pod_name
};

function test_projects_dashboard_pods(provider, soft_assert, container_project_instance) {
  // Tests data integrity of Pods names in Pods status box in Projects Dashboard.
  //   Steps:
  //       * Go to Projects / Dashboard View
  //       * Compare the data in the Pods status box to API data for
  //       Pods names
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let api_pod_names = get_api_pods_names(provider);
  let view = navigate_to(container_project_instance, "Dashboard");

  for (let field in view.pods.fields) {
    soft_assert.call(
      api_pod_names.include(field),

      "There is a mismatch between API and UI values: {} (API) != {} (UI)".format(
        api_pod_names,
        field
      )
    )
  }
};

function test_projects_dashboard_icons(provider, appliance, soft_assert, container_project_instance) {
  // Tests data integrity of Containers/Images/Services number in
  //   Projects Dashboard's status boxes.
  //   Steps:
  //       * Go to Projects / Dashboard View
  //       * Compare the data in the status boxes to API data forz
  //       Containers/Images/Services numbers
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let api_values = get_api_object_counts(
    appliance,
    PROJECT_NAME,
    provider
  );

  let view = navigate_to(container_project_instance, "Dashboard");

  for (let containers_cls in api_values.keys()) {
    let statusbox_value = (view.getattr((containers_cls.PLURAL.split_p(" ")[-1]).downcase())).value;

    soft_assert.call(
      api_values[containers_cls] == statusbox_value,

      "There is a mismatch between API and UI values: {}: {} (API) != {} (UI)".format(
        containers_cls.__name__,
        api_values[containers_cls],
        statusbox_value
      )
    )
  }
};

function test_project_has_provider(appliance, soft_assert, provider) {
  // 
  //   Test provider name existence in all projects table.
  //   Steps:
  //     * navigate to all project page
  //     * get through all the project to ensure that the provider column isn't
  //       empty on each on each of the projects
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let projects_collection = appliance.collections.container_projects;
  let all_project_view = navigate_to(projects_collection, "All");
  let all_tables_rows = all_project_view.entities.get_all();
  if (!all_tables_rows) throw "No table row was found";

  for (let row in all_tables_rows) {
    let curr_project_name = row.data.name;
    let curr_project_provider = row.data.provider;

    soft_assert.call(
      curr_project_provider,
      `No Provider found for project ${curr_project_name}`
    )
  }
}
