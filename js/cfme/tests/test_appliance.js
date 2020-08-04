// Tests around the appliance
require_relative("cfme");
include(Cfme);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
const POD_REASON = "Test not valid for podified appliances";

let pytestmark = [
  pytest.mark.smoke,
  pytest.mark.tier(1),
  test_requirements.appliance
];

function test_rpms_present(appliance, package) {
  // Verifies nfs-util rpms are in place needed for pxe & nfs operations
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       testtype: functional
  //       casecomponent: Appliance
  //   
  let result = appliance.ssh_client.run_command(`rpm -q ${package}`);
  if (!!result.output.include("is not installed")) throw new ();
  if (!result.success) throw new ()
};

function test_selinux_enabled(appliance) {
  // Verifies selinux is enabled
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/11h
  //       testtype: functional
  //       casecomponent: Appliance
  //   
  let result = appliance.ssh_client.run_command("getenforce").output;
  if (!result.include("Enforcing")) throw new ()
};

function test_firewalld_running(appliance) {
  // Verifies iptables service is running on the appliance
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Appliance
  //   
  if (!appliance.firewalld.is_active) throw new ()
};

function test_evm_running(appliance) {
  // Verifies overall evm service is running on the appliance
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: critical
  //       initialEstimate: 1/4h
  //       testtype: functional
  //       casecomponent: Appliance
  //   
  let result = appliance.ssh_client.run_command("systemctl status evmserverd").output;
  if (!result.include("active (running)")) throw new ()
};

function test_service_enabled(appliance, service) {
  // Verifies if key services are configured to start on boot up
  // 
  //   Polarion:
  //       assignee: jhenner
  //       caseimportance: critical
  //       initialEstimate: 1/6h
  //       testtype: functional
  //       casecomponent: Appliance
  //   
  if (!appliance.getattr(service).enabled) throw new ()
};

function test_firewalld_services_are_active(appliance) {
  // Verifies key firewalld services are in place
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       testtype: functional
  //       casecomponent: Appliance
  //       upstream: no
  //   
  let manageiq_zone = "manageiq";
  let result = appliance.ssh_client.run_command(`firewall-cmd --permanent --zone=${manageiq_zone} --list-services`);

  if (new Set(["ssh", "http", "https"]) > new Set(result.output.split())) {
    throw new ()
  };

  let default_iface_zone = ((appliance.ssh_client.run_command(`firewall-cmd --get-zone-of-interface ${appliance.default_iface}`)).output).strip();
  if (default_iface_zone != manageiq_zone) throw new ()
};

function test_firewalld_active_zone_after_restart(appliance) {
  // Verifies key firewalld active zone survives firewalld restart
  // 
  //   Note there is a BZ 1712944 which is reported against 5.10 and CLOSED as
  //   CURRENTRELEASE, meaning it won't be fixed for CFME 5.10, but it is fixed
  //   for CFME 5.11 already.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       testtype: functional
  //       casecomponent: Appliance
  //       upstream: no
  //   
  let manageiq_zone = "manageiq";

  let get_def_iface_zone = () => {
    let default_iface_zone_cmd = appliance.ssh_client.run_command(`firewall-cmd --get-zone-of-interface ${appliance.default_iface}`);
    if (!default_iface_zone_cmd.success) throw new ();
    return default_iface_zone_cmd.output.strip()
  };

  if (get_def_iface_zone.call() != manageiq_zone) throw new ();
  if (!appliance.firewalld.restart()) throw new ();
  if (get_def_iface_zone.call() != manageiq_zone) throw new ()
};

function test_memory_total(appliance) {
  // Verifies that the total memory on the box is >= 6GB
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       testtype: functional
  //       casecomponent: Appliance
  //   
  let result = appliance.ssh_client.run_command("free -g | grep Mem: | awk '{ print $2 }'");
  if (result.output.to_i < 6) throw new ()
};

function test_cpu_total(appliance) {
  // Verifies that the total number of cpus is >= 4
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       testtype: functional
  //       casecomponent: Appliance
  //   
  let result = appliance.ssh_client.run_command("lscpu | grep ^CPU\\(s\\): | awk '{ print $2 }'");
  if (result.output.to_i < 4) throw new ()
};

