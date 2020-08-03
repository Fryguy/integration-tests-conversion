require_relative 'wrapanapi'
include Wrapanapi
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure'
include Cfme::Infrastructure
alias host_ui host
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
pytestmark = [pytest.mark.tier(3), test_requirements.smartstate, pytest.mark.meta(server_roles: "+smartproxy +smartstate"), pytest.mark.provider([VMwareProvider], selector: ONE_PER_VERSION), pytest.mark.usefixtures("setup_provider")]
vddk_versions = ["v6_0", "v6_5", "v6_7"]
def ssa_analysis_profile(appliance)
  collected_files = []
  for file in ["/etc/hosts", "/etc/passwd"]
    collected_files.push({"Name" => file, "Collect Contents?" => true})
  end
  analysis_profile_name = fauxfactory.gen_alphanumeric(18, start: "ssa_analysis_")
  analysis_profile_collection = appliance.collections.analysis_profiles
  analysis_profile = analysis_profile_collection.create(name: analysis_profile_name, description: analysis_profile_name, profile_type: analysis_profile_collection.VM_TYPE, categories: ["System"], files: collected_files)
  yield
  if is_bool(analysis_profile.exists)
    analysis_profile.delete()
  end
end
def configure_vddk(request, appliance, provider, vm)
  vddk_version = request.param
  vddk_url = conf.cfme_data.get("basic_info", {}).get("vddk_url", {}).get(vddk_version, nil)
  if vddk_url === nil
    pytest.skip("Could not locate vddk url in cfme_data")
  else
    appliance.install_vddk(vddk_url: vddk_url)
  end
  view = navigate_to(vm, "Details")
  host_name = view.entities.summary("Relationships").get_text_of("Host")
  host, = provider.hosts.all().select{|host| host.name == host_name}.map{|host| host}
  host_data, = provider.data["hosts"].select{|data| data["name"] == host.name}.map{|data| data}
  host_collection = appliance.collections.hosts
  host_obj = host_collection.instantiate(name: host.name, provider: provider)
  update(host_obj, validate_credentials: true) {
    host_obj.credentials = {"default" => host_ui.Host.Credential.from_config(host_data["credentials"]["default"])}
  }
  _finalize = lambda do
    appliance.uninstall_vddk()
    update(host_obj) {
      host_obj.credentials = {"default" => host_ui.Host.Credential(principal: "", secret: "", verify_secret: "")}
    }
  end
end
def vm(request, provider, small_template, ssa_analysis_profile)
  #  Fixture to provision instance on the provider 
  vm_name = random_vm_name("ssa", max_length: 16)
  vm_obj = provider.appliance.collections.infra_vms.instantiate(vm_name, provider, small_template.name)
  vm_obj.create_on_provider(find_in_cfme: true, allow_skip: "default")
  vm_obj.mgmt.ensure_state(VmState.RUNNING)
  _finalize = lambda do
    begin
      vm_obj.cleanup_on_provider()
      provider.refresh_provider_relationships()
    rescue Exception => e
      logger.exception(e)
    end
  end
  return vm_obj
end
def test_ssa_vddk(vm, configure_vddk)
  # Check if different version of vddk works with provider
  # 
  # 
  #   Polarion:
  #       assignee: nansari
  #       casecomponent: SmartState
  #       initialEstimate: 1/2h
  #   
  vm.smartstate_scan(wait_for_task_result: true)
  view = navigate_to(vm, "Details")
  c_users = view.entities.summary("Security").get_text_of("Users")
  c_groups = view.entities.summary("Security").get_text_of("Groups")
  raise unless [c_users != 0, c_groups != 0].is_any?
end
