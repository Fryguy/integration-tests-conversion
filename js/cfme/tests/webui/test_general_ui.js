require_relative("widgetastic/utils");
include(Widgetastic.Utils);
require_relative("widgetastic/widget");
include(Widgetastic.Widget);
require_relative("cfme");
include(Cfme);
require_relative("cfme/base/ui");
include(Cfme.Base.Ui);
require_relative("cfme/cloud/provider");
include(Cfme.Cloud.Provider);
require_relative("cfme/common/host_views");
include(Cfme.Common.Host_views);
require_relative("cfme/common/provider");
include(Cfme.Common.Provider);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/common/topology");
include(Cfme.Common.Topology);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/infrastructure/config_management");
include(Cfme.Infrastructure.Config_management);
require_relative("cfme/infrastructure/config_management/ansible_tower");
include(Cfme.Infrastructure.Config_management.Ansible_tower);
require_relative("cfme/infrastructure/config_management/satellite");
include(Cfme.Infrastructure.Config_management.Satellite);
require_relative("cfme/infrastructure/datastore");
include(Cfme.Infrastructure.Datastore);
require_relative("cfme/infrastructure/datastore");
include(Cfme.Infrastructure.Datastore);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/infrastructure/virtual_machines");
include(Cfme.Infrastructure.Virtual_machines);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/networks/provider");
include(Cfme.Networks.Provider);
require_relative("cfme/physical/provider");
include(Cfme.Physical.Provider);
require_relative("cfme/rest/gen_data");
include(Cfme.Rest.Gen_data);
var _vm = vm.bind(this);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.general_ui];

const ALL_OPTIONS = {
  properties: {
    Summary: ProviderDetailsView,
    Timelines: ProviderTimelinesView
  },

  relationships: {
    "Clusters (": ProviderClustersView,
    "Hosts (": ProviderAllHostsView,
    "Datastores (": ProviderAllDatastoresView,
    "VMs (": ProviderVmsView,
    "Templates (": ProviderTemplatesView
  }
};

const PROVIDERS = {
  AnsibleTowerProvider: "automation_management_providers",
  SatelliteProvider: "configuration_management_providers",
  NetworkProvider: "network_providers",
  InfraProvider: "infrastructure_providers",
  CloudProvider: "cloud_providers",
  PhysicalProvider: "infrastructure_providers",
  ContainersProvider: "containers_providers"
};

function import_tags(appliance) {
  let scripts = [
    "rhconsulting_tags.rake",
    "rhconsulting_options.rb",
    "rhconsulting_illegal_chars.rb"
  ];

  let client = appliance.ssh_client;

  try {
    for (let script in scripts) {
      if (!(client.run_command(("cd /var/www/miq/vmdb/lib/tasks/ && wget https://raw.githubusercontent.com/rhtconsulting/cfme-rhconsulting-scripts/master/{}").format(script))).success) {
        throw new ()
      }
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof RuntimeError) {
      for (let script in scripts) {
        client.run_command(`cd /var/www/miq/vmdb/lib/tasks/ && rm -f ${script}`)
      };

      pytest.skip("Not all scripts were successfully downloaded")
    } else {
      throw $EXCEPTION
    }
  };

  try {
    if (!(client.run_command("cd /tmp && wget https://github.com/ManageIQ/manageiq/files/384909/tags.yml.gz &&gunzip tags.yml.gz")).success) {
      throw new ()
    };

    if (!(client.run_command("vmdb && bin/rake rhconsulting:tags:import[/tmp/tags.yml]")).success) {
      throw new ()
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof RuntimeError) {
      client.run_command("cd /tmp && rm -f tags.yml*");
      pytest.skip("Tags import is failed")
    } else {
      throw $EXCEPTION
    }
  };

  let output = (client.run_command("cat /tmp/tags.yml | grep description")).output;
  let category_groups = output.split_p(`\n- description:`);
  let tags = {};

  for (let category in category_groups) {
    let category_tags = category.split_p(" - description: ");

    let category_name = category_tags.pop(0).strip().gsub(
      "- description: ",
      ""
    );

    tags[category_name] = category_tags
  };

  yield(tags);

  for (let script in scripts) {
    client.run_command(`cd /var/www/miq/vmdb/lib/tasks/ && rm -f ${script}`)
  };

  client.run_command("cd /tmp && rm -f tags.yml*")
};

