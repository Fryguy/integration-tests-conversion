require_relative 'urllib/parse'
include Urllib::Parse
require_relative 'cfme'
include Cfme
require_relative 'cfme/automate/explorer/domain'
include Cfme::Automate::Explorer::Domain
require_relative 'cfme/base/credential'
include Cfme::Base::Credential
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
pytestmark = [test_requirements.automate, pytest.mark.meta(server_roles: "+git_owner")]
GIT_REPO_URL = nil
begin
  GIT_REPO_URL = cfme_data.automate_links.datastore_repositories.manageiq_automate
rescue NoMethodError
  # pass
end
def imported_domain(appliance)
  if GIT_REPO_URL === nil
    pytest.skip("No automate repo url available at cfme_data.automate_links.datastore_repositories.manageiq_automate")
  end
  repo = appliance.collections.automate_import_exports.instantiate(import_type: "git", url: GIT_REPO_URL, verify_ssl: false)
  domain = repo.import_domain_from(branch: "origin/master")
  yield(domain)
  domain.delete_if_exists()
end
def new_user(appliance)
  # This fixture creates new user which assigned with non-super group
  group = appliance.collections.groups.instantiate(description: "EvmGroup-administrator")
  user = appliance.collections.users.create(name: fauxfactory.gen_alphanumeric(start: "user_").downcase(), credential: Credential(principal: fauxfactory.gen_alphanumeric(start: "uid"), secret: fauxfactory.gen_alphanumeric(start: "pwd")), email: fauxfactory.gen_email(), groups: [group], cost_center: "Workload", value_assign: "Database")
  yield(user)
  user.delete_if_exists()
end
def test_automate_git_domain_removed_from_disk(appliance, imported_domain)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       tags: automate
  #   
  imported_domain.delete()
  repo_path = urlparse(GIT_REPO_URL).path
  raise unless (appliance.ssh_client.run_command("[ ! -d \"/var/www/vmdb/data/git_repos#{repo_path}\" ]")).success
end
def test_automate_git_domain_displayed_in_service(appliance)
  # Tests if a domain is displayed in a service.
  #      Checks if the domain imported from git is displayed and usable in the pop-up tree in the
  #      dialog for creating services.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/20h
  #       tags: automate
  #   
  if GIT_REPO_URL === nil
    pytest.skip("No automate repo url available at cfme_data.automate_links.datastore_repositories.manageiq_automate")
  end
  repo = appliance.collections.automate_import_exports.instantiate(import_type: "git", url: GIT_REPO_URL, verify_ssl: true)
  imported_domain = repo.import_domain_from(branch: "origin/domain-display")
  collection = appliance.collections.catalog_items
  cat_item = collection.instantiate(collection.GENERIC, "test")
  view = navigate_to(cat_item, "Add")
  path = ["Datastore", "{0} ({1}) ({0}) (Locked)".format(imported_domain.name, "origin/domain-display"), "Service", "Generic", "StateMachines", "GenericLifecycle", "provision"]
  view.provisioning_entry_point.fill(path, include_domain: true)
  raise unless view.provisioning_entry_point.value.split_p("/") == ["", imported_domain.name, *path[2..-1]]
end
def test_automate_git_import_multiple_domains(request, appliance)
  # 
  #   Importing of multiple domains from a single git repository is not allowed.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/12h
  #       caseimportance: medium
  #       caseposneg: negative
  #       testtype: functional
  #       startsin: 5.10
  #       casecomponent: Automate
  #       tags: automate
  #       testSteps:
  #           1. Enable server role: git Repositories Owner
  #           2. Navigate to Automation > Automate > Import/Export
  #           3. Import multiple domains from a single git repository
  #       expectedResults:
  #           1.
  #           2.
  #           3. Import of multiple domains from a single git repo is not allowed
  #   
  if GIT_REPO_URL === nil
    pytest.skip("No automate repo url available at cfme_data.automate_links.datastore_repositories.manageiq_automate")
  end
  repo = appliance.collections.automate_import_exports.instantiate(import_type: "git", url: GIT_REPO_URL, verify_ssl: true)
  pytest.raises(RuntimeError, match: "Selected branch or tag contains more than one domain") {
    domain = repo.import_domain_from(branch: "origin/multi-domains")
    request.addfinalizer(domain.delete_if_exists)
    raise unless !domain.exists
  }
