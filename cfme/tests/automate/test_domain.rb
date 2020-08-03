require_relative 'cfme'
include Cfme
require_relative 'cfme/automate/explorer/domain'
include Cfme::Automate::Explorer::Domain
require_relative 'cfme/automate/explorer/instance'
include Cfme::Automate::Explorer::Instance
require_relative 'cfme/automate/explorer/klass'
include Cfme::Automate::Explorer::Klass
require_relative 'cfme/automate/explorer/method'
include Cfme::Automate::Explorer::Method
require_relative 'cfme/automate/import_export'
include Cfme::Automate::Import_export
require_relative 'cfme/automate/simulation'
include Cfme::Automate::Simulation
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/exceptions'
include Cfme::Exceptions
require_relative 'cfme/fixtures/automate'
include Cfme::Fixtures::Automate
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _groups groups
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _tenants tenants
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _users users
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/ftp'
include Cfme::Utils::Ftp
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [test_requirements.automate]
def test_domain_crud(request, enabled, appliance)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: critical
  #       initialEstimate: 1/30h
  #       tags: automate
  #   
  domain = appliance.collections.domains.create(name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha(), enabled: enabled)
  request.addfinalizer(domain.delete_if_exists)
  raise unless domain.exists
  view = navigate_to(domain, "Details")
  if is_bool(enabled)
    raise unless !view.title.text.include?("Disabled")
  else
    raise unless view.title.text.include?("Disabled")
  end
  updated_description = fauxfactory.gen_alpha(20, start: "editdescription_")
  update(domain) {
    domain.description = updated_description
  }
  view = navigate_to(domain, "Edit")
  raise unless view.description.value == updated_description
  raise unless domain.exists
  domain.delete(cancel: true)
  raise unless domain.exists
  domain.delete()
  raise unless !domain.exists
end
def test_domain_edit_enabled(domain, appliance)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       initialEstimate: 1/16h
  #       caseimportance: high
  #       tags: automate
  #   
  raise unless domain.exists
  view = navigate_to(domain, "Details")
  raise unless !view.title.text.include?("Disabled")
  update(domain) {
    domain.enabled = false
  }
  view = navigate_to(domain, "Details")
  raise unless view.title.text.include?("Disabled")
end
def test_domain_lock_disabled(klass)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/16h
  #       tags: automate
  #   
  schema_field = fauxfactory.gen_alphanumeric()
  update(klass.namespace.domain) {
    klass.namespace.domain.enabled = false
  }
  klass.schema.add_fields({"name" => schema_field, "type" => "Method", "data_type" => "String"})
  method = klass.methods.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), location: "inline")
  instance = klass.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), fields: {"schema_field" => {"value" => method.name}})
  result = LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*ERROR.*"])
  result.start_monitoring()
  simulate(appliance: klass.appliance, attributes_values: {"namespace" => klass.namespace.name, "class" => klass.name, "instance" => instance.name}, message: "create", request: "Call_Instance", execute_methods: true)
  raise unless result.validate(wait: "60s")
  klass.namespace.domain.lock()
  view = navigate_to(klass.namespace.domain, "Details")
  raise unless view.title.text.include?("Disabled")
  raise unless view.title.text.include?("Locked")
  klass.namespace.domain.unlock()
end
def test_domain_delete_from_table(request, appliance)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: low
  #       initialEstimate: 1/30h
  #       tags: automate
  #   
  generated = []
  for _ in 3.times
    domain = appliance.collections.domains.create(name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha(), enabled: true)
    request.addfinalizer(domain.delete_if_exists)
    generated.push(domain)
  end
  appliance.collections.domains.delete(*generated)
  for domain in generated
    raise unless !domain.exists
  end
end
def test_duplicate_domain_disallowed(domain, appliance)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       caseposneg: negative
  #       initialEstimate: 1/60h
  #       tags: automate
  #   
  raise unless domain.exists
  pytest.raises(Exception, match: "Name has already been taken") {
    appliance.collections.domains.create(name: domain.name, description: domain.description, enabled: domain.enabled)
  }
end
def test_domain_cannot_delete_builtin(appliance)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: critical
  #       caseposneg: negative
  #       initialEstimate: 1/16h
  #       tags: automate
  #   
  manageiq_domain = appliance.collections.domains.instantiate(name: "ManageIQ")
  details_view = navigate_to(manageiq_domain, "Details")
  raise unless !details_view.configuration.is_displayed
