require_relative("cfme");
include(Cfme);
require_relative("cfme/automate/dialog_import_export");
include(Cfme.Automate.Dialog_import_export);
require_relative("cfme/fixtures/automate");
include(Cfme.Fixtures.Automate);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/conf");
include(Cfme.Utils.Conf);
require_relative("cfme/utils/ftp");
include(Cfme.Utils.Ftp);
require_relative("cfme/utils/log_validator");
include(Cfme.Utils.Log_validator);
require_relative("cfme/utils/update");
include(Cfme.Utils.Update);
let pytestmark = [test_requirements.automate, pytest.mark.tier(3)];

function test_domain_import_file(import_datastore, import_data) {
  // This test case Verifies that a domain can be imported from file.
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/6h
  //       caseimportance: medium
  //       startsin: 5.7
  //       casecomponent: Automate
  //       tags: automate
  //       testSteps:
  //           1. Navigate to Automation > Automate > Import/Export
  //           2. Upload zip datastore file
  //           3. Select domain which like to import
  //       expectedResults:
  //           1.
  //           2.
  //           3. Import should work. Check imported or not.
  //   
  if (!import_datastore.exists) throw new ()
};

function test_upload_blank_file(appliance, upload_file) {
  // 
  //   Bugzilla:
  //       1720611
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       caseposneg: negative
  //       startsin: 5.10
  //       casecomponent: Automate
  //       testSteps:
  //           1. Create blank zip(test.zip) and yaml(test.yml) file
  //           2. Navigate to Automation > Automate > Import/Export and upload test.zip file
  //           3. Navigate to Automation > Automate > Customization > Import/Export and upload test.yml
  //       expectedResults:
  //           1.
  //           2. Error message should be displayed
  //           3. Error message should be displayed
  //   
  let fs = FTPClientWrapper(cfme_data.ftpserver.entities.datastores);
  let file_path = fs.download(upload_file);

  if (upload_file == "dialog_blank.yml") {
    (LogValidator(
      "/var/www/miq/vmdb/log/production.log",
      {failure_patterns: [".*FATAL.*"]}
    )).waiting({timeout: 120}, () => {
      let import_export = DialogImportExport(appliance);
      let view = navigate_to(import_export, "DialogImportExport");
      view.upload_file.fill(file_path);
      view.upload.click();
      view.flash.assert_message("Error: the uploaded file is blank")
    })
  } else {
    let datastore = appliance.collections.automate_import_exports.instantiate({
      import_type: "file",
      file_path
    });

    let view = navigate_to(
      appliance.collections.automate_import_exports,
      "All"
    );

    (LogValidator(
      "/var/www/miq/vmdb/log/production.log",
      {failure_patterns: [".*FATAL.*"]}
    )).waiting({timeout: 120}, () => {
      view.import_file.upload_file.fill(datastore.file_path);
      view.import_file.upload.click();
      view.flash.assert_message("Error: import processing failed: domain: *")
    })
  }
};

function test_crud_imported_domains(import_data, temp_appliance_preconfig) {
  // 
  //   Bugzilla:
  //       1753586
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       caseposneg: positive
  //       casecomponent: Automate
  //   
  let fs = FTPClientWrapper(cfme_data.ftpserver.entities.datastores);
  let file_path = fs.download(import_data.file_name);

  let datastore = temp_appliance_preconfig.collections.automate_import_exports.instantiate({
    import_type: "file",
    file_path
  });

  let domain = datastore.import_domain_from(
    import_data.from_domain,
    import_data.to_domain
  );

  if (!domain.exists) throw new ();

  if (import_data.file_name == "bz_1753586_system.zip") {
    let view = navigate_to(domain, "Details");
    if (!!view.configuration.is_displayed) throw new ()
  } else {
    let view = navigate_to(domain.parent, "All");
    update(domain, () => domain.description = fauxfactory.gen_alpha());
    domain.delete();
    view.flash.assert_message(`Automate Domain \"${domain.description}\": Delete successful`)
  }
};

