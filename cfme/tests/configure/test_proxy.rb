require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), pytest.mark.provider([AzureProvider, GCEProvider, EC2Provider], scope: "module"), pytest.mark.usefixtures("setup_provider_modscope"), test_requirements.appliance]
def validate_proxy_logs(provider, utility_vm_ssh, appliance_ip)
  _is_ip_in_log = lambda do
    provider.refresh_provider_relationships()
    return (utility_vm_ssh.run_command("grep #{appliance_ip} /var/log/squid/access.log")).success
  end
  wait_for(func: _is_ip_in_log, num_sec: 300, delay: 10, message: "Waiting for requests from appliance in logs")
end
def prepare_proxy_specific(utility_vm_ssh, provider, appliance, utility_vm_proxy_data)
  proxy_ip,proxy_port = utility_vm_proxy_data
  prov_type = provider.type
  appliance.set_proxy("192.0.2.1", proxy_port, prov_type: "default")
  appliance.set_proxy(proxy_ip, proxy_port, prov_type: prov_type)
  utility_vm_ssh.run_command("echo \"\" > /var/log/squid/access.log")
  yield
  appliance.reset_proxy(prov_type)
  appliance.reset_proxy()
end
def prepare_proxy_default(utility_vm_ssh, provider, appliance, utility_vm_proxy_data)
  proxy_ip,proxy_port = utility_vm_proxy_data
  prov_type = provider.type
  appliance.set_proxy(proxy_ip, proxy_port, prov_type: "default")
  appliance.reset_proxy(prov_type)
  utility_vm_ssh.run_command("echo \"\" > /var/log/squid/access.log")
  yield
  appliance.reset_proxy()
  appliance.reset_proxy(prov_type)
end
def prepare_proxy_invalid(provider, appliance)
  prov_type = provider.type
  appliance.set_proxy("192.0.2.1", "1234", prov_type: "default")
  appliance.set_proxy("192.0.2.1", "1234", prov_type: prov_type)
  yield
  appliance.reset_proxy(prov_type)
  appliance.reset_proxy()
end
def test_proxy_valid(appliance, utility_vm_ssh, prepare_proxy_default, provider)
  #  Check whether valid proxy settings works.
  # 
  #   Bugzilla:
  #       1623862
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #       testSteps:
  #           1. Configure appliance to use proxy for default provider.
  #           2. Configure appliance to use not use proxy for specific provider.
  #           3. Chceck whether the provider is accessed trough proxy by chceking the proxy logs.
  #   
  provider.refresh_provider_relationships()
  validate_proxy_logs(provider, utility_vm_ssh, appliance.hostname)
  wait_for(provider.is_refreshed, func_kwargs: {"refresh_delta" => 120}, fail_condition: true, num_sec: 300, delay: 30)
end
def test_proxy_override(appliance, utility_vm_ssh, prepare_proxy_specific, provider)
  #  Check whether invalid default and valid specific provider proxy settings
  #   results in provider refresh working.
  # 
  #   Bugzilla:
  #       1623862
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Configure default proxy to invalid entry.
  #           2. Configure specific proxy to valid entry.
  #           3. Check whether the provider is accessed trough proxy by checking the proxy logs.
  #           4. Wait for the provider refresh to complete to check the settings worked.
  #   
  provider.refresh_provider_relationships()
  validate_proxy_logs(provider, utility_vm_ssh, appliance.hostname)
  wait_for(provider.is_refreshed, func_kwargs: {"refresh_delta" => 120}, fail_condition: true, num_sec: 300, delay: 30)
end
def test_proxy_invalid(appliance, prepare_proxy_invalid, provider)
  #  Check whether invalid default and invalid specific provider proxy settings
  #    results in provider refresh not working.
  # 
  #   Bugzilla:
  #       1623550
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #       testSteps:
  #           1. Configure default proxy to invalid entry.
  #           2. Configure specific proxy to invalid entry.
  #           3. Wait for the provider refresh to complete to check the settings causes error.
  #   
  provider.refresh_provider_relationships()
  view = navigate_to(provider, "Details")
  view.toolbar.view_selector.select("Summary View")
  last_refresh_failed = lambda do
    view.toolbar.reload.click()
    refresh_failed_msg = is_bool(provider.one_of(EC2Provider)) ? "execution expired" : "Timed out connecting to server"
    return view.entities.summary("Status").get_text_of("Last Refresh").include?(refresh_failed_msg)
  end
  wait_for(method(:last_refresh_failed), fail_condition: false, num_sec: 240, delay: 20, fail_func: provider.refresh_provider_relationships)
end
def test_proxy_remove_default()
  # 
  #   With 5.7 there is a new feature that allows users to specific a
  #   specific set of proxy settings for each cloud provider.  The way you
  #   enable this is to go to Configuration/Advanced Settings and scroll
  #   down to the default proxy settings.  For this test you want to create
  #   an default proxy, verified it worked, and then remove the proxy and
  #   verify it didn\"t use a proxy
  #   Here are the proxy instructions:
  #   https://mojo.redhat.com/docs/DOC-1103999
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       setup: I think the best way to do this one is start with a bad proxy value,
  #              get the connection error, and then remove the proxy values and make
  #              sure it starts connecting again.  I\"ll have to see if there is a log
  #              value we can look at.  Otherwise, you need to shutdown the proxy
  #              server to be absolutely sure.
  #       startsin: 5.7
  #       upstream: yes
  #   
  # pass
end
def test_proxy_remove_azure()
  # 
  #   With 5.7 there is a new feature that allows users to specific a
  #   specific set of proxy settings for each cloud provider.  The way you
  #   enable this is to go to Configuration/Advanced Settings and scroll
  #   down to the azure proxy settings.  For this test you want to create an
  #   azure proxy, verified it worked, and then remove the proxy and verify
  #   it used the default which may or may not be blank.
  #   Here are the proxy instructions:
  #   https://mojo.redhat.com/docs/DOC-1103999
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       setup: I think the best way to do this one is start with a bad proxy value,
  #              get the connection error, and then remove the proxy values and make
  #              sure it starts connecting again.  I\"ll have to see if there is a log
  #              value we can look at.  Otherwise, you need to shutdown the proxy
  #              server to be absolutely sure.
  #       startsin: 5.7
  #       upstream: yes
  #   
  # pass
end
