// Manual tests
require_relative("cfme");
include(Cfme);

let pytestmark = [pytest.mark.ignore_stream(
  "5.10",
  "5.11",
  "upstream"
)];

// 
//   With 5.7 there is a new feature that allows users to specific a
//   specific set of proxy settings for each cloud provider.  The way you
//   enable this is to go to Configuration/Advanced Settings and scroll
//   down to the ec2 proxy settings.  For this test you want to create an
//   default proxy, verified it worked, and then remove the proxy and
//   verify it didn\"t use a proxy
//   Here are the proxy instructions:
//   https://mojo.redhat.com/docs/DOC-1103999
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Cloud
//       caseimportance: medium
//       initialEstimate: 1/8h
//       setup: I think the best way to do this one is start with a bad proxy value,
//              get the connection error, and then remove the proxy values and make
//              sure it starts connecting again.  I\"ll have to see if there is a log
//              value we can look at.  Otherwise, you need to shutdown the proxy
//              server to be absolutely sure.
//       startsin: 5.7
//       upstream: yes
//   
// pass
function test_proxy_remove_ec2() {};

// 
//   With 5.7 there is a new feature that allows users to specific a
//   specific set of proxy settings for each cloud provider.  The way you
//   enable this is to go to Configuration/Advanced Settings and scroll
//   down to the ec2 proxy settings.  For this test you want to create an
//   default proxy, verified it worked, and then remove the proxy and
//   verify it didn\"t use a proxy
//   Here are the proxy instructions:
//   https://mojo.redhat.com/docs/DOC-1103999
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Cloud
//       caseimportance: medium
//       initialEstimate: 1/8h
//       setup: I think the best way to do this one is start with a bad proxy value,
//              get the connection error, and then remove the proxy values and make
//              sure it starts connecting again.  I\"ll have to see if there is a log
//              value we can look at.  Otherwise, you need to shutdown the proxy
//              server to be absolutely sure.
//              You can also remove by setting host to false
//       startsin: 5.7
//       upstream: yes
//   
// pass
function test_proxy_remove_gce() {};

// 
//   Bugzilla:
//       1467569
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: SelfServiceUI
//       caseimportance: medium
//       initialEstimate: 1/4h
//   
// pass
function test_sui_stack_service_vm_detail_page_should_show_correct_data() {};

// 
// 
//   Bugzilla:
//       1601523
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Stack
//       caseimportance: medium
//       initialEstimate: 1/4h
//   
// pass
function test_orchestration_link_mismatch() {};

// 
//   Validate Chargeback costs for a service with multiple VMs
// 
//   Polarion:
//       assignee: tpapaioa
//       casecomponent: CandU
//       initialEstimate: 1/2h
//   
// pass
function test_service_chargeback_multiple_vms() {};

// 
//   Validate Chargeback costs for a bundled service
// 
//   Polarion:
//       assignee: tpapaioa
//       casecomponent: Reporting
//       caseimportance: medium
//       initialEstimate: 1/2h
//   
// pass
function test_service_chargeback_bundled_service() {};

// 
//   Validate that web connections to the host can be created.
// 
//   Polarion:
//       assignee: rhcf3_machine
//       casecomponent: Infra
//       caseimportance: medium
//       initialEstimate: 1/4h
//       upstream: yes
//   
// pass
function test_host_credentials_web() {};

// 
//   Delete orchestration template in use
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Services
//       caseimportance: low
//       initialEstimate: 1/16h
//       setup: Create a orchestration template and provision a stack from it .
//              Delete the template
//       startsin: 5.5
//   
// pass
function test_delete_orchestration_template_in_use() {};

// 
//   Validate Chargeback costs for a retired service
// 
//   Polarion:
//       assignee: tpapaioa
//       casecomponent: Reporting
//       caseimportance: low
//       initialEstimate: 1/2h
//   
// pass
function test_service_chargeback_retired_service() {};

// 
//   Test the RHN mirror role by adding a repo and checking if the contents
//   necessary for product update got downloaded to the appliance
// 
//   Polarion:
//       assignee: jkrocil
//       casecomponent: Appliance
//       caseimportance: medium
//       initialEstimate: 3/4h
//   
// pass
function test_rhn_mirror_role_packages() {};

