require_relative 'cfme'
include Cfme
require_relative 'cfme/services/myservice'
include Cfme::Services::Myservice
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
pytestmark = [test_requirements.filtering]
filter_value = "beautifulpotato"
filter_option = "Cloud Volume : Name"
def test_exp_editor_delete_operator(appliance, operator)
  # 
  #   Bugzilla:
  #       1720216
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/30h
  #   
  view = navigate_to(appliance.collections.volumes, "All")
  name = fauxfactory.gen_alphanumeric()
  view.entities.search.save_filter("
        fill_field(#{filter_option}, =, #{filter_value});
        select_expression_text;
        click_#{operator};
        #{(operator != "not") ? "fill_field(#{filter_option}, =, #{filter_value});" : ""}
        select_expression_text;
        click_remove;", name)
  editor = view.search.advanced_search_form.search_exp_editor
  raise unless editor.expression_text == "#{filter_option} = \"#{filter_value}\""
  view.entities.search.delete_filter()
  view.entities.search.close_advanced_search()
end
def test_apply_after_save()
  # 
  #   Bugzilla:
  #       1741243
  #       1761525
  # 
  #   There are a few ways to reproduce this BZ but this is the most reliable
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: high
  #       initialEstimate: 1/10h
  #   
  filter_name = fauxfactory.gen_alphanumeric()
  view = navigate_to(MyService, "All")
  view.entities.search.save_filter("fill_field(Service : Custom 1, =, value)", filter_name)
  (LogValidator("/var/www/miq/vmdb/log/production.log", failure_patterns: [".*FATAL.*"])).waiting(timeout: 60) {
    raise unless view.entities.search.apply_filter()
    raise unless view.wait_displayed("10s")
  }
end
