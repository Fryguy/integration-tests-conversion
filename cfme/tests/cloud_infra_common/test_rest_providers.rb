require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.rest, pytest.mark.tier(1), pytest.mark.provider([CloudProvider, InfraProvider])]
def delete_provider(appliance, name)
  provs = appliance.rest_api.collections.providers.find_by(name: name)
  if is_bool(!provs)
    return
  end
  prov = provs[0]
  prov.action.delete()
  prov.wait_not_exists()
end
def provider_rest(request, appliance, provider)
  # Creates provider using REST API.
  delete_provider(appliance, provider.name)
  request.addfinalizer(lambda{|| delete_provider(appliance, provider.name)})
  provider.create_rest()
  assert_response(appliance)
  provider_rest = appliance.rest_api.collections.providers.get(name: provider.name)
  return provider_rest
end
def test_query_provider_attributes(provider, provider_rest, soft_assert)
  # Tests access to attributes of /api/providers.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Bugzilla:
  #       1612905
  #       1546112
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/30h
  #   
  outcome = query_resource_attributes(provider_rest)
  for failure in outcome.failed
    soft_assert.(false, "{} \"{}\": status: {}, error: `{}`".format(failure.type, failure.name, failure.response.status_code, failure.error))
  end
end
def test_provider_options(appliance)
  # Tests that provider settings are present in OPTIONS listing.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  options = appliance.rest_api.options(appliance.rest_api.collections.providers._href)
  raise unless options["data"].include?("provider_settings")
end
def test_create_provider(provider_rest)
  # Tests creating provider using REST API.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  raise unless provider_rest.type.include?("ManageIQ::Providers::")
end
def test_provider_refresh(provider_rest, appliance)
  # Test checking that refresh invoked from the REST API works.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  _refresh_success = lambda do
    provider_rest.action.refresh()
    if appliance.rest_api.response.json()["message"].include?("failed last authentication check")
      return false
    end
    return true
  end
  if is_bool(!wait_for(method(:_refresh_success), num_sec: 30, delay: 2, silent_failure: true))
    pytest.fail("Authentication failed, check credentials.")
  end
  task_id = appliance.rest_api.response.json().get("task_id")
  assert_response(appliance, task_wait: 0)
  if is_bool(task_id)
    task = appliance.rest_api.get_entity("tasks", task_id)
    wait_for(lambda{|| ["finished", "queued"].include?(task.state.downcase())}, fail_func: task.reload, num_sec: 30)
    raise  unless task.status.downcase() == "ok"
  end
end
def test_provider_edit(request, provider_rest, appliance)
  # Test editing a provider using REST API.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  new_name = fauxfactory.gen_alphanumeric()
  old_name = provider_rest.name
  request.addfinalizer(lambda{|| provider_rest.action.edit(name: old_name)})
  edited = provider_rest.action.edit(name: new_name)
  assert_response(appliance)
  provider_rest.reload()
  raise unless (provider_rest.name == new_name) and (new_name == edited.name)
end
def test_provider_delete_from_detail(provider_rest, method)
  # Tests deletion of the provider from detail using REST API.
  # 
  #   Bugzilla:
  #       1525498
  #       1501941
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  delete_resources_from_detail([provider_rest], method: method, num_sec: 50)
end
def test_provider_delete_from_collection(provider_rest)
  # Tests deletion of the provider from collection using REST API.
  # 
  #   Bugzilla:
  #       1525498
  #       1501941
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  delete_resources_from_collection([provider_rest], num_sec: 50)
end
def test_create_rhev_provider_with_metric(setup_provider, provider)
  # 
  #   Bugzilla:
  #       1656502
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #       testSteps:
  #           1. Add rhv provider with metrics via REST
  #       expectedResults:
  #           1. Provider must be added with all the details provided.
  #               In this case metric data. no data should be missing.
  #   
  navigate_to(provider, "Edit")
  view = provider.create_view(provider.endpoints_form)
  raise unless view.candu.hostname.read() == provider.endpoints["candu"].hostname
end
