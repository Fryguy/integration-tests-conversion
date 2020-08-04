require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure");
include(Cfme.Infrastructure);
require_relative("cfme/utils/testgen");
include(Cfme.Utils.Testgen);
require_relative("cfme/utils/testgen");
include(Cfme.Utils.Testgen);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytest_generate_tests = generate({gen_func: pxe_servers});

function has_no_pxe_servers() {
  pxe.remove_all_pxe_servers()
};

function test_pxe_server_crud(pxe_name, pxe_server_crud) {
  // 
  //   Basic Add test for PXE server including refresh.
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Provisioning
  //       caseimportance: medium
  //       initialEstimate: 1/6h
  //       upstream: yes
  //   
  pxe_server_crud.create({refresh_timeout: 300});

  update(
    pxe_server_crud,
    () => pxe_server_crud.name = `${pxe_server_crud.name}_update`
  );

  pxe_server_crud.delete({cancel: false})
}
