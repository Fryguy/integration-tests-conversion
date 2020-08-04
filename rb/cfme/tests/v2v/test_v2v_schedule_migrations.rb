# Tests to validate schedule migration usecases
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
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
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.v2v, pytest.mark.provider(classes: [RHEVMProvider, OpenStackProvider], selector: ONE_PER_VERSION, required_flags: ["v2v"], scope: "module"), pytest.mark.provider(classes: [VMwareProvider], selector: ONE_PER_TYPE, fixture_name: "source_provider", required_flags: ["v2v"], scope: "module"), pytest.mark.usefixtures("v2v_provider_setup")]
def test_schedule_migration(appliance, provider, mapping_data_vm_obj_mini, soft_assert, request)
  # 
  #   Test to validate schedule migration plan
  # 
  #   Polarion:
  #       assignee: sshveta
  #       initialEstimate: 1/2h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       testSteps:
  #           1. Add source and target provider
  #           2. Create infra map and migration plan
  #           3. Schedule migration plan
  #   
  migration_plan_collection = appliance.collections.v2v_migration_plans
  src_vm_obj = mapping_data_vm_obj_mini.vm_list[0]
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping_data_vm_obj_mini.infra_mapping_data.get("name"), target_provider: provider, vm_list: mapping_data_vm_obj_mini.vm_list, start_migration: false)
  view = navigate_to(migration_plan_collection, "NotStarted")
  view.plans_not_started_list.schedule_migration(migration_plan.name)
  soft_assert.(view.plans_not_started_list.get_clock(migration_plan.name).include?("Migration scheduled"))
  raise unless migration_plan.wait_for_state("Started")
  raise unless migration_plan.wait_for_state("In_Progress")
  raise unless migration_plan.wait_for_state("Completed")
  raise unless migration_plan.wait_for_state("Successful")
  migrated_vm = get_migrated_vm(src_vm_obj, provider)
  _cleanup = lambda do
    cleanup_target(provider, migrated_vm)
  end
  soft_assert(src_vm_obj.mac_address == migrated_vm.mac_address)
end
