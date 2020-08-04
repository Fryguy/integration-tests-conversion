// Runs Provisioning Workload.
require_relative("itertools");
include(Itertools);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/grafana");
include(Cfme.Utils.Grafana);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/rest");
include(Cfme.Utils.Rest);
require_relative("cfme/utils/smem_memory_monitor");
include(Cfme.Utils.Smem_memory_monitor);
require_relative("cfme/utils/smem_memory_monitor");
include(Cfme.Utils.Smem_memory_monitor);
require_relative("cfme/utils/smem_memory_monitor");
include(Cfme.Utils.Smem_memory_monitor);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/workloads");
include(Cfme.Utils.Workloads);

let roles_provisioning = [
  "automate",
  "database_operations",
  "ems_inventory",
  "ems_operations",
  "event",
  "notifier",
  "reporting",
  "scheduler",
  "user_interface",
  "web_services"
];

let roles_provisioning_cleanup = [
  "database_operations",
  "ems_inventory",
  "ems_operations",
  "event",
  "notifier",
  "reporting",
  "scheduler",
  "user_interface",
  "web_services"
];

function get_provision_data(rest_api, provider, template_name, { auto_approve = true }) {
  let templates = rest_api.collections.templates.find_by({name: template_name});
  let __dummy0__ = false;

  for (let template in templates) {
    try {
      let ems_id = template.ems_id
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof NoMethodError) {
        continue
      } else {
        throw $EXCEPTION
      }
    };

    if (ems_id == provider.id) {
      let guid = template.guid;
      break
    };

    if (template == templates[-1]) __dummy0__ = true
  };

  if (__dummy0__) {
    throw new Exception(`No such template ${template_name} on provider!`)
  };

  let result = {
    version: "1.1",
    template_fields: {guid: guid},

    vm_fields: {
      number_of_cpus: 1,
      vm_name: fauxfactory.gen_alphanumeric(20, {start: "test_rest_prov_"}),
      vm_memory: "2048",
      vlan: provider.data.provisioning.vlan
    },

    requester: {
      user_name: "admin",
      owner_first_name: "John",
      owner_last_name: "Doe",
      owner_email: "jdoe@sample.com",
      auto_approve: auto_approve
    },

    tags: {network_location: "Internal", cc: "001"},
    additional_values: {request_id: "1001"},
    ems_custom_attributes: {},
    miq_custom_attributes: {}
  };

  if (is_bool(provider.one_of(RHEVMProvider))) {
    result.vm_fields.provision_type = "native_clone"
  };

  return result
};

