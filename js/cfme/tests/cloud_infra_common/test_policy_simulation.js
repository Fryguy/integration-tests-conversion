// This module tests events that are invoked by Cloud/Infra VMs.
require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/common/vm_views");
include(Cfme.Common.Vm_views);
require_relative("cfme/common/vm_views");
include(Cfme.Common.Vm_views);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(2),

  pytest.mark.provider({
    classes: [CloudProvider, InfraProvider],
    selector: ONE_PER_CATEGORY,
    scope: "module"
  }),

  test_requirements.control
];

function test_policy_simulation_ui(provider, navigation) {
  let view;

  // 
  //   Bugzilla:
  //       1670456
  //       1686617
  //       1686619
  //       1688359
  //       1550503
  //       1717483
  //       1717539
  //       1704395
  // 
  //   Polarion:
  //       assignee: jdupuy
  //       casecomponent: Control
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //   
  let collection = provider.appliance.provider_based_collection(provider);
  let vm = collection.all()[0];
  let my_filter = {name: vm.name};
  if (navigation != "all_vms") my_filter.provider = provider;
  let filtered_collection = collection.filter(my_filter);

  if (navigation != "vm_summary") {
    view = navigate_to(filtered_collection, "PolicySimulation")
  } else {
    view = navigate_to(vm, "PolicySimulation", {force: true})
  };

  if (!view.form.entities.check_context_against_entities([vm])) throw new ();
  if (!view.form.cancel_button.is_displayed) throw new ();
  view.form.policy_profile.select_by_visible_text("OpenSCAP profile");

  if (is_bool(vm.provider.one_of(InfraProvider) || !BZ(
    1688359,
    {forced_streams: ["5.10"]}
  ).blocks)) {
    view.form.entities.get_entity({name: vm.name}).click();
    view = vm.create_view(PolicySimulationDetailsView, {wait: "10s"});
    view.back_button.click()
  };

  if (is_bool(!BZ(1670456, {forced_streams: ["5.10"]}).blocks)) {
    view = vm.create_view(PolicySimulationView, {wait: "10s"});
    view.form.cancel_button.click();
    if (!!view.is_displayed) throw new ()
  }
}
