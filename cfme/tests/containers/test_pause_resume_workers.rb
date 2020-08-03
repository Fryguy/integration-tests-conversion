require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "function"), test_requirements.containers]
def check_ems_state_in_diagnostics(appliance, provider)
  workers_view = navigate_to(appliance.collections.diagnostic_workers, "AllDiagnosticWorkers")
  workers_view.browser.refresh()
  begin
    if is_bool(workers_view.workers_table.rows(name: ).next())
      return true
    end
  rescue Exception
    return false
  end
end
def test_pause_and_resume_provider_workers(appliance, provider, request)
  # 
  #   Basic workers testing for pause and resume for a container provider
  #   Tests steps:
  #       1. Navigate to provider page
  #       2. Pause the provider
  #       3. navigate to : User -> Configuration -> Diagnostics ->  Workers
  #       4. Validate the ems_ workers are not found
  #       5. Navigate to provider page
  #       6. Resume the provider
  #       7. navigate to : User -> Configuration -> Diagnostics ->  Workers
  #       8. Validate the ems_ workers are started
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  view = navigate_to(provider, "Details")
  view.toolbar.configuration.item_select(provider.pause_provider_text, handle_alert: true)
  ems_worker_state = check_ems_state_in_diagnostics(appliance, provider)
  raise "Diagnostics shows that workers are running after pause provider" unless !ems_worker_state
  _finalize = lambda do
    if is_bool(!provider.is_provider_enabled)
      view = navigate_to(provider, "Details")
      view.toolbar.configuration.item_select(provider.resume_provider_text, handle_alert: true)
    end
  end
  view = navigate_to(provider, "Details")
  view.toolbar.configuration.item_select(provider.resume_provider_text, handle_alert: true)
  ems_worker_state = wait_for(lambda{|| !check_ems_state_in_diagnostics(appliance, provider)})
  raise "Diagnostics shows that workers are not running after resume provider" unless ems_worker_state
end
def test_pause_and_resume_single_provider_api(appliance, provider, from_collections, soft_assert, request)
  # 
  #   Test enabling and disabling a single provider via the CFME API through the ManageIQ API Client
  #   collection and entity classes.
  # 
  #   RFE: BZ 1507812
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  match_disable = (appliance.version > 5.11) ? "Pausing" : "Disabling"
  evm_tail_disable = LogValidator("/var/www/miq/vmdb/log/evm.log", matched_patterns: [])
  evm_tail_disable.start_monitoring()
  if is_bool(from_collections)
    rep_disable = appliance.collections.containers_providers.pause_providers(provider)
    soft_assert.(rep_disable[0].get("success"), )
  else
    rep_disable = provider.pause()
    soft_assert.(rep_disable.get("success"), )
  end
  soft_assert.(!provider.is_provider_enabled, "Provider {} is still enabled".format(provider.name))
  raise unless evm_tail_disable.validate()
  raise unless wait_for(lambda{|| !check_ems_state_in_diagnostics(appliance, provider)})
  time.sleep(15)
  project_name = fauxfactory.gen_alpha(8).downcase()
  provider.mgmt.create_project(name: project_name)
  _finalize = lambda do
    provider.mgmt.delete_project(name: project_name)
  end
  project = appliance.collections.container_projects.instantiate(name: project_name, provider: provider)
  provider.refresh_provider_relationships()
  soft_assert(wait_for(lambda{|| !project.exists}, delay: 5, num_sec: 100, message: "waiting for project to display"), )
  match_enable = (appliance.version > 5.11) ? "Resuming" : "Enabling"
  evm_tail_enable = LogValidator("/var/www/miq/vmdb/log/evm.log", matched_patterns: [])
  evm_tail_enable.start_monitoring()
  if is_bool(from_collections)
    rep_enable = appliance.collections.containers_providers.resume_providers(provider)
    soft_assert(rep_enable[0].get("success"), )
  else
    rep_enable = provider.resume()
    soft_assert(rep_enable.get("success"), )
  end
  soft_assert(provider.is_provider_enabled, )
  raise unless evm_tail_enable.validate()
  provider.refresh_provider_relationships()
  soft_assert(wait_for(lambda{|| project.exists}, delay: 5, num_sec: 100, message: "waiting for project to display"), )
end
