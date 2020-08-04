require("None");
require_relative("dateparser");
include(Dateparser);
require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/simulation");
include(Cfme.Automate.Simulation);
require_relative("cfme/intelligence/reports/dashboards");
include(Cfme.Intelligence.Reports.Dashboards);
require_relative("cfme/intelligence/reports/widgets");
include(Cfme.Intelligence.Reports.Widgets);
require_relative("cfme/utils/appliance/implementations/rest");
include(Cfme.Utils.Appliance.Implementations.Rest);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

function default_widgets() {
  let view = navigate_to(DefaultDashboard(), "Details");
  return view.selected_items
};

function dashboard(default_widgets) {
  return DefaultDashboard({widgets: default_widgets})
};

function custom_widgets(appliance) {
  let collection = appliance.collections.dashboard_report_widgets;

  let ws = [
    collection.create(collection.MENU, fauxfactory.gen_alphanumeric(), {
      description: fauxfactory.gen_alphanumeric(),
      active: true,

      shortcuts: {
        "Services / Catalogs": fauxfactory.gen_alphanumeric(),
        "Compute / Clouds / Providers": fauxfactory.gen_alphanumeric()
      },

      visibility: "<To All Users>"
    }),

    collection.create(
      collection.REPORT,
      fauxfactory.gen_alphanumeric(),

      {
        description: fauxfactory.gen_alphanumeric(),
        active: true,

        filter: [
          "Events",
          "Operations",
          "Operations VMs Powered On/Off for Last Week"
        ],

        columns: ["VM Name", "Message"],
        rows: "10",
        timer: {run: "Hourly", hours: "Hour"},
        visibility: "<To All Users>"
      }
    ),

    collection.create(collection.CHART, fauxfactory.gen_alphanumeric(), {
      description: fauxfactory.gen_alphanumeric(),
      active: true,
      filter: "Configuration Management/Virtual Machines/Vendor and Guest OS",
      timer: {run: "Hourly", hours: "Hour"},
      visibility: "<To All Users>"
    })
  ];

  if (appliance.version < "5.11") {
    ws.push(collection.create(
      collection.RSS,
      fauxfactory.gen_alphanumeric(),

      {
        description: fauxfactory.gen_alphanumeric(),
        active: true,
        type: "Internal",
        feed: "Administrative Events",
        rows: "8",
        visibility: "<To All Users>"
      }
    ))
  };

  yield(ws);
  ws.map(w => w.delete())
};

function test_widgets_on_dashboard(appliance, request, dashboard, default_widgets, custom_widgets, soft_assert) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Reporting
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //   
  update(
    dashboard,
    () => dashboard.widgets = custom_widgets.map(w => w.title)
  );

  let _finalize = () => (
    update(
      method("dashboard"),
      () => dashboard.widgets = default_widgets
    )
  );

  request.addfinalizer(method("_finalize"));
  let view = navigate_to(appliance.server, "Dashboard");
  view.reset_widgets();
  let dashboard_view = view.dashboards("Default Dashboard");

  soft_assert(
    dashboard_view.widgets.read().size == method("custom_widgets").size,
    "Count of the widgets differ"
  );

  for (let custom_w in custom_widgets) {
    soft_assert(
      dashboard_view.widgets(custom_w.title).is_displayed,
      `Widget ${custom_w.title} not found on dashboard`
    )
  }
};

function test_widgets_reorder_in_reports(request, dashboard) {
  // Tests drag and drop widgets in Cloud Intel/Reports/Dashboards
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Reporting
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(dashboard, "Edit");
  let previous_names = view.widget_picker.all_dashboard_widgets;
  let first_widget = previous_names[0];
  let second_widget = previous_names[1];
  view.widget_picker.drag_and_drop(first_widget, second_widget);
  let new_names = view.widget_picker.all_dashboard_widgets;
  if (previous_names[_.range(2, 0)] != new_names[_.range(2, 0)]) throw new ();
  if (previous_names[0] != new_names[1]) throw new ();
  if (previous_names[1] != new_names[0]) throw new ()
};

