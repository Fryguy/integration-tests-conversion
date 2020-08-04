require_relative("cfme");
include(Cfme);
require_relative("cfme/control");
include(Cfme.Control);
require_relative("cfme/utils/path");
include(Cfme.Utils.Path);
let pytestmark = [test_requirements.control, pytest.mark.tier(3)];

function import_policy_file(request) {
  return (("ui/control/policies.yaml".data_path.join).realpath()).strpath
};

function import_invalid_yaml_file(request) {
  return (("ui/control/invalid.yaml".data_path.join).realpath()).strpath
};

function test_import_policies(appliance, import_policy_file) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: low
  //       initialEstimate: 1/12h
  //   
  import_export.import_file(appliance, import_policy_file)
};

function test_control_import_invalid_yaml_file(appliance, import_invalid_yaml_file) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/60h
  //   
  let error_message = "Error during 'Policy Import': Invalid YAML file";

  pytest.raises(
    Exception,
    {match: error_message},
    () => import_export.import_file(appliance, import_invalid_yaml_file)
  )
};

function test_control_import_existing_policies(appliance, import_policy_file) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Control
  //       caseimportance: low
  //       caseposneg: negative
  //       initialEstimate: 1/12h
  //   
  import_export.import_file(appliance, import_policy_file);
  let first_import = appliance.collections.policy_profiles.all_policy_profile_names;
  import_export.import_file(appliance, import_policy_file);
  let second_import = appliance.collections.policy_profiles.all_policy_profile_names;
  if (first_import != second_import) throw new ()
}
