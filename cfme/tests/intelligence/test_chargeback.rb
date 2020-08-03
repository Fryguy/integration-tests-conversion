require_relative 'cfme'
include Cfme
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _rates rates
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(3), test_requirements.chargeback]
def random_per_time(**kw)
  kw[:per_time] = random.choice(["Hourly", "Daily", "Monthly", "Weekly", "Yearly"])
  return kw
end
FIXED_RATE = [{"fixed_rate" => "6000"}, {"fixed_rate" => ".1"}]
VARIABLE_RATE = [{"variable_rate" => "2000"}, {"variable_rate" => ".6"}]
def chargeback_rate(appliance, rate_resource, rate_type, rate_action)
  if !["fixed", "variable"].include?(rate_type)
    pytest.fail("Chargeback \"rate_type\" argument must be \"fixed\" or \"variable\"")
  end
  rate_values = (rate_type == "fixed") ? FIXED_RATE : VARIABLE_RATE
  rate_description = "cb_{rand}_{type}_{resource}_{action}".format(rand: fauxfactory.gen_alphanumeric(), type: rate_type, resource: rate_resource, action: rate_action)
  if rate_resource == "compute"
    rate = appliance.collections.compute_rates.create(description: rate_description, fields: {"Allocated CPU Count" => random_per_time(fixed_rate: "1000"), "Used Disk I/O" => random_per_time(fixed_rate: "10"), "Fixed Compute Cost 1" => random_per_time(fixed_rate: "100"), "Used Memory" => random_per_time(None: rate_values[0]), "Used CPU Cores" => random_per_time(None: rate_values[1])})
  else
    if rate_resource == "storage"
      rate = appliance.collections.storage_rates.create(description: rate_description, fields: {"Fixed Storage Cost 1" => random_per_time(fixed_rate: "100"), "Fixed Storage Cost 2" => random_per_time(fixed_rate: "300"), "Allocated Disk Storage" => random_per_time(None: rate_values[0]), "Used Disk Storage" => random_per_time(None: rate_values[1])})
    end
  end
  yield(rate)
  rate.delete_if_exists()
end
def test_chargeback_duplicate_disallowed(chargeback_rate, rate_resource, rate_type, rate_action, appliance)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #   
  cb_rate = chargeback_rate
  raise unless cb_rate.exists
  pytest.raises([RuntimeError, TimedOutError]) {
    if rate_resource == "compute"
      appliance.collections.compute_rates.create(description: cb_rate.description, fields: cb_rate.fields)
    else
      if rate_resource == "storage"
        appliance.collections.storage_rates.create(description: cb_rate.description, fields: cb_rate.fields)
      end
    end
  }
  view = cb_rate.create_view(navigator.get_class(cb_rate.parent, "Add").VIEW, wait: 10)
  view.flash.assert_message("Description has already been taken", t: "error")
  view.cancel_button.click()
  view = cb_rate.create_view(navigator.get_class(cb_rate.parent, "All").VIEW, wait: 10)
  view.flash.assert_success_message("Add of new Chargeback Rate was cancelled by the user")
end
def test_chargeback_rate(rate_resource, rate_type, rate_action, request, chargeback_rate)
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  #   
  cb_rate = chargeback_rate
  view = cb_rate.create_view(navigator.get_class(cb_rate.parent, "All").VIEW, wait: 10)
  view.flash.assert_success_message("Chargeback Rate \"#{cb_rate.description}\" was added")
  raise unless cb_rate.exists
  if rate_action == "delete"
    cb_rate.delete()
    view.flash.assert_success_message("Chargeback Rate \"#{cb_rate.description}\": Delete successful")
    raise unless !cb_rate.exists
  end
  if rate_action == "edit"
    update(cb_rate) {
      cb_rate.description = "#{cb_rate.description}_edited"
      if rate_resource == "compute"
        cb_rate.fields = {"Fixed Compute Cost 1" => random_per_time(fixed_rate: "500"), "Allocated CPU Count" => random_per_time(fixed_rate: "100")}
      else
        if rate_resource == "storage"
          cb_rate.fields = {"Fixed Storage Cost 1" => random_per_time(fixed_rate: "100"), "Fixed Storage Cost 2" => random_per_time(fixed_rate: "200")}
        end
      end
    }
    view = cb_rate.create_view(navigator.get_class(cb_rate, "Details").VIEW, wait: 10)
    view.flash.assert_success_message("Chargeback Rate \"#{cb_rate.description}\" was saved")
    raise unless cb_rate.exists
  end
end
class TestRatesViaREST
  def rates(request, appliance)
    response = _rates(request, appliance)
    assert_response(appliance)
    return response
  end
  def test_create_rates(appliance, rates)
    # Tests creating rates.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: tpapaioa
    #         casecomponent: CandU
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    for rate in rates
      record = appliance.rest_api.collections.rates.get(id: rate.id)
      assert_response(appliance)
      raise unless record.description == rate.description
    end
  end
  def test_edit_rates(appliance, rates, multiple)
    # Tests editing rates.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: tpapaioa
    #         casecomponent: CandU
    #         caseimportance: low
    #         initialEstimate: 1/3h
    #     
    new_descriptions = []
    if is_bool(multiple)
      rates_data_edited = []
      for rate in rates
        new_description = fauxfactory.gen_alphanumeric(15, start: "test_rate_").downcase()
        new_descriptions.push(new_description)
        rate.reload()
        rates_data_edited.push({"href" => rate.href, "description" => new_description})
      end
      edited = appliance.rest_api.collections.rates.action.edit(*rates_data_edited)
      assert_response(appliance)
    else
      edited = []
      for rate in rates
        new_description = fauxfactory.gen_alphanumeric(15, start: "test_rate_").downcase()
        new_descriptions.push(new_description)
        edited.push(rate.action.edit(description: new_description))
        assert_response(appliance)
      end
    end
    raise unless edited.size == rates.size
    for (index, rate) in enumerate(rates)
      record,_ = wait_for(lambda{|| appliance.rest_api.collections.rates.find_by(description: new_descriptions[index]) || false}, num_sec: 180, delay: 10)
      rate.reload()
      raise unless (rate.description == edited[index].description) and (edited[index].description == record[0].description)
    end
  end
  def test_delete_rates_from_detail(rates, method)
    # Tests deleting rates from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: tpapaioa
    #         casecomponent: CandU
    #         caseimportance: medium
    #         initialEstimate: 1/20h
    #     
    delete_resources_from_detail(rates, method: method)
  end
  def test_delete_rates_from_collection(rates)
    # Tests deleting rates from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: tpapaioa
    #         casecomponent: CandU
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_collection(rates)
  end
end
