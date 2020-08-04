require("None");
require_relative("cfme/fixtures/cli");
include(Cfme.Fixtures.Cli);
require_relative("cfme/fixtures/cli");
include(Cfme.Fixtures.Cli);
require_relative("cfme/fixtures/cli");
include(Cfme.Fixtures.Cli);
require_relative("cfme/fixtures/cli");
include(Cfme.Fixtures.Cli);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/test_framework/sprout/client");
include(Cfme.Test_framework.Sprout.Client);
require_relative("cfme/test_framework/sprout/client");
include(Cfme.Test_framework.Sprout.Client);
require_relative("cfme/utils/appliance");
include(Cfme.Utils.Appliance);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/version");
include(Cfme.Utils.Version);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

const TimedCommand = namedtuple(
  "TimedCommand",
  ["command", "timeout"]
);

let pytestmark = [pytest.mark.uncollectif(
  appliance => appliance.is_pod,
  {reason: "pod appliance should be updated thru openshift mechanism"}
)];

function pytest_generate_tests(metafunc) {
  // The following lines generate appliance versions based from the current build.
  //   Appliance version is split and z-version is picked out for generating each version
  //   and appending it to the empty versions list
  let version = find_appliance(metafunc).version;
  let versions = [];
  let old_version_pytest_arg = metafunc.config.getoption("old_version");

  if (old_version_pytest_arg == "same") {
    versions.push(version)
  } else if (old_version_pytest_arg === null) {
    let split_ver = version.to_s.split_p(".");

    try {
      let z_version = split_ver[2].to_i
    } catch (e) {
      if (e instanceof [IndexError, TypeError]) {
        logger.exception("Couldn't parse version: %s, skipping", e);

        versions.push(pytest.param(
          `bad:${version}`,
          {marks: pytest.mark.uncollect({reason: `Could not parse z_version from: ${version}`})}
        ))
      } else {
        throw e
      }
    }
  } else {
    versions.push(old_version_pytest_arg)
  };

  metafunc.parametrize("old_version", versions, {indirect: true})
};

function old_version(request) {
  return request.param
};

function appliance_preupdate(old_version, appliance, request) {
  let series = appliance.version.series();
  let update_url = "update_url_{}".format(series.gsub(".", ""));

  // Requests appliance from sprout based on old_versions, edits partitions and adds
  //   repo file for update
  let usable = [];

  let sprout = SproutClient.from_config({sprout_user_key: request.config.getoption(
    "sprout_user_key",
    {default: null}
  ) || null});

  let available_versions = new Set(sprout.call_method("available_cfme_versions"));

  for (let a in available_versions) {
    if (is_bool(a.startswith(old_version))) usable.push(Version(a))
  };

  usable.sort({reverse: true});

  try {
    let [apps, pool_id] = sprout.provision_appliances({
      count: 1,
      preconfigured: true,
      lease_time: 180,
      version: usable[0].to_s
    })
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof AuthException) {
      let msg = ("Sprout credentials key or yaml maps missing or invalid,unable to provision appliance version %s for preupdate").format(usable[0].to_s);
      logger.exception(msg);
      pytest.skip(msg)
    } else {
      throw $EXCEPTION
    }
  };

  apps[0].db.extend_partition();
  let urls = cfme_data.basic_info[update_url];
  apps[0].ssh_client.run_command(`curl ${urls} -o /etc/yum.repos.d/update.repo`);

  logger.info(
    `Appliance update.repo file: \n%s`,
    (apps[0].ssh_client.run_command("cat /etc/yum.repos.d/update.repo")).output
  );

  yield(apps[0]);
  apps[0].ssh_client.close();
  sprout.destroy_pool(pool_id)
};

function do_yum_update(appliance) {
  appliance.evmserverd.stop();

  appliance.ssh_client((ssh) => {
    let result = ssh.run_command("yum update -y", {timeout: 3600});
    if (!result.success) throw `update failed ${result.output}`
  });

  let output = result.to_s;
  let rpmnew_regex = "warning: (.*) created as (.*\\.rpmnew)";
  let groups = re.findall(rpmnew_regex, output);
  groups.map((rpmold, rpmnew) => ssh.run_command(`mv ${rpmnew} ${rpmold}`));

  output = filter(
    x => !re.match(rpmnew_regex, x),
    result.output.split("\n")
  ).join("\n");

  appliance.evmserverd.start();
  appliance.wait_for_web_ui();
  return output
};

