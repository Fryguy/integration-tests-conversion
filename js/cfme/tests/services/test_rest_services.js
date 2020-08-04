// pass
// Makes sure there are no carts present before running the tests.
// 
//   `allow_api_service_ordering` is set to True by default, which allows ordering services
//   via API. This fixture sets that value to False, so services cannot be ordered via API.
//   
// Tests access to service attributes.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/30h
//         tags: service
//     
// Tests editing a service.
//     Prerequisities:
//         * An appliance with ``/api`` available.
//     Steps:
//         * POST /api/services (method ``edit``) with the ``name``
//         * Check if the service with ``new_name`` exists
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/3h
//         tags: service
//     
// Tests editing multiple services at a time.
//     Prerequisities:
//         * An appliance with ``/api`` available.
//     Steps:
//         * POST /api/services (method ``edit``) with the list of dictionaries used to edit
//         * Check if the services with ``new_name`` each exists
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/3h
//         tags: service
//     
// Tests deleting services from detail using POST method.
// 
//     Metadata:
//         test_flag: rest
// 
//     Bugzilla:
//         1414852
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests deleting services from detail using DELETE method.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests deleting services from collection.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/3h
//         tags: service
//     
// Test retiring a service now.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Test retiring a service in future.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/3h
//         tags: service
//     
// Test retiring a service with old method `retire` and new method `request_retire`.
//     Old method is no longer supported and it puts the service into `intializing` state.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         initialEstimate: 1/4h
// 
//     Bugzilla:
//         1698480
//         1713477
//     
// Tests set_ownership action on /api/services/:id.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests set_ownership action on /api/services collection.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests power operations on /api/services and /api/services/:id.
// 
//     * start, stop and suspend actions
//     * transition from one power state to another
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests /api/services/:id/vms.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests adding resource to service.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests removing resource from service.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests removing all resources from service.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests creation of new service that reference existing service.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests that when parent service is deleted, child service is deleted automatically.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests adding parent reference to already existing service.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests adding parent reference to already existing service using add_resource.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests that power operations triggered on service parent affects child service.
// 
//     * start, stop and suspend actions
//     * transition from one power state to another
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests that child service is retired together with a parent service.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests access to service dialog attributes.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests that the full dialog is returned as part of the API response on create.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests editing service dialog using the REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests deleting service dialogs from detail.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests deleting service dialogs from collection.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests access to service template attributes.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests creation of service templates.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests editing a service template.
//     Prerequisities:
//         * An appliance with ``/api`` available.
//     Steps:
//         * POST /api/service_templates (method ``edit``) with the ``name``
//         * Check if the service_template with ``new_name`` exists
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests deleting service templates from collection.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests deleting service templates from detail using POST method.
// 
//     Metadata:
//         test_flag: rest
// 
//     Bugzilla:
//         1427338
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests deleting service templates from detail using DELETE method.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests assigning and unassigning the service templates to service catalog.
//     Prerequisities:
//         * An appliance with ``/api`` available.
//     Steps:
//         * POST /api/service_catalogs/<id>/service_templates (method ``assign``)
//             with the list of dictionaries service templates list
//         * Check if the service_templates were assigned to the service catalog
//         * POST /api/service_catalogs/<id>/service_templates (method ``unassign``)
//             with the list of dictionaries service templates list
//         * Check if the service_templates were unassigned to the service catalog
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests editing multiple service templates at time.
// 
//     Prerequisities:
//         * An appliance with ``/api`` available.
//     Steps:
//         * POST /api/service_templates (method ``edit``)
//             with the list of dictionaries used to edit
//         * Check if the service_templates with ``new_name`` each exists
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests access to service catalog attributes.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests editing catalog items using the REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests ordering single catalog item using the REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests ordering multiple catalog items using the REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests ordering catalog bundle using the REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests delete service catalogs from detail using REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests delete service catalogs from detail using REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Creates new domain and copy instance from ManageIQ to this domain.
// Modifies the instance in new domain to change it to manual approval instead of auto.
// pass
// Tests access to service request attributes.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests creating pending service request using the REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests deleting pending service request from detail using the REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests deleting pending service request from detail using the REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests ordering single catalog item with manual approval using the REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests ordering single catalog item with manual denial using the REST API.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests ordering a catalog item using the REST API as a non-admin user.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests access to orchestration templates attributes.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests creation of orchestration templates.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests deleting orchestration templates from collection.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests deleting orchestration templates from detail using POST method.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests deleting orchestration templates from detail using DELETE method.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests editing of orchestration templates.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests copying of orchestration templates.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests copying of orchestration templates without changing content.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests that template creation fails gracefully when invalid type is specified.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests access to cart attributes.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: pvala
//         casecomponent: Services
//         caseimportance: medium
//         initialEstimate: 1/4h
//     
// Tests creating an empty cart.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests that it's not possible to create second cart.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests creating a cart with service requests.
// 
//     Metadata:
//         test_flag: rest
// 
//     Bugzilla:
//         1493785
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests adding service requests to a cart.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests that deleting service requests removes them also from a cart.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests removing service requests from a cart.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests removing all service requests from a cart.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests that it's not possible to copy a cart.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests ordering service requests in a cart.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests deleting cart from detail.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
// Tests deleting cart from collection.
// 
//     Metadata:
//         test_flag: rest
// 
//     Polarion:
//         assignee: nansari
//         casecomponent: Rest
//         initialEstimate: 1/4h
//         tags: service
//     
function test_deny_service_ordering_via_api(appliance, deny_service_ordering, service_templates) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Services
  //       caseimportance: high
  //       initialEstimate: 1/10h
  //       setup:
  //           1. In advanced settings, update `:product:`-`:allow_api_service_ordering:` to `false`
  //           2. Create a dialog, catalog and catalog item.
  //       testSteps:
  //           1. Order the service via API.
  //       expectedResults:
  //           1. Service must not be ordered and response must return error.
  // 
  //   Bugzilla:
  //       1632416
  //   
  let template = service_templates[0];
  pytest.raises(APIException, () => template.action.order());
  assert_response(appliance, {http_status: 400})
};

