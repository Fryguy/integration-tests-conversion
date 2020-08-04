require("None");
require_relative("cfme");
include(Cfme);

function vmdb_config(appliance) {
  let config = appliance.advanced_settings;
  let original = deepcopy(config);
  if (config.http_proxy.default.host !== null) throw new ();
  yield(config);
  appliance.update_advanced_settings(original)
};

function reset_leaf(config) {
  config.http_proxy.default.host = "<<reset>>"
};

function reset_nonleaf(config) {
  config.http_proxy.default = "<<reset>>"
};

function test_advanced_config_reset_pzed(appliance, vmdb_config, configurer) {
  // Check whether we can use \"<<reset>>\" string to reset the leaf element
  //   of the advanced config.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Configuration
  //   
  vmdb_config.http_proxy.default = {host: "bar"};
  appliance.update_advanced_settings(vmdb_config);
  let config = appliance.advanced_settings;
  if (config.http_proxy.default.host != "bar") throw new ();
  configurer.call(vmdb_config);
  appliance.update_advanced_settings(vmdb_config);
  vmdb_config = appliance.advanced_settings;
  if (vmdb_config.http_proxy.default.host !== null) throw new ()
}
