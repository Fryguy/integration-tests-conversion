require_relative("wrapanapi/utils");
include(Wrapanapi.Utils);
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/container");
include(Cfme.Containers.Container);
require_relative("cfme/containers/container");
include(Cfme.Containers.Container);
require_relative("cfme/containers/image");
include(Cfme.Containers.Image);
require_relative("cfme/containers/image");
include(Cfme.Containers.Image);
require_relative("cfme/containers/image_registry");
include(Cfme.Containers.Image_registry);
require_relative("cfme/containers/image_registry");
include(Cfme.Containers.Image_registry);
require_relative("cfme/containers/node");
include(Cfme.Containers.Node);
require_relative("cfme/containers/node");
include(Cfme.Containers.Node);
require_relative("cfme/containers/pod");
include(Cfme.Containers.Pod);
require_relative("cfme/containers/pod");
include(Cfme.Containers.Pod);
require_relative("cfme/containers/project");
include(Cfme.Containers.Project);
require_relative("cfme/containers/project");
include(Cfme.Containers.Project);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/containers/route");
include(Cfme.Containers.Route);
require_relative("cfme/containers/route");
include(Cfme.Containers.Route);
require_relative("cfme/containers/service");
include(Cfme.Containers.Service);
require_relative("cfme/containers/service");
include(Cfme.Containers.Service);
require_relative("cfme/containers/template");
include(Cfme.Containers.Template);
require_relative("cfme/containers/template");
include(Cfme.Containers.Template);
require_relative("cfme/containers/volume");
include(Cfme.Containers.Volume);
require_relative("cfme/containers/volume");
include(Cfme.Containers.Volume);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(1),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

const TEST_ITEMS = [
  ContainersTestItem(Container, "test_properties_container_provider", {
    expected_fields: [
      "Name",
      "State",
      "Last State",
      "Restart count",
      "Backing Ref (Container ID)"
    ],

    collection_object: ContainerCollection
  }),

  ContainersTestItem(Project, "test_properties_container_project", {
    expected_fields: ["Name", "Creation timestamp", "Resource version"],
    collection_object: ProjectCollection
  }),

  ContainersTestItem(Route, "test_properties_container_route", {
    expected_fields: [
      "Name",
      "Creation timestamp",
      "Resource version",
      "Host Name"
    ],

    collection_object: RouteCollection
  }),

  ContainersTestItem(Pod, "test_properties_container_pod", {
    expected_fields: [
      "Name",
      "Status",
      "Creation timestamp",
      "Resource version",
      "Restart policy",
      "DNS Policy",
      "IP Address"
    ],

    collection_object: PodCollection
  }),

  ContainersTestItem(Node, "test_properties_container_node", {
    expected_fields: [
      "Name",
      "Creation timestamp",
      "Resource version",
      "Number of CPU Cores",
      "Memory",
      "Max Pods Capacity",
      "System BIOS UUID",
      "Machine ID",
      "Infrastructure Machine ID",
      "Container runtime version",
      "Kubernetes kubelet version",
      "Kubernetes proxy version",
      "Operating System Distribution",
      "Kernel version"
    ],

    collection_object: NodeCollection
  }),

  ContainersTestItem(Service, "test_properties_container_service", {
    expected_fields: [
      "Name",
      "Creation timestamp",
      "Resource version",
      "Session affinity",
      "Type",
      "Portal IP"
    ],

    collection_object: ServiceCollection
  }),

  ContainersTestItem(
    ImageRegistry,
    "test_properties_container_image_registry",

    {
      expected_fields: ["Host"],
      collection_object: ImageRegistryCollection
    }
  ),

  ContainersTestItem(Template, "test_properties_container_template", {
    expected_fields: ["Name", "Creation timestamp", "Resource version"],
    collection_object: TemplateCollection
  }),

  ContainersTestItem(Volume, "test_properties_container_volumes", {
    expected_fields: [
      "Name",
      "Creation timestamp",
      "Resource version",
      "Access modes",
      "Reclaim policy",
      "Status phase",
      "Volume path"
    ],

    collection_object: VolumeCollection
  }),

  ContainersTestItem(Image, "test_properties_container_image", {
    expected_fields: [
      "Name",
      "Image Id",
      "Full Name",
      "Architecture",
      "Author",
      "Command",
      "Entrypoint",
      "Docker Version",
      "Exposed Ports",
      "Size"
    ],

    collection_object: ImageCollection
  })
];

function test_properties(provider, appliance, test_item, soft_assert) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: medium
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let instances = test_item.collection_object(appliance).all();
  let __dummy0__ = false;

  for (let inst in instances) {
    if (is_bool(inst.exists)) {
      let instance = inst;
      break
    };

    if (inst == instances[-1]) __dummy0__ = true
  };

  if (__dummy0__) pytest.skip("No content found for test");
  let expected_fields = test_item.expected_fields;
  let view = navigate_to(instance, "Details");

  for (let field in expected_fields) {
    try {
      view.entities.summary("Properties").get_field(field)
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NameError) {
        soft_assert.call(
          false,

          ("{} \"{}\" properties table has missing field - \"{}\"").format(
            test_item.obj.__name__,
            instance.name,
            field
          )
        )
      } else {
        throw $EXCEPTION
      }
    }
  }
};

function test_pods_conditions(provider, appliance, soft_assert) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: medium
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let selected_pods_cfme = appliance.collections.container_pods.all();
  let pods_per_ready_status = provider.pods_per_ready_status();

  for (let pod in selected_pods_cfme) {
    if (is_bool(!pod.exists)) continue;
    let view = navigate_to(pod, "Details");
    let ose_pod_condition = pods_per_ready_status[pod.name];

    let cfme_pod_condition = view.entities.conditions.rows().map(r => (
      [r.name.text, eval_strings([r.status.text]).pop()]
    )).to_h;

    for (let status in cfme_pod_condition) {
      soft_assert.call(
        ose_pod_condition.map(cond => cond).is_all == cfme_pod_condition.Ready,

        "The Pod {} status mismatch: It is \"{}\" in openshift while cfme sees \"{}\".".format(
          status,
          pod.name,
          ose_pod_condition,
          cfme_pod_condition.Ready
        )
      )
    }
  }
}
