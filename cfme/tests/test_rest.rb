# This module contains REST API specific tests which require a provider setup.
# For tests that do not require provider setup, add them to test_providerless_rest.py
require_relative 'datetime'
include Datetime
require_relative 'datetime'
include Datetime
require_relative 'cfme'
include Cfme
require_relative 'cfme/fixtures/provider'
include Cfme::Fixtures::Provider
require_relative 'cfme/infrastructure/provider/rhevm'
include Cfme::Infrastructure::Provider::Rhevm
require_relative 'cfme/infrastructure/provider/virtualcenter'
include Cfme::Infrastructure::Provider::Virtualcenter
require_relative 'cfme/markers/env_markers/provider'
include Cfme::Markers::Env_markers::Provider
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
require_relative 'cfme/rest/gen_data'
include Cfme::Rest::Gen_data
alias _vm vm
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/conf'
include Cfme::Utils::Conf
require_relative 'cfme/utils/ftp'
include Cfme::Utils::Ftp
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/rest'
include Cfme::Utils::Rest
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
require_relative 'cfme/utils/wait'
include Cfme::Utils::Wait
pytestmark = [test_requirements.rest, pytest.mark.provider(classes: [VMwareProvider, RHEVMProvider], selector: ONE), pytest.mark.usefixtures("setup_provider")]
def api_version(appliance)
  entry_point = appliance.rest_api._versions.values().to_a[0]
  return appliance.new_rest_api_instance(entry_point: entry_point)
end
def vm_obj(request, provider, appliance)
  return _vm(request, provider, appliance)
end
def wait_for_requests(requests)
  _finished = lambda do
    for request in requests
      request.reload()
      if request.request_state != "finished"
        return false
      end
    end
    return true
  end
  wait_for(method(:_finished), num_sec: 45, delay: 5, message: "requests finished")
end
COLLECTIONS_ALL = 
COLLECTIONS_NOT_IN_510 = 
COLLECTIONS_NOT_IN_511 = 
COLLECTIONS_IN_510 = COLLECTIONS_ALL - COLLECTIONS_NOT_IN_510
COLLECTIONS_IN_511 = COLLECTIONS_ALL - COLLECTIONS_NOT_IN_511
COLLECTIONS_IN_UPSTREAM = COLLECTIONS_IN_510
COLLECTIONS_OMITTED = 
UNCOLLECT_REASON = "Collection type not valid for appliance version"
def _collection_not_in_this_version(appliance, collection_name)
  return !COLLECTIONS_IN_UPSTREAM.include?(collection_name) && appliance.version.is_in_series("upstream") || !COLLECTIONS_IN_511.include?(collection_name) && appliance.version.is_in_series("5.11") || !COLLECTIONS_IN_510.include?(collection_name) && appliance.version.is_in_series("5.10")
end
def test_query_simple_collections(appliance, collection_name)
  # This test tries to load each of the listed collections. 'Simple' collection means that they
  #   have no usable actions that we could try to run
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/3h
  #       testSteps:
  #           1. Send a GET request: /api/<collection_name>
  #       expectedResults:
  #           1. Must receive a 200 OK response.
  #   
  collection = appliance.rest_api.collections.getattr(collection_name)
  if COLLECTIONS_OMITTED.include?(collection_name)
    appliance.rest_api.get(collection._href)
    assert_response(appliance)
  else
    assert_response(appliance)
    collection.reload()
    collection.to_a
  end
end
def test_collections_actions(appliance, collection_name, soft_assert)
  # Tests that there are only actions with POST methods in collections.
  # 
  #   Other methods (like DELETE) are allowed for individual resources inside collections,
  #   not in collections itself.
  # 
  #   Bugzilla:
  #       1392595
  #       1754972
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  response = appliance.rest_api.get(appliance.rest_api.collections.getattr(collection_name)._href)
  actions = response.get("actions")
  if is_bool(!actions)
    return
  end
  for action in actions
    if is_bool(BZ(1754972).blocks && collection_name == "pxe_servers")
      pytest.skip("pxe_servers contains methods other than post.")
    end
    soft_assert.(action["method"].downcase() == "post")
  end