function set_help_menu_options(appliance) {
  let region = appliance.collections.regions.instantiate();
  let view = navigate_to(region, "HelpMenu");

  let original_documentation_title = view.browser.get_attribute({
    attr: "placeholder",
    locator: view.documentation_title.locator
  });

  let original_product_title = view.browser.get_attribute({
    attr: "placeholder",
    locator: view.product_title.locator
  });

  let original_about_title = view.browser.get_attribute({
    attr: "placeholder",
    locator: view.about_title.locator
  });

  let documentation_title = fauxfactory.gen_alpha();
  let product_title = fauxfactory.gen_alpha();
  let about_title = fauxfactory.gen_alpha();

  region.set_help_menu_configuration({
    documentation_title: documentation_title,
    product_title: product_title,
    about_title: about_title
  });

  yield([documentation_title, product_title, about_title]);

  region.set_help_menu_configuration({
    documentation_title: original_documentation_title,
    product_title: original_product_title,
    about_title: original_about_title
  })
};

function create_20k_vms(appliance) {
  let rails_create_command = "20000.times { |i| ManageIQ::Providers::Vmware::InfraManager::Vm.create :name => \"vm_%05d\" % (1+i), :vendor => \"vmware\", :location => \"foo\" }";
  let rails_cleanup_command = "20000.times { |i| ManageIQ::Providers::Vmware::InfraManager::Vm.where(:name => \"vm_%05d\" % (1+i)).first.delete}";
  appliance.ssh_client.run_rails_command(`'${rails_create_command}'`);
  yield;
  appliance.ssh_client.run_rails_command(`'${rails_cleanup_command}'`)
};

function vm(request, provider, appliance) {
  return _vm(request, provider, appliance)
};

function test_add_provider_trailing_whitespaces(provider, soft_assert) {
  // Test to validate the hostname and username should be without whitespaces
  // 
  //   Polarion:
  //       assignee: pvala
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  provider.endpoints.default.credentials.principal = "{}  ".format(provider.endpoints.default.credentials.principal);
  provider.endpoints.default.hostname = "{}  ".format(provider.endpoints.default.hostname);
  pytest.raises(RuntimeError, () => provider.create());
  let view = provider.create_view(provider.endpoints_form);

  soft_assert.call(
    view.hostname.help_block == "Spaces are prohibited",
    "Spaces are allowed in hostname field"
  );

  soft_assert.call(
    view.username.help_block == "Spaces are prohibited",
    "Spaces are allowed in username field"
  )
};

function test_configuration_large_number_of_tags(appliance, import_tags, soft_assert) {
  // Test page should be loaded within a minute with large number of tags
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Configuration
  //       caseimportance: medium
  //       caseposneg: negative
  //       initialEstimate: 1/3h
  //   
  let group = appliance.collections.groups.instantiate({description: "EvmGroup-administrator"});
  let view = navigate_to(group, "Details");

  for (let [category, tags] in import_tags.to_a()) {
    category = category.gsub("  ", " ");

    for (let tag in tags) {
      tag = tag.strip();

      soft_assert.call(
        view.entities.my_company_tags.tree.has_path(category, tag),
        `Tag ${tag} was not imported`
      )
    }
  }
};

function test_configuration_help_menu(appliance, set_help_menu_options, soft_assert) {
  // 
  //   Test Steps:
  //       1) Goto Configuration--> Select Region 0[0] from Accordion
  //       2) Click on the \"Help Menu\" tab
  //       3) Fill the fields
  //       4) Check if the changes are reflected or not
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Configuration
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //   
  let view = navigate_to(appliance.server, "Dashboard");

  for (let option in set_help_menu_options) {
    soft_assert.call(
      view.help.has_item(option),
      `${option} option is not available in help menu`
    )
  }
};

