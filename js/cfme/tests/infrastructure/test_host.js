require_relative("wait_for");
include(Wait_for);
require_relative("widgetastic/exceptions");
include(Widgetastic.Exceptions);
require_relative("cfme");
include(Cfme);
require_relative("cfme/base/credential");
include(Cfme.Base.Credential);
require_relative("cfme/common/host_views");
include(Cfme.Common.Host_views);
require_relative("cfme/common/host_views");
include(Cfme.Common.Host_views);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/common/provider_views");
include(Cfme.Common.Provider_views);
require_relative("cfme/fixtures/provider");
include(Cfme.Fixtures.Provider);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/tests/networks/test_sdn_downloads");
include(Cfme.Tests.Networks.Test_sdn_downloads);
require_relative("cfme/utils/appliance/constants");
include(Cfme.Utils.Appliance.Constants);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [pytest.mark.tier(3), pytest.mark.provider(
  [InfraProvider],
  {required_fields: ["hosts"], scope: "module", selector: ONE_PER_TYPE}
)];

const VIEWS = ["Grid View", "Tile View", "List View"];

function host_ips(provider) {
  // Returns tuple of hosts' IP addresses.
  let ipaddresses = [];
  let all_hosts = provider.data.get("hosts", []);

  for (let host in all_hosts) {
    let ipaddr = null;

    if (is_bool(host.instance_variable_defined("@ipaddress"))) {
      ipaddr = host.ipaddress
    };

    if (is_bool(!ipaddr)) {
      // pass
      try {
        ipaddr = socket.gethostbyname(host.name)
      } catch ($EXCEPTION) {
        if ($EXCEPTION instanceof Exception) {

        } else {
          throw $EXCEPTION
        }
      }
    };

    if (is_bool(ipaddr)) ipaddresses.push(ipaddr)
  };

  if (is_bool(!ipaddresses)) {
    pytest.skip(`No hosts IP addresses found for provider \"${provider.name}\"`)
  };

  ipaddresses.sort();
  return ipaddresses.to_a
};

function create_250_hosts(appliance) {
  let script_downloaded = appliance.ssh_client.run_command("wget -P /var/www/miq/vmdb/ https://gist.githubusercontent.com/NickLaMuro/225833358423723ed17ff294415fa6b4/raw/f717ccb83f530f653aabe67fe9389164513ef90d/bz_1580569_db_replication_script.rb");
  if (!script_downloaded.success) throw script_downloaded.output;
  let create_250_hosts = appliance.ssh_client.run_command("cd /var/www/miq/vmdb && bin/rails r bz_1580569_db_replication_script.rb");
  if (!create_250_hosts.success) throw new ();
  yield;
  appliance.ssh_client.run_command("rm -f /var/www/miq/vmdb/bz_1580569_db_replication_script.rb");
  appliance.ssh_client.run_rails_console("[Host].each(&:delete_all)");
  appliance.delete_all_providers()
};

function navigate_and_select_quads(provider) {
  // navigate to the hosts edit page and select all the quads on the first page
  // 
  //   Returns:
  //       view: the provider nodes view, quadicons already selected
  let hosts_view = navigate_to(provider, "ProviderNodes");
  if (!hosts_view.is_displayed) throw new ();
  hosts_view.entities.get_all().map(h => h.ensure_checked());
  hosts_view.toolbar.configuration.item_select("Edit Selected items");
  let edit_view = provider.create_view(HostsEditView);
  if (!edit_view.is_displayed) throw new ();
  return edit_view
};

