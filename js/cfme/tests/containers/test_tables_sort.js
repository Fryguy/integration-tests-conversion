require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/containers/replicator");
include(Cfme.Containers.Replicator);
require_relative("cfme/containers/route");
include(Cfme.Containers.Route);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(1),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

const TEST_ITEMS = [
  ContainersTestItem(
    ContainersProvider,
    "container_provider_table_sort",
    {collection_name: null}
  ),

  ContainersTestItem(
    Route,
    "route_table_sort",
    {collection_name: "container_routes"}
  ),

  ContainersTestItem(
    Replicator,
    "replicator_table_sort",
    {collection_name: "container_replicators"}
  )
];

function test_tables_sort(test_item, soft_assert, appliance) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(
    (test_item.obj === ContainersProvider ? test_item.obj : appliance.collections.getattr(test_item.collection_name)),
    "All"
  );

  view.toolbar.view_selector.select("List View");
  view.entities.paginator.set_items_per_page(1000);

  for (let [col, header_text] in enumerate(view.entities.elements.headers)) {
    if (is_bool(!header_text)) continue;
    view.entities.elements.sort_by({column: header_text, order: "asc"});

    soft_assert.call(
      view.entities.elements.sorted_by == attributize_string(header_text) && view.entities.elements.sort_order == "asc",
      `Failed checking sorted_by ${header_text} and sort_order asc`
    );

    let rows_ascending = view.entities.elements.rows().map(r => r[col].text);
    view.entities.elements.sort_by({column: header_text, order: "desc"});

    soft_assert.call(
      view.entities.elements.sorted_by == attributize_string(header_text) && view.entities.elements.sort_order == "desc",
      `Failed checking sorted_by ${header_text} and sort_order desc`
    );

    let rows_descending = view.entities.elements.rows().map(r => r[col].text);

    soft_assert.call(
      rows_ascending[_.range(0, 0)].each_slice(-1).map(item => item.first) == rows_descending,

      "Malfunction in the table sort: {} != {}".format(
        rows_ascending[_.range(0, 0)].each_slice(-1).map(item => item.first),
        rows_descending
      )
    )
  }
}