end
def test_domain_cannot_edit_builtin(appliance)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: critical
  #       caseposneg: negative
  #       initialEstimate: 1/16h
  #       tags: automate
  #   
  manageiq_domain = appliance.collections.domains.instantiate(name: "ManageIQ")
  details_view = navigate_to(manageiq_domain, "Details")
  raise unless !details_view.configuration.is_displayed
end
def test_wrong_domain_name(request, appliance)
  # To test whether domain is creating with wrong name or not.
  #      wrong_domain: 'Dummy Domain' (This is invalid name of Domain because there is space
  #      in the name)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       caseposneg: negative
  #       initialEstimate: 1/60h
  #       tags: automate
  #   
  wrong_domain = "Dummy Domain"
  domain = appliance.collections.domains
  pytest.raises(RuntimeError) {
    domain.create(name: wrong_domain)
  }
  view = domain.create_view(DomainAddView)
  view.flash.assert_message("Name may contain only alphanumeric and _ . - $ characters")
  wrong_domain = domain.instantiate(name: wrong_domain)
  request.addfinalizer(wrong_domain.delete_if_exists)
  raise unless !wrong_domain.exists
end
def test_domain_lock_unlock(domain, appliance)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       initialEstimate: 1/16h
  #       caseimportance: medium
  #       tags: automate
  #   
  raise unless domain.exists
  ns1 = domain.namespaces.create(name: "ns1")
  ns2 = ns1.namespaces.create(name: "ns2")
  cls = ns2.classes.create(name: "class1")
  cls.schema.add_field(name: "myfield", type: "Relationship")
  inst = cls.instances.create(name: "inst")
  meth = cls.methods.create(name: "meth", script: "$evm")
  domain.lock()
  details = navigate_to(ns1, "Details")
  raise unless !details.configuration.is_displayed
  details = navigate_to(ns2, "Details")
  raise unless !details.configuration.is_displayed
  details = navigate_to(cls, "Details")
  raise unless !details.configuration.is_enabled
  details.schema.select()
  raise unless !details.configuration.is_displayed
  details = navigate_to(inst, "Details")
  raise unless !details.configuration.is_enabled
  details = navigate_to(meth, "Details")
  raise unless !details.configuration.is_enabled
  domain.unlock()
  update(ns1) {
    ns1.name = "UpdatedNs1"
  }
  raise unless ns1.exists
  update(ns2) {
    ns2.name = "UpdatedNs2"
  }
  raise unless ns2.exists
  update(cls) {
    cls.name = "UpdatedClass"
  }
  raise unless cls.exists
  cls.schema.add_field(name: "myfield2", type: "Relationship")
  update(inst) {
    inst.name = "UpdatedInstance"
  }
  raise unless inst.exists
  update(meth) {
    meth.name = "UpdatedMethod"
  }
  raise unless meth.exists
end
def test_object_attribute_type_in_automate_schedule(appliance)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       initialEstimate: 1/15h
  #       startsin: 5.9
  #       tags: automate
  #       testSteps:
  #           1. Go to Configuration > settings > schedules
  #           2. Select \'Add a new schedule\' from configuration drop down
  #           3. selecting \'Automation Tasks\' under Action.
  #           4. Select a value from the drop down list of Object Attribute Type.
  #           5. Undo the selection by selecting \"<Choose>\" from the drop down.
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. No pop-up window with Internal Server Error.
  #           5. No pop-up window with Internal Server Error.
  # 
  #   Bugzilla:
  #        1479570
  #        1686762
  #   
  view = navigate_to(appliance.collections.system_schedules, "Add")
  view.form.action_type.select_by_visible_text("Automation Tasks")
  all_options = view.form.object_type.all_options
  if all_options.size < 2
    raise OptionNotAvailable, "Options not available"
  end
  for option in all_options
    if is_bool(!BZ(1686762).blocks && ["Tenant", "EVM Group"].include?(option.text))
      view.form.object_type.select_by_visible_text(option.text)
      view.flash.assert_no_error()
      view.form.object_type.select_by_visible_text("<Choose>")
      view.flash.assert_no_error()
    end
  end
