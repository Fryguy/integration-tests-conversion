require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/azure");
include(Cfme.Cloud.Provider.Azure);
require_relative("cfme/cloud/provider/ec2");
include(Cfme.Cloud.Provider.Ec2);
require_relative("cfme/cloud/provider/gce");
include(Cfme.Cloud.Provider.Gce);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [pytest.mark.provider(
  [EC2Provider, AzureProvider, GCEProvider, OpenStackProvider],
  {scope: "module"}
)];

function elements_collection(setup_provider_modscope, appliance, provider) {
  let elements_collection_ = appliance.collections.network_topology_elements;
  wait_for(elements_collection_.all, {timeout: 10});
  yield(elements_collection_);
  provider.delete_if_exists({cancel: false});
  provider.wait_for_delete()
};

function test_topology_search(request, elements_collection) {
  // Testing search functionality in Topology view.
  // 
  //   Metadata:
  //       test_flag: sdn
  // 
  //   Polarion:
  //       assignee: gtalreja
  //       casecomponent: WebUI
  //       initialEstimate: 1/4h
  //   
  let elements = elements_collection.all();
  logger.info(elements.to_s);
  let element_to_search = random.choice(elements);

  let search_term = element_to_search.name[_.range(
    0,
    element_to_search.name.size / 2
  )];

  elements_collection.search(search_term);
  request.addfinalizer(elements_collection.clear_search);

  for (let element in elements) {
    logger.info(element.to_s);

    if (element.name.include(search_term)) {
      if (!!element.is_opaqued) {
        throw "Element should be not opaqued. Search: \"{}\", found: \"{}\"".format(
          search_term,
          element.name
        )
      }
    } else if (!element.is_opaqued) {
      throw "Element should be opaqued. search: \"{}\", found: \"{}\"".format(
        search_term,
        element.name
      )
    }
  }
};

function test_topology_toggle_display(elements_collection) {
  // Testing display functionality in Topology view.
  // 
  //   Metadata:
  //       test_flag: sdn
  // 
  //   Polarion:
  //       assignee: mmojzis
  //       casecomponent: WebUI
  //       initialEstimate: 1/4h
  //   
  let vis_terms = {[true]: "Visible", [false]: "Hidden"};

  for (let state in [true, false]) {
    for (let legend in elements_collection.legends) {
      if (is_bool(state)) {
        elements_collection.disable_legend(legend)
      } else {
        elements_collection.enable_legend(legend)
      };

      for (let element in elements_collection.all()) {
        if (element.type == legend.split().join("").rstrip("s") && element.is_displayed == state) {
          throw "Element is {} but should be {} since \"{}\" display is currently {}".format(
            vis_terms[!state],
            vis_terms[state],
            legend,
            {[true]: "on", [false]: "off"}[state]
          )
        }
      }
    }
  }
}
