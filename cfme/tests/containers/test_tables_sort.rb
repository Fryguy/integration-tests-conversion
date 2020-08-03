require_relative 'widgetastic/utils'
include Widgetastic::Utils
require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/containers/replicator'
include Cfme::Containers::Replicator
require_relative 'cfme/containers/route'
include Cfme::Containers::Route
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "function"), test_requirements.containers]
TEST_ITEMS = [ContainersTestItem(ContainersProvider, "container_provider_table_sort", collection_name: nil), ContainersTestItem(Route, "route_table_sort", collection_name: "container_routes"), ContainersTestItem(Replicator, "replicator_table_sort", collection_name: "container_replicators")]
def test_tables_sort(test_item, soft_assert, appliance)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: high
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  #   
  view = navigate_to((test_item.obj === ContainersProvider) ? test_item.obj : appliance.collections.getattr(test_item.collection_name), "All")
  view.toolbar.view_selector.select("List View")
  view.entities.paginator.set_items_per_page(1000)
  for (col, header_text) in enumerate(view.entities.elements.headers)
    if is_bool(!header_text)
      next
    end
    view.entities.elements.sort_by(column: header_text, order: "asc")
    soft_assert.(view.entities.elements.sorted_by == attributize_string(header_text) && view.entities.elements.sort_order == "asc", )
    rows_ascending = view.entities.elements.rows().map{|r| r[col].text}
    view.entities.elements.sort_by(column: header_text, order: "desc")
    soft_assert.(view.entities.elements.sorted_by == attributize_string(header_text) && view.entities.elements.sort_order == "desc", )
    rows_descending = view.entities.elements.rows().map{|r| r[col].text}
    soft_assert.(rows_ascending[0..-1].each_slice(-1).map(&:first) == rows_descending, "Malfunction in the table sort: {} != {}".format(rows_ascending[0..-1].each_slice(-1).map(&:first), rows_descending))
  end
end
