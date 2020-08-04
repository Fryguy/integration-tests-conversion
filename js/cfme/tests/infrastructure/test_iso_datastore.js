require_relative("cfme");
include(Cfme);
require_relative("cfme/infrastructure");
include(Cfme.Infrastructure);
require_relative("cfme/infrastructure/provider");
include(Cfme.Infrastructure.Provider);

let pytestmark = [
  pytest.mark.usefixtures("uses_infra_providers"),
  pytest.mark.tier(2),

  pytest.mark.provider(
    [InfraProvider],
    {required_fields: [["iso_datastore", true]]}
  )
];

function no_iso_dss(provider) {
  let template_crud = pxe.ISODatastore(provider.name);
  if (is_bool(template_crud.exists())) template_crud.delete({cancel: false})
};

function test_iso_datastore_crud(setup_provider, no_iso_dss, provider) {
  // 
  //   Basic CRUD test for ISO datastores.
  // 
  //   Note:
  //       An ISO datastore cannot be edited.
  // 
  //   Metadata:
  //       test_flag: iso
  // 
  //   Polarion:
  //       assignee: jhenner
  //       initialEstimate: 1/4h
  //       casecomponent: Infra
  //       caseimportance: critical
  //   
  let template_crud = pxe.ISODatastore(provider.name);
  template_crud.create();
  template_crud.delete({cancel: false})
}
