require_relative("cfme");
include(Cfme);
require_relative("cfme/intelligence/chargeback/assignments");
include(Cfme.Intelligence.Chargeback.Assignments);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [pytest.mark.tier(3), test_requirements.chargeback];

function test_assign_compute_enterprise(appliance, virtualcenter_provider) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  let view = navigate_to(appliance.server, "Chargeback");

  let enterprise = cb.ComputeAssign({
    assign_to: "The Enterprise",
    selections: {Enterprise: {Rate: "Default"}}
  });

  enterprise.assign();
  let assign_view = view.browser.create_view(AssignmentsView);
  let row = assign_view.selections.row({name: "Enterprise"});
  let selected_option = row.rate.widget.selected_option;
  if (selected_option != "Default") throw "Selection does not match"
};

function test_assign_compute_provider(appliance, virtualcenter_provider) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  // 
  //   
  let view = navigate_to(appliance.server, "Chargeback");

  let compute_provider = cb.ComputeAssign({
    assign_to: "Selected Providers",
    selections: {[virtualcenter_provider.name]: {Rate: "Default"}}
  });

  compute_provider.assign();
  let assign_view = view.browser.create_view(AssignmentsView);
  let row = assign_view.selections.row({name: virtualcenter_provider.name});
  let selected_option = row.rate.widget.selected_option;
  if (selected_option != "Default") throw "Selection does not match"
};

function test_assign_compute_cluster(appliance, virtualcenter_provider) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: CandU
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let view = navigate_to(appliance.server, "Chargeback");

  let cluster_name = ("{}/{}").format(
    virtualcenter_provider.name,
    random.choice(virtualcenter_provider.data.clusters)
  );

  let cluster = cb.ComputeAssign({
    assign_to: "Selected Cluster / Deployment Roles",
    selections: {cluster_name: {Rate: "Default"}}
  });

  cluster.assign();
  let assign_view = view.browser.create_view(AssignmentsView);
  let row = assign_view.selections.row({name: cluster_name});
  let selected_option = row.rate.widget.selected_option;
  if (selected_option != "Default") throw "Selection does not match"
};

function test_assign_compute_taggedvm(appliance, virtualcenter_provider) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: CandU
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let view = navigate_to(appliance.server, "Chargeback");

  let tagged_vm = cb.ComputeAssign({
    assign_to: "Tagged VMs and Instances",
    tag_category: "Location",
    selections: {Chicago: {Rate: "Default"}}
  });

  tagged_vm.assign();
  let assign_view = view.browser.create_view(AssignmentsView);
  let row = assign_view.selections.row({name: "Chicago"});
  let selected_option = row.rate.widget.selected_option;
  if (selected_option != "Default") throw "Selection does not match"
};

function test_assign_storage_enterprise(appliance, virtualcenter_provider) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: CandU
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let view = navigate_to(appliance.server, "Chargeback");

  let enterprise = cb.StorageAssign({
    assign_to: "The Enterprise",
    selections: {Enterprise: {Rate: "Default"}}
  });

  enterprise.assign();
  let assign_view = view.browser.create_view(AssignmentsView);
  let row = assign_view.selections.row({name: "Enterprise"});
  let selected_option = row.rate.widget.selected_option;
  if (selected_option != "Default") throw "Selection does not match"
};

function test_assign_storage_datastores(appliance, virtualcenter_provider) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       casecomponent: CandU
  //   
  let view = navigate_to(appliance.server, "Chargeback");
  let datastore = random.choice(virtualcenter_provider.data.datastores).name;

  let sel_datastore = cb.StorageAssign({
    assign_to: "Selected Datastores",
    selections: {datastore: {Rate: "Default"}}
  });

  sel_datastore.assign();
  let assign_view = view.browser.create_view(AssignmentsView);
  let row = assign_view.selections.row({name: datastore});
  let selected_option = row.rate.widget.selected_option;
  if (selected_option != "Default") throw "Selection does not match"
};

function test_assign_storage_tagged_datastores(appliance, virtualcenter_provider) {
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       casecomponent: CandU
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  let view = navigate_to(appliance.server, "Chargeback");

  let tagged_datastore = cb.StorageAssign({
    assign_to: "Tagged Datastores",
    tag_category: "Location",
    selections: {Chicago: {Rate: "Default"}}
  });

  tagged_datastore.assign();
  let assign_view = view.browser.create_view(AssignmentsView);
  let row = assign_view.selections.row({name: "Chicago"});
  let selected_option = row.rate.widget.selected_option;
  if (selected_option != "Default") throw "Selection does not match"
}
