require_relative 'widgetastic/widget'
include Widgetastic::Widget
require_relative 'widgetastic/widget'
include Widgetastic::Widget
require_relative 'widgetastic/widget'
include Widgetastic::Widget
require_relative 'widgetastic/widget'
include Widgetastic::Widget
require_relative 'widgetastic/widget'
include Widgetastic::Widget
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
require_relative 'widgetastic_patternfly'
include Widgetastic_patternfly
OBJ_TYPE = ["AZONE", "CLOUD_NETWORK", "CLOUD_OBJECT_STORE_CONTAINER", "CLOUD_SUBNET", "CLOUD_TENANT", "CLOUD_VOLUME", "CLUSTERS", "CONTAINER_IMAGES", "CONTAINER_NODES", "CONTAINER_PODS", "CONTAINER_PROJECTS", "CONTAINER_TEMPLATES", "CONTAINER_VOLUMES", "DATASTORES", "GROUP", "USER", "GENERIC", "HOSTS", "LOAD_BALANCER", "ROUTER", "ORCHESTRATION_STACK", "PROVIDER", "SECURITY_GROUP", "SERVICE", "SWITCH", "TENANT", "TEMPLATE_IMAGE", "VM_INSTANCE"]
CLASS_MAP = {"AZONE" => {"ui" => "Availability Zone", "rest" => "AvailabilityZone"}, "CLOUD_NETWORK" => {"ui" => "Cloud Network", "rest" => "CloudNetwork"}, "CLOUD_OBJECT_STORE_CONTAINER" => {"ui" => "Cloud Object Store Container", "rest" => "CloudObjectStoreContainer"}, "CLOUD_SUBNET" => {"ui" => "Cloud Subnet", "rest" => "CloudSubnet"}, "CLOUD_TENANT" => {"ui" => "Cloud Tenant", "rest" => "CloudTenant"}, "CLOUD_VOLUME" => {"ui" => "Cloud Volume", "rest" => "CloudVolume"}, "CLUSTERS" => {"ui" => "Cluster / Deployment Role", "rest" => "EmsCluster"}, "CONTAINER_IMAGES" => {"ui" => "Container Image", "rest" => "ContainerImage"}, "CONTAINER_NODES" => {"ui" => "Container Node", "rest" => "ContainerNode"}, "CONTAINER_PODS" => {"ui" => "Container Pod", "rest" => "ContainerGroup"}, "CONTAINER_PROJECTS" => {"ui" => "Container Project", "rest" => "ContainerProject"}, "CONTAINER_TEMPLATES" => {"ui" => "Container Template", "rest" => "ContainerTemplate"}, "CONTAINER_VOLUMES" => {"ui" => "Container Volume", "rest" => "ContainerVolume"}, "DATASTORES" => {"ui" => "Datastore", "rest" => "Storage"}, "GROUP" => {"ui" => "Group", "rest" => "MiqGroup"}, "USER" => {"ui" => "User", "rest" => "User"}, "GENERIC" => {"ui" => "Generic Object", "rest" => "GenericObject"}, "HOSTS" => {"ui" => "Host / Node", "rest" => "Host"}, "LOAD_BALANCER" => {"ui" => "Load Balancer", "rest" => "LoadBalancer"}, "ROUTER" => {"ui" => "Network Router", "rest" => "NetworkRouter"}, "ORCHESTRATION_STACK" => {"ui" => "Orchestration Stack", "rest" => "OrchestrationStack"}, "PROVIDER" => {"ui" => "Provider", "rest" => "ExtManagementSystem"}, "SECURITY_GROUP" => {"ui" => "Security Group", "rest" => "SecurityGroup"}, "SERVICE" => {"ui" => "Service", "rest" => "Service"}, "SWITCH" => {"ui" => "Virtual Infra Switch", "rest" => "Switch"}, "TENANT" => {"ui" => "Tenant", "rest" => "Tenant"}, "TEMPLATE_IMAGE" => {"ui" => "VM Template and Image", "rest" => "MiqTemplate"}, "VM_INSTANCE" => {"ui" => "VM and Instance", "rest" => "Vm"}}
def check_log_requests_count(appliance, parse_str: nil)
  #  Method for checking number of requests count in automation log
  # 
  #   Args:
  #       appliance: an appliance for ssh
  #       parse_str: string check-in automation log
  # 
  #   Return: requests string count
  #   
  if is_bool(!parse_str)
    parse_str = "Attributes - Begin"
  end
  count = appliance.ssh_client.run_command()
  return count.output.to_i
end
def log_request_check(appliance, expected_count)
  #  Method for checking expected request count in automation log
  # 
  #   Args:
  #       appliance: an appliance for ssh
  #       expected_count: expected request count in automation log
  #   
  return check_log_requests_count(appliance: appliance) == expected_count
end
class TextInputDialogView < View
  #  This is view comes on different custom button objects for dialog execution
  @@title = Text("#explorer_title_text")
  @@service_name = TextInput(id: "service_name")
  @@submit = Button("Submit")
  @@cancel = Button("Cancel")
  def is_displayed()
    return @submit.is_displayed && @service_name.is_displayed
  end
  def self.title; @@title; end
  def self.title=(val); @@title=val; end
  def title; @title = @@title if @title.nil?; @title; end
  def title=(val); @title=val; end
  def self.service_name; @@service_name; end
  def self.service_name=(val); @@service_name=val; end
  def service_name; @service_name = @@service_name if @service_name.nil?; @service_name; end
  def service_name=(val); @service_name=val; end
  def self.submit; @@submit; end
  def self.submit=(val); @@submit=val; end
  def submit; @submit = @@submit if @submit.nil?; @submit; end
  def submit=(val); @submit=val; end
  def self.cancel; @@cancel; end
  def self.cancel=(val); @@cancel=val; end
  def cancel; @cancel = @@cancel if @cancel.nil?; @cancel; end
  def cancel=(val); @cancel=val; end
