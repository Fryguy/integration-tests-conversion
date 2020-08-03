require 'None'
require_relative 'sqlalchemy/exc'
include Sqlalchemy::Exc
require_relative 'sqlalchemy/orm/session'
include Sqlalchemy::Orm::Session
require_relative 'cfme'
include Cfme
require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/utils/log_validator'
include Cfme::Utils::Log_validator
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [pytest.mark.tier(1), test_requirements.containers, pytest.mark.provider([ContainersProvider], scope: "function", selector: ONE_PER_VERSION)]
def setup_temp_appliance_provider(temp_appliance_preconfig, provider)
  temp_appliance_preconfig {
    provider.create()
    wait_for(provider.is_refreshed, func_kwargs: {}, timeout: 600)
    yield(provider)
    provider.delete()
  }
end
def test_dup_db_entry_refresh(setup_temp_appliance_provider, temp_appliance_preconfig, provider)
  # 
  #   Polarion:
  #       assignee: juwatts
  #       caseimportance: critical
  #       casecomponent: Containers
  #       initialEstimate: 1/6h
  # 
  #   Bugzilla:
  #       1732442
  #       1749060
  #   
  appliance = temp_appliance_preconfig
  image_table = appliance.db.client["container_groups"]
  image_query = appliance.db.client.session.query(image_table)
  all_db_entries = image_query.all()
  if is_bool(!all_db_entries)
    pytest.fail("No Entries in the containter_groups DB table")
  end
  db_entry = all_db_entries[0]
  copied_db_entry = deepcopy(db_entry)
  appliance.db.client.session.expunge(db_entry)
  make_transient(db_entry)
  db_entry_last = all_db_entries[-1]
  copied_db_entry.id = db_entry_last.id + 500
  begin
    appliance.db.client.transaction {
      appliance.db.client.session.add(copied_db_entry)
    }
  rescue IntegrityError => ex
    pytest.fail("Exception while adding DB entry. #{ex}")
  end
  new_db_entry = image_query.filter(image_table.id == copied_db_entry.id).all()
  raise unless new_db_entry.size == 1
  for (column, value) in vars(new_db_entry[0]).to_a()
    if column == "_sa_instance_state"
      next
    else
      if column == "id"
        raise unless value != db_entry.getattr(column)
      else
        raise unless value == db_entry.getattr(column)
      end
    end
  end
  (LogValidator("/var/www/miq/vmdb/log/evm.log", failure_patterns: [".*nil:NilClass.*"])).waiting(timeout: 600) {
    provider.refresh_provider_relationships()
    wait_for(provider.is_refreshed, func_kwargs: {}, timeout: 600)
  }
end
