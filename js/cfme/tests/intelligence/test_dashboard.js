require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.dashboard, pytest.mark.tier(3)];

const AVAILABLE_WIDGETS = [
  "Top Memory Consumers (weekly)",
  "Vendor and Guest OS Chart",
  "EVM: Recently Discovered Hosts",
  "Top Storage Consumers",
  "Guest OS Information"
];

function widgets(dashboards) {
  yield(dashboards.default.collections.widgets.all());
  dashboards.close_zoom();
  dashboards.default.collections.widgets.reset()
};

function test_widgets_operation(dashboards, widgets, soft_assert, infra_provider) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: critical
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //   
  wait_for(
    () => widgets.map(widget => !widget.blank).is_all,
    {timeout: "5m", delay: 10, fail_func() {return dashboards.refresh()}}
  );

  for (let widget in widgets) {
    widget.minimize();

    soft_assert.call(
      widget.minimized,
      `Widget ${widget.name} could not be minimized`
    );

    widget.restore();

    soft_assert.call(
      !widget.minimized,
      `Widget ${widget.name} could not be maximized`
    );

    widget.footer;
    widget.contents;

    // pass
    if (["chart", "table"].include(widget.content_type)) null;
    if (!widget.dashboard.dashboard_view.is_displayed) throw new ()
  }
};

function test_custom_dashboards(request, soft_assert, number_dashboards, dashboards, appliance) {
  // Create some custom dashboards and check their presence. Then check their contents.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  // 
  //   Bugzilla:
  //       1666712
  //   
  let dashboards_to_delete = [];
  request.addfinalizer(() => dashboards_to_delete.map(item => item.delete()));

  for (let _ in number_dashboards.times) {
    let d = appliance.collections.report_dashboards.create(
      fauxfactory.gen_alphanumeric(),
      "EvmGroup-super_administrator",
      fauxfactory.gen_alphanumeric(),
      {locked: false, widgets: sample(AVAILABLE_WIDGETS, 3)}
    );

    dashboards_to_delete.push(d)
  };

  let dash_dict = dashboards_to_delete.map(d => [d.title, d]).to_h;

  try {
    for (let dash in dashboards.all()) {
      soft_assert.call(
        dash_dict.include(dash.name),
        `Dashboard ${dash.name} not found!`
      );

      dash.dashboard_view.click();

      if (dash_dict.keys().to_a.include(dash.name)) {
        for (let widget in dash.collections.widgets.all()) {
          soft_assert.call(
            dash_dict[dash.name].widgets.include(widget.name),
            `Widget ${widget.name} not found in ${dash.name}!`
          )
        };

        dash_dict = null
      }
    };

    soft_assert.call(
      !dash_dict,
      "Some of the dashboards were not found! ({})".format(dash_dict.keys().to_a.join(", "))
    )
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof IndexError) {
      pytest.fail("No dashboard selection tabs present on dashboard!")
    } else {
      throw $EXCEPTION
    }
  }
};

function test_verify_rss_links_from_dashboards(dashboards) {
  // This test verifies that RSS links on dashboard are working.
  // 
  //   Prerequisities:
  //       * Generated widgets, at least one RSS.
  // 
  //   Steps:
  //       * Loop through all RSS widgets
  //       * Loop through all the links in a widget
  //       * Try making a request on the provided URLs, should make sense
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: WebUI
  //       initialEstimate: 1/4h
  //   
  wait_for(
    () => (
      !dashboards.default.collections.widgets.all().map(widget => widget.blank).is_any
    ),

    {delay: 2, timeout: 120, fail_func: dashboards.refresh}
  );

  for (let widget in dashboards.default.collections.widgets.all({content_type: "rss"})) {
    for (let row in widget.contents) {
      let onclick = row.browser.get_attribute("onclick", row);

      let url = re.sub(
        "^window.location=\"([^\"]+)\";$",
        "\\1",
        onclick.strip()
      );

      let req = requests.get(url, {verify: false});

      if (!(200 <= req.status_code) || !(req.status_code < 400)) {
        throw "The url {} seems malformed".format(repr(url))
      }
    }
  }
};

function test_widgets_reorder(dashboards, soft_assert, request) {
  // In this test we try to reorder first two widgets in the first column of a
  //      default dashboard.
  // 
  //      Prerequisities:
  //       * A list of widgets on the default dashboard
  // 
  //      Steps:
  //       * Go to the Dashboard
  //       * Reorder first two widgets in the first column using drag&drop
  //       * Assert that the widgets order is changed
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Reporting
  //       initialEstimate: 1/12h
  //   
  request.addfinalizer(dashboards.default.collections.widgets.reset);
  let previous_state = dashboards.default.collections.widgets.all();
  let previous_names = previous_state.map(w => w.name);
  let first_widget = previous_state[0];
  let second_widget = previous_state[1];
  dashboards.default.drag_and_drop(first_widget, second_widget);
  let new_state = dashboards.default.collections.widgets.all();
  let new_names = new_state.map(w => w.name);
  if (previous_names[_.range(2, 0)] != new_names[_.range(2, 0)]) throw new ();
  if (previous_names[0] != new_names[1]) throw new ();
  if (previous_names[1] != new_names[0]) throw new ()
};

// 
//   Bugzilla:
//       1518766
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: WebUI
//       caseimportance: medium
//       initialEstimate: 1/12h
//   
// pass
function test_dashboard_layouts_match() {};

// 
//   Bugzilla:
//       1518901
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: WebUI
//       caseimportance: low
//       initialEstimate: 1/12h
//   
// pass
function test_dashboard_widgets_fullscreen() {};

// 
//   Test whether dashboard chart widgets have correct size in modal
//   window.
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Reporting
//       caseimportance: low
//       initialEstimate: 1/6h
//       testtype: nonfunctional
//   
// pass
function test_dashboard_chart_widgets_size_in_modal() {}
