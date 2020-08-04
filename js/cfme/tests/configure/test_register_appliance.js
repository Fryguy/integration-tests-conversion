require_relative("cfme");
include(Cfme);
require_relative("cfme/configure/configuration/region_settings");
include(Cfme.Configure.Configuration.Region_settings);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.appliance];
const REG_METHODS = ["rhsm", "sat6"];

// 
// Tests RHSM and Sat6 validation and registration, checks result over ssh
// (update is not performed - it is non-destructive).
// 
// For setup, see test_update_appliances.py (red_hat_updates section in cfme_data yaml).
// 
// These tests do not check registration results in the web UI, only through SSH.
// 
function pytest_generate_tests(metafunc) {
  if (new Set([
    test_rh_updates,
    test_rhsm_registration_check_repo_names
  ]).include(metafunc.function)) return;

  //  Generates tests specific to RHSM or SAT6 with proxy-on or off 
  let argnames = ["reg_method", "reg_data", "proxy_url", "proxy_creds"];
  let argvalues = [];
  let idlist = [];

  try {
    let holder = metafunc.config.pluginmanager.get_plugin("appliance-holder");
    let stream = holder.held_appliance.version.stream();
    let all_reg_data = conf.cfme_data.get("redhat_updates", {}).streams[stream]
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof KeyError) {
      logger.warning("Could not find rhsm data for stream in yaml");

      metafunc.parametrize(argnames, [pytest.param(
        null,
        null,
        null,
        null,
        {marks: pytest.mark.skip("Could not find rhsm data for stream in yaml")}
      )]);

      return
    } else {
      throw $EXCEPTION
    }
  };

  if (metafunc.fixturenames.include("reg_method")) {
    for (let reg_method in REG_METHODS) {
      let argval, argid;
      let reg_data = all_reg_data.get(reg_method);
      if (is_bool(!reg_data || !reg_data.get("test_registration", false))) continue;

      let proxy_data = conf.cfme_data.get("redhat_updates", {}).get(
        "http_proxy",
        false
      );

      if (is_bool(proxy_data && reg_data.get("use_http_proxy", false))) {
        let proxy_url = proxy_data.url;
        let proxy_creds_key = proxy_data.credentials;
        let proxy_creds = conf.credentials[proxy_creds_key];
        argval = [reg_method, reg_data, proxy_url, proxy_creds];
        argid = ("{}-{}").format(reg_method, "proxy_on");
        idlist.push(argid);
        argvalues.push(argval)
      };

      argval = [reg_method, reg_data, null, null];
      argid = ("{}-{}").format(reg_method, "proxy_off");
      idlist.push(argid);
      argvalues.push(argval)
    };

    return metafunc.parametrize(
      argnames,
      argvalues,
      {ids: idlist, scope: "function"}
    )
  }
};

function appliance_preupdate(temp_appliance_preconfig_funcscope) {
  // Requests appliance from sprout and configures rpms for crud update
  // 
  //   To create the required repo (fresh-new (clean) CFME appliance required).
  // 
  //   register and attach the system to RHN
  //   # SERVER=...redhat.com
  //   # CFME_STREAM=5.10
  //   #
  //   # # Download the stuff for creating the repo
  //   # yum --downloadonly --downloaddir /tmp/therepo install createrepo rpm-build rpmrebuild
  //   #
  //   # # Copy the downloaded stuff to prevent you to delete it after next
  //   # # finished transaction
  //   # cp /tmp/therepo/* /therepo/
  //   #
  //   # # Install the stuff we need now and create repo
  //   # yum install -y rpm-build createrepo make rsync
  //   # rpmbuild  --rebuild http://$SERVER/~jhenner/rpmrebuild/rpmrebuild-2.14-1.src.rpm
  //   # cp rpmbuild/RPMS/noarch/rpmrebuild-2.14-1.noarch.rpm /therepo
  //   # createrepo /therepo
  // 
  //   # # Get the repo file and publish the repo dir.
  //   # curl \"http://$SERVER/~jhenner/rpmrebuild_repo/$CFME_STREAM/rpmrebuild.repo\"         -o /therepo/rpmrebuild.repo
  //   # vim /therepo/rpmrebuild.repo   # Check you got what you expected to get.
  //   # rsync -avP /therepo/ \"jhenner@$SERVER:public_html/rpmrebuild_repo/$CFME_STREAM\"
  //   
  let appliance = temp_appliance_preconfig_funcscope;

  try {
    let url = VersionPicker({
      "5.10": cfme_data.basic_info.rpmrebuild_510,
      "5.11": cfme_data.basic_info.rpmrebuild_511
    }).pick(appliance.version)
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof [KeyError, NoMethodError]) {
      pytest.skip("Failed looking up rpmrebuild in cfme_data.basic_info")
    } else {
      throw $EXCEPTION
    }
  };

  let run = (c) => {
    if (!appliance.ssh_client.run_command(c).success) return throw new ()
  };

  run.call(`curl -o /etc/yum.repos.d/rpmrebuild.repo ${url}`);
  run.call("yum install rpmrebuild createrepo -y");
  run.call("mkdir /myrepo");
  run.call("rpmrebuild --release=99 cfme-appliance");
  run.call("cp /root/rpmbuild/RPMS/x86_64/cfme-appliance-* /myrepo/");
  run.call("createrepo /myrepo/");
  run.call(`echo \"[local-repo]
name=Internal repository
baseurl=file:///myrepo/
enabled=1
gpgcheck=0\" > /etc/yum.repos.d/local.repo`);
  yield(appliance)
};

