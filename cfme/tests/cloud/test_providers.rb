require_relative 'urllib/parse'
include Urllib::Parse
require_relative 'wait_for'
include Wait_for
require_relative 'widgetastic/exceptions'
include Widgetastic::Exceptions
require_relative 'widgetastic/widget'
include Widgetastic::Widget
require_relative 'wrapanapi'
include Wrapanapi
require_relative 'cfme'
include Cfme
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/cloud/provider'
include Cfme::Cloud::Provider
require_relative 'cfme/cloud/provider/azure'
include Cfme::Cloud::Provider::Azure
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/gce'
include Cfme::Cloud::Provider::Gce
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/common/provider'
include Cfme::Common::Provider
require_relative 'cfme/common/provider_views'
include Cfme::Common::Provider_views
require_relative 'cfme/common/provider_views'
include Cfme::Common::Provider_views
require_relative 'cfme/fixtures/provider'
include Cfme::Fixtures::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/generators'
include Cfme::Utils::Generators
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.provider([CloudProvider], scope: "function")]
SPACE = "/mnt/space/"
def enable_regions(provider)
  enable_provider_regions(provider)
end
def az_pwsh_vm(appliance)
  # 
  #   azure_pwsh contains powershell and necessary scripts to upload vhd, create VM, get ip of the
  #   resource and delete the VM.
  #   Find the provider that contains that template.
  # 
  #   The example of the configuration can be found in data/az_pwsh_cloudinit.cfg
  #   
  filter_pwsh_template = ProviderFilter(required_fields: [["templates", "powershell_vm"]])
  providers = list_providers(filters: [filter_pwsh_template])
  if is_bool(!providers)
    pytest.skip("There's no provider that contains a template with powershell")
  end
  provider = providers[0]
  vm_name = random_vm_name(context: "pwsh")
  pwsh_vm = provider.data.templates.powershell_vm.name
  collection = provider.appliance.provider_based_collection(provider)
  begin
    vm = collection.instantiate(vm_name, provider, pwsh_vm)
    vm.create_on_provider(allow_skip: "default")
  rescue IndexError
    require_relative 'cfme/exceptions'
    include Cfme::Exceptions
    raise ItemNotFound, "VM with powershell not found!"
  end
  vm.mgmt.ensure_state(VmState.RUNNING)
  get_ip_address = lambda do
    ip = vm.ip_address
    return !ip.equal?(nil)
  end
  yield vm
  vm.cleanup_on_provider()
end
def pwsh_ssh(az_pwsh_vm)
  # Provide vm_ssh_client for ssh operations in the test.
  ssh.SSHClient(hostname: az_pwsh_vm.ip_address, username: credentials["host_default"]["username"], password: credentials["host_default"]["password"]) {|vm_ssh_client|
    yield vm_ssh_client
  }
end
def connect_az_account(pwsh_ssh)
  # 
  #   Connect to Azure account to run further scripts, see
  #   https://docs.microsoft.com/en-us/powershell/azure/authenticate-azureps
  #   
  path_script = File.join(SPACE,"connect_account.ps1")
  connect = pwsh_ssh.run_command(, timeout: 180)
  raise "Failed to connect to Azure account" unless connect.success
end
def cfme_vhd(appliance, pwsh_ssh)
  path_script = File.join(SPACE,"get_ip.ps1")
  ip_of_recourse = pwsh_ssh.run_command(, timeout: 60).output.strip()
  if !ip_of_recourse.equal?(nil)
    pytest.skip("The resource is taken by some other VM in Azure")
  end
  stream = appliance.version.stream()
  begin
    url = ("{}/").format(conf.cfme_data["basic_info"]["cfme_images_url"][stream])
  rescue KeyError
    pytest.skip("Skipping since no such key found in yaml")
  end
  image = pwsh_ssh.run_command(, timeout: 30).output.strip()
  image_url = urljoin(url, image)
  pwsh_ssh.run_command(, timeout: 180)
  vhd = image.gsub("zip", "vhd")
  pwsh_ssh.run_command(("unzip {} -d {}").format(File.join(SPACE,image), SPACE), timeout: 15 * 60)
  yield vhd
  pwsh_ssh.run_command(("rm -f {}").format(File.join(SPACE,image)), timeout: 180)
  pwsh_ssh.run_command(("rm -f {}").format(File.join(SPACE,vhd)), timeout: 180)
end
def upload_image_to_azure(cfme_vhd, pwsh_ssh)
  path_script = File.join(SPACE,"upload_vhd.ps1")
  pwsh_ssh.run_command(("sed -i \'1s/.*/$BlobNameSource = \"{vhd}\"/\' {script}").format(script: path_script, vhd: cfme_vhd), timeout: 30)
  pwsh_ssh.run_command(, timeout: 15 * 60)
