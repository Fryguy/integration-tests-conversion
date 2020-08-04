// Test whether the PDF documents are present.
// 
//   Polarion:
//       assignee: pvala
//       casecomponent: WebUI
//       caseimportance: low
//       initialEstimate: 1/20h
//   
// Test title of each document.
// 
//   Polarion:
//       assignee: pvala
//       casecomponent: WebUI
//       caseimportance: low
//       initialEstimate: 1/10h
//   
function test_all_docs_present(appliance) {
  // 
  //   Check that all the documents that we expect to be in the UI are present
  //   Use the doc_titles dict keys to query widget is_displayed
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: low
  //       initialEstimate: 1/10h
  //   
  let view = navigate_to(appliance.server, "Documentation");

  for (let [doc_type, title] in doc_titles.to_a()) {
    if (!view.links.instance_variable_defined("@oc_typ")) throw new ();
    if (!view.links.getattr(doc_type).is_displayed) throw new ()
  }
}
