require_relative 'wrapanapi/exceptions'
include Wrapanapi::Exceptions
require_relative 'wrapanapi/exceptions'
include Wrapanapi::Exceptions
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _vm vm
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
pytestmark = [test_requirements.rest, pytest.mark.provider(classes: [InfraProvider], selector: ONE), pytest.mark.usefixtures("setup_provider")]
def vm(request, provider, appliance)
  return _vm(request, provider, appliance)
end
def template(request, appliance, provider, vm)
  template = mark_vm_as_template(appliance, provider: provider, vm_name: vm)
  _finished = lambda do
    appliance.rest_api.collections.templates.action.delete(*[template])
    begin
      provider.mgmt.get_template(template.name).delete()
    rescue NotFoundError
      logger.error("Failed to delete template. No template found with name {}".format(template.name))
    rescue MultipleItemsError
      logger.error("Failed to delete template. Multiple templates found with name {}".format(template.name))
    rescue Exception => e
      logger.error("Failed to delete template. #{e}")
    end
  end
  return template
end
def test_query_template_attributes(request, appliance, provider, soft_assert)
  # Tests access to template attributes.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Bugzilla:
  #       1546995
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Services
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  templates = appliance.rest_api.collections.templates.all
  if is_bool(templates)
    template_rest = templates[0]
  else
    vm_rest = vm(request, provider, appliance)
    template_rest = template(request, appliance, provider, vm_rest)
  end
  outcome = query_resource_attributes(template_rest)
  for failure in outcome.failed
    soft_assert.(false, "{} \"{}\": status: {}, error: `{}`".format(failure.type, failure.name, failure.response.status_code, failure.error))
  end
end
def test_set_ownership(appliance, template, from_detail)
  # Tests setting of template ownership.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Services
  #       initialEstimate: 1/8h
  #   
  if !appliance.rest_api.collections.templates.action.all.include?("set_ownership")
    pytest.skip("set_ownership action for templates is not implemented in this version")
  end
  group = appliance.rest_api.collections.groups.get(description: "EvmGroup-super_administrator")
  user = appliance.rest_api.collections.users.get(userid: "admin")
  data = {"owner" => {"href" => user.href}, "group" => {"href" => group.href}}
  if is_bool(from_detail)
    template.action.set_ownership(None: data)
  else
    data["href"] = template.href
    appliance.rest_api.collections.templates.action.set_ownership(None: data)
  end
  assert_response(appliance)
  template.reload()
  raise unless template.instance_variable_defined? :@evm_owner_id
  raise unless template.evm_owner_id == user.id
  raise unless template.instance_variable_defined? :@miq_group_id
  raise unless template.miq_group_id == group.id
end
def test_delete_template_from_detail_post(template)
  # Tests deletion of template from detail using POST method.
  # 
  #   Bugzilla:
  #       1422807
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Services
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  delete_resources_from_detail([template], method: "POST")
end
def test_delete_template_from_detail_delete(template)
  # Tests deletion of template from detail using DELETE method.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Services
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  delete_resources_from_detail([template], method: "DELETE")
end
def test_delete_template_from_collection(template)
  # Tests deletion of template from collection.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Services
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  delete_resources_from_collection([template])
end
