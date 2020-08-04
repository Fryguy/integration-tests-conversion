require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _service_catalogs = service_catalogs.bind(this);
require_relative("cfme/services/service_catalogs");
include(Cfme.Services.Service_catalogs);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);

let pytestmark = [
  test_requirements.service,
  pytest.mark.meta({server_roles: "+automate"}),
  pytest.mark.usefixtures("uses_infra_providers"),
  pytest.mark.tier(2)
];

function catalog_item(appliance, dialog, catalog) {
  let item_name = fauxfactory.gen_alphanumeric(
    15,
    {start: "cat_item_"}
  );

  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.GENERIC,

    {
      name: item_name,
      description: "my catalog",
      display_in: true,
      catalog,
      dialog
    }
  );

  return catalog_item
};

function test_delete_catalog_deletes_service(appliance, dialog, catalog) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       tags: service
  //   
  let item_name = fauxfactory.gen_alphanumeric(
    15,
    {start: "cat_item_"}
  );

  let catalog_item = appliance.collections.catalog_items.create(
    appliance.collections.catalog_items.GENERIC,

    {
      name: item_name,
      description: "my catalog",
      display_in: true,
      catalog,
      dialog
    }
  );

  catalog.delete();

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog,
    catalog_item.name
  );

  pytest.raises(CandidateNotFound, () => service_catalogs.order())
};

function test_delete_catalog_item_deletes_service(appliance, catalog_item) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       tags: service
  //   
  catalog_item.delete();

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    catalog_item.name
  );

  pytest.raises(CandidateNotFound, () => service_catalogs.order())
};

function test_service_generic_catalog_bundle(appliance, catalog_item) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       tags: service
  //   
  let bundle_name = fauxfactory.gen_alphanumeric(
    12,
    {start: "generic_"}
  );

  appliance.collections.catalog_bundles.create(bundle_name, {
    description: "catalog_bundle",
    display_in: true,
    catalog: catalog_item.catalog,
    dialog: catalog_item.dialog,
    catalog_items: [catalog_item.name]
  });

  let service_catalogs = ServiceCatalogs(
    appliance,
    catalog_item.catalog,
    bundle_name
  );

  service_catalogs.order();

  logger.info(
    "Waiting for cfme provision request for service %s",
    bundle_name
  );

  let request_description = bundle_name;

  let provision_request = appliance.collections.requests.instantiate(
    request_description,
    {partial_check: true}
  );

  provision_request.wait_for_request();
  let msg = `Request failed with the message ${provision_request.rest.message}`;
  if (!provision_request.is_succeeded()) throw msg
};

function test_delete_dialog_before_parent_item(appliance, catalog_item) {
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       caseimportance: low
  //       initialEstimate: 1/8h
  //       tags: service
  //   
  let service_dialog = appliance.collections.service_dialogs;
  let dialog = service_dialog.instantiate({label: catalog_item.dialog.label});
  let error_message = "Dialog \"{}\": Error during delete: Dialog cannot be deleted because it is connected to other components.".format(catalog_item.dialog.label);

  pytest.raises(
    Exception,
    {match: error_message},
    () => dialog.delete()
  )
};

class TestServiceCatalogViaREST {
  service_catalogs(request, appliance) {
    return _service_catalogs(request, appliance)
  };

  test_delete_service_catalog(service_catalogs, method) {
    // Tests delete service catalog via rest.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: nansari
    //         caseimportance: low
    //         casecomponent: Services
    //         initialEstimate: 1/3h
    //         tags: service
    //     
    delete_resources_from_detail(service_catalogs, {method})
  };

  test_delete_service_catalogs(service_catalogs) {
    // Tests delete service catalogs via rest.
    // 
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: nansari
    //         caseimportance: low
    //         casecomponent: Services
    //         initialEstimate: 1/3h
    //         tags: service
    //     
    delete_resources_from_collection(service_catalogs)
  };

  test_edit_service_catalog(appliance, service_catalogs) {
    // Tests editing a service catalog via rest.
    //     Prerequisities:
    //         * An appliance with ``/api`` available.
    //     Steps:
    //         * POST /api/service_catalogs/<id>/ (method ``edit``) with the ``name``
    //         * Check if the service_catalog with ``new_name`` exists
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: nansari
    //         caseimportance: low
    //         casecomponent: Services
    //         initialEstimate: 1/3h
    //         tags: service
    //     
    for (let ctl in service_catalogs) {
      let new_name = fauxfactory.gen_alphanumeric();
      let response = ctl.action.edit({name: new_name});
      assert_response(appliance);
      if (response.name != new_name) throw new ();
      ctl.reload();
      if (ctl.name != new_name) throw new ()
    }
  };

  test_edit_multiple_service_catalogs(appliance, service_catalogs) {
    // Tests editing multiple service catalogs at time.
    //     Prerequisities:
    //         * An appliance with ``/api`` available.
    //     Steps:
    //         * POST /api/service_catalogs (method ``edit``)
    //             with the list of dictionaries used to edit
    //         * Check if the service_catalogs with ``new_name`` each exist
    //     Metadata:
    //         test_flag: rest
    // 
    //     Polarion:
    //         assignee: nansari
    //         caseimportance: low
    //         initialEstimate: 1/3h
    //         casecomponent: Services
    //         tags: service
    //     
    let new_names = [];
    let scls_data_edited = [];

    for (let scl in service_catalogs) {
      let new_name = fauxfactory.gen_alphanumeric();
      new_names.push(new_name);
      scls_data_edited.push({href: scl.href, name: new_name})
    };

    let response = appliance.rest_api.collections.service_catalogs.action.edit(...scls_data_edited);
    assert_response(appliance);
    if (response.size != new_names.size) throw new ();

    for (let [index, resource] in enumerate(response)) {
      if (resource.name != new_names[index]) throw new ();
      let scl = service_catalogs[index];
      scl.reload();
      if (scl.name != new_names[index]) throw new ()
    }
  }
};

function test_copy_catalog_bundle(appliance, request, generic_catalog_item) {
  // 
  //   Bugzilla:
  //       1678149
  // 
  //   Polarion:
  //       assignee: nansari
  //       casecomponent: Services
  //       initialEstimate: 1/16h
  //       startsin: 5.11
  //       testSteps:
  //           1. Create catalog and catalog item
  //           2. Create catalog bundle
  //           3. Make a copy of catalog bundle
  //       expectedResults:
  //           1.
  //           2.
  //           3. Able to copy catalog Bundle
  //   
  let bundle_name = fauxfactory.gen_alphanumeric(
    15,
    {start: "cat_bundle_"}
  );

  let catalog_bundle = appliance.collections.catalog_bundles.create(
    bundle_name,

    {
      description: "catalog_bundle",
      display_in: true,
      catalog: generic_catalog_item.catalog,
      dialog: generic_catalog_item.dialog,
      catalog_items: [generic_catalog_item.name]
    }
  );

  let new_cat_bundle = catalog_bundle.copy();
  request.addfinalizer(new_cat_bundle.delete_if_exists)
}
