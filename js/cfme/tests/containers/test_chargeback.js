require("None");
require_relative("datetime");
include(Datetime);
require_relative("humanfriendly");
include(Humanfriendly);
require_relative("humanfriendly");
include(Humanfriendly);
require_relative("cfme");
include(Cfme);
require_relative("cfme/containers/provider");
include(Cfme.Containers.Provider);
require_relative("cfme/intelligence/chargeback");
include(Cfme.Intelligence.Chargeback);
require_relative("cfme/utils/blockers");
include(Cfme.Utils.Blockers);
require_relative("cfme/utils/log");
include(Cfme.Utils.Log);
require_relative("cfme/utils/units");
include(Cfme.Utils.Units);
require_relative("cfme/utils/units");
include(Cfme.Utils.Units);
let obj_types = ["Image", "Project"];

let fixed_rates = [
  "Fixed1",
  "Fixed2",
  "CpuCores",
  "Memory",
  "Network"
];

let variable_rates = ["CpuCores", "Memory", "Network"];
let all_rates = new Set(fixed_rates + variable_rates);
let intervals = ["Hourly", "Daily", "Weekly", "Monthly"];
let rate_types = ["fixed", "variable"];

let pytestmark = [
  pytest.mark.meta({server_roles: "+ems_metrics_coordinator +ems_metrics_collector +ems_metrics_processor"}),
  pytest.mark.usefixtures("setup_provider_modscope"),
  pytest.mark.parametrize("obj_type", obj_types, {scope: "module"}),
  pytest.mark.parametrize("rate_type", rate_types, {scope: "module"}),
  pytest.mark.parametrize("interval", intervals, {scope: "module"}),
  pytest.mark.long_running,
  pytest.mark.provider([ContainersProvider], {scope: "module"}),
  pytest.mark.meta({blockers: [GH("ManageIQ/integration_tests:8798")]}),
  test_requirements.containers
];

const TEST_MATCH_ACCURACY = 0.1;
let now = Datetime.now();

let hours_count_lut = OrderedDict([
  ["Hourly", 1.0],
  ["Daily", 24.0],
  ["Weekly", 168.0],
  ["Monthly", calendar.monthrange(now.year, now.month)[1] * 24.0],
  ["Yearly", 8760]
]);

function dump_args(kwargs, { ...kwargs }) {
  // Return string of the arguments and their values.
  //   E.g. dump_args(a=1, b=2) --> 'a=1, b=2;
  //   '
  let out = "";

  for (let [key, val] in kwargs.to_a()) {
    out += `${key}=${val}, `
  };

  if (is_bool(out)) return (out[_.range(0, -2)]) + ";";
  return kwargs
};

function gen_report_base(appliance, obj_type, provider, rate_desc, rate_interval) {
  let data;

  // Base function for report generation
  //   Args:
  //       :py:type:`str` obj_type: Object being tested; only 'Project' and 'Image' are supported
  //       :py:class:`ContainersProvider` provider: The Containers Provider
  //       :py:type:`str` rate_desc: The rate description as it appears in the report
  //       :py:type:`str` rate_interval: The rate interval, (Hourly/Daily/Weekly/Monthly)
  //   
  let title = `report_${obj_type.downcase()}_${rate_desc}`;

  if (obj_type == "Project") {
    data = {
      menu_name: title,
      title: title,
      base_report_on: "Chargeback for Projects",

      report_fields: [
        "Archived",
        "Chargeback Rates",
        "Fixed Compute Metric",
        "Cpu Cores Used Cost",
        "Cpu Cores Used Metric",
        "Network I/O Used",
        "Network I/O Used Cost",
        "Fixed Compute Cost 1",
        "Fixed Compute Cost 2",
        "Memory Used",
        "Memory Used Cost",
        "Provider Name",
        "Fixed Total Cost",
        "Total Cost"
      ],

      filter: {
        filter_show_costs: "Container Project",
        filter_provider: provider.name,
        filter_project: "All Container Projects"
      }
    }
  } else if (obj_type == "Image") {
    data = {
      base_report_on: "Chargeback for Images",

      report_fields: [
        "Archived",
        "Chargeback Rates",
        "Fixed Compute Metric",
        "Cpu Cores Used Cost",
        "Cpu Cores Used Metric",
        "Network I/O Used",
        "Network I/O Used Cost",
        "Fixed Compute Cost 1",
        "Fixed Compute Cost 2",
        "Memory Used",
        "Memory Used Cost",
        "Provider Name",
        "Fixed Total Cost",
        "Total Cost"
      ],

      filter: {
        filter_show_costs: "Container Image",
        filter_provider: provider.name
      }
    }
  } else {
    throw new Exception(`Unknown object type: ${obj_type}`)
  };

  data.menu_name = title;
  data.title = title;

  if (rate_interval == "Hourly") {
    data.filter.interval = "Day";
    data.filter.interval_end = "Yesterday";
    data.filter.interval_size = "1 Day"
  } else if (rate_interval == "Daily") {
    data.filter.interval = ["Week"];
    data.filter.interval_end = "Last Week";
    data.filter.interval_size = "1 Week"
  } else if (["Weekly", "Monthly"].include(rate_interval)) {
    data.filter.interval = ["Month"];
    data.filter.interval_end = "Last Month";
    data.filter.interval_size = "1 Month"
  } else {
    throw new Exception("Unsupported rate interval: \"{}\"; available options: (Hourly/Daily/Weekly/Monthly)")
  };

  let report = appliance.collections.reports.create({
    is_candu: true,
    None: data
  });

  logger.info(`QUEUING CUSTOM CHARGEBACK REPORT FOR CONTAINER ${obj_type.upcase()}`);
  report.queue({wait_for_finish: true});
  return report
};

