require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.long_running,
  pytest.mark.meta({blockers: [BZ(1677548, {forced_streams: ["5.11"]})]}),
  test_requirements.ansible,
  test_requirements.tag
];

function credential(wait_for_ansible, appliance) {
  let credentials_collection = appliance.collections.ansible_credentials;

  let _credential = credentials_collection.create(
    fauxfactory.gen_alpha(18, {start: "Machine_Cred_"}),
    "Machine",

    {
      username: fauxfactory.gen_alpha({start: "usr_"}),
      password: fauxfactory.gen_alpha({start: "pwd_"})
    }
  );

  wait_for({
    func() {
      return _credential.exists
    },

    message: "credential appears on UI",
    fail_func: appliance.browser.widgetastic.refresh,
    delay: 20,
    num_sec: 240
  });

  yield(_credential);
  _credential.delete_if_exists()
};

function playbook(appliance, ansible_repository) {
  let playbooks_collection = appliance.collections.ansible_playbooks;
  return playbooks_collection.all()[0]
};

function check_tag_place(soft_assert) {
  let _check_tag_place = (item, tag_place) => {
    let tag = item.add_tag({details: tag_place});
    let tags = item.get_tags();

    soft_assert(
      tags.include(tag),
      `${tag.category.display_name}: ${tag.display_name} not in (${tags})`
    );

    item.remove_tag({tag, details: tag_place});
    tags = item.get_tags();

    return soft_assert(
      !tags.include(tag),
      `${tag.category.display_name}: ${tag.display_name} should not be in (${tags})`
    )
  };

  return _check_tag_place
};

function obj(request) {
  return request.getfixturevalue(request.param)
};

function ansible_tag_test_func(request, obj) {
  let test_func = request.getfixturevalue(request.param);
  return partial(test_func, obj)
};

function test_ansible_tagging(ansible_tag_test_func, visibility) {
  //  Test for cloud items tagging action from list and details pages
  // 
  //   Bugzilla:
  //       1526219
  //       1526217
  //       1526218
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/4h
  //       casecomponent: Tagging
  //   
  ansible_tag_test_func.call(visibility)
};

// 
//   Combination of My Company tag and ansible tower job template
// 
//   Polarion:
//       assignee: anikifor
//       casecomponent: Configuration
//       caseimportance: medium
//       initialEstimate: 1/8h
//   
// pass
function test_tagvis_tag_and_configuration_management_ansible_tower_job_templates() {};

// 
//   Polarion:
//       assignee: anikifor
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/8h
//       testSteps:
//           1. Create group with tag, use this group for user creation
//           2. Add tag(used in group) for Ansible Tower configured_system via
//           detail page
//           3. Remove tag for Ansible Tower configured_system via detail page
//           4. Add tag for Ansible Tower configured_system via list
//           5. Check Ansible Tower configured_system is visible for restricted
//           user
//           6. Remove tag for Ansible Tower configured_system via list
//           7 . Check ansible tower configured_system isn\"t visible for restricted
//           user
//   
// pass
function test_tagvis_ansible_tower_tag_configured_system() {};

// 
//   Polarion:
//       assignee: anikifor
//       casecomponent: Ansible
//       caseimportance: medium
//       initialEstimate: 1/8h
//       testSteps:
//           1. Create group with tag, use this group for user creation
//           2. Add tag(used in group) for Ansible Tower job via detail page
//           3. Remove tag for Ansible Tower job via detail page
//           4. Add tag for Ansible Tower job via list
//           5. Check Ansible Tower job is visible for restricted user
//           6. Remove tag for Ansible Tower job via list
//           7. Check ansible tower job isn\"t visible for restricted user
//   
// pass
function test_tagvis_ansible_tower_job() {}
