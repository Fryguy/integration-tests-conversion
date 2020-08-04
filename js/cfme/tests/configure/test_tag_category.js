require_relative("cfme");
include(Cfme);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _categories = categories.bind(this);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

function custom_category(appliance) {
  let category = appliance.collections.categories.create({
    name: fauxfactory.gen_alphanumeric(8).downcase(),
    description: fauxfactory.gen_alphanumeric(32),
    display_name: fauxfactory.gen_alphanumeric(32)
  });

  yield(category);
  category.delete_if_exists()
};

function test_category_crud(appliance, soft_assert) {
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Configuration
  //       caseimportance: low
  //       initialEstimate: 1/15h
  //   
  let cg = appliance.collections.categories.create({
    name: fauxfactory.gen_alphanumeric(8).downcase(),
    description: fauxfactory.gen_alphanumeric(32),
    display_name: fauxfactory.gen_alphanumeric(32)
  });

  let view = appliance.browser.create_view(navigator.get_class(
    cg.parent,
    "All"
  ).VIEW);

  soft_assert.call(view.flash.assert_message(`Category \"${cg.display_name}\" was added`));
  update(cg, () => cg.description = fauxfactory.gen_alphanumeric(32));
  soft_assert.call(view.flash.assert_message(`Category \"${cg.name}\" was saved`));
  cg.delete();
  soft_assert.call(view.flash.assert_message(`Category \"${cg.name}\": Delete successful`))
};

function test_query_custom_category_via_api(appliance, custom_category) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Configuration
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       setup:
  //           1. Navigate to `Configuration` and select `Region`.
  //           2. Click on Tags and create a custom category.
  //       testSteps:
  //           1. GET all the categories via REST API
  //       expectedResults:
  //           1. Newly created custom category must be present in the list of categories
  //               returned by the response.
  // 
  //   Bugzilla:
  //       1650556
  //   
  let all_categories_name = appliance.rest_api.collections.categories.all.map(cat => (
    cat.name
  ));

  if (!all_categories_name.include(custom_category.name)) throw new ()
};

class TestCategoriesViaREST {
  categories(request, appliance) {
    let response = _categories(request, appliance, {num: 5});
    assert_response(appliance);
    if (response.size != 5) throw new ();
    return response
  };

  test_create_categories(appliance, categories) {
    // Tests creating categories.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    for (let ctg in categories) {
      let record = appliance.rest_api.collections.categories.get({id: ctg.id});
      assert_response(appliance);
      if (record.name != ctg.name) throw new ()
    }
  };

  test_edit_categories(appliance, categories, multiple) {
    let edited;

    // Tests editing categories.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/3h
    //     
    let collection = appliance.rest_api.collections.categories;
    let categories_len = categories.size;
    let new = [];

    for (let _ in categories_len.times) {
      new.push({description: fauxfactory.gen_alphanumeric(
        20,
        {start: "test_category_"}
      ).downcase()})
    };

    if (is_bool(multiple)) {
      for (let index in categories_len.times) {
        new[index].update(categories[index]._ref_repr())
      };

      edited = collection.action.edit(...new);
      assert_response(appliance)
    } else {
      edited = [];

      for (let index in categories_len.times) {
        edited.push(categories[index].action.edit({None: new[index]}));
        assert_response(appliance)
      }
    };

    if (categories_len != edited.size) throw new ();

    for (let index in categories_len.times) {
      let [record, _] = wait_for(
        () => collection.find_by({description: new[index].description}) || false,
        {num_sec: 180, delay: 10}
      );

      if (record[0].id != edited[index].id) throw new ();
      if (record[0].description != edited[index].description) throw new ()
    }
  };

  test_delete_categories_from_detail(categories, method) {
    // Tests deleting categories from detail.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_detail(categories, {method})
  };

  test_delete_categories_from_collection(categories) {
    // Tests deleting categories from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: low
    //         initialEstimate: 1/4h
    //     
    delete_resources_from_collection(categories, {not_found: true})
  }
}
