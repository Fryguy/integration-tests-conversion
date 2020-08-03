require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.tier(3), test_requirements.settings, pytest.mark.usefixtures("openstack_provider")]
def value(request)
  return request.param
end
def page(request)
  return request.param
end
def set_grid(appliance)
  old_grid_limit = appliance.user.my_settings.visual.grid_view_limit
  appliance.user.my_settings.visual.grid_view_limit = 5
  yield
  appliance.user.my_settings.visual.grid_view_limit = old_grid_limit
end
def set_tile(appliance)
  tilelimit = appliance.user.my_settings.visual.tile_view_limit
  appliance.user.my_settings.visual.tile_view_limit = 5
  yield
  appliance.user.my_settings.visual.tile_view_limit = tilelimit
end
def set_list(appliance)
  listlimit = appliance.user.my_settings.visual.list_view_limit
  appliance.user.my_settings.visual.list_view_limit = 5
  yield
  appliance.user.my_settings.visual.list_view_limit = listlimit
end
def go_to_grid(page)
  view = navigate_to(page, "All")
  view.toolbar.view_selector.select("Grid View")
end
def set_cloud_provider_quad(appliance)
  appliance.user.my_settings.visual.cloud_provider_quad = false
  yield
  appliance.user.my_settings.visual.cloud_provider_quad = true
end
def test_cloud_grid_page_per_item(appliance, request, page, value, set_grid)
  #  Tests grid items per page
  # 
  #   Metadata:
  #       test_flag: visuals
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Settings
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #       tags: settings
  #   
  if is_bool(page.is_a? String)
    page = appliance.collections.getattr(page)
  end
  if appliance.user.my_settings.visual.grid_view_limit != value
    appliance.user.my_settings.visual.grid_view_limit = value.to_i
  end
  request.addfinalizer(lambda{|| go_to_grid(page)})
  limit = appliance.user.my_settings.visual.grid_view_limit
  view = navigate_to(page, "All", use_resetter: false)
  view.toolbar.view_selector.select("Grid View")
  if is_bool(!view.entities.paginator.is_displayed)
    pytest.skip("This page doesn't have entities and/or paginator")
  end
  max_item = view.entities.paginator.max_item
  item_amt = view.entities.paginator.items_amount
  items_per_page = view.entities.paginator.items_per_page
  raise unless items_per_page.to_i == limit.to_i
  if item_amt.to_i >= limit.to_i
    raise  unless max_item.to_i == limit.to_i
  end
  raise unless max_item.to_i <= item_amt.to_i
end
def test_cloud_tile_page_per_item(appliance, request, page, value, set_tile)
  #  Tests tile items per page
  # 
  #   Metadata:
  #       test_flag: visuals
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Settings
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #       tags: settings
  #   
  if is_bool(page.is_a? String)
    page = appliance.collections.getattr(page)
  end
  if appliance.user.my_settings.visual.tile_view_limit != value
    appliance.user.my_settings.visual.tile_view_limit = value.to_i
  end
  request.addfinalizer(lambda{|| go_to_grid(page)})
  limit = appliance.user.my_settings.visual.tile_view_limit
  view = navigate_to(page, "All", use_resetter: false)
  view.toolbar.view_selector.select("Tile View")
  if is_bool(!view.entities.paginator.is_displayed)
    pytest.skip("This page doesn't have entities and/or paginator")
  end
  max_item = view.entities.paginator.max_item
  item_amt = view.entities.paginator.items_amount
  items_per_page = view.entities.paginator.items_per_page
  raise unless items_per_page.to_i == limit.to_i
  if item_amt.to_i >= limit.to_i
    raise  unless max_item.to_i == limit.to_i
  end
  raise unless max_item.to_i <= item_amt.to_i
end
def test_cloud_list_page_per_item(appliance, request, page, value, set_list)
  #  Tests list items per page
  # 
  #   Metadata:
  #       test_flag: visuals
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Settings
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #       tags: settings
  #   
  if is_bool(page.is_a? String)
    page = appliance.collections.getattr(page)
  end
  if appliance.user.my_settings.visual.list_view_limit != value
    appliance.user.my_settings.visual.list_view_limit = value.to_i
  end
  request.addfinalizer(lambda{|| go_to_grid(page)})
  limit = appliance.user.my_settings.visual.list_view_limit
  view = navigate_to(page, "All", use_resetter: false)
  view.toolbar.view_selector.select("List View")
  if is_bool(!view.entities.paginator.is_displayed)
    pytest.skip("This page doesn't have entities and/or paginator")
  end
  max_item = view.entities.paginator.max_item
  item_amt = view.entities.paginator.items_amount
  items_per_page = view.entities.paginator.items_per_page
  raise unless items_per_page.to_i == limit.to_i
  if item_amt.to_i >= limit.to_i
    raise  unless max_item.to_i == limit.to_i
  end
  raise unless max_item.to_i <= item_amt.to_i
end
def test_cloudprovider_noquads(request, set_cloud_provider_quad)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Settings
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #       tags: settings
  #   
  view = navigate_to(CloudProvider, "All")
  view.toolbar.view_selector.select("Grid View")
  raise unless !view.entities.get_first_entity().data.get("quad", {}).include?("topRight")
end
