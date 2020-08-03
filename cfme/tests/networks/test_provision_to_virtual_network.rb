require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/networks/provider'
include Cfme::Networks::Provider
require_relative 'cfme/provisioning'
include Cfme::Provisioning
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.provider([RHEVMProvider], required_fields: [["provisioning", "template"]], scope: "module"), pytest.mark.usefixtures("setup_provider"), test_requirements.provision]
def network(provider, appliance)
  # Adding cloud network in ui.
  test_name = fauxfactory.gen_alphanumeric(18, start: "test_network_")
  net_manager = 
  collection = appliance.collections.network_providers
  network_provider = collection.instantiate(prov_class: NetworkProvider, name: net_manager)
  collection = appliance.collections.cloud_networks
  ovn_network = collection.create(test_name, "tenant", network_provider, net_manager, "None")
  yield ovn_network
  if is_bool(ovn_network.exists)
    ovn_network.delete()
  end
end
def test_provision_vm_to_virtual_network(appliance, setup_provider, provider, request, provisioning, network)
  #  Tests provisioning a vm from a template to a virtual network
  # 
  #   Metadata:
  #       test_flag: provision
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Provisioning
  #       initialEstimate: 1/4h
  #   
  vm_name = random_vm_name("provd")
  _cleanup = lambda do
    vm = appliance.collections.infra_vms.instantiate(vm_name, provider)
    vm.cleanup_on_provider()
  end
  request.addfinalizer(method(:_cleanup))
  template = provisioning["template"]
  provisioning_data = {"catalog" => {"vm_name" => vm_name}, "environment" => {"vm_name" => vm_name, "automatic_placement" => true}, "network" => {"vlan" => partial_match(network.name)}}
  wait_for(do_vm_provisioning, [appliance, template, provider, vm_name, provisioning_data, request], {"num_sec" => 900}, handle_exception: true, delay: 50, num_sec: 900, fail_func: appliance.server.browser.refresh, message: )
end