function test_discover_host(request, provider, appliance, host_ips) {
  // Tests hosts discovery.
  // 
  //   Polarion:
  //       assignee: nachandr
  //       initialEstimate: 1/4h
  //       casecomponent: Infra
  //   
  if (is_bool(provider.delete_if_exists({cancel: false}))) {
    provider.wait_for_delete()
  };

  let collection = appliance.collections.hosts;

  let _cleanup = () => {
    let all_hosts = collection.all();
    if (is_bool(all_hosts)) return collection.delete(...all_hosts)
  };

  _cleanup.call();
  request.addfinalizer(method("_cleanup"));
  collection.discover(host_ips[0], host_ips[-1], {esx: true});
  let hosts_view = navigate_to(collection, "All");
  let expected_len = provider.data.get("hosts", {}).size;

  let _check_items_visibility = () => {
    hosts_view.browser.refresh();
    return hosts_view.entities.entity_names.size == expected_len
  };

  Wait_for.wait_for(
    method("_check_items_visibility"),
    {num_sec: 600, delay: 10}
  );

  for (let host in hosts_view.entities.entity_names) {
    if (!host_ips.include(host)) throw new ()
  }
};

function test_multiple_host_good_creds(setup_provider, provider, creds) {
  // 
  // 
  //   Bugzilla:
  //       1619626
  //       1201092
  // 
  //   Polarion:
  //       assignee: nachandr
  //       casecomponent: Infra
  //       initialEstimate: 1/4h
  //   
  if (provider.data.get("hosts", {}).size < 2) {
    pytest.skip("not enough hosts to run test")
  };

  // Tests multiple host credentialing  with good credentials 
  let host = random.choice(provider.data.hosts);

  let host_creds = credentials.get(
    host.credentials.get(creds, null),
    null
  );

  if (is_bool(!host_creds)) {
    pytest.skip("This host {} doesn't have necessary creds {}. skipping test. Please check yaml data".format(
      host,
      creds
    ))
  };

  let cred = Credential({
    principal: host_creds.username,
    secret: host_creds.password
  });

  let edit_view = navigate_and_select_quads({provider});
  edit_view.endpoints.default.fill_with(cred.view_value_mapping);
  edit_view.validation_host.fill(host.name);
  edit_view.endpoints.default.validate_button.click();
  edit_view.flash.assert_no_error();
  edit_view.flash.assert_success_message("Credential validation was successful");
  edit_view.save_button.click();
  let view = provider.create_view(ProviderNodesView);
  view.flash.assert_no_error();
  view.flash.assert_success_message("Credentials/Settings saved successfully")
};

function test_multiple_host_bad_creds(setup_provider, provider) {
  let msg;

  //   Tests multiple host credentialing with bad credentials
  // 
  //   Polarion:
  //       assignee: nachandr
  //       caseimportance: medium
  //       casecomponent: Infra
  //       initialEstimate: 1/15h
  //   
  if (provider.data.get("hosts", {}).size < 2) {
    pytest.skip("not enough hosts to run test")
  };

  let host = random.choice(provider.data.hosts);
  let cred = Credential({principal: "wrong", secret: "bad_password"});
  let edit_view = navigate_and_select_quads({provider});
  edit_view.endpoints.default.fill_with(cred.view_value_mapping);
  edit_view.validation_host.fill(host.name);
  edit_view.endpoints.default.validate_button.click();

  if (is_bool(provider.one_of(RHEVMProvider))) {
    msg = "Login failed due to a bad username or password."
  } else if (is_bool(provider.one_of(SCVMMProvider))) {
    msg = "Check credentials. Remote error message: WinRM::WinRMAuthorizationError"
  } else {
    msg = "Cannot complete login due to an incorrect user name or password."
  };

  edit_view.flash.assert_message(msg);
  edit_view.cancel_button.click()
};

function test_tag_host_after_provider_delete(provider, appliance, setup_provider, request) {
  // Test if host can be tagged after delete
  // 
  //   Polarion:
  //       assignee: anikifor
  //       initialEstimate: 1/8h
  //       casecomponent: Tagging
  //   
  let host_on_provider = provider.hosts.all()[0];
  provider.delete();
  provider.wait_for_delete();
  let all_hosts = appliance.collections.hosts.all();

  for (let host in all_hosts) {
    if (host.name == host_on_provider.name) {
      let host_to_tag = host;
      break
    }
  };

  try {
    let tag = host_to_tag.add_tag()
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NameError) {
      throw new pytest.fail("Host not found!")
    } else {
      throw $EXCEPTION
    }
  };

  request.addfinalizer(() => host.remove_tag(tag))
};

