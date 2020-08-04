require("None");
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(3),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

const COLLECTION_NAMES = [
  "container_replicators",
  "container_projects",
  "container_routes",
  "container_services",
  "container_pods",
  "containers"
];

function test_search_bar(provider, appliance, soft_assert) {
  //  <object> summary page - Search bar
  //   This test checks Search bar functionality on every object summary page
  //   Steps:
  //       * Goes to <object> page
  //       * Inserts: Irregular symbol, '*' character, full search string, partial search string
  //       * Verify proper results
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  for (let collection_name in COLLECTION_NAMES) {
    let view = navigate_to(
      appliance.collections.getattr(collection_name),
      "All"
    );

    let exist_member_str = choice(view.entities.entity_names);

    let search_strings_and_result = {
      "***": null,
      exist_member_str: exist_member_str,
      $$$: null,
      [exist_member_str[_.range(0, exist_member_str.size / 2)]]: exist_member_str
    };

    try {
      for (let [search_string, result] in search_strings_and_result.to_a()) {
        view.entities.search.simple_search(search_string);
        let results_row_names = view.entities.entity_names;

        if (is_bool(result)) {
          soft_assert.call(
            results_row_names.include(result),

            "Expected to get result \"{}\" for search string \"{}\". search results: {}".format(
              result,
              search_string,
              results_row_names
            )
          )
        } else {
          soft_assert.call(
            !results_row_names,

            "Unexpected result for search string \"{}\", Should not find records, search results: \"{}\"".format(
              search_string,
              results_row_names
            )
          )
        }
      }
    } finally {
      view.entities.search.clear_simple_search()
    }
  }
}