end
def vm_ip(cfme_vhd, pwsh_ssh)
  path_script = File.join(SPACE,"create_vm.ps1")
  pwsh_ssh.run_command(("sed -i \'1s/.*/$BlobNameSource = \"{vhd}\"/\' {script} &&
        sed -i \'2s/.*/$BlobNameDest = \"{b_dest}\"/\' {script} &&
        sed -i \'3s/.*/$VMName = \"{name}\"/\' {script}").format(script: path_script, vhd: cfme_vhd, b_dest: Cfme::cfme_vhd.gsub("azure", "test"), name: Cfme::cfme_vhd.gsub(".x86_64.vhd", "-vm")), timeout: 20)
  pwsh_ssh.run_command(, timeout: 600)
  path_get_ip = File.join(SPACE,"get_ip.ps1")
  ip = pwsh_ssh.run_command(, timeout: 60).output.strip()
  yield ip
  pwsh_ssh {
    pwsh_ssh.run_command(("sed -i \'1s/.*/$VMName = \"{name}\"/\' {script}").format(script: path_script, name: Cfme::cfme_vhd.gsub(".x86_64.vhd", "-vm")), timeout: 20)
    pwsh_ssh.run_command(, timeout: 180)
  }
end
def instance_with_ssh_addition_template(appliance, provider)
  form_values = {"customize" => {"custom_template" => {"name" => "SSH key addition template"}}}
  instance = appliance.collections.cloud_instances.create(random_vm_name("prov"), provider, form_values: form_values)
  yield instance
  instance.delete()
end
def stack_without_parameters(provider)
  stack = provider.mgmt.create_stack(name: fauxfactory.gen_alpha(10), template_url: provider.data.provisioning.stack_provisioning.template_without_parameters, capabilities: ["CAPABILITY_IAM"])
  Wait_for::wait_for(lambda{|| stack.status_active}, delay: 15, timeout: 900)
  yield stack
  stack.delete()
end
def ec2_provider_with_sts_creds(appliance)
  collection = appliance.collections.cloud_providers
  prov = collection.instantiate(prov_class: EC2Provider, name: fauxfactory.gen_alphanumeric(5), key: "ec2west")
  assume_role_creds = prov.data.sts_assume_role.credentials
  creds = Credential(principal: credentials[assume_role_creds]["username"], secret: credentials[assume_role_creds]["password"])
  endpoint = EC2Endpoint(assume_role_arn: prov.data.sts_assume_role.role_arn, credentials: creds)
  prov.endpoints = prepare_endpoints(endpoint)
  prov.region_name = prov.data.region_name
  yield prov
  prov.delete()
end
def child_provider(request, appliance, provider)
  begin
    collection = appliance.collections.getattr(request.param).filter({"provider" => provider})
  rescue NoMethodError
    pytest.skip("Appliance collections did not include parametrized child provider type ({})".format(request.param))
  end
  yield collection.all()[0]
end
def test_add_cancelled_validation_cloud(request, appliance)
  # Tests that the flash message is correct when add is cancelled.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/16h
  #   
  collection = appliance.collections.cloud_providers
  prov = collection.instantiate(prov_class: EC2Provider)
  request.addfinalizer(prov.delete_if_exists)
  begin
    prov.create(cancel: true)
  rescue MoveTargetOutOfBoundsException
    prov.create(cancel: true)
  end
  view = prov.browser.create_view(CloudProvidersView)
  view.flash.assert_success_message("Add of Cloud Provider was cancelled by the user")
end
def test_cloud_provider_add_with_bad_credentials(request, provider, has_no_providers, enable_regions, appliance)
  #  Tests provider add with bad credentials
  # 
  #   Metadata:
  #       test_flag: crud
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #   
  default_credentials = provider.default_endpoint.credentials
  flash = "Login failed due to a bad username or password."
  default_credentials.principal = "bad"
  default_credentials.secret = "notyourday"
  if is_bool(provider.one_of(AzureProvider))
    flash = "Credential validation was not successful: Incorrect credentials - check your Azure Client ID and Client Key"
    default_credentials.principal = uuid.uuid4().to_s
    default_credentials.secret = "notyourday"
  else
    if is_bool(provider.one_of(GCEProvider))
      flash = "Credential validation was not successful: Invalid Google JSON key"
      default_credentials.service_account = "{\"test\": \"bad\"}"
    else
      if is_bool(provider.one_of(OpenStackProvider))
        for endp_name in provider.endpoints.keys().to_a
          if endp_name != "default"
             = nil
          end
        end
      end
    end
  end
  clear_form = lambda do
    require_relative 'cfme/common/provider_views'
    include Cfme::Common::Provider_views
    view = appliance.browser.create_view(ProviderAddView)
    if is_bool(view.is_displayed)
      view.cancel.click()
    end
    raise unless !view.is_displayed
  end
  pytest.raises(Exception, match: flash) {
    provider.create(validate_credentials: true)
  }
end
def test_cloud_provider_crud(provider, has_no_providers, enable_regions)
  #  Tests provider add with good credentials
  # 
  #   Metadata:
  #       test_flag: crud
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/3h
  #   
  provider.create()
  provider.validate_stats(ui: true)
  old_name = provider.name
  update(provider) {
    provider.name = uuid.uuid4().to_s
  }
  update(provider) {
    provider.name = old_name
  }
  provider.delete()
  provider.wait_for_delete()
end
def test_type_required_validation_cloud(request, appliance)
  # Test to validate type while adding a provider
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: high
  #       initialEstimate: 1/10h
  #   
  collection = appliance.collections.cloud_providers
  view = navigate_to(collection, "Add")
  view.fill({"name" => "foo"})
  raise unless !view.add.active
end
def test_name_required_validation_cloud(request, appliance)
  # Tests to validate the name while adding a provider
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: high
  #       initialEstimate: 1/15h
  #   
  collection = appliance.collections.cloud_providers
  prov = collection.instantiate(prov_class: EC2Provider, name: nil, region: "US East (Northern Virginia)")
  request.addfinalizer(prov.delete_if_exists)
  pytest.raises(RuntimeError) {
    prov.create()
  }
  view = prov.create_view(CloudProviderAddView)
  raise unless view.name.help_block == "Required"
  raise unless !view.add.active
end
def test_region_required_validation(request, soft_assert, appliance)
  # Tests to validate the region while adding a provider
  # 
  #   Polarion:
  #       assignee: pvala
  #       caseimportance: low
  #       casecomponent: WebUI
  #       initialEstimate: 1/6h
  #   
  collection = appliance.collections.cloud_providers
  prov = collection.instantiate(prov_class: EC2Provider, name: fauxfactory.gen_alphanumeric(5), region: nil)
  request.addfinalizer(prov.delete_if_exists)
  pytest.raises(RuntimeError) {
    prov.create()
    view = prov.create_view(CloudProviderAddView)
    soft_assert.(view.region.help_block == "Required")
  }
end
def test_host_name_required_validation_cloud(request, appliance)
  # Test to validate the hostname while adding a provider
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: high
  #       initialEstimate: 1/15h
  #   
  endpoint = RHOSEndpoint(hostname: nil, ip_address: fauxfactory.gen_ipaddr(prefix: [10]), security_protocol: nil)
  collection = appliance.collections.cloud_providers
  prov = collection.instantiate(prov_class: OpenStackProvider, name: fauxfactory.gen_alphanumeric(5), endpoints: endpoint)
  request.addfinalizer(prov.delete_if_exists)
  pytest.raises(RuntimeError) {
    prov.create()
  }
  endpoints = prov.create_view(prov.endpoints_form)
  raise unless endpoints.default.hostname.help_block == "Required"
end
def test_api_port_blank_validation(request, appliance)
  # Test to validate blank api port while adding a provider
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/6h
  #   
  endpoint = RHOSEndpoint(hostname: fauxfactory.gen_alphanumeric(5), ip_address: fauxfactory.gen_ipaddr(prefix: [10]), api_port: "", security_protocol: "Non-SSL")
  collection = appliance.collections.cloud_providers
  prov = collection.instantiate(prov_class: OpenStackProvider, name: fauxfactory.gen_alphanumeric(5), endpoints: endpoint)
  request.addfinalizer(prov.delete_if_exists)
  pytest.raises(RuntimeError) {
    prov.create()
  }
  endpoints = prov.create_view(prov.endpoints_form)
  raise unless endpoints.default.api_port.help_block == "Required"
end
def test_name_max_character_validation_cloud(request, cloud_provider)
  # Test to validate that provider can have up to 255 characters in name
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #   
  request.addfinalizer(lambda{|| cloud_provider.delete_if_exists(cancel: false)})
  name = fauxfactory.gen_alphanumeric(255)
  update(cloud_provider) {
    cloud_provider.name = name
  }
  raise unless cloud_provider.exists
end
def test_hostname_max_character_validation_cloud(appliance)
  # Test to validate max character for hostname field
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: high
  #       initialEstimate: 1/15h
  #   
  endpoint = RHOSEndpoint(hostname: fauxfactory.gen_alphanumeric(256), api_port: nil, security_protocol: nil)
  collection = appliance.collections.cloud_providers
  prov = collection.instantiate(prov_class: OpenStackProvider, name: fauxfactory.gen_alphanumeric(5), endpoints: endpoint)
  begin
    prov.create()
  rescue MoveTargetOutOfBoundsException
    prov.create()
  rescue RuntimeError
    endpoints = prov.create_view(prov.endpoints_form)
    raise unless endpoints.default.hostname.value == prov.hostname[0...255]
  end
end
def test_api_port_max_character_validation_cloud(appliance)
  # Test to validate max character for api port field
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: high
  #       initialEstimate: 1/15h
  #   
  endpoint = RHOSEndpoint(hostname: fauxfactory.gen_alphanumeric(5), api_port: fauxfactory.gen_alphanumeric(16), security_protocol: "Non-SSL")
  collection = appliance.collections.cloud_providers
  prov = collection.instantiate(prov_class: OpenStackProvider, name: fauxfactory.gen_alphanumeric(5), endpoints: endpoint)
  begin
    prov.create()
  rescue RuntimeError
    view = prov.create_view(prov.endpoints_form)
    text = view.default.api_port.value
    raise unless text == prov.default_endpoint.api_port[0...15]
  end
end
def test_azure_subscription_required(request, provider)
  # 
  #   Tests that provider can't be added w/o subscription
  # 
  #   Metadata:
  #       test_flag: crud
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: WebUI
  #       caseposneg: negative
  #       caseimportance: critical
  #       initialEstimate: 1/10h
  #       testSteps:
  #           1.Add Azure Provider w/0 subscription
  #           2.Validate
  #   
  provider.subscription_id = ""
  request.addfinalizer(provider.delete_if_exists)
  pytest.raises(RuntimeError, match: "Credential validation was not successful: Incorrect credentials - check your Azure Subscription ID") {
    provider.create()
  }
end
def test_azure_multiple_subscription(appliance, request, soft_assert, provider, second_provider, setup_provider)
  # 
  #   Verifies that different azure providers have different resources access
  # 
  #   Steps:
  #   1. Add all Azure providers
  #   2. Compare their VMs/Templates
  # 
  #   Metadata:
  #       test_flag: crud
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #       caseimportance: critical
  #   
  providers = [provider, second_provider]
  prov_inventory = []
  for provider in providers
    request.addfinalizer(provider.clear_providers)
    provider.create(check_existing: true)
    provider.validate_stats()
    prov_inventory.push([provider.name, provider.num_vm(), provider.num_template()])
  end
  for (index, prov_a) in enumerate(prov_inventory[0...-1])
    for prov_b in prov_inventory[index + 1..-1]
      soft_assert.(prov_a[1] != prov_b[1], "Same num_vms for {} and {}".format(prov_a[0], prov_b[0]))
      soft_assert.(prov_a[2] != prov_b[2], "Same num_templates for {} and {}".format(prov_a[0], prov_b[0]))
    end
  end
end
def test_refresh_with_empty_iot_hub_azure(request, provider, setup_provider)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: low
  #       initialEstimate: 1/6h
  #       setup: prepare env
  #              create an IoT Hub in Azure (using free tier pricing is good enough):
  #              $ az iot hub create --name rmanes-iothub --resource-group iot_rg
  #       testSteps:
  #           1. refresh azure provider
  #       expectedResults:
  #           1. no errors found in logs
  #   Bugzilla:
  #       1495318
  #   
  result = LogValidator("/var/www/miq/vmdb/log/evm.log", failure_patterns: [".*ERROR.*"])
  result.start_monitoring()
  azure = provider.mgmt
  if is_bool(!azure.has_iothub())
    iothub_name = fauxfactory.gen_alpha(18, start: "potatoiothub_")
    azure.create_iothub(iothub_name)
    request.addfinalizer(lambda{|| azure.delete_iothub(iothub_name)})
    raise unless azure.has_iothub()
  end
  provider.refresh_provider_relationships(wait: 600)
  raise unless result.validate(wait: "60s")
end
def test_regions_gov_azure(provider)
  # 
  #   This test verifies that Azure Government regions are not included in
  #   the default region list as most users will receive errors if they try
  #   to use them.
  #   Bugzilla:
  #       1412363
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       caseposneg: negative
  #       initialEstimate: 1/8h
  #       setup: Check the region list when adding a Azure Provider.
  #       startsin: 5.7
  #   
  view = navigate_to(AzureProvider, "Add")
  view.fill({"prov_type" => provider.type.capitalize()})
  available_regions = view.region.all_options.map{|opt| opt.text}
  raise unless !available_regions.map{|reg| reg}.is_any?
end
def test_openstack_provider_has_api_version(appliance)
  # Check whether the Keystone API version field is present for Openstack.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(appliance.collections.cloud_providers, "Add")
  view.fill({"prov_type" => "OpenStack"})
  raise "API version select is not visible" unless view.api_version.is_displayed
end
def test_openstack_provider_has_dashboard(appliance, openstack_provider)
  # Check whether dashboard view is available for Openstack provider
  # 
  #   Bugzilla:
  #       1487142
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Cloud
  #       initialEstimate: 1/12h
  #       startsin: 5.10
  #   
  view = navigate_to(openstack_provider, "Details", use_resetter: false)
  view.toolbar.view_selector.select("Dashboard View")
  raise unless view.is_displayed
end
def test_select_key_pair_none_while_provisioning(appliance, request, has_no_providers, provider)
  # 
  #       GH Issue: https://github.com/ManageIQ/manageiq/issues/10575
  # 
  #       Requirement: Have an ec2 provider with single key pair
  #                   (For now available in South America (Sao Paulo) region)
  #       1. Compute -> Cloud -> Instances
  #       2. Click on Provision Instances in Toolbar
  #       3. Go to Properties
  #       4. Select None in Guest Access Key Pair
  #       5. None should be selected
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: WebUI
  #       initialEstimate: 1/4h
  #   
  if provider.data.tags.include?("govcloud")
    pytest.skip("providers with such tag aren't supported for some reason")
  end
  provider.region_name = "South America (Sao Paulo)"
  request.addfinalizer(provider.delete_if_exists)
  provider.create()
  provider.validate()
  view = navigate_to(appliance.collections.cloud_instances, "Provision", wait_for_view: 0)
  view.image_table[0].click()
  view.form.continue_button.click()
  view.form.properties.guest_keypair.fill("<None>")
  raise unless view.form.properties.guest_keypair.read() == "<None>"
end
def test_azure_instance_password_requirements(appliance, has_no_providers, setup_provider)
  # 
  #       Requirement: Have an Azure provider
  #       1. Compute -> Cloud -> Instances
  #       2. Click on Provision Instances in Toolbar
  #       3. Select template.
  #       4. Go to Customisation, fill password that doesn't match the criteria:
  #           * must be 12-72 characters
  #           * have 3 of the following - one lowercase character, one uppercase character,
  #             one number and one special character
  #       5. Error message should be displayed.
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: WebUI
  #       initialEstimate: 1/4h
  #   
  view = navigate_to(appliance.collections.cloud_instances, "Provision")
  view.image_table[0].click()
  view.form.continue_button.click()
  message = "'Customize/Password' must be correctly formatted. The password must be 12-72 characters, and have 3 of the following - one lowercase character, one uppercase character, one number and one special character."
  view.form.customize.fill({"admin_username" => "some_value"})
  for pw in ["abcdefghijkl_", "ABCDEFGHIJKL_", "ABCDEFGHIJKLa", "abcdefgh_1A"]
    view.form.customize.fill({"root_password" => pw})
    view.form.submit_button.click()
    Wait_for::wait_for(lambda{|| view.flash.read().include?(message)}, fail_condition: false, num_sec: 10, delay: 0.1)
    view.flash.dismiss()
  end
end
def test_cloud_names_grid_floating_ips(appliance, ec2_provider, soft_assert)
  # 
  #       Requirement: Cloud provider with floating IPs
  # 
  #       Go to Network -> Floating IPs
  #       Change view to grid
  #       Test if names are displayed
  # 
  #   Polarion:
  #       assignee: pvala
  #       caseimportance: medium
  #       casecomponent: WebUI
  #       initialEstimate: 1/30h
  #   
  floating_ips_collection = appliance.collections.network_floating_ips
  view = navigate_to(floating_ips_collection, "All")
  view.toolbar.view_selector.select("Grid View")
  for entity in view.entities.get_all()
    title = Text(view, )
    soft_assert.(title.is_displayed)
  end
end
def test_display_network_topology(appliance, openstack_provider)
  # 
  #   Bugzilla:
  #       1343553
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       testSteps:
  #           1. Add RHOS undercloud provider
  #           2. Make sure it has no floating IPs
  #           3. Go to Networks -> Topology
  #           4. Topology should be shown without errors.
  # 
  #   
  floating_ips_collection = appliance.collections.network_floating_ips
  view = navigate_to(floating_ips_collection, "All")
  if is_bool(!view.entities.get_all())
    pytest.skip("No Floating IPs needed for this test")
  end
  topology_col = appliance.collections.network_topology_elements
  view = navigate_to(topology_col, "All")
  raise unless view.is_displayed
end
class TestProvidersRESTAPI
  def test_cloud_networks_query(provider, appliance, from_detail, setup_provider)
    # Tests querying cloud providers and cloud_networks collection for network info.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Cloud
    #         caseimportance: low
    #         initialEstimate: 1/3h
    #     
    if is_bool(from_detail)
      networks = provider.rest_api_entity.cloud_networks
    else
      networks = appliance.rest_api.collections.cloud_networks
    end
    assert_response(appliance)
    Wait_for::wait_for(lambda{|| networks.size != 0}, fail_func: provider.refresh_provider_relationships, timeout: "40s", silent_failure: true)
    raise "No cloud networks found" unless networks.size > 0
    raise unless networks.name == "cloud_networks"
    raise unless networks.all.size == networks.subcount
    enabled_networks = 0
    networks.reload(expand: true)
    for network in networks
      raise unless network.type.include?("CloudNetwork")
      if network.enabled === true
        enabled_networks += 1
      end
    end
    raise unless enabled_networks >= 1
  end
  def test_security_groups_query(provider, appliance, setup_provider)
    # Tests querying cloud networks subcollection for security groups info.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Cloud
    #         caseimportance: low
    #         initialEstimate: 1/4h
    #     
    Wait_for::wait_for(lambda{|| provider.rest_api_entity.cloud_networks.size != 0}, fail_func: provider.refresh_provider_relationships, timeout: "40s", silent_failure: true)
    begin
      network = provider.rest_api_entity.cloud_networks[0]
    rescue IndexError
      pytest.fail()
    end
    network.reload(attributes: "security_groups")
    security_groups = network.security_groups
    raise unless security_groups.is_a? Array
    if is_bool(security_groups)
      raise unless security_groups[0]["type"].include?("SecurityGroup")
    end
  end
end
def test_tagvis_provision_fields(setup_provider, request, appliance, user_restricted, tag, soft_assert)
  # Test for network environment fields for restricted user
  # 
  #   Polarion:
  #       assignee: prichard
  #       casecomponent: Tagging
  #       caseimportance: medium
  #       initialEstimate: 1/3h
  #   
  image = appliance.collections.cloud_images.all()[0]
  image.add_tag(tag)
  request.addfinalizer(lambda{|| image.remove_tag(tag)})
  user_restricted {
    view = navigate_to(appliance.collections.cloud_instances, "Provision")
    soft_assert.(view.image_table.read().size == 1)
    view.image_table.row(name: image.name).click()
    view.form.continue_button.click()
    environment_fields_check = [view.form.environment.cloud_tenant, view.form.environment.availability_zone, view.form.environment.cloud_network, view.form.environment.security_groups, view.form.environment.public_ip_address, view.form.properties.guest_keypair]
    soft_assert.(environment_fields_check.map{|select| select.size == 1})
  }
end
def test_domain_id_validation(request, provider)
  #  Test validating Keystone V3 needs domain_id
  # 
  #   prerequisites:
  #       * appliance
  # 
  #   Steps:
  #       * Navigate add Cloud provider and select OpenStack
  #       * Select Keystone V3 as API Version
  #       * Validate without Domain ID
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       initialEstimate: 1/4h
  #   
  prov = provider
  prov.api_version = "Keystone v3"
  prov.keystone_v3_domain_id = nil
  request.addfinalizer(prov.delete_if_exists)
  pytest.raises(RuntimeError) {
    prov.create()
  }
  view = prov.create_view(CloudProviderAddView)
  raise unless view.flash[0].type == "error"
end
def test_vpc_env_selection(setup_provider, request, provider, appliance, provisioning)
  # 
  #   Test selection of components in environment page of cloud instances
  #   with selected virtual private cloud
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: WebUI
  #       initialEstimate: 1/2h
  #       testSteps:
  #           1. Provision an Azure Instance from an Image.
  #           2. At the environment page, try to select components with vpc
  #       expectedResults:
  #           1. Instance provisioned and added successfully
  #           2. Items are selected successfully
  # 
  #   Bugzilla:
  #       1315945
  #   
  vm_name = random_vm_name("prov-az")
  template = provisioning.get("image").get("name")
  vm = appliance.collections.cloud_instances.instantiate(name: vm_name, provider: provider, template_name: template)
  request.addfinalizer(vm.cleanup_on_provider)
  data = vm.vm_default_args
  data["template_name"] = template
  data["provider_name"] = provider.name
  view = navigate_to(vm.parent, "Provision")
  view.form.fill_with(data, on_change: view.form.submit_button)
  view.flash.assert_no_error()
  request_description = 
  provision_request = appliance.collections.requests.instantiate(request_description)
  provision_request.wait_for_request(method: "ui", num_sec: 15 * 60)
  raise "Provisioning failed: {}".format(provision_request.row.last_message.text) unless provision_request.is_succeeded(method: "ui")
end
def test_sdn_nsg_arrays_refresh_azure()
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. Add Network Security group on Azure with coma separated port ranges
  #           `1023,1025` rule inbound/outbound ( ATM this feature is not allowed in
  #           East US region of Azure - try West/Central)
  #           2. Add such Azure Region into CFME
  #           3. Refresh provider
  #       expectedResults:
  #           1. The group is successfully added
  #           2. The region is successfully added
  #           3. Refreshed succesfully, there are no errors in the logs
  # 
  #   Bugzilla:
  #       1520196
  #   
  # pass
end
def test_provider_flavors_azure()
  # 
  #   Verify that the vm flavors in Azure are of the correct sizes and that
  #   the size display in CFME is accurate.
  #   Low priority as it is unlikely to change once set.  Will want to check
  #   when azure adds new sizes.  Only need to spot check a few values.
  #   For current size values, you can check here:
  #   https://docs.microsoft.com/en-us/azure/virtual-machines/linux/sizes
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: low
  #       initialEstimate: 1/8h
  #       startsin: 5.6
  #       testSteps:
  #           1. Add Azure provider
  #           2. Navigate to Flavours
  #       expectedResults:
  #           1. The provider is successfully added
  #           2. Flavours are the same as in MS documentation
  #   Bugzilla:
  #       1357086
  #   
  # pass
end
def test_market_place_images_azure()
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1.Enable market place images
  #           2.Add Azure provider
  #           3.Refresh the provider
  #       expectedResults:
  #           1.
  #           2.
  #           3. Refresh is done fast (faster than 15 minutes)
  #   Bugzilla:
  #       1491330
  #   
  # pass
end
def test_create_azure_vm_from_azure_image(connect_az_account, cfme_vhd, upload_image_to_azure, vm_ip)
  # 
  #   To run this test Azure account is required.
  # 
  #   Azure VM is provisioned from another VM using Powershell, that can be run on any provider.
  # 
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/2h
  #       setup: # Virtual Machine Name - as it appears in Azure
  #              $VMName = \"myVmName\"
  #              $ResourceGroupName = \"CFMEQE-Main\"
  #              Break
  #              # Existing Azure Deployment Values - Video with instructions
  #              forthcoming.
  #              $AvailabilitySetName = \"cfmeqe-as-free\"
  #              $AzureLocation = \"East US\"
  #              $VMDeploymentSize= \"Standard_A1\"
  #              $StorageAccountName = \"cfmeqestore\"
  #              $BlobContainerName = \"templates\"
  #              $VHDName = \"cfme-azure-56013.vhd\"
  #              $VirtualNetworkName = \"cfmeqe\"
  #              $NetworkSecurityGroupName = \"cfmeqe-nsg\"
  #              $VirtualNetworkSubnetName = \"default\"
  #              $VirtualNetworkAddressPrefix = \"10.0.0.0/16\"
  #              $VirtualNetworkSubnetAddressPrefix = \"10.0.0.0/24\"
  #              # Create VM Components
  #              $StorageAccount = Get-AzureRmStorageAccount -ResourceGroupName
  #              $ResourceGroupName -Name $StorageAccountName
  #              $InterfaceName = $VMName
  #              $NetworkSecurityGroupID = Get-AzureRmNetworkSecurityGroup -Name
  #              $NetworkSecurityGroupName -ResourceGroupName $ResourceGroupName
  #              $PIp = New-AzureRmPublicIpAddress -Name $InterfaceName
  #              -ResourceGroupName $ResourceGroupName -Location $AzureLocation
  #              -AllocationMethod Dynamic -Force
  #              $SubnetConfig = New-AzureRmVirtualNetworkSubnetConfig -Name
  #              $VirtualNetworkSubnetName -AddressPrefix
  #              $VirtualNetworkSubnetAddressPrefix
  #              $VNet = New-AzureRmVirtualNetwork -Name $VirtualNetworkName
  #              -ResourceGroupName $ResourceGroupName -Location $AzureLocation
  #              -AddressPrefix $VirtualNetworkAddressPrefix -Subnet $SubnetConfig
  #              -Force
  #              $Interface = New-AzureRmNetworkInterface -Name $InterfaceName
  #              -ResourceGroupName $ResourceGroupName -Location $AzureLocation
  #              -SubnetId $VNet.Subnets[0].Id -PublicIpAddressId $PIp.Id -Force
  #              $AvailabilitySet = Get-AzureRmAvailabilitySet -ResourceGroupName
  #              $ResourceGroupName -Name $AvailabilitySetName
  #              $VirtualMachine = New-AzureRmVMConfig -VMName $VMName -VMSize
  #              $VMDeploymentSize -AvailabilitySetID $AvailabilitySet.Id
  #              $VirtualMachine = Add-AzureRmVMNetworkInterface -VM $VirtualMachine
  #              -Id $Interface.Id
  #              $OSDiskUri = $StorageAccount.PrimaryEndpoints.Blob.ToString() +
  #              $BlobContainerName + \"/\" + $VHDName
  #              $VirtualMachine = Set-AzureRmVMOSDisk -VM $VirtualMachine -Name
  #              $VMName -VhdUri $OSDiskUri -CreateOption attach -Linux
  #              # Create the Virtual Machine
  #              New-AzureRmVM -ResourceGroupName $ResourceGroupName -Location
  #              $AzureLocation -VM $VirtualMachine
  #       testSteps:
  #           1. Make the VM
  #           2. Config SSH support
  #           3. Config DNS is desired.
  #           4. SSH into new VM with Azure Public IP address and verify it has booted
  #           correctly.
  #           5. Use HTTP to DNS into the appliance web ui and make sure
  #           you can log in.
  #       startsin: 5.6
  #       teardown: When you\"re done, delete everything.  Make sure at a minimum that the
  #                 VM is completely Stopped in Azure.
  #   
  app = appliance.IPAppliance.from_url(vm_ip)
  username = credentials["azure_appliance"]["username"]
  password = credentials["azure_appliance"]["password"]
  ssh.SSHClient(hostname: vm_ip, username: username, password: password) {|app_ssh_client|
    command = "sed -i \"s/.*PermitRootLogin.*/PermitRootLogin yes/g\" /etc/ssh/sshd_config"
    config = app_ssh_client.run_command(, ensure_user: true)
    raise unless config.success
    restart = app_ssh_client.run_command(, ensure_user: true)
    raise unless restart.success
    unlock = app_ssh_client.run_command(, ensure_user: true)
    raise unless unlock.success
  }
  app.configure()
  app.wait_for_web_ui()
  logged_in_page = app.server.login()
  raise unless logged_in_page.is_displayed
end
def test_refresh_with_stack_without_parameters(provider, has_no_providers, request, stack_without_parameters)
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/5h
  #       testSteps:
  #           1. Add cloudformation stack without parameters(https://s3-us-
  #           west-2.amazonaws.com/cloudformation-templates-us-
  #           west-2/Managed_EC2_Batch_Environment.template  )
  #           2. Add ec2 provider with cloudformation stack without parameters
  #       expectedResults:
  #           1.
  #           2. Wait for refresh - it should be refreshed successfully without errors
  #   
  provider.create()
  request.addfinalizer(provider.delete_if_exists)
  provider.refresh_provider_relationships()
  provider.validate_stats(ui: true)
end
def test_public_images_enable_disable(setup_provider, request, appliance, provider)
  # 
  #   Bugzilla:
  #       1491330
  #       1612086
  #   The easiest way to simulate AWS API Limit for > 200 items is to enable
  #   and disable public images.
  #   So test for testing public images and for testing AWS API Limit is combined in this test.
  #   Polarion:
  #       assignee: mmojzis
  #       caseimportance: critical
  #       initialEstimate: 1 1/2h
  #       casecomponent: Cloud
  #       testSteps:
  #           1. Enable public images for ec2
  #           2. Add ec2 provider
  #           3. Wait for its refresh(It can take more than 30 minutes)
  #           4. Disable public images for ec2
  #           5. Wait for its refresh(It can take more than 30 minutes)
  #       expectedResults:
  #           1.
  #           2.
  #           3. Refresh should be successful and public images collected
  #           4.
  #           5. Refresh should be successful and public images uncollected
  #   
  request.addfinalizer(lambda{|| provider.delete_if_exists()})
  request.addfinalizer(lambda{|| appliance.set_public_images(provider, enabled: false)})
  public_provider_images_min = is_bool(provider.one_of(AzureProvider)) ? 20000 : 40000
  private_provider_images_max = 5000
  appliance.set_public_images(provider, enabled: true)
  provider.refresh_provider_relationships(method: "ui")
  Wait_for::wait_for(lambda{|| provider.load_details(refresh: true).entities.summary("Relationships").get_text_of("Images").to_i > public_provider_images_min}, delay: 120, timeout: 3600 * 3)
  appliance.set_public_images(provider, enabled: false)
  provider.refresh_provider_relationships(method: "ui")
  Wait_for::wait_for(lambda{|| provider.load_details(refresh: true).entities.summary("Relationships").get_text_of("Images").to_i < private_provider_images_max}, delay: 120, timeout: 3600 * 3)
end
def test_create_sns_topic(has_no_providers, provider, request)
  # 
  #   Requires: No SNS topic(AWS_Config) for tested region
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       startsin: 5.8
  #       testSteps:
  #           1. Add an ec2 provider with tested region
  #           2. Wait 3 minutes
  #       expectedResults:
  #           1.
  #           2. Check SNS topic exists for this region in AWS
  #   
  request.addfinalizer(provider.delete_if_exists)
  topic = provider.mgmt.get_arn_if_topic_exists("AWSConfig_topic")
  if is_bool(topic)
    provider.mgmt.delete_topic(topic)
  end
  provider.create()
  new_topic = Wait_for::wait_for(lambda{|| provider.mgmt.get_arn_if_topic_exists("AWSConfig_topic")}, delay: 15, timeout: 300)
  provider.mgmt.set_sns_topic_target_for_all_cw_rules(new_topic)
end
def test_add_delete_add_provider(setup_provider, provider, request)
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       initialEstimate: 1h
  #       caseimportance: critical
  #       testSteps:
  #           1. Add ec2 provider
  #           2. Delete ec2 provider
  #           3. Add ec2 provider
  #       expectedResults:
  #           1.
  #           2.
  #           3. Ec2 provider should be successfully added again without any issues
  #   
  provider.delete()
  provider.create()
  request.addfinalizer(provider.delete_if_exists)
  provider.refresh_provider_relationships()
  provider.validate_stats(ui: true)
end
def test_deploy_instance_with_ssh_addition_template(setup_provider, instance_with_ssh_addition_template)
  # 
  #   Requirement: EC2 provider
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. Provision an instance
  #           2. Select Choose Automatically in Environment -> Placement
  #           3. Select SSH key addition template in Customize -> Customize Template
  #           4. Provision instance
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. Instance should be provisioned without any errors
  #   
  if is_bool(!instance_with_ssh_addition_template.exists)
    pytest.fail("Instance with ssh addition template was not created successfully!")
  end
end
def test_add_ec2_provider_with_instance_without_name()
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. Add an ec2 provider with instance without name
  #           2. Wait for refresh
  #       expectedResults:
  #           1.
  #           2. Refresh should complete without errors
  #   
  # pass
end
def test_regions_up_to_date(provider)
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/3h
  #       testSteps:
  #           1. Compare regions in AWS Console with regions for EC2 in CFME
  #       expectedResults:
  #           1. There should be same regions in CFME as in AWS Console.
  #   
  regions_provider = provider.mgmt.list_regions(verbose: true)
  view = navigate_to(CloudProvider, "Add")
  view.prov_type.fill("Amazon EC2")
  regions_cfme = view.region.all_options
  regions_cfme.pop(0)
  regions_cfme_texts = regions_cfme.map{|option| option.text}
  regions_cfme_texts = regions_cfme_texts.map{|region| region.gsub("EU", "Europe")}
  regions_not_in_cfme = Set.new(regions_provider) - Set.new(regions_cfme_texts)
  extra_regions_in_cfme = Set.new(regions_cfme_texts) - Set.new(regions_provider)
  if regions_not_in_cfme.size > 0
    pytest.fail()
  end
  if extra_regions_in_cfme.size > 0
    pytest.fail()
  end
end
def test_add_ec2_provider_with_non_default_url_endpoint()
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #       testSteps:
  #           1. Add an ec2 provider with non default url endpoint
  #           2. Wait for refresh
  #       expectedResults:
  #           1. Provider should be added with no issues
  #           2. Refresh should complete without errors
  #   
  # pass
end
def test_add_ec2_provider_with_sts_assume_role(appliance, ec2_provider_with_sts_creds)
  # 
  #   Requires:
  #       The requirement is only on EC2 side and needs to be added manually once.
  #       1. Role which has all the required permissions to manage CFME
  #       2. Edit Trust relationship policy for this role to:
  #           {
  #             \"Version\": \"2012-10-17\",
  #             \"Statement\": [
  #               {
  #                 \"Effect\": \"Allow\",
  #                 \"Principal\": {
  #                   \"AWS\": \"arn:aws:iam::NNNNNNNNNNNN:root\"
  #                 },
  #                 \"Action\": \"sts:AssumeRole\"
  #               }
  #             ]
  #           }
  #       3. Have policy with AssumeRole permission:
  #           {
  #               \"Version\": \"2012-10-17\",
  #               \"Statement\": [
  #                   {
  #                       \"Effect\": \"Allow\",
  #                       \"Action\": \"sts:AssumeRole\",
  #                       \"Resource\": \"arn:aws:iam::NNNNNNNNNNNN:role/RoleForCFME\"
  #                   }
  #               ]
  #           }
  #       4. Have an user with only attached policy created in last step
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       initialEstimate: 1/2h
  #       caseimportance: high
  #       casecomponent: Cloud
  #       testSteps:
  #           1. Go to Compute -> Cloud -> Providers
  #           2. Add EC2 Provider with these fields filled in:
  #       expectedResults:
  #           1.
  #           2. Provider should be successfully added.
  #   
  ec2_provider_with_sts_creds.create()
  ec2_provider_with_sts_creds.validate()
end
def test_add_second_provider(setup_provider, provider, request)
  # 
  #       Bugzilla: 1658207
  # 
  #       Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       initialEstimate: 1/3h
  #       caseimportance: high
  #       casecomponent: Cloud
  #       testSteps:
  #           1. Go to Compute -> Cloud -> Providers
  #           2. Add EC2 Provider
  #           3. Add another EC2 Provider
  #       expectedResults:
  #           1.
  #           2. Provider should be successfully added.
  #           3. Provider should be successfully added.
  #   
  second_provider = get_crud(provider.key)
  second_provider.name = 
  second_provider.create()
  request.addfinalizer(second_provider.delete_if_exists)
  second_provider.refresh_provider_relationships()
  second_provider.validate_stats(ui: true)
  raise unless provider.exists && second_provider.exists
end
def test_provider_compare_ec2_provider_and_backup_regions(appliance)
  # 
  #   Bugzilla:
  #       1710599
  #       1710623
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       initialEstimate: 1/6h
  #       caseimportance: medium
  #       casecomponent: Cloud
  #       testSteps:
  #           1. Go to Compute -> Cloud -> Providers -> Add a new Cloud Provider
  #           2. Select Provider: Amazon EC2 and list AWS Regions
  #           3. Go to Configuration -> Settings -> Schedules -> Add a new Schedule
  #           4. Select Action: Database Backup, Type: AWS S3 and list AWS Regions
  #           5. Go to Configuration -> Diagnostics -> Region -> Database
  #           6. Select Type: AWS S3 and list AWS Regions
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5.
  #           6. Compare all three lists. They should contain same regions.
  #   
  view = navigate_to(CloudProvider, "Add")
  view.prov_type.fill("Amazon EC2")
  regions_provider_texts = view.region.all_options.select{|option| option.text != "<Choose>"}.map{|option| option.text}
  regions_provider_texts.sort!()
  view = navigate_to(appliance.collections.system_schedules, "Add")
  view.form.action_type.fill("Database Backup")
  view.form.database_backup.backup_type.fill("AWS S3")
  regions_scheduled_backup = view.form.database_backup.backup_settings.aws_region.all_options
  regions_scheduled_backup_texts = regions_scheduled_backup.select{|option| option.text != "<Choose>"}.map{|option| option.text}
  regions_scheduled_backup_texts.sort!()
  view = navigate_to(appliance.server.zone.region, "Database")
  view.db_backup_settings.backup_type.fill("AWS S3")
  regions_immediate_backup = view.db_backup_settings.backup_settings.aws_region.all_options
  regions_immediate_backup_texts = regions_immediate_backup.select{|option| option.text != "<Choose>"}.map{|option| option.text}
  regions_immediate_backup_texts.sort!()
  raise unless regions_provider_texts == regions_scheduled_backup_texts
  raise unless regions_provider_texts == regions_immediate_backup_texts
end
def test_cloud_provider_dashboard_after_child_provider_remove(appliance, provider, request, setup_provider_funcscope, child_provider)
  # 
  #       Bugzilla: 1632750
  # 
  #       Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       initialEstimate: 1/6h
  #       caseimportance: high
  #       casecomponent: Cloud
  #       testSteps:
  #           1. Have a cloud provider added
  #           2. Delete one of its child managers
  #           3. Go to cloud provider Dashboard
  #       expectedResults:
  #           1.
  #           2.
  #           3. Dashboard should load without any issues
  #   
  child_provider.delete(cancel: false)
  _wait_for_delete_provider = lambda do
    provider.delete()
    provider.wait_for_delete()
  end
  view = navigate_to(provider, "Details")
  view.toolbar.view_selector.select("Dashboard View")
  view.wait_displayed()
  view.flash.assert_no_error()
end
