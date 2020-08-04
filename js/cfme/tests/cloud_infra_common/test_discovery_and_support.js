require_relative("cfme");
include(Cfme);
require_relative("cfme/common/provider");
include(Cfme.Common.Provider);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

function test_vm_discovery(provider, create_vm) {
  //  Tests whether cfme will discover a vm change (add/delete) without being manually refreshed.
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //       tags: power
  //       setup:
  //           1. Desired provider set up
  //       testSteps:
  //           1. Create a virtual machine on the provider.
  //           2. Wait for the VM to appear
  //           3. Delete the VM from the provider (not using CFME)
  //           4. Wait for the VM to become Archived.
  //   
  if (is_bool(provider.one_of(SCVMMProvider))) {
    provider.refresh_provider_relationships()
  };

  try {
    create_vm.wait_to_appear({timeout: 600, load_details: false})
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      pytest.fail("VM was not found in CFME")
    } else {
      throw $EXCEPTION
    }
  };

  if (is_bool(provider.one_of(SCVMMProvider))) {
    provider.refresh_provider_relationships()
  };

  create_vm.mgmt.delete();

  create_vm.wait_for_vm_state_change({
    desired_state: "archived",
    timeout: 720,
    from_details: false,
    from_any_provider: true
  })
};

function provider_classes(appliance) {
  let required_providers = all_required(appliance.version);
  let selected = {};

  for (let cat in selected.keys()) {
    selected[cat].concat(required_providers.select(prov => prov.category == cat).map(prov => (
      prov.klass
    )).to_set)
  };

  return selected
};

function test_provider_type_support(appliance, soft_assert) {
  // Test availability of GCE provider in downstream CFME builds
  // 
  //   Polarion:
  //       assignee: pvala
  //       initialEstimate: 1/10h
  //       casecomponent: WebUI
  //   
  let classes_to_test = provider_classes(appliance);

  for (let [category, providers] in classes_to_test.to_a()) {
    try {
      let collection = appliance.collections.getattr(providers[0].collection_name)
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NoMethodError) {
        let msg = "Missing collection name for a provider class, cannot test UI field";
        logger.exception(msg);
        pytest.fail(msg)
      } else {
        throw $EXCEPTION
      }
    };

    let view = navigate_to(collection, "Add");
    let options = view.prov_type.all_options.map(o => o.text);

    for (let provider_class in providers) {
      let type_text = provider_class.ems_pretty_name;

      if (!type_text.equal(null)) {
        soft_assert.call(
          options.include(type_text),

          "Provider type [{}] not in Add provider form options [{}]".format(
            type_text,
            options
          )
        )
      }
    }
  }
}
