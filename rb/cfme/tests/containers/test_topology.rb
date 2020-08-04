require_relative 'cfme/containers/provider'
include Cfme::Containers::Provider
pytestmark = [pytest.mark.usefixtures("setup_provider"), pytest.mark.tier(1), pytest.mark.provider([ContainersProvider], scope: "function")]