function test_certificates_present(appliance, soft_assert) {
  // Test whether the required product certificates are present.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       testtype: functional
  //       upstream: no
  //       casecomponent: Appliance
  //   
  let rhsm_ca_cert = "/etc/rhsm/ca/redhat-uep.pem";
  let rhsm_url = "https://subscription.rhn.redhat.com/";

  let known_certs = [
    rhsm_ca_cert,
    "/etc/pki/product-default/69.pem",
    "/etc/pki/product/167.pem",
    "/etc/pki/product/201.pem"
  ];

  if (!(appliance.ssh_client.run_command(("curl --connect-timeout 5 --max-time 10 --retry 10 --retry-delay 0 --retry-max-time 60 --cacert {ca_cert} {url}").format({
    ca_cert: rhsm_ca_cert,
    url: rhsm_url
  }))).success) throw new ();

  for (let cert in known_certs) {
    if (!(appliance.ssh_client.run_command(`test -f '${cert}'`)).success) {
      throw new ()
    };

    if (!appliance.ssh_client.run_command(("openssl verify -CAfile {ca_cert} '{cert_file}'").format({
      ca_cert: rhsm_ca_cert,
      cert_file: cert
    }))) throw new ()
  }
};

function test_html5_ssl_files_present(appliance, soft_assert) {
  // Test if the certificate and key necessary for HTML 5 Console Support
  //      is present.  These should have been generated by the
  //      IPAppliance object.   Note, these files are installed by
  //      the cfme RPM, so we use rpm verify to make sure they do not verify
  //      and hence were replaced.
  // 
  //   Polarion:
  //       assignee: joden
  //       casecomponent: Configuration
  //       caseimportance: medium
  //       initialEstimate: 1/4h
  //       casecomponent: Appliance
  //   
  let cert = conf.cfme_data.vm_console.cert;
  let cert_file = File.join(cert.install_dir, "server.cer");
  let key_file = File.join(cert.install_dir, "server.cer.key");
  let ssl_files = [cert_file, key_file];

  for (let ssl_file in ssl_files) {
    if (!(appliance.ssh_client.run_command(`test -f '${ssl_file}'`)).success) {
      throw new ()
    }
  }
};

function test_db_connection(appliance) {
  // Test that the pgsql db is listening externally
  // 
  //   This looks for a row in the miq_databases table, which should always exist
  //   on an appliance with a working database and UI
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       testtype: functional
  //       casecomponent: Appliance
  //   
  let databases = appliance.db.client.session.query(appliance.db.client.miq_databases).all();
  if (databases.size <= 0) throw new ()
};

function test_asset_precompiled(appliance) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       testtype: functional
  //       casecomponent: Appliance
  //   
  if (!(appliance.ssh_client.run_command("test -d /var/www/miq/vmdb/public/assets")).success) {
    throw "Assets not precompiled"
  }
};

function test_keys_included(appliance, soft_assert) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       testtype: functional
  //       upstream: no
  //       casecomponent: Appliance
  //   
  let keys = ["v0_key", "v1_key", "v2_key"];

  for (let k in keys) {
    soft_assert.call(
      (appliance.ssh_client.run_command(`test -e /var/www/miq/vmdb/certs/${k}`)).success,
      `${k} was not included in the build`
    )
  }
};

function test_appliance_console_packages(appliance) {
  // Test that we have no scl packages installed.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Appliance
  //   
  if (is_bool(appliance.ssh_client.run_command("which scl").success)) {
    if (!(appliance.ssh_client.run_command("scl --list | grep -v rh-ruby")).success) {
      throw new ()
    }
  }
};

// 
//   check that iburst exists within /etc/chrony.conf.
// 
//   Bugzilla:
//       1308606
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Appliance
//       caseimportance: low
//       caseposneg: negative
//       initialEstimate: 1/12h
//   
// pass
function test_appliance_chrony_conf() {};

// 
//   check that a script from /var/www/miq/vmdb/tools/ runs correctly as
//   expected.
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Appliance
//       caseimportance: medium
//       initialEstimate: 1/6h
//       startsin: 5.9
//   
// pass
function test_appliance_executing_script() {};

