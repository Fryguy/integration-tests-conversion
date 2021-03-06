require_relative 'cfme/physical/provider/lenovo'
include Cfme::Physical::Provider::Lenovo
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
TIMEOUT = 300
DELAY = 60
SOURCES = ["LenovoXclarity"]
pytestmark = [pytest.mark.tier(3), pytest.mark.provider([LenovoProvider], scope: "module")]
def physical_server(setup_provider_modscope, appliance)
  physical_server = appliance.rest_api.collections.physical_servers[0]
  return physical_server
end
def enumerate_physical_infra_provider_events(appliance)
  return SOURCES.map{|x| enumerate_events_from_source(appliance, x)}.sum
end
def enumerate_events_from_source(appliance, source)
  return appliance.rest_api.collections.event_streams.find_by(source: source).count
end
def enumerate_events_and_refresh_physical_infra_provider(appliance, provider)
  event_count = enumerate_physical_infra_provider_events(appliance)
  provider.refresh_provider_relationships()
  return event_count
end
def test_get_physical_infra_provider_power_event(appliance, physical_server, provider)
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Rest
  #       initialEstimate: 1/4h
  #   
  previous_num_events = enumerate_physical_infra_provider_events(appliance)
  physical_server.action.restart_now()
  assert_response(appliance)
  wait_for(lambda{|| enumerate_events_and_refresh_physical_infra_provider(appliance, provider) > previous_num_events}, num_sec: TIMEOUT, delay: DELAY)
end
