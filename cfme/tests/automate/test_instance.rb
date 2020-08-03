require_relative 'cfme'
include Cfme
require_relative 'cfme/automate/simulation'
include Cfme::Automate::Simulation
require_relative 'cfme/services/service_catalogs'
include Cfme::Services::Service_catalogs
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [test_requirements.automate]
def test_instance_crud(klass)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: critical
  #       initialEstimate: 1/16h
  #       tags: automate
  #   
  instance = klass.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric())
  orig = instance.description
  update(instance) {
    instance.description = "edited"
  }
  update(instance) {
    instance.description = orig
  }
  instance.delete()
  raise unless !instance.exists
end
def test_duplicate_instance_disallowed(klass)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: high
  #       caseposneg: negative
  #       initialEstimate: 1/60h
  #       tags: automate
  #   
  name = fauxfactory.gen_alphanumeric()
  klass.instances.create(name: name)
  pytest.raises(Exception, match: "Name has already been taken") {
    klass.instances.create(name: name)
  }
end
def test_instance_display_name_unset_from_ui(klass)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: high
  #       initialEstimate: 1/30h
  #       tags: automate
  #   
  instance = klass.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric())
  update(instance) {
    instance.display_name = fauxfactory.gen_alphanumeric()
  }
  raise unless instance.exists
  update(instance) {
    instance.display_name = ""
  }
  raise unless instance.exists
end
def test_automate_instance_missing(domain, klass, namespace, appliance)
  # If an instance called in class does not exist, a .missing instance is processed if it exists.
  #   A _missing_instance attribute (which contains the name of the instance that was supposed to be
  #   called) is then set on $evm.object so it then can be used eg. to resolve methods dynamically.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: high
  #       initialEstimate: 1/10h
  #       tags: automate
  #   
  catch_string = fauxfactory.gen_alphanumeric()
  method = klass.methods.create(name: fauxfactory.gen_alphanumeric(), location: "inline", script: "$evm.log(:info, \"#{catch_string}\")")
  klass.schema.add_fields({"name" => "mfield", "type" => "Method", "data_type" => "String"})
  klass.instances.create(name: ".missing", fields: {"mfield" => {"value" => "${#_missing_instance}"}})
  klass2 = namespace.classes.create(name: fauxfactory.gen_alpha())
  klass2.schema.add_fields({"name" => "rel", "type" => "Relationship"})
  instance2 = klass2.instances.create(name: fauxfactory.gen_alphanumeric(), fields: {"rel" => {"value" => ("/") + (method.tree_path_name_only[1..-1].join("/"))}})
  simulate(appliance: appliance, request: "Call_Instance", attributes_values: {"namespace" => "#{domain.name}/#{namespace.name}", "class" => klass2.name, "instance" => instance2.name})
  raise unless (appliance.ssh_client.run_command("grep #{catch_string} /var/www/miq/vmdb/log/automation.log")).success
end
def test_automate_relationship_trailing_spaces(request, klass, namespace, domain)
  # 
  #   Handle trailing whitespaces in automate instance relationships.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/10h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: Automate
  #       tags: automate
  #       testSteps:
  #           1. Create a class and its instance, also create second one,
  #              that has a relationship field.
  #           2. Create an instance with the relationship field pointing to the first class'
  #              instance but add a couple of whitespaces after it.
  #           3. Execute the AE model, eg. using Simulate.
  #       expectedResults:
  #           1.
  #           2.
  #           3. Logs contain no resolution errors.
  # 
  #   PR:
  #       https://github.com/ManageIQ/manageiq/pull/7550
  #   
  catch_string = fauxfactory.gen_alphanumeric()
  method = klass.methods.create(name: fauxfactory.gen_alphanumeric(), location: "inline", script: "$evm.log(:info, \"#{catch_string}\")")
  request.addfinalizer(method.delete_if_exists)
  klass.schema.add_fields({"name" => "meth", "type" => "Method", "data_type" => "String"})
  instance = klass.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), fields: {"meth" => {"value" => method.name}})
  request.addfinalizer(instance.delete_if_exists)
  klass2 = namespace.classes.create(name: fauxfactory.gen_alpha(), display_name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha())
  request.addfinalizer(klass2.delete_if_exists)
  klass2.schema.add_fields({"name" => "rel", "type" => "Relationship", "data_type" => "String"})
  instance2 = klass2.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), fields: {"rel" => {"value" => ("/{domain}/{namespace}/{klass}/{instance}   ").format(domain: domain.name, namespace: namespace.name, klass: klass.name, instance: instance.name)}})
  request.addfinalizer(instance2.delete_if_exists)
  result = LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*#{catch_string}.*"], failure_patterns: [".*ERROR.*"])
  result.start_monitoring()
  simulate(appliance: klass.appliance, request: "Call_Instance", attributes_values: {"namespace" => "#{domain.name}/#{namespace.name}", "class" => klass2.name, "instance" => instance2.name})
  raise unless result.validate(wait: "60s")