function test_250_vmware_hosts_loading(appliance, create_250_hosts, view_type) {
  // 
  //   Test to automate BZ1580569
  // 
  //   Polarion:
  //       assignee: pvala
  //       initialEstimate: 1/4h
  //       casecomponent: WebUI
  //   
  let rails_console = appliance.ssh_client.run_rails_console(
    "MiqReport.load_from_view_options(Host, User.where(:userid => 'admin').first).paged_view_search",
    {timeout: 60}
  );

  if (!rails_console.success) throw new ();
  let view = navigate_to(appliance.collections.hosts, "All");
  view.entities.paginator.set_items_per_page(1000);
  view.toolbar.view_selector.select(view_type);

  Wait_for.wait_for(
    view.entities.get_first_entity,
    {timeout: 60, message: "Wait for the view"}
  )
};

function test_infrastructure_hosts_icons_states(appliance, request, power_state, setup_provider, provider, soft_assert) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: low
  //       initialEstimate: 1/3h
  //       setup:
  //           1. Add a RHEVM provider.
  //           2. SSH into appliance console and run `psql vmdb_production`
  //       testSteps:
  //           1. Check if the Quadicon(Host's ALL page)
  //               and host(Host's Detail page) power_state changes after running the command:
  //               `UPDATE hosts SET power_state = ':power_state' WHERE name=':host_name';`
  //   
  let host = provider.hosts.all()[0];
  let host_name = host.name;
  let reset_state = host.rest_api_entity.power_state;
  let hosts = appliance.db.client.hosts;
  let result = appliance.db.client.session.query(hosts).filter(hosts.name == host_name).update({[hosts.power_state]: power_state});
  if (result != 1) throw new ();

  let _finalize = () => (
    appliance.db.client.session.query(hosts).filter(hosts.name == host_name).update({[hosts.power_state]: reset_state})
  );

  let view = navigate_to(appliance.collections.hosts, "All");
  let host_entity = view.entities.get_entity({name: host_name});
  let actual_state = host_entity.data.quad.topRight.tooltip;

  soft_assert(
    actual_state == power_state,

    "Power state in the quadicon[{}] did not match with {}.".format(
      actual_state,
      power_state
    )
  );

  view = navigate_to(host, "Details");
  actual_state = view.entities.summary("Properties").get_text_of("Power State");

  soft_assert(
    actual_state == power_state,

    "Power state in the summary table[{}] did not match with [{}].".format(
      actual_state,
      power_state
    )
  )
};

function test_hosts_not_displayed_several_times(appliance, provider, setup_provider) {
  // Tests hosts not displayed several times after removing and adding provider.
  // 
  //       Polarion:
  //           assignee: jhenner
  //           initialEstimate: 1/20h
  //           casecomponent: Infra
  //       
  let host_count = navigate_to(appliance.collections.hosts, "All").paginator.items_amount;
  provider.delete({cancel: false});
  provider.wait_for_delete();
  provider.create();

  if (host_count != navigate_to(appliance.collections.hosts, "All").paginator.items_amount) {
    throw new ()
  }
};

function setup_provider_min_hosts(request, appliance, provider, num_hosts) {
  let hosts_yaml = provider.data.get("hosts", {}).size;

  if (hosts_yaml < num_hosts) {
    pytest.skip(`Number of hosts defined in yaml for ${provider} does not meet minimum for test parameter ${num_hosts}, skipping and not setting up provider`)
  };

  if (provider.mgmt.list_host().size < num_hosts) {
    pytest.skip(`Number of hosts on ${provider} does not meet minimum for test parameter ${num_hosts}, skipping and not setting up provider`)
  };

  setup_or_skip(request, provider)
};

const UNCOLLECT_REASON = "Not enough hosts on provider type.";

