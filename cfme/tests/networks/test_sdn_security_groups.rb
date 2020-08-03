require_relative 'cfme'
include Cfme
require_relative 'cfme/cloud/provider/ec2'
include Cfme::Cloud::Provider::Ec2
require_relative 'cfme/cloud/provider/openstack'
include Cfme::Cloud::Provider::Openstack
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.sdn, pytest.mark.usefixtures("setup_provider"), pytest.mark.provider([OpenStackProvider], scope: "module")]
def sec_group(appliance, provider)
  collection = appliance.collections.security_groups
  begin
    sec_group = collection.create(name: fauxfactory.gen_alphanumeric(15, start: "sec_grp_"), description: fauxfactory.gen_alphanumeric(18, start: "sec_grp_desc_"), provider: provider, wait: true)
  rescue TimedOutError
    pytest.fail("Timed out creating Security Groups")
  end
  yield sec_group
  if is_bool(sec_group.exists)
    sec_group.delete(wait: true)
  end
end
def test_security_group_crud(sec_group)
  #  This will test whether it will create new Security Group and then deletes it.
  #   Steps:
  #       * Select Network Manager.
  #       * Provide Security groups name.
  #       * Provide Security groups Description.
  #       * Select Cloud Tenant.
  #       * Also delete it.
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #   
  raise unless sec_group.exists
  sec_group.delete(wait: true)
  raise unless !sec_group.exists
end
def test_security_group_create_cancel(appliance, provider)
  #  This will test cancelling on adding a security groups.
  # 
  #   Steps:
  #       * Select Network Manager.
  #       * Provide Security groups name.
  #       * Provide Security groups Description.
  #       * Select Cloud Tenant.
  #       * Cancel it.
  # 
  #   Polarion:
  #       assignee: rhcf3_machine
  #       initialEstimate: 1/4h
  #       casecomponent: Cloud
  #   
  security_group = appliance.collections.security_groups
  sec_group = security_group.create(name: fauxfactory.gen_alphanumeric(15, start: "sec_grp_"), description: fauxfactory.gen_alphanumeric(18, start: "sec_grp_desc_"), provider: provider, cancel: true)
  raise unless !sec_group.exists
end
def test_security_group_record_values_ec2(provider)
  # 
  #   Bugzilla:
  #       1540283
  # 
  #   Polarion:
  #       assignee: mmojzis
  #       caseimportance: medium
  #       casecomponent: Cloud
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Have an ec2 provider with a security group
  #           (which has all the possible values in records)
  #           2. Go to Networks -> Security groups
  #           3. Select a security group and go to its summary
  #       expectedResults:
  #           1.
  #           2.
  #           3. All traffic with All protocol are displayed as -1.
  #           When port range is All then Port and End port are displayed as 0.
  #           When port range is N/A then it's displayed also as 0.
  #           When source is IPV6 then record is not displayed at all!!!
  #           When record type is custom protocol then only its number is displayed.
  #   
  # pass
end
