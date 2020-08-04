require("None");
require("None");
require("None");
require_relative("string");
include(String);
require_relative("string");
include(String);
require_relative("manageiq_client/api");
include(Manageiq_client.Api);
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/containers/provider/openshift");
include(Cfme.Containers.Provider.Openshift);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);

let pytestmark = [
  pytest.mark.usefixtures("setup_provider"),
  pytest.mark.tier(2),
  pytest.mark.provider([ContainersProvider], {scope: "function"}),
  test_requirements.containers
];

function get_random_string(length) {
  let valid_chars = (digits + ascii_letters) + (" !@\#$%^&*()");
  let out = length.times.map(_ => choice(valid_chars)).join("");
  return re.sub("\\s+", " ", out)
};

const ATTRIBUTES_DATASET = [
  CustomAttribute("exp date", "2017-01-02", "Date"),
  CustomAttribute("sales force acount", "ADF231VRWQ1", null),
  CustomAttribute("expected num of nodes", "2", null)
];

const VALUE_UPDATES = ["2018-07-12", "ADF231VRWQ1", "1"];

function add_delete_custom_attributes(provider) {
  provider.add_custom_attributes(...ATTRIBUTES_DATASET);
  let view = navigate_to(provider, "Details", {force: true});
  if (!view.entities.summary("Custom Attributes").is_displayed) throw new ();
  yield;

  try {
    provider.delete_custom_attributes(...ATTRIBUTES_DATASET)
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof APIException) {
      logger.info("No custom attributes to delete")
    } else {
      throw $EXCEPTION
    }
  }
};

function test_add_static_custom_attributes(add_delete_custom_attributes, provider) {
  // Tests adding of static custom attributes to provider
  //   Steps:
  //       * Add static custom attributes (API)
  //       * Go to provider summary page
  //   Expected results:
  //       * The attributes was successfully added
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let view = navigate_to(provider, "Details", {force: true});
  let custom_attr_ui = view.entities.summary("Custom Attributes");

  for (let attr in ATTRIBUTES_DATASET) {
    if (!custom_attr_ui.fields.include(attr.name)) throw new ();
    if (custom_attr_ui.get_text_of(attr.name) != attr.value) throw new ()
  }
};

function test_edit_static_custom_attributes(provider) {
  // Tests editing of static custom attributes from provider
  //   Prerequisite:
  //       * test_add_static_custom_attributes passed.
  //   Steps:
  //       * Edit (update) the static custom attributes (API)
  //       * Go to provider summary page
  //   Expected results:
  //       * The attributes was successfully updated to the new values
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  provider.add_custom_attributes(...ATTRIBUTES_DATASET);
  let edited_attribs = deepcopy(ATTRIBUTES_DATASET);

  for (let [ii, value] in enumerate(VALUE_UPDATES)) {
    edited_attribs[ii].value = value
  };

  provider.edit_custom_attributes(...edited_attribs);
  let view = navigate_to(provider, "Details", {force: true});
  let custom_attr_ui = view.entities.summary("Custom Attributes");

  for (let attr in edited_attribs) {
    if (!custom_attr_ui.fields.include(attr.name)) throw new ();
    if (custom_attr_ui.get_text_of(attr.name) != attr.value) throw new ()
  };

  provider.delete_custom_attributes(...edited_attribs)
};

function test_delete_static_custom_attributes(add_delete_custom_attributes, request, provider) {
  // Tests deleting of static custom attributes from provider
  //   Steps:
  //       * Delete the static custom attributes that recently added (API)
  //       * Go to provider summary page
  //   Expected results:
  //       * The attributes was successfully deleted
  //       (you should not see a custom attributes table)
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  provider.delete_custom_attributes(...ATTRIBUTES_DATASET);
  let view = navigate_to(provider, "Details", {force: true});

  if (is_bool(view.entities.summary("Custom Attributes").is_displayed)) {
    for (let attr in ATTRIBUTES_DATASET) {
      if (!!view.entities.summary("Custom Attributes").fields.include(attr.name)) {
        throw new ()
      }
    }
  } else {
    logger.info("No custom attributes table to check");
    if (!true) throw new ()
  };

  let ca = CustomAttribute("test_value", "This is a test", null);
  request.addfinalizer(() => provider.delete_custom_attributes(ca));
  provider.add_custom_attributes(ca);
  provider.add_custom_attributes(...ATTRIBUTES_DATASET);
  provider.browser.refresh();

  for (let attr in ATTRIBUTES_DATASET) {
    if (!view.entities.summary("Custom Attributes").fields.include(attr.name)) {
      throw new ()
    };

    if (view.entities.summary("Custom Attributes").get_text_of(attr.name) != attr.value) {
      throw new ()
    }
  };

  provider.delete_custom_attributes(...ATTRIBUTES_DATASET);
  provider.browser.refresh();

  if (is_bool(view.entities.summary("Custom Attributes").is_displayed)) {
    for (let attr in ATTRIBUTES_DATASET) {
      if (!!view.entities.summary("Custom Attributes").fields.include(attr.name)) {
        throw new ()
      }
    }
  } else {
    logger.info("Custom Attributes Table does not exist. Expecting it to exist");
    if (!false) throw new ()
  }
};

