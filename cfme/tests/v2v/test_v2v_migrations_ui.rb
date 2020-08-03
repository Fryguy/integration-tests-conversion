# V2V tests to validate functional and non-function UI usecases
require_relative 'widgetastic/exceptions'
include Widgetastic::Exceptions
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
require_relative 'cfme/v2v/migration_plans'
include Cfme::V2v::Migration_plans
pytestmark = [test_requirements.v2v, pytest.mark.provider(classes: [RHEVMProvider, OpenStackProvider], selector: ONE_PER_VERSION, required_flags: ["v2v"], scope: "module"), pytest.mark.provider(classes: [VMwareProvider], selector: ONE_PER_TYPE, fixture_name: "source_provider", required_flags: ["v2v"], scope: "module"), pytest.mark.usefixtures("v2v_provider_setup")]
def test_v2v_infra_map_data(request, appliance, source_provider, provider, soft_assert)
  # 
  #   Test to validate infra map data
  # 
  #   Polarion:
  #       assignee: sshveta
  #       initialEstimate: 1/2h
  #       caseimportance: critical
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       testSteps:
  #           1. Add source and target provider
  #           2. Create infra map
  #           3. Test infra map UI
  #   
  map_data = infra_mapping_default_data(source_provider, provider)
  map_collection = appliance.collections.v2v_infra_mappings
  mapping = map_collection.create(None: map_data)
  _cleanup = lambda do
    map_collection.delete(mapping)
  end
  view = navigate_to(map_collection, "All")
  mapping_list = view.infra_mapping_list
  soft_assert(mapping_list.read().include?(mapping.name))
  soft_assert(mapping_list.get_map_description(mapping.name).to_s == mapping.description)
  soft_assert(mapping_list.get_map_source_clusters(mapping.name)[0].include?(mapping.clusters[0].sources[0].format()))
  soft_assert(mapping_list.get_map_target_clusters(mapping.name)[0].include?(mapping.clusters[0].targets[0].format()))
  soft_assert(mapping_list.get_map_source_datastores(mapping.name)[0].include?(mapping.datastores[0].sources[0].format()))
  soft_assert(mapping_list.get_map_target_datastores(mapping.name)[0].include?(mapping.datastores[0].targets[0].format()))
  soft_assert(mapping_list.get_map_source_networks(mapping.name)[0].include?(mapping.networks[0].sources[0].format()))
  soft_assert(mapping_list.get_map_target_networks(mapping.name)[0].include?(mapping.networks[0].targets[0].format()))
