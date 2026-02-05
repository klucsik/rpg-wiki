// Generated from: e2e/features/auth/logout.feature
import { test } from "../../../../e2e/fixtures/test-base.ts";

test.describe('User Logout', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('the standard personas are seeded', null, { page }); 
  });
  
  test('GM can log out', { tag: ['@auth'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am logged in as "Diana" the Game Master', null, { page }); 
    await When('I click the logout button', null, { page }); 
    await Then('I should be redirected to the login page', null, { page }); 
    await And('I should not see my username in the header', null, { page }); 
  });

  test('After logout, admin page requires login', { tag: ['@auth'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am logged in as "Diana" the Game Master', null, { page }); 
    await When('I click the logout button', null, { page }); 
    await And('I try to access the admin page', null, { page }); 
    await Then('I should see "Unauthorized" on the page', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/auth/logout.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":11,"tags":["@auth"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"Given I am logged in as \"Diana\" the Game Master","stepMatchArguments":[{"group":{"start":18,"value":"\"Diana\"","children":[{"start":19,"value":"Diana","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"When I click the logout button","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then I should be redirected to the login page","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"And I should not see my username in the header","stepMatchArguments":[]}]},
  {"pwTestLine":17,"pickleLine":18,"tags":["@auth"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":18,"gherkinStepLine":19,"keywordType":"Context","textWithKeyword":"Given I am logged in as \"Diana\" the Game Master","stepMatchArguments":[{"group":{"start":18,"value":"\"Diana\"","children":[{"start":19,"value":"Diana","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":20,"keywordType":"Action","textWithKeyword":"When I click the logout button","stepMatchArguments":[]},{"pwStepLine":20,"gherkinStepLine":21,"keywordType":"Action","textWithKeyword":"And I try to access the admin page","stepMatchArguments":[]},{"pwStepLine":21,"gherkinStepLine":22,"keywordType":"Outcome","textWithKeyword":"Then I should see \"Unauthorized\" on the page","stepMatchArguments":[{"group":{"start":13,"value":"\"Unauthorized\"","children":[{"start":14,"value":"Unauthorized","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end