require_relative 'Crypto/PublicKey'
include Crypto::PublicKey
require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/keypairs'
include Cfme::Cloud::Keypairs
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
pytestmark = [pytest.mark.tier(3), test_requirements.cloud, pytest.mark.usefixtures("has_no_providers_modscope", "setup_provider_modscope"), pytest.mark.provider([EC2Provider, OpenStackProvider], scope: "module")]
def keypair(appliance, provider)
  key = appliance.collections.cloud_keypairs.create(name: fauxfactory.gen_alphanumeric(), provider: provider)
  raise unless key.exists
  yield(key)
end
def test_keypair_crud(appliance, provider)
  #  This will test whether it will create new Keypair and then deletes it.
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Create keypair.
  #           2. Read keypair.
  #           3. Delete keypair.
  #   
  keypair = appliance.collections.cloud_keypairs.create(name: fauxfactory.gen_alphanumeric(), provider: provider)
  raise unless keypair.exists
  keypair.delete(wait: true)
  raise unless !keypair.exists
end
def test_keypair_crud_with_key(provider, appliance)
  #  This will test whether it will create new Keypair and then deletes it.
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Create keypair.
  #           2. Read keypair.
  #           3. Delete keypair.
  #   
  key = RSA.generate(1024)
  public_key = key.publickey().exportKey("OpenSSH").decode("utf-8")
  keypair = appliance.collections.cloud_keypairs.create(fauxfactory.gen_alphanumeric(), provider, public_key)
  raise unless keypair.exists
  keypair.delete(wait: true)
  raise unless !keypair.exists
end
def test_keypair_create_cancel(provider, appliance)
  #  This will test cancelling on adding a keypair
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Cancel creating keypair.
  #   
  keypair = appliance.collections.cloud_keypairs.create(name: "", provider: provider, cancel: true)
  raise unless !keypair.exists
end
def test_keypair_create_name_validation(provider, appliance)
  #  This will test validating that key pair without name cannot be created.
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Try to add key pair with empty name.
  #   
  keypair_collection = appliance.collections.cloud_keypairs
  view = navigate_to(keypair_collection, "Add")
  view.fill({"provider" => provider})
  raise unless !view.form.add.active
  if is_bool(provider.one_of(OpenStackProvider))
    view = navigate_to(keypair_collection, "Add")
    keypair_name = ".?!_"
    view.form.fill({"name" => keypair_name, "provider" => provider.name})
    view.form.add.click()
    view = view.browser.create_view(KeyPairAllView)
    view.flash.assert_message("Unable to create Key Pair \"{}\": Keypair data is invalid: Keypair name contains unsafe characters".format(keypair_name))
  end
end
def test_keypair_create_invalid_key_validation(provider, appliance)
  #  This will test validating that key pair with invalid public key cannot be created.
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: low
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Try to add key pair with invalid public key.
  #   
  invalid_key = fauxfactory.gen_alphanumeric()
  keypair_name = fauxfactory.gen_alphanumeric()
  keypair_collection = appliance.collections.cloud_keypairs
  view = navigate_to(keypair_collection, "Add")
  view.form.fill({"name" => keypair_name, "provider" => provider.name, "public_key" => invalid_key})
  view.form.add.click()
  view = view.browser.create_view(KeyPairAllView)
  if is_bool(provider.one_of(EC2Provider))
    view.flash.assert_message("Unable to create Key Pair \"{}\": Key is not in valid OpenSSH public key format".format(keypair_name))
  else
    if is_bool(provider.one_of(OpenStackProvider))
      view.flash.assert_message("Unable to create Key Pair \"{}\": Keypair data is invalid: failed to generate fingerprint".format(keypair_name))
    end
  end
end
def test_keypair_add_and_remove_tag(keypair)
  #  This will test whether it will add and remove tag for newly created Keypair or not
  #   and then deletes it.
  #   Polarion:
  #       assignee: anikifor
  #       casecomponent: Tagging
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Create keypair.
  #           2. Read keypair.
  #           3. Add tag to Keypair.
  #           4. Remove tag from Keypair.
  #           5. Delete keypair.
  #   
  added_tag = keypair.add_tag()
  raise "Assigned tag was not found on keypair" unless keypair.get_tags().include?(added_tag)
  keypair.remove_tag(added_tag)
  raise "Remove tag failed." unless !keypair.get_tags().include?(added_tag)
  keypair.delete(wait: true)
  raise unless !keypair.exists
end
def test_download_private_key(keypair)
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  keypair.download_private_key()
end
def test_keypair_visibility_in_tenants(appliance, child_tenant_admin_user)
  # 
  #   Test to verify key pair visibility in tenants based on key pair ownership
  # 
  #   Polarion:
  #       assignee: nachandr
  #       casecomponent: Configuration
  #       caseimportance: high
  #       tags: cfme_tenancy
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Copy the EvmRole_tenant_admin role to a new role (Since this role does not have the
  #              Auth Key Pairs feature enabled).
  #           2. Enable the Auth Key Pairs feature for the new role.
  #           3. Add either new or existing group to the newly created tenant admin role.
  #              (Steps 1-3 are done through fixtures)
  #           4. If the added group belongs to a child tenant, then the key pair is only visible to
  #              users in that group/child tenant and also users from groups that belong to parent
  #              tenants.
  #   
  view = navigate_to(appliance.collections.cloud_keypairs, "All")
  key_pair = view.entities.get_first_entity().data["name"]
  key_pair_obj = appliance.collections.cloud_keypairs.instantiate(key_pair)
  key_pair_obj.set_ownership(group: child_tenant_admin_user.groups[0])
  view.flash.assert_success_message("Ownership saved for selected Key Pair")
  child_tenant_admin_user {
    raise unless key_pair_obj.exists
  }
end
def test_keypair_ownership_association(appliance, keypair)
  # 
  #   Bugzilla:
  #       1713400
  #       1747179
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       casecomponent: Cloud
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  owner_name = "Administrator"
  group_name = "EvmGroup-administrator"
  owner = appliance.collections.users.instantiate(owner_name)
  group = appliance.collections.groups.instantiate(group_name)
  keypair.set_ownership(group: group, owner: owner)
  view = navigate_to(keypair, "Details")
  raise unless owner_name == view.entities.lifecycle.get_text_of("Owner")
  raise unless group_name == view.entities.lifecycle.get_text_of("Group")
end