function assign_custom_compute_rate(obj_type, chargeback_rate, provider) {
  let compute_assign;

  // Assign custom Compute rate for Labeled Container Images
  //   Args:
  //       :py:type:`str` obj_type: Object being tested; only 'Project' and 'Image' are supported
  //       :py:class:`ComputeRate` chargeback_rate: The chargeback rate object
  //       :py:class:`ContainersProvider` provider: The containers provider
  //   
  if (obj_type == "Image") {
    compute_assign = assignments.ComputeAssign({
      assign_to: "Labeled Container Images",
      docker_labels: "architecture",
      selections: {x86_64: {Rate: chargeback_rate.description}}
    });

    logger.info("ASSIGNING COMPUTE RATE FOR LABELED CONTAINER IMAGES")
  } else if (obj_type == "Project") {
    compute_assign = assignments.ComputeAssign({
      assign_to: "Selected Providers",
      selections: {[provider.name]: {Rate: chargeback_rate.description}}
    });

    logger.info("ASSIGNING CUSTOM COMPUTE RATE FOR PROJECT CHARGEBACK")
  } else {
    throw new Exception(`Unknown object type: ${obj_type}`)
  };

  compute_assign.assign();

  logger.info(("Rate - {}: {}").format(
    chargeback_rate.description,
    chargeback_rate.fields
  ));

  return chargeback_rate
};

function compute_rate(appliance, rate_type, interval) {
  let variable_rate = (rate_type == "variable" ? 1 : 0);

  let description = fauxfactory.gen_alphanumeric(
    20,
    {start: "custom_rate_"}
  );

  let data = {
    "Used CPU Cores": {
      per_time: interval,
      fixed_rate: 1,
      variable_rate: variable_rate
    },

    "Fixed Compute Cost 1": {per_time: interval, fixed_rate: 1},
    "Fixed Compute Cost 2": {per_time: interval, fixed_rate: 1},

    "Used Memory": {
      per_time: interval,
      fixed_rate: 1,
      variable_rate: variable_rate
    },

    "Used Network I/O": {
      per_time: interval,
      fixed_rate: 1,
      variable_rate: variable_rate
    }
  };

  let ccb = appliance.collections.compute_rates.create(
    description,
    {fields: data}
  );

  yield(ccb);
  if (is_bool(ccb.exists)) ccb.delete()
};

function assign_compute_rate(obj_type, compute_rate, provider) {
  assign_custom_compute_rate(obj_type, compute_rate, provider);
  yield(compute_rate);
  assignments.ComputeAssign({assign_to: "<Nothing>"}).assign()
};

function chargeback_report_data(appliance, obj_type, interval, assign_compute_rate, provider) {
  let report = gen_report_base(
    appliance,
    obj_type,
    provider,
    assign_compute_rate.description,
    interval
  );

  yield(report.saved_reports.all()[0].data);
  report.delete()
};

