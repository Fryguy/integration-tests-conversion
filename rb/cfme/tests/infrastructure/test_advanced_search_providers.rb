# This testing module tests the behaviour of the search box in the Provider section
# 
# It does not check for filtering results so far.
require_relative 'selenium/common/exceptions'
include Selenium::Common::Exceptions
require_relative 'cfme'
include Cfme
require_relative 'cfme/fixtures/pytest_store'
include Cfme::Fixtures::Pytest_store
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [pytest.mark.usefixtures("infra_provider"), pytest.mark.tier(3), test_requirements.filtering]
def rails_delete_filter(request)
  # Introspect a function bound filter_name and use ssh_client and rails to delete it
  yield
  filter_name = request.function.getattr("filter_name", nil)
  logger.debug("rails_delete_filter: calling rails to delete filter: #{filter_name}")
  if is_bool(filter_name)
    begin
      store.current_appliance.ssh_client.run_rails_command("\"MiqSearch.where(:description => {}).first.delete\"".format(repr(filter_name)))
    rescue Exception => ex
      logger.warning("rails_delete_filter: exception during delete. #{ex}")
      # pass
    end
  else
    logger.warning("rails_delete_filter: failed to get filter_name")
  end
end
def advanced_search_view()
  view = navigate_to(InfraProvider, "All")
  raise "Cannot do advanced search here!" unless view.entities.search.is_advanced_search_possible
  yield(view)
  view.entities.search.remove_search_filters()
end
def test_can_open_provider_advanced_search(advanced_search_view)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  advanced_search_view.entities.search.open_advanced_search()
end
def test_provider_filter_without_user_input(advanced_search_view)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  advanced_search_view.entities.search.advanced_search("fill_count(Infrastructure Provider.VMs, >=, 0)")
  advanced_search_view.flash.assert_no_error()
end
def test_provider_filter_with_user_input(advanced_search_view)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  logger.debug("DEBUG: test_with_user_input: fill and apply")
  advanced_search_view.entities.search.advanced_search("fill_count(Infrastructure Provider.VMs, >=)", {"COUNT" => 0})
  advanced_search_view.flash.assert_no_error()
end
def test_provider_filter_with_user_input_and_cancellation(advanced_search_view)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  advanced_search_view.entities.search.advanced_search("fill_count(Infrastructure Provider.VMs, >=)", {"COUNT" => 0}, true)
  advanced_search_view.flash.assert_no_error()
end
def test_provider_filter_save_cancel(rails_delete_filter, advanced_search_view)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  test_provider_filter_save_cancel.filter_name = fauxfactory.gen_alphanumeric()
  logger.debug("Set filter_name to: #{test_provider_filter_save_cancel.filter_name}")
  raise unless advanced_search_view.entities.search.save_filter("fill_count(Infrastructure Provider.VMs, >)", test_provider_filter_save_cancel.filter_name, cancel: true)
  advanced_search_view.flash.assert_no_error()
  raise unless advanced_search_view.entities.search.reset_filter()
  pytest.raises(NoSuchElementException) {
    advanced_search_view.entities.search.load_filter(saved_filter: test_provider_filter_save_cancel.filter_name)
  }
end
def test_provider_filter_save_and_load(rails_delete_filter, advanced_search_view)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  test_provider_filter_save_and_load.filter_name = fauxfactory.gen_alphanumeric()
  logger.debug("Set filter_name to: #{test_provider_filter_save_and_load.filter_name}")
  raise unless advanced_search_view.entities.search.save_filter("fill_count(Infrastructure Provider.VMs, >, 0)", test_provider_filter_save_and_load.filter_name)
  advanced_search_view.flash.assert_no_error()
  raise unless advanced_search_view.entities.search.reset_filter()
  raise unless advanced_search_view.entities.search.load_filter(test_provider_filter_save_and_load.filter_name)
  advanced_search_view.flash.assert_no_error()