// 
//   Bugzilla:
//       1449345
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/4h
//   
// pass
function test_playbook_with_already_existing_dialogs_name() {};

// 
//   Bugzilla:
//       1290005
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Services
//       caseimportance: medium
//       initialEstimate: 1/8h
//       startsin: 5.5
//   
// pass
function test_heat_stacks_in_non_admin_tenants_shall_also_be_collected() {};

// 
//   bundle stack provisioning for entry point catalog items
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Services
//       caseimportance: medium
//       initialEstimate: 1/4h
//       startsin: 5.5
//   
// pass
function test_bundle_stack_deployment() {};

// 
//   Verify Smart Management section in Orchestration template summary
//   page.
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Services
//       caseimportance: low
//       initialEstimate: 1/4h
//       startsin: 5.5
//       testtype: structural
//   
// pass
function test_verify_smart_mgmt_orchest_template() {};

// 
//   Bugzilla:
//       1449020
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/4h
//   
// pass
function test_show_tag_info_for_playbook_services() {};

// 
//   This test is where you need to verify that the VM Instance created by
//   an Orchestration Stack has, or can have, it\"s parent relationship set.
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Cloud
//       caseimportance: low
//       initialEstimate: 1/8h
//       setup: This test is pretty straight forward.  Spin up a VM using and
//              orchestration template.  Go to the instance details. Select Edit this
//              Instance
//       testSteps:
//           1. Set Parent for VM Instance
//       expectedResults:
//           1. The possible parents are listed and can be saved
//   
// pass
function test_stack_parent() {};

// 
//   Retire Ansible stack
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Services
//       caseimportance: medium
//       initialEstimate: 1/8h
//       setup: 1. Add Ansible Tower provider (name: tower) and perform refresh
//              2. Navigate to Ansible Tower Job templates, click on configured job ->
//              Configuration -> Create service dialog from this template (name it:
//              first_job_template_dialog)
//              3. Go to Services -> Catalog and create new catalog_tower
//              4. Create new catalog item under your new catalog
//              5. Catalog item parameters:
//              Catalog Item Type: AnsibleTower
//              Name: tower
//              Display in catalog: checked
//              Catalog: catalog_tower
//              Dialog: first_job_template_dialog
//              Provider: tower
//              Ansible Tower Job Template: first_job_template
//              6. Click on Add button and order this service
//              7. Monitor that job has been executed correctly on Ansible Tower side
//              and that in CFME is completed successfully
//              8. Navigate to Compute -> Clouds -> Stacks
//              9. Select first_job_template stack -> Lifecycle -> Retire selected
//              stacks
//       startsin: 5.5
//   
// pass
function test_retire_ansible_stack() {};

// 
//   Create bundle of stack and provision
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Services
//       caseimportance: medium
//       initialEstimate: 1/8h
//       startsin: 5.5
//   
// pass
function test_multiple_stack_deployment() {};

// 
// 
//   Bugzilla:
//       1496190
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Services
//       caseimportance: low
//       initialEstimate: 1/4h
//   
// pass
function test_button_groups_created_on_orchestration_type_heat_service_catalog_items_are_not_seen_o() {};

// 
//   Validate Chargeback costs for a service with a VM that has been
//   powered off
// 
//   Polarion:
//       assignee: tpapaioa
//       casecomponent: Reporting
//       caseimportance: low
//       initialEstimate: 1/2h
//   
// pass
function test_service_chargeback_vm_poweredoff() {};

// 
//   Deployment of mutiple instances in same stack
// 
//   Polarion:
//       assignee: sshveta
//       casecomponent: Services
//       caseimportance: medium
//       initialEstimate: 1/4h
//       startsin: 5.5
//   
// pass
function test_deployment_multiple_instances() {};

// 
//   Bugzilla:
//       1444853
// 
//   Polarion:
//       assignee: apagac
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/4h
//   
// pass
function test_monitor_ansible_playbook_std_output() {};

// 
//   bugzilla.redhat.com/1518952
// 
//   Bugzilla:
//       1518952
// 
//   Polarion:
//       assignee: apagac
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 2/3h
//       startsin: 5.8
//   
// pass
function test_monitor_ansible_playbook_logging_output() {}