function test_rh_creds_validation(reg_method, reg_data, proxy_url, proxy_creds) {
  let set_default_repo, use_proxy, proxy_username, proxy_password;

  //  Tests whether credentials are validated correctly for RHSM and SAT6
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Configuration
  //       initialEstimate: 1/12h
  //   
  let repo = reg_data.get("enable_repo");

  if (is_bool(!repo)) {
    set_default_repo = true
  } else {
    set_default_repo = false
  };

  if (is_bool(proxy_url)) {
    use_proxy = true;
    proxy_username = proxy_creds.username;
    proxy_password = proxy_creds.password
  } else {
    use_proxy = false;
    proxy_url = null;
    proxy_username = null;
    proxy_password = null
  };

  let red_hat_updates = RedHatUpdates({
    service: reg_method,
    url: reg_data.url,
    username: conf.credentials[reg_method].username,
    password: conf.credentials[reg_method].password,
    repo_name: repo,
    organization: reg_data.get("organization"),
    use_proxy,
    proxy_url,
    proxy_username,
    proxy_password,
    set_default_repository: set_default_repo
  });

  red_hat_updates.update_registration({cancel: true})
};

function test_rh_registration(temp_appliance_preconfig_funcscope, request, reg_method, reg_data, proxy_url, proxy_creds) {
  let set_default_repo, use_proxy, proxy_username, proxy_password;

  //  Tests whether an appliance can be registered against RHSM and SAT6
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Configuration
  //       initialEstimate: 1/12h
  // 
  //   Bugzilla:
  //       1532201
  //   
  let repo = reg_data.get("enable_repo");

  if (is_bool(!repo)) {
    set_default_repo = true
  } else {
    set_default_repo = false
  };

  if (is_bool(proxy_url)) {
    use_proxy = true;
    proxy_username = proxy_creds.username;
    proxy_password = proxy_creds.password
  } else {
    use_proxy = false;
    proxy_url = null;
    proxy_username = null;
    proxy_password = null
  };

  temp_appliance_preconfig_funcscope((appliance) => {
    let red_hat_updates = RedHatUpdates({
      service: reg_method,
      url: reg_data.url,
      username: conf.credentials[reg_method].username,
      password: conf.credentials[reg_method].password,
      repo_name: repo,
      organization: reg_data.get("organization"),
      use_proxy,
      proxy_url,
      proxy_username,
      proxy_password,
      set_default_repository: set_default_repo
    });

    red_hat_updates.update_registration({validate: (reg_method != "sat6" ? false : true)});
    let used_repo_or_channel = red_hat_updates.get_repository_names();
    red_hat_updates.register_appliances();
    request.addfinalizer(appliance.unregister);

    wait_for({
      func: red_hat_updates.is_registering,
      func_args: [appliance.server.name],
      delay: 10,
      num_sec: 240,
      fail_func: red_hat_updates.refresh
    });

    wait_for({
      func: red_hat_updates.is_subscribed,
      func_args: [appliance.server.name],
      delay: 10,
      num_sec: 600,
      fail_func: red_hat_updates.refresh
    });

    if (!appliance.is_registration_complete(used_repo_or_channel)) throw new ()
  })
};

function test_rhsm_registration_check_repo_names(temp_appliance_preconfig_funcscope, soft_assert, appliance) {
  //  Checks default rpm repos on a fresh appliance
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Configuration
  //       initialEstimate: 1/4h
  //   
  let ver = temp_appliance_preconfig_funcscope.version.series();
  let repos = cfme_data.redhat_updates.repos;

  let repo_names = VersionPicker({
    "5.10": repos.post_510,
    "5.11": repos.post_511
  }).pick(ver);

  if (is_bool(!repo_names)) {
    pytest.skip(`This test is not ready for CFME series ${ver}`)
  };

  temp_appliance_preconfig_funcscope(() => {
    let view = navigate_to(RedHatUpdates, "Edit");
    soft_assert.call(view.repo_name.read() == repo_names);

    // checks current repo names
    view.repo_default_name.click();

    // resets repos with default button and checks they are also correct
    soft_assert.call(view.repo_name.read() == repo_names)
  })
};

function test_rh_updates(appliance_preupdate, appliance) {
  //  Tests whether the update button in the webui functions correctly
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Configuration
  //       initialEstimate: 1/4h
  //   
  let set_default_repo = true;

  appliance_preupdate(() => {
    let red_hat_updates = RedHatUpdates({
      service: "rhsm",
      url: conf.cfme_data.redhat_updates.registration.rhsm.url,
      username: conf.credentials.rhsm.username,
      password: conf.credentials.rhsm.password,
      set_default_repository: set_default_repo
    });

    red_hat_updates.update_registration({validate: false});
    red_hat_updates.check_updates();

    wait_for({
      func: red_hat_updates.checked_updates,
      func_args: [appliance.server.name],
      delay: 10,
      num_sec: 100,
      fail_func: red_hat_updates.refresh
    });

    if (is_bool(red_hat_updates.platform_updates_available())) {
      red_hat_updates.update_appliances()
    }
  });

  let is_package_updated = (appliance) => {
    // Checks if cfme-appliance package is at version 99
    let result = appliance.ssh_client.run_command("rpm -qa cfme-appliance | grep 99");
    return result.success
  };

  wait_for(
    method("is_package_updated"),
    {func_args: [appliance_preupdate], num_sec: 900}
  );

  let result = appliance_preupdate.ssh_client.run_command("rpm -qa cfme-appliance | grep 99");
  if (!result.success) throw new ()
}