end
def test_v2v_infra_map_ui(appliance, source_provider, provider, soft_assert)
  # 
  #   Test to validate non-functional UI tests on infrastructure mappings wizard
  # 
  #   Polarion:
  #       assignee: sshveta
  #       initialEstimate: 1/2h
  #       caseimportance: critical
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       testSteps:
  #           1. Add source and target provider
  #           2. Create infra map
  #           3. Validate non-functional tests
  #   
  map_collection = appliance.collections.v2v_infra_mappings
  map_name = fauxfactory.gen_string("alphanumeric", length: 26)
  map_description = fauxfactory.gen_string("alphanumeric", length: 130)
  map_data = infra_mapping_default_data(source_provider, provider)
  view = navigate_to(map_collection, "Add")
  view.general.name.fill(map_name)
  soft_assert.(view.general.name.read().size == 24)
  view.general.name.fill(map_name)
  view.general.description.fill(map_description)
  soft_assert.(view.general.description.read().size == 128)
  if map_data["plan_type"] == "osp"
    view.general.plan_type.fill("Red Hat OpenStack Platform")
  end
  view.general.next_btn.click()
  cluster_view = view.cluster.MappingFillView(object_type: "cluster")
  cluster_view.wait_displayed("5s")
  cluster_data = {"source" => map_data["clusters"][0].sources, "target" => map_data["clusters"][0].targets}
  soft_assert.(cluster_view.source.all_items.size > 0)
  soft_assert.(cluster_view.target.all_items.size > 0)
  soft_assert.(view.cluster.add_mapping.root_browser.get_attribute("disabled", view.cluster.add_mapping))
  cluster_view.fill(cluster_data)
  view.general.remove_all_mappings.click()
  cluster_data = {"source" => cluster_view.source.all_items, "target" => map_data["clusters"][0].targets}
  cluster_view.fill(cluster_data)
  view.general.next_btn.click()
  datastore_view = view.datastore.MappingFillView(object_type: "datastore")
  datastore_view.wait_displayed("5s")
  datastore_data = {"source" => map_data["datastores"][0].sources, "target" => map_data["datastores"][0].targets}
  soft_assert.(datastore_view.source.all_items.size > 0)
  soft_assert.(datastore_view.target.all_items.size > 0)
  soft_assert.(view.datastore.add_mapping.root_browser.get_attribute("disabled", view.datastore.add_mapping))
  datastore_view.fill(datastore_data)
  view.general.remove_all_mappings.click()
  datastore_data = {"source" => datastore_view.source.all_items, "target" => map_data["datastores"][0].targets}
  datastore_view.fill(datastore_data)
  view.general.next_btn.click()
  network_view = view.network.MappingFillView(object_type: "network")
  network_view.wait_displayed("5s")
  network_data = {"source" => map_data["networks"][0].sources, "target" => map_data["networks"][0].targets}
  soft_assert.(network_view.source.all_items.size > 0)
  soft_assert.(network_view.target.all_items.size > 0)
  soft_assert.(view.network.add_mapping.root_browser.get_attribute("disabled", view.network.add_mapping))
  network_view.fill(network_data)
  view.general.remove_all_mappings.click()
  network_data = {"source" => network_view.source.all_items, "target" => map_data["networks"][0].targets}
  network_view.fill(network_data)
  view.general.create_btn.click()
  view.result.close_btn.click()
  view = navigate_to(map_collection, "Add")
  view.general.name.fill(map_name)
  view.general.description.fill(map_description)
  soft_assert.(view.general.name_help_text.read().include?("a unique name"))
end
def test_v2v_plan_ui(request, appliance, source_provider, provider, mapping_data_vm_obj_mini, soft_assert)
  # 
  #   Test to validate non-functional UI tests on migration plan wizard
  # 
  #   Polarion:
  #       assignee: sshveta
  #       initialEstimate: 2/4h
  #       caseimportance: critical
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       testSteps:
  #           1. Add source and target provider
  #           2. Create migration plan
  #           3. Validate non-functional tests
  #   
  map_collection = appliance.collections.v2v_infra_mappings
  plan_collection = appliance.collections.v2v_migration_plans
  plan_name = fauxfactory.gen_string("alphanumeric", length: 10)
  plan_description = fauxfactory.gen_string("alphanumeric", length: 10)
  map_data = infra_mapping_default_data(source_provider, provider)
  mapping = map_collection.create(None: map_data)
  _cleanup = lambda do
    map_collection.delete(mapping)
  end
  view = navigate_to(plan_collection, "Add")
  view.general.infra_map.select_by_visible_text(mapping.name)
  soft_assert(view.general.infra_map.read() == mapping.name)
  view.general.name.fill(fauxfactory.gen_string("alphanumeric", length: 26))
  soft_assert(view.general.name.read().size == 24)
  view.general.name.fill(plan_name)
  view.general.description.fill(fauxfactory.gen_string("alphanumeric", length: 130))
  soft_assert(view.general.description.read().size == 128)
  view.general.description.fill(plan_description)
  view.next_btn.click()
  view.vms.wait_displayed()
  soft_assert(view.vms.table.rows().map{|row| row}.size > 0)
  view.vms.fill({"vm_list" => mapping_data_vm_obj_mini.vm_list})
  if map_data["plan_type"] == "osp"
    view.instance_properties.wait_displayed()
    view.next_btn.click()
  end
  view.advanced.wait_displayed()
  view.next_btn.click()
  view.schedule.run_migration.select("Save migration plan to run later")
  view.schedule.create.click()
  view.close_btn.click()
  new_view = navigate_to(plan_collection, "NotStarted")
  soft_assert(new_view.plans_not_started_list.read().include?(plan_name))
  soft_assert(new_view.plans_not_started_list.get_plan_description(plan_name) == plan_description)
  soft_assert(new_view.plans_not_started_list.get_vm_count_in_plan(plan_name).include?(mapping_data_vm_obj_mini.vm_list.size.to_s))
  new_view.plans_not_started_list.select_plan(plan_name)
  new_view = appliance.browser.create_view(MigrationPlanRequestDetailsView, wait: "10s")
  new_view.items_on_page.item_select("15")
  view = navigate_to(plan_collection, "Add")
  view.general.wait_displayed()
  view.general.infra_map.select_by_visible_text(mapping.name)
  view.general.name.fill(plan_name)
  view.general.description.fill(fauxfactory.gen_string("alphanumeric", length: 10))
  soft_assert(view.general.name_help_text.read().include?("a unique name"))
  view.cancel_btn.click()
  view = navigate_to(map_collection, "All")
  soft_assert(view.infra_mapping_list.get_associated_plans_count(mapping.name) == "1 Associated Plan")
  soft_assert(view.infra_mapping_list.get_associated_plans(mapping.name) == plan_name)
