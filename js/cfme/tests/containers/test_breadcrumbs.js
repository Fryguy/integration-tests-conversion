require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/image");
include(Cfme.Containers.Image);
require_relative("cfme/containers/image_registry");
include(Cfme.Containers.Image_registry);
require_relative("cfme/containers/node");
include(Cfme.Containers.Node);
require_relative("cfme/containers/pod");
include(Cfme.Containers.Pod);
require_relative("cfme/containers/project");
include(Cfme.Containers.Project);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/containers/replicator");
include(Cfme.Containers.Replicator);
require_relative("cfme/containers/route");
include(Cfme.Containers.Route);
require_relative("cfme/containers/service");
include(Cfme.Containers.Service);
require_relative("cfme/containers/template");
include(Cfme.Containers.Template);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.tier(1),
  pytest.mark.provider([ContainersProvider], {scope: "module"}),
  test_requirements.containers
];

const DataSet = namedtuple("DataSet", ["obj", "collection_obj"]);

const TESTED_OBJECTS = [
  DataSet.call(Service, "container_services"),
  DataSet.call(Route, "container_routes"),
  DataSet.call(Project, "container_projects"),
  DataSet.call(Pod, "container_pods"),
  DataSet.call(Image, "container_images"),
  DataSet.call(ContainersProvider, "containers_providers"),
  DataSet.call(ImageRegistry, "container_image_registries"),
  DataSet.call(Node, "container_nodes"),
  DataSet.call(Replicator, "container_replicators"),
  DataSet.call(Template, "container_templates")
];

function clear_search(view) {
  view.entities.search.clear_simple_search();
  view.entities.search.search_button.click()
};

function test_breadcrumbs(provider, appliance, soft_assert) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  for (let data_set in TESTED_OBJECTS) {
    let instances = (data_set.collection_obj == "containers_providers" ? [provider] : appliance.collections.getattr(data_set.collection_obj).all());
    let __dummy0__ = false;

    for (let instance in instances) {
      if (is_bool(instance.exists)) {
        let test_obj = instance;
        break
      };

      if (instance == instances[-1]) __dummy0__ = true
    };

    if (__dummy0__) pytest.skip("No content found for test");
    let view = navigate_to(test_obj, "Details");

    soft_assert.call(
      view.breadcrumb.is_displayed,

      "Breadcrumbs not found in {} {} summary page".format(
        data_set.obj.__name__,
        test_obj.name
      )
    );

    soft_assert.call(
      view.breadcrumb.locations.include(view.summary_text),

      "Could not find breadcrumb \"{}\" in {} {} summary page. breadcrumbs: {}".format(
        view.summary_text,
        view.breadcrumb.locations,
        data_set.obj.__name__,
        test_obj.name
      )
    );

    view.breadcrumb.click_location(view.SUMMARY_TEXT);
    view = appliance.browser.create_view(data_set.obj.all_view);
    clear_search(view);

    soft_assert.call(
      view.is_displayed,

      "Breadcrumb link \"{summary}\" in {obj} {name} page should navigate to {obj}s all page. navigated instead to: {url}".format({
        summary: view.summary_text,
        obj: data_set.obj.__name__,
        name: test_obj.name,
        url: view.browser.url
      })
    )
  }
}
