# Manual tests
require_relative 'cfme'
include Cfme
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
pytestmark = [pytest.mark.ignore_stream("upstream"), pytest.mark.manual, test_requirements.right_size, pytest.mark.provider([VMwareProvider], selector: ONE)]
nor_parts = ["cpu", "memory"]
def test_normal_operating_range(provider, value_type)
  # 
  #   NOR cpu values are correct.
  #   Compute > Infrastructure > Virtual Machines > select a VM running on vsphere
  #   Normal Operating Ranges widget displays correct values for CPU/Memory
  #   and CPU/Memory usage.
  #   Max, high, average, and low values are displayed if at least one days worth of
  #   metrics have been captured.
  #   The Average reflects the past 30 days worth of captured metrics.
  #   The High and Low reflect the range of values obtained ~85% of the time within the past 30 days.
  #   The Max reflects the maximum value obtained within the past 30 days.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  # 
  #   Bugzilla:
  #       1469243
  #   
  # pass
end
def test_rightsize_recommendations(provider, value_type)
  # 
  #   Right-size memory values are correct.
  # 
  #   Polarion:
  #       assignee: tpapaioa
  #       casecomponent: CandU
  #       initialEstimate: 1/4h
  # 
  #   Bugzilla:
  #       1469243
  #   
  # pass
end
