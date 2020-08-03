# Tests around the appliance
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
POD_REASON = "Test not valid for podified appliances"
pytestmark = [pytest.mark.smoke, pytest.mark.tier(1), test_requirements.appliance]
def test_rpms_present(appliance, package)
  # Verifies nfs-util rpms are in place needed for pxe & nfs operations
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       casecomponent: Appliance
  #   
  result = appliance.ssh_client.run_command("rpm -q #{package}")
  raise unless !result.output.include?("is not installed")
  raise unless result.success
end
def test_selinux_enabled(appliance)
  # Verifies selinux is enabled
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/11h
  #       testtype: functional
  #       casecomponent: Appliance
  #   
  result = appliance.ssh_client.run_command("getenforce").output
  raise unless result.include?("Enforcing")
end
def test_firewalld_running(appliance)
  # Verifies iptables service is running on the appliance
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   
  raise unless appliance.firewalld.is_active
end
def test_evm_running(appliance)
  # Verifies overall evm service is running on the appliance
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: critical
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       casecomponent: Appliance
  #   
  result = appliance.ssh_client.run_command("systemctl status evmserverd").output
  raise unless result.include?("active (running)")
end
def test_service_enabled(appliance, service)
  # Verifies if key services are configured to start on boot up
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: critical
  #       initialEstimate: 1/6h
  #       testtype: functional
  #       casecomponent: Appliance
  #   
  raise unless appliance.getattr(service).enabled
end
def test_firewalld_services_are_active(appliance)
  # Verifies key firewalld services are in place
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       casecomponent: Appliance
  #       upstream: no
  #   
  manageiq_zone = "manageiq"
  result = appliance.ssh_client.run_command("firewall-cmd --permanent --zone=#{manageiq_zone} --list-services")
  raise unless Set.new(["ssh", "http", "https"]) <= Set.new(result.output.split())
  default_iface_zone = ((appliance.ssh_client.run_command("firewall-cmd --get-zone-of-interface #{appliance.default_iface}")).output).strip()
  raise unless default_iface_zone == manageiq_zone
end
def test_firewalld_active_zone_after_restart(appliance)
  # Verifies key firewalld active zone survives firewalld restart
  # 
  #   Note there is a BZ 1712944 which is reported against 5.10 and CLOSED as
  #   CURRENTRELEASE, meaning it won't be fixed for CFME 5.10, but it is fixed
  #   for CFME 5.11 already.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       casecomponent: Appliance
  #       upstream: no
  #   
  manageiq_zone = "manageiq"
  get_def_iface_zone = lambda do
    default_iface_zone_cmd = appliance.ssh_client.run_command("firewall-cmd --get-zone-of-interface #{appliance.default_iface}")
    raise unless default_iface_zone_cmd.success
    return default_iface_zone_cmd.output.strip()
  end
  raise unless get_def_iface_zone.call() == manageiq_zone
  raise unless appliance.firewalld.restart()
  raise unless get_def_iface_zone.call() == manageiq_zone
end
def test_memory_total(appliance)
  # Verifies that the total memory on the box is >= 6GB
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       casecomponent: Appliance
  #   
  result = appliance.ssh_client.run_command("free -g | grep Mem: | awk '{ print $2 }'")
  raise unless result.output.to_i >= 6
end
def test_cpu_total(appliance)
  # Verifies that the total number of cpus is >= 4
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       casecomponent: Appliance
  #   
  result = appliance.ssh_client.run_command("lscpu | grep ^CPU\\(s\\): | awk '{ print $2 }'")
  raise unless result.output.to_i >= 4
end
def test_certificates_present(appliance, soft_assert)
  # Test whether the required product certificates are present.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       upstream: no
  #       casecomponent: Appliance
  #   
  rhsm_ca_cert = "/etc/rhsm/ca/redhat-uep.pem"
  rhsm_url = "https://subscription.rhn.redhat.com/"
  known_certs = [rhsm_ca_cert, "/etc/pki/product-default/69.pem", "/etc/pki/product/167.pem", "/etc/pki/product/201.pem"]
  raise unless (appliance.ssh_client.run_command(("curl --connect-timeout 5 --max-time 10 --retry 10 --retry-delay 0 --retry-max-time 60 --cacert {ca_cert} {url}").format(ca_cert: rhsm_ca_cert, url: rhsm_url))).success
  for cert in known_certs
    raise unless (appliance.ssh_client.run_command("test -f '#{cert}'")).success
    raise unless appliance.ssh_client.run_command(("openssl verify -CAfile {ca_cert} '{cert_file}'").format(ca_cert: rhsm_ca_cert, cert_file: cert))
  end
end
def test_html5_ssl_files_present(appliance, soft_assert)
  # Test if the certificate and key necessary for HTML 5 Console Support
  #      is present.  These should have been generated by the
  #      IPAppliance object.   Note, these files are installed by
  #      the cfme RPM, so we use rpm verify to make sure they do not verify
  #      and hence were replaced.
  # 
  #   Polarion:
  #       assignee: joden
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   
  cert = conf.cfme_data["vm_console"]["cert"]
  cert_file = File.join(cert.install_dir,"server.cer")
  key_file = File.join(cert.install_dir,"server.cer.key")
  ssl_files = [cert_file, key_file]
  for ssl_file in ssl_files
    raise unless (appliance.ssh_client.run_command("test -f '#{ssl_file}'")).success
  end
