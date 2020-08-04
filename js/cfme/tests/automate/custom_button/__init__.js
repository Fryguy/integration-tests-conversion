require_relative("widgetastic/widget");
include(Widgetastic.Widget);
require_relative("widgetastic/widget");
include(Widgetastic.Widget);
require_relative("widgetastic/widget");
include(Widgetastic.Widget);
require_relative("widgetastic/widget");
include(Widgetastic.Widget);
require_relative("widgetastic/widget");
include(Widgetastic.Widget);
require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);
require_relative("widgetastic_patternfly");
include(Widgetastic_patternfly);

const OBJ_TYPE = [
  "AZONE",
  "CLOUD_NETWORK",
  "CLOUD_OBJECT_STORE_CONTAINER",
  "CLOUD_SUBNET",
  "CLOUD_TENANT",
  "CLOUD_VOLUME",
  "CLUSTERS",
  "CONTAINER_IMAGES",
  "CONTAINER_NODES",
  "CONTAINER_PODS",
  "CONTAINER_PROJECTS",
  "CONTAINER_TEMPLATES",
  "CONTAINER_VOLUMES",
  "DATASTORES",
  "GROUP",
  "USER",
  "GENERIC",
  "HOSTS",
  "LOAD_BALANCER",
  "ROUTER",
  "ORCHESTRATION_STACK",
  "PROVIDER",
  "SECURITY_GROUP",
  "SERVICE",
  "SWITCH",
  "TENANT",
  "TEMPLATE_IMAGE",
  "VM_INSTANCE"
];

const CLASS_MAP = {
  AZONE: {ui: "Availability Zone", rest: "AvailabilityZone"},
  CLOUD_NETWORK: {ui: "Cloud Network", rest: "CloudNetwork"},

  CLOUD_OBJECT_STORE_CONTAINER: {
    ui: "Cloud Object Store Container",
    rest: "CloudObjectStoreContainer"
  },

  CLOUD_SUBNET: {ui: "Cloud Subnet", rest: "CloudSubnet"},
  CLOUD_TENANT: {ui: "Cloud Tenant", rest: "CloudTenant"},
  CLOUD_VOLUME: {ui: "Cloud Volume", rest: "CloudVolume"},
  CLUSTERS: {ui: "Cluster / Deployment Role", rest: "EmsCluster"},
  CONTAINER_IMAGES: {ui: "Container Image", rest: "ContainerImage"},
  CONTAINER_NODES: {ui: "Container Node", rest: "ContainerNode"},
  CONTAINER_PODS: {ui: "Container Pod", rest: "ContainerGroup"},

  CONTAINER_PROJECTS: {
    ui: "Container Project",
    rest: "ContainerProject"
  },

  CONTAINER_TEMPLATES: {
    ui: "Container Template",
    rest: "ContainerTemplate"
  },

  CONTAINER_VOLUMES: {ui: "Container Volume", rest: "ContainerVolume"},
  DATASTORES: {ui: "Datastore", rest: "Storage"},
  GROUP: {ui: "Group", rest: "MiqGroup"},
  USER: {ui: "User", rest: "User"},
  GENERIC: {ui: "Generic Object", rest: "GenericObject"},
  HOSTS: {ui: "Host / Node", rest: "Host"},
  LOAD_BALANCER: {ui: "Load Balancer", rest: "LoadBalancer"},
  ROUTER: {ui: "Network Router", rest: "NetworkRouter"},

  ORCHESTRATION_STACK: {
    ui: "Orchestration Stack",
    rest: "OrchestrationStack"
  },

  PROVIDER: {ui: "Provider", rest: "ExtManagementSystem"},
  SECURITY_GROUP: {ui: "Security Group", rest: "SecurityGroup"},
  SERVICE: {ui: "Service", rest: "Service"},
  SWITCH: {ui: "Virtual Infra Switch", rest: "Switch"},
  TENANT: {ui: "Tenant", rest: "Tenant"},
  TEMPLATE_IMAGE: {ui: "VM Template and Image", rest: "MiqTemplate"},
  VM_INSTANCE: {ui: "VM and Instance", rest: "Vm"}
};

function check_log_requests_count(appliance, { parse_str = null }) {
  //  Method for checking number of requests count in automation log
  // 
  //   Args:
  //       appliance: an appliance for ssh
  //       parse_str: string check-in automation log
  // 
  //   Return: requests string count
  //   
  if (is_bool(!parse_str)) parse_str = "Attributes - Begin";
  let count = appliance.ssh_client.run_command(`grep -c -w '${parse_str}' /var/www/miq/vmdb/log/automation.log`);
  return count.output.to_i
};

function log_request_check(appliance, expected_count) {
  //  Method for checking expected request count in automation log
  // 
  //   Args:
  //       appliance: an appliance for ssh
  //       expected_count: expected request count in automation log
  //   
  return check_log_requests_count({appliance}) == expected_count
};

