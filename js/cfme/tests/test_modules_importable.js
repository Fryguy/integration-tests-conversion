const ROOT = py.path.local(cfme.__file__).dirpath();
const MODULES = sorted(ROOT.visit("*.py").map(x => x));

const KNOWN_FAILURES = [
  "cfme/utils/ports.py",
  "cfme/utils/dockerbot/check_prs.py",
  "cfme/utils/conf.py",
  "cfme/intelligence/rss.py",
  "cfme/intelligence/timelines.py",
  "cfme/intelligence/chargeback/rates.py",
  "cfme/intelligence/chargeback/assignments.py",
  "cfme/intelligence/chargeback/__init__.py",
  "cfme/dashboard.py",
  "cfme/configure/tasks.py",
  "cfme/scripting/bz.py",
  "cfme/scripting/miq.py"
].map(x => x.ROOT.dirpath().join).to_set;

function test_import_own_module(module_path) {
  // 
  //   Polarion:
  //       assignee: mshriver
  //       casecomponent: Appliance
  //       initialEstimate: 1/4h
  //   
  if (KNOWN_FAILURES.include(module_path)) {
    pytest.skip(`${ROOT.dirpath().bestrelpath(module_path)} is a known failed path`)
  };

  subprocess.check_call([
    sys.executable,
    "-c",
    "import sys, py;py.path.local(sys.argv[1]).pyimport()",
    module_path.to_s
  ])
}
