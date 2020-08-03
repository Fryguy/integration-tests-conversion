require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [test_requirements.general_ui]
def traverse(dic, paths, path: nil)
  path = path || []
  if is_bool(dic.is_a? Array)
    for item in dic
      np = path[0..-1]
      np.push(item)
      paths.push(np)
    end
  else
    if is_bool(dic.is_a? Hash)
      for (k, v) in dic.to_a()
        np = path[0..-1]
        np.push(k)
        traverse(v, paths, path: np)
      end
    end
  end
  return paths
end
def test_each_page(appliance, soft_assert)
  # 
  #   Bugzilla:
  #       1648338
  # 
  #   Polarion:
  #       assignee: pvala
  #       initialEstimate: 1/4h
  #       casecomponent: WebUI
  #   
  view = navigate_to(appliance.server, "Dashboard")
  if appliance.version < "5.11"
    edge_header = view.browser.element("//meta[@content=\"IE=edge\"]")
    soft_assert.(edge_header.get_attribute("http-equiv") == "X-UA-Compatible")
  end
  tree = view.navigation.nav_item_tree()
  paths = []
  traverse(tree, paths, path: nil)
  for link in paths
    view.navigation.select(*link)
  end
end
