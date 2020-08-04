require_relative("cfme");
include(Cfme);
require_relative("cfme/cloud/provider/openstack");
include(Cfme.Cloud.Provider.Openstack);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(3),
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.provider([OpenStackProvider], {scope: "module"})
];

function storage_object(appliance, provider) {
  let collection = appliance.collections.object_store_objects.filter({provider: provider});
  let objs = collection.all();

  if (is_bool(!objs)) {
    let cont_key = fauxfactory.gen_alpha({start: "cont_"});
    provider.mgmt.create_container(cont_key);
    let temp_file = tempfile.NamedTemporaryFile({suffix: ".pdf"});

    let obj = collection.instantiate({
      key: fauxfactory.gen_alpha({start: "obj_"}),
      provider
    });

    provider.mgmt.create_object({
      container_name: cont_key,
      path: temp_file.name,
      object_name: obj.key
    });

    collection.manager.refresh();

    wait_for(
      () => obj.exists,
      {delay: 30, timeout: 1200, fail_func: provider.browser.refresh}
    );

    return obj
  } else {
    return objs[0]
  }
};

function test_storage_object_store_object_add_remove_tag(storage_object) {
  // 
  //   Requires:
  //       OpenstackProvider
  // 
  //   Polarion:
  //       assignee: anikifor
  //       casecomponent: Cloud
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       startsin: 5.8
  //       testSteps:
  //           1. Navigate to Object Store Object [Storage > Object Storage > Object
  //           Store Objects]
  //           2. go to summery pages of any object
  //           3. add tag : [Policy > Edit Tags]
  //           4. remove tag: [Policy > Edit Tags]
  //       expectedResults:
  //           1.
  //           2.
  //           3. Verify the tag is assigned
  //           4. Verify the tag is removed
  //   
  let added_tag = storage_object.add_tag();
  let tag_available = storage_object.get_tags();
  if (tag_available[0].display_name != added_tag.display_name) throw new ();

  if (tag_available[0].category.display_name != added_tag.category.display_name) {
    throw new ()
  };

  storage_object.remove_tag(added_tag);
  tag_available = storage_object.get_tags();
  if (!!tag_available) throw new ()
}
