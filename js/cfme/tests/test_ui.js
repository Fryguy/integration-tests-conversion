require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [test_requirements.general_ui];

function traverse(dic, paths, { path = null }) {
  path = path || [];

  if (is_bool(dic.is_a(Array))) {
    for (let item in dic) {
      let np = path[_.range(0, 0)];
      np.push(item);
      paths.push(np)
    }
  } else if (is_bool(dic.is_a(Hash))) {
    for (let [k, v] in dic.to_a()) {
      let np = path[_.range(0, 0)];
      np.push(k);
      traverse(v, paths, {path: np})
    }
  };

  return paths
};

function test_each_page(appliance, soft_assert) {
  // 
  //   Bugzilla:
  //       1648338
  // 
  //   Polarion:
  //       assignee: pvala
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let view = navigate_to(appliance.server, "Dashboard");

  if (appliance.version < "5.11") {
    let edge_header = view.browser.element("//meta[@content=\"IE=edge\"]");
    soft_assert.call(edge_header.get_attribute("http-equiv") == "X-UA-Compatible")
  };

  let tree = view.navigation.nav_item_tree();
  let paths = [];
  traverse(tree, paths, {path: null});

  for (let link in paths) {
    view.navigation.select(...link)
  }
}