end
def test_domain_import_git(request, appliance, param_type, param_value, verify_ssl)
  # This test case Verifies that a domain can be imported from git and Importing domain from git
  #      should work with or without the top level domain directory.
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/6h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.7
  #       casecomponent: Automate
  #       tags: automate
  #       testSteps:
  #           1. Enable server role: git Repositories Owner
  #           2. Navigate to Automation > Automate > Import/Export
  #           3. Create a Git Repository with the contents of a domain directory without including
  #              the domain directory.
  #       expectedResults:
  #           1.
  #           2.
  #           3. Import should work with or without the top level domain directory.
  # 
  #   Bugzilla:
  #       1389823
  #   
  if GIT_REPO_URL === nil
    pytest.skip("No automate repo url available at cfme_data.automate_links.datastore_repositories.manageiq_automate")
  end
  repo = appliance.collections.automate_import_exports.instantiate(import_type: "git", url: GIT_REPO_URL, verify_ssl: verify_ssl)
  domain = repo.import_domain_from(None: {"param_type" => param_value})
  request.addfinalizer(domain.delete)
  raise unless domain.exists
end
def test_refresh_git_current_user(imported_domain, new_user)
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       caseimportance: medium
  #       caseposneg: positive
  #       testtype: functional
  #       startsin: 5.9
  #       casecomponent: Automate
  #       tags: automate
  #       testSteps:
  #           1. created non-super user 'user1' along with default 'admin' user.
  #           2. Using admin user imported git repo.:
  #              'https://github.com/ramrexx/CloudForms_Essentials.git' or any other repo.
  #           3. Logged in with admin and refreshed domain- 'CloudForms_Essentials' or other domain.
  #              Then checked all tasks.
  #           4. Found user name 'admin' next to 'Refresh git repository'.
  #           5. Then checked instances in that domain by logging in with user 'user1' and 'admin'.
  #           6. Logged in with non-super user 'user1' and refreshed domain - 'CloudForms_Essentials'.
  #              Then checked all tasks.
  #           7. Found user name 'user1' next to 'Refresh git repository'.
  #           8. Then checked instances in that domain by logging in with user 'user1' and 'admin'.
  #       expectedResults:
  #           1.
  #           2.
  #           3.
  #           4.
  #           5. It shows that
  #              e.g. 'Automate Instance [Provisioning - Updated 2019-01-15 11:41:43 UTC by admin]'
  #           6.
  #           7.
  #           8. It shows that
  #              e.g. 'Automate Instance [Provisioning - Updated 2019-01-15 11:44:43 UTC by user1]'
  #              Hence, correct user that calls refresh automation domain from git branch is shown.
  #   Bugzilla:
  #       1592428
  #   
  tasks_collection = imported_domain.appliance.collections.tasks
  imported_domain.refresh(branch_or_tag: "Branch", git_branch: "origin/master")
  view = imported_domain.create_view(DomainDetailsView)
  view.flash.assert_message("Successfully refreshed!")
  view = navigate_to(tasks_collection, "AllTasks")
  all_tasks = view.tabs.alltasks.table.read()
  __dummy0__ = false
  for task in all_tasks
    if task["Task Name"] == "Refresh git repository"
      raise unless task["User"] == "admin"
      break
    end
    if task == all_tasks[-1]
      __dummy0__ = true
    end
  end
  if __dummy0__
    raise NameError, "Task not found"
  end
  new_user {
    imported_domain.refresh(branch_or_tag: "Branch", git_branch: "origin/master")
    view = navigate_to(tasks_collection, "AllTasks")
    all_tasks = view.tabs.alltasks.table.read()
    __dummy1__ = false
    for task in all_tasks
      if task["Task Name"] == "Refresh git repository"
        raise unless task["User"] == new_user.credential.principal
        break
      end
      if task == all_tasks[-1]
        __dummy1__ = true
      end
    end
    if __dummy1__
      raise NameError, "Task not found"
    end
  }