end
def test_provider_filter_save_and_cancel_load(rails_delete_filter, advanced_search_view)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  test_provider_filter_save_and_cancel_load.filter_name = fauxfactory.gen_alphanumeric()
  logger.debug("Set filter_name to: {}".format(test_provider_filter_save_and_cancel_load.filter_name))
  raise unless advanced_search_view.entities.search.save_filter("fill_count(Infrastructure Provider.VMs, >, 0)", test_provider_filter_save_and_cancel_load.filter_name)
  advanced_search_view.flash.assert_no_error()
  raise unless advanced_search_view.entities.search.reset_filter()
  raise unless advanced_search_view.entities.search.load_filter(test_provider_filter_save_and_cancel_load.filter_name, cancel: true)
  advanced_search_view.flash.assert_no_error()
end
def test_provider_filter_save_and_cancel_load_with_user_input(rails_delete_filter, advanced_search_view)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  test_provider_filter_save_and_cancel_load_with_user_input.filter_name = fauxfactory.gen_alphanumeric()
  logger.debug("Set filter_name to: {}".format(test_provider_filter_save_and_cancel_load_with_user_input.filter_name))
  raise unless advanced_search_view.entities.search.save_filter("fill_count(Infrastructure Provider.VMs, >)", test_provider_filter_save_and_cancel_load_with_user_input.filter_name)
  advanced_search_view.flash.assert_no_error()
  raise unless advanced_search_view.entities.search.reset_filter()
  advanced_search_view.entities.search.load_filter(test_provider_filter_save_and_cancel_load_with_user_input.filter_name, fill_callback: {"COUNT" => 0}, cancel_on_user_filling: true, apply_filter: true)
  advanced_search_view.flash.assert_no_error()
end
def test_quick_search_without_provider_filter(request)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  view = navigate_to(InfraProvider, "All")
  request.addfinalizer(view.entities.search.clear_simple_search)
  view.entities.search.simple_search(fauxfactory.gen_alphanumeric())
  view.flash.assert_no_error()
end
def test_quick_search_with_provider_filter(request)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  view = navigate_to(InfraProvider, "All")
  view.entities.search.advanced_search("fill_count(Infrastructure Provider.VMs, >=, 0)")
  view.flash.assert_no_error()
  request.addfinalizer(view.entities.search.remove_search_filters)
  view.entities.search.simple_search(fauxfactory.gen_alphanumeric())
  view.flash.assert_no_error()
end
def test_can_delete_provider_filter(advanced_search_view)
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  filter_name = fauxfactory.gen_alphanumeric()
  logger.debug("Set filter_name to: #{filter_name}")
  raise unless advanced_search_view.entities.search.save_filter("fill_count(Infrastructure Provider.VMs, >, 0)", filter_name)
  advanced_search_view.flash.assert_no_error()
  advanced_search_view.entities.search.reset_filter()
  advanced_search_view.flash.assert_no_error()
  advanced_search_view.entities.search.load_filter(filter_name)
  advanced_search_view.flash.assert_no_error()
  if is_bool(!advanced_search_view.entities.search.delete_filter())
    raise pytest.fail, "Cannot delete filter! Probably the delete button is not present!"
  end
  advanced_search_view.flash.assert_no_error()
end
def test_delete_button_should_appear_after_save_provider(rails_delete_filter, advanced_search_view)
  # Delete button appears only after load, not after save
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  test_delete_button_should_appear_after_save_provider.filter_name = fauxfactory.gen_alphanumeric()
  advanced_search_view.entities.search.save_filter("fill_count(Infrastructure Provider.VMs, >, 0)", test_delete_button_should_appear_after_save_provider.filter_name)
  if is_bool(!advanced_search_view.entities.search.delete_filter())
    pytest.fail("Could not delete filter right after saving!")
  end
end
def test_cannot_delete_provider_filter_more_than_once(advanced_search_view)
  # When Delete button appars, it does not want to go away
  # 
  #   Polarion:
  #       assignee: gtalreja
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #   
  filter_name = fauxfactory.gen_alphanumeric()
  raise unless advanced_search_view.entities.search.save_filter("fill_count(Infrastructure Provider.VMs, >, 0)", filter_name)
  raise unless advanced_search_view.entities.search.load_filter(filter_name)
  if is_bool(!advanced_search_view.entities.search.delete_filter())
    pytest.fail("Could not delete the filter even first time!")
    advanced_search_view.flash.assert_no_error()
  end
  raise "Delete twice accepted!" unless !advanced_search_view.entities.search.delete_filter()
end
