require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/provisioning_dialogs");
include(Cfme.Automate.Provisioning_dialogs);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);

function test_provisioning_dialog_crud(appliance) {
  // 
  //   Polarion:
  //       assignee: jhenner
  //       casecomponent: Provisioning
  //       initialEstimate: 1/10h
  //       caseimportance: medium
  //   
  let collection = appliance.collections.provisioning_dialogs;

  let dialog = collection.create({
    name: fauxfactory.gen_alphanumeric({start: "dialog_"}),

    description: fauxfactory.gen_alphanumeric(
      15,
      {start: "dialog_desc_"}
    ),

    diag_type: collection.VM_PROVISION
  });

  if (!dialog.exists) throw new ();

  update(dialog, () => {
    dialog.name = fauxfactory.gen_alphanumeric();
    dialog.description = fauxfactory.gen_alphanumeric()
  });

  if (!dialog.exists) throw new ();
  update(dialog, () => dialog.diag_type = collection.VM_MIGRATE);
  if (!dialog.exists) throw new ();
  dialog.update({updates: {description: "not saved"}, cancel: true});
  let view = navigate_to(dialog, "Details");
  if (!view.entities) throw new ();
  dialog.delete({cancel: true});
  if (!dialog.exists) throw new ();
  dialog.delete();
  if (!!dialog.exists) throw new ()
};

let sort_by_params = [];

for (let name in ProvisioningDialogsCollection.ALLOWED_TYPES) {
  sort_by_params.push([name, "Name", "ascending"]);
  sort_by_params.push([name, "Name", "descending"]);
  sort_by_params.push([name, "Description", "ascending"]);
  sort_by_params.push([name, "Description", "descending"])
};

function test_provisioning_dialogs_sorting(appliance, name, by, order) {
  // 
  //   Polarion:
  //       assignee: pvala
  //       casecomponent: WebUI
  //       caseimportance: medium
  //       initialEstimate: 1/30h
  //   
  let view = navigate_to(
    appliance.collections.provisioning_dialogs,
    "All"
  );

  view.sidebar.provisioning_dialogs.tree.click_path(
    "All Dialogs",
    name
  );

  view.entities.table.sort_by(by, order)
}
