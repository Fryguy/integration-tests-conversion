require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/host'
include Cfme::Infrastructure::Host
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [test_requirements.smartstate, pytest.mark.tier(3)]
HOST_TYPES = ["rhev", "rhel", "esx", "esxi"]
def pytest_generate_tests(metafunc)
  argnames,argvalues,idlist = testgen.providers_by_class(metafunc, [InfraProvider], required_fields: ["hosts"])
  argnames = argnames + ["host_type", "host_name"]
  new_argvalues = []
  new_idlist = []
  for (index, argvalue_tuple) in enumerate(argvalues)
    args = {zip_p(argnames, argvalue_tuple).to_a}
    prov_hosts = args["provider"].data.hosts
    for test_host in prov_hosts
      if is_bool(!test_host.get("test_fleece", false))
        next
      end
      if !HOST_TYPES.include?(test_host.get("type"))
        logger.warning("host type must be set to [{}] for smartstate analysis tests".format(HOST_TYPES.join("|")))
        next
      end
      new_argvalue_list = [args["provider"], test_host["type"], test_host["name"]]
      test_id = ("{}-{}-{}").format(args["provider"].key, test_host["type"], test_host["name"])
      new_argvalues.push(new_argvalue_list)
      new_idlist.push(test_id)
    end
  end
  testgen.parametrize(metafunc, argnames, new_argvalues, ids: new_idlist, scope: "module")
end
def host_with_credentials(provider, host_name)
  #  Add credentials to hosts 
  host, = provider.hosts.all().select{|host| host.name == host_name}.map{|host| host}
  begin
    host_data, = provider.data["hosts"].select{|data| data["name"] == host.name}.map{|data| data}
  rescue TypeError
    pytest.skip("Multiple hosts with the same name found, only expecting one")
  end
  host.update_credentials_rest(credentials: host_data["credentials"])
  yield(host)
  host.update_credentials_rest(credentials: {"default" => Host.Credential(principal: "", secret: "")})
end
def test_run_host_analysis(setup_provider_modscope, provider, host_type, host_name, register_event, soft_assert, host_with_credentials)
  #  Run host SmartState analysis
  # 
  #   Metadata:
  #       test_flag: host_analysis
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       initialEstimate: 1/3h
  #   
  register_event.(target_type: "Host", target_name: host_name, event_type: "request_host_scan")
  register_event.(target_type: "Host", target_name: host_name, event_type: "host_scan_complete")
  host_with_credentials.run_smartstate_analysis(wait_for_task_result: true)
  view = navigate_to(host_with_credentials, "Details")
  drift_history = view.entities.summary("Relationships").get_text_of("Drift History")
  soft_assert.(drift_history != "0", "No drift history change found")
  if provider.type == "rhevm"
    soft_assert.(view.entities.summary("Configuration").get_text_of("Services") != "0", "No services found in host detail")
  end
  if ["rhel", "rhev"].include?(host_type)
    soft_assert.(view.entities.summary("Configuration").get_text_of("Packages") != "0", "No packages found in host detail")
    soft_assert.(view.entities.summary("Configuration").get_text_of("Files") != "0", "No files found in host detail")
  else
    if ["esx", "esxi"].include?(host_type)
      soft_assert.(view.entities.summary("Configuration").get_text_of("Advanced Settings") != "0", "No advanced settings found in host detail")
      view.sidebar.security.tree.select(partial_match("Firewall Rules"))
      soft_assert.(view.title.text.include?("(Firewall Rules)"), "No firewall rules found in host detail")
    end
  end
end
