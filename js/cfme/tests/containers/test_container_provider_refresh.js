require("None");
require_relative("sqlalchemy/exc");
include(Sqlalchemy.Exc);
require_relative("sqlalchemy/orm/session");
include(Sqlalchemy.Orm.Session);
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/markers/env_markers/provider");
include(Cfme.Markers.Env_markers.Provider);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);

let pytestmark = [
  pytest.mark.tier(1),
  test_requirements.containers,

  pytest.mark.provider(
    [ContainersProvider],
    {scope: "function", selector: ONE_PER_VERSION}
  )
];

function setup_temp_appliance_provider(temp_appliance_preconfig, provider) {
  temp_appliance_preconfig(() => {
    provider.create();
    wait_for(provider.is_refreshed, {func_kwargs: {}, timeout: 600});
    yield(provider);
    provider.delete()
  })
};

function test_dup_db_entry_refresh(setup_temp_appliance_provider, temp_appliance_preconfig, provider) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: critical
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  // 
  //   Bugzilla:
  //       1732442
  //       1749060
  //   
  let appliance = temp_appliance_preconfig;
  let image_table = appliance.db.client.container_groups;
  let image_query = appliance.db.client.session.query(image_table);
  let all_db_entries = image_query.all();

  if (is_bool(!all_db_entries)) {
    pytest.fail("No Entries in the containter_groups DB table")
  };

  let db_entry = all_db_entries[0];
  let copied_db_entry = deepcopy(db_entry);
  appliance.db.client.session.expunge(db_entry);
  make_transient(db_entry);
  let db_entry_last = all_db_entries[-1];
  copied_db_entry.id = db_entry_last.id + 500;

  try {
    appliance.db.client.transaction(() => (
      appliance.db.client.session.add(copied_db_entry)
    ))
  } catch (ex) {
    if (ex instanceof IntegrityError) {
      pytest.fail(`Exception while adding DB entry. ${ex}`)
    } else {
      throw ex
    }
  };

  let new_db_entry = image_query.filter(image_table.id == copied_db_entry.id).all();
  if (new_db_entry.size != 1) throw new ();

  for (let [column, value] in vars(new_db_entry[0]).to_a()) {
    if (column == "_sa_instance_state") {
      continue
    } else if (column == "id") {
      if (value == db_entry.getattr(column)) throw new ()
    } else if (value != db_entry.getattr(column)) {
      throw new ()
    }
  };

  (LogValidator(
    "/var/www/miq/vmdb/log/evm.log",
    {failure_patterns: [".*nil:NilClass.*"]}
  )).waiting({timeout: 600}, () => {
    provider.refresh_provider_relationships();
    wait_for(provider.is_refreshed, {func_kwargs: {}, timeout: 600})
  })
}
