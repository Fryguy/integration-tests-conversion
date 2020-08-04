require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [pytest.mark.ignore_stream("5.11")];

function test_verify_rss_links(appliance) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let view = navigate_to(appliance.server, "RSS");

  for (let row in view.table.rows()) {
    let url = row[3].text;
    let req = requests.get(url, {verify: false});

    if (!(200 <= req.status_code) || !(req.status_code < 400)) {
      throw "The url {} seems malformed".format(repr(url))
    }
  }
}