end
def test_query_with_api_version(api_version, collection_name)
  # Loads each of the listed collections using /api/<version>/<collection>.
  # 
  #   Steps:
  #       * GET /api/<version>/<collection_name>
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  collection = api_version.collections.getattr(collection_name)
  assert_response(api_version)
  collection.reload()
  collection.to_a
end
def test_select_attributes(appliance, collection_name)
  # Tests that it's possible to limit returned attributes.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/8h
  #   
  collection = appliance.rest_api.collections.getattr(collection_name)
  response = appliance.rest_api.get("{}{}".format(collection._href, "?expand=resources&attributes=id"))
  assert_response(appliance)
  for resource in response.get("resources", [])
    raise unless resource.include?("id")
    expected_len = (resource.include?("href")) ? 2 : 1
    if resource.include?("fqname")
      expected_len += 1
    end
    raise unless resource.size == expected_len
  end
end
def test_http_options(appliance)
  # Tests OPTIONS http method.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/3h
  #   
  raise unless appliance.rest_api.collections.vms.options()["attributes"].include?("boot_time")
  assert_response(appliance)
end
def test_http_options_node_types(appliance, collection_name)
  # Tests that OPTIONS http method on Hosts and Clusters collection returns node_types.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  collection = appliance.rest_api.collections.getattr(collection_name)
  raise unless collection.options()["data"].include?("node_types")
  assert_response(appliance)
end
def test_http_options_subcollections(appliance)
  # Tests that OPTIONS returns supported subcollections.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: high
  #       initialEstimate: 1/4h
  #   
  raise unless appliance.rest_api.collections.vms.options()["subcollections"].include?("tags")
  assert_response(appliance)
end
def test_server_info(appliance)
  # Check that server info is present.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/3h
  #   
  key_list = ["enterprise_href", "zone_href", "region_href", "plugins", "appliance", "server_href", "version", "build", "time"]
  raise unless key_list.map{|item| appliance.rest_api.server_info.include?(item)}.is_all?
end
def test_server_info_href(appliance)
  # Check that appliance's server, zone and region is present.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  items = ["server_href", "zone_href", "region_href"]
  for item in items
    raise unless appliance.rest_api.server_info.include?(item)
    raise unless appliance.rest_api.get(appliance.rest_api.server_info[item]).include?("id")
  end
end
def test_default_region(appliance)
  # Check that the default region is present.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  reg = appliance.rest_api.collections.regions[0]
  raise unless reg.instance_variable_defined? :@guid
  raise unless reg.instance_variable_defined? :@region
end
def test_product_info(appliance)
  # Check that product info is present.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       initialEstimate: 1/3h
  #       casecomponent: Rest
  #   
  raise unless ["copyright", "name", "name_full", "support_website", "support_website_text"].map{|item| appliance.rest_api.product_info.include?(item)}.is_all?
end
def test_identity(appliance)
  # Check that user's identity is present.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/3h
  #   
  raise unless ["userid", "name", "group", "role", "tenant", "groups"].map{|item| appliance.rest_api.identity.include?(item)}.is_all?
end
def test_user_settings(appliance)
  # Check that user's settings are returned.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/3h
  #   
  raise unless appliance.rest_api.settings.is_a? Hash