end
class TextInputAutomateView < View
  # This is view comes on clicking custom button
  @@title = Text("#explorer_title_text")
  @@text_box1 = TextInput(id: "text_box_1")
  @@text_box2 = TextInput(id: "text_box_2")
  @@submit = Button("Submit")
  @@cancel = Button("Cancel")
  def is_displayed()
    return @submit.is_displayed && @text_box1.is_displayed && @text_box2.is_displayed
  end
  def self.title; @@title; end
  def self.title=(val); @@title=val; end
  def title; @title = @@title if @title.nil?; @title; end
  def title=(val); @title=val; end
  def self.text_box1; @@text_box1; end
  def self.text_box1=(val); @@text_box1=val; end
  def text_box1; @text_box1 = @@text_box1 if @text_box1.nil?; @text_box1; end
  def text_box1=(val); @text_box1=val; end
  def self.text_box2; @@text_box2; end
  def self.text_box2=(val); @@text_box2=val; end
  def text_box2; @text_box2 = @@text_box2 if @text_box2.nil?; @text_box2; end
  def text_box2=(val); @text_box2=val; end
  def self.submit; @@submit; end
  def self.submit=(val); @@submit=val; end
  def submit; @submit = @@submit if @submit.nil?; @submit; end
  def submit=(val); @submit=val; end
  def self.cancel; @@cancel; end
  def self.cancel=(val); @@cancel=val; end
  def cancel; @cancel = @@cancel if @cancel.nil?; @cancel; end
  def cancel=(val); @cancel=val; end
end
class CredsHostsDialogView < View
  # This view for custom button default ansible playbook dialog
  @@machine_credential = BootstrapSelect(locator: ".//select[@id='credential']//parent::div")
  @@hosts = TextInput(id: "hosts")
  @@submit = Button("Submit")
  @@cancel = Button("Cancel")
  def is_displayed()
    return @submit.is_displayed && @machine_credential.is_displayed
  end
  def self.machine_credential; @@machine_credential; end
  def self.machine_credential=(val); @@machine_credential=val; end
  def machine_credential; @machine_credential = @@machine_credential if @machine_credential.nil?; @machine_credential; end
  def machine_credential=(val); @machine_credential=val; end
  def self.hosts; @@hosts; end
  def self.hosts=(val); @@hosts=val; end
  def hosts; @hosts = @@hosts if @hosts.nil?; @hosts; end
  def hosts=(val); @hosts=val; end
  def self.submit; @@submit; end
  def self.submit=(val); @@submit=val; end
  def submit; @submit = @@submit if @submit.nil?; @submit; end
  def submit=(val); @submit=val; end
  def self.cancel; @@cancel; end
  def self.cancel=(val); @@cancel=val; end
  def cancel; @cancel = @@cancel if @cancel.nil?; @cancel; end
  def cancel=(val); @cancel=val; end
end
class TextInputDialogSSUIView < TextInputDialogView
  #  This is view comes on SSUI custom button dialog execution
  @@submit = Button("Submit Request")
  def self.submit; @@submit; end
  def self.submit=(val); @@submit=val; end
  def submit; @submit = @@submit if @submit.nil?; @submit; end
  def submit=(val); @submit=val; end
end
class DropdownDialogView < ParametrizedView
  #  This is custom view for custom button dropdown dialog execution
  @@title = Text("#explorer_title_text")
  class Service_name < ParametrizedView
    @@PARAMETERS = ["dialog_id"]
    @@dropdown = BootstrapSelect(locator: ParametrizedLocator("//select[@id={dialog_id|quote}]/.."))
    def self.PARAMETERS; @@PARAMETERS; end
    def self.PARAMETERS=(val); @@PARAMETERS=val; end
    def PARAMETERS; @PARAMETERS = @@PARAMETERS if @PARAMETERS.nil?; @PARAMETERS; end
    def PARAMETERS=(val); @PARAMETERS=val; end
    def self.dropdown; @@dropdown; end
    def self.dropdown=(val); @@dropdown=val; end
    def dropdown; @dropdown = @@dropdown if @dropdown.nil?; @dropdown; end
    def dropdown=(val); @dropdown=val; end
  end
  @@submit = Button("Submit")
  @@submit_request = Button("Submit Request")
  @@cancel = Button("Cancel")
  def self.submit; @@submit; end
  def self.submit=(val); @@submit=val; end
  def submit; @submit = @@submit if @submit.nil?; @submit; end
  def submit=(val); @submit=val; end
  def self.submit_request; @@submit_request; end
  def self.submit_request=(val); @@submit_request=val; end
  def submit_request; @submit_request = @@submit_request if @submit_request.nil?; @submit_request; end
  def submit_request=(val); @submit_request=val; end
  def self.cancel; @@cancel; end
  def self.cancel=(val); @@cancel=val; end
  def cancel; @cancel = @@cancel if @cancel.nil?; @cancel; end
  def cancel=(val); @cancel=val; end
end
class CustomButtonSSUIDropdwon < Dropdown
  # This is workaround for custom button Dropdown in SSUI item_enabled method
  def item_enabled(item)
    @_verify_enabled.()
    el = @item_element.(item)
    return !@browser.classes(el).include?("disabled")
  end
end
