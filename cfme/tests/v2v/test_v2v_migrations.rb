# Test to validate End-to-End migrations- functional testing.
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/fixtures/templates'
include Cfme::Fixtures::Templates
require_relative 'cfme/fixtures/v2v_fixtures'
include Cfme::Fixtures::V2v_fixtures
require_relative 'cfme/fixtures/v2v_fixtures'
include Cfme::Fixtures::V2v_fixtures
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
pytestmark = [test_requirements.v2v, pytest.mark.provider(classes: [RHEVMProvider, OpenStackProvider], selector: ONE_PER_VERSION, required_flags: ["v2v"], scope: "module"), pytest.mark.provider(classes: [VMwareProvider], selector: ONE_PER_VERSION, fixture_name: "source_provider", required_flags: ["v2v"], scope: "module"), pytest.mark.usefixtures("v2v_provider_setup")]
def test_single_datastore_single_vm_migration(request, appliance, provider, source_type, dest_type, template_type, mapping_data_vm_obj_single_datastore)
  # 
  #   Test VM migration with single datastore
  #   Polarion:
  #       assignee: nachandr
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1h
  #   
  infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings
  mapping_data = mapping_data_vm_obj_single_datastore.infra_mapping_data
  mapping = infrastructure_mapping_collection.create(None: mapping_data)
  src_vm_obj = mapping_data_vm_obj_single_datastore.vm_list[0]
  migration_plan_collection = appliance.collections.v2v_migration_plans
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping.name, target_provider: provider, vm_list: mapping_data_vm_obj_single_datastore.vm_list)
  raise unless migration_plan.wait_for_state("Started")
  raise unless migration_plan.wait_for_state("In_Progress")
  raise unless migration_plan.wait_for_state("Completed")
  raise unless migration_plan.wait_for_state("Successful")
  migrated_vm = get_migrated_vm(src_vm_obj, provider)
  _cleanup = lambda do
    infrastructure_mapping_collection.delete(mapping)
    cleanup_target(provider, migrated_vm)
  end
  raise unless src_vm_obj.mac_address == migrated_vm.mac_address
end
def test_single_network_single_vm_migration(request, appliance, provider, source_type, dest_type, template_type, mapping_data_vm_obj_single_network)
  # 
  #   Polarion:
  #       assignee: nachandr
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1h
  #   
  infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings
  mapping_data = mapping_data_vm_obj_single_network.infra_mapping_data
  mapping = infrastructure_mapping_collection.create(None: mapping_data)
  migration_plan_collection = appliance.collections.v2v_migration_plans
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping.name, target_provider: provider, vm_list: mapping_data_vm_obj_single_network.vm_list)
  raise unless migration_plan.wait_for_state("Started")
  request_details_list = migration_plan.get_plan_vm_list()
  vms = request_details_list.read()
  raise "No VMs displayed on Migration Plan Request Details list." unless vms.size > 0
  raise unless request_details_list.is_successful(vms[0]) && !request_details_list.is_errored(vms[0])
  src_vm = mapping_data_vm_obj_single_network.vm_list.pop()
  migrated_vm = get_migrated_vm(src_vm, provider)
  _cleanup = lambda do
    infrastructure_mapping_collection.delete(mapping)
    cleanup_target(provider, migrated_vm)
  end
  raise unless src_vm.mac_address == migrated_vm.mac_address
end
def test_dual_datastore_dual_vm_migration(request, appliance, provider, mapping_data_dual_vm_obj_dual_datastore, soft_assert)
  # 
  #   Polarion:
  #       assignee: nachandr
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1h
  #   
  infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings
  mapping_data = mapping_data_dual_vm_obj_dual_datastore.infra_mapping_data
  mapping = infrastructure_mapping_collection.create(None: mapping_data)
  _cleanup = lambda do
    infrastructure_mapping_collection.delete(mapping)
    for src_vm in src_vms_list
      migrated_vm = get_migrated_vm(src_vm, provider)
      cleanup_target(provider, migrated_vm)
    end
  end
  migration_plan_collection = appliance.collections.v2v_migration_plans
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(start: "plan_desc_"), infra_map: mapping.name, target_provider: provider, vm_list: mapping_data_dual_vm_obj_dual_datastore.vm_list)
  raise unless migration_plan.wait_for_state("Started")
  request_details_list = migration_plan.get_plan_vm_list()
  vms = request_details_list.read()
  for vm in vms
    soft_assert(request_details_list.is_successful(vm) && !request_details_list.is_errored(vm))
  end
  src_vms_list = mapping_data_dual_vm_obj_dual_datastore.vm_list
  for src_vm in src_vms_list
    migrated_vm = get_migrated_vm(src_vm, provider)
    soft_assert(src_vm.mac_address == migrated_vm.mac_address)
  end