function set_run_automate_method(appliance) {
  let reset_setting = appliance.advanced_settings.product.run_automate_methods_on_service_api_submit;
  appliance.update_advanced_settings({product: {run_automate_methods_on_service_api_submit: true}});
  yield;
  appliance.update_advanced_settings({product: {run_automate_methods_on_service_api_submit: reset_setting}})
};

function automate_env_setup(klass) {
  let script = `
    dialog_field = $evm.object
    dialog_field[\"sort_by\"] = \"value\"
    dialog_field[\"sort_order\"] = \"ascending\"
    dialog_field[\"data_type\"] = \"integer\"
    dialog_field[\"required\"] = \"true\"
    dialog_field[\"default_value\"] = 7
    dialog_field[\"values\"] = {1 => \"one\", 2 => \"two\", 10 => \"ten\", 7 => \"seven\", 50 => \"fifty\"}
    `;

  let method = klass.methods.create({
    name: fauxfactory.gen_alphanumeric({start: "meth_"}),
    display_name: fauxfactory.gen_alphanumeric({start: "meth_"}),
    location: "inline",
    script
  });

  klass.schema.add_fields({
    name: "meth",
    type: "Method",
    data_type: "Integer"
  });

  let instance = klass.instances.create({
    name: fauxfactory.gen_alphanumeric({start: "inst_"}),
    display_name: fauxfactory.gen_alphanumeric({start: "inst_"}),
    description: fauxfactory.gen_alphanumeric(),
    fields: {meth: {value: method.name}}
  });

  yield(instance);
  method.delete();
  instance.delete()
};

function get_service_template(appliance, request, automate_env_setup) {
  let instance = automate_env_setup;

  let data = {
    buttons: "submit, cancel",
    label: fauxfactory.gen_alpha(12, {start: "dialog_"}),

    dialog_tabs: [{
      display: "edit",
      label: "Basic Information",
      position: 0,

      dialog_groups: [{
        display: "edit",
        label: "New section",
        position: 0,

        dialog_fields: [
          {
            name: "static",
            data_type: "integer",
            display: "edit",
            required: true,
            default_value: "2",
            values: [["1", "One"], ["2", "Two"], ["3", "Three"]],
            label: "Static Dropdown",
            position: 0,
            dynamic: false,
            read_only: true,
            type: "DialogFieldDropDownList",
            resource_action: {resource_type: "DialogField"}
          },

          {
            name: "dynamic",
            data_type: "integer",
            display: "edit",
            required: true,
            default_value: "",
            label: "Dynamic Dropdown",
            position: 1,
            dynamic: true,
            read_only: true,
            type: "DialogFieldDropDownList",

            resource_action: {
              resource_type: "DialogField",
              ae_namespace: instance.namespace.name,
              ae_class: instance.klass.name,
              ae_instance: instance.name
            }
          }
        ]
      }]
    }]
  };

  let service_dialog = appliance.rest_api.collections.service_dialogs.action.create({None: data})[0];
  let service_catalog = _service_catalogs(request, appliance, {num: 1})[0];

  let service_template = _service_templates(
    request,
    appliance,
    {service_dialog, service_catalog}
  )[0];

  yield(service_template);
  service_template.action.delete();
  service_catalog.action.delete();
  service_dialog.action.delete()
};