function test_update_yum(appliance_preupdate, appliance) {
  // Tests appliance update between versions - version changed and there are no warnings or errors
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: critical
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  // 
  //   Bugzilla:
  //       1714236
  //   
  let update_output = do_yum_update(appliance_preupdate);
  let result = appliance_preupdate.ssh_client.run_command("cat /var/www/miq/vmdb/VERSION");
  if (!appliance.version.include(result.output)) throw new ();

  let matches = re.search(
    "error|warning|fail",
    update_output,
    re.IGNORECASE
  );

  if (!!matches) {
    throw `update output contains ${matches.group()}\n\n${update_output}`
  }
};

function test_update_webui(appliance_with_providers, appliance, request, old_version) {
  //  Tests updating an appliance with providers, also confirms that the
  //       provisioning continues to function correctly after the update has completed
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: critical
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //   
  update_appliance(appliance_with_providers);

  wait_for(do_appliance_versions_match, {
    func_args: [appliance, appliance_with_providers],
    num_sec: 1200,
    delay: 20,
    handle_exception: true,
    message: "Waiting for appliance to update"
  });

  let virtual_crud = provider_app_crud(
    VMwareProvider,
    appliance_with_providers
  );

  let vm = provision_vm(request, virtual_crud);
  if (!vm.provider.mgmt.does_vm_exist(vm.name)) throw "vm not provisioned"
};

function test_update_scap_webui(appliance_with_providers, appliance, request, old_version) {
  //  Tests updating an appliance with providers and scap hardened, also confirms that the
  //       provisioning continues to function correctly after the update has completed
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //   
  appliance_with_providers.appliance_console.scap_harden_appliance();
  let rules_failures = appliance_with_providers.appliance_console.scap_failures();
  if (!!rules_failures) throw "Some rules have failed, check log";
  update_appliance(appliance_with_providers);

  wait_for(do_appliance_versions_match, {
    func_args: [appliance, appliance_with_providers],
    num_sec: 900,
    delay: 20,
    handle_exception: true,
    message: "Waiting for appliance to update"
  });

  rules_failures = appliance_with_providers.appliance_console.scap_failures();
  if (!!rules_failures) throw "Some rules have failed, check log";

  let virtual_crud = provider_app_crud(
    VMwareProvider,
    appliance_with_providers
  );

  let vm = provision_vm(request, virtual_crud);
  if (!vm.provider.mgmt.does_vm_exist(vm.name)) throw "vm not provisioned"
};

function test_update_embedded_ansible_webui(enabled_embedded_appliance, appliance, old_version) {
  //  Tests updating an appliance which has embedded ansible role enabled, also confirms that the
  //       role continues to function correctly after the update has completed
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //   
  update_appliance(enabled_embedded_appliance);

  enabled_embedded_appliance(() => {
    wait_for(do_appliance_versions_match, {
      func_args: [appliance, enabled_embedded_appliance],
      num_sec: 900,
      delay: 20,
      handle_exception: true,
      message: "Waiting for appliance to update"
    });

    enabled_embedded_appliance.wait_for_embedded_ansible();

    if (enabled_embedded_appliance.version < "5.11") {
      if (!wait_for({
        func() {
          return enabled_embedded_appliance.rabbitmq_server.running
        },

        num_sec: 60
      })) throw new ();

      if (!wait_for({
        func() {
          return enabled_embedded_appliance.nginx.running
        },

        num_sec: 60
      })) throw new ()
    }
  });

  enabled_embedded_appliance.wait_for_web_ui();

  enabled_embedded_appliance(() => {
    let repositories = enabled_embedded_appliance.collections.ansible_repositories;
    let name = fauxfactory.gen_alpha(15, {start: "example_"});
    let description = fauxfactory.gen_alpha(15, {start: "edited_"});

    try {
      let repository = repositories.create({
        name,
        url: cfme_data.ansible_links.playbook_repositories.console_db,
        description
      })
    } catch ($EXCEPTION) {
      if ($EXCEPTION instanceof KeyError) {
        pytest.skip("Skipping since no such key found in yaml")
      } else {
        throw $EXCEPTION
      }
    };

    let view = navigate_to(repository, "Details");
    let refresh = view.toolbar.refresh.click;

    let success = () => {
      let properties = view.entities.summary("Properties");
      return properties.get_text_of("Status").downcase() == "successful"
    }
  })
};