function test_infrastructure_hosts_refresh_multi(appliance, setup_provider_min_hosts, provider, num_hosts) {
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       caseimportance: low
  //       initialEstimate: 1/6h
  //       testSteps:
  //           1. Navigate to the Compute > Infrastructure > Providers view.
  //           2. Click on a provider quadicon, and then the hosts link along the top row of the view.
  //           3. Select all hosts (need at least 2 hosts) by checking the box in upper left of
  //              quadicons.
  //           4. Click \"Refresh Relationships and Power States\" under the Configuration
  //              dropdowm, and then click \"OK\" when prompted.
  //       expectedResults:
  //           1. Providers view is displayed.
  //           2. Hosts view is displayed.
  //           3.
  //           4. \"Refresh initiated for X Hosts from the CFME Database\" is displayed in green
  //              banner where \"X\" is the number of selected hosts. Properties for each host are
  //              refreshed. Making changes to test pre-commithooks
  //   
  let plural_char = (num_hosts == 1 ? "" : "s");
  let my_slice = slice(0, num_hosts, null);
  let hosts_view = navigate_to(provider.collections.hosts, "All");

  let evm_tail = LogValidator("/var/www/miq/vmdb/log/evm.log", {
    matched_patterns: [`'Refresh Provider' successfully initiated for ${num_hosts} Host${plural_char}`],
    hostname: appliance.hostname
  });

  evm_tail.start_monitoring();

  for (let h in hosts_view.entities.get_all({slice: my_slice})) {
    h.ensure_checked()
  };

  hosts_view.toolbar.configuration.item_select(
    "Refresh Relationships and Power States",
    {handle_alert: true}
  );

  hosts_view.flash.assert_success_message(`Refresh initiated for ${num_hosts} Host${plural_char} from the CFME Database`);

  try {
    Wait_for.wait_for(
      provider.is_refreshed,
      {func_kwargs: {force_refresh: false}, num_sec: 300, delay: 10}
    )
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof TimedOutError) {
      pytest.fail("Hosts were not refreshed within given time")
    } else {
      throw $EXCEPTION
    }
  };

  if (!evm_tail.validate({wait: "30s"})) throw new ()
};

function test_infrastructure_hosts_navigation_after_download(appliance, setup_provider, provider, report_format, hosts_collection) {
  let hosts_view;

  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       caseimportance: high
  //       initialEstimate: 1/3h
  //   Bugzilla:
  //       1738664
  //   
  if (hosts_collection == "provider") {
    hosts_view = navigate_to(provider.collections.hosts, "All")
  } else if (hosts_collection == "appliance") {
    hosts_view = navigate_to(appliance.collections.hosts, "All")
  };

  hosts_view.toolbar.download.item_select(report_format.value);
  if (report_format == DownloadOptions.PDF) handle_extra_tabs(hosts_view);
  hosts_view.navigation.select("Compute");

  if (hosts_collection == "provider") {
    let provider_view = provider.create_view(InfraProviderDetailsView);
    if (!provider_view.is_displayed) throw new ()
  } else if (hosts_collection == "appliance") {
    if (!hosts_view.is_displayed) throw new ()
  }
};

function test_infrastructure_hosts_compare(appliance, setup_provider_min_hosts, provider, num_hosts, hosts_collection) {
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //   Bugzilla:
  //       1746214
  //   
  let h_coll = locals()[hosts_collection].collections.hosts;

  let compare_view = h_coll.compare_entities({entities_list: h_coll.all()[_.range(
    0,
    num_hosts
  )]});

  if (!compare_view.is_displayed) throw new ()
};

function test_infrastructure_hosts_navigation_after_download_from_compare(appliance, setup_provider_min_hosts, provider, report_format, hosts_collection, num_hosts) {
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       caseimportance: high
  //       initialEstimate: 1/3h
  //   Bugzilla:
  //       1747545
  // 
  //   
  let h_coll = locals()[hosts_collection].collections.hosts;

  let hosts_view = h_coll.compare_entities({entities_list: h_coll.all()[_.range(
    0,
    num_hosts
  )]});

  hosts_view.toolbar.download.item_select(report_format.value);
  if (report_format == DownloadOptions.PDF) handle_extra_tabs(hosts_view);
  hosts_view.navigation.select("Compute");
  if (!hosts_view.is_displayed) throw new ()
};

