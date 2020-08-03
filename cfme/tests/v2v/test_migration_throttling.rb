require_relative 'widgetastic/widget'
include Widgetastic::Widget
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/fixtures/templates'
include Cfme::Fixtures::Templates
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/v2v/migration_settings'
include Cfme::V2v::Migration_settings
pytestmark = [test_requirements.v2v, pytest.mark.provider(classes: [OpenStackProvider, RHEVMProvider], selector: ONE_PER_VERSION, required_flags: ["v2v"], scope: "module"), pytest.mark.provider(classes: [VMwareProvider], selector: ONE_PER_TYPE, fixture_name: "source_provider", required_flags: ["v2v"], scope: "module"), pytest.mark.usefixtures("v2v_provider_setup")]
def test_migration_throttling(request, appliance, provider, source_type, dest_type, template_type, mapping_data_multiple_vm_obj_single_datastore)
  # 
  #   Polarion:
  #       assignee: sshveta
  #       casecomponent: V2V
  #       initialEstimate: 1/4h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #   
  migration_settings = MigrationSettings(appliance)
  migration_settings.migration_throttling.set_max_migration_per_conv_host("2")
  infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings
  mapping_data = mapping_data_multiple_vm_obj_single_datastore.infra_mapping_data
  mapping = infrastructure_mapping_collection.create(None: mapping_data)
  migration_plan_collection = appliance.collections.v2v_migration_plans
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping.name, vm_list: mapping_data_multiple_vm_obj_single_datastore.vm_list, target_provider: provider)
  raise unless migration_plan.wait_for_state("Started")
  request_details_list = migration_plan.get_plan_vm_list(wait_for_migration: false)
  vms = request_details_list.read()
  _cleanup = lambda do
    infrastructure_mapping_collection.delete(mapping)
    request_details_list.cancel_migration(vm, confirmed: true)
  end
  conversion_host_popup = []
  if is_bool(provider.one_of(RHEVMProvider))
    host_names = provider.hosts.all().map{|h| h.name}
  else
    host_names = provider.data["conversion_instances"]
  end
  for vm in vms
    begin
      popup_text = request_details_list.read_additional_info_popup(vm)
      if host_names.include?(popup_text["Conversion Host"])
        conversion_host_popup.push(popup_text["Conversion Host"])
        request_details_list.open_additional_info_popup(vm)
      end
    rescue NoSuchElementException
      next
    end
  end
  for conv_host in conversion_host_popup
    raise unless conversion_host_popup.count(conv_host) <= 2
  end
end