end
def test_domain_import_git_rest(appliance, request)
  # 
  #   This test checks importing datastore from git via REST
  # 
  #   Polarion:
  #       assignee: pvala
  #       initialEstimate: 1/15h
  #       startsin: 5.11
  #       casecomponent: Automate
  #       setup:
  #           1. Enable server role: Git Repositories Owner
  #       testSteps:
  #           1. Send a request POST /api/automate_domains
  #               Query: {
  #                   \"action\": \"create_from_git\",
  #                   \"git_url\": \"https://github.com/RedHatQE/ManageIQ-automate-git\",
  #                   \"ref_type\": \"branch\",
  #                   \"ref_name\": \"master\"
  #               }
  #       expectedResults:
  #           1. The automate domain must have been created successfully.
  # 
  #   Bugzilla:
  #       1600961
  #   
  if GIT_REPO_URL === nil
    pytest.skip("No automate repo url available at cfme_data.automate_links.datastore_repositories.manageiq_automate")
  end
  collection = appliance.rest_api.collections.automate_domains
  data = {"git_url" => GIT_REPO_URL, "ref_type" => "branch", "ref_name" => "origin/master"}
  collection.action.create_from_git(None: data)
  assert_response(appliance)
  automate_domain = collection.get(name: "testdomain")
  _cleanup = lambda do
    domain = appliance.collections.domains.instantiate(name: "testdomain")
    domain.delete_if_exists()
  end
  raise unless automate_domain.exists
end
def test_automate_git_import_case_insensitive(request, appliance)
  # 
  #   bin/rake evm:automate:import PREVIEW=false
  #   GIT_URL=https://github.com/RedHatQE/ManageIQ-automate-git REF=TestBranch
  #   This should not cause an error (the actual name of the branch is
  #   TestBranch).
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #       tags: automate
  #       startsin: 5.7
  #   
  if GIT_REPO_URL === nil
    pytest.skip("No automate repo url available at cfme_data.automate_links.datastore_repositories.manageiq_automate")
  end
  appliance.ssh_client.run_rake_command("evm:automate:import PREVIEW=false GIT_URL=#{GIT_REPO_URL}")
  domain = appliance.collections.domains.instantiate(name: "testdomain")
  request.addfinalizer(domain.delete_if_exists)
  raise unless domain.exists
end
def test_automate_git_domain_import_connection(request, temp_appliance_preconfig, connection)
  # 
  #   Bugzilla:
  #       1391208
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/6h
  #       tags: automate
  #       startsin: 5.7
  #       testSteps:
  #           1. Import a Git Domain into Automate
  #           2. Server the connection to the GIT Server from the appliance
  #              (Disable VPN or some other trick)
  #           3. List all the Automate Domains using Automate-> Explorer
  #       expectedResults:
  #           1.
  #           2.
  #           3. The domain should be displayed properly
  #   
  if GIT_REPO_URL === nil
    pytest.skip("No automate repo url available at cfme_data.automate_links.datastore_repositories.manageiq_automate")
  end
  temp_appliance_preconfig.server.settings.enable_server_roles("git_owner")
  repo = temp_appliance_preconfig.collections.automate_import_exports.instantiate(import_type: "git", url: GIT_REPO_URL, verify_ssl: true)
  if is_bool(connection)
    domain = repo.import_domain_from(branch: "origin/master")
    temp_appliance_preconfig.ssh_client.run_command("echo '8.8.8.8 github.com' >> /etc/hosts")
    request.addfinalizer(domain.delete)
    raise unless domain.exists
  else
    temp_appliance_preconfig.ssh_client.run_command("echo '8.8.8.8 github.com' >> /etc/hosts")
    msg = "Error during repository fetch: hostname does not match certificate"
    pytest.raises(RuntimeError, match: msg) {
      repo.import_domain_from(branch: "origin/master")
    }
  end
end
def test_automate_git_import_without_master(appliance, request)
  # 
  #   Bugzilla:
  #       1508881
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #       tags: automate
  #       testSteps:
  #           1. Create git repository with different default branch than master.
  #           2. Add some valid automate code.
  #           3. Import domain by navigating to Automation -> Automate -> Import/Export
  #       expectedResults:
  #           1.
  #           2.
  #           3. Domain was imported from git
  #   
  if GIT_REPO_URL === nil
    pytest.skip("No automate repo url available at cfme_data.automate_links.datastore_repositories.manageiq_automate")
  end
  repo = appliance.collections.automate_import_exports.instantiate(import_type: "git", url: GIT_REPO_URL, verify_ssl: false)
  domain = repo.import_domain_from(branch: "origin/testbranch")
  request.addfinalizer(domain.delete_if_exists)