end
def test_dual_nics_migration(request, appliance, provider, mapping_data_vm_obj_dual_nics)
  # 
  #   Polarion:
  #       assignee: nachandr
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1h
  #   
  infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings
  mapping_data = mapping_data_vm_obj_dual_nics.infra_mapping_data
  mapping = infrastructure_mapping_collection.create(None: mapping_data)
  migration_plan_collection = appliance.collections.v2v_migration_plans
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping.name, target_provider: provider, vm_list: mapping_data_vm_obj_dual_nics.vm_list)
  raise unless migration_plan.wait_for_state("Started")
  raise unless migration_plan.wait_for_state("In_Progress")
  raise unless migration_plan.wait_for_state("Completed")
  raise unless migration_plan.wait_for_state("Successful")
  src_vm = mapping_data_vm_obj_dual_nics.vm_list.pop()
  migrated_vm = get_migrated_vm(src_vm, provider)
  _cleanup = lambda do
    infrastructure_mapping_collection.delete(mapping)
    cleanup_target(provider, migrated_vm)
  end
  raise unless Set.new(src_vm.mac_address.split_p(", ")) == Set.new(migrated_vm.mac_address.split_p(", "))
end
def test_dual_disk_vm_migration(request, appliance, provider, source_type, dest_type, template_type, mapping_data_vm_obj_single_datastore)
  # 
  #   Polarion:
  #       assignee: nachandr
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1h
  #   
  infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings
  mapping_data = mapping_data_vm_obj_single_datastore.infra_mapping_data
  mapping = infrastructure_mapping_collection.create(None: mapping_data)
  migration_plan_collection = appliance.collections.v2v_migration_plans
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping.name, target_provider: provider, vm_list: mapping_data_vm_obj_single_datastore.vm_list)
  raise unless migration_plan.wait_for_state("Started")
  raise unless migration_plan.wait_for_state("In_Progress")
  raise unless migration_plan.wait_for_state("Completed")
  raise unless migration_plan.wait_for_state("Successful")
  src_vm = mapping_data_vm_obj_single_datastore.vm_list.pop()
  migrated_vm = get_migrated_vm(src_vm, provider)
  _cleanup = lambda do
    infrastructure_mapping_collection.delete(mapping)
    cleanup_target(provider, migrated_vm)
  end
  raise unless src_vm.mac_address == migrated_vm.mac_address
end
def test_migrations_different_os_templates(request, appliance, provider, source_type, dest_type, template_type, mapping_data_multiple_vm_obj_single_datastore, soft_assert)
  # 
  #   Polarion:
  #       assignee: nachandr
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1h
  #   
  infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings
  mapping_data = mapping_data_multiple_vm_obj_single_datastore.infra_mapping_data
  mapping = infrastructure_mapping_collection.create(None: mapping_data)
  _cleanup = lambda do
    infrastructure_mapping_collection.delete(mapping)
    for src_vm in src_vms_list
      migrated_vm = get_migrated_vm(src_vm, provider)
      cleanup_target(provider, migrated_vm)
    end
  end
  migration_plan_collection = appliance.collections.v2v_migration_plans
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping.name, target_provider: provider, vm_list: mapping_data_multiple_vm_obj_single_datastore.vm_list)
  request_details_list = migration_plan.get_plan_vm_list()
  vms = request_details_list.read()
  for vm in vms
    soft_assert(request_details_list.is_successful(vm) && !request_details_list.is_errored(vm))
  end
  src_vms_list = mapping_data_multiple_vm_obj_single_datastore.vm_list
  for src_vm in src_vms_list
    migrated_vm = get_migrated_vm(src_vm, provider)
    soft_assert(src_vm.mac_address == migrated_vm.mac_address)
  end
end