function test_add_attribute_with_empty_name(provider) {
  // Tests adding of static custom attributes with empty field
  //   Steps:
  //       * add the static custom attribute with name \"\" (API)
  //       * Go to provider summary page
  //   Expected results:
  //       * You should get an error
  //       * You should not see this attribute in the custom  attributes table
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  pytest.raises(APIException, () => {
    provider.add_custom_attributes(CustomAttribute("", "17"));
    pytest.fail("You have added custom attribute with empty nameand didn't get an error!")
  });

  let view = navigate_to(provider, "Details", {force: true});

  if (is_bool(view.entities.summary("Custom Attributes").is_displayed)) {
    if (!!view.entities.summary("Custom Attributes").fields.include("")) {
      throw new ()
    }
  }
};

function test_add_date_attr_with_wrong_value(provider) {
  // Trying to add attribute of type date with non-date value
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let ca = CustomAttribute("nondate", "koko", "Date");

  pytest.raises(APIException, () => {
    provider.add_custom_attributes(ca);

    pytest.fail("You have added custom attribute of type{} with value of {} and didn't get an error!".format(
      ca.field_type,
      ca.value
    ))
  });

  let view = navigate_to(provider, "Details", {force: true});

  if (is_bool(view.entities.summary("Custom Attributes").is_displayed)) {
    if (!!view.entities.summary("Custom Attributes").fields.include("nondate")) {
      throw new ()
    }
  }
};

function test_edit_non_exist_attribute(provider) {
  // Trying to edit non-exist attribute
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let ca = choice(ATTRIBUTES_DATASET);

  let payload = {action: "edit", resources: [{
    href: ("{}/custom_attributes/9876543210000000").format(provider.href()),
    value: ca.value
  }]};

  pytest.raises(APIException, () => {
    provider.appliance.rest_api.post(
      File.join(provider.href(), "custom_attributes"),
      {None: payload}
    );

    pytest.fail(("You tried to edit a non-exist custom attribute({}) and didn't get an error!").format(ca.value))
  })
};

function test_delete_non_exist_attribute(provider) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let ca = choice(ATTRIBUTES_DATASET);

  pytest.raises(APIException, () => {
    provider.delete_custom_attributes(ca);
    pytest.fail(("You tried to delete a non-exist custom attribute({}) and didn't get an error!").format(ca.value))
  })
};

function test_add_already_exist_attribute(provider) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let ca = choice(ATTRIBUTES_DATASET);
  provider.add_custom_attributes(ca);

  try {
    provider.add_custom_attributes(ca)
  } catch ($EXCEPTION) {
    if ($EXCEPTION instanceof APIException) {
      pytest.fail("You tried to add a custom attribute that already exists({}) and didn't get an error!".format(ca.value))
    } else {
      throw $EXCEPTION
    }
  } finally {
    provider.delete_custom_attributes(ca)
  }
};

function test_very_long_name_with_special_characters(request, provider) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let ca = CustomAttribute(
    get_random_string(1000),
    "very_long_name",
    null
  );

  request.addfinalizer(() => provider.delete_custom_attributes(ca));
  provider.add_custom_attributes(ca);
  let view = navigate_to(provider, "Details", {force: true});

  if (!view.entities.summary("Custom Attributes").fields.include(ca.name)) {
    throw new ()
  }
};

function test_very_long_value_with_special_characters(request, provider) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: high
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  let ca = CustomAttribute(
    "very long value",
    get_random_string(1000),
    null
  );

  request.addfinalizer(() => provider.delete_custom_attributes(ca));
  provider.add_custom_attributes(ca);
  let view = navigate_to(provider, "Details", {force: true});

  if (ca.value != view.entities.summary("Custom Attributes").get_text_of(ca.name)) {
    throw new ()
  }
}