end
def setup_datastore(appliance)
  # This fixture create setup of datastore similar to domain which we are going to import.
  #      Note: Names of domain, namespace, klass, method are hardcoded as per their names in
  #      datastore which we are going to import.
  #   
  domain = appliance.collections.domains.create(name: "testdomain", description: fauxfactory.gen_alpha(), enabled: true)
  namespace = domain.namespaces.create(name: "test", description: fauxfactory.gen_alpha())
  klass = namespace.classes.create(name: "TestClass1", display_name: fauxfactory.gen_alpha(), description: fauxfactory.gen_alpha())
  method = klass.methods.create(name: "meh", display_name: fauxfactory.gen_alphanumeric(), location: "inline", script: "$evm.log(:info, \":P\")")
  yield
  domain.delete_if_exists()
  namespace.delete_if_exists()
  klass.delete_if_exists()
  method.delete_if_exists()
end
def test_automate_git_verify_ssl(appliance, setup_datastore, imported_domain)
  # 
  #   Bugzilla:
  #       1470738
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: low
  #       initialEstimate: 1/12h
  #       tags: automate
  #       startsin: 5.7
  #       setup:
  #           1. Create datastore containing domain, namespace, class etc. This datastore must be
  #              similar to datastore which we are going to import using git repository
  #           2. Import datastore using git repository. While importing verify ssl should be false
  #       testSteps:
  #           1. Check in db for verify ssl status after importing domain
  #           2. Refresh imported domain via REST
  #           3. Check in db for verify ssl status after importing domain
  #       expectedResults:
  #           1. It should be 0
  #           2.
  #           3. It should be 0
  #   
  repo_table = appliance.db.client["git_repositories"]
  check_verify_ssl = lambda do
    repo = appliance.db.client.session.query(repo_table).first()
    raise unless repo.verify_ssl == 0
  end
  check_verify_ssl.call()
  imported_domain.rest_api_entity.action.refresh_from_source()
  check_verify_ssl.call()
end
def test_automate_git_import_deleted_tag(appliance, imported_domain)
  # 
  #   Note: This test case checks tags available on GitHub repository. But we can not delete or add
  #   tags in GitHub repository using automation.
  # 
  #   Bugzilla:
  #       1394194
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       casecomponent: Automate
  #       caseimportance: medium
  #       initialEstimate: 1/12h
  #       tags: automate
  #       startsin: 5.7
  #       setup:
  #           1. Create a github-hosted repository containing a correctly formatted automate domain.
  #              This repository should contain tagged commits.
  #           2. Import the git-hosted domain into automate.
  #       testSteps:
  #           1. In automate explorer, click on the domain and click Configuration -> Refresh with a
  #              new branch or tag -> Select Branch/Tag - 'Tag'
  #           2. Observe the list of available tags to import from
  #       expectedResults:
  #           1.
  #           2. The available tags should be displayed
  #   
  view = navigate_to(imported_domain, "Refresh")
  view.branch_or_tag.fill("Tag")
  raise unless view.git_tags.read() == "0.1"
end
def test_git_refresh_with_renamed_yaml(appliance)
  # 
  #   Note: In this test case, we are checking that datastore with broken __domain__.yml should not
  #   get imported. But this BZ says, automate namespace, class, instance, method under domain should
  #   be refreshed even if you broke the __domain__.yml once it imported(This could be only tested
  #   manually)
  # 
  #   Bugzilla:
  #       1716443
  # 
  #   Polarion:
  #       assignee: dgaikwad
  #       initialEstimate: 1/8h
  #       startsin: 5.10
  #       casecomponent: Automate
  #       setup:
  #           1. Have a git backed Automate Domain
  #           2. Delete (or rename) a .rb/.yaml pair, commit, push to repo
  #       testSteps:
  #           1. Import datastore via git
  #       expectedResults:
  #           1. Domain should not get imported
  #   
  if GIT_REPO_URL === nil
    pytest.skip("No automate repo url available at cfme_data.automate_links.datastore_repositories.manageiq_automate")
  end
  repo = appliance.collections.automate_import_exports.instantiate(import_type: "git", url: GIT_REPO_URL)
  pytest.raises(RuntimeError, match: "Error: import failed: Selected branch or tag does not contain a valid domain") {
    repo.import_domain_from(branch: "origin/broken-yaml")
  }
end
