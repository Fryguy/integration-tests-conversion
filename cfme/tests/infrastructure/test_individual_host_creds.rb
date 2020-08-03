require_relative 'cfme/common/host_views'
include Cfme::Common::Host_views
require_relative 'cfme/common/host_views'
include Cfme::Common::Host_views
require_relative 'cfme/infrastructure'
include Cfme::Infrastructure
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), pytest.mark.provider([InfraProvider], required_fields: ["hosts"], scope: "module"), pytest.mark.meta(blockers: [BZ(1635126, forced_streams: ["5.10"])])]
msgs = {"virtualcenter" => {"default" => "Cannot complete login due to an incorrect user name or password", "remote_login" => "Login failed due to a bad username or password.", "web_services" => "Cannot complete login due to an incorrect user name or password"}, "rhevm" => "Login failed due to a bad username or password.", "scvmm" => "Check credentials. Remote error message: WinRM::WinRMAuthorizationError"}
credentials_type = {"remote_login" => "Remote Login Credentials", "default" => "Default Credentials", "web_services" => "Web Services Credentials"}
def get_host_data_by_name(provider_key, host_name)
  for host_obj in conf.cfme_data.get("management_systems", {})[provider_key].get("hosts", [])
    if host_name == host_obj["name"]
      return host_obj
    end
  end
  return nil
end
def test_host_good_creds(appliance, request, setup_provider, provider, creds)
  # 
  #   Tests host credentialing  with good credentials
  # 
  #   Bugzilla:
  #       1584261
  #       1584280
  #       1619626
  # 
  #   Metadata:
  #       test_flag: inventory
  # 
  #   Polarion:
  #       assignee: nachandr
  #       casecomponent: Infra
  #       initialEstimate: 1/12h
  #       testSteps:
  #           1. Add Host credentials
  #           2. Validate + Save
  #           3. Verify Valid creds on Host Details page
  #   
  test_host = random.choice(provider.data["hosts"])
  host_data = get_host_data_by_name(provider.key, test_host.name)
  host_collection = appliance.collections.hosts
  host_obj = host_collection.instantiate(name: test_host.name, provider: provider)
  _host_remove_creds = lambda do
    update(host_obj) {
      host_obj.credentials = {"creds" => host.Host.Credential(principal: "", secret: "", verify_secret: "")}
    }
  end
  update(host_obj, validate_credentials: true) {
    host_obj.credentials = {"creds" => host.Host.Credential.from_config(host_data["credentials"][creds])}
    if is_bool(provider.one_of(SCVMMProvider))
      host_obj.hostname = host_data["ipaddress"]
    end
  }
  _refresh = lambda do
    view = appliance.browser.create_view(HostDetailsView)
    view.browser.refresh()
    begin
      creds_value = view.entities.summary("Authentication Status").get_text_of(credentials_type[creds])
    rescue NameError
      return "None"
    end
    return creds_value
  end
  wait_for(lambda{|| _refresh.call() == "Valid"}, num_sec: 180, delay: 15, message: "Waiting for '{}' state change".format(credentials_type[creds]))
end
def test_host_bad_creds(appliance, request, setup_provider, provider, creds)
  # 
  #   Tests host credentialing  with bad credentials
  # 
  #   Bugzilla:
  #       1584261
  #       1584280
  #       1619626
  # 
  #   Metadata:
  #       test_flag: inventory
  # 
  #   Polarion:
  #       assignee: nachandr
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #       testSteps:
  #           1. Add Host credentials
  #           2. Validate + Save bad credentials
  #           3. Verify invalid creds on Host Details page
  #   
  test_host = random.choice(provider.data["hosts"])
  host_data = get_host_data_by_name(provider.key, test_host.name)
  host_collection = appliance.collections.hosts
  host_obj = host_collection.instantiate(name: test_host.name, provider: provider)
  flash_msg = msgs.get(provider.type)
  if is_bool(flash_msg.is_a? Hash)
    flash_msg = flash_msg.get(creds)
  end
  pytest.raises(Exception, match: flash_msg) {
    update(host_obj, validate_credentials: true) {
      host_obj.credentials = {"creds" => host.Host.Credential(principal: "wrong", secret: "wrong")}
      if is_bool(provider.one_of(SCVMMProvider))
        host_obj.hostname = host_data["ipaddress"]
      end
    }
  }
  edit_view = appliance.browser.create_view(HostEditView)
  edit_view.save_button.click()
  _host_remove_creds = lambda do
    update(host_obj) {
      host_obj.credentials = {"creds" => host.Host.Credential(principal: "", secret: "", verify_secret: "")}
    }
  end
  _refresh = lambda do
    view = appliance.browser.create_view(HostDetailsView)
    view.browser.refresh()
    begin
      creds_value = view.entities.summary("Authentication Status").get_text_of(credentials_type[creds])
    rescue NameError
      return "None"
    end
    return creds_value
  end
  wait_for(lambda{|| ["Error", "Invalid"].include?(_refresh.call())}, num_sec: 180, delay: 15, message: "Waiting for '{}' state change".format(credentials_type[creds]))
end