function test_add_ipmi_refresh(appliance, setup_provider) {
  // 
  //   Tests IPMI IP address is not blank after running refresh relationships on the host.
  // 
  //   Bugzilla:
  //       1669011
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/20h
  //       caseimportance: medium
  //       casecomponent: Infra
  //   
  let host = appliance.collections.hosts.all()[0];

  let cred = host.Credential({
    principal: "111",
    secret: "222",
    ipmi: true
  });

  let ipmi_address = "10.10.10.10";

  update(host, () => {
    host.ipmi_credentials = cred;
    host.ipmi_address = ipmi_address
  });

  host.refresh();
  let view = navigate_to(host, "Edit");
  if (view.ipmi_address.read() != ipmi_address) throw new ()
};

function test_infrastructure_hosts_crud(appliance, setup_provider) {
  // 
  //   Polarion:
  //       assignee: prichard
  //       casecomponent: Infra
  //       caseimportance: low
  //       initialEstimate: 1/6h
  //   Bugzilla:
  //       1634794
  //   
  let host = appliance.collections.hosts.all()[0];
  let new_custom_id = `Edit host data. ${fauxfactory.gen_alphanumeric()}`;

  update(
    host,
    {from_details: false},
    () => host.custom_ident = new_custom_id
  );

  if (navigate_to(host, "Details").entities.summary("Properties").get_text_of("Custom Identifier") != new_custom_id) {
    throw new ()
  };

  new_custom_id = `Edit host data. ${fauxfactory.gen_alphanumeric()}`;

  update(
    host,
    {from_details: true},
    () => host.custom_ident = new_custom_id
  );

  if (navigate_to(host, "Details").entities.summary("Properties").get_text_of("Custom Identifier") != new_custom_id) {
    throw new ()
  };

  try {
    let existing_custom_id = navigate_to(host, "Details").entities.summary("Properties").get_text_of("Custom Identifier")
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NameError) {
      let existing_custom_id = null
    } else {
      throw $EXCEPTION
    }
  };

  new_custom_id = `Edit host data. ${fauxfactory.gen_alphanumeric()}`;

  update(
    host,
    {from_details: true, cancel: true},
    () => host.custom_ident = new_custom_id
  );

  try {
    if (navigate_to(host, "Details").entities.summary("Properties").get_text_of("Custom Identifier") != existing_custom_id) {
      throw new ()
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NameError) {
      if (is_bool(existing_custom_id)) throw new ()
    } else {
      throw $EXCEPTION
    }
  };

  let view = navigate_to(host, "Edit");

  try {
    view.navigation.select(
      "Compute",
      "Infrastructure",
      "Hosts",
      {handle_alert: false}
    )
  } catch (e) {
    if (e instanceof UnexpectedAlertPresentException) {
      if (e.msg.include("Abandon changes")) {
        pytest.fail("Abandon changes alert displayed, but no changes made. BZ1634794")
      } else {
        throw new ()
      }
    } else {
      throw e
    }
  };

  view = host.create_view(HostsView);
  if (!view.is_displayed) throw new ();

  try {
    if (navigate_to(host, "Details").entities.summary("Properties").get_text_of("Custom Identifier") != existing_custom_id) {
      throw new ()
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NameError) {
      if (is_bool(existing_custom_id)) throw new ()
    } else {
      throw $EXCEPTION
    }
  };

  new_custom_id = `Edit host data. ${fauxfactory.gen_alphanumeric()}`;
  view = navigate_to(host, "Edit");
  view.fill({custom_ident: new_custom_id});
  view = navigate_to(host.parent, "All");
  if (!view.is_displayed) throw new ();

  try {
    if (navigate_to(host, "Details").entities.summary("Properties").get_text_of("Custom Identifier") != existing_custom_id) {
      throw new ()
    }
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof NameError) {
      if (is_bool(existing_custom_id)) throw new ()
    } else {
      throw $EXCEPTION
    }
  };

  host.delete({cancel: true});
  host.delete
}
