require_relative 'widgetastic/exceptions'
include Widgetastic::Exceptions
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'cfme'
include Cfme
require_relative 'cfme/configure/configuration/region_settings'
include Cfme::Configure::Configuration::Region_settings
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
general_list_pages = [["servers", nil, "Details", false], ["servers", nil, "Authentication", false], ["servers", nil, "Workers", false], ["servers", nil, "CustomLogos", false], ["servers", nil, "Advanced", false], ["servers", nil, "DiagnosticsDetails", false], ["servers", nil, "DiagnosticsWorkers", false], ["servers", nil, "CFMELog", false], ["servers", nil, "AuditLog", false], ["servers", nil, "ProductionLog", false], ["servers", nil, "Utilization", false], ["servers", nil, "Timelines", false], ["servers", nil, "ServerDiagnosticsCollectLogs", false], ["regions", nil, "Details", false], ["regions", nil, "ImportTags", false], ["regions", nil, "Import", false], ["regions", nil, "HelpMenu", false], ["regions", nil, "Advanced", false], ["regions", nil, "DiagnosticsZones", false], ["regions", nil, "OrphanedData", false], ["regions", nil, "Servers", true], ["regions", nil, "ServersByRoles", false], ["regions", nil, "RolesByServers", false], ["zones", nil, "Zone", false], ["zones", nil, "SmartProxyAffinity", false], ["zones", nil, "Advanced", false], ["zones", nil, "ServersByRoles", false], ["zones", nil, "Servers", true], ["zones", nil, "CANDUGapCollection", false], ["zones", nil, "RolesByServers", false], ["zones", nil, "CollectLogs", false], ["candus", nil, "Details", false], ["map_tags", nil, "All", false], ["categories", nil, "All", false], ["red_hat_updates", RedHatUpdates, "Details", false], ["analysis_profiles", nil, "All", true], ["system_schedules", nil, "Add", false], ["users", nil, "All", true], ["groups", nil, "All", true], ["roles", nil, "All", true], ["tenants", nil, "All", true]]
details_pages = [["users", nil, "Details", false], ["groups", nil, "Details", false], ["roles", nil, "Details", false], ["tenants", nil, "Details", false], ["analysis_profiles", nil, "Details", false], ["system_schedules", nil, "All", true], ["system_schedules", nil, "Details", false], ["tag", nil, "All", false]]
items_selection = ["5 Items", "10 Items", "20 Items", "50 Items", "100 Items", "200 Items", "500 Items", "1000 Items"]
def check_paginator_for_page(view)
  begin
    panel = view.browser.element("//ul[@class=\"pagination\"]")
    return panel.is_displayed()
  rescue NoSuchElementException
    return false
  end
end
def schedule(appliance)
  schedule = appliance.collections.system_schedules.create(name: fauxfactory.gen_alphanumeric(15, start: "schedule_"), description: fauxfactory.gen_alphanumeric(20, start: "schedule_desc_"))
  yield(schedule)
  schedule.delete()
end
def test_paginator_config_pages(appliance, place_info)
  # Check paginator is visible for config pages.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       initialEstimate: 1/4h
  #       casecomponent: WebUI
  #   
  place_name,place_class,place_navigation,paginator_expected_result = place_info
  if is_bool(place_class)
    test_class = place_class
  else
    test_class = appliance.collections.getattr(place_name)
    if place_name == "regions"
      test_class = test_class.instantiate()
    else
      if place_name == "servers"
        test_class = appliance.server
      else
        if place_name == "zones"
          test_class = appliance.server.zone
        end
      end
    end
  end
  view = navigate_to(test_class, place_navigation)
  raise unless check_paginator_for_page(view) == paginator_expected_result
end
def test_paginator_details_page(appliance, place_info, schedule)
  # Check paginator is visible for access control pages + schedules.
  #   If paginator is present, check that all options are present in items per page.
  # 
  #   Bugzilla:
  #       1515952
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  place_name,place_class,place_navigation,paginator_expected_result = place_info
  if place_name == "tag"
    category = appliance.collections.categories.instantiate(name: "department", display_name: "Department")
    test_class = category.collections.tags
    view = navigate_to(test_class, place_navigation)
  else
    test_class = is_bool(place_class) ? place_class : appliance.collections.getattr(place_name)
    view = navigate_to(test_class, "All")
    table = is_bool(view.instance_variable_defined? :@table) ? view.table : view.entities.table
    if place_navigation == "Details"
      table[0].click()
    end
  end
  raise unless check_paginator_for_page(view) == paginator_expected_result
  if is_bool(check_paginator_for_page(view))
    paginator = view.paginator
    items_selector = Dropdown(view, "#{paginator.items_per_page} Items")
    msg = "Not all options are present in items per page"
    raise msg unless Set.new(items_selection) == Set.new(items_selector.to_a)
  end
end
def test_configure_diagnostics_pages_cfme_region()
  # 
  #   Go to Settings -> Configuration -> Diagnostics -> CFME Region
  #   and check whether all sub pages are showing.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #   
  # pass
end