function test_generate_widget_content_by_automate(request, appliance, klass, namespace, domain) {
  // 
  //   Polarion:
  //       assignee: ghubale
  //       initialEstimate: 1/8h
  //       caseimportance: medium
  //       caseposneg: positive
  //       testtype: functional
  //       startsin: 5.10
  //       casecomponent: Automate
  //       tags: automate
  //       testSteps:
  //           1. create a new widget and add this widget to dashboard
  //           2. Create automate method with below content:
  //               #
  //               # Description: generate widget content by calling shell command
  //               #
  //               cmd =(\"/var/www/miq/vmdb/bin/rails r
  //                     \'MiqWidget.find_by_title(\"widget_name\").queue_generate_content\'\")
  //               system(cmd)
  //               exit MIQ_OK
  //           3. Execute the automate method(by simulation) and check updated time of that widget
  //              on dashboard.
  //           4. Updated status changes once we trigger the generation of a widget content from
  //              Automate method.
  //           5. Or we can check widget status by executing following commands on rails console:
  //               >> MiqWidget.find_by_title(\"widget_name\")
  //               >> service_miq_widget = MiqAeMethodService::MiqAeServiceMiqWidget.find(widget_id)
  //               >> service_miq_widget.queue_generate_content (this will do same what we did with
  //                  automate method)
  //       expectedResults:
  //           1.
  //           2.
  //           3. Updated time of that widget on dashboard should be changes to current time of update
  //              by automate method.
  //           4.
  //           5. Updated time of that widget on dashboard should be changes to current time of update
  //              by rails.
  // 
  //   Bugzilla:
  //           1445932
  //   
  let widget_name = fauxfactory.gen_alphanumeric();
  let schema_field = fauxfactory.gen_alphanumeric();

  let method = klass.methods.create({
    name: fauxfactory.gen_alphanumeric(),
    display_name: fauxfactory.gen_alphanumeric(),
    location: "inline",
    script: (`cmd =('/var/www/miq/vmdb/bin/rails r         \"MiqWidget.find_by_title(\\'{widget}\\').queue_generate_content\"')\nsystem(cmd)\n\n        exit MIQ_OK`).format({widget: widget_name})
  });

  klass.schema.add_fields({
    name: schema_field,
    type: "Method",
    data_type: "String"
  });

  let instance = klass.instances.create({
    name: fauxfactory.gen_alphanumeric(),
    fields: {schema_field: {value: method.name}}
  });

  let widget = appliance.collections.dashboard_report_widgets.create(
    appliance.collections.dashboard_report_widgets.CHART,
    widget_name,

    {
      description: fauxfactory.gen_alphanumeric(),
      active: true,
      filter: "Configuration Management/Virtual Machines/Vendor and Guest OS",
      timer: {run: "Hourly", hours: "Hour"},
      visibility: "<To All Users>"
    }
  );

  request.addfinalizer(widget.delete);
  let view = widget.create_view(AllDashboardWidgetsView);
  view.flash.assert_message(`Widget \"${widget.title}\" was saved`);
  view = navigate_to(appliance.server, "Dashboard");
  view.add_widget.item_select(widget.title);
  view = navigate_to(widget, "Details");
  let old_update = view.last_run_time.read().split_p(" ")[4];

  simulate({appliance, request: "Call_Instance", attributes_values: {
    namespace: ("{domain}/{namespace}").format({
      domain: domain.name,
      namespace: namespace.name
    }),

    class: klass.name,
    instance: instance.name
  }});

  widget.refresh();
  let current_update = view.last_run_time.read().split_p(" ")[4];
  if (old_update == current_update) throw new ()
};

function test_widget_generate_content_via_rest(context, appliance) {
  // 
  //   Bugzilla:
  //      1761836
  //      1623607
  //      1753682
  // 
  //   Polarion:
  //       assignee: pvala
  //       caseimportance: medium
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //       testSteps:
  //           1. Depending on the implementation -
  //               i. GET /api/widgtes/:id and note the `last_generated_content_on`.
  //               ii. Navigate to Dashboard and note the `last_generated_content_on` for the widget.
  //           2. POST /api/widgets/:id
  //               {
    //                   \"action\": \"generate_content\"
    //               }
    //           3. Wait until the task completes.
    //           4. Depending on the implementation
    //               i. GET /api/widgets/:id and compare the value of `last_generated_content_on`
    //                   with the value noted in step 1.
    //               ii.  Navigate to the dashboard and check if the value was updated for the widget.
    //       expectedResults:
    //           1.
    //           2.
    //           3.
    //           4. Both values must be different, value must be updated.
    //   
    let view = navigate_to(appliance.server, "Dashboard");
    view.reset_widgets();
    let ui_widget = choice(view.dashboards("Default Dashboard").widgets);
    let rest_widget = appliance.rest_api.collections.widgets.get({id: ui_widget.widget_id});

    if (context == ViaUI) {
      let last_update = ui_widget.footer.text;
      rest_widget.action.generate_content();
      assert_response(appliance);

      if (!wait_for(
        () => (
          parse(ui_widget.footer.text.split_p(" | ")[0].strip("Updated ")) > parse(last_update.split_p(" | ")[0].strip("Updated "))
        ),

        {fail_func: view.browser.refresh, timeout: 10, delay: 2}
      )) throw new ()
    } else {
      let last_update = rest_widget.last_generated_content_on;
      rest_widget.rest_api_entity.generate_content();
      assert_response(appliance);

      if (!wait_for(
        () => rest_widget.last_generated_content_on > last_update,

        {
          fail_func: rest_widget.reload,
          timeout: 30,
          message: "Wait for the widget to update"
        }
      )) throw new ()
    }
  }
