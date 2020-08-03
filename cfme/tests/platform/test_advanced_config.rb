require 'None'
require_relative 'cfme'
include Cfme
def vmdb_config(appliance)
  config = appliance.advanced_settings
  original = deepcopy(config)
  raise unless config["http_proxy"]["default"]["host"] === nil
  yield config
  appliance.update_advanced_settings(original)
end
def reset_leaf(config)
  config["http_proxy"]["default"]["host"] = "<<reset>>"
end
def reset_nonleaf(config)
  config["http_proxy"]["default"] = "<<reset>>"
end
def test_advanced_config_reset_pzed(appliance, vmdb_config, configurer)
  # Check whether we can use \"<<reset>>\" string to reset the leaf element
  #   of the advanced config.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Configuration
  #   
  vmdb_config["http_proxy"]["default"] = {"host" => "bar"}
  appliance.update_advanced_settings(vmdb_config)
  config = appliance.advanced_settings
  raise unless config["http_proxy"]["default"]["host"] == "bar"
  configurer.(vmdb_config)
  appliance.update_advanced_settings(vmdb_config)
  vmdb_config = appliance.advanced_settings
  raise unless vmdb_config["http_proxy"]["default"]["host"] === nil
end