end
def test_db_connection(appliance)
  # Test that the pgsql db is listening externally
  # 
  #   This looks for a row in the miq_databases table, which should always exist
  #   on an appliance with a working database and UI
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       casecomponent: Appliance
  #   
  databases = appliance.db.client.session.query(appliance.db.client["miq_databases"]).all()
  raise unless databases.size > 0
end
def test_asset_precompiled(appliance)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       casecomponent: Appliance
  #   
  raise "Assets not precompiled" unless (appliance.ssh_client.run_command("test -d /var/www/miq/vmdb/public/assets")).success
end
def test_keys_included(appliance, soft_assert)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       testtype: functional
  #       upstream: no
  #       casecomponent: Appliance
  #   
  keys = ["v0_key", "v1_key", "v2_key"]
  for k in keys
    soft_assert.((appliance.ssh_client.run_command("test -e /var/www/miq/vmdb/certs/#{k}")).success, "#{k} was not included in the build")
  end
end
def test_appliance_console_packages(appliance)
  # Test that we have no scl packages installed.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Appliance
  #   
  if is_bool(appliance.ssh_client.run_command("which scl").success)
    raise unless (appliance.ssh_client.run_command("scl --list | grep -v rh-ruby")).success
  end
end
def test_appliance_chrony_conf()
  # 
  #   check that iburst exists within /etc/chrony.conf.
  # 
  #   Bugzilla:
  #       1308606
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       caseimportance: low
  #       caseposneg: negative
  #       initialEstimate: 1/12h
  #   
  # pass
end
def test_appliance_executing_script()
  # 
  #   check that a script from /var/www/miq/vmdb/tools/ runs correctly as
  #   expected.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       startsin: 5.9
  #   
  # pass
end
def test_appliance_log_crond()
  # 
  #   check that CROND service does not get stopped after appliance has been
  #   running.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       caseimportance: low
  #       caseposneg: negative
  #       initialEstimate: 1/12h
  #   
  # pass
end
def test_appliance_exec_scripts()
  # 
  #   check that scripts in /var/www/miq/vmdb/tools have the executable
  #   section added to the files.
  #   #!/usr/bin/env ruby # finds ruby
  #   require File.expand_path(\"../config/environment\", __dir__) # loads
  #   rails, only needed if the script needs it
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       startsin: 5.9
  #   
  # pass
end
def test_appliance_contains_ansible_modules(appliance)
  # 
  #   check that there are ansible modules included in the appliance.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       caseimportance: high
  #       initialEstimate: 1/6h
  #       startsin: 5.9.2
  #   Bugzilla:
  #       1678130
  #   
  raise unless (appliance.ssh_client.run_command("stat /opt/rh/cfme-gemset/bundler/gems/cfme-conten*/content/ansible/roles")).success
end
def test_appliance_log_error()
  # 
  #   check logs for errors such as
  # 
  #   Bugzilla:
  #       1392087
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       caseimportance: low
  #       caseposneg: negative
  #       initialEstimate: 1/2h
  #   
  # pass
end
def test_codename_in_log(appliance)
  # 
  #   check whether logs contains a mention of appliance codename
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       initialEstimate: 1/60h
  #   
  log = "/var/www/miq/vmdb/log/evm.log"
  lv = LogValidator(log, matched_patterns: [".*Codename: \\w+$"], hostname: appliance.hostname)
  lv.start_monitoring()
  appliance.ssh_client.run_command("appliance_console_cli --server=restart")
  raise unless lv.validate(wait: "60s")
  appliance.wait_for_web_ui()
end
def test_codename_in_stdout(appliance)
  # 
  #   check whether stdout contains a mention of appliance codename
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       initialEstimate: 1/60h
  #   
  cursor = ((appliance.ssh_client.run_command("journalctl -u evmserverd --show-cursor | tail -n1")).output).split_p("-- cursor: ")[1]
  appliance.ssh_client.run_command("appliance_console_cli --server=restart")
  codename_in_stdout = lambda do
    r = appliance.ssh_client.run_command("journalctl -u evmserverd -c \"#{cursor}\" | egrep -i \"codename: \\w+$\"")
    return r.success
  end
  codename_in_stdout = wait_for_decorator(method(:codename_in_stdout))
  appliance.wait_for_web_ui()
end
def test_ec2_deploy_cfme_image()
  # 
  #   Bugzilla:
  #       1413835
  #   Requirement: CFME image imported as AMI in EC2 environment - should be
  #   imported automatically with every build
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Appliance
  #       caseimportance: critical
  #       initialEstimate: 4h
  #       endsin: 5.11
  #       testSteps:
  #           1. Deploy appliance:
  #           c4.xlarge instance type
  #           default vpc network
  #           Two disks: one default 41GB, one additional 10GB
  #           Security group with open port 22 & 443 to world
  #           select appropriate private key
  #           2. Associate instance with Elastic IP
  #           3. Configure database using appliance_console
  #           4. Start evmserverd
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4. CFME appliance should work
  #   
  # pass
end
def test_appliance_top_output_log(appliance)
  # 
  #   check logs contains usable process names
  # 
  #   Bugzilla:
  #       1749494
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Appliance
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  some_expected_processes = ["MIQ Server", "MIQ: MiqGenericWorker", "MIQ: MiqPriorityWorker", "MIQ: MiqScheduleWorker"]
  for process_name in some_expected_processes
    raise unless appliance.ssh_client.run_command("grep -q \"#{process_name}\" /var/www/miq/vmdb/log/top_output.log")
  end
end
