require_relative("wrapanapi/exceptions");
include(Wrapanapi.Exceptions);
require_relative("wrapanapi/exceptions");
include(Wrapanapi.Exceptions);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _vm = vm.bind(this);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);

let pytestmark = [
  test_requirements.rest,
  pytest.mark.provider({classes: [InfraProvider], selector: ONE}),
  pytest.mark.usefixtures("setup_provider")
];

function vm(request, provider, appliance) {
  return _vm(request, provider, appliance)
};

function template(request, appliance, provider, vm) {
  let template = mark_vm_as_template(
    appliance,
    {provider, vm_name: vm}
  );

  let _finished = () => {
    appliance.rest_api.collections.templates.action.delete(...[template]);

    try {
      provider.mgmt.get_template(template.name).delete()
    } catch (e) {
      if (e instanceof Exception) {
        logger.error(`Failed to delete template. ${e}`)
      } else {
        throw e
      }
    }
  };

  return template
};

function test_query_template_attributes(request, appliance, provider, soft_assert) {
  let template_rest;

  // Tests access to template attributes.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Bugzilla:
  //       1546995
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Services
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  let templates = appliance.rest_api.collections.templates.all;

  if (is_bool(templates)) {
    template_rest = templates[0]
  } else {
    let vm_rest = vm(request, provider, appliance);
    template_rest = template(request, appliance, provider, vm_rest)
  };

  let outcome = query_resource_attributes(template_rest);

  for (let failure in outcome.failed) {
    soft_assert.call(false, "{} \"{}\": status: {}, error: `{}`".format(
      failure.type,
      failure.name,
      failure.response.status_code,
      failure.error
    ))
  }
};

function test_set_ownership(appliance, template, from_detail) {
  // Tests setting of template ownership.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Services
  //       initialEstimate: 1/8h
  //   
  if (!appliance.rest_api.collections.templates.action.all.include("set_ownership")) {
    pytest.skip("set_ownership action for templates is not implemented in this version")
  };

  let group = appliance.rest_api.collections.groups.get({description: "EvmGroup-super_administrator"});
  let user = appliance.rest_api.collections.users.get({userid: "admin"});
  let data = {owner: {href: user.href}, group: {href: group.href}};

  if (is_bool(from_detail)) {
    template.action.set_ownership({None: data})
  } else {
    data.href = template.href;
    appliance.rest_api.collections.templates.action.set_ownership({None: data})
  };

  assert_response(appliance);
  template.reload();
  if (!template.instance_variable_defined("@evm_owner_id")) throw new ();
  if (template.evm_owner_id != user.id) throw new ();
  if (!template.instance_variable_defined("@miq_group_id")) throw new ();
  if (template.miq_group_id != group.id) throw new ()
};

function test_delete_template_from_detail_post(template) {
  // Tests deletion of template from detail using POST method.
  // 
  //   Bugzilla:
  //       1422807
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Services
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  delete_resources_from_detail([template], {method: "POST"})
};

function test_delete_template_from_detail_delete(template) {
  // Tests deletion of template from detail using DELETE method.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Services
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  delete_resources_from_detail([template], {method: "DELETE"})
};

function test_delete_template_from_collection(template) {
  // Tests deletion of template from collection.
  // 
  //   Metadata:
  //       test_flag: rest
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Services
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  delete_resources_from_collection([template])
}
