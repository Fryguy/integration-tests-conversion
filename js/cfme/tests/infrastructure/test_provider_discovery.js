require_relative("itertools");
include(Itertools);
require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);
require_relative("cfme/infrastructure/provider/rhevm");
include(Cfme.Infrastructure.Provider.Rhevm);
require_relative("cfme/infrastructure/provider/scvmm");
include(Cfme.Infrastructure.Provider.Scvmm);
require_relative("cfme/infrastructure/provider/virtualcenter");
include(Cfme.Infrastructure.Provider.Virtualcenter);
require_relative("cfme/utils");
include(Cfme.Utils);
require_relative("cfme/utils/providers");
include(Cfme.Utils.Providers);
require_relative("cfme/utils/wait");
include(Cfme.Utils.Wait);
let pytestmark = [test_requirements.discovery];

function generate_signature(combination) {
  return combination.map(p => p.type).join("-")
};

function find_neighbour_provider_combinations(providers, upto) {
  let neighbours = [];
  let combinations_seen = new Set();

  for (let count in (1).upto((upto + 1) - 1)) {
    for (let combination in combinations(providers, count)) {
      let ip_prefix = combination[0].ip_address.split_p(".")[_.range(0, 3)].join(".");

      if (is_bool(!(combination[_.range(1, 0)].map(provider => (
        provider.ip_address.startswith(ip_prefix)
      ))).is_all)) continue;

      let filtered_combination = [];
      let types_seen = new Set();

      for (let provider in combination) {
        if (types_seen.include(provider.type)) continue;
        types_seen.add(provider.type);
        filtered_combination.push(provider)
      };

      combination = sorted(
        filtered_combination,
        {key(provider) {return provider.type}}
      );

      let combination_tuple = combination.map(provider => provider.type).to_a;
      if (combinations_seen.include(combination_tuple)) continue;
      combinations_seen.add(combination_tuple);
      neighbours.push(combination)
    }
  };

  return neighbours
};

function minmax_ip(providers) {
  let ips = sorted(providers.map(provider => (
    provider.ip_address.split_p(".").map(_ => Integer(_)).to_a
  )));

  return [ips[0].map(_ => String(_)).join("."), (ips[-1][-1]).to_s]
};

function pytest_generate_tests(metafunc) {
  let types = [VMwareProvider, RHEVMProvider, SCVMMProvider];

  let [argnames, argvalues, idlist] = testgen.providers_by_class(
    metafunc,
    types
  );

  argnames = ["providers_for_discover", "start_ip", "max_range"];
  let new_id_list = [];
  let providers_complete = [];
  let providers_final = [];

  for (let x in idlist) {
    providers_complete.push(get_crud(x))
  };

  let provider_combinations = sorted(
    find_neighbour_provider_combinations(providers_complete, types.size),
    {key: len}
  );

  let signatures_seen = new Set();

  for (let prov_comb in provider_combinations) {
    let sig = generate_signature(prov_comb);
    if (signatures_seen.include(sig)) continue;
    signatures_seen.add(sig);
    let [start_ip, max_range] = minmax_ip(prov_comb);
    providers_final.push([prov_comb, start_ip, max_range]);
    new_id_list.push(sig)
  };

  testgen.parametrize(
    metafunc,
    argnames,
    providers_final,
    {ids: new_id_list, scope: "module"}
  )
};

function delete_providers_after_test() {
  yield;
  InfraProvider.clear_providers()
};

function test_discover_infra(appliance, has_no_providers, providers_for_discover, start_ip, max_range, delete_providers_after_test) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: Infra
  //       caseimportance: medium
  //       initialEstimate: 1/16h
  //       upstream: yes
  //   
  let collection = appliance.collections.infra_providers;

  for (let provider in providers_for_discover) {
    collection.discover(provider, false, start_ip, max_range)
  };

  let _wait_for_all_providers = () => {
    let __dummy0__ = false;

    for (let provider in providers_for_discover) {
      provider.browser.refresh();

      if (is_bool(provider.appliance.managed_provider_names.select(name => (
        name.include(provider.ip_address)
      )).map(name => name))) {
        continue
      } else {
        return false
      };

      if (provider == providers_for_discover[-1]) __dummy0__ = true
    };

    if (__dummy0__) return true
  }
};

function count_timeout(start_ip, max_range) {
  let count = max_range.to_i - ((start_ip.rsplit(".", 1)[-1]).to_i);
  let result = count * 30;
  if (result < 300) result = 300;
  return result
}