function test_provisioning(appliance, request, scenario) {
  // Runs through provisioning scenarios using the REST API to
  //   continously provision a VM for a specified period of time.
  //   Memory Monitor creates graphs and summary at the end of each scenario.
  // 
  //   Polarion:
  //       assignee: rhcf3_machine
  //       casecomponent: Provisioning
  //       initialEstimate: 1/4h
  //   
  let from_ts = (time.time() * 1000).to_i;
  logger.debug("Scenario: {}".format(scenario.name));
  appliance.clean_appliance();
  let quantifiers = {};

  let scenario_data = {
    appliance_ip: appliance.hostname,
    appliance_name: cfme_performance.appliance.appliance_name,
    test_dir: "workload-provisioning",
    test_name: "Provisioning",
    appliance_roles: roles_provisioning.join(", "),
    scenario: scenario
  };

  let monitor_thread = SmemMemoryMonitor(
    appliance.ssh_client(),
    scenario_data
  );

  let provision_order = [];

  let cleanup_workload = (scenario, from_ts, vms_to_cleanup, quantifiers, scenario_data) => {
    let starttime = time.time();
    let to_ts = (starttime * 1000).to_i;
    let g_urls = get_scenario_dashboard_urls(scenario, from_ts, to_ts);
    logger.debug("Started cleaning up monitoring thread.");

    appliance.update_server_roles(roles_provisioning_cleanup.map(role => (
      [role, true]
    )).to_h);

    monitor_thread.grafana_urls = g_urls;
    monitor_thread.signal = false;
    let final_vm_size = vms_to_cleanup.size;
    appliance.rest_api.collections.vms.action.delete(vms_to_cleanup).monitor_thread.join;

    logger.info("{} VMs were left over, and {} VMs were deleted in the finalizer.".format(
      final_vm_size,
      final_vm_size - vms_to_cleanup.size
    ));

    logger.info("The following VMs were left over after the test: {}".format(vms_to_cleanup));
    quantifiers.VMs_To_Delete_In_Finalizer = final_vm_size;
    quantifiers.VMs_Deleted_In_Finalizer = final_vm_size - vms_to_cleanup.size;
    quantifiers.Leftover_VMs = vms_to_cleanup;
    add_workload_quantifiers(quantifiers, scenario_data);
    let timediff = time.time() - starttime;
    return logger.info(`Finished cleaning up monitoring thread in ${timediff}`)
  };

  request.addfinalizer(() => (
    cleanup_workload.call(
      scenario,
      from_ts,
      vm_name,
      quantifiers,
      scenario_data
    )
  ));

  monitor_thread.start();
  appliance.wait_for_miq_server_workers_started({poll_interval: 2});
  appliance.update_server_roles(roles_provisioning.map(role => [role, true]).to_h);
  let prov = get_crud(scenario.providers[0]);
  prov.create_rest();
  logger.info("Sleeping for Refresh: {}s".format(scenario.refresh_sleep_time));
  time.sleep(scenario.refresh_sleep_time);
  let guid_list = prov.get_template_guids(scenario.templates);
  let guid_cycle = cycle(guid_list);
  let cleanup_size = scenario.cleanup_size;
  let number_of_vms = scenario.number_of_vms;
  let total_time = scenario.total_time;
  let time_between_provision = scenario.time_between_provision;
  let total_provisioned_vms = 0;
  let total_deleted_vms = 0;
  let provisioned_vms = 0;
  let starttime = time.time();

  while (time.time() - starttime < total_time) {
    let start_iteration_time = time.time();
    let provision_list = [];

    for (let i in number_of_vms.times) {
      total_provisioned_vms++;
      provisioned_vms++;

      let vm_to_provision = ("test-{}-prov-{}").format(
        test_ts,
        total_provisioned_vms.to_s.zfill(4)
      );

      let [guid_to_provision, provider_name] = guid_cycle // next;
      provision_order.push([vm_to_provision, provider_name]);

      provision_list.push([
        vm_to_provision,
        guid_to_provision,
        prov.data.provisioning.vlan
      ])
    };

    let template = prov.data.templates.get("small_template");

    let provision_data = get_provision_data(
      appliance.rest_api,
      prov,
      template.name
    );

    vm_name = provision_data.vm_fields.vm_name;
    let response = appliance.rest_api.collections.provision_requests.action.create({None: provision_data});
    assert_response(appliance);
    let provision_request = response[0];

    let _finished = () => {
      provision_request.reload();

      if (provision_request.status.downcase().include("error")) {
        pytest.fail(`Error when provisioning: `${provision_request.message}``)
      };

      return ["finished", "provisioned"].include(provision_request.request_state.downcase())
    };

    wait_for(
      method("_finished"),
      {num_sec: 800, delay: 5, message: "REST provisioning finishes"}
    );

    let vm = appliance.rest_api.collections.vms.get({name: vm_name});
    let creation_time = time.time();
    let provision_time = round(creation_time - start_iteration_time, 2);
    logger.debug(`Time to initiate provisioning: ${provision_time}`);
    logger.info(`${total_provisioned_vms} VMs provisioned so far`);

    if (provisioned_vms > cleanup_size * scenario.providers.size) {
      let start_remove_time = time.time();

      if (is_bool(appliance.rest_api.collections.vms.action.delete(vm))) {
        provision_order.pop(0);
        provisioned_vms--;
        total_deleted_vms++
      };

      let deletion_time = round(time.time() - start_remove_time, 2);
      logger.debug(`Time to initate deleting: ${deletion_time}`);
      logger.info(`${total_deleted_vms} VMs deleted so far`)
    };

    let end_iteration_time = time.time();

    let iteration_time = round(
      end_iteration_time - start_iteration_time,
      2
    );

    let elapsed_time = end_iteration_time - starttime;
    logger.debug(`Time to initiate provisioning and deletion: ${iteration_time}`);

    logger.info(("Time elapsed: {}/{}").format(
      round(elapsed_time, 2),
      total_time
    ));

    if (iteration_time < time_between_provision) {
      let wait_diff = time_between_provision - iteration_time;
      let time_remaining = total_time - elapsed_time;

      if (is_bool(time_remaining > 0 && time_remaining < time_between_provision)) {
        time.sleep(time_remaining)
      } else if (time_remaining > 0) {
        time.sleep(wait_diff)
      } else {
        logger.warning("Time to initiate provisioning ({}) exceeded time between ({})".format(
          iteration_time,
          time_between_provision
        ))
      }
    }
  };

  quantifiers.Elapsed_Time = round(time.time() - starttime, 2);
  quantifiers.Queued_VM_Provisionings = total_provisioned_vms;
  quantifiers.Deleted_VMs = total_deleted_vms;

  logger.info("Provisioned {} VMs and deleted {} VMs during the scenario.".format(
    total_provisioned_vms,
    total_deleted_vms
  ));

  logger.info("Test Ending...")
}
