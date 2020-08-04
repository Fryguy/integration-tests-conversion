# This module contains REST API specific tests which do not require a provider setup.
# For tests that do require provider setup, add them to test_rest.py
require_relative 'manageiq_client/api'
include Manageiq_client::Api
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.rest, pytest.mark.tier(1)]
def change_company_name(appliance)
  old_company_name = appliance.advanced_settings["server"]["company"]
  updated_company_name = "REST Company Name"
  appliance.update_advanced_settings({"server" => {"company" => updated_company_name}})
  yield(updated_company_name)
  appliance.update_advanced_settings({"server" => {"company" => old_company_name}})
end
def test_update_roles_via_rest_name_change(appliance, request, change_company_name)
  # 
  #   Bugzilla:
  #       1596142
  # 
  #   Polarion:
  #       assignee: pvala
  #       caseimportance: high
  #       casecomponent: Rest
  #       initialEstimate: 1/4h
  #       setup:
  #           1. Change the current server name to something other than the default.
  #       testSteps:
  #           1. Send a PATCH request to update the server roles via REST using
  #               `appliance.update_advanced_settings({\"server\": {\"role\": :roles}})`
  #           2. Check if the server name was set to default.
  #       expectedResults:
  #           1. Request was successful.
  #           2. Server name remains the same.
  #   
  old_roles = appliance.advanced_settings["server"]["role"]
  enable_notifier = !old_roles.include?("notifier")
  new_roles = is_bool(enable_notifier) ? "#{old_roles},notifier" : old_roles.gsub("notifier", "")
  appliance.update_advanced_settings({"server" => {"role" => new_roles}})
  request.addfinalizer(lambda{|| appliance.update_advanced_settings({"server" => {"role" => old_roles}})})
  wait_for(lambda{|| appliance.server_roles["notifier"] == enable_notifier}, delay: 1, num_sec: 120, message: "Wait until the role change comes into effect.")
  raise unless appliance.advanced_settings["server"]["company"] == change_company_name
end
def test_authorization_header_sql_response(appliance)
  # 
  #   Bugzilla:
  #       1661445
  #       1686021
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. GET /api/auth?requester_type=ui HEADERS: {\"Authorization\": \"Basic testing\"}
  #               Perform this GET request with requests.get()
  #       expectedResults:
  #           1. There should be no sql statement in the response.
  #               Expected Response:
  #               {
  #               \"error\": {
  #                   \"kind\": \"unauthorized\",
  #                   \"message\": (\"PG::CharacterNotInRepertoire: ERROR:\"
  #                               \"  invalid byte sequence for encoding \"UTF8\": 0xb5
  # :\"),
  #                   \"klass\": \"Api::AuthenticationError\"
  #                   }
  #               }
  #   
  rest_api = appliance.new_rest_api_instance(entry_point: appliance.rest_api._entry_point)
  rest_api._session.headers = {"Authorization" => "Basic testing"}
  rest_api._session.auth = nil
  url = "https://#{appliance.hostname}/api/auth?requester_type=ui"
  error_message = "PG::CharacterNotInRepertoire: ERROR:  invalid byte sequence for encoding \"UTF8\": 0xb5
:"
  pytest.raises(APIException, match: error_message) {
    rest_api.get(url)
  }
end
