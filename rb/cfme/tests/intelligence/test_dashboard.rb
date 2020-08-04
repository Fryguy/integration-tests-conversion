require 'None'
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.dashboard, pytest.mark.tier(3)]
AVAILABLE_WIDGETS = ["Top Memory Consumers (weekly)", "Vendor and Guest OS Chart", "EVM: Recently Discovered Hosts", "Top Storage Consumers", "Guest OS Information"]
def widgets(dashboards)
  yield(dashboards.default.collections.widgets.all())
  dashboards.close_zoom()
  dashboards.default.collections.widgets.reset()
end
def test_widgets_operation(dashboards, widgets, soft_assert, infra_provider)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: critical
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #   
  wait_for(lambda{|| widgets.map{|widget| !widget.blank}.is_all?}, timeout: "5m", delay: 10, fail_func: lambda{|| dashboards.refresh()})
  for widget in widgets
    widget.minimize()
    soft_assert.(widget.minimized, "Widget #{widget.name} could not be minimized")
    widget.restore()
    soft_assert.(!widget.minimized, "Widget #{widget.name} could not be maximized")
    widget.footer
    widget.contents
    if ["chart", "table"].include?(widget.content_type)
      # pass
    end
    raise unless widget.dashboard.dashboard_view.is_displayed
  end
end
def test_custom_dashboards(request, soft_assert, number_dashboards, dashboards, appliance)
  # Create some custom dashboards and check their presence. Then check their contents.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  # 
  #   Bugzilla:
  #       1666712
  #   
  dashboards_to_delete = []
  request.addfinalizer(lambda{|| dashboards_to_delete.map{|item| item.delete()}})
  for _ in number_dashboards.times
    d = appliance.collections.report_dashboards.create(fauxfactory.gen_alphanumeric(), "EvmGroup-super_administrator", fauxfactory.gen_alphanumeric(), locked: false, widgets: sample(AVAILABLE_WIDGETS, 3))
    dashboards_to_delete.push(d)
  end
  dash_dict = dashboards_to_delete.map{|d|[d.title, d]}.to_h
  begin
    for dash in dashboards.all()
      soft_assert.(dash_dict.include?(dash.name), "Dashboard #{dash.name} not found!")
      dash.dashboard_view.click()
      if dash_dict.keys().to_a.include?(dash.name)
        for widget in dash.collections.widgets.all()
          soft_assert.(dash_dict[dash.name].widgets.include?(widget.name), "Widget #{widget.name} not found in #{dash.name}!")
        end
        dash_dict = nil
      end
    end
    soft_assert.(!dash_dict, "Some of the dashboards were not found! ({})".format(dash_dict.keys().to_a.join(", ")))
  rescue IndexError
    pytest.fail("No dashboard selection tabs present on dashboard!")
  end
end
def test_verify_rss_links_from_dashboards(dashboards)
  # This test verifies that RSS links on dashboard are working.
  # 
  #   Prerequisities:
  #       * Generated widgets, at least one RSS.
  # 
  #   Steps:
  #       * Loop through all RSS widgets
  #       * Loop through all the links in a widget
  #       * Try making a request on the provided URLs, should make sense
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: WebUI
  #       initialEstimate: 1/4h
  #   
  wait_for(lambda{|| !dashboards.default.collections.widgets.all().map{|widget| widget.blank}.is_any?}, delay: 2, timeout: 120, fail_func: dashboards.refresh)
  for widget in dashboards.default.collections.widgets.all(content_type: "rss")
    for row in widget.contents
      onclick = row.browser.get_attribute("onclick", row)
      url = re.sub("^window.location=\"([^\"]+)\";$", "\\1", onclick.strip())
      req = requests.get(url, verify: false)
      raise "The url {} seems malformed".format(repr(url)) unless (200 <= req.status_code) and (req.status_code < 400)
    end
  end
end
def test_widgets_reorder(dashboards, soft_assert, request)
  # In this test we try to reorder first two widgets in the first column of a
  #      default dashboard.
  # 
  #      Prerequisities:
  #       * A list of widgets on the default dashboard
  # 
  #      Steps:
  #       * Go to the Dashboard
  #       * Reorder first two widgets in the first column using drag&drop
  #       * Assert that the widgets order is changed
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: high
  #       casecomponent: Reporting
  #       initialEstimate: 1/12h
  #   
  request.addfinalizer(dashboards.default.collections.widgets.reset)
  previous_state = dashboards.default.collections.widgets.all()
  previous_names = previous_state.map{|w| w.name}
  first_widget = previous_state[0]
  second_widget = previous_state[1]
  dashboards.default.drag_and_drop(first_widget, second_widget)
  new_state = dashboards.default.collections.widgets.all()
  new_names = new_state.map{|w| w.name}
  raise unless previous_names[2..-1] == new_names[2..-1]
  raise unless previous_names[0] == new_names[1]
  raise unless previous_names[1] == new_names[0]
end
def test_dashboard_layouts_match()
  # 
  #   Bugzilla:
  #       1518766
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #   
  # pass
end
def test_dashboard_widgets_fullscreen()
  # 
  #   Bugzilla:
  #       1518901
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #   
  # pass
end
def test_dashboard_chart_widgets_size_in_modal()
  # 
  #   Test whether dashboard chart widgets have correct size in modal
  #   window.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Reporting
  #       caseimportance: low
  #       initialEstimate: 1/6h
  #       testtype: nonfunctional
  #   
  # pass
end