// 
//   check that CROND service does not get stopped after appliance has been
//   running.
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Appliance
//       caseimportance: low
//       caseposneg: negative
//       initialEstimate: 1/12h
//   
// pass
function test_appliance_log_crond() {};

// 
//   check that scripts in /var/www/miq/vmdb/tools have the executable
//   section added to the files.
//   #!/usr/bin/env ruby # finds ruby
//   require File.expand_path(\"../config/environment\", __dir__) # loads
//   rails, only needed if the script needs it
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Appliance
//       caseimportance: medium
//       initialEstimate: 1/6h
//       startsin: 5.9
//   
// pass
function test_appliance_exec_scripts() {};

function test_appliance_contains_ansible_modules(appliance) {
  // 
  //   check that there are ansible modules included in the appliance.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Appliance
  //       caseimportance: high
  //       initialEstimate: 1/6h
  //       startsin: 5.9.2
  //   Bugzilla:
  //       1678130
  //   
  if (!(appliance.ssh_client.run_command("stat /opt/rh/cfme-gemset/bundler/gems/cfme-conten*/content/ansible/roles")).success) {
    throw new ()
  }
};

// 
//   check logs for errors such as
// 
//   Bugzilla:
//       1392087
// 
//   Polarion:
//       assignee: jhenner
//       casecomponent: Appliance
//       caseimportance: low
//       caseposneg: negative
//       initialEstimate: 1/2h
//   
// pass
function test_appliance_log_error() {};

function test_codename_in_log(appliance) {
  // 
  //   check whether logs contains a mention of appliance codename
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Appliance
  //       initialEstimate: 1/60h
  //   
  let log = "/var/www/miq/vmdb/log/evm.log";

  let lv = LogValidator(log, {
    matched_patterns: [".*Codename: \\w+$"],
    hostname: appliance.hostname
  });

  lv.start_monitoring();
  appliance.ssh_client.run_command("appliance_console_cli --server=restart");
  if (!lv.validate({wait: "60s"})) throw new ();
  appliance.wait_for_web_ui()
};

function test_codename_in_stdout(appliance) {
  // 
  //   check whether stdout contains a mention of appliance codename
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Appliance
  //       initialEstimate: 1/60h
  //   
  let cursor = ((appliance.ssh_client.run_command("journalctl -u evmserverd --show-cursor | tail -n1")).output).split_p("-- cursor: ")[1];
  appliance.ssh_client.run_command("appliance_console_cli --server=restart");

  let codename_in_stdout = () => {
    let r = appliance.ssh_client.run_command(`journalctl -u evmserverd -c \"${cursor}\" | egrep -i \"codename: \\w+$\"`);
    return r.success
  };

  codename_in_stdout = wait_for_decorator(method("codename_in_stdout"));
  appliance.wait_for_web_ui()
};

// 
//   Bugzilla:
//       1413835
//   Requirement: CFME image imported as AMI in EC2 environment - should be
//   imported automatically with every build
// 
//   Polarion:
//       assignee: mmojzis
//       casecomponent: Appliance
//       caseimportance: critical
//       initialEstimate: 4h
//       endsin: 5.11
//       testSteps:
//           1. Deploy appliance:
//           c4.xlarge instance type
//           default vpc network
//           Two disks: one default 41GB, one additional 10GB
//           Security group with open port 22 & 443 to world
//           select appropriate private key
//           2. Associate instance with Elastic IP
//           3. Configure database using appliance_console
//           4. Start evmserverd
//       expectedResults:
//           1.
//           2.
//           3.
//           4. CFME appliance should work
//   
// pass
function test_ec2_deploy_cfme_image() {};

function test_appliance_top_output_log(appliance) {
  // 
  //   check logs contains usable process names
  // 
  //   Bugzilla:
  //       1749494
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Appliance
  //       caseimportance: high
  //       initialEstimate: 1/4h
  //   
  let some_expected_processes = [
    "MIQ Server",
    "MIQ: MiqGenericWorker",
    "MIQ: MiqPriorityWorker",
    "MIQ: MiqScheduleWorker"
  ];

  for (let process_name in some_expected_processes) {
    if (!appliance.ssh_client.run_command(`grep -q \"${process_name}\" /var/www/miq/vmdb/log/top_output.log`)) {
      throw new ()
    }
  }
}
