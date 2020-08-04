require_relative("cfme");
include(Cfme);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);

let pytestmark = [
  pytest.mark.tier(1),
  test_requirements.containers,

  pytest.mark.provider(
    [ContainersProvider],
    {scope: "function", selector: ONE_PER_VERSION}
  )
];

function test_container_provider_crud(request, appliance, has_no_providers, provider) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: critical
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  // 
  //   Bugzilla:
  //       1763857
  //   
  provider.create();
  request.addfinalizer(() => provider.delete_if_exists({cancel: false}));
  let view = appliance.browser.create_view(ContainerProvidersView);

  view.flash.assert_success_message("{} Providers \"{}\" was saved".format(
    provider.string_name,
    provider.name
  ));

  if (!provider.exists) throw new ();

  update(
    provider,
    () => provider.name = fauxfactory.gen_alpha(8).downcase()
  );

  if (!view.is_displayed) throw new ();
  view.flash.assert_success_message(`Containers Provider \"${provider.name}\" was saved`);

  if (provider.name != view.entities.get_first_entity().data.get(
    "name",
    {}
  ).to_s) throw new ();

  provider.delete();
  if (!view.is_displayed) throw new ();

  view.flash.assert_success_message("Delete initiated for 1 {} Provider from the {} Database".format(
    provider.string_name,
    appliance.product_name
  ));

  provider.wait_for_delete();
  if (!!provider.exists) throw new ()
}
