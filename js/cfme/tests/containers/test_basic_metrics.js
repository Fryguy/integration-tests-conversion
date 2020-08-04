require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/path");
include(Cfme.Utils.Path);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(1),

  pytest.mark.provider({
    gen_func: providers,

    filters: [ProviderFilter({
      classes: [ContainersProvider],
      required_flags: ["metrics_collection"]
    })],

    scope: "function"
  }),

  test_requirements.containers
];

const SET_METRICS_CAPTURE_THRESHOLD_IN_MINUTES = 5;
const WAIT_FOR_METRICS_CAPTURE_THRESHOLD_IN_MINUTES = "15m";
const ROLLUP_METRICS_CALC_THRESHOLD_IN_MINUTES = "50m";

function reduce_metrics_collection_threshold(appliance) {
  let f_name = ("openshift/change_metrics_collection_threshold.rb".scripts_path.join).strpath;
  appliance.ssh_client.put_file(f_name, "/var/www/miq/vmdb");
  appliance.ssh_client.run_rails_command("change_metrics_collection_threshold.rb {threshold}.minutes".format({threshold: SET_METRICS_CAPTURE_THRESHOLD_IN_MINUTES}))
};

function enable_capacity_and_utilization(appliance) {
  let args = [
    "ems_metrics_coordinator",
    "ems_metrics_collector",
    "ems_metrics_processor"
  ];

  logger.info("Enabling metrics collection roles");
  appliance.server.settings.enable_server_roles(...args);

  if (is_bool(appliance.wait_for_server_roles(
    args,
    {delay: 10, timeout: 300}
  ))) {
    yield
  } else {
    pytest.skip(`Failed to set server roles on appliance ${appliance}`)
  };

  logger.info("Disabling metrics collection roles");
  appliance.server.settings.disable_server_roles(...args)
};

function wait_for_metrics_rollup(provider) {
  if (is_bool(!provider.wait_for_collected_metrics({
    timeout: ROLLUP_METRICS_CALC_THRESHOLD_IN_MINUTES,
    table_name: "metric_rollups"
  }))) {
    throw new RuntimeError("No metrics exist in rollup table for {timeout} minutes".format({timeout: ROLLUP_METRICS_CALC_THRESHOLD_IN_MINUTES}))
  }
};

function test_basic_metrics(provider) {
  //  Basic Metrics availability test
  //       This test checks that the Metrics service is up
  //       Curls the hawkular status page and checks if it's up
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  try {
    let router = (provider.mgmt.list_route().select(router => (
      (router.metadata.name == "hawkular-metrics") || router.metadata.name == "prometheus"
    )).map(router => router)).pop();

    let metrics_url = router.status.ingress[0].host
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NoMethodError) {
      pytest.skip(`Could not determine metric route for ${provider.key}`)
    } else {
      throw $EXCEPTION
    }
  };

  let creds = provider.get_credentials_from_config(
    provider.key,
    {cred_type: "token"}
  );

  let header = {Authorization: `Bearer ${creds.token}`};

  let response = requests.get(
    `https://${metrics_url}:443`,
    {headers: header, verify: false}
  );

  if (!response.ok) {
    throw "{metrics} failed to start!".format({metrics: router.metadata.name})
  }
};

function test_validate_metrics_collection_db(provider, enable_capacity_and_utilization, reduce_metrics_collection_threshold) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  if (!provider.wait_for_collected_metrics({timeout: WAIT_FOR_METRICS_CAPTURE_THRESHOLD_IN_MINUTES})) {
    throw new ()
  }
};

function test_validate_metrics_collection_provider_gui(appliance, provider, enable_capacity_and_utilization, reduce_metrics_collection_threshold, wait_for_metrics_rollup, soft_assert) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(provider, "Details");

  wait_for(
    () => view.toolbar.monitoring.item_enabled("Utilization"),
    {delay: 2, timeout: 600, fail_func: appliance.server.browser.refresh}
  );

  let utilization = navigate_to(provider, "Utilization");

  soft_assert.call(
    utilization.cpu.all_data,
    "No cpu's metrics exist in the cpu utilization graph!"
  );

  soft_assert.call(
    utilization.memory.all_data,
    "No memory's metrics exist in the memory utilization graph!"
  );

  soft_assert.call(
    utilization.network.all_data,
    "No network's metrics exist in the network utilization graph!"
  )
};

function test_flash_msg_not_contains_html_tags(provider) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let edit_view = navigate_to(provider, "Edit");
  let metrics_view = provider.endpoints_form(edit_view).getattr("metrics");
  metrics_view.validate.click();
  let flash_msg_text = edit_view.flash.read().join("/n");
  let is_translated_to_html = false;

  try {
    xmltodict.parse(flash_msg_text)
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof xmltodict.expat.ExpatError) {
      is_translated_to_html = true
    } else {
      throw $EXCEPTION
    }
  };

  if (!is_translated_to_html) throw "Flash massage contains HTML tags"
};

function test_typo_in_metrics_endpoint_type(provider) {
  // 
  //   This test based on bz1538948
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(provider, "Details");
  let endpoints_table = view.entities.summary("Endpoints");

  if (provider.metrics_type.downcase() != endpoints_table.get_text_of("Metrics Type").downcase()) {
    throw "Provider metrics endpoint name from yaml and UI do not match"
  }
}
