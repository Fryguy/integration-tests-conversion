require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(1),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

function check_buttons_status(view, pause_option, resume_option) {
  let pause_option_status = view.toolbar.configuration.item_enabled(pause_option);
  let resume_option_status = view.toolbar.configuration.item_enabled(resume_option);

  if (is_bool(pause_option_status && resume_option_status)) {
    return [
      false,
      "Both pause and resume buttons are active at the same time"
    ]
  };

  if (is_bool(!pause_option_status || resume_option_status)) {
    return [
      false,
      "Both pause and resume buttons are disabled at the same time"
    ]
  };

  return [true, null]
};

function test_edit_selected_containers_provider(provider) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  // Testing Configuration -> Edit... button functionality
  //   Step:
  //       In Providers summary page - click configuration
  //       menu and select \"Edit this containers provider\"
  //   Expected result:
  //       The user should be navigated to the container\'s basic information page.
  let view = navigate_to(provider, "Edit");
  if (!view.is_displayed) throw new ();
  view.cancel.click()
};

function test_ocp_operator_out_of_the_box(appliance) {
  // 
  //   This test checks that the container oprator role is available out-of_the_box
  //   Steps:
  //    1. Navigate to  Administration | EVM (on the right upper corner)--> Configuration
  //    2. In the new page on the left menu select Access Control --> roles
  //    3. Search for container operator role
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let roles_collection = appliance.collections.roles;
  let view = navigate_to(roles_collection, "All");
  let role_name_prefix = "container_operator";

  let is_role_found = bool(view.table.rows().select(row => (
    row.name.text.downcase().include(role_name_prefix)
  )).map(row => row));

  if (!is_role_found) throw `No ${role_name_prefix} found`
};

function test_pause_and_resume_provider(provider) {
  // 
  //   Basic testing for pause and resume for a container provider
  //   Tests steps:
  //       1. Navigate to provider page
  //       2. Validate buttons status are as expected
  //       3. Pause the provider
  //       4. Validate the button status
  //       5. Validate the provider marked as paused
  //       6. Resume the provider
  //       7. Validate button status
  //       8. Validate the provider marked as running
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(provider, "Details");

  let [buttn_status, error_msg] = check_buttons_status(
    view,
    provider.pause_provider_text,
    provider.resume_provider_text
  );

  if (!buttn_status) throw error_msg;

  view.toolbar.configuration.item_select(
    provider.pause_provider_text,
    {handle_alert: true}
  );

  view.browser.refresh();

  [buttn_status, error_msg] = check_buttons_status(
    view,
    provider.pause_provider_text,
    provider.resume_provider_text
  );

  if (!buttn_status) throw error_msg;

  if (view.entities.summary("Status").get_text_of("Data Collection").downcase() != "paused") {
    throw "Provider did not pause after pause request"
  };

  view.toolbar.configuration.item_select(
    provider.resume_provider_text,
    {handle_alert: true}
  );

  view.browser.refresh();

  [buttn_status, error_msg] = check_buttons_status(
    view,
    provider.pause_provider_text,
    provider.resume_provider_text
  );

  if (!buttn_status) throw error_msg;

  if (view.entities.summary("Status").get_text_of("Data Collection").downcase() != "running") {
    throw "Provider did not resumed after pause request"
  }
}
