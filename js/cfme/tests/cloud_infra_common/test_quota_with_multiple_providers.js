require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.provider({
    classes: [RHEVMProvider],
    selector: ONE_PER_TYPE,
    scope: "module"
  }),

  pytest.mark.provider({
    classes: [VMwareProvider],
    selector: ONE_PER_TYPE,
    fixture_name: "source_provider",
    scope: "module"
  })
];

function test_show_quota_used_on_tenant_screen(appliance, v2v_provider_setup) {
  // Test show quota used on tenant quota screen even when no quotas are set.
  // 
  //   Polarion:
  //       assignee: tpapaioa
  //       initialEstimate: 1/4h
  //       caseimportance: low
  //       caseposneg: positive
  //       casecomponent: Infra
  //       tags: quota
  //       testSteps:
  //           1. Add two infra providers
  //           2. Navigate to provider's 'Details' page.
  //           3. Fetch the information of 'number of VMs'.
  //           4. Navigate to 'Details' page of 'My Company' tenant.
  //           5. Go to tenant quota table.
  //           6. Check whether number of VMs are equal to number of VMs in 'in use' column.
  //   
  v2v_provider_setup.vmware_provider.refresh_provider_relationships;
  v2v_provider_setup.rhv_provider.refresh_provider_relationships;
  let vm_count = v2v_provider_setup.rhv_provider.num_vm() + v2v_provider_setup.vmware_provider.num_vm();
  let root_tenant = appliance.collections.tenants.get_root_tenant();
  let view = navigate_to(root_tenant, "Details");

  for (let row in view.table) {
    let num_of_vms;

    if (row[0].text == "Allocated Number of Virtual Machines") {
      num_of_vms = row[2].text
    }
  };

  let num_of_vms = num_of_vms.split()[0].to_i;
  if (vm_count != num_of_vms) throw new ()
}