end
def test_v2v_infra_map_special_chars(request, appliance, source_provider, provider, soft_assert)
  # 
  #   Test infra map with special characters
  # 
  #   Polarion:
  #       assignee: sshveta
  #       initialEstimate: 1/2h
  #       caseimportance: low
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       testSteps:
  #           1. Add source and target provider
  #           2. Create infra map with special characters
  #   
  map_collection = appliance.collections.v2v_infra_mappings
  map_data = infra_mapping_default_data(source_provider, provider)
  map_data["name"] = fauxfactory.gen_special(length: 4)
  mapping = map_collection.create(None: map_data)
  _cleanup = lambda do
    map_collection.delete(mapping)
  end
  view = navigate_to(map_collection, "All")
  soft_assert(view.infra_mapping_list.read().include?(mapping.name))
  view.infra_mapping_list.delete_mapping(mapping.name)
  view.wait_displayed()
  begin
    raise unless !view.infra_mapping_list.read().include?(mapping.name)
  rescue NoSuchElementException
    # pass
  end
end
def test_rbac_migration_tab_availability(appliance, user, role_with_all_features, migration_feature_availability_for_role)
  # 
  #   Test to verify that the Migration tab is available/unavailable in the UI with
  #   role-based access control.
  # 
  #   Polarion:
  #       assignee: nachandr
  #       initialEstimate: 1/2h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       testSteps:
  #           1. Create new role, group, user. The new role is created such that all users belonging
  #              to this role have access to all product features.
  #           2. As admin, disable 'Migration' product feature for the new role.
  #           3. Login as the new user and verify that the 'Migration' tab is not available.
  #           4. As admin, enable all product features for the new role.
  #           5. Login as the new user and verify that the 'Migration' tab is available.
  #   
  v2v_user = user
  v2v_role = role_with_all_features
  if migration_feature_availability_for_role == "disabled"
    product_features = (appliance.version < "5.11") ? [[["Everything", "Compute", "Migration"], false]] : [[["Everything", "Migration"], false]]
  else
    product_features = [[["Everything"], true]]
  end
  v2v_role.update({"product_features" => product_features})
  v2v_user {
    view = navigate_to(appliance.server, "Dashboard", wait_for_view: 15)
    nav_tree = view.navigation.nav_item_tree()
    nav_tree_for_migration = (appliance.version < "5.11") ? nav_tree["Compute"] : nav_tree
    if migration_feature_availability_for_role == "disabled"
      raise "Migration found in nav tree, rbac should not allow this" unless !nav_tree_for_migration.include?("Migration")
    else
      if migration_feature_availability_for_role == "enabled"
        raise "Migration not found in nav tree, rbac should allow this" unless nav_tree_for_migration.include?("Migration")
      end
    end
  }
