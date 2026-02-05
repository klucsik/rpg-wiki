// Generated from: e2e/features/auth/guest-access.feature
import { test } from "../../../../e2e/fixtures/test-base.ts";

test.describe('Guest Access', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('the standard personas are seeded', null, { page }); 
  });
  
  test('Guest can view public pages', { tag: ['@auth', '@guest'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am not logged in', null, { page }); 
    await And('a page "Welcome to the Wiki" exists with view_groups ["public"]', null, { page }); 
    await When('I navigate to the "Welcome to the Wiki" page', null, { page }); 
    await Then('I should see the page content', null, { page }); 
    await And('I should see a login button in the header', null, { page }); 
  });

  test('Guest sees login option on public pages', { tag: ['@auth', '@guest'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am not logged in', null, { page }); 
    await And('a page "Public Lore" exists with view_groups ["public"]', null, { page }); 
    await When('I navigate to the "Public Lore" page', null, { page }); 
    await Then('I should see the page content', null, { page }); 
    await And('I should see a "Login" link or button', null, { page }); 
  });

  test('Guest cannot view restricted pages via direct URL', { tag: ['@auth', '@guest'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am not logged in', null, { page }); 
    await And('a page "GM Secret Plans" exists with view_groups ["gm"]', null, { page }); 
    await When('I navigate directly to the "GM Secret Plans" page', null, { page }); 
    await Then('I should see the page list', null, { page }); 
    await And('I should NOT see "GM Secret Plans" in the navigation', null, { page }); 
  });

  test('Restricted pages do not appear in navigation for guest', { tag: ['@auth', '@guest'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am not logged in', null, { page }); 
    await And('a page "Public Welcome" exists with view_groups ["public"]', null, { page }); 
    await And('a page "GM Secrets" exists with view_groups ["gm"]', null, { page }); 
    await When('I view the page navigation or page list', null, { page }); 
    await Then('I should see "Public Welcome" in the navigation', null, { page }); 
    await And('I should NOT see "GM Secrets" in the navigation', null, { page }); 
  });

  test('Guest does not see Create Page button', { tag: ['@auth', '@guest'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am not logged in', null, { page }); 
    await And('a page "Public Lore" exists with view_groups ["public"]', null, { page }); 
    await When('I navigate to the "Public Lore" page', null, { page }); 
    await Then('I should NOT see the "New Page" button', null, { page }); 
  });

  test('Guest does not see Edit button on pages', { tag: ['@auth', '@guest'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am not logged in', null, { page }); 
    await And('a page "Public Lore" exists with view_groups ["public"]', null, { page }); 
    await When('I navigate to the "Public Lore" page', null, { page }); 
    await Then('I should NOT see the "Edit" button', null, { page }); 
  });

  test('Guest cannot access create page form via direct URL', { tag: ['@auth', '@guest'] }, async ({ Given, When, Then, page }) => { 
    await Given('I am not logged in', null, { page }); 
    await When('I navigate directly to URL "/pages/create"', null, { page }); 
    await Then('I should be redirected to the login page', null, { page }); 
  });

  test('Guest cannot access edit page form via direct URL', { tag: ['@auth', '@guest'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am not logged in', null, { page }); 
    await And('a page "Public Lore" exists with view_groups ["public"]', null, { page }); 
    await When('I navigate directly to edit the "Public Lore" page', null, { page }); 
    await Then('I should be redirected to the login page', null, { page }); 
  });

  test('Guest cannot access the admin panel via direct URL', { tag: ['@auth', '@guest'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am not logged in', null, { page }); 
    await When('I navigate directly to URL "/admin"', null, { page }); 
    await Then('I should see "Unauthorized" on the page', null, { page }); 
    await And('I should see a link to login', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/auth/guest-access.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":13,"tags":["@auth","@guest"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"Given I am not logged in","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"And a page \"Welcome to the Wiki\" exists with view_groups [\"public\"]","stepMatchArguments":[{"group":{"start":7,"value":"\"Welcome to the Wiki\"","children":[{"start":8,"value":"Welcome to the Wiki","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":54,"value":"\"public\"","children":[{"start":55,"value":"public","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":16,"keywordType":"Action","textWithKeyword":"When I navigate to the \"Welcome to the Wiki\" page","stepMatchArguments":[{"group":{"start":18,"value":"\"Welcome to the Wiki\"","children":[{"start":19,"value":"Welcome to the Wiki","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"Then I should see the page content","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":18,"keywordType":"Outcome","textWithKeyword":"And I should see a login button in the header","stepMatchArguments":[]}]},
  {"pwTestLine":18,"pickleLine":20,"tags":["@auth","@guest"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":19,"gherkinStepLine":21,"keywordType":"Context","textWithKeyword":"Given I am not logged in","stepMatchArguments":[]},{"pwStepLine":20,"gherkinStepLine":22,"keywordType":"Context","textWithKeyword":"And a page \"Public Lore\" exists with view_groups [\"public\"]","stepMatchArguments":[{"group":{"start":7,"value":"\"Public Lore\"","children":[{"start":8,"value":"Public Lore","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":46,"value":"\"public\"","children":[{"start":47,"value":"public","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":21,"gherkinStepLine":23,"keywordType":"Action","textWithKeyword":"When I navigate to the \"Public Lore\" page","stepMatchArguments":[{"group":{"start":18,"value":"\"Public Lore\"","children":[{"start":19,"value":"Public Lore","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":22,"gherkinStepLine":24,"keywordType":"Outcome","textWithKeyword":"Then I should see the page content","stepMatchArguments":[]},{"pwStepLine":23,"gherkinStepLine":25,"keywordType":"Outcome","textWithKeyword":"And I should see a \"Login\" link or button","stepMatchArguments":[{"group":{"start":15,"value":"\"Login\"","children":[{"start":16,"value":"Login","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":26,"pickleLine":29,"tags":["@auth","@guest"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":27,"gherkinStepLine":30,"keywordType":"Context","textWithKeyword":"Given I am not logged in","stepMatchArguments":[]},{"pwStepLine":28,"gherkinStepLine":31,"keywordType":"Context","textWithKeyword":"And a page \"GM Secret Plans\" exists with view_groups [\"gm\"]","stepMatchArguments":[{"group":{"start":7,"value":"\"GM Secret Plans\"","children":[{"start":8,"value":"GM Secret Plans","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":50,"value":"\"gm\"","children":[{"start":51,"value":"gm","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":29,"gherkinStepLine":32,"keywordType":"Action","textWithKeyword":"When I navigate directly to the \"GM Secret Plans\" page","stepMatchArguments":[{"group":{"start":27,"value":"\"GM Secret Plans\"","children":[{"start":28,"value":"GM Secret Plans","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":30,"gherkinStepLine":33,"keywordType":"Outcome","textWithKeyword":"Then I should see the page list","stepMatchArguments":[]},{"pwStepLine":31,"gherkinStepLine":34,"keywordType":"Outcome","textWithKeyword":"And I should NOT see \"GM Secret Plans\" in the navigation","stepMatchArguments":[{"group":{"start":17,"value":"\"GM Secret Plans\"","children":[{"start":18,"value":"GM Secret Plans","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":34,"pickleLine":38,"tags":["@auth","@guest"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":35,"gherkinStepLine":39,"keywordType":"Context","textWithKeyword":"Given I am not logged in","stepMatchArguments":[]},{"pwStepLine":36,"gherkinStepLine":40,"keywordType":"Context","textWithKeyword":"And a page \"Public Welcome\" exists with view_groups [\"public\"]","stepMatchArguments":[{"group":{"start":7,"value":"\"Public Welcome\"","children":[{"start":8,"value":"Public Welcome","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":49,"value":"\"public\"","children":[{"start":50,"value":"public","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":37,"gherkinStepLine":41,"keywordType":"Context","textWithKeyword":"And a page \"GM Secrets\" exists with view_groups [\"gm\"]","stepMatchArguments":[{"group":{"start":7,"value":"\"GM Secrets\"","children":[{"start":8,"value":"GM Secrets","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":45,"value":"\"gm\"","children":[{"start":46,"value":"gm","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":38,"gherkinStepLine":42,"keywordType":"Action","textWithKeyword":"When I view the page navigation or page list","stepMatchArguments":[]},{"pwStepLine":39,"gherkinStepLine":43,"keywordType":"Outcome","textWithKeyword":"Then I should see \"Public Welcome\" in the navigation","stepMatchArguments":[{"group":{"start":13,"value":"\"Public Welcome\"","children":[{"start":14,"value":"Public Welcome","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":40,"gherkinStepLine":44,"keywordType":"Outcome","textWithKeyword":"And I should NOT see \"GM Secrets\" in the navigation","stepMatchArguments":[{"group":{"start":17,"value":"\"GM Secrets\"","children":[{"start":18,"value":"GM Secrets","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":43,"pickleLine":48,"tags":["@auth","@guest"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":44,"gherkinStepLine":49,"keywordType":"Context","textWithKeyword":"Given I am not logged in","stepMatchArguments":[]},{"pwStepLine":45,"gherkinStepLine":50,"keywordType":"Context","textWithKeyword":"And a page \"Public Lore\" exists with view_groups [\"public\"]","stepMatchArguments":[{"group":{"start":7,"value":"\"Public Lore\"","children":[{"start":8,"value":"Public Lore","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":46,"value":"\"public\"","children":[{"start":47,"value":"public","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":46,"gherkinStepLine":51,"keywordType":"Action","textWithKeyword":"When I navigate to the \"Public Lore\" page","stepMatchArguments":[{"group":{"start":18,"value":"\"Public Lore\"","children":[{"start":19,"value":"Public Lore","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":47,"gherkinStepLine":52,"keywordType":"Outcome","textWithKeyword":"Then I should NOT see the \"New Page\" button","stepMatchArguments":[{"group":{"start":21,"value":"\"New Page\"","children":[{"start":22,"value":"New Page","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":50,"pickleLine":54,"tags":["@auth","@guest"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":51,"gherkinStepLine":55,"keywordType":"Context","textWithKeyword":"Given I am not logged in","stepMatchArguments":[]},{"pwStepLine":52,"gherkinStepLine":56,"keywordType":"Context","textWithKeyword":"And a page \"Public Lore\" exists with view_groups [\"public\"]","stepMatchArguments":[{"group":{"start":7,"value":"\"Public Lore\"","children":[{"start":8,"value":"Public Lore","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":46,"value":"\"public\"","children":[{"start":47,"value":"public","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":53,"gherkinStepLine":57,"keywordType":"Action","textWithKeyword":"When I navigate to the \"Public Lore\" page","stepMatchArguments":[{"group":{"start":18,"value":"\"Public Lore\"","children":[{"start":19,"value":"Public Lore","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":54,"gherkinStepLine":58,"keywordType":"Outcome","textWithKeyword":"Then I should NOT see the \"Edit\" button","stepMatchArguments":[{"group":{"start":21,"value":"\"Edit\"","children":[{"start":22,"value":"Edit","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":57,"pickleLine":62,"tags":["@auth","@guest"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":58,"gherkinStepLine":63,"keywordType":"Context","textWithKeyword":"Given I am not logged in","stepMatchArguments":[]},{"pwStepLine":59,"gherkinStepLine":64,"keywordType":"Action","textWithKeyword":"When I navigate directly to URL \"/pages/create\"","stepMatchArguments":[{"group":{"start":27,"value":"\"/pages/create\"","children":[{"start":28,"value":"/pages/create","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":60,"gherkinStepLine":65,"keywordType":"Outcome","textWithKeyword":"Then I should be redirected to the login page","stepMatchArguments":[]}]},
  {"pwTestLine":63,"pickleLine":67,"tags":["@auth","@guest"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":64,"gherkinStepLine":68,"keywordType":"Context","textWithKeyword":"Given I am not logged in","stepMatchArguments":[]},{"pwStepLine":65,"gherkinStepLine":69,"keywordType":"Context","textWithKeyword":"And a page \"Public Lore\" exists with view_groups [\"public\"]","stepMatchArguments":[{"group":{"start":7,"value":"\"Public Lore\"","children":[{"start":8,"value":"Public Lore","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":46,"value":"\"public\"","children":[{"start":47,"value":"public","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":66,"gherkinStepLine":70,"keywordType":"Action","textWithKeyword":"When I navigate directly to edit the \"Public Lore\" page","stepMatchArguments":[{"group":{"start":32,"value":"\"Public Lore\"","children":[{"start":33,"value":"Public Lore","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":67,"gherkinStepLine":71,"keywordType":"Outcome","textWithKeyword":"Then I should be redirected to the login page","stepMatchArguments":[]}]},
  {"pwTestLine":70,"pickleLine":75,"tags":["@auth","@guest"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":71,"gherkinStepLine":76,"keywordType":"Context","textWithKeyword":"Given I am not logged in","stepMatchArguments":[]},{"pwStepLine":72,"gherkinStepLine":77,"keywordType":"Action","textWithKeyword":"When I navigate directly to URL \"/admin\"","stepMatchArguments":[{"group":{"start":27,"value":"\"/admin\"","children":[{"start":28,"value":"/admin","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":73,"gherkinStepLine":78,"keywordType":"Outcome","textWithKeyword":"Then I should see \"Unauthorized\" on the page","stepMatchArguments":[{"group":{"start":13,"value":"\"Unauthorized\"","children":[{"start":14,"value":"Unauthorized","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":74,"gherkinStepLine":79,"keywordType":"Outcome","textWithKeyword":"And I should see a link to login","stepMatchArguments":[]}]},
]; // bdd-data-end