class TextInputDialogView extends View {
  #cancel;
  #service_name;
  #submit;
  #title;

  //  This is view comes on different custom button objects for dialog execution
  static #title = Text("#explorer_title_text");
  static #service_name = TextInput({id: "service_name"});
  static #submit = Button("Submit");
  static #cancel = Button("Cancel");

  is_displayed() {
    return this.#submit.is_displayed && this.#service_name.is_displayed
  };

  static get title() {
    return TextInputDialogView.#title
  };

  static set title(val) {
    TextInputDialogView.#title = val
  };

  get title() {
    if (this.#title.nil) this.#title = TextInputDialogView.#title;
    return this.#title
  };

  set title(val) {
    this.#title = val
  };

  static get service_name() {
    return TextInputDialogView.#service_name
  };

  static set service_name(val) {
    TextInputDialogView.#service_name = val
  };

  get service_name() {
    if (this.#service_name.nil) {
      this.#service_name = TextInputDialogView.#service_name
    };

    return this.#service_name
  };

  set service_name(val) {
    this.#service_name = val
  };

  static get submit() {
    return TextInputDialogView.#submit
  };

  static set submit(val) {
    TextInputDialogView.#submit = val
  };

  get submit() {
    if (this.#submit.nil) this.#submit = TextInputDialogView.#submit;
    return this.#submit
  };

  set submit(val) {
    this.#submit = val
  };

  static get cancel() {
    return TextInputDialogView.#cancel
  };

  static set cancel(val) {
    TextInputDialogView.#cancel = val
  };

  get cancel() {
    if (this.#cancel.nil) this.#cancel = TextInputDialogView.#cancel;
    return this.#cancel
  };

  set cancel(val) {
    this.#cancel = val
  }
};

class TextInputAutomateView extends View {
  #cancel;
  #submit;
  #text_box1;
  #text_box2;
  #title;

  // This is view comes on clicking custom button
  static #title = Text("#explorer_title_text");
  static #text_box1 = TextInput({id: "text_box_1"});
  static #text_box2 = TextInput({id: "text_box_2"});
  static #submit = Button("Submit");
  static #cancel = Button("Cancel");

  is_displayed() {
    return this.#submit.is_displayed && this.#text_box1.is_displayed && this.#text_box2.is_displayed
  };

  static get title() {
    return TextInputAutomateView.#title
  };

  static set title(val) {
    TextInputAutomateView.#title = val
  };

  get title() {
    if (this.#title.nil) this.#title = TextInputAutomateView.#title;
    return this.#title
  };

  set title(val) {
    this.#title = val
  };

  static get text_box1() {
    return TextInputAutomateView.#text_box1
  };

  static set text_box1(val) {
    TextInputAutomateView.#text_box1 = val
  };

  get text_box1() {
    if (this.#text_box1.nil) this.#text_box1 = TextInputAutomateView.#text_box1;
    return this.#text_box1
  };

  set text_box1(val) {
    this.#text_box1 = val
  };

  static get text_box2() {
    return TextInputAutomateView.#text_box2
  };

  static set text_box2(val) {
    TextInputAutomateView.#text_box2 = val
  };

  get text_box2() {
    if (this.#text_box2.nil) this.#text_box2 = TextInputAutomateView.#text_box2;
    return this.#text_box2
  };

  set text_box2(val) {
    this.#text_box2 = val
  };

  static get submit() {
    return TextInputAutomateView.#submit
  };

  static set submit(val) {
    TextInputAutomateView.#submit = val
  };

  get submit() {
    if (this.#submit.nil) this.#submit = TextInputAutomateView.#submit;
    return this.#submit
  };

  set submit(val) {
    this.#submit = val
  };

  static get cancel() {
    return TextInputAutomateView.#cancel
  };

  static set cancel(val) {
    TextInputAutomateView.#cancel = val
  };

  get cancel() {
    if (this.#cancel.nil) this.#cancel = TextInputAutomateView.#cancel;
    return this.#cancel
  };

  set cancel(val) {
    this.#cancel = val
  }
};

class CredsHostsDialogView extends View {
  #cancel;
  #hosts;
  #machine_credential;
  #submit;

  // This view for custom button default ansible playbook dialog
  static #machine_credential = BootstrapSelect({locator: ".//select[@id='credential']//parent::div"});
  static #hosts = TextInput({id: "hosts"});
  static #submit = Button("Submit");
  static #cancel = Button("Cancel");

  is_displayed() {
    return this.#submit.is_displayed && this.#machine_credential.is_displayed
  };

  static get machine_credential() {
    return CredsHostsDialogView.#machine_credential
  };

  static set machine_credential(val) {
    CredsHostsDialogView.#machine_credential = val
  };

  get machine_credential() {
    if (this.#machine_credential.nil) {
      this.#machine_credential = CredsHostsDialogView.#machine_credential
    };

    return this.#machine_credential
  };

  set machine_credential(val) {
    this.#machine_credential = val
  };

  static get hosts() {
    return CredsHostsDialogView.#hosts
  };

  static set hosts(val) {
    CredsHostsDialogView.#hosts = val
  };

  get hosts() {
    if (this.#hosts.nil) this.#hosts = CredsHostsDialogView.#hosts;
    return this.#hosts
  };

  set hosts(val) {
    this.#hosts = val
  };

  static get submit() {
    return CredsHostsDialogView.#submit
  };

  static set submit(val) {
    CredsHostsDialogView.#submit = val
  };

  get submit() {
    if (this.#submit.nil) this.#submit = CredsHostsDialogView.#submit;
    return this.#submit
  };

  set submit(val) {
    this.#submit = val
  };

  static get cancel() {
    return CredsHostsDialogView.#cancel
  };

  static set cancel(val) {
    CredsHostsDialogView.#cancel = val
  };

  get cancel() {
    if (this.#cancel.nil) this.#cancel = CredsHostsDialogView.#cancel;
    return this.#cancel
  };

  set cancel(val) {
    this.#cancel = val
  }
};

class TextInputDialogSSUIView extends TextInputDialogView {
  #submit;

  //  This is view comes on SSUI custom button dialog execution
  static #submit = Button("Submit Request");

  static get submit() {
    return TextInputDialogSSUIView.#submit
  };

  static set submit(val) {
    TextInputDialogSSUIView.#submit = val
  };

  get submit() {
    if (this.#submit.nil) this.#submit = TextInputDialogSSUIView.#submit;
    return this.#submit
  };

  set submit(val) {
    this.#submit = val
  }
};

class DropdownDialogView extends ParametrizedView {
  static #PARAMETERS;
  static #dropdown;
  #PARAMETERS;
  #cancel;
  #dropdown;
  #submit;
  #submit_request;

  //  This is custom view for custom button dropdown dialog execution
  static #title = Text("#explorer_title_text");
  static #submit = Button("Submit");
  static #submit_request = Button("Submit Request");
  static #cancel = Button("Cancel");

  static get submit() {
    return DropdownDialogView.#submit
  };

  static set submit(val) {
    DropdownDialogView.#submit = val
  };

  get submit() {
    if (this.#submit.nil) this.#submit = DropdownDialogView.#submit;
    return this.#submit
  };

  set submit(val) {
    this.#submit = val
  };

  static get submit_request() {
    return DropdownDialogView.#submit_request
  };

  static set submit_request(val) {
    DropdownDialogView.#submit_request = val
  };

  get submit_request() {
    if (this.#submit_request.nil) {
      this.#submit_request = DropdownDialogView.#submit_request
    };

    return this.#submit_request
  };

  set submit_request(val) {
    this.#submit_request = val
  };

  static get cancel() {
    return DropdownDialogView.#cancel
  };

  static set cancel(val) {
    DropdownDialogView.#cancel = val
  };

  get cancel() {
    if (this.#cancel.nil) this.#cancel = DropdownDialogView.#cancel;
    return this.#cancel
  };

  set cancel(val) {
    this.#cancel = val
  }
};

DropdownDialogView.Service_name = class extends ParametrizedView {
  #PARAMETERS;
  #dropdown;
  static #PARAMETERS = ["dialog_id"];
  static #dropdown = BootstrapSelect({locator: ParametrizedLocator("//select[@id={dialog_id|quote}]/..")});

  static get PARAMETERS() {
    return DropdownDialogView.Service_name.#PARAMETERS
  };

  static set PARAMETERS(val) {
    DropdownDialogView.Service_name.#PARAMETERS = val
  };

  get PARAMETERS() {
    if (this.#PARAMETERS.nil) {
      this.#PARAMETERS = DropdownDialogView.Service_name.#PARAMETERS
    };

    return this.#PARAMETERS
  };

  set PARAMETERS(val) {
    this.#PARAMETERS = val
  };

  static get dropdown() {
    return DropdownDialogView.Service_name.#dropdown
  };

  static set dropdown(val) {
    DropdownDialogView.Service_name.#dropdown = val
  };

  get dropdown() {
    if (this.#dropdown.nil) {
      this.#dropdown = DropdownDialogView.Service_name.#dropdown
    };

    return this.#dropdown
  };

  set dropdown(val) {
    this.#dropdown = val
  }
};

class CustomButtonSSUIDropdwon extends Dropdown {
  #_verify_enabled;
  #browser;
  #item_element;

  // This is workaround for custom button Dropdown in SSUI item_enabled method
  item_enabled(item) {
    this.#_verify_enabled.call();
    let el = this.#item_element.call(item);
    return !this.#browser.classes(el).include("disabled")
  }
}
