require 'None'
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/common/provider_views'
include Cfme::Common::Provider_views
require_relative 'cfme/common/provider_views'
include Cfme::Common::Provider_views
require_relative 'cfme/common/provider_views'
include Cfme::Common::Provider_views
require_relative 'cfme/fixtures/provider'
include Cfme::Fixtures::Provider
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.discovery, pytest.mark.tier(3), pytest.mark.provider([InfraProvider], scope: "function")]
discovery_ips = [{"from" => ["10", "120", "120", "120"], "to" => "119", "msg" => "Infrastructure Providers Discovery returned: Ending address must be greater than starting address"}, {"from" => ["333", "120", "120", "120"], "to" => "120", "msg" => "Infrastructure Providers Discovery returned: IP address octets must be 0 to 255"}, {"from" => ["10", "333", "120", "120"], "to" => "120", "msg" => "Infrastructure Providers Discovery returned: IP address octets must be 0 to 255"}, {"from" => ["10", "120", "333", "120"], "to" => "120", "msg" => "Infrastructure Providers Discovery returned: IP address octets must be 0 to 255"}, {"from" => ["10", "120", "120", "333"], "to" => "120", "msg" => "Infrastructure Providers Discovery returned: IP address octets must be 0 to 255"}, {"from" => ["10", "", "", ""], "to" => "120", "msg" => "Infrastructure Providers Discovery returned: Starting address is malformed"}, {"from" => ["10", "120", "120", "120"], "to" => "", "msg" => "Infrastructure Providers Discovery returned: Ending address is malformed"}]
def test_empty_discovery_form_validation_infra(appliance)
  #  Tests that the flash message is correct when discovery form is empty.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #   
  collection = appliance.collections.infra_providers
  collection.discover(nil)
  view = appliance.browser.create_view(InfraProvidersDiscoverView)
  view.flash.assert_message("At least 1 item must be selected for discovery")
end
def test_discovery_cancelled_validation_infra(appliance)
  #  Tests that the flash message is correct when discovery is cancelled.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: low
  #       initialEstimate: 1/15h
  #   
  collection = appliance.collections.infra_providers
  collection.discover(nil, cancel: true)
  view = appliance.browser.create_view(InfraProvidersView)
  view.flash.assert_success_message("Infrastructure Providers Discovery was cancelled by the user")
end
def test_add_cancelled_validation_infra(appliance)
  # Tests that the flash message is correct when add is cancelled.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #   
  appliance.collections.infra_providers.create(prov_class: VMwareProvider, cancel: true)
  view = appliance.browser.create_view(InfraProvidersView)
  view.flash.assert_success_message("Add of Infrastructure Provider was cancelled by the user")
end
def test_type_required_validation_infra(appliance)
  # Test to validate type while adding a provider
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #   
  pytest.raises(RuntimeError) {
    appliance.collections.infra_providers.create(prov_class: VMwareProvider)
  }
  view = appliance.browser.create_view(InfraProviderAddView)
  raise unless !view.add.active
end
def test_name_required_validation_infra(appliance)
  # Tests to validate the name while adding a provider
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #   
  collections = appliance.collections.infra_providers
  endpoint = VirtualCenterEndpoint(hostname: fauxfactory.gen_alphanumeric(5))
  pytest.raises(RuntimeError) {
    collections.create(prov_class: VMwareProvider, name: nil, endpoints: endpoint)
  }
  view = appliance.browser.create_view(InfraProviderAddView)
  raise unless view.name.help_block == "Required"
  raise unless !view.add.active
end
def test_host_name_required_validation_infra(appliance)
  # Test to validate the hostname while adding a provider
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #   
  endpoint = VirtualCenterEndpoint(hostname: nil)
  collections = appliance.collections.infra_providers
  prov = collections.instantiate(prov_class: VMwareProvider, name: fauxfactory.gen_alphanumeric(5), endpoints: endpoint)
  pytest.raises(RuntimeError) {
    prov.create()
  }
  view = appliance.browser.create_view(prov.endpoints_form)
  raise unless view.hostname.help_block == "Required"
  view = appliance.browser.create_view(InfraProviderAddView)
  raise unless !view.add.active
end
def test_name_max_character_validation_infra(request, infra_provider)
  # Test to validate max character for name field
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #   
  request.addfinalizer(lambda{|| infra_provider.delete_if_exists(cancel: false)})
  name = fauxfactory.gen_alphanumeric(255)
  update(infra_provider) {
    infra_provider.name = name
  }
  raise unless infra_provider.exists