end
def test_copy_to_domain(domain)
  # This test case checks whether automate class, instance and method are successfully copying to
  #   domain.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: low
  #       initialEstimate: 1/15h
  #       startsin: 5.9
  #       tags: automate
  #       setup:
  #           1. Create new custom domain
  #       testSteps:
  #           1. Go to Automation > Automate > Explorer
  #           2. Select any class, instance and method from ManageIQ domain
  #           3. Copy selected things one by one to new custom domain by selecting
  #              \"Copy this Method/Instance/Class\" from configuration toolbar
  #       expectedResults:
  #           1.
  #           2.
  #           3. Class, Instance and Method should be copied to new domain and assert message should
  #              appear after copying these things to new domain.
  # 
  #   Bugzilla:
  #       1500956
  #   
  miq = domain.appliance.collections.domains.instantiate("ManageIQ").namespaces.instantiate("System").namespaces.instantiate("CommonMethods")
  original_klass = miq.classes.instantiate("MiqAe")
  original_klass.copy_to(domain: domain)
  klass = domain.browser.create_view(ClassCopyView)
  klass.flash.wait_displayed()
  klass.flash.assert_message("Copy selected Automate Class was saved")
  original_instance = miq.classes.instantiate("QuotaMethods").instances.instantiate("quota_source")
  original_instance.copy_to(domain: domain)
  instance = domain.browser.create_view(InstanceCopyView)
  instance.flash.wait_displayed()
  instance.flash.assert_message("Copy selected Automate Instance was saved")
  original_method = miq.classes.instantiate("QuotaStateMachine").methods.instantiate("rejected")
  original_method.copy_to(domain: domain)
  method = domain.browser.create_view(MethodCopyView)
  method.flash.wait_displayed()
  method.flash.assert_message("Copy selected Automate Method was saved")
end
def new_user(request, appliance)
  # This fixture creates custom user with tenant attached
  tenant = _tenants(request, appliance)
  role = appliance.rest_api.collections.roles.get(name: "EvmRole-super_administrator")
  group = _groups(request, appliance, role, tenant: tenant)
  user,user_data = _users(request, appliance, group: group.description)
  yield [appliance.collections.users.instantiate(name: user[0].name, credential: Credential(principal: user_data[0]["userid"], secret: user_data[0]["password"])), tenant]
end
def test_tenant_attached_with_domain(request, new_user, domain)
  # 
  #   Note: This RFE which has introduced extra column for tenant on domain all view
  # 
  #   Bugzilla:
  #       1678122
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       startsin: 5.11
  #       casecomponent: Automate
  #       setup: Create new user
  #       testSteps:
  #           1. Log in with admin. Create automate domain and navigate to domains all page
  #           2. Log in with new user. Create automate domain and navigate to domains all page
  #       expectedResults:
  #           1. Automate domain should be assigned with tenant - 'My Company'
  #           2. Automate domain should be assigned with new user's tenant
  #   
  user,tenant = new_user
  view = navigate_to(domain.parent, "All")
  raise unless view.domains.row(name: domain.name)["Tenant"].text == "My Company"
  user {
    new_domain = domain.appliance.collections.domains.create(name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha(), enabled: true)
    request.addfinalizer(new_domain.delete_if_exists)
    for domain in view.domains.read()
      if domain["Name"] == new_domain.name
        raise unless domain["Tenant"] == tenant.name
      else
        raise unless domain["Tenant"] == "My Company"
      end
    end
  }
end
def user(appliance)
  # Creates new user with role which does not have permission of modifying automate domains
  product_features = [[["Everything", "Automation", "Automate", "Explorer", "Automate Domains", "Modify"], false]]
  role = appliance.collections.roles.create(name: fauxfactory.gen_alphanumeric(), product_features: product_features)
  group = appliance.collections.groups.create(description: fauxfactory.gen_alphanumeric(), role: role.name, tenant: appliance.collections.tenants.get_root_tenant().name)
  user = appliance.collections.users.create(name: fauxfactory.gen_alphanumeric().downcase(), credential: Credential(principal: fauxfactory.gen_alphanumeric(4), secret: fauxfactory.gen_alphanumeric(4)), email: fauxfactory.gen_email(), groups: group, cost_center: "Workload", value_assign: "Database")
  yield user
  user.delete_if_exists()
  group.delete_if_exists()
  role.delete_if_exists()
