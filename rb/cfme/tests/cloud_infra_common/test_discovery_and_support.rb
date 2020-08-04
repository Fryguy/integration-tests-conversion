require_relative 'cfme'
include Cfme
require_relative 'cfme/common/provider'
include Cfme::Common::Provider
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
def test_vm_discovery(provider, create_vm)
  #  Tests whether cfme will discover a vm change (add/delete) without being manually refreshed.
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #       tags: power
  #       setup:
  #           1. Desired provider set up
  #       testSteps:
  #           1. Create a virtual machine on the provider.
  #           2. Wait for the VM to appear
  #           3. Delete the VM from the provider (not using CFME)
  #           4. Wait for the VM to become Archived.
  #   
  if is_bool(provider.one_of(SCVMMProvider))
    provider.refresh_provider_relationships()
  end
  begin
    create_vm.wait_to_appear(timeout: 600, load_details: false)
  rescue TimedOutError
    pytest.fail("VM was not found in CFME")
  end
  if is_bool(provider.one_of(SCVMMProvider))
    provider.refresh_provider_relationships()
  end
  create_vm.mgmt.delete()
  create_vm.wait_for_vm_state_change(desired_state: "archived", timeout: 720, from_details: false, from_any_provider: true)
end
def provider_classes(appliance)
  required_providers = all_required(appliance.version)
  selected = {}
  for cat in selected.keys()
    selected[cat].concat(required_providers.select{|prov| prov.category == cat}.map{|prov| prov.klass}.to_set)
  end
  return selected
end
def test_provider_type_support(appliance, soft_assert)
  # Test availability of GCE provider in downstream CFME builds
  # 
  #   Polarion:
  #       assignee: pvala
  #       initialEstimate: 1/10h
  #       casecomponent: WebUI
  #   
  classes_to_test = provider_classes(appliance)
  for (category, providers) in classes_to_test.to_a()
    begin
      collection = appliance.collections.getattr(providers[0].collection_name)
    rescue NoMethodError
      msg = "Missing collection name for a provider class, cannot test UI field"
      logger.exception(msg)
      pytest.fail(msg)
    end
    view = navigate_to(collection, "Add")
    options = view.prov_type.all_options.map{|o| o.text}
    for provider_class in providers
      type_text = provider_class.ems_pretty_name
      if !type_text.equal?(nil)
        soft_assert.(options.include?(type_text), "Provider type [{}] not in Add provider form options [{}]".format(type_text, options))
      end
    end
  end
end
