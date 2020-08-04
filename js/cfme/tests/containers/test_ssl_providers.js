require("None");
require("None");
require_relative("fauxfactory");
include(Fauxfactory);
require_relative("fauxfactory");
include(Fauxfactory);
require_relative("cfme");
include(Cfme);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);

let pytestmark = [
  pytest.mark.provider([ContainersProvider], {scope: "module"}),
  test_requirements.containers
];

let alphanumeric_name = gen_alphanumeric(10);
let long_alphanumeric_name = gen_alphanumeric(100);
let integer_name = gen_integer(0, 100000000).to_s;

let provider_names = [
  alphanumeric_name,
  integer_name,
  long_alphanumeric_name
];

const AVAILABLE_SEC_PROTOCOLS = [
  "SSL trusting custom CA",
  "SSL without validation",
  "SSL"
];

const DEFAULT_SEC_PROTOCOLS = [
  "SSL trusting custom CA",
  "SSL without validation",
  "SSL"
];

let checked_item = namedtuple(
  "TestItem",
  ["default_sec_protocol", "metrics_sec_protocol"]
);

const TEST_ITEMS = [
  checked_item.call("SSL trusting custom CA", "SSL trusting custom CA"),
  checked_item.call("SSL trusting custom CA", "SSL without validation"),
  checked_item.call("SSL trusting custom CA", "SSL"),
  checked_item.call("SSL without validation", "SSL trusting custom CA"),
  checked_item.call("SSL without validation", "SSL without validation"),
  checked_item.call("SSL without validation", "SSL"),
  checked_item.call("SSL", "SSL trusting custom CA"),
  checked_item.call("SSL", "SSL without validation"),
  checked_item.call("SSL", "SSL")
];

function sync_ssl_certificate(provider) {
  provider.sync_ssl_certificate()
};

function test_add_provider_naming_conventions(provider, appliance, soft_assert, sync_ssl_certificate) {
  // \" This test is checking ability to add Providers with different names:
  // 
  //   Steps:
  //       * Navigate to Containers Menu
  //       * Navigate to Add Provider Menu
  //       * Try to add a Container Provider with each of the following generated names:
  //           - Alphanumeric name
  //           - Long Alphanumeric name
  //           - Integer name
  //       * Assert that provider was added successfully with each of those
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  for (let provider_name in provider_names) {
    let new_provider = provider.dup;
    new_provider.name = provider_name;
    new_provider.endpoints.default.sec_protocol = "SSL";

    try {
      new_provider.setup();
      let view = appliance.browser.create_view(ContainerProvidersView);
      view.flash.assert_success_message(("Containers Providers \"" + provider_name) + "\" was saved")
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof RuntimeError) {
        soft_assert.call(false, provider_name + " wasn't added successfully")
      } else {
        throw $EXCEPTION
      }
    }
  }
};

function test_add_provider_ssl(provider, default_sec_protocol, soft_assert, sync_ssl_certificate) {
  //  This test checks adding container providers with 3 different security protocols:
  //   SSL trusting custom CA, SSL without validation and SSL
  //   Steps:
  //       * Navigate to Containers Menu
  //       * Navigate to Add Provider Menu
  //       * Try to add a Container Provider with each of the following security options:
  //           Default Endpoint = SSL trusting custom CA/SSL without validation/SSL
  //       * Assert that provider was added successfully
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let new_provider = provider.dup;
  let endpoints = {default: new_provider.endpoints.default};
  endpoints.default.sec_protocol = default_sec_protocol;
  new_provider.endpoints = endpoints;
  new_provider.metrics_type = "Disabled";
  new_provider.alerts_type = "Disabled";

  try {
    new_provider.setup()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof RuntimeError) {
      soft_assert.call(
        false,
        ((provider.name + " wasn't added successfully using ") + default_sec_protocol) + " security protocol"
      )
    } else {
      throw $EXCEPTION
    }
  }
};

function test_add_mertics_provider_ssl(provider, appliance, test_item, soft_assert, sync_ssl_certificate) {
  // This test checks adding container providers with 3 different security protocols:
  //   SSL trusting custom CA, SSL without validation and SSL
  //   The test checks the Default Endpoint as well as the Hawkular Endpoint
  //   Steps:
  //       * Navigate to Containers Menu
  //       * Navigate to Add Provider Menu
  //       * Try to add a Container Provider with each of the following security options:
  //           Default Endpoint = SSL trusting custom CA/SSL without validation/SSL
  //           Hawkular Endpoint = SSL trusting custom CA/SSL without validation/SSL
  //       * Assert that provider was added successfully
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  if (is_bool(!provider.endpoints.get("metrics", false))) {
    pytest.skip("This test requires the metrics endpoint to be configured")
  };

  let new_provider = provider.dup;
  new_provider.endpoints.default.sec_protocol = test_item.default_sec_protocol;
  new_provider.endpoints.metrics.sec_protocol = test_item.metrics_sec_protocol;

  try {
    new_provider.setup();
    let view = appliance.browser.create_view(ContainerProvidersView);
    view.flash.assert_success_message(("Containers Providers \"" + provider.name) + "\" was saved")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof RuntimeError) {
      soft_assert.call(
        false,

        "{provider_name} wasn't added successfully using {default_sec_protocol} security protocol and {metrics_sec_protocol} metrics security protocol".format({
          provider_name: provider.name,
          default_sec_protocol: test_item.default_sec_protocol,
          metrics_sec_protocol: test_item.metrics_sec_protocol
        })
      )
    } else {
      throw $EXCEPTION
    }
  }
};

function test_setup_with_wrong_port(provider, sec_protocol, sync_ssl_certificate) {
  // 
  //   Negative test: set a provider with wrong api port
  //   based on BZ1443520
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let new_provider = provider.dup;
  new_provider.endpoints.default.api_port = "1234";
  new_provider.endpoints.default.sec_protocol = sec_protocol;

  pytest.raises(
    RuntimeError,
    {match: "Credential validation was not successful"},
    () => new_provider.setup()
  )
}