function test_automate_can_edit_copied_method(appliance, request) {
  // 
  //   1) Go to Automate -> Explorer
  //   2) Create a new Domain
  //   3) Go to ManageIQ/Service/Provisioning/StateMachines/
  //       ServiceProvision_Template/update_serviceprovision_status
  //   4) Copy it to the newly created Datastore
  //   5) Select it and try to edit it in the new Datastore
  //   6) Save it
  //   It should be saved successfully
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Automate
  //       caseimportance: medium
  //       initialEstimate: 1/10h
  //   
  let domain = appliance.collections.domains.create({
    name: fauxfactory.gen_alpha(12, {start: "domain_"}),
    description: fauxfactory.gen_alpha(),
    enabled: false
  });

  request.addfinalizer(domain.delete_if_exists);
  let domain_origin = appliance.collections.domains.instantiate("ManageIQ");
  let method = domain_origin.namespaces.instantiate("Service").collections.namespaces.instantiate("Provisioning").collections.namespaces.instantiate("StateMachines").collections.classes.instantiate("ServiceProvision_Template").collections.methods.instantiate("update_serviceprovision_status");
  let view = navigate_to(method, "Copy");
  view.copy_button.click();
  let copied_method = domain.namespaces.instantiate("Service").collections.namespaces.instantiate("Provisioning").collections.namespaces.instantiate("StateMachines").collections.classes.instantiate("ServiceProvision_Template").collections.methods.instantiate("update_serviceprovision_status");
  copied_method.update({name: fauxfactory.gen_alpha()})
};

function test_infrastructure_filter_20k_vms(appliance, create_20k_vms) {
  // Test steps:
  // 
  //       1) Go to rails console and create 20000 vms
  //       2) In the UI go to Compute -> Infrastructure -> Virtual Machines -> VMs
  //       3) Create filter Field -> Virtual Machine: Vendor = \"vmware\"
  //       4) There should be filtered 20k vms
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/3h
  //   
  let view = navigate_to(appliance.collections.infra_vms, "VMsOnly");

  view.entities.search.save_filter(
    "fill_field(Virtual Machine : Vendor, =, vmware)",
    "vmware",
    {apply_filter: true}
  );

  let items_amount = view.entities.paginator.items_amount.to_i;
  if (items_amount < 20000) throw "Vms count is less than should be filtered"
};

function test_welcoming_page(temp_appliance_preconfig) {
  // This test case checks the new welcoming page when there is no provider in the appliance
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/5h
  // 
  //   Bugzilla:
  //       1678190
  //   
  let appliance = temp_appliance_preconfig;
  appliance.server.login();
  let view = appliance.server.create_view(InfraProvidersView);
  if (!view.add_button.is_displayed) throw new ();
  view.add_button.click();
  let add_infra_view = appliance.server.create_view(InfraProviderAddView);
  if (!add_infra_view.is_displayed) throw new ()
};

function test_add_button_on_provider_all_page(appliance, provider_type, add_view, has_no_providers) {
  // 
  //   This test checks if the `Add a Provider` button is displayed on a providers all page
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/5h
  //   
  let provider = appliance.collections.getattr(provider_type);
  let view = navigate_to(provider, "All");
  if (!view.add_button.is_displayed) throw new ();
  view.add_button.click();
  let displayed_view = provider.create_view(add_view);
  if (!displayed_view.is_displayed) throw new ()
};

function test_tls_openssl_verify_mode(temp_appliance_preconfig, request) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/8h
  //       testSteps:
  //           1. Check if key `openssl_verify_mode` is present in the advanced configuration.
  //           2. Navigate to Configuration and toggle `Start TLS Automatically`
  //               of Outgoing SMTP E-mail Server.
  //           3. Again check for the presence of `openssl_verify_mode` and check its value.
  //       expectedResults:
  //           1. Key must be absent.
  //           2.
  //           3. Key must be present and value must be None.
  // 
  //   Bugzilla:
  //       1475553
  //   
  let appliance = temp_appliance_preconfig;

  if (!!appliance.advanced_settings.smtp.include("openssl_verify_mode")) {
    throw new ()
  };

  let view = navigate_to(appliance.server, "Server");
  let old_tls = view.smtp_server.start_tls.read();
  appliance.server.settings.update_smtp_server({start_tls: !old_tls});
  if (view.smtp_server.start_tls.read() != !old_tls) throw new ();

  wait_for(
    () => appliance.advanced_settings.smtp.include("openssl_verify_mode"),
    {timeout: 50, delay: 2}
  );

  if (appliance.advanced_settings.smtp.openssl_verify_mode != "none") {
    throw new ()
  };

  appliance.server.settings.update_smtp_server({start_tls: old_tls});
  if (view.smtp_server.start_tls.read() != old_tls) throw new ();

  if (appliance.advanced_settings.smtp.openssl_verify_mode != "none") {
    throw new ()
  }
};