end
def copy_instance(domain)
  # 
  #   This fixture copies the instance '/ManageIQ/System/Request/ansible_tower_job' to new domain.
  #   
  klass = domain.parent.instantiate(name: "ManageIQ").namespaces.instantiate(name: "System").classes.instantiate(name: "Request")
  klass.instances.instantiate(name: "ansible_tower_job").copy_to(domain.name)
  instance = domain.namespaces.instantiate(name: "System").classes.instantiate(name: "Request").instances.instantiate(name: "ansible_tower_job")
  yield(instance)
end
def test_check_system_request_calls_depr_conf_mgmt(appliance, copy_instance)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseimportance: low
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: Automate
  #       tags: automate
  #       setup:
  #           1. Copy /System/Request/ansible_tower_job instance to new domain
  #       testSteps:
  #           1. Run that instance(ansible_tower_job) using simulation
  #           2. See automation log
  #       expectedResults:
  #           1.
  #           2. The /System/Request/ansible_tower_job instance should call the newer
  #              \"/AutomationManagement/AnsibleTower/Operations/StateMachines/Job/default\" method
  # 
  #   Bugzilla:
  #       1615444
  #   
  search = "/AutomationManagement/AnsibleTower/Operations/StateMachines/Job/default"
  result = LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*#{search}.*"])
  result.start_monitoring()
  simulate(appliance: appliance, request: copy_instance.name)
  raise unless result.validate(wait: "60s")
end
def copy_quota_instance(domain)
  # Copy the default instance 'quota' to custom domain
  miq = domain.appliance.collections.domains.instantiate("ManageIQ")
  original_instance = miq.namespaces.instantiate("System").namespaces.instantiate("CommonMethods").classes.instantiate("QuotaStateMachine").instances.instantiate("quota")
  original_instance.copy_to(domain: domain)
  instance = domain.namespaces.instantiate("System").namespaces.instantiate("CommonMethods").classes.instantiate("QuotaStateMachine").instances.instantiate("quota")
  return instance
end
def test_quota_source_value(request, entity, search, copy_quota_instance, generic_catalog_item)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseposneg: positive
  #       startsin: 5.10
  #       casecomponent: Automate
  # 
  #   Bugzilla:
  #       1319910
  #   
  copy_quota_instance.update({"fields" => {"quota_source_type" => {"value" => entity}}})
  root_tenant = copy_quota_instance.appliance.collections.tenants.get_root_tenant()
  root_tenant.set_quota(None: {"cpu_cb" => true, "cpu" => 3})
  request.addfinalizer(lambda{|| root_tenant.set_quota(None: {"cpu_cb" => false})})
  result = LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*#{search}.*"])
  result.start_monitoring()
  service_catalogs = ServiceCatalogs(copy_quota_instance.appliance, catalog: generic_catalog_item.catalog, name: generic_catalog_item.name)
  request_description = "Provisioning Service [{name}] from [{name}]".format(name: service_catalogs.name)
  provision_request = copy_quota_instance.appliance.collections.requests.instantiate(description: request_description)
  service_catalogs.order()
  provision_request.wait_for_request(method: "ui")
  request.addfinalizer(lambda{|| provision_request.remove_request(method: "rest")})
  raise unless result.validate(wait: "60s")
