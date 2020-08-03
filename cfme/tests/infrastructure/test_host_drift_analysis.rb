require_relative 'cfme'
include Cfme
require_relative 'cfme/common/host_views'
include Cfme::Common::Host_views
require_relative 'cfme/infrastructure/host'
include Cfme::Infrastructure::Host
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.drift, pytest.mark.tier(3), pytest.mark.meta(blockers: [BZ(1635126, forced_streams: ["5.10"])])]
def pytest_generate_tests(metafunc)
  argnames,argvalues,idlist = testgen.providers_by_class(metafunc, [InfraProvider], required_fields: ["hosts"])
  argnames += ["host"]
  new_idlist = []
  new_argvalues = []
  for (i, argvalue_tuple) in enumerate(argvalues)
    args = {zip_p(argnames, argvalue_tuple).to_a}
    for test_host in args["provider"].data["hosts"]
      if is_bool(!test_host.get("test_fleece", false))
        next
      end
      argvs = argvalues[i][0..-1]
      new_argvalues.push(argvs + [test_host])
      test_id = ("{}-{}").format(args["provider"].key, test_host["type"])
      new_idlist.push(test_id)
    end
  end
  testgen.parametrize(metafunc, argnames, new_argvalues, ids: new_idlist, scope: "module")
end
def a_host(host, appliance, provider)
  host_collection = appliance.collections.hosts
  return host_collection.instantiate(name: host.name, provider: provider)
end
def set_host_credentials(provider, a_host, setup_provider_modscope)
  begin
    host_data, = provider.data["hosts"].select{|data| data["name"] == a_host.name}.map{|data| data}
  rescue TypeError
    pytest.skip("Multiple hosts with the same name found, only expecting one")
  end
  a_host.update_credentials_rest(credentials: host_data["credentials"])
  yield
  a_host.update_credentials_rest(credentials: {"default" => Host.Credential(principal: "", secret: "")})
end
def test_host_drift_analysis(appliance, request, a_host, soft_assert, set_host_credentials)
  # Tests host drift analysis
  # 
  #   Metadata:
  #       test_flag: host_drift_analysis
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       initialEstimate: 1/3h
  #   
  view = navigate_to(a_host, "Details")
  drift_num_orig = view.entities.summary("Relationships").get_text_of("Drift History").to_i
  col = appliance.collections.tasks.filter({"tab" => "AllTasks"})
  col.delete_all()
  a_host.run_smartstate_analysis(wait_for_task_result: true)
  navigate_to(a_host, "Details")
  wait_for(lambda{|| view.entities.summary("Relationships").get_text_of("Drift History") == (drift_num_orig + 1).to_s}, delay: 10, num_sec: 360, message: "Waiting for Drift History count to increase", fail_func: appliance.server.browser.refresh)
  added_tag = appliance.collections.categories.instantiate(display_name: "Department").collections.tags.instantiate(display_name: "Accounting")
  a_host.add_tag(added_tag)
  request.addfinalizer(lambda{|| a_host.remove_tag(added_tag)})
  a_host.run_smartstate_analysis(wait_for_task_result: true)
  navigate_to(a_host, "Details")
  wait_for(lambda{|| view.entities.summary("Relationships").get_text_of("Drift History") == (drift_num_orig + 2).to_s}, delay: 10, num_sec: 360, message: "Waiting for Drift History count to increase", fail_func: appliance.server.browser.refresh)
  soft_assert.(a_host.equal_drift_results(, "My Company Tags", 0, 1), "Drift analysis results are equal when they shouldn't be")
  drift_analysis_view = appliance.browser.create_view(HostDriftAnalysis)
  drift_analysis_view.toolbar.same_values_attributes.click()
  soft_assert.(!drift_analysis_view.drift_analysis.check_section_attribute_availability(), )
  drift_analysis_view.toolbar.different_values_attributes.click()
  soft_assert.(drift_analysis_view.drift_analysis.check_section_attribute_availability(), )
end
