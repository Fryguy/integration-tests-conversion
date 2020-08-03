# Manual tests
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
pytestmark = [pytest.mark.manual, test_requirements.general_ui]
def test_notification_window_events_show_in_timestamp_order()
  # 
  #   Bug 1469534 - The notification events are out of order
  # 
  #   Bugzilla:
  #       1469534
  # 
  #   If multiple event notifications are created near-simultaneously (e.g.,
  #   several VM\"s are provisioned), then clicking on the bell icon in the
  #   top right of the web UI displays the event notifications in timestamp
  #   order.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       startsin: 5.9
  #   
  # pass
end
def test_notification_window_can_be_closed_by_clicking_x()
  # 
  #   Bug 1427484 - Add \"X\" option to enable closing the Notification window
  #   by it.
  # 
  #   Bugzilla:
  #       1427484
  # 
  #   After clicking the bell icon in the top right of the web UI, the \"x\"
  #   in the top right corner of the notification window can be clicked to
  #   close it.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #       startsin: 5.9
  #   
  # pass
end
def test_pdf_summary_provider(provider)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       testSteps:
  #           1. Add an Provider.
  #           2. Open the summary page of the provider
  #           3. In the toolbar check if \"Print or export summary\" button is displayed.
  #           4. Download the summary and check if Quadicon is shown correctly, exactly as in the UI.
  #       expectedResults:
  #           1.
  #           2.
  #           3. Button must be visible.
  #           4. Quadicon must be same as seen in\'
  # 
  #   Bugzilla:
  #       1651194
  #       1503213
  #   
  # pass
end
