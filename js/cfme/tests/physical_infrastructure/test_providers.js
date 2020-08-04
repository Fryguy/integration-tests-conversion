require_relative("cfme");
include(Cfme);
require_relative("cfme/physical/provider/lenovo");
include(Cfme.Physical.Provider.Lenovo);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);

let pytestmark = [pytest.mark.provider(
  [LenovoProvider],
  {scope: "function"}
)];

function test_physical_infra_provider_crud(provider, has_no_providers) {
  // Tests provider add with good credentials
  // 
  //   Metadata:
  //       test_flag: crud
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  provider.create();
  provider.validate_stats({ui: true});
  let old_name = provider.name;
  update(provider, () => provider.name = uuid.uuid4().to_s);
  update(provider, () => provider.name = old_name);
  provider.delete();
  provider.wait_for_delete()
}