end
def test_datetime_filtering(appliance, provider)
  # Tests support for DateTime filtering with timestamps in YYYY-MM-DDTHH:MM:SSZ format.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  collection = appliance.rest_api.collections.vms
  url_string = "{}{}".format(collection._href, "?expand=resources&attributes=created_on&sort_by=created_on&sort_order=asc&filter[]=created_on{}{}")
  collection.reload()
  vms_num = collection.size
  raise unless vms_num > 3
  baseline_vm = collection[vms_num / 2]
  baseline_datetime = baseline_vm._data["created_on"]
  _get_filtered_resources = lambda do |operator|
    return appliance.rest_api.get(url_string.format(operator, baseline_datetime))["resources"]
  end
  older_resources = _get_filtered_resources.call("<")
  newer_resources = _get_filtered_resources.call(">")
  matching_resources = _get_filtered_resources.call("=")
  raise unless !matching_resources
  if is_bool(older_resources)
    last_older = collection.get(id: older_resources[-1]["id"])
    raise unless last_older.created_on < baseline_vm.created_on
  end
  if is_bool(newer_resources)
    first_newer = collection.get(id: newer_resources[0]["id"])
    raise unless first_newer.created_on == baseline_vm.created_on
  end
end
def test_date_filtering(appliance, provider)
  # Tests support for DateTime filtering with timestamps in YYYY-MM-DD format.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  collection = appliance.rest_api.collections.vms
  url_string = "{}{}".format(collection._href, "?expand=resources&attributes=created_on&sort_by=created_on&sort_order=desc&filter[]=created_on{}{}")
  collection.reload()
  vms_num = collection.size
  raise unless vms_num > 3
  baseline_vm = collection[vms_num / 2]
  baseline_date,_ = baseline_vm._data["created_on"].split_p("T")
  _get_filtered_resources = lambda do |operator|
    return appliance.rest_api.get(url_string.format(operator, baseline_date))["resources"]
  end
  older_resources = _get_filtered_resources.call("<")
  newer_resources = _get_filtered_resources.call(">")
  matching_resources = _get_filtered_resources.call("=")
  raise unless matching_resources
  if is_bool(newer_resources)
    last_newer = collection.get(id: newer_resources[-1]["id"])
    raise unless last_newer.created_on > baseline_vm.created_on
  end
  if is_bool(older_resources)
    first_older = collection.get(id: older_resources[0]["id"])
    raise unless first_older.created_on < baseline_vm.created_on
  end
end
def test_resources_hiding(appliance)
  # Test that it's possible to hide resources in response.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/8h
  #   
  roles = appliance.rest_api.collections.roles
  resources_visible = appliance.rest_api.get(roles._href + "?filter[]=read_only=true")
  assert_response(appliance)
  raise unless resources_visible.include?("resources")
  resources_hidden = appliance.rest_api.get(roles._href + "?filter[]=read_only=true&hide=resources")
  assert_response(appliance)
  raise unless !resources_hidden.include?("resources")
  raise unless resources_hidden["subcount"] == resources_visible["subcount"]
end
def test_sorting_by_attributes(appliance)
  # Test that it's possible to sort resources by attributes.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  url_string = "{}{}".format(appliance.rest_api.collections.groups._href, "?expand=resources&attributes=id&sort_by=id&sort_order={}")
  response_asc = appliance.rest_api.get(url_string.format("asc"))
  assert_response(appliance)
  raise unless response_asc.include?("resources")
  response_desc = appliance.rest_api.get(url_string.format("desc"))
  assert_response(appliance)
  raise unless response_desc.include?("resources")
  raise unless response_asc["subcount"] == response_desc["subcount"]
  id_last = 0
  for resource in response_asc["resources"]
    raise unless resource["id"].to_i > id_last.to_i
    id_last = resource["id"].to_i
  end
  id_last += 1
  for resource in response_desc["resources"]
    raise unless resource["id"].to_i < id_last.to_i
    id_last = resource["id"].to_i
  end
