require_relative 'cfme'
include Cfme
require_relative 'cfme/ansible_tower/explorer'
include Cfme::Ansible_tower::Explorer
require_relative 'cfme/infrastructure/config_management/ansible_tower'
include Cfme::Infrastructure::Config_management::Ansible_tower
require_relative 'cfme/infrastructure/config_management/satellite'
include Cfme::Infrastructure::Config_management::Satellite
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/update'
include Cfme::Utils::Update
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.provider([AnsibleTowerProvider, SatelliteProvider], scope: "module"), pytest.mark.usefixtures("setup_provider_modscope")]
TEMPLATE_TYPE = {"job" => "Job Template (Ansible Tower)", "workflow" => "Workflow Template (Ansible Tower)"}
def config_system(provider)
  profile = provider.config_profiles[0]
  return fauxfactory.gen_choice(profile.config_systems)
end
def test_config_manager_detail_config_btn(provider)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: medium
  #       initialEstimate: 1/2h
  #       casecomponent: Ansible
  #   
  provider.refresh_relationships()
end
def test_config_manager_add(provider)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Ansible
  #       initialEstimate: 1/4h
  #   
  navigate_to(provider, "Details")
end
def test_config_manager_add_invalid_url(has_no_providers, provider)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #       casecomponent: Ansible
  #   
  wait_for(lambda{|| !provider.exists}, num_sec: 60, delay: 3)
  provider.url = "https://invalid_url"
  error_message = "getaddrinfo: Name or service not known"
  pytest.raises(Exception, match: error_message) {
    provider.create()
  }
end
def test_config_manager_add_invalid_creds(has_no_providers, provider)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       casecomponent: Ansible
  #   
  wait_for(lambda{|| !provider.exists}, num_sec: 60, delay: 3)
  provider.credentials.principal = "invalid_user"
  if provider.type == "ansible_tower"
    msg = "validation was not successful: {\"detail\":\"Authentication credentials were not provided. To establish a login session, visit /api/login/.\"}"
  else
    msg = "Credential validation was not successful: 401 Unauthorized"
  end
  pytest.raises(Exception, match: msg) {
    provider.create()
  }
end
def test_config_manager_edit(request, provider)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #       casecomponent: Ansible
  #   
  new_name = fauxfactory.gen_alpha(8)
  old_name = provider.name
  update(provider) {
    provider.name = new_name
  }
  request.addfinalizer(lambda{|| provider.update(updates: {"name" => old_name})})
  raise "Failed to update configuration manager's name" unless provider.name == new_name && provider.exists
end
def test_config_manager_remove(request, provider)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: medium
  #       initialEstimate: 1/15h
  #       casecomponent: Ansible
  #   
  request.addfinalizer(provider.create)
  provider.delete()
end
def test_config_system_tag(config_system, tag)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       initialEstimate: 1/4h
  #       casecomponent: Ansible
  #   
  config_system.add_tag(tag: tag, details: false)
  raise "Added tag not found on configuration system" unless config_system.get_tags().include?(tag)
end
def test_ansible_tower_job_templates_tag(request, provider, tag)
  # 
  #   Polarion:
  #       assignee: anikifor
  #       initialEstimate: 1/4h
  #       casecomponent: Ansible
  #       caseimportance: high
  # 
  #   Bugzilla:
  #       1673104
  #   
  begin
    job_template = provider.appliance.collections.ansible_tower_job_templates.all()[0]
  rescue IndexError
    pytest.skip("No job template was found")
  end
  job_template.add_tag(tag: tag, details: false)
  request.addfinalizer(lambda{|| job_template.remove_tag(tag: tag)})
  raise "Added tag not found on configuration system" unless job_template.get_tags().include?(tag)
end
def test_ansible_tower_service_dialog_creation_from_template(provider, template_type)
  # 
  #   Polarion:
  #       assignee: jhenner
  #       initialEstimate: 1/4h
  #       casecomponent: Ansible
  #       caseimportance: high
  # 
  #   
  begin
    job_template = provider.appliance.collections.ansible_tower_job_templates.filter({"job_type" => template_type}).all()[0]
  rescue IndexError
    pytest.skip("No job template was found")
  end
  dialog_label = fauxfactory.gen_alpha(8)
  dialog = job_template.create_service_dailog(dialog_label)
  view = job_template.browser.create_view(TowerCreateServiceDialogFromTemplateView)
  view.flash.assert_success_message("Service Dialog \"{}\" was successfully created".format(dialog_label))
  raise unless dialog.exists
  dialog.delete_if_exists()
end
def test_config_manager_add_multiple_times_ansible_tower_243()
  # 
  #   Try to add same Tower manager twice (use the same IP/hostname). It
  #   should fail and flash message should be displayed.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: medium
  #       caseposneg: negative
  #       casecomponent: Ansible
  #       initialEstimate: 1/4h
  #       startsin: 5.7
  #   
  # pass
end
def test_config_manager_job_template_refresh()
  # 
  #   After first Tower refresh, go to Tower UI and change name of 1 job
  #   template. Go back to CFME UI, perform refresh and check if job
  #   template name was changed.
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Ansible
  #       caseimportance: low
  #       initialEstimate: 1/2h
  #   
  # pass
end
def test_config_manager_accordion_tree()
  # 
  #   Make sure there is accordion tree, once Tower is added to the UI.
  # 
  #   Bugzilla:
  #       1560552
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #       startsin: 5.8
  #   
  # pass
end
def test_config_manager_remove_objects_ansible_tower_310()
  # 
  #   1) Add Configuration manager
  #   2) Perform refresh and wait until it is successfully refreshed
  #   3) Remove provider
  #   4) Click through accordion and double check that no objects (e.g.
  #   tower job templates) were left in the UI
  # 
  #   Polarion:
  #       assignee: jhenner
  #       caseimportance: medium
  #       casecomponent: Ansible
  #       initialEstimate: 1/4h
  #       startsin: 5.7
  #   
  # pass
end
def test_config_manager_change_zone()
  # 
  #   Add Ansible Tower in multi appliance, add it to appliance with UI. Try
  #   to change to zone where worker is enabled.
  # 
  #   Bugzilla:
  #       1353015
  # 
  #   Polarion:
  #       assignee: jhenner
  #       casecomponent: Provisioning
  #       caseimportance: medium
  #       initialEstimate: 1h
  #       startsin: 5.8
  #   
  # pass
end