function test_update_distributed_webui(ext_appliances_with_providers, appliance, request, old_version, soft_assert) {
  //  Tests updating an appliance with providers, also confirms that the
  //   provisioning continues to function correctly after the update has completed
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //   
  update_appliance(ext_appliances_with_providers[0]);

  for (let updated_appliance in ext_appliances_with_providers) {
    wait_for(do_appliance_versions_match, {
      func_args: [appliance, updated_appliance],
      num_sec: 900,
      delay: 20,
      handle_exception: true,
      message: "Waiting for appliance to update"
    });

    updated_appliance.evmserverd.wait_for_running();
    updated_appliance.wait_for_web_ui()
  };

  let virtual_crud_appl1 = provider_app_crud(
    VMwareProvider,
    ext_appliances_with_providers[0]
  );

  let virtual_crud_appl2 = provider_app_crud(
    VMwareProvider,
    ext_appliances_with_providers[1]
  );

  let vm1 = provision_vm(request, virtual_crud_appl1);
  let vm2 = provision_vm(request, virtual_crud_appl2);

  soft_assert.call(
    vm1.provider.mgmt.does_vm_exist(vm1.name),
    "vm not provisioned"
  );

  soft_assert.call(
    vm2.provider.mgmt.does_vm_exist(vm2.name),
    "vm not provisioned"
  )
};

function test_update_replicated_webui(replicated_appliances_preupdate_with_providers, appliance, request, old_version, soft_assert) {
  //  Tests updating an appliance with providers, also confirms that the
  //           provisioning continues to function correctly after the update has completed
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //   
  let preupdate_appls = replicated_appliances_preupdate_with_providers;
  let providers_before_upgrade = new Set(preupdate_appls[0].managed_provider_names);
  update_appliance(preupdate_appls[0]);
  update_appliance(preupdate_appls[1]);

  wait_for(do_appliance_versions_match, {
    func_args: [appliance, preupdate_appls[0]],
    num_sec: 900,
    delay: 20,
    handle_exception: true,
    message: "Waiting for appliance to update"
  });

  wait_for(do_appliance_versions_match, {
    func_args: [appliance, preupdate_appls[1]],
    num_sec: 900,
    delay: 20,
    handle_exception: true,
    message: "Waiting for appliance to update"
  });

  preupdate_appls[0].evmserverd.wait_for_running();
  preupdate_appls[1].evmserverd.wait_for_running();
  preupdate_appls[0].wait_for_web_ui();
  preupdate_appls[1].wait_for_web_ui();

  if (providers_before_upgrade != new Set(preupdate_appls[1].managed_provider_names)) {
    throw "Providers are missing"
  };

  let virtual_crud_appl1 = provider_app_crud(
    VMwareProvider,
    preupdate_appls[0]
  );

  let virtual_crud_appl2 = provider_app_crud(
    VMwareProvider,
    preupdate_appls[1]
  );

  let vm1 = provision_vm(request, virtual_crud_appl1);
  let vm2 = provision_vm(request, virtual_crud_appl2);

  soft_assert.call(
    vm1.provider.mgmt.does_vm_exist(vm1.name),
    "vm not provisioned"
  );

  soft_assert.call(
    vm2.provider.mgmt.does_vm_exist(vm2.name),
    "vm not provisioned"
  )
};

function test_update_ha(ha_appliances_with_providers, appliance, update_strategy, request, old_version) {
  //  Tests updating an appliance with providers using webui, also confirms that the
  //           provisioning continues to function correctly after the update has completed
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: high
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  // 
  //   Bugzilla:
  //       1704835
  //   
  let evm_log = "/var/www/miq/vmdb/log/evm.log";
  update_strategy.call(ha_appliances_with_providers[2]);

  wait_for(do_appliance_versions_match, {
    func_args: [appliance, ha_appliances_with_providers[2]],
    num_sec: 900,
    delay: 20,
    handle_exception: true,
    message: "Waiting for appliance to update"
  });

  LogValidator(evm_log, {
    matched_patterns: ["Starting database failover monitor"],
    hostname: ha_appliances_with_providers[2].hostname
  }).waiting({wait: 60}, () => {
    ha_appliances_with_providers[2].evm_failover_monitor.restart();

    if (!ha_appliances_with_providers[2].evm_failover_monitor.running) {
      throw new ()
    }
  });

  LogValidator(evm_log, {
    matched_patterns: ["Starting to execute failover"],
    hostname: ha_appliances_with_providers[2].hostname
  }).waiting(
    {wait: 450},
    () => ha_appliances_with_providers[0].db_service.stop()
  );

  ha_appliances_with_providers[2].evmserverd.wait_for_running();
  ha_appliances_with_providers[2].wait_for_web_ui();

  let virtual_crud = provider_app_crud(
    VMwareProvider,
    ha_appliances_with_providers[2]
  );

  let vm = provision_vm(request, virtual_crud);
  if (!vm.provider.mgmt.does_vm_exist(vm.name)) throw "vm not provisioned"
}