end
PAGING_DATA = [[0, 0], [1, 0], [11, 13], [1, 10000]]
def test_rest_paging(appliance, paging)
  # Tests paging when offset and limit are specified.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  limit,offset = paging
  url_string = "{}{}".format(appliance.rest_api.collections.features._href, )
  if limit == 0
    pytest.raises(Exception, match: "Api::BadRequestError") {
      appliance.rest_api.get(url_string)
    }
    return
  else
    response = appliance.rest_api.get(url_string)
  end
  if response["count"] <= offset
    expected_subcount = 0
  else
    if response["count"] - offset >= limit
      expected_subcount = limit
    else
      expected_subcount = response["count"] - offset
    end
  end
  raise unless response["subcount"] == expected_subcount
  raise unless response["resources"].size == expected_subcount
  expected_pages_num = (response["count"] / limit) + (is_bool(response["count"] % limit) ? 1 : 0)
  raise unless response["pages"] == expected_pages_num
  links = response["links"]
  raise unless links["self"].include?()
  if offset + limit < response["count"]
    raise unless links["next"].include?("limit={}&offset={}".format(limit, offset + limit))
  end
  if offset > 0
    expected_previous_offset = (offset > limit) ? offset - limit : 0
    raise unless links["previous"].include?()
  end
  raise unless links["first"].include?("limit={}&offset={}".format(limit, 0))
  expected_last_offset = (response["pages"] - (is_bool(response["count"] % limit) ? 1 : 0)) * limit
  raise unless links["last"].include?()
end
def test_attributes_present(appliance, collection_name)
  # Tests that the expected attributes are present in all collections.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Bugzilla:
  #       1510238
  #       1503852
  #       1547852
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/5h
  #   
  attrs = "href,id,href_slug"
  collection = appliance.rest_api.collections.getattr(collection_name)
  response = appliance.rest_api.get("{}{}{}".format(collection._href, "?expand=resources&attributes=", attrs))
  assert_response(appliance)
  for resource in response.get("resources", [])
    raise unless resource.include?("id")
    raise unless resource.include?("href")
    raise unless resource["href"] == ("{}/{}").format(collection._href, resource["id"])
    raise unless resource.include?("href_slug")
    raise unless resource["href_slug"] == ("{}/{}").format(collection.name, resource["id"])
  end
end
def test_collection_class_valid(appliance, provider, vendor)
  # Tests that it's possible to query using collection_class.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  collection = appliance.rest_api.collections.vms
  collection.reload()
  resource_type = collection[0].type
  tested_type = 
  response = collection.query_string(collection_class: tested_type)
  if resource_type == tested_type
    raise unless response.count > 0
  end
  if is_bool(response.count)
    rand_num = (response.count >= 5) ? 5 : response.count
    rand_entities = random.sample(response.resources, rand_num)
    for entity in rand_entities
      raise unless entity.type == tested_type
    end
  end
end
def test_collection_class_invalid(appliance, provider)
  # Tests that it's not possible to query using invalid collection_class.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  pytest.raises(Exception, match: "Invalid collection_class") {
    appliance.rest_api.collections.vms.query_string(collection_class: "ManageIQ::Providers::Nonexistent::Vm")
  }
end
def test_bulk_delete(request, appliance)
  # Tests bulk delete from collection.
  # 
  #   Bulk delete operation deletes all specified resources that exist. When the
  #   resource doesn\'t exist at the time of deletion, the corresponding result
  #   has \"success\" set to false.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  collection = appliance.rest_api.collections.services
  data = 2.times.map{|__| {"name" => fauxfactory.gen_alphanumeric()}}
  services = collection.action.create(*data)
  _cleanup = lambda do
    for service in services
      if is_bool(service.exists)
        service.action.delete()
      end
    end
  end
  services[0].action.delete()
  collection.action.delete(*services)
  raise unless appliance.rest_api.response
  results = appliance.rest_api.response.json()["results"]
  raise unless results[0]["success"] === false
  raise unless results[1]["success"] === true
end
def test_rest_ping(appliance)
  # Tests /api/ping.
  # 
  #   Metadata:
  #       test_flag: rest
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #   
  ping_addr = 
  raise unless appliance.rest_api._session.get(ping_addr).text == "pong"