end
def test_host_name_max_character_validation_infra(appliance)
  # Test to validate max character for host name field
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  endpoint = VirtualCenterEndpoint(hostname: fauxfactory.gen_alphanumeric(256))
  collections = appliance.collections.infra_providers
  prov = collections.instantiate(prov_class: VMwareProvider, name: fauxfactory.gen_alphanumeric(5), endpoints: endpoint)
  begin
    prov.create()
  rescue RuntimeError
    view = appliance.browser.create_view(prov.endpoints_form)
    raise unless view.hostname.value == prov.hostname[0...255]
  end
end
def test_api_port_max_character_validation_infra(appliance)
  # Test to validate max character for api port field
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #   
  collections = appliance.collections.infra_providers
  endpoint = RHEVMEndpoint(hostname: fauxfactory.gen_alphanumeric(5), api_port: fauxfactory.gen_alphanumeric(16), verify_tls: nil, ca_certs: nil)
  prov = collections.instantiate(prov_class: RHEVMProvider, name: fauxfactory.gen_alphanumeric(5), endpoints: endpoint)
  begin
    prov.create()
  rescue RuntimeError
    view = appliance.browser.create_view(prov.endpoints_form)
    text = view.default.api_port.value
    raise unless text == prov.default_endpoint.api_port[0...15]
  end
end
def test_providers_discovery(request, appliance, has_no_providers, provider)
  # Tests provider discovery
  # 
  #   Metadata:
  #       test_flag: crud
  # 
  #   Bugzilla:
  #       1559796
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #   
  appliance.collections.infra_providers.discover(provider, cancel: false, start_ip: provider.start_ip, end_ip: provider.end_ip)
  view = provider.browser.create_view(InfraProvidersView)
  view.flash.assert_success_message("Infrastructure Providers: Discovery successfully initiated")
  request.addfinalizer(InfraProvider.clear_providers)
  appliance.collections.infra_providers.wait_for_a_provider()
end
def test_infra_provider_add_with_bad_credentials(has_no_providers, provider)
  # Tests provider add with bad credentials
  # 
  #   Metadata:
  #       test_flag: crud
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #   
  provider.default_endpoint.credentials = Credential(principal: "bad", secret: "reallybad", verify_secret: "reallybad")
  pytest.raises(RuntimeError, match: provider.bad_credentials_error_msg) {
    provider.create(validate_credentials: true)
  }
end
def test_infra_provider_crud(provider, has_no_providers)
  # Tests provider add with good credentials
  # 
  #   Metadata:
  #       test_flag: crud
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/5h
  #   
  provider.create()
  provider.validate_stats(ui: true)
  old_name = provider.name
  update(provider) {
    provider.name = uuid.uuid4().to_s
  }
  update(provider) {
    provider.name = old_name
  }
  provider.delete()
  provider.wait_for_delete()
end
def test_provider_rhv_create_delete_tls(request, has_no_providers, provider, verify_tls)
  # Tests RHV provider creation with and without TLS encryption
  # 
  #   Metadata:
  #      test_flag: crud
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       initialEstimate: 1/4h
  #   
  if is_bool(!provider.endpoints.get("default").__dict__.get("verify_tls"))
    pytest.skip("test requires RHV providers with verify_tls set")
  end
  prov = provider.dup
  request.addfinalizer(lambda{|| prov.delete_if_exists(cancel: false)})
  if is_bool(!verify_tls)
    endpoints = deepcopy(prov.endpoints)
    endpoints["default"].verify_tls = false
    endpoints["default"].ca_certs = nil
    prov.endpoints = endpoints
    prov.name = "#{provider.name}-no-tls"
  end
  prov.create()
  prov.validate_stats(ui: true)
  prov.delete()
  prov.wait_for_delete()
end
def test_rhv_guest_devices_count(appliance, setup_provider, provider)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. Check GuestDevice.count in a rails console
  #           2. Refresh RHV provider
  #           3. Check GuestDevice.count again
  #       expectedResults:
  #           1.
  #           2.
  #           3. The count is the same as in step 1
  #   Bugzilla:
  #       1691109
  #       1731237
  #   
  _gd_count = lambda do
    command = "GuestDevice.count"
    gd_count_command = appliance.ssh_client.run_rails_console(command).output
    return (gd_count_command[gd_count_command.index(command) + command.size..-1]).to_i
  end
  _refresh_provider = lambda do
    provider.refresh_provider_relationships()
    return provider.is_refreshed() && _gd_count.call() != 0
  end
  gd_count_before = _gd_count.call()
  wait_for(method(:_refresh_provider), timeout: 300, delay: 30)
  gd_count_after = _gd_count.call()
  raise "guest devices count changed after refresh!" unless gd_count_before == gd_count_after