end
def setup(domain, klass, namespace)
  # This fixture creates common domain, namespace, two classes, instance and method. This setup
  #   is common for both parameterized tests
  state1 = fauxfactory.gen_alpha()
  state2 = fauxfactory.gen_alpha()
  state3 = fauxfactory.gen_alpha()
  klass.schema.add_fields(*[state1, state2, state3].map{|state| {"name" => state, "type" => "State"}})
  method = klass.methods.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), location: "inline", script: "
               
$evm.log(:info, \"Hello from method of parent instance\")
                
exit MIQ_STOP
                ")
  instance = klass.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), fields: {"state3" => {"value" => "METHOD::#{method.name}"}})
  klass2 = namespace.classes.create(name: fauxfactory.gen_alpha(), display_name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha())
  klass2.schema.add_fields(*[state1, state2].map{|state| {"name" => state, "type" => "State"}})
  yield([klass2, instance, state1, state2, state3])
  method.delete_if_exists()
  instance.delete_if_exists()
  klass2.delete_if_exists()
end
def test_miq_stop_abort_with_state_machines(request, setup, process, domain, klass, namespace)
  # 
  #   Bugzilla:
  #       1441353
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseimportance: high
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: Automate
  #       tags: automate
  #       setup:
  #           1. Create automate domain, namespace, two classes - class A and class B
  #           2. Class A and B should have schema of type - State
  #           3. Create instance A1 and method A1 under class A. Here instance A1 should call method
  #              A1
  #           4. Create two instances B1, B2 and three methods B1, B2, B3 under class B. Here instance
  #              B1 should call two methods B1 and B2. Also instance B2 should call method B3
  #           5. Now Update instance A1 to call instance B1 and B2
  #       testSteps:
  #           1. Navigate to Automation > Automate > Simulation page and execute instance A1
  #           2. If all the methods contain process - MIQ_STOP
  #           3. If any method(in this test case - method B1, B2, B3) contains process - MIQ_ABORT
  #       expectedResults:
  #           1.
  #           2. MIQ_STOP process only stops execution of current instance but it allows state machine
  #              to execute other instances. So we are able to see execution of prent method -
  #              method A1 - \"Hello from method of parent instance\"
  #           3. MIQ_ABORT process stops execution of current instance as well as its parent instance
  #             (here it stops instance B1 and then instance A1) which leads to no execution parent
  #             instances - instance A1. So we are not able to see execution of parent method -
  #             method A1 - \"Hello from method of parent instance\"
  #   
  klass2,instance,state1,state2,state3 = setup
  child_method = ["first", "second", "third"].map{|num| klass2.methods.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), location: "inline", script: "
               
$evm.log(:info, \"This is method #{num}\")
                
exit #{process.upcase()}
                ")}.to_a
  fields = [{"state1" => {"value" => "METHOD::#{child_method[0].name}"}, "state2" => {"value" => "METHOD::#{child_method[1].name}"}}, {"state1" => {"value" => "METHOD::#{child_method[2].name}"}}]
  child_inst = fields.map{|field| klass2.instances.create(name: fauxfactory.gen_alphanumeric(), display_name: fauxfactory.gen_alphanumeric(), description: fauxfactory.gen_alphanumeric(), fields: field)}.to_a
  finalize = lambda do
    for method in child_method
      method.delete_if_exists()
    end
    for inst in child_inst
      inst.delete_if_exists()
    end
  end
  update(instance) {
    instance.fields = {"state1" => {"value" => "/#{domain.name}/#{namespace.name}/#{klass2.name}/#{child_inst[0].name}"}, "state2" => {"value" => "/#{domain.name}/#{namespace.name}/#{klass2.name}/#{child_inst[1].name}"}}
  }
  result = LogValidator("/var/www/miq/vmdb/log/automation.log", matched_patterns: [".*Hello from method of parent instance.*"])
  result.start_monitoring()
  simulate(appliance: klass.appliance, attributes_values: {"namespace" => klass.namespace.name, "class" => klass.name, "instance" => instance.name}, message: "create", request: "Call_Instance", execute_methods: true)
  if process == "miq_abort"
    raise unless !result.validate()
  else
    raise unless result.validate()
  end
end