end
class TestPicturesRESTAPI
  def create_picture(appliance)
    picture = appliance.rest_api.collections.pictures.action.create({"extension" => "png", "content" => "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="})
    assert_response(appliance)
    return picture[0]
  end
  def test_query_picture_attributes(appliance, soft_assert)
    # Tests access to picture attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    picture = create_picture(appliance)
    outcome = query_resource_attributes(picture)
    for failure in outcome.failed
      soft_assert.(false, "{} \"{}\": status: {}, error: `{}`".format(failure.type, failure.name, failure.response.status_code, failure.error))
    end
  end
  def test_add_picture(appliance)
    # Tests adding picture.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    collection = appliance.rest_api.collections.pictures
    collection.reload()
    count = collection.count
    create_picture(appliance)
    collection.reload()
    raise unless collection.count == count + 1
    raise unless collection.count == collection.size
  end
  def test_add_picture_invalid_extension(appliance)
    # Tests adding picture with invalid extension.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    collection = appliance.rest_api.collections.pictures
    count = collection.count
    pytest.raises(Exception, match: "Extension must be") {
      collection.action.create({"extension" => "xcf", "content" => "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="})
    }
    assert_response(appliance, http_status: 400)
    collection.reload()
    raise unless collection.count == count
  end
  def test_add_picture_invalid_data(appliance)
    # Tests adding picture with invalid content.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    collection = appliance.rest_api.collections.pictures
    count = collection.count
    pytest.raises(Exception, match: "invalid base64") {
      collection.action.create({"extension" => "png", "content" => "invalid"})
    }
    assert_response(appliance, http_status: 400)
    collection.reload()
    raise unless collection.count == count
  end
end
class TestBulkQueryRESTAPI
  def test_bulk_query(appliance)
    # Tests bulk query referencing resources by attributes id, href and guid
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    collection = appliance.rest_api.collections.events
    data0,data1,data2 = [collection[0]._data, collection[1]._data, collection[2]._data]
    response = appliance.rest_api.collections.events.action.query({"id" => data0["id"]}, {"href" => data1["href"]}, {"guid" => data2["guid"]})
    assert_response(appliance)
    raise unless response.size == 3
    raise unless data0 == response[0]._data && data1 == response[1]._data && data2 == response[2]._data
  end
  def test_bulk_query_users(appliance)
    # Tests bulk query on 'users' collection
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    data = appliance.rest_api.collections.users[0]._data
    response = appliance.rest_api.collections.users.action.query({"name" => data["name"]}, {"userid" => data["userid"]})
    assert_response(appliance)
    raise unless response.size == 2
    raise unless (data["id"] == response[0]._data["id"]) and (response[0]._data["id"] == response[1]._data["id"])
  end
  def test_bulk_query_roles(appliance)
    # Tests bulk query on 'roles' collection
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    collection = appliance.rest_api.collections.roles
    data0,data1 = [collection[0]._data, collection[1]._data]
    response = appliance.rest_api.collections.roles.action.query({"name" => data0["name"]}, {"name" => data1["name"]})
    assert_response(appliance)
    raise unless response.size == 2
    raise unless data0 == response[0]._data && data1 == response[1]._data
  end
  def test_bulk_query_groups(appliance)
    # Tests bulk query on 'groups' collection
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    collection = appliance.rest_api.collections.groups
    data0,data1 = [collection[0]._data, collection[1]._data]
    response = appliance.rest_api.collections.groups.action.query({"description" => data0["description"]}, {"description" => data1["description"]})
    assert_response(appliance)
    raise unless response.size == 2
    raise unless data0 == response[0]._data && data1 == response[1]._data
  end
