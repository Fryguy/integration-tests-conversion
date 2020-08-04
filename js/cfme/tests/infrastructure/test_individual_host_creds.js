require_relative("cfme/common/host_views");
include(Cfme.Common.Host_views);
require_relative("cfme/common/host_views");
include(Cfme.Common.Host_views);
require_relative("cfme/infrastructure");
include(Cfme.Infrastructure);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),

  pytest.mark.provider(
    [InfraProvider],
    {required_fields: ["hosts"], scope: "module"}
  ),

  pytest.mark.meta({blockers: [BZ(1635126, {forced_streams: ["5.10"]})]})
];

let msgs = {
  virtualcenter: {
    default: "Cannot complete login due to an incorrect user name or password",
    remote_login: "Login failed due to a bad username or password.",
    web_services: "Cannot complete login due to an incorrect user name or password"
  },

  rhevm: "Login failed due to a bad username or password.",
  scvmm: "Check credentials. Remote error message: WinRM::WinRMAuthorizationError"
};

let credentials_type = {
  remote_login: "Remote Login Credentials",
  default: "Default Credentials",
  web_services: "Web Services Credentials"
};

function get_host_data_by_name(provider_key, host_name) {
  for (let host_obj in conf.cfme_data.get("management_systems", {})[provider_key].get(
    "hosts",
    []
  )) {
    if (host_name == host_obj.name) return host_obj
  };

  return null
};

function test_host_good_creds(appliance, request, setup_provider, provider, creds) {
  // 
  //   Tests host credentialing  with good credentials
  // 
  //   Bugzilla:
  //       1584261
  //       1584280
  //       1619626
  // 
  //   Metadata:
  //       test_flag: inventory
  // 
  //   Polarion:
  //       assignee: nachandr
  //       casecomponent: Infra
  //       initialEstimate: 1/12h
  //       testSteps:
  //           1. Add Host credentials
  //           2. Validate + Save
  //           3. Verify Valid creds on Host Details page
  //   
  let test_host = random.choice(provider.data.hosts);
  let host_data = get_host_data_by_name(provider.key, test_host.name);
  let host_collection = appliance.collections.hosts;

  let host_obj = host_collection.instantiate({
    name: test_host.name,
    provider
  });

  let _host_remove_creds = () => (
    update(host_obj, () => (
      host_obj.credentials = {creds: host.Host.Credential({
        principal: "",
        secret: "",
        verify_secret: ""
      })}
    ))
  );

  update(host_obj, {validate_credentials: true}, () => {
    host_obj.credentials = {creds: host.Host.Credential.from_config(host_data.credentials[creds])};

    if (is_bool(provider.one_of(SCVMMProvider))) {
      host_obj.hostname = host_data.ipaddress
    }
  });

  let _refresh = () => {
    let view = appliance.browser.create_view(HostDetailsView);
    view.browser.refresh();

    try {
      let creds_value = view.entities.summary("Authentication Status").get_text_of(credentials_type[creds])
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NameError) {
        return "None"
      } else {
        throw $EXCEPTION
      }
    };

    return creds_value
  };

  wait_for(() => _refresh.call() == "Valid", {
    num_sec: 180,
    delay: 15,
    message: "Waiting for '{}' state change".format(credentials_type[creds])
  })
};

function test_host_bad_creds(appliance, request, setup_provider, provider, creds) {
  // 
  //   Tests host credentialing  with bad credentials
  // 
  //   Bugzilla:
  //       1584261
  //       1584280
  //       1619626
  // 
  //   Metadata:
  //       test_flag: inventory
  // 
  //   Polarion:
  //       assignee: nachandr
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/15h
  //       testSteps:
  //           1. Add Host credentials
  //           2. Validate + Save bad credentials
  //           3. Verify invalid creds on Host Details page
  //   
  let test_host = random.choice(provider.data.hosts);
  let host_data = get_host_data_by_name(provider.key, test_host.name);
  let host_collection = appliance.collections.hosts;

  let host_obj = host_collection.instantiate({
    name: test_host.name,
    provider
  });

  let flash_msg = msgs.get(provider.type);
  if (is_bool(flash_msg.is_a(Hash))) flash_msg = flash_msg.get(creds);

  pytest.raises(Exception, {match: flash_msg}, () => (
    update(host_obj, {validate_credentials: true}, () => {
      host_obj.credentials = {creds: host.Host.Credential({
        principal: "wrong",
        secret: "wrong"
      })};

      if (is_bool(provider.one_of(SCVMMProvider))) {
        host_obj.hostname = host_data.ipaddress
      }
    })
  ));

  let edit_view = appliance.browser.create_view(HostEditView);
  edit_view.save_button.click();

  let _host_remove_creds = () => (
    update(host_obj, () => (
      host_obj.credentials = {creds: host.Host.Credential({
        principal: "",
        secret: "",
        verify_secret: ""
      })}
    ))
  );

  let _refresh = () => {
    let view = appliance.browser.create_view(HostDetailsView);
    view.browser.refresh();

    try {
      let creds_value = view.entities.summary("Authentication Status").get_text_of(credentials_type[creds])
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NameError) {
        return "None"
      } else {
        throw $EXCEPTION
      }
    };

    return creds_value
  };

  wait_for(() => ["Error", "Invalid"].include(_refresh.call()), {
    num_sec: 180,
    delay: 15,
    message: "Waiting for '{}' state change".format(credentials_type[creds])
  })
}
