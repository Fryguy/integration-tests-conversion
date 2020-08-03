require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.ignore_stream("5.11")]
def test_verify_rss_links(appliance)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: WebUI
  #   
  view = navigate_to(appliance.server, "RSS")
  for row in view.table.rows()
    url = row[3].text
    req = requests.get(url, verify: false)
    raise "The url {} seems malformed".format(repr(url)) unless (200 <= req.status_code) and (req.status_code < 400)
  end
end