end
class TestNotificationsRESTAPI
  def generate_notifications(appliance)
    requests_data = automation_requests_data("nonexistent_vm")
    requests = appliance.rest_api.collections.automation_requests.action.create(*requests_data[0...2])
    raise unless requests.size == 2
    wait_for_requests(requests)
  end
  def test_query_notification_attributes(appliance, generate_notifications, soft_assert)
    # Tests access to notification attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    collection = appliance.rest_api.collections.notifications
    collection.reload()
    query_resource_attributes(collection[-1], soft_assert: soft_assert)
  end
  def test_mark_notifications(appliance, generate_notifications, from_detail)
    # Tests marking notifications as seen.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    unseen = appliance.rest_api.collections.notifications.find_by(seen: false)
    notifications = 1.upto(3-1).map{|i| unseen[-i]}
    if is_bool(from_detail)
      for ent in notifications
        ent.action.mark_as_seen()
        assert_response(appliance)
      end
    else
      appliance.rest_api.collections.notifications.action.mark_as_seen(*notifications)
      assert_response(appliance)
    end
    for ent in notifications
      ent.reload()
      raise unless ent.seen
    end
  end
  def test_delete_notifications_from_detail(appliance, generate_notifications, method)
    # Tests delete notifications from detail.
    # 
    #     Bugzilla:
    #         1420872
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    notifications = appliance.rest_api.collections.notifications.all[-3..-1]
    delete_resources_from_detail(notifications, method: method)
  end
  def test_delete_notifications_from_collection(appliance, generate_notifications)
    # Tests delete notifications from collection.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    notifications = appliance.rest_api.collections.notifications.all[-3..-1]
    delete_resources_from_collection(notifications)
  end
end
class TestEventStreamsRESTAPI
  def gen_events(appliance, vm_obj, provider)
    vm_name = vm_obj
    vm = provider.mgmt.get_vm(vm_name)
    vm.stop()
    vm.delete()
  end
  def test_query_event_attributes(appliance, gen_events, soft_assert)
    # Tests access to event attributes.
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    collection = appliance.rest_api.collections.event_streams
    collection.reload()
    query_resource_attributes(collection[-1], soft_assert: soft_assert)
  end
  def test_find_created_events(appliance, vm_obj, gen_events, provider, soft_assert)
    # Tests find_by and get functions of event_streams collection
    # 
    #     Metadata:
    #         test_flag: rest
    # 
    #     Polarion:
    #         assignee: pvala
    #         casecomponent: Rest
    #         caseimportance: medium
    #         initialEstimate: 1/4h
    #     
    vm_name = vm_obj
    collections = appliance.rest_api.collections
    vm_id = collections.vms.get(name: vm_name).id
    ems_event_type = "EmsEvent"
    evt_col = collections.event_streams
    for (evt, params) in provider.ems_events
      if params.include?("dest_vm_or_template_id")
        params.update({"dest_vm_or_template_id" => vm_id})
      else
        if params.include?("vm_or_template_id")
          params.update({"vm_or_template_id" => vm_id})
        end
      end
      begin
        msg = "vm's {v} event {evt} of {t} type is not found in event_streams collection".format(v: vm_name, evt: evt, t: ems_event_type)
        found_evts,__ = wait_for(lambda{|| evt_col.find_by(type: ems_event_type, None: params).map{|e| e}}, num_sec: 30, delay: 5, message: msg, fail_condition: [])
      rescue TimedOutError => exc
        soft_assert.(false, exc.to_s)
      end
      begin
        evt_col.get(id: (found_evts[-1]).id)
      rescue [IndexError, TypeError]
        soft_assert.(false, )
      end
    end
  end
end
def test_rest_metric_rollups(appliance, interval, resource_type)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #       testSteps:
  #           1. Send GET request:
  #           /api/metric_rollups?resource_type=:resource_type&capture_interval=:interval
  #           &start_date=:start_date&end_date=:end_date
  #       expectedResults:
  #           1. Successful 200 OK response.
  #   
  end_date = Datetime::now()
  start_date = end_date - timedelta(days: 2)
  url = "{entry_point}?resource_type={resource_type}&capture_interval={interval}&start_date={start_date}&end_date={end_date}&limit=30".format(entry_point: appliance.rest_api.collections.metric_rollups._href, resource_type: resource_type, interval: interval, start_date: start_date.isoformat(), end_date: end_date.isoformat())
  appliance.rest_api.get(url)
  assert_response(appliance)
