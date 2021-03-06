require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.sdn, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([AzureProvider, EC2Provider, GCEProvider, OpenStackProvider], scope: "module")]
extensions_mapping = {"txt" => "Text", "csv" => "CSV", "pdf" => "PDF"}
OBJECTCOLLECTIONS = ["network_providers", "balancers", "cloud_networks", "network_ports", "network_security_groups", "network_subnets", "network_routers"]
def download(objecttype, extension)
  view = navigate_to(objecttype, "All")
  if extension == "pdf"
    view.toolbar.download.item_select("Print or export as PDF")
    handle_extra_tabs(view)
  else
    view.toolbar.download.item_select("Download as #{extensions_mapping[extension]}")
  end
end
def download_summary(spec_object)
  view = navigate_to(spec_object, "Details")
  view.toolbar.download.click()
  handle_extra_tabs(view)
end
def handle_extra_tabs(view)
  tabs = view.browser.selenium.window_handles
  while tabs.size > 1
    view.browser.selenium.switch_to_window(tabs[-1])
    view.browser.selenium.close()
    tabs = view.browser.selenium.window_handles
  end
  view.browser.selenium.switch_to_window(tabs[0])
end
def test_download_lists_base(filetype, collection_type, appliance)
  #  Download the items from base lists.
  # 
  #   Metadata:
  #       test_flag: sdn
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       initialEstimate: 1/10h
  #       casecomponent: WebUI
  #       caseimportance: medium
  #   
  collection = appliance.collections.getattr(collection_type)
  download(collection, filetype)
end
def test_download_pdf_summary(appliance, collection_type, provider)
  #  Download the summary details of specific object
  # 
  #   Metadata:
  #       test_flag: sdn
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       initialEstimate: 1/10h
  #       casecomponent: WebUI
  #       caseimportance: medium
  #   
  collection = appliance.collections.getattr(collection_type)
  all_entities = collection.all()
  if is_bool(all_entities)
    random_obj = random.choice(all_entities)
    download_summary(random_obj)
  else
    pytest.skip("#{collection_type} entities not available")
  end
end
