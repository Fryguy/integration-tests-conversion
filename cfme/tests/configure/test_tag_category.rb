require_relative 'cfme'
include Cfme
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _categories categories
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
def custom_category(appliance)
  category = appliance.collections.categories.create(name: fauxfactory.gen_alphanumeric(8).downcase(), description: fauxfactory.gen_alphanumeric(32), display_name: fauxfactory.gen_alphanumeric(32))
  yield category
  category.delete_if_exists()
end
def test_category_crud(appliance, soft_assert)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Configuration
  #       caseimportance: low
  #       initialEstimate: 1/15h
  #   
  cg = appliance.collections.categories.create(name: fauxfactory.gen_alphanumeric(8).downcase(), description: fauxfactory.gen_alphanumeric(32), display_name: fauxfactory.gen_alphanumeric(32))
  view = appliance.browser.create_view(navigator.get_class(cg.parent, "All").VIEW)
  soft_assert.(view.flash.assert_message())
  update(cg) {
    cg.description = fauxfactory.gen_alphanumeric(32)
  }
  soft_assert.(view.flash.assert_message())
  cg.delete()
  soft_assert.(view.flash.assert_message())
end
def test_query_custom_category_via_api(appliance, custom_category)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #       setup:
  #           1. Navigate to `Configuration` and select `Region`.
  #           2. Click on Tags and create a custom category.
  #       testSteps:
  #           1. GET all the categories via REST API
  #       expectedResults:
  #           1. Newly created custom category must be present in the list of categories
  #               returned by the response.
  # 
  #   Bugzilla:
  #       1650556
  #   
  all_categories_name = appliance.rest_api.collections.categories.all.map{|cat| cat.name}
  raise unless all_categories_name.include?(custom_category.name)
end
class TestCategoriesViaREST
  def categories(request, appliance)
    response = _categories(request, appliance, num: 5)
    assert_response(appliance)
    raise unless response.size == 5
    return response
  end
  def test_create_categories(appliance, categories)
    # Tests creating categories.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    for ctg in categories
      record = appliance.rest_api.collections.categories.get(id: ctg.id)
      assert_response(appliance)
      raise unless record.name == ctg.name
    end
  end
  def test_edit_categories(appliance, categories, multiple)
    # Tests editing categories.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/3h
    #     
    collection = appliance.rest_api.collections.categories
    categories_len = categories.size
    new = []
    for _ in categories_len.times
      new.push({"description" => fauxfactory.gen_alphanumeric(20, start: "test_category_").downcase()})
    end
    if is_bool(multiple)
      for index in categories_len.times
        new[index].update(categories[index]._ref_repr())
      end
      edited = collection.action.edit(*new)
      assert_response(appliance)
    else
      edited = []
      for index in categories_len.times
        edited.push(categories[index].action.edit(None: new[index]))
        assert_response(appliance)
      end
    end
    raise unless categories_len == edited.size
    for index in categories_len.times
      record,_ = wait_for(lambda{|| collection.find_by(description: new[index]["description"]) || false}, num_sec: 180, delay: 10)
      raise unless record[0].id == edited[index].id
      raise unless record[0].description == edited[index].description
    end
  end
  def test_delete_categories_from_detail(categories, method)
    # Tests deleting categories from detail.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_detail(categories, method: method)
  end
  def test_delete_categories_from_collection(categories)
    # Tests deleting categories from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Configuration
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    delete_resources_from_collection(categories, not_found: true)
  end
end
