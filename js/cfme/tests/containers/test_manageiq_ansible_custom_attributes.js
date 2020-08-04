require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/utils/ansible");
include(Cfme.Utils.Ansible);
require_relative("cfme/utils/ansible");
include(Cfme.Utils.Ansible);
require_relative("cfme/utils/ansible");
include(Cfme.Utils.Ansible);
require_relative("cfme/utils/ansible");
include(Cfme.Utils.Ansible);
require_relative("cfme/utils/ansible");
include(Cfme.Utils.Ansible);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(1),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

let custom_attributes_to_add = [
  {name: "custom1", value: "first value"},
  {name: "custom2", value: "second value"}
];

let custom_attributes_to_edit = [
  {name: "custom1", value: "third value"},
  {name: "custom2", value: "fourth value"}
];

function ansible_custom_attributes() {
  create_tmp_directory();
  fetch_miq_ansible_module();
  yield;
  remove_tmp_files()
};

function verify_custom_attributes(appliance, provider, custom_attributes_to_verify) {
  let view = navigate_to(provider, "Details", {force: true});
  if (!view.entities.summary("Custom Attributes").is_displayed) throw new ();

  for (let custom_attribute in custom_attributes_to_verify) {
    if (view.entities.summary("Custom Attributes").get_text_of(custom_attribute.name) != custom_attribute.value.to_s.to_s) {
      throw new ()
    }
  }
};

function test_manageiq_ansible_add_custom_attributes(appliance, ansible_custom_attributes, provider) {
  // This test checks adding a Custom Attribute using Ansible script via Manage IQ module
  //       Steps:
  //       1. 'add_custom_attributes.yml script runs against the appliance
  //        and adds custom attributes
  //       2. Test navigates  to Providers page and verifies the Custom Attributes
  //        were added under Providers menu
  // 
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  setup_ansible_script(provider, {
    script: "add_custom_attributes",
    values_to_update: custom_attributes_to_add,
    script_type: "custom_attributes"
  });

  run_ansible("add_custom_attributes");

  verify_custom_attributes({
    appliance,
    provider,
    custom_attributes_to_verify: custom_attributes_to_add
  });

  setup_ansible_script(provider, {
    script: "remove_custom_attributes",
    values_to_update: custom_attributes_to_add,
    script_type: "custom_attributes"
  });

  run_ansible("remove_custom_attributes");
  let view = navigate_to(provider, "Details", {force: true});
  if (!!view.entities.summary("Custom Attributes").is_displayed) throw new ()
};

function test_manageiq_ansible_edit_custom_attributes(appliance, ansible_custom_attributes, provider) {
  // This test checks editing a Custom Attribute using Ansible script via Manage IQ module
  //       Steps:
  //       1. 'add_custom_attributes.yml script runs against the appliance
  //        and edits custom attributes
  //       2. Test navigates to Providers page and verifies the Custom Attributes
  //        were edited under Providers menu
  // 
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  setup_ansible_script(provider, {
    script: "add_custom_attributes",
    values_to_update: custom_attributes_to_edit,
    script_type: "custom_attributes"
  });

  run_ansible("add_custom_attributes");

  verify_custom_attributes({
    appliance,
    provider,
    custom_attributes_to_verify: custom_attributes_to_edit
  });

  setup_ansible_script(provider, {
    script: "remove_custom_attributes",
    values_to_update: custom_attributes_to_edit,
    script_type: "custom_attributes"
  });

  run_ansible("remove_custom_attributes");
  let view = navigate_to(provider, "Details", {force: true});
  if (!!view.entities.summary("Custom Attributes").is_displayed) throw new ()
};

function test_manageiq_ansible_add_custom_attributes_same_name(appliance, ansible_custom_attributes, provider) {
  // This test checks adding a Custom Attribute with the same name
  //       using Ansible script via Manage IQ module
  //       Steps:
  //       1. 'add_custom_attributes_same_name.yml script runs against the appliance
  //        and adds same custom attributes that were already used
  //       2. Test navigates to Providers page and verifies the Custom Attributes
  //        weren't added under Providers menu
  // 
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  setup_ansible_script(provider, {
    script: "add_custom_attributes",
    values_to_update: custom_attributes_to_edit,
    script_type: "custom_attributes"
  });

  run_ansible("add_custom_attributes");
  run_ansible("add_custom_attributes");

  verify_custom_attributes({
    appliance,
    provider,
    custom_attributes_to_verify: custom_attributes_to_edit
  });

  setup_ansible_script(provider, {
    script: "remove_custom_attributes",
    values_to_update: custom_attributes_to_edit,
    script_type: "custom_attributes"
  });

  run_ansible("remove_custom_attributes");
  let view = navigate_to(provider, "Details", {force: true});
  if (!!view.entities.summary("Custom Attributes").is_displayed) throw new ()
};

function test_manageiq_ansible_add_custom_attributes_bad_user(appliance, ansible_custom_attributes, provider) {
  // This test checks adding a Custom Attribute with a bad user name
  //       using Ansible script via Manage IQ module
  //       Steps:
  //       1. 'add_custom_attributes_bad_user.yml script runs against the appliance
  //        and tries to add custom attributes.
  //       2. Verify error message with Ansible reply
  //       3. Test navigates to Providers page and verifies the Custom Attributes
  //        weren't added under Providers menu
  // 
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  setup_ansible_script(provider, {
    script: "add_custom_attributes_bad_user",
    values_to_update: custom_attributes_to_edit,
    script_type: "custom_attributes"
  });

  let run_result = run_ansible("add_custom_attributes_bad_user");
  if (!run_result.decode("utf-8").include("Authentication failed")) throw new ();
  let view = navigate_to(provider, "Details", {force: true});
  if (!!view.entities.summary("Custom Attributes").is_displayed) throw new ()
};

function test_manageiq_ansible_remove_custom_attributes(appliance, ansible_custom_attributes, provider) {
  // This test checks removing Custom Attribute using Ansible script via Manage IQ module
  //       Steps:
  //       1. 'remove_custom_attributes.yml script runs against the appliance
  //        and removes custom attributes
  //       2. Test navigates to Providers page and verifies the Custom Attributes
  //        were removed under Providers menu
  // 
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  setup_ansible_script(provider, {
    script: "add_custom_attributes",
    values_to_update: custom_attributes_to_add,
    script_type: "custom_attributes"
  });

  run_ansible("add_custom_attributes");

  setup_ansible_script(provider, {
    script: "remove_custom_attributes",
    values_to_update: custom_attributes_to_add,
    script_type: "custom_attributes"
  });

  run_ansible("remove_custom_attributes");
  let view = navigate_to(provider, "Details", {force: true});
  if (!!view.entities.summary("Custom Attributes").is_displayed) throw new ()
}