function test_populate_default_dialog_values(appliance, request, auth_type, set_run_automate_method, get_service_template) {
  let template;

  // 
  //   This test case checks if the default value set for static and dynamic elements are returned
  //   when ordering service via API with both basic and token based authentication.
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Services
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //       setup:
  //           1. Update appliance advanced settings by setting
  //               `run_automate_methods_on_service_api_submit` to `true`.
  //           2. Create a new domain, namespace, klass, method, schema, and instance.
  //               (Method is attached in the Bugzilla 1639413).
  //               This method sets value 7 for dynamic element
  //           3. Create a Dialog with one static element(name=\"static\") with some default value,
  //               and one dynamic element(name=\"dynamic\") with the endpoint pointing to
  //               the newly created instance which returns a default value.
  //               (value_type=\"Integer\", read_only=True, required=True)
  //           4. Create a catalog and create a generic catalog item assigned to it.
  //       testSteps:
  //           1. Order the catalog item with the given auth_type
  //               and check if the response contains default values that were initially set.
  //       expectedResults:
  //           1. Response must include default values that were initially set.
  // 
  //   Bugzilla:
  //       1635673
  //       1650252
  //       1639413
  //       1660237
  //   
  if (auth_type == "token") {
    let auth_token = appliance.rest_api.get(appliance.url_path("/api/auth"));
    assert_response(appliance);
    let api = appliance.new_rest_api_instance({auth: {token: auth_token.auth_token}});
    template = api.collections.service_templates.get({id: get_service_template.id})
  } else {
    template = get_service_template
  };

  let response = template.action.order();
  assert_response(appliance);
  if (response.options.dialog.dialog_static != 2) throw new ();
  if (response.options.dialog.dialog_dynamic != 7) throw new ()
};

function request_task(appliance, service_templates) {
  let service_request = service_templates[0].action.order();
  assert_response(appliance);

  wait_for(
    () => service_request.request_state == "finished",
    {fail_func: service_request.reload, num_sec: 200, delay: 5}
  );

  let service_template_name = service_templates[0].name;

  return (service_request.request_tasks.filter(Q(
    "description",
    "=",
    `Provisioning [${service_template_name}] for Service [${service_template_name}]*`
  ))).resources[0]
};

