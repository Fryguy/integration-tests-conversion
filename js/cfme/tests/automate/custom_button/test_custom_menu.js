require_relative("cfme");
include(Cfme);
require_relative("cfme/utils/appliance/implementations/ui");
include(Cfme.Utils.Appliance.Implementations.Ui);
let pytestmark = [test_requirements.custom_button];

const ADVANCE_SETTING_CUSTOM_MENU = {ui: {custom_menu: [
  {
    type: "item",
    icon: "fa fa-cubes",
    id: "redhat",
    name: "RedHat",
    href: "https://www.redhat.com",
    rbac: "vm_explorer"
  },

  {
    type: "item",
    icon: "pficon pficon-project",
    id: "manageiq",
    name: "ManageIQ",
    href: "https://manageiq.org",
    rbac: "vm_explorer"
  }
]}};

function update_adv_setting_and_wait(appliance, data) {
  // 
  //   This local method will help to update advance settings, restart evmserverd and wait for ui
  //   
  appliance.update_advanced_settings(data);
  appliance.evmserverd.restart();
  appliance.wait_for_web_ui()
};

function test_custom_menu_display(appliance, request) {
  // Add Custom Menu in Left Navigation bar as Admin
  // 
  //   Requirements for custom menu
  //       - only allow top-level items
  //       - only at the bottom of the menu
  //       - only allow items (not sections)
  // 
  //   Polarion:
  //       assignee: ndhandre
  //       initialEstimate: 1/2h
  //       caseimportance: critical
  //       caseposneg: positive
  //       startsin: 5.11
  //       casecomponent: CustomButton
  //       tags: custom_menu
  //       testSteps:
  //           1. Navigate to Zone > Server > Advance tab
  //           2. Add menus under :ui: > :custom_menu: tag like
  //           ```
  //           :ui:
  //             :custom_menu:
  //             - :type: item
  //               :icon: fa fa-bug
  //               :id: redhat
  //               :name: RedHat
  //               :href: https://www.redhat.com
  //               :rbac: vm_explorer
  //             - :type: item
  //               :icon: pficon pficon-help
  //               :id: miq
  //               :name: ManageIQ
  //               :href: https://manageiq.org
  //               :rbac: vm_explorer
  //           ```
  //           3. restart evmserverd / reboot appliance
  //           4. Check Navigation bar
  //       expectedResults:
  //           1.
  //           2.
  //           3.
  //           4. Added menu should be displayed in Navigation bar
  // 
  //   Bugzilla:
  //       1678151
  //   
  update_adv_setting_and_wait(appliance, ADVANCE_SETTING_CUSTOM_MENU);

  request.addfinalizer(() => (
    update_adv_setting_and_wait(appliance, {ui: "<<reset>>"})
  ));

  let view = navigate_to(appliance.server, "LoggedIn", {force: true});

  for (let menu in ["RedHat", "ManageIQ"]) {
    view.navigation.select(menu);
    if (view.navigation.currently_selected != [menu]) throw new ();

    if (!view.browser.selenium.current_url.include(`id=${menu.downcase()}`)) {
      throw new ()
    }
  }
}