end
def test_supported_provider_options(appliance, soft_assert)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Rest
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #       testSteps:
  #           1. Send a request: OPTIONS /api/providers
  #           2. Check if `supported_providers` is present in the response.
  #           3. Check if `regions` is present in the response under data > supported_providers
  #               > providers_that_support_regions such as EC2 and Azure.
  #   
  data = appliance.rest_api.collections.providers.options()["data"]
  soft_assert.(data.include?("supported_providers"), "Supported Providers data not present in the response.")
  for provider in data["supported_providers"]
    if ["ManageIQ::Providers::Azure::CloudManager", "ManageIQ::Providers::Amazon::CloudManager"].include?(provider["type"])
      soft_assert.(provider.include?("regions"), "Regions information not present in the provider OPTIONS.")
    end
  end
end
def image_file_path(file_name)
  #  Returns file path of the file
  fs = FTPClientWrapper(cfme_data.ftpserver.entities.others)
  file_path = fs.download(file_name, File.join("/tmp",file_name))
  return file_path
end
def test_custom_logos_via_api(appliance, image_type, request)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Configuration
  #       caseimportance: medium
  #       initialEstimate: 1/10h
  #       setup:
  #           1. Navigate to Configuration > Server > Custom Logos
  #           2. Change the brand, logo, login_logo and favicon
  #       testSteps:
  #           1.  Send a GET request: /api/product_info and
  #               check the value of image type in branding_info
  #       expectedResults:
  #           1. Response: {
  #               ...
  #               \"branding_info\": {
  #                   \"brand\": \"/upload/custom_brand.png\",
  #                   \"logo\": \"/upload/custom_logo.png\",
  #                   \"login_logo\": \"/upload/custom_login_logo.png\",
  #                   \"favicon\": \"/upload/custom_favicon.ico\"
  #               }
  #           }
  # 
  #   Bugzilla:
  #       1578076
  #   
  if image_type == "favicon"
    image = image_file_path("icon.ico")
    expected_name = "/upload/custom_{}.ico"
  else
    image = image_file_path("logo.png")
    expected_name = "/upload/custom_{}.png"
  end
  appliance.server.upload_custom_logo(file_type: image_type, file_data: image)
  _finalize = lambda do
    appliance.server.upload_custom_logo(file_type: image_type, enable: false)
  end
  href = 
  api = appliance.rest_api
  wait_for(lambda{|| api.product_info != api.get(href)}, delay: 5, timeout: 100)
  branding_info = api.get(href)["branding_info"]
  raise unless branding_info[image_type] == expected_name.format(image_type)
end
def test_provider_specific_vm(appliance, request, soft_assert, provider, second_provider)
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Infra
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Add multiple provider and query vms related to a specific provider.
  #               GET /api/providers/:provider_id/vms
  #       expectedResults:
  #           1. Should receive all VMs related to the provider.
  #   
  setup_or_skip(request, second_provider)
  for provider_obj in [provider, second_provider]
    for vm in provider_obj.rest_api_entity.vms.all
      soft_assert.(vm.ems.name == provider_obj.name)
    end
  end
end
def test_release_server_info(appliance)
  # 
  #   Bugzilla:
  #       1546108
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: Appliance
  #       caseimportance: medium
  #       initialEstimate: 1/4h
  #       testSteps:
  #           1. Check the server release info at GET /api
  #   
  raise unless appliance.rest_api.server_info["release"] == (appliance.ssh_client.run_command("cd /var/www/miq/vmdb; cat RELEASE")).output
end
