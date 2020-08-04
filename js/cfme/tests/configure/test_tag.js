require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _categories = categories.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _service_templates = service_templates.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _tags = tags.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _tenants = tenants.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _users = users.bind(this);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _vm = vm.bind(this);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
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

const CLOUD_COLLECTION = [
  "availability_zones",
  "cloud_networks",
  "cloud_subnets",
  "flavors",
  "network_routers",
  "security_groups"
];

const INFRA_COLLECTION = [
  "clusters",
  "hosts",
  "data_stores",
  "providers",
  "resource_pools",
  "services",
  "service_templates",
  "tenants",
  "vms",
  "users"
];

let pytestmark = [
  pytest.mark.provider({classes: [InfraProvider], selector: ONE}),
  pytest.mark.usefixtures("setup_provider")
];

function category(appliance) {
  let cg = appliance.collections.categories.create({
    name: fauxfactory.gen_alphanumeric(8).downcase(),
    description: fauxfactory.gen_alphanumeric(32),
    display_name: fauxfactory.gen_alphanumeric(32)
  });

  yield(cg);
  if (is_bool(cg.exists)) cg.delete()
};

function tag(category) {
  let tag = category.collections.tags.create({
    name: fauxfactory.gen_alphanumeric(8).downcase(),
    display_name: fauxfactory.gen_alphanumeric(32)
  });

  yield(tag);
  tag.delete_if_exists()
};

function test_tag_crud(tag) {
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/8h
  //       casecomponent: Tagging
  //   
  if (!tag.exists) throw new ();

  tag.update({
    name: fauxfactory.gen_alphanumeric(8).downcase(),
    display_name: fauxfactory.gen_alphanumeric(32)
  })
};

function test_map_tagging_crud(appliance, category, soft_assert) {
  // Test map tag crud with flash message assertion
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/4h
  //       casecomponent: Tagging
  //   Bugzilla:
  //       1707328
  //   
  let label = fauxfactory.gen_alphanumeric(8);
  let map_tags_collection = appliance.collections.map_tags;

  let map_tag_entity = map_tags_collection.create(
    "Container Project",
    label,
    category.name
  );

  let view = appliance.browser.create_view(navigator.get_class(
    map_tags_collection,
    "All"
  ).VIEW);

  view.flash.assert_success_message("Container Label Tag Mapping \"{}\" was added".format(label));

  update(
    map_tag_entity,
    () => map_tag_entity.category = fauxfactory.gen_alphanumeric(8)
  );

  view = appliance.browser.create_view(navigator.get_class(
    map_tags_collection,
    "All"
  ).VIEW);

  view.flash.assert_success_message("Container Label Tag Mapping \"{}\" was saved".format(map_tag_entity.label));
  let row = view.table.rows({resource_label: map_tag_entity.label}) // next;
  soft_assert.call(row.tag_category.text == map_tag_entity.category);
  map_tag_entity.delete();

  view = appliance.browser.create_view(navigator.get_class(
    map_tags_collection,
    "All"
  ).VIEW);

  if (appliance.version >= "5.11") {
    view.flash.assert_success_message("Container Label Tag Mapping \"{}\": Delete successful".format(map_tag_entity.label))
  }
};

function test_updated_tag_name_on_vm(provider, tag, request) {
  // 
  //   This test checks that tags don't disappear from the UI after their name (not displayed name) is
  //   changed.
  // 
  //   Bugzilla:
  //       1668730
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Configuration
  //       caseimportance: high
  //       initialEstimate: 1/8h
  //       testSteps:
  //           1. create a tag
  //           2. assign the tag to some vm, observe the tag in Smart Management section of vm
  //           3. change name of the tag
  //           4. on VM screen: still the same tag in Smart Management section of vm
  //   
  let coll = provider.appliance.provider_based_collection(
    provider,
    {coll_type: "vms"}
  );

  let vm = coll.all()[0];
  vm.add_tag(tag);
  request.addfinalizer(() => vm.remove_tag(tag));
  let vm_tags = vm.get_tags();

  if (!vm_tags.map(vm_tag => (
    tag.category.display_name == vm_tag.category.display_name && tag.display_name == vm_tag.display_name
  )).is_any) throw "tag is not assigned";

  let new_tag_name = "{}_{}".format(
    tag.name,
    fauxfactory.gen_alphanumeric(4).downcase()
  );

  tag.update({name: new_tag_name});
  vm_tags = vm.get_tags();

  if (!vm_tags.map(vm_tag => (
    tag.category.display_name == vm_tag.category.display_name && tag.display_name == vm_tag.display_name
  )).is_any) throw "tag is not assigned"
};

class TestTagsViaREST {
  #COLLECTIONS_BULK_TAGS;
  static #COLLECTIONS_BULK_TAGS = ["services", "vms", "users"];

  _service_body(kwargs, { ...kwargs }) {
    let uid = fauxfactory.gen_alphanumeric(5);

    let body = {
      name: `test_rest_service_${uid}`,
      description: `Test REST Service ${uid}`
    };

    body.update(kwargs);
    return body
  };

