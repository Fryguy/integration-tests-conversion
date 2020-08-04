require_relative("cfme");
include(Cfme);
require_relative("cfme/base/credential");
include(Cfme.Base.Credential);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytestmark = [test_requirements.auth];

const TEST_PASSWORDS = [
  `${fauxfactory.gen_alpha()} `,
  ` ${fauxfactory.gen_alpha()}`,
  `$#!${fauxfactory.gen_alpha()}`,
  `${fauxfactory.gen_alpha(17)}`,
  "",
  fauxfactory.gen_alpha().upcase(),
  "$%&'()*+,-./:;<=>?@[\\]^_{|}~"
];

function user(appliance) {
  let name = fauxfactory.gen_alpha(15, {start: "test-user-"});

  let creds = Credential({
    principal: name,
    secret: fauxfactory.gen_alpha()
  });

  let user_group = appliance.collections.groups.instantiate({description: "EvmGroup-vm_user"});

  let user = appliance.collections.users.create({
    name,
    credential: creds,
    groups: user_group
  });

  yield(user);
  user.delete_if_exists()
};

function nonexistent_user(appliance) {
  let name = fauxfactory.gen_alpha(15, {start: "test-user-"});

  let creds = Credential({
    principal: name,
    secret: fauxfactory.gen_alpha()
  });

  let user_group = appliance.collections.groups.instantiate({description: "EvmGroup-vm_user"});

  let user = appliance.collections.users.instantiate({
    name,
    credential: creds,
    groups: user_group
  });

  yield(user)
};

function test_db_user_pwd(appliance, user, pwd, soft_assert) {
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Appliance
  //       initialEstimate: 1/6h
  //   
  let new_credential = Credential({
    principal: user.credential.principal,
    secret: pwd
  });

  if (is_bool(pwd)) {
    update(user, () => user.credential = new_credential);

    user(() => {
      let view = navigate_to(appliance.server, "LoggedIn");

      soft_assert.call(
        view.current_fullname == user.name,

        "user full name \"{}\" did not match UI display name \"{}\"".format(
          user.name,
          view.current_fullname
        )
      );

      soft_assert.call(
        view.group_names.include(user.groups[0].description),

        "local group \"{}\" not displayed in UI groups list \"{}\"".format(
          user.groups[0].description,
          view.group_names
        )
      )
    })
  } else {
    let view = navigate_to(user, "Edit");
    user.change_stored_password();

    view.fill({
      password_txt: new_credential.secret,
      password_verify_txt: new_credential.verify_secret
    });

    if (!view.save_button.disabled) throw new ();
    view.cancel_button.click()
  }
};

function test_login_invalid_user(appliance, nonexistent_user) {
  // 
  //   Login with invalid user
  //   Authentication expected to fail
  // 
  //   Bugzilla:
  //       1632718
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Auth
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/30h
  //   
  nonexistent_user(() => (
    pytest.raises(
      RuntimeError,
      () => navigate_to(appliance.server, "LoggedIn")
    )
  ))
}
