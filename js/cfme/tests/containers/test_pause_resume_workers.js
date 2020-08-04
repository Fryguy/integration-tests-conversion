require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
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

function check_ems_state_in_diagnostics(appliance, provider) {
  let workers_view = navigate_to(
    appliance.collections.diagnostic_workers,
    "AllDiagnosticWorkers"
  );

  workers_view.browser.refresh();

  try {
    if (is_bool(workers_view.workers_table.rows({name: `Event Monitor for Provider: ${provider.name}`}).next())) {
      return true
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof Exception) {
      return false
    } else {
      throw $EXCEPTION
    }
  }
};

function test_pause_and_resume_provider_workers(appliance, provider, request) {
  // 
  //   Basic workers testing for pause and resume for a container provider
  //   Tests steps:
  //       1. Navigate to provider page
  //       2. Pause the provider
  //       3. navigate to : User -> Configuration -> Diagnostics ->  Workers
  //       4. Validate the ems_ workers are not found
  //       5. Navigate to provider page
  //       6. Resume the provider
  //       7. navigate to : User -> Configuration -> Diagnostics ->  Workers
  //       8. Validate the ems_ workers are started
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(provider, "Details");

  view.toolbar.configuration.item_select(
    provider.pause_provider_text,
    {handle_alert: true}
  );

  let ems_worker_state = check_ems_state_in_diagnostics(
    appliance,
    provider
  );

  if (!!ems_worker_state) {
    throw "Diagnostics shows that workers are running after pause provider"
  };

  let _finalize = () => {
    if (is_bool(!provider.is_provider_enabled)) {
      view = navigate_to(provider, "Details");

      return view.toolbar.configuration.item_select(
        provider.resume_provider_text,
        {handle_alert: true}
      )
    }
  };

  view = navigate_to(provider, "Details");

  view.toolbar.configuration.item_select(
    provider.resume_provider_text,
    {handle_alert: true}
  );

  ems_worker_state = wait_for(() => (
    !check_ems_state_in_diagnostics(appliance, provider)
  ));

  if (!ems_worker_state) {
    throw "Diagnostics shows that workers are not running after resume provider"
  }
};

function test_pause_and_resume_single_provider_api(appliance, provider, from_collections, soft_assert, request) {
  // 
  //   Test enabling and disabling a single provider via the CFME API through the ManageIQ API Client
  //   collection and entity classes.
  // 
  //   RFE: BZ 1507812
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let match_disable = (appliance.version > 5.11 ? "Pausing" : "Disabling");

  let evm_tail_disable = LogValidator(
    "/var/www/miq/vmdb/log/evm.log",
    {matched_patterns: [`.*${match_disable} EMS \\[${provider.name}\\] id \\[${provider.id}\\].*`]}
  );

  evm_tail_disable.start_monitoring();

  if (is_bool(from_collections)) {
    let rep_disable = appliance.collections.containers_providers.pause_providers(provider);

    soft_assert.call(
      rep_disable[0].get("success"),
      `Disabling provider ${provider.name} failed`
    )
  } else {
    let rep_disable = provider.pause();

    soft_assert.call(
      rep_disable.get("success"),
      `Disabling provider ${provider.name} failed`
    )
  };

  soft_assert.call(
    !provider.is_provider_enabled,
    "Provider {} is still enabled".format(provider.name)
  );

  if (!evm_tail_disable.validate()) throw new ();

  if (!wait_for(() => !check_ems_state_in_diagnostics(appliance, provider))) {
    throw new ()
  };

  time.sleep(15);
  let project_name = fauxfactory.gen_alpha(8).downcase();
  provider.mgmt.create_project({name: project_name});
  let _finalize = () => provider.mgmt.delete_project({name: project_name});

  let project = appliance.collections.container_projects.instantiate({
    name: project_name,
    provider
  });

  provider.refresh_provider_relationships();

  soft_assert(
    wait_for(
      () => !project.exists,
      {delay: 5, num_sec: 100, message: "waiting for project to display"}
    ),

    `Project ${project_name} exists even though provider has been disabled`
  );

  let match_enable = (appliance.version > 5.11 ? "Resuming" : "Enabling");

  let evm_tail_enable = LogValidator(
    "/var/www/miq/vmdb/log/evm.log",
    {matched_patterns: [`.*${match_enable} EMS \\[${provider.name}\\] id \\[${provider.id}\\].*`]}
  );

  evm_tail_enable.start_monitoring();

  if (is_bool(from_collections)) {
    let rep_enable = appliance.collections.containers_providers.resume_providers(provider);

    soft_assert(
      rep_enable[0].get("success"),
      `Enabling provider ${provider.name} failed`
    )
  } else {
    let rep_enable = provider.resume();

    soft_assert(
      rep_enable.get("success"),
      `Enabling provider ${provider.name} failed`
    )
  };

  soft_assert(
    provider.is_provider_enabled,
    `Provider ${provider.name} is still disabled`
  );

  if (!evm_tail_enable.validate()) throw new ();
  provider.refresh_provider_relationships();

  soft_assert(
    wait_for(
      () => project.exists,
      {delay: 5, num_sec: 100, message: "waiting for project to display"}
    ),

    `Project ${project_name} does not exists even though provider has been enabled`
  )
}