  _create_services(request, rest_api, { num = 3 }) {
    let bodies = num.times.map(__ => this._service_body());
    let collection = rest_api.collections.services;
    let new_services = collection.action.create(...bodies);
    assert_response(rest_api);
    let new_services_backup = new_services.to_a;

    let _finished = () => {
      collection.reload();
      let ids = new_services_backup.map(service => service.id);

      let delete_entities = collection.select(service => ids.include(service.id)).map(service => (
        service
      ));

      if (is_bool(delete_entities)) {
        return collection.action.delete(...delete_entities)
      }
    };

    return new_services
  };

  services(request, appliance) {
    return this._create_services(request, appliance.rest_api)
  };

  categories(request, appliance, { num = 3 }) {
    return _categories(request, appliance, num)
  };

  tags(request, appliance, categories) {
    return _tags(request, appliance, categories)
  };

  services_mod(request, appliance) {
    return this._create_services(request, appliance.rest_api)
  };

  categories_mod(request, appliance, { num = 3 }) {
    return _categories(request, appliance, num)
  };

  tags_mod(request, appliance, categories_mod) {
    return _tags(request, appliance, categories_mod)
  };

  tenants(request, appliance) {
    return _tenants(request, appliance, {num: 1})
  };

  service_templates(request, appliance) {
    return _service_templates(request, appliance)
  };

  vm(request, provider, appliance) {
    return _vm(request, provider, appliance)
  };

  users(request, appliance, { num = 3 }) {
    return _users(request, appliance, {num})
  };

  test_edit_tags_rest(appliance, tags) {
    // Tests tags editing from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: high
    //         initialEstimate: 1/6h
    //     
    let collection = appliance.rest_api.collections.tags;
    let tags_len = tags.size;
    let tags_data_edited = [];

    for (let tag in tags) {
      tags_data_edited.push({
        href: tag.href,
        name: fauxfactory.gen_alphanumeric(15, {start: "test_tag_"}).downcase()
      })
    };

    let edited = collection.action.edit(...tags_data_edited);
    assert_response(appliance, {results_num: tags_len});

    for (let index in tags_len.times) {
      let [record, _] = wait_for(
        () => (
          (collection.find_by({name: ("%/{}").format(tags_data_edited[index].name)})) || false
        ),

        {num_sec: 180, delay: 10}
      );

      if (record[0].id != edited[index].id) throw new ();
      if (record[0].name != edited[index].name) throw new ()
    }
  };

  test_edit_tag_from_detail(appliance, tags) {
    // Tests tag editing from detail.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: high
    //         initialEstimate: 1/30h
    //     
    let edited = [];
    let new_names = [];

    for (let tag in tags) {
      let new_name = fauxfactory.gen_alphanumeric(15, {start: "test_tag_"});
      new_names.push(new_name);
      edited.push(tag.action.edit({name: new_name}));
      assert_response(appliance)
    };

    for (let [index, name] in enumerate(new_names)) {
      let [record, _] = wait_for(
        () => (
          (appliance.rest_api.collections.tags.find_by({name: `%/${name}`})) || false
        ),

        {num_sec: 180, delay: 10}
      );

      if (record[0].id != edited[index].id) throw new ();
      if (record[0].name != edited[index].name) throw new ()
    }
  };

  test_delete_tags_from_detail(tags, method) {
    // Tests deleting tags from detail.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: high
    //         initialEstimate: 1/30h
    //     
    delete_resources_from_detail(tags, {method})
  };

  test_delete_tags_from_collection(tags) {
    // Tests deleting tags from collection.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: high
    //         initialEstimate: 1/30h
    //     
    delete_resources_from_collection(tags, {not_found: true})
  };

  test_create_tag_with_wrong_arguments(appliance) {
    // Tests creating tags with missing category \"id\", \"href\" or \"name\".
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: high
    //         initialEstimate: 1/30h
    //     
    let data = {
      name: fauxfactory.gen_alphanumeric(15, {start: "test_tag_"}).downcase(),

      description: fauxfactory.gen_alphanumeric(
        20,
        {start: "test_tag_desc_"}
      ).downcase()
    };

    let msg = "BadRequestError: Category id, href or name needs to be specified";

    pytest.raises(
      Exception,
      {match: msg},
      () => appliance.rest_api.collections.tags.action.create(data)
    );

    assert_response(appliance, {http_status: 400})
  };

  test_assign_and_unassign_tag(appliance, tags_mod, provider, services_mod, service_templates, tenants, vm, collection_name, users) {
    // Tests assigning and unassigning tags.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: high
    //         initialEstimate: 1/5h
    //     
    let collection = appliance.rest_api.collections.getattr(collection_name);
    collection.reload();

    if (is_bool(!collection.all)) {
      pytest.skip(`No available entity in ${collection_name} to assign tag`)
    };

    let entity = collection[-1];
    let tag = tags_mod[0];

    try {
      entity.tags.action.assign(tag)
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NoMethodError) {
        let msg = "Missing tag attribute in parametrized REST collection {} for entity: {}".format(
          collection_name,
          entity
        );

        logger.exception(msg);
        pytest.fail(msg)
      } else {
        throw $EXCEPTION
      }
    };

