require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/virtual_machines");
include(Cfme.Infrastructure.Virtual_machines);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);

let pytestmark = [
  pytest.mark.tier(2),

  pytest.mark.provider({
    classes: [InfraProvider],
    selector: ONE_PER_TYPE
  }),

  pytest.mark.usefixtures("setup_provider"),
  test_requirements.rhev,
  test_requirements.general_ui
];

function test_edit_management_relationship(appliance, create_vm) {
  // 
  //   check that Edit Management Relationship works for the VM
  // 
  //   Bugzilla:
  //       1534400
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: WebUI
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //   
  let vm_relationship = InfraVm.CfmeRelationship(create_vm);

  for (let i in (2).times) {
    vm_relationship.set_relationship(
      appliance.server.name,
      appliance.server.sid
    );

    vm_relationship.remove_relationship()
  }
}
