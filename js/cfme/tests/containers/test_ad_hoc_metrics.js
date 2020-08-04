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
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);

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

function metrics_up_and_running(provider) {
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

  if (!response.ok) throw `${router.metadata.name} failed to start!`;
  logger.info(`${router.metadata.name} started successfully`)
};

function is_ad_hoc_greyed(provider_object) {
  let view = navigate_to(provider_object, "Details");
  return view.toolbar.monitoring.item_enabled("Ad hoc Metrics")
};

function test_ad_hoc_metrics_overview(provider, metrics_up_and_running) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  if (!is_ad_hoc_greyed(provider)) {
    throw "Monitoring --> Ad hoc Metrics not activated despite provider was set"
  }
};

function test_ad_hoc_metrics_select_filter(provider, metrics_up_and_running) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(provider, "AdHoc");
  view.wait_for_filter_option_to_load();
  view.set_filter(view.get_random_filter());
  view.apply_filter();
  view.wait_for_results_to_load();

  if (view.get_total_results_count() == 0) {
    throw `No results found for ${view.selected_filter}`
  }
}
