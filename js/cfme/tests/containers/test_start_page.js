require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/container");
include(Cfme.Containers.Container);
require_relative("cfme/containers/image_registry");
include(Cfme.Containers.Image_registry);
require_relative("cfme/containers/node");
include(Cfme.Containers.Node);
require_relative("cfme/containers/overview");
include(Cfme.Containers.Overview);
require_relative("cfme/containers/pod");
include(Cfme.Containers.Pod);
require_relative("cfme/containers/project");
include(Cfme.Containers.Project);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
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
require_relative("cfme/containers/volume");
include(Cfme.Containers.Volume);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

const DataSet = namedtuple("DataSet", ["obj_view", "page_name"]);

let data_sets = [
  DataSet.call(
    ContainersOverviewView,
    "Compute / Containers / Overview"
  ),

  DataSet.call(
    ContainerProvidersView,
    "Compute / Containers / Providers"
  ),

  DataSet.call(NodeAllView, "Compute / Containers / Container Nodes"),
  DataSet.call(PodAllView, "Compute / Containers / Pods"),

  DataSet.call(
    ServiceAllView,
    "Compute / Containers / Container Services"
  ),

  DataSet.call(ProjectAllView, "Compute / Containers / Projects"),

  DataSet.call(
    ImageRegistryAllView,
    "Compute / Containers / Image Registries"
  ),

  DataSet.call(
    TemplateAllView,
    "Compute / Containers / Container Templates"
  ),

  DataSet.call(ReplicatorAllView, "Compute / Containers / Replicators"),
  DataSet.call(RouteAllView, "Compute / Containers / Routes"),
  DataSet.call(VolumeAllView, "Compute / Containers / Volumes"),
  DataSet.call(ContainerAllView, "Compute / Containers / Containers")
];

function test_start_page(appliance, soft_assert) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  for (let data_set in data_sets) {
    appliance.user.my_settings.visual.login_page = data_set.page_name;
    let login_page = navigate_to(appliance.server, "LoginScreen");
    login_page.login_admin();
    let view = appliance.browser.create_view(data_set.obj_view);

    soft_assert.call(
      view.is_displayed,

      "Configured start page is \"{page_name}\", but the start page now is \"{cur_page}\".".format({
        page_name: data_set.page_name,
        cur_page: view.navigation.currently_selected
      })
    )
  }
}