function test_edit_service_request_task(appliance, request_task) {
  // 
  //       Polarion:
  //       assignee: pvala
  //       caseimportance: medium
  //       casecomponent: Rest
  //       initialEstimate: 1/4h
  //       setup:
  //           1. Create a service request.
  //       testSteps:
  //           1. Edit the service request task:
  //               POST /api/service_requests/:id/request_tasks/:request_task_id
  //               {
    //               \"action\" : \"edit\",
    //               \"resource\" : {
      //                   \"options\" : {
        //                   \"request_param_a\" : \"value_a\",
        //                   \"request_param_b\" : \"value_b\"
        //                   }
        //               }
        //       expectedResults:
        //           1. Task must be edited successfully.
        // 
        //   
        request_task.action.edit({options: {
          request_param_a: "value_a",
          request_param_b: "value_b"
        }});

        assert_response(appliance);
        request_task.reload();
        if (request_task.options.request_param_a != "value_a") throw new ();
        if (request_task.options.request_param_b != "value_b") throw new ()
      };

      function test_embedded_ansible_cat_item_edit_rest(appliance, request, ansible_catalog_item) {
        // 
        //   Bugzilla:
        //       1716847
        //       1732117
        // 
        //   Polarion:
        //       assignee: pvala
        //       casecomponent: Rest
        //       initialEstimate: 1/4h
        //       setup:
        //           1. Create an Ansible Playbook Catalog Item
        //       testSteps:
        //           1. Edit the Catalog Item via REST and check if it is updated.
        //   
        let service_template = appliance.rest_api.collections.service_templates.get({name: ansible_catalog_item.name});

        let new_data = {
          name: fauxfactory.gen_alphanumeric(),
          description: fauxfactory.gen_alphanumeric()
        };

        service_template.action.edit({None: new_data});
        assert_response(appliance);
        service_template.reload();
        if (service_template.name != new_data.name) throw new ();
        if (service_template.description != new_data.description) throw new ()
      };

      function test_service_refresh_dialog_fields_default_values(appliance, request, file_name, import_dialog, soft_assert) {
        // 
        //   Bugzilla:
        //       1730813
        //       1731977
        // 
        //   Polarion:
        //       assignee: pvala
        //       caseimportance: high
        //       casecomponent: Rest
        //       initialEstimate: 1/4h
        //       setup:
        //           1. Import dialog `RTP Testgear Client Provision` from the BZ attachments and create
        //               a service_template and service catalog to attach it.
        //       testSteps:
        //           1. Perform action `refresh_dialog_fields` by sending a request
        //               POST /api/service_catalogs/<:id>/sevice_templates/<:id>
        //                   {
          //                   \"action\": \"refresh_dialog_fields\",
          //                   \"resource\": {
            //                       \"fields\": [
              //                           \"tag_1_region\",
              //                           \"tag_0_function\"
              //                           ]
              //                       }
              //                   }
              //       expectedResults:
              //           1. Request must be successful and evm must have the default values
              //               for the fields mentioned in testStep 1.
              //   
              let [dialog, _] = import_dialog;

              let service_template = _service_templates(
                request,
                appliance,
                {service_dialog: dialog.rest_api_entity, num: 1}
              )[0];

              let service_catalog = appliance.rest_api.collections.service_catalogs.get({id: service_template.service_template_catalog_id});

              service_catalog.service_templates.get({id: service_template.id}).action.refresh_dialog_fields({None: {fields: [
                "tag_1_region",
                "tag_0_function"
              ]}});

              assert_response(appliance);
              let response = appliance.rest_api.response.json().result;
              let expected_tag_1_region = [["rtp", "rtp-vaas-vc.cisco.com"]];
              let expected_tag_0_function = [["ixia", "IXIA"]];

              soft_assert.call(
                expected_tag_1_region == response.tag_1_region.values,
                "Default values for 'tag_1_region' did not match."
              );

              soft_assert.call(
                expected_tag_0_function == response.tag_0_function.values,
                "Default values for 'tag_0_function' did not match."
              )
            };

            function test_crud_service_template_with_picture(appliance, request, service_catalog_obj, dialog) {
              // 
              //   Bugzilla:
              //       1702479
              //       1683723
              // 
              //   Polarion:
              //       assignee: pvala
              //       casecomponent: Rest
              //       initialEstimate: 1/4h
              //       setup:
              //           1. Create a service catalog and service dialog.
              //       testSteps:
              //           1. Create a service template via REST with picture.
              //           2. Note the picture md5 by querying `picture` attribute of the service template.
              //           3. Edit the service template via REST for a different picture.
              //           4. Note the picture md5 by querying `picture` attribute of the service template.
              //           5. Compare both the md5 from testStep 2 and 4.
              //       expectedResults:
              //           1. Service template created successfully without any error.
              //           2.
              //           3. Service template edited successfully without any error.
              //           4.
              //           5. Both the md5 values must be different.
              //   
              let data = {
                name: fauxfactory.gen_alpha({start: "Name_"}),
                prov_type: "generic",
                service_template_catalog_id: service_catalog_obj.rest_api_entity.id,

                config_info: {
                  retirement: {
                    fqname: "/Service/Retirement/StateMachines/ServiceRetirement/Default",
                    dialog_id: dialog.rest_api_entity.id
                  },

                  provision: {
                    fqname: "/Service/Provisioning/StateMachines/ServiceProvision_Template/CatalogItemInitialization",
                    dialog_id: dialog.rest_api_entity.id
                  }
                },

                service_type: "atomic",
                display: true,

                description: fauxfactory.gen_alpha({
                  start: "Description ",
                  length: 25
                }),

                picture: {
                  content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAAADUlEQVQIHWNgYGCwBQAAQgA+3N0+xQAAAABJRU5ErkJggg==",
                  extension: "jpg"
                }
              };

              let service_template = appliance.rest_api.collections.service_templates.action.create({None: data})[0];
              assert_response(appliance);
              request.addfinalizer(service_template.action.delete);
              let picture_1_md5 = appliance.rest_api.get(`${service_template._href}?attributes=picture`).picture.md5;

              let updated_data = {picture: {
                content: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                extension: "jpg"
              }};

              service_template.action.edit({None: updated_data});
              assert_response(appliance);
              let picture_2_md5 = appliance.rest_api.get(`${service_template._href}?attributes=picture`).picture.md5;
              if (picture_1_md5 == picture_2_md5) throw new ()
            }