function test_vm_right_size_recommendation_back_button(appliance, setup_provider, create_vm) {
  // 
  //   Bugzilla:
  //       1733207
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/18h
  //       setup:
  //           1. Add provider to appliance.
  //       testSteps:
  //           1. Navigate to a VM's details page.
  //           2. From `Configuration` dropdown, select `Right Size Recommendations`.
  //           3. Click on `Back` button and check if you're brought to Details Page.
  //   
  let view = navigate_to(create_vm, "RightSize");
  view.back_button.click();
  view = create_vm.create_view(InfraVmDetailsView);
  if (!view.is_displayed) throw new ()
};

function test_misclicking_checkbox_vms(appliance, setup_provider, provider) {
  // 
  //   Bugzilla:
  //       1627387
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: low
  //       initialEstimate: 1/8h
  //       setup:
  //           1. Add a provider.
  //       testSteps:
  //           1. Navigate to All VMs/Instances page.
  //           2. Select the list view.
  //           3. Click on the first column, it contains checkbox.
  //           4. Assert that nothing happens and the page stays the same.
  //   
  let collection = appliance.provider_based_collection(provider);
  let view = navigate_to(collection, "All");
  view.toolbar.view_selector.select("List View");
  let row = view.entities.elements.rows() // next;
  row[0].click();
  if (!view.is_displayed) throw new ()
};

function test_compliance_column_header(appliance, setup_provider, provider) {
  // 
  //   Bugzilla:
  //       1745660
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/18h
  //       setup:
  //           1. Add a infra/cloud provider
  //       testSteps:
  //           1. Navigate to All VMs/Instances page.
  //           2. Select the List View
  //           3. Click on the Compliance Column Header
  //       expectedResults:
  //           1.
  //           2.
  //           3. There should be no 500 Internal Server Error and the page must be displayed as is.
  //   
  let collection = appliance.provider_based_collection(provider);
  let view = navigate_to(collection, "All");
  view.toolbar.view_selector.select("List View");
  let table = view.entities.elements;
  (table.browser.elements(table.HEADERS).map(hr => hr)).click() // next;
  if (!view.is_displayed) throw new ()
};

function test_add_provider_button_accordion(has_no_providers, provider) {
  // 
  //   Test that add_provider button is visible after clicking accordion on
  //       Ansible Tower and Satellite Provider pages
  // 
  //   Bugzilla:
  //       1741310
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/30h
  //       startsin: 5.11
  //   
  let view = navigate_to(provider, "AllOfType");
  if (!view.add_button.is_displayed) throw new ();
  view.sidebar.configured_systems.open();
  view.sidebar.providers.open();
  view.wait_displayed();
  if (!view.add_button.is_displayed) throw new ()
};

function test_provider_details_page_refresh_after_clear_cookies(appliance, request, setup_provider, provider) {
  // 
  //   Bugzilla:
  //       1642948
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/12h
  //       testSteps:
  //           1. Navigate to a provider's Details page
  //           2. Reboot the appliance
  //           3. Click a button or refresh the page or do something on the page and see what happens.
  //       expectedResults:
  //           1.
  //           2.
  //           3. You'll be redirected to the Login Page.
  //   
  let view = navigate_to(provider, "Details");
  appliance.reboot();
  request.addfinalizer(() => navigate_to(appliance.server, "LoggedIn"));

  (LogValidator(
    "/var/www/miq/vmdb/log/production.log",
    {failure_patterns: [".*FATAL.*"]}
  )).waiting(() => view.browser.refresh());

  let login_view = appliance.server.create_view(
    LoginPage,
    {wait: "40s"}
  );

  if (!login_view.is_displayed) throw new ()
};

