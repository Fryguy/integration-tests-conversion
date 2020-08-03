require_relative 'itertools'
include Itertools
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider'
include Cfme::Infrastructure::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/scvmm'
include Cfme::Infrastructure::Provider::Scvmm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/providers'
include Cfme::Utils::Providers
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.discovery]
def generate_signature(combination)
  return combination.map{|p| p.type}.join("-")
end
def find_neighbour_provider_combinations(providers, upto)
  neighbours = []
  combinations_seen = Set.new()
  for count in 1.upto((upto + 1)-1)
    for combination in combinations(providers, count)
      ip_prefix = combination[0].ip_address.split_p(".")[0...3].join(".")
      if is_bool(!(combination[1..-1].map{|provider| provider.ip_address.startswith(ip_prefix)}).is_all?)
        next
      end
      filtered_combination = []
      types_seen = Set.new()
      for provider in combination
        if types_seen.include?(provider.type)
          next
        end
        types_seen.add(provider.type)
        filtered_combination.push(provider)
      end
      combination = sorted(filtered_combination, key: lambda{|provider| provider.type})
      combination_tuple = combination.map{|provider| provider.type}.to_a
      if combinations_seen.include?(combination_tuple)
        next
      end
      combinations_seen.add(combination_tuple)
      neighbours.push(combination)
    end
  end
  return neighbours
end
def minmax_ip(providers)
  ips = sorted(providers.map{|provider| provider.ip_address.split_p(".").map{|_| Integer(_)}.to_a})
  return [ips[0].map{|_| String(_)}.join("."), (ips[-1][-1]).to_s]
end
def pytest_generate_tests(metafunc)
  types = [VMwareProvider, RHEVMProvider, SCVMMProvider]
  argnames,argvalues,idlist = testgen.providers_by_class(metafunc, types)
  argnames = ["providers_for_discover", "start_ip", "max_range"]
  new_id_list = []
  providers_complete = []
  providers_final = []
  for x in idlist
    providers_complete.push(get_crud(x))
  end
  provider_combinations = sorted(find_neighbour_provider_combinations(providers_complete, types.size), key: len)
  signatures_seen = Set.new()
  for prov_comb in provider_combinations
    sig = generate_signature(prov_comb)
    if signatures_seen.include?(sig)
      next
    end
    signatures_seen.add(sig)
    start_ip,max_range = minmax_ip(prov_comb)
    providers_final.push([prov_comb, start_ip, max_range])
    new_id_list.push(sig)
  end
  testgen.parametrize(metafunc, argnames, providers_final, ids: new_id_list, scope: "module")
end
def delete_providers_after_test()
  yield
  InfraProvider.clear_providers()
end
def test_discover_infra(appliance, has_no_providers, providers_for_discover, start_ip, max_range, delete_providers_after_test)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/16h
  #       upstream: yes
  #   
  collection = appliance.collections.infra_providers
  for provider in providers_for_discover
    collection.discover(provider, false, start_ip, max_range)
  end
  _wait_for_all_providers = lambda do
    __dummy0__ = false
    for provider in providers_for_discover
      provider.browser.refresh()
      if is_bool(provider.appliance.managed_provider_names.select{|name| name.include?(provider.ip_address)}.map{|name| name})
        next
      else
        return false
      end
      if provider == providers_for_discover[-1]
        __dummy0__ = true
      end
    end
    if __dummy0__
      return true
    end
  end
end
def count_timeout(start_ip, max_range)
  count = max_range.to_i - ((start_ip.rsplit(".", 1)[-1]).to_i)
  result = count * 30
  if result < 300
    result = 300
  end
  return result
end
