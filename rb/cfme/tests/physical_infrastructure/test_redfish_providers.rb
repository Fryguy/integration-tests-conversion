require_relative 'cfme/physical/provider/redfish'
include Cfme::Physical::Provider::Redfish
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [pytest.mark.provider([RedfishProvider], scope: "function")]
def test_redfish_provider_crud(provider, has_no_physical_providers)
  # Tests provider add with good credentials
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  provider.create()
  provider.validate_stats(ui: true)
  old_name = provider.name
  update(provider) {
    provider.name = fauxfactory.gen_alphanumeric(8)
  }
  update(provider) {
    provider.name = old_name
  }
  provider.delete()
  provider.wait_for_delete()
end