end
def test_v2v_infra_map_edit(request, appliance, source_provider, provider, source_type, dest_type, template_type, mapping_data_vm_obj_single_datastore, soft_assert)
  # 
  #   Test migration by editing migration mapping fields
  # 
  #   Polarion:
  #       assignee: sshveta
  #       initialEstimate: 1/2h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #   
  map_collection = appliance.collections.v2v_infra_mappings
  mapping_data = infra_mapping_default_data(source_provider, provider)
  mapping = map_collection.create(None: mapping_data)
  _cleanup = lambda do
    map_collection.delete(mapping)
  end
  edited_mapping = mapping_data_vm_obj_single_datastore.infra_mapping_data
  mapping.update(edited_mapping)
  view = navigate_to(map_collection, "All")
  mapping_list = view.infra_mapping_list
  soft_assert(mapping_list.read().include?(mapping.name))
  soft_assert(mapping.description == mapping_list.get_map_description(mapping.name).to_s)
  soft_assert(mapping_list.get_map_source_clusters(mapping.name)[0].include?(mapping.clusters[0].sources[0].format()))
  soft_assert(mapping_list.get_map_target_clusters(mapping.name)[0].include?(mapping.clusters[0].targets[0].format()))
  soft_assert(mapping_list.get_map_source_datastores(mapping.name)[0].include?(mapping.datastores[0].sources[0].format()))
  soft_assert(mapping_list.get_map_target_datastores(mapping.name)[0].include?(mapping.datastores[0].targets[0].format()))
  soft_assert(mapping_list.get_map_source_networks(mapping.name)[0].include?(mapping.networks[0].sources[0].format()))
  soft_assert(mapping_list.get_map_target_networks(mapping.name)[0].include?(mapping.networks[0].targets[0].format()))
end
def test_v2v_with_no_providers(appliance, source_provider, provider, soft_assert)
  # 
  #   Test V2V UI with no source and target provider
  # 
  #   Polarion:
  #       assignee: nachandr
  #       initialEstimate: 1/2h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       testSteps:
  #           1. Remove source and target providers
  #           2. Check can we add infra map
  #           3. Add providers back
  #   
  map_collection = appliance.collections.v2v_infra_mappings
  is_source_provider_deleted = source_provider.delete_if_exists(cancel: false)
  is_target_provider_deleted = provider.delete_if_exists(cancel: false)
  view = navigate_to(map_collection, "All")
  if appliance.version < "5.11"
    soft_assert.(view.configure_providers.is_displayed)
  else
    soft_assert.(view.missing_providers.is_displayed)
  end
  soft_assert.(!view.create_infra_mapping.is_displayed)
  if is_bool(is_source_provider_deleted)
    source_provider.create(validate_inventory: true)
  end
  if is_bool(is_target_provider_deleted)
    provider.create(validate_inventory: true)
  end
end
def test_duplicate_plan_name(appliance, mapping_data_vm_obj_mini, provider, request)
  # 
  #   Test Migration plan with duplicate names
  # 
  #   Polarion:
  #       assignee: sshveta
  #       initialEstimate: 1/4h
  #       caseimportance: medium
  #       caseposneg: negative
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       testSteps:
  #           1. Create two migration plans with same name
  #       expectedResults:
  #           1. Plan with duplicate name shows error message
  #   
  migration_plan_collection = appliance.collections.v2v_migration_plans
  name = fauxfactory.gen_alphanumeric(start: "plan_")
  migration_plan = migration_plan_collection.create(name: name, description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping_data_vm_obj_mini.infra_mapping_data.get("name"), target_provider: provider, vm_list: mapping_data_vm_obj_mini.vm_list, start_migration: false)
  _cleanup = lambda do
    migration_plan.delete_not_started_plan()
  end
  view = navigate_to(migration_plan_collection, "Add")
  view.general.infra_map.fill(mapping_data_vm_obj_mini.infra_mapping_data.get("name"))
  view.general.name.fill(name)
  view.general.description.fill("description")
  raise unless view.general.alert.read() == "Name #{name} already exists"
  view.cancel_btn.click()
