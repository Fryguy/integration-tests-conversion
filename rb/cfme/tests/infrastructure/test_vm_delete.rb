require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.provider([RHEVMProvider], scope: "module"), pytest.mark.usefixtures("setup_provider"), test_requirements.rhev]
def test_delete_vm_on_provider_side(create_vm, provider)
  #  Delete VM on the provider side and refresh relationships in CFME
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Infra
  # 
  #   Bugzilla:
  #       1592430
  #   
  logs = LogValidator("/var/www/miq/vmdb/log/evm.log", failure_patterns: [".*ERROR.*"])
  logs.start_monitoring()
  create_vm.cleanup_on_provider()
  provider.refresh_provider_relationships()
  begin
    wait_for(provider.is_refreshed, func_kwargs: {"refresh_delta" => 10}, timeout: 600)
  rescue TimedOutError
    pytest.fail("Provider failed to refresh after VM was removed from the provider")
  end
  raise unless logs.validate(wait: "60s")
end
