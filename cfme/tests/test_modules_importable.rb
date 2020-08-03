ROOT = py.path.local(cfme.__file__).dirpath()
MODULES = sorted(ROOT.visit("*.py").map{|x| x})
KNOWN_FAILURES = 
def test_import_own_module(module_path)
  # 
  #   Polarion:
  #       assignee: mshriver
  #       casecomponent: Appliance
  #       initialEstimate: 1/4h
  #   
  if KNOWN_FAILURES.include?(module_path)
    pytest.skip()
  end
  subprocess.check_call([sys.executable, "-c", "import sys, py;py.path.local(sys.argv[1]).pyimport()", module_path.to_s])
end
