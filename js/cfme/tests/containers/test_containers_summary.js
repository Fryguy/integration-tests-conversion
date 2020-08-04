require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/container");
include(Cfme.Containers.Container);
require_relative("cfme/containers/image");
include(Cfme.Containers.Image);
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
require_relative("cfme/containers/route");
include(Cfme.Containers.Route);
require_relative("cfme/containers/service");
include(Cfme.Containers.Service);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(1),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

let tested_objects = [
  Service,
  Route,
  Project,
  Pod,
  Image,
  Container,
  ImageRegistry,
  Node
];

function test_containers_summary_objects(provider, soft_assert) {
  //  Containers overview page > Widgets > Widgets summary
  //      This test checks that the amount of a selected object in the system is shown correctly
  //       in the widgets in the
  //      Overview menu
  //      Steps:
  //          * Goes to Compute --> Containers --> Overview
  //          * Checks how many objects are shown in the selected widget
  //          * Goes to Containers summary page and checks how many objects are shown there.
  //          * Checks the amount is equal
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(ContainersOverview, "All");

  let status_box_values = tested_objects.map(obj => (
    [obj, (view.status_cards(obj.PLURAL.split_p(" ")[-1])).value]
  )).to_h;

  view = navigate_to(provider, "Details");
  let ui_val_fields = view.entities.summary("Relationships").fields;

  for (let obj in tested_objects) {
    let sb_val = status_box_values[obj];

    for (let ui_val_field in ui_val_fields) {
      if (ui_val_field.include(obj.PLURAL)) {
        let ui_val = view.entities.summary("Relationships").get_text_of(ui_val_field).to_i;

        soft_assert.call(
          sb_val == ui_val,

          "{}: Mismatch between status box ({}) value in Containers overviewand provider's relationships table ({}):".format(
            obj.PLURAL,
            sb_val,
            ui_val
          )
        )
      } else {
        continue
      }
    }
  }
}
