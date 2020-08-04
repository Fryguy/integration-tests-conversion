require_relative("cfme");
include(Cfme);
let pytestmark = [pytest.mark.manual, test_requirements.service];

//  Notification Banner - VM Provisioning Notification and Service Request should be in  Sync
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       testtype: functional
//       initialEstimate: 1/4h
//       startsin: 5.7
//       tags: service
//   Bugzilla:
//       1389312
//   
// pass
function test_notification_banner_vm_provisioning_notification_and_service_request_should_be_in_syn() {};

//  User should be able to see requests irrespective of tags assigned
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       initialEstimate: 1/4h
//       testtype: functional
//       startsin: 5.9
//       tags: service
//   Bugzilla:
//       1641012
//   
// pass
function test_user_should_be_able_to_see_requests_irrespective_of_tags_assigned() {};

// 
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       initialEstimate: 1/16h
//       testtype: functional
//       startsin: 5.8
//       tags: service
//   Bugzilla:
//       1615853
//   
// pass
function test_changing_action_order_in_catalog_bundle_should_not_removes_resource() {};

// 
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       initialEstimate: 1/4h
//       testtype: functional
//       startsin: 5.9
//       tags: service
//       testSteps:
//           1. OPS UI  and SSUI service requests should create an event in notification bell
//           2. Also check , Clear All and \"MArk as read\" in notification bell
//           3. Number of events shown in notification bell
//   
// pass
function test_notification_banner_service_event_should_be_shown_in_notification_bell() {};

// 
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       testtype: functional
//       initialEstimate: 1/8h
//       startsin: 5.5
//       tags: service
//       testSteps:
//           1. Create a catalog item
//           2. Upload custom image
//           3. remove custom image
//           4. Create a catalog  bundle
//           5. Upload a custom image
//           6. Change custom image
//       expectedResults:
//           1.
//           2. No error seen
//           3.
//           4.
//           5. No error seen
//   Bugzilla:
//       1487056
//   
// pass
function test_custom_image_on_item_bundle_crud() {};

// 
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       testtype: functional
//       initialEstimate: 1/4h
//       startsin: 5.9
//       tags: service
//   Bugzilla:
//       1498237
//   
// pass
function test_request_filter_on_request_page() {};

//  Create catalog item with a resource pool , Remove resource pool from
//       the provider and then edit catalog item.
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       testtype: functional
//       initialEstimate: 1/8h
//       startsin: 5.5
//       tags: service
//       testSteps:
//           1. Create a catalog item
//           2. Select cluster and resource pool and Save
//           3. Remove resource pool from provider
//           4. Edit catalog
//       expectedResults:
//           1.
//           2.
//           3.
//           4. Validation message should be shown
//   
// pass
function test_edit_catalog_item_after_remove_resource_pool() {};

// 
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       testtype: functional
//       initialEstimate: 1/16h
//       startsin: 5.9
//       tags: service
//   Bugzilla:
//       1557508
//   
// pass
function test_dialog_dropdown_ui_values_in_the_dropdown_should_be_visible_in_edit_mode() {};

//  Triggered Refresh shouldn't Occurs for Dialog After Changing Type to Static
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       testtype: functional
//       initialEstimate: 1/4h
//       startsin: 5.9
//       tags: service
//   Bugzilla:
//       1614436
//   
// pass
function test_triggered_refresh_shouldnt_occurs_for_dialog_after_changing_type_to_static() {};

//  Timepicker should show date when chosen once
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       testtype: functional
//       initialEstimate: 1/4h
//       startsin: 5.7
//       tags: service
//   Bugzilla:
//       1638079
//   
// pass
function test_timepicker_should_show_date_when_chosen_once() {};

//  Default dialog entries should localized when ordering catalog item in French
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       testtype: functional
//       initialEstimate: 1/16h
//       startsin: 5.7
//       tags: service
//   Bugzilla:
//       1592573
//   
// pass
function test_default_dialog_entries_should_localized_when_ordering_catalog_item_in_french() {};

// 
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       testtype: functional
//       initialEstimate: 1/4h
//       startsin: 5.10
//       tags: service
//   Bugzilla:
//       1568440
//   
// pass
function test_in_dynamic_dropdown_list_the_default_value_should_not_contain_all_the_value_of_the_list() {};

// 
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       testtype: functional
//       initialEstimate: 1/4h
//       startsin: 5.9
//       tags: service
//   
// pass
function test_timepicker_should_pass_correct_timing_on_service_order() {};

// 
//   Polarion:
//       assignee: nansari
//       initialEstimate: 1/16h
//       casecomponent: Services
//       testtype: functional
//       startsin: 5.10
//       tags: service
//   Bugzilla:
//       1594301
//   
// pass
function test_user_should_be_able_to_change_the_order_of_values_of_the_drop_down_list() {};

// 
//   Polarion:
//       assignee: nansari
//       casecomponent: Services
//       initialEstimate: 1/16h
//       testtype: functional
//       startsin: 5.10
//       tags: service
//   Bugzilla:
//       1597802
//   
// pass
function test_entries_shouldnt_be_mislabeled_for_dropdown_element_in_dialog_editor() {}