function test_infrastructure_provider_left_panel_titles(setup_provider, provider, option, soft_assert, vm) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: low
  //       initialEstimate: 1/18h
  //       testSteps:
  //           1. Add an infrastructure provider and navigate to it's Details page.
  //           2. Select Properties on the panel and check all items, whether they have their titles.
  //           3. Select Relationships on the panel and check all items,
  //               whether they have their titles.
  //       expectedResults:
  //           1.
  //           2. Properties panel must have all items and clicking on each item should display
  //               the correct page.
  //           3. Relationships panel must have all items and clicking on each item should display
  //               the correct page.
  //   
  let view = navigate_to(provider, "Details");
  let accordion = view.entities.sidebar.getattr(option);

  for (let panel in ALL_OPTIONS[option]) {
    accordion.tree.select(partial_match(panel));
    let test_view = provider.create_view(ALL_OPTIONS[option][panel]);

    soft_assert.call(
      test_view.is_displayed,
      `${test_view} not displayed.`
    )
  }
};

function test_provider_documentation(temp_appliance_preconfig_funcscope, provider, has_no_providers, request) {
  // 
  //   Bugzilla:
  //       1741030
  //       1783208
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: low
  //       initialEstimate: 1/18h
  //       startsin: 5.11
  //       setup:
  //           1. Take a fresh appliance with no provider
  //       testSteps:
  //           1. Log into the appliance, navigate to the provider All page
  //               and check where the anchor link provided in
  //               `Learn more about this in the documentation.` points to.
  //       expectedResults:
  //           1. Link must point to downstream documentation and not upstream.
  //   
  let url = `https://access.redhat.com/documentation/en-us/red_hat_cloudforms/5.0/html/managing_providers/${PROVIDERS[provider]}`;
  let destination = ([AnsibleTowerProvider, SatelliteProvider].include(provider) ? "AllOfType" : "All");
  let view = navigate_to(provider, destination);
  let initial_count = view.browser.window_handles.size;
  let main_window = view.browser.current_window_handle;

  let href = Text(
    view,
    {locator: "//*[@id=\"main_div\"]//a[contains(normalize-space(.), \"in the documentation\")]"}
  );

  href.click();

  wait_for(
    () => view.browser.window_handles.size > initial_count,
    {timeout: 30, message: "Check for window open"}
  );

  let open_url_window = (new Set(view.browser.window_handles) - new Set([main_window])).pop();
  view.browser.switch_to_window(open_url_window);

  let _reset_window = () => {
    view.browser.close_window(open_url_window);
    return view.browser.switch_to_window(main_window)
  };

  time.sleep(5);
  if (!view.browser.url.include(url)) throw new ()
};

function test_compare_vm_from_datastore_relationships(appliance, setup_provider, provider) {
  // 
  //   Bugzilla:
  //       1733120
  //       1784179
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/18h
  //       setup:
  //           1. Add an infra provider.
  //       testSteps:
  //           1. Select a datastore with at least 2 VMS, and navigate to a it's Details page.
  //           2. Click on Managed VMs from the relationships table.
  //           3. Select at least 2 VMs and click on `Configuration > Compare the selected items`
  //       expectedResults:
  //           1.
  //           2.
  //           3. Comparison page should be displayed, there should be no exception on the page.
  //   
  let datastore = appliance.collections.datastores.instantiate({
    name: provider.data.provisioning.datastore,
    provider
  });

  let view = navigate_to(datastore, "ManagedVMs");
  view.entities.get_all({slice: slice(0, 3)}).map(vm => vm.ensure_checked());
  view.toolbar.configuration.item_select("Compare Selected items");
  let compare_view = datastore.create_view(DatastoresCompareView);
  if (!compare_view.is_displayed) throw new ()
};

function test_provider_summary_topology(setup_provider, provider) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: high
  //       initialEstimate: 1/2h
  //       setup:
  //           1. Add a provider.
  //       testSteps:
  //           1. Navigate to provider's summary page.
  //           2. Click on topology.
  //       expectedResults:
  //           1.
  //           2. Provider Topology must be displayed.
  // 
  //   Bugzilla:
  //       1532404
  //   
  let view = navigate_to(provider, "Details");
  view.entities.summary("Overview").click_at("Topology");
  let topology_view = provider.create_view(BaseTopologyView);
  if (!topology_view.is_displayed) throw new ()
}