end
def test_automate_restrict_domain_crud(user, custom_instance)
  # 
  #   When you create a role that can only view automate domains, it can view automate domains but it
  #   cannot manipulate the domains themselves as well as can not CRUD on namespaces, classes,
  #   instances etc.
  # 
  #   Bugzilla:
  #       1365493
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       tags: automate
  #   
  instance = custom_instance.(ruby_code: nil)
  user {
    view = navigate_to(instance, "Details")
    raise unless !view.configuration.is_displayed
    view = navigate_to(instance.klass, "Details")
    raise unless !view.configuration.is_displayed
    view = navigate_to(instance.klass.namespace, "Details")
    raise unless !view.configuration.is_displayed
    view = navigate_to(instance.klass.namespace.domain, "Details")
    raise unless !view.configuration.is_displayed
  }
end
def test_redhat_domain_sync_after_upgrade(temp_appliance_preconfig, file_name)
  # 
  #   Bugzilla:
  #       1693362
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       casecomponent: Automate
  #       testSteps:
  #           1. Either dump database of appliance with version X to appliance with version Y
  #              or upgrade the appliance
  #           2. grep 'domain version on disk differs from db version' /var/www/miq/vmdb/log/evm.log
  #           3. Check last_startup.txt file
  #       expectedResults:
  #           1.
  #           2. You should find this string in logs: RedHat domain version on disk differs from db
  #              version
  #           3. You should find this string in file: RedHat domain version on disk differs from db
  #              version
  #   
  db_file = FTPClientWrapper(cfme_data.ftpserver.entities.databases).get_file(file_name)
  db_path = File.join("/tmp",db_file.name)
  raise unless temp_appliance_preconfig.ssh_client.run_command().success
  (LogValidator("/var/www/miq/vmdb/log/evm.log", matched_patterns: [".*domain version on disk differs from db version.*", ".*RedHat domain version on disk differs from db version.*", ".*ManageIQ domain version on disk differs from db version.*"])).waiting(timeout: 1000) {
    temp_appliance_preconfig.db.restore_database(db_path, is_major: bool(temp_appliance_preconfig.version > "5.11"))
  }
end
def custom_domain(custom_instance)
  # This fixture creates dastastore setup and updates the name and description of domain. So that
  #      the domain with same name can be imported successfully.
  #   
  instance = custom_instance.(ruby_code: nil)
  domain_info = "bz_1752875"
  instance.domain.update({"name" => domain_info, "description" => domain_info})
  domain = instance.appliance.collections.domains.instantiate(name: domain_info, description: domain_info)
  domain.lock()
  yield domain
  domain.delete_if_exists()
end
def test_existing_domain_child_override(appliance, custom_domain, import_data)
  # 
  #   PR:
  #       https://github.com/ManageIQ/manageiq-ui-classic/pull/4912
  # 
  #   Bugzilla:
  #       1752875
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       casecomponent: Automate
  #       setup: First three steps are performed manually to have datastore zip file
  #           1. Create custom domain and copy class - \"ManageIQ/System/Process\"
  #           2. Lock this domain
  #           3. Navigate to Automation > automate > Import/export and click on \"export all classes
  #              and instances to file\"
  #           4. Go to custom domain and unlock it. Remove instance - \"ManageIQ/System/Process/\" and
  #              copy - \"ManageIQ/System/Process/Request\" (you can copy more classes or methods or
  #              instances) to custom domain and again lock the domain.
  #       testSteps:
  #           1. Navigate to Import/Export page and import the exported file
  #           2. Select \"Select domain you wish to import from:\" - \"custom_domain\" and check Toggle
  #              All/None
  #           3. Click on commit button.
  #           4. Then navigate to custom domain and unlock it
  #           5. Perform step 1, 2 and 3(In this case, domain will get imported)
  #           6. Go to custom domain
  #       expectedResults:
  #           1.
  #           2.
  #           3. You should see flash message: \"Error: Selected domain is locked\"
  #           4.
  #           5. Selected domain imported successfully
  #           6. You should see imported namespace, class, instance or method
  #   
  fs = FTPClientWrapper(cfme_data.ftpserver.entities.datastores)
  file_path = fs.download(import_data.file_name)
  datastore = appliance.collections.automate_import_exports.instantiate(import_type: "file", file_path: file_path)
  datastore.import_domain_from(import_data.from_domain, import_data.to_domain)
  view = appliance.browser.create_view(FileImportSelectorView)
  view.flash.assert_message("Error: Selected domain is locked")
  custom_domain.unlock()
  datastore.import_domain_from(import_data.from_domain, import_data.to_domain)
  view.flash.assert_no_error()
  view = navigate_to(custom_domain, "Details")
  raise unless view.datastore.tree.has_path("Datastore", , "System", "Process")
end
