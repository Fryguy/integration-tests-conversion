require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
let pytestmark = [pytest.mark.manual, test_requirements.ansible];

// 
//   Retire Service+instances which were deployed by playbook from CFME UI.
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1h
//       tags: ansible_embed
//   
// pass
function test_embed_tower_retire_service_with_instances_ec2() {};

// 
//   User/Admin is able to execute playbook without creating Job Temaplate
//   and can execute it against machine with machine credentials. Deploy 2
//   appliances, second one as unconfigured, through appliance_console join
//   the
//   region of first appliance. Enable embedded ansible on 2nd appliance.
//   From first appliance, add scm, credentials, new catalog, catalog item
//   of AnsiblePlaybook type. Select playbook e.g. dump_all_vars and order
//   it. When asked what machine to run it against, pick any rhel7 machine.
//   Playbook should be executed successfully.
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1h
//       tags: ansible_embed
//   
// pass
function test_embed_tower_exec_play_against_machine_multi_appliance() {};

// 
//   Check that ansible fails over to new region correctly
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1h
//       tags: ansible_embed
//   
// pass
function test_embed_tower_failover() {};

// 
//   Follow BZ referenced below for test steps
// 
//   Bugzilla:
//       1511126
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       initialEstimate: 1/2h
//       tags: ansible_embed
//   
// pass
function test_embed_ansible_next_gen() {};

// 
//   User/Admin is able to execute playbook without creating Job Template
//   and can execute it against provider type with provider type credentials.
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1h
//       tags: ansible_embed
//   
// pass
function test_embed_tower_exec_play_with_creds(appliance, provider) {};

// 
//   test adding new playbook catalogs and items to remote and global
//   region
// 
//   Bugzilla:
//       1449696
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Configuration
//       caseimportance: medium
//       caseposneg: negative
//       initialEstimate: 1/6h
//       tags: ansible_embed
//   
// pass
function test_embed_ansible_catalog_items() {};

// 
//   Ability to add private repo with SCM credentials.
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: critical
//       initialEstimate: 1/6h
//       tags: ansible_embed
//   
// pass
function test_embed_tower_add_private_repo() {};

// 
//   After all processes are running fill out a new repo with resolvable
//   /un-resolvable url, use the validation button to check its correct.
// 
//   Bugzilla:
//       1478958
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       initialEstimate: 1/6h
//       tags: ansible_embed
//   
// pass
function test_embed_tower_repo_url_validation() {};

// 
//   Bugzilla:
//       1444831
// 
//   Execute playbook with extra variables which will be passed to Tower.
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       initialEstimate: 1/4h
//       tags: ansible_embed
//   
// pass
function test_embed_tower_order_service_extra_vars() {};

// 
//   Bugzilla:
//       1509809
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/6h
//       tags: ansible_embed
//   
// pass
function test_service_ansible_playbook_with_already_existing_catalog_item_name() {};

// 
//   Test if creds from Service Dialog are picked up for execution of
//   playbook or the default are used(that were set at the time of dialog
//   creation)
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/4h
//       tags: ansible_embed
//   
// pass
function test_service_ansible_playbook_order_credentials_usecredsfromservicedialog() {};

// 
//   Bugzilla:
//       1540689
// 
//   When the service is viewed in my services it should also show that the cloud and
//   machine credentials were attached to the service.
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/2h
//       tags: ansible_embed
//   
// pass
function test_service_ansible_playbook_machine_credentials_service_details_sui() {};

// 
//   Bugzilla:
//       1444107
// 
//   Once a Ansible Playbook Service Dialog is built, it has default parameters, which can
//   be overridden at \"ordering\" time. Check if the overridden parameters are passed.
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/6h
//       tags: ansible_embed
//   
// pass
function test_service_ansible_overridden_extra_vars() {};

// 
//   Look for Standard ouptut
// 
//   Bugzilla:
//       1534039
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/6h
//       tags: ansible_embed
//   
// pass
function test_service_ansible_playbook_standard_output_non_ascii_hostname() {};

// 
//   Retire ansible playbook service with non_ascii host
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/6h
//       tags: ansible_embed
//   
// pass
function test_service_ansible_playbook_retire_non_ascii() {};

// 
// 
//   Bugzilla:
//       1542665
// 
//   Check if ansible playbook method  can work with different verbosity
//   levels.
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/4h
//       tags: ansible_embed
//   
// pass
function test_automate_ansible_playbook_method_type_verbosity() {};

// 
// 
//   Bugzilla:
//       1626152
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       initialEstimate: 1/2h
//       testSteps:
//           1. Enable Embedded Ansible
//           2. Add repo - https://github.com/billfitzgerald0120/ansible_playbooks
//           3. Import Ansible_StateMachine_Set_Retry
//           4. Enable domain
//           5. Create Catalog using set_retry_4_times playbook.
//           6. Add a dummy dialog
//           7. Add a catalog
//           8. Add a new Catalog item (Generic Type)
//           9. Order service
//       expectedResults:
//           1. Check Embedded Ansible Role is started.
//           2. Check repo is added.
//           3.
//           4.
//           5. Verify in the Catalog playbook set_retry_4_times is used.
//           6.
//           7.
//           8.
//           9. Check automation.log to make sure the playbook retry is waiting
//           at least 60 seconds before trying again.
//   
// pass
function test_embed_tower_playbook_with_retry_interval() {};

// 
// 
//   Bugzilla:
//       1625047
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       initialEstimate: 1/2h
//       testSteps:
//           1. Enable Embedded Ansible
//           2. Add repo - https://github.com/billfitzgerald0120/ansible_playbooks
//           3. Import Ansible_StateMachine_Set_Retry
//           4. Enable domain
//           5. Create Catalog using set_retry_4_times playbook.
//           6. Add a dummy dialog
//           7. Add a catalog
//           8. Add a new Catalog item (Generic Type)
//           9. Order service
//       expectedResults:
//           1. Check Embedded Ansible Role is started.
//           2. Check repo is added.
//           3.
//           4.
//           5. Verify in the Catalog playbook set_retry_4_times is used.
//           6.
//           7.
//           8.
//           9. Check automation.log to make sure the playbook retried 3 times and then ended OK.
//   
// pass
function test_embed_tower_playbook_with_retry_method() {};

// 
// 
//   Bugzilla:
//       1807928
// 
//   Polarion:
//       assignee: gtalreja
//       casecomponent: Ansible
//       caseimportance: high
//       initialEstimate: 1h
//       tags: ansible_embed
//       startsin: 5.11
//       testSteps:
//           1. Enable Embedded Ansible role.
//           2. Add private repo (which is bare repo with `git submodule`).
//           3. Add Credentials as per different `auth_type`.
//           4. Add Catalog Item and Catalog.
//           5. Order a Playbook.
//       expectedResults:
//           1. Check Embedded Ansible Role is started.
//           2. Check repo is added.
//           3. Check Credentials are added
//           4.
//           5. Playbook should execute.
//   
// pass
function test_embed_tower_exec_play_with_diff_auth(appliance, provider, username, auth) {}
