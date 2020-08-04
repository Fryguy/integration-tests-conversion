require_relative("datetime");
include(Datetime);
require_relative("datetime");
include(Datetime);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),
  test_requirements.c_and_u,
  pytest.mark.usefixtures("setup_provider_modscope"),

  pytest.mark.provider([VMwareProvider], {
    scope: "module",
    required_fields: [[["cap_and_util", "capandu_vm"], "cu-24x7"]]
  }),

  pytest.mark.meta({blockers: [BZ(1635126, {forced_streams: ["5.10"]})]})
];

const ELEMENTS = ["vm", "host"];
const GRAPH_TYPE = ["hourly", "daily"];

function order_data(appliance, provider, enable_candu) {
  let end_date = Datetime.now();
  let start_date = end_date - timedelta({days: 2});
  let view = navigate_to(appliance.server.zone, "CANDUGapCollection");

  view.candugapcollection.fill({
    end_date: end_date,
    start_date: start_date
  });

  view.candugapcollection.submit.click()
};

function test_gap_collection(appliance, provider, element, graph_type, order_data) {
  //  Test gap collection data
  // 
  //   prerequisites:
  //       * C&U enabled appliance
  // 
  //   Steps:
  //       * Navigate to Configuration > Diagnostics > Zone Gap Collection Page
  //       * Order old data
  //       * Navigate to VM or Host Utilization page
  //       * Check for Hourly data
  //       * Check for Daily data
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: CandU
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  if (element == "host") {
    let collection = appliance.collections.hosts;

    for (let test_host in provider.data.hosts) {
      if (is_bool(!test_host.get("test_fleece", false))) continue;
      element = collection.instantiate({name: test_host.name, provider})
    }
  } else if (element == "vm") {
    let collection = appliance.provider_based_collection(provider);
    element = collection.instantiate("cu-24x7", provider)
  };

  let date = Datetime.now() - timedelta({days: 1});
  element.wait_candu_data_available({timeout: 1200});
  let view = navigate_to(element, "candu");
  view.options.interval.fill(graph_type.capitalize());

  try {
    let graph = view.getattr("vm_cpu")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NoMethodError) {
      let graph = view.interval_type.getattr("host_cpu")
    } else {
      throw $EXCEPTION
    }
  };

  if (!graph.is_displayed) throw new ();

  let refresh = () => {
    provider.browser.refresh();
    view = navigate_to(element, "candu");
    return view.options.interval.fill(graph_type.capitalize())
  };

  wait_for(
    () => graph.all_legends.size > 0,
    {delay: 5, timeout: 600, fail_func: refresh}
  );

  view.options.calendar.fill(date);
  let graph_data = 0;

  for (let leg in graph.all_legends) {
    graph.display_legends(leg);

    for (let data in graph.data_for_legends(leg).values()) {
      graph_data += ((data[leg].gsub(",", "").gsub("%", "")).split()[0]).to_f
    }
  };

  if (graph_data <= 0) throw new ()
}