function abstract_test_chargeback_cost(rate_key, obj_type, interval, chargeback_report_data, compute_rate, soft_assert) {
  // This is an abstract test function for testing rate costs.
  //   It's comparing the expected value that calculated by the rate
  //   to the value in the chargeback report
  //   Args:
  //       :py:type:`str` rate_key: The rate key as it appear in the CHARGEBACK_HEADER_NAMES keys.
  //       :py:type:`str` obj_type: Object being tested; only 'Project' and 'Image' are supported
  //       :py:type:`str` interval:  The rate interval, (Hourly/Daily/Weekly/Monthly)
  //       :py:class:`Report` chargeback_report_data: The chargeback report data.
  //       :py:class:`ComputeRate` compute_rate: The compute rate object.
  //       :var soft_assert: soft_assert fixture.
  //   
  let report_headers = CHARGEBACK_HEADER_NAMES[rate_key];
  let found_something_to_test = false;

  for (let row in chargeback_report_data.rows) {
    let size_, unit_, metric;

    if (row["Chargeback Rates"].downcase() != compute_rate.description.downcase()) {
      continue
    };

    found_something_to_test = true;
    let fixed_rate = compute_rate.fields[report_headers.rate_name].fixed_rate.to_f;

    let variable_rate = compute_rate.fields[report_headers.rate_name].get(
      "variable_rate",
      0
    ).to_f;

    if (rate_key == "Memory") {
      let [size_, unit_] = tokenize(row[report_headers.metric_name].upcase());

      metric = round(
        (parse_size(size_.to_s + unit_, {binary: true})) / 1048576.0.to_f,
        2
      )
    } else {
      metric = parse_number(row[report_headers.metric_name])
    };

    let num_hours = parse_number(row[CHARGEBACK_HEADER_NAMES.Fixed1.metric_name]);
    let num_intervals = num_hours / hours_count_lut[interval].to_f;
    let fixed_cost = num_intervals * fixed_rate;
    let variable_cost = (num_intervals * metric) * variable_rate;
    let expected_cost = round(variable_cost + fixed_cost, 2);

    let found_cost = round(
      parse_number(row[report_headers.cost_name]),
      2
    );

    let match_threshold = TEST_MATCH_ACCURACY * expected_cost;

    soft_assert.call(
      (found_cost - expected_cost).abs <= match_threshold,

      "Unexpected Chargeback: {}".format(dump_args({
        charge_for: obj_type,
        rate_key,
        metric,
        num_hours,
        num_intervals,
        fixed_rate,
        variable_rate,
        fixed_cost,
        variable_cost,
        expected_full_cost: expected_cost,
        found_full_cost: found_cost
      }))
    )
  };

  if (!found_something_to_test) {
    throw `Could not find ${obj_type} with the assigned rate: ${compute_rate.description}`
  }
};

function test_chargeback_rate_fixed_1(rate_type, obj_type, interval, chargeback_report_data, compute_rate, soft_assert) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: medium
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  abstract_test_chargeback_cost(
    "Fixed1",
    obj_type,
    interval,
    chargeback_report_data,
    compute_rate,
    soft_assert
  )
};

function test_chargeback_rate_fixed_2(rate_type, obj_type, interval, chargeback_report_data, compute_rate, soft_assert) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: medium
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  abstract_test_chargeback_cost(
    "Fixed2",
    obj_type,
    interval,
    chargeback_report_data,
    compute_rate,
    soft_assert
  )
};

function test_chargeback_rate_cpu_cores(rate_type, obj_type, interval, chargeback_report_data, compute_rate, soft_assert) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: medium
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  abstract_test_chargeback_cost(
    "CpuCores",
    obj_type,
    interval,
    chargeback_report_data,
    compute_rate,
    soft_assert
  )
};

function test_chargeback_rate_memory_used(rate_type, obj_type, interval, chargeback_report_data, compute_rate, soft_assert) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: medium
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  abstract_test_chargeback_cost(
    "Memory",
    obj_type,
    interval,
    chargeback_report_data,
    compute_rate,
    soft_assert
  )
};

function test_chargeback_rate_network_io(rate_type, obj_type, interval, chargeback_report_data, compute_rate, soft_assert) {
  // 
  //   Polarion:
  //       assignee: juwatts
  //       caseimportance: medium
  //       casecomponent: Containers
  //       initialEstimate: 1/6h
  //   
  abstract_test_chargeback_cost(
    "Network",
    obj_type,
    interval,
    chargeback_report_data,
    compute_rate,
    soft_assert
  )
}
