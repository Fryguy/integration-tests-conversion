require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "function"), test_requirements.containers]
def check_buttons_status(view, pause_option, resume_option)
  pause_option_status = view.toolbar.configuration.item_enabled(pause_option)
  resume_option_status = view.toolbar.configuration.item_enabled(resume_option)
  if is_bool(pause_option_status && resume_option_status)
    return [false, "Both pause and resume buttons are active at the same time"]
  end
  if is_bool(!pause_option_status || resume_option_status)
    return [false, "Both pause and resume buttons are disabled at the same time"]
  end
  return [true, nil]
end
def test_edit_selected_containers_provider(provider)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  # Testing Configuration -> Edit... button functionality
  #   Step:
  #       In Providers summary page - click configuration
  #       menu and select \"Edit this containers provider\"
  #   Expected result:
  #       The user should be navigated to the container\'s basic information page.
  view = navigate_to(provider, "Edit")
  raise unless view.is_displayed
  view.cancel.click()
end
def test_ocp_operator_out_of_the_box(appliance)
  # 
  #   This test checks that the container oprator role is available out-of_the_box
  #   Steps:
  #    1. Navigate to  Administration | EVM (on the right upper corner)--> Configuration
  #    2. In the new page on the left menu select Access Control --> roles
  #    3. Search for container operator role
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  roles_collection = appliance.collections.roles
  view = navigate_to(roles_collection, "All")
  role_name_prefix = "container_operator"
  is_role_found = bool(view.table.rows().select{|row| row.name.text.downcase().include?(role_name_prefix)}.map{|row| row})
  raise  unless is_role_found
end
def test_pause_and_resume_provider(provider)
  # 
  #   Basic testing for pause and resume for a container provider
  #   Tests steps:
  #       1. Navigate to provider page
  #       2. Validate buttons status are as expected
  #       3. Pause the provider
  #       4. Validate the button status
  #       5. Validate the provider marked as paused
  #       6. Resume the provider
  #       7. Validate button status
  #       8. Validate the provider marked as running
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  view = navigate_to(provider, "Details")
  buttn_status,error_msg = check_buttons_status(view, provider.pause_provider_text, provider.resume_provider_text)
  raise error_msg unless buttn_status
  view.toolbar.configuration.item_select(provider.pause_provider_text, handle_alert: true)
  view.browser.refresh()
  buttn_status,error_msg = check_buttons_status(view, provider.pause_provider_text, provider.resume_provider_text)
  raise error_msg unless buttn_status
  raise "Provider did not pause after pause request" unless view.entities.summary("Status").get_text_of("Data Collection").downcase() == "paused"
  view.toolbar.configuration.item_select(provider.resume_provider_text, handle_alert: true)
  view.browser.refresh()
  buttn_status,error_msg = check_buttons_status(view, provider.pause_provider_text, provider.resume_provider_text)
  raise error_msg unless buttn_status
  raise "Provider did not resumed after pause request" unless view.entities.summary("Status").get_text_of("Data Collection").downcase() == "running"
end
