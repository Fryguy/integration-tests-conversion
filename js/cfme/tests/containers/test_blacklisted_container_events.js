require_relative("wrapanapi/systems/container/rhopenshift");
include(Wrapanapi.Systems.Container.Rhopenshift);
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(1),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

const TEST_POD = {
  kind: "Pod",
  apiVersion: "v1",

  metadata: {
    name: "hello-openshift",
    creationTimestamp: null,
    labels: {name: "hello-openshift"}
  },

  spec: {
    containers: [{
      name: "hello-openshift",
      image: "openshift/hello-openshift",
      ports: [{containerPort: 8080, protocol: "TCP"}],
      resources: {},
      volumeMounts: [{name: "tmp", mountPath: "/tmp"}],
      terminationMessagePath: "/dev/termination-log",
      imagePullPolicy: "IfNotPresent",
      capabilities: {},
      securityContext: {capabilities: {}, privileged: false}
    }],

    volumes: [{name: "tmp", emptyDir: {}}],
    restartPolicy: "Always",
    dnsPolicy: "ClusterFirst",
    serviceAccount: ""
  },

  status: {}
};

function restore_advanced_settings(appliance) {
  // Restores the Advanced Settings config
  if (appliance.version < "5.10") {
    appliance.update_advanced_settings({ems: {ems_openshift: {blacklisted_event_names: []}}})
  } else {
    appliance.update_advanced_settings({ems: {ems_openshift: {blacklisted_event_names: "<<reset>>"}}})
  }
};

function create_pod(provider, namespace) {
  // Creates OpenShift pod in provided namespace
  provider.mgmt.k_api.create_namespaced_pod({namespace, body: TEST_POD});
  let pods = provider.mgmt.list_pods({namespace});
  if (TEST_POD.metadata.name != pods[0].metadata.name) throw new ()
};

function delete_pod(provider, namespace) {
  // Delete OpenShift pod in provided namespace
  provider.mgmt.delete_pod({namespace, name: TEST_POD.metadata.name});

  wait_for(
    () => !provider.mgmt.list_pods({namespace}),
    {delay: 5, num_sec: 300, message: "waiting for pod to be deleted"}
  );

  if (!!provider.mgmt.list_pods({namespace})) throw new ()
};

function appliance_cleanup(provider, appliance, namespace) {
  // Returns the appliance and provider to the original state
  restore_advanced_settings({appliance});
  appliance.ssh_client.run_rails_console("BlacklistedEvent.where(:event_name => 'POD_CREATED').destroy_all");
  appliance.evmserverd.restart();
  appliance.wait_for_web_ui();

  try {
    delete_pod({provider, namespace});
    provider.mgmt.delete_project({name: namespace})
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof ApiException) {
      logger.info("No Container Pod or Project to delete")
    } else {
      throw $EXCEPTION
    }
  }
};

function get_blacklisted_event_names(appliance) {
  // Returns a list of Blacklisted event names
  let rails_result = appliance.ssh_client.run_rails_console("ManageIQ::Providers::Openshift::ContainerManager.first.blacklisted_event_names");
  if (!rails_result.success) throw new ();
  return rails_result.output
};

function test_blacklisted_container_events(request, appliance, provider, app_creds) {
  // 
  //       Test that verifies that container events can be blacklisted.
  // 
  //       Polarion:
  //           assignee: juwatts
  //           caseimportance: high
  //           casecomponent: Containers
  //           initialEstimate: 1/6h
  //   
  let project_name = fauxfactory.gen_alpha(8).downcase();
  provider.mgmt.create_project({name: project_name});
  provider.mgmt.wait_project_exist({name: project_name});

  request.addfinalizer(() => (
    appliance_cleanup({provider, appliance, namespace: project_name})
  ));

  let evm_tail_no_blacklist = LogValidator(
    "/var/www/miq/vmdb/log/evm.log",
    {matched_patterns: [".*event\\_type\\=\\>\\\"POD\\_CREATED\\\".*"]}
  );

  evm_tail_no_blacklist.start_monitoring();
  create_pod({provider, namespace: project_name});
  let rails_result_no_blacklist = get_blacklisted_event_names(appliance);
  if (!!rails_result_no_blacklist.include("POD_CREATED")) throw new ();
  if (!evm_tail_no_blacklist.validate()) throw new ();
  delete_pod({provider, namespace: project_name});
  appliance.update_advanced_settings({ems: {ems_openshift: {blacklisted_event_names: ["POD_CREATED"]}}});
  appliance.evmserverd.restart();
  appliance.wait_for_web_ui();
  let rails_result_blacklist = get_blacklisted_event_names(appliance);
  if (!rails_result_blacklist.include("POD_CREATED")) throw new ();

  let evm_tail_blacklist = LogValidator(
    "/var/www/miq/vmdb/log/evm.log",

    {
      failure_patterns: [".*event\\_type\\=\\>\\\"POD\\_CREATED\\\".*"],
      hostname: appliance.hostname,
      username: app_creds.sshlogin,
      password: app_creds.password
    }
  );

  evm_tail_blacklist.start_monitoring();
  create_pod({provider, namespace: project_name});
  if (!evm_tail_blacklist.validate()) throw new ();
  delete_pod({provider, namespace: project_name});
  restore_advanced_settings({appliance});
  let rails_destroy_blacklist = appliance.ssh_client.run_rails_console("BlacklistedEvent.where(:event_name => 'POD_CREATED').destroy_all");
  if (!rails_destroy_blacklist.success) throw new ();
  let rails_result_default = get_blacklisted_event_names(appliance);
  if (!!rails_result_default.include("POD_CREATED")) throw new ();
  appliance.evmserverd.restart();
  appliance.wait_for_web_ui();
  evm_tail_no_blacklist.start_monitoring();
  create_pod({provider, namespace: project_name});
  if (!evm_tail_no_blacklist.validate({wait: "120s"})) throw new ()
}
