require_relative 'io'
include Io
require_relative 'pdfminer/converter'
include Pdfminer::Converter
require_relative 'pdfminer/layout'
include Pdfminer::Layout
require_relative 'pdfminer/pdfinterp'
include Pdfminer::Pdfinterp
require_relative 'pdfminer/pdfinterp'
include Pdfminer::Pdfinterp
require_relative 'pdfminer/pdfpage'
include Pdfminer::Pdfpage
require_relative 'cfme'
include Cfme
require_relative 'cfme/utils'
include Cfme::Utils
require_relative 'cfme/utils/appliance/implementations/ui'
include Cfme::Utils::Appliance::Implementations::Ui
require_relative 'cfme/utils/blockers'
include Cfme::Utils::Blockers
require_relative 'cfme/utils/log'
include Cfme::Utils::Log
pytestmark = [test_requirements.general_ui]
doc_titles = {"policies" => "policies and profiles guide", "general" => "general configuration", "inventory" => "managing infrastructure and inventory", "automation" => "methods available for automation", "monitoring" => "monitoring, alerts, and reporting", "providers" => "managing providers", "rest" => "red hat cloudforms rest api", "scripting" => "scripting actions in cloudforms", "vm_instances" => "provisioning virtual machines and instances"}
def pdf_get_text(file_obj, page_nums)
  output = BytesIO()
  manager = PDFResourceManager()
  laparams = LAParams(all_texts: true, detect_vertical: true)
  converter = TextConverter(manager, output, laparams: laparams)
  interpreter = PDFPageInterpreter(manager, converter)
  for page in PDFPage.get_pages(file_obj, page_nums)
    interpreter.process_page(page)
  end
  converter.close()
  text = output.getvalue().gsub(b'\n,  ')
  output.close()
  return text
end
def test_links(appliance)
  # Test whether the PDF documents are present.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/20h
  #   
  view = navigate_to(appliance.server, "Documentation")
  for link_widget in view.links.sub_widgets
    begin
      href = view.browser.get_attribute(attr: "href", locator: link_widget.link.locator)
    rescue NoMethodError
      logger.warning("Skipping link check, No link widget defined for {}".format(link_widget.TEXT))
      next
    end
    begin
      resp = requests.head(href, verify: false, timeout: 10)
    rescue [requests.Timeout, requests.ConnectionError] => ex
      pytest.fail(ex.to_s)
    end
    raise "Unable to access URL '#{href}' from doc link (#{link_widget.read()})" unless (200 <= resp.status_code) and (resp.status_code < 400)
  end
end
def test_contents(appliance, soft_assert)
  # Test title of each document.
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/10h
  #   
  view = navigate_to(appliance.server, "Documentation")
  cur_ver = appliance.version
  for (doc_type, title) in doc_titles.to_a()
    doc_widget = view.links.getattr(doc_type, nil)
    if is_bool(!doc_widget)
      logger.warning("Skipping contents check for document: \"{}: {}\", no widget to read".format(doc_type, title))
    end
    href = view.browser.get_attribute(attr: "href", locator: doc_widget.link.locator)
    data = requests.get(href, verify: false)
    pdf_titlepage_text_low = pdf_get_text(BytesIO(data.content), [0]).downcase()
    if is_bool(!pdf_titlepage_text_low.is_a? String)
      pdf_titlepage_text_low = pdf_titlepage_text_low.decode("utf-8", "replace")
    end
    expected = [title]
    if cur_ver == version.LATEST
      expected.push("manageiq")
    else
      expected.push("cloudforms")
      raise unless !cur_ver.product_version().equal?(nil)
      if is_bool(!BZ(1723813).blocks)
        expected.push(cur_ver.product_version())
      end
    end
    for exp_str in expected
      soft_assert.(pdf_titlepage_text_low.include?(exp_str), "{} not in {}".format(exp_str, pdf_titlepage_text_low))
    end
  end
end
def test_all_docs_present(appliance)
  # 
  #   Check that all the documents that we expect to be in the UI are present
  #   Use the doc_titles dict keys to query widget is_displayed
  # 
  #   Polarion:
  #       assignee: pvala
  #       casecomponent: WebUI
  #       caseimportance: low
  #       initialEstimate: 1/10h
  #   
  view = navigate_to(appliance.server, "Documentation")
  for (doc_type, title) in doc_titles.to_a()
    raise unless view.links.instance_variable_defined? :@oc_typ
    raise unless view.links.getattr(doc_type).is_displayed
  end
end