end
def test_rhv_custom_attributes_after_refresh(appliance, setup_provider, provider)
  # 
  #   Bugzilla:
  #       1594817
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #       testSteps:
  #           1. Create a custom attribute on a vm
  #           2. Run a targeted refresh of the VM
  #           3. Check if the custom attribute is still there
  #       expectedResults:
  #           1.
  #           2.
  #           3. The custom attribute is still there
  #   
  view = navigate_to(provider, "ProviderVms")
  vm_name = view.entities.all_entity_names[0]
  vm = "Vm.where(name: '#{vm_name}').last"
  raise unless appliance.ssh_client.run_rails_console("#{vm}.miq_custom_set('mykey', 'myval')").success
  raise unless appliance.ssh_client.run_rails_console("#{vm}.miq_custom_get('mykey')").output.include?("myval")
  raise unless appliance.ssh_client.run_rails_console("EmsRefresh.refresh(#{vm})").success
  raise unless appliance.ssh_client.run_rails_console("#{vm}.miq_custom_get('mykey')").output.include?("myval")
end
def test_infrastructure_add_provider_trailing_whitespaces(appliance)
  # Test to validate the hostname and username should be without whitespaces
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: low
  #       initialEstimate: 1/8h
  #   
  collections = appliance.collections.infra_providers
  credentials = Credential(principal: "test test", secret: fauxfactory.gen_alphanumeric(5))
  endpoint = VirtualCenterEndpoint(hostname: "test test", credentials: credentials)
  prov = collections.instantiate(prov_class: VMwareProvider, name: fauxfactory.gen_alphanumeric(5), endpoints: endpoint)
  pytest.raises(RuntimeError) {
    prov.create()
  }
  view = appliance.browser.create_view(prov.endpoints_form)
  raise unless view.hostname.help_block == "Spaces are prohibited"
  raise unless view.username.help_block == "Spaces are prohibited"
  view = appliance.browser.create_view(InfraProviderAddView)
  raise unless !view.add.active
end
def test_infra_discovery_screen(appliance)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #   
  collections = appliance.collections.infra_providers
  view = navigate_to(collections, "Discover")
  raise unless view.is_displayed
  raise unless view.vmware.is_displayed
  raise unless view.scvmm.is_displayed
  raise unless view.rhevm.is_displayed
  view.vmware.click()
  raise unless view.vmware.selected
  view.vmware.click()
  raise unless !view.vmware.selected
  view.scvmm.click()
  raise unless view.scvmm.selected
  view.scvmm.click()
  raise unless !view.scvmm.selected
  view.rhevm.click()
  raise unless view.rhevm.selected
  view.rhevm.click()
  raise unless !view.rhevm.selected
  raise unless view.osp_infra.is_displayed
  view.osp_infra.click()
  raise unless view.osp_infra.selected
  view.osp_infra.click()
  raise unless !view.osp_infra.selected
  view.start.click()
  view.flash.assert_message("At least 1 item must be selected for discovery")
  view.vmware.click()
  for ips in discovery_ips
    from_ips = ips["from"]
    view.fill({"from_ip1" => from_ips[0], "from_ip2" => from_ips[1], "from_ip3" => from_ips[2], "from_ip4" => from_ips[3], "to_ip4" => ips["to"]})
    view.start.click()
    view.flash.assert_message(ips["msg"])
  end
end
def setup_provider_min_templates(request, appliance, provider, min_templates)
  if provider.mgmt.list_templates().size < min_templates
    pytest.skip("Number of templates on #{provider} does not meet minimum for test parameter #{min_templates}, skipping and not setting up provider")
  end
  setup_or_skip(request, provider)
end
def test_compare_templates(appliance, setup_provider_min_templates, provider, min_templates, templates_collection)
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Infra
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #   Bugzilla:
  #       1746449
  #       1784180
  #       1794434
  #   
  t_coll = locals()[templates_collection].collections.infra_templates.all()[0...min_templates]
  compare_view = locals()[templates_collection].collections.infra_templates.compare_entities(entities_list: t_coll)
  raise unless compare_view.is_displayed
  t_list = t_coll.map{|t| t.name}
  raise unless compare_view.verify_checked_items_compared(t_list, compare_view)
end