function setup_automate_model(appliance) {
  // This fixture creates domain, namespace, klass
  let domain = appliance.collections.domains.create({
    name: "bz_1440226",
    description: fauxfactory.gen_alpha(),
    enabled: true
  });

  let namespace = domain.namespaces.create({
    name: "test_name",
    description: fauxfactory.gen_alpha()
  });

  let klass = namespace.classes.create({
    name: "test_class",
    display_name: "test_class_display",
    description: fauxfactory.gen_alpha()
  });

  yield([domain, namespace, klass]);
  klass.delete_if_exists();
  namespace.delete_if_exists();
  domain.delete_if_exists()
};

function test_automate_import_attributes_updated(setup_automate_model, import_datastore, import_data) {
  // 
  //   Note: We are not able to export automate model using automation. Hence importing same datastore
  //   which is already uploaded on FTP. So step 1 and 2 are performed manually and uploaded that
  //   datastore on FTP.
  // 
  //   Bugzilla:
  //       1440226
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       casecomponent: Automate
  //       caseimportance: low
  //       initialEstimate: 1/12h
  //       tags: automate
  //       testSteps:
  //           1. Export an Automate model
  //           2. Change the description in the exported namespace, class yaml file
  //           3. Import the updated datastore
  //           4. Check if the description attribute gets updated
  //   
  let [domain, namespace, klass] = setup_automate_model;
  let view = navigate_to(namespace, "Edit");
  if (view.description.read() != "test_name_desc_updated") throw new ();
  view = navigate_to(klass, "Edit");
  if (view.description.read() != "test_class_desc") throw new ()
};

function local_domain(appliance) {
  // This fixture used to create automate domain - Datastore/Domain
  let domain = appliance.collections.domains.create({
    name: "bz_1753860",
    description: fauxfactory.gen_alpha(),
    enabled: true
  });

  yield(domain);
  domain.enabled = domain.rest_api_entity.enabled;
  domain.delete_if_exists()
};

function test_overwrite_import_domain(local_domain, appliance, file_name) {
  // 
  //   Note: This PR automates this scenario via rake commands. But this RFE is not yet fixed as it has
  //   bug to apply this scenario via UI.
  // 
  //   Bugzilla:
  //       1753860
  // 
  //   Polarion:
  //       assignee: dgaikwad
  //       initialEstimate: 1/8h
  //       caseposneg: positive
  //       casecomponent: Automate
  //       setup:
  //           1. Create custom domain, namespace, class, instance, method. Do not delete this domain.
  //           2. Navigate to automation > automate > import/export and export all classes and
  //              instances to a file
  //           3. Extract the file and update __domain__.yaml file of custom domain as below:
  //              >> description: test_desc
  //              >> enabled: false
  //              Note: These steps needs to perform manually
  //       testSteps:
  //           1. Compress this domain file and import it via UI.
  //       expectedResults:
  //           1. Description and enabled status of existing domain should update.
  //   
  let datastore_file = FTPClientWrapper(cfme_data.ftpserver.entities.datastores).get_file(file_name);
  let file_path = File.join("/tmp", datastore_file.name);

  if (!(appliance.ssh_client.run_command(`curl -o ${file_path} ftp://${datastore_file.link}`)).success) {
    throw new ()
  };

  let rake_cmd = ["false", "true"].map(enable => (
    [
      enable,
      `evm:automate:import PREVIEW=false DOMAIN=bz_1753860 IMPORT_AS=bz_1753860 ZIP_FILE=${file_path} SYSTEM=false ENABLED=${enable} OVERWRITE=true`
    ]
  )).to_h;

  for (let [status, cmd] in rake_cmd.to_a()) {
    appliance.ssh_client.run_rake_command(cmd);
    let view = navigate_to(local_domain.parent, "All");
    view.browser.refresh();

    if (view.domains.row({name__contains: local_domain.name}).Enabled.text != status) {
      throw new ()
    }
  }
}