    assert_response(appliance);
    entity.reload();
    if (!entity.tags.all.map(t => t.id).include(tag.id)) throw new ();
    entity.tags.action.unassign(tag);
    assert_response(appliance);
    entity.reload();
    if (!!entity.tags.all.map(t => t.id).include(tag.id)) throw new ()
  };

  test_bulk_assign_and_unassign_tag(appliance, tags_mod, services_mod, vm, collection_name, users) {
    // Tests bulk assigning and unassigning tags.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: high
    //         initialEstimate: 1/5h
    //     
    let collection = appliance.rest_api.collections.getattr(collection_name);
    collection.reload();
    let entities = collection.all[_.range(-2, 0)];
    let new_tags = [];

    for (let [index, tag] in enumerate(tags_mod)) {
      let identifiers = [{href: tag._href}, {id: tag.id}];
      new_tags.push(identifiers[index % 2])
    };

    new_tags.push({category: "department", name: "finance"});
    new_tags.push({name: "/managed/department/presales"});
    let tags_ids = tags_mod.map(t => t.id).to_set;
    tags_ids.add((appliance.rest_api.collections.tags.get({name: "/managed/department/finance"})).id);
    tags_ids.add((appliance.rest_api.collections.tags.get({name: "/managed/department/presales"})).id);
    let tags_count = new_tags.size * entities.size;

    let response = collection.action.assign_tags(
      ...entities,
      {tags: new_tags}
    );

    assert_response(appliance, {results_num: tags_count});
    let results = appliance.rest_api.response.json().results;
    let entities_hrefs = entities.map(e => e.href);

    for (let result in results) {
      if (!entities_hrefs.include(result.href)) throw new ()
    };

    for (let [index, entity] in enumerate(entities)) {
      entity.tags.reload();
      response[index].id = entity.id;
      if (!tags_ids.issubset(entity.tags.all.map(t => t.id).to_set)) throw new ()
    };

    collection.action.unassign_tags(...entities, {tags: new_tags});
    assert_response(appliance, {results_num: tags_count});

    for (let entity in entities) {
      entity.tags.reload();

      if ((entity.tags.all.map(t => t.id).to_set - tags_ids).size != entity.tags.subcount) {
        throw new ()
      }
    }
  };

  test_bulk_assign_and_unassign_invalid_tag(appliance, services_mod, vm, collection_name, users) {
    // Tests bulk assigning and unassigning invalid tags.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: high
    //         initialEstimate: 1/5h
    //     
    let collection = appliance.rest_api.collections.getattr(collection_name);
    collection.reload();
    let entities = collection.all[_.range(-2, 0)];
    let new_tags = ["invalid_tag1", "invalid_tag2"];
    let tags_count = new_tags.size * entities.size;
    let tags_per_entities_count = [];

    for (let entity in entities) {
      entity.tags.reload();
      tags_per_entities_count.push(entity.tags.subcount)
    };

    let _check_tags_counts = () => {
      for (let [index, entity] in enumerate(entities)) {
        entity.tags.reload();
        if (entity.tags.subcount != tags_per_entities_count[index]) throw new ()
      }
    };

    collection.action.assign_tags(...entities, {tags: new_tags});
    assert_response(appliance, {success: false, results_num: tags_count});
    _check_tags_counts.call();
    collection.action.unassign_tags(...entities, {tags: new_tags});
    assert_response(appliance, {success: false, results_num: tags_count});
    _check_tags_counts.call()
  };

  test_query_by_multiple_tags(appliance, tags, services) {
    // Tests support for multiple tag specification in query.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: pvala
    //         casecomponent: Configuration
    //         caseimportance: high
    //         initialEstimate: 1/30h
    //     
    let collection = appliance.rest_api.collections.services;
    collection.reload();
    let new_tags = tags.map(tag => tag._ref_repr());
    let tagged_services = services[_.range(1, 0)];
    collection.action.assign_tags(...tagged_services, {tags: new_tags});
    assert_response(appliance);
    let by_tag = tags.map(tag => tag.name.gsub("/managed", "")).join(",");
    let query_results = collection.query_string({by_tag});
    if (tagged_services.size != query_results.size) throw new ();
    let result_ids = query_results.map(item => item.id).to_set;
    let tagged_ids = tagged_services.map(item => item.id).to_set;
    if (result_ids != tagged_ids) throw new ()
  };

  static get COLLECTIONS_BULK_TAGS() {
    return TestTagsViaREST.#COLLECTIONS_BULK_TAGS
  };

  static set COLLECTIONS_BULK_TAGS(val) {
    TestTagsViaREST.#COLLECTIONS_BULK_TAGS = val
  };

  get COLLECTIONS_BULK_TAGS() {
    if (this.#COLLECTIONS_BULK_TAGS.nil) {
      this.#COLLECTIONS_BULK_TAGS = TestTagsViaREST.#COLLECTIONS_BULK_TAGS
    };

    return this.#COLLECTIONS_BULK_TAGS
  };

  set COLLECTIONS_BULK_TAGS(val) {
    this.#COLLECTIONS_BULK_TAGS = val
  }
}
