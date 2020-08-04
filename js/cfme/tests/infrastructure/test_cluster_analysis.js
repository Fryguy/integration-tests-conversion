require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(2),
  test_requirements.smartstate,
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.provider([InfraProvider], {selector: ONE_PER_TYPE})
];

function test_run_cluster_analysis(appliance, provider) {
  // Tests smarthost analysis
  // 
  //   Metadata:
  //       test_flag: cluster_analysis
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: SmartState
  //       initialEstimate: 1/3h
  //   
  let cluster_coll = appliance.collections.clusters.filter({provider: provider});
  let test_cluster = cluster_coll.all()[0];
  test_cluster.wait_for_exists();
  test_cluster.run_smartstate_analysis();
  let cluster_view = navigate_to(test_cluster, "Details");

  let drift_num = wait_for(
    () => cluster_view.entities.relationships.get_text_of("Drift History"),

    {
      delay: 20,
      timeout: "5m",
      fail_func: appliance.server.browser.refresh,
      fail_condition: "None"
    }
  );

  if (drift_num == "0") throw "No drift history change found"
}