end
def test_duplicate_mapping_name(appliance, mapping_data_vm_obj_mini)
  # 
  #   Test Infrastructure mapping with duplicate names
  # 
  #   Polarion:
  #       assignee: sshveta
  #       initialEstimate: 1/4h
  #       caseimportance: medium
  #       caseposneg: negative
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       testSteps:
  #           1. Create two Infra map with same name
  #       expectedResults:
  #           1. Infra map with duplicate name shows error message
  #   
  name = mapping_data_vm_obj_mini.infra_mapping_data.get("name")
  infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings
  view = navigate_to(infrastructure_mapping_collection, "Add")
  view.general.name.fill(name)
  view.general.description.fill("description")
  raise unless view.general.alert.read() == "Infrastructure mapping #{name} already exists"
  view.general.cancel_btn.click()
end
def test_migration_with_no_conversion(appliance, source_provider, request, provider, mapping_data_vm_obj_mini, delete_conversion_hosts)
  # 
  #   Test Migration plan without setting conversion hosts
  #   Polarion:
  #       assignee: sshveta
  #       initialEstimate: 1/2h
  #       caseimportance: high
  #       caseposneg: negative
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #   
  migration_plan_collection = appliance.collections.v2v_migration_plans
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping_data_vm_obj_mini.infra_mapping_data.get("name"), target_provider: provider, vm_list: mapping_data_vm_obj_mini.vm_list)
  _cleanup = lambda do
    migration_plan.delete_completed_plan()
    set_conversion_host_api(appliance, "vddk", source_provider, provider)
  end
  view = navigate_to(migration_plan, "InProgress")
  raise unless !view.progress_card.is_plan_started(migration_plan.name)
  raise unless view.progress_card.get_error_text(migration_plan.name).include?("no conversion host")
end
def test_v2v_custom_attribute(request, appliance, provider, source_type, dest_type, template_type, attribute, mapping_data_vm_obj_single_datastore)
  # 
  #   Test V2V with custom attributes of openstack provider projects
  #   Polarion:
  #       assignee: sshveta
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: V2V
  #       initialEstimate: 1/4h
  #   
  infrastructure_mapping_collection = appliance.collections.v2v_infra_mappings
  mapping_data = mapping_data_vm_obj_single_datastore.infra_mapping_data
  mapping = infrastructure_mapping_collection.create(None: mapping_data)
  src_vm_obj = mapping_data_vm_obj_single_datastore.vm_list[0]
  map_flavor = (attribute == "flavor") ? provider.data.flavors[1] : provider.data.flavors[0]
  map_security_group = (attribute == "security_group") ? provider.data.security_groups.admin[1] : provider.data.security_groups.admin[0]
  migration_plan_collection = appliance.collections.v2v_migration_plans
  migration_plan = migration_plan_collection.create(name: fauxfactory.gen_alphanumeric(start: "plan_"), description: fauxfactory.gen_alphanumeric(15, start: "plan_desc_"), infra_map: mapping.name, osp_security_group: map_security_group, osp_flavor: map_flavor, target_provider: provider, vm_list: mapping_data_vm_obj_single_datastore.vm_list)
  raise unless migration_plan.wait_for_state("Started")
  raise unless migration_plan.wait_for_state("In_Progress")
  raise unless migration_plan.wait_for_state("Completed")
  raise unless migration_plan.wait_for_state("Successful")
  migrated_vm = get_migrated_vm(src_vm_obj, provider)
  _cleanup = lambda do
    infrastructure_mapping_collection.delete(mapping)
    migration_plan.delete_completed_plan()
    cleanup_target(provider, migrated_vm)
  end
  raise unless src_vm_obj.mac_address == migrated_vm.mac_address
  osp_vm = provider.mgmt.get_vm(name: src_vm_obj.name)
  raise unless map_flavor == osp_vm.flavor.name
  raise unless map_security_group == osp_vm.raw.security_groups[0]["name"]
end
