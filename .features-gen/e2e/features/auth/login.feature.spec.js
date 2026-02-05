// Generated from: e2e/features/auth/login.feature
import { test } from "../../../../e2e/fixtures/test-base.ts";

test.describe('User Login', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('the standard personas are seeded', null, { page }); 
  });
  
  test('User can log in with valid credentials', { tag: ['@auth'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the login page', null, { page }); 
    await When('I enter username "Diana"', null, { page }); 
    await And('I enter password "TestDiana123!"', null, { page }); 
    await And('I click the login button', null, { page }); 
    await Then('I should be redirected to the home page', null, { page }); 
    await And('I should see "Diana" in the header', null, { page }); 
  });

  test('User sees error with invalid credentials', { tag: ['@auth'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the login page', null, { page }); 
    await When('I enter username "Diana"', null, { page }); 
    await And('I enter password "WrongPassword123!"', null, { page }); 
    await And('I click the login button', null, { page }); 
    await Then('I should see an error message', null, { page }); 
    await And('I should remain on the login page', null, { page }); 
  });

  test('User sees error with non-existent username', { tag: ['@auth'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the login page', null, { page }); 
    await When('I enter username "nonexistent"', null, { page }); 
    await And('I enter password "SomePassword123!"', null, { page }); 
    await And('I click the login button', null, { page }); 
    await Then('I should see an error message', null, { page }); 
    await And('I should remain on the login page', null, { page }); 
  });

  test('Login form validates required fields', { tag: ['@auth'] }, async ({ Given, When, Then, page }) => { 
    await Given('I am on the login page', null, { page }); 
    await When('I click the login button without entering credentials', null, { page }); 
    await Then('I should see validation errors for required fields', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/auth/login.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":11,"tags":["@auth"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"When I enter username \"Diana\"","stepMatchArguments":[{"group":{"start":17,"value":"\"Diana\"","children":[{"start":18,"value":"Diana","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":14,"keywordType":"Action","textWithKeyword":"And I enter password \"TestDiana123!\"","stepMatchArguments":[{"group":{"start":17,"value":"\"TestDiana123!\"","children":[{"start":18,"value":"TestDiana123!","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":15,"keywordType":"Action","textWithKeyword":"And I click the login button","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"Then I should be redirected to the home page","stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"And I should see \"Diana\" in the header","stepMatchArguments":[{"group":{"start":13,"value":"\"Diana\"","children":[{"start":14,"value":"Diana","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":19,"pickleLine":19,"tags":["@auth"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":20,"gherkinStepLine":20,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":21,"gherkinStepLine":21,"keywordType":"Action","textWithKeyword":"When I enter username \"Diana\"","stepMatchArguments":[{"group":{"start":17,"value":"\"Diana\"","children":[{"start":18,"value":"Diana","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":22,"gherkinStepLine":22,"keywordType":"Action","textWithKeyword":"And I enter password \"WrongPassword123!\"","stepMatchArguments":[{"group":{"start":17,"value":"\"WrongPassword123!\"","children":[{"start":18,"value":"WrongPassword123!","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":23,"gherkinStepLine":23,"keywordType":"Action","textWithKeyword":"And I click the login button","stepMatchArguments":[]},{"pwStepLine":24,"gherkinStepLine":24,"keywordType":"Outcome","textWithKeyword":"Then I should see an error message","stepMatchArguments":[]},{"pwStepLine":25,"gherkinStepLine":25,"keywordType":"Outcome","textWithKeyword":"And I should remain on the login page","stepMatchArguments":[]}]},
  {"pwTestLine":28,"pickleLine":27,"tags":["@auth"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":29,"gherkinStepLine":28,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":30,"gherkinStepLine":29,"keywordType":"Action","textWithKeyword":"When I enter username \"nonexistent\"","stepMatchArguments":[{"group":{"start":17,"value":"\"nonexistent\"","children":[{"start":18,"value":"nonexistent","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":31,"gherkinStepLine":30,"keywordType":"Action","textWithKeyword":"And I enter password \"SomePassword123!\"","stepMatchArguments":[{"group":{"start":17,"value":"\"SomePassword123!\"","children":[{"start":18,"value":"SomePassword123!","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":32,"gherkinStepLine":31,"keywordType":"Action","textWithKeyword":"And I click the login button","stepMatchArguments":[]},{"pwStepLine":33,"gherkinStepLine":32,"keywordType":"Outcome","textWithKeyword":"Then I should see an error message","stepMatchArguments":[]},{"pwStepLine":34,"gherkinStepLine":33,"keywordType":"Outcome","textWithKeyword":"And I should remain on the login page","stepMatchArguments":[]}]},
  {"pwTestLine":37,"pickleLine":35,"tags":["@auth"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":38,"gherkinStepLine":36,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":39,"gherkinStepLine":37,"keywordType":"Action","textWithKeyword":"When I click the login button without entering credentials","stepMatchArguments":[]},{"pwStepLine":40,"gherkinStepLine":38,"keywordType":"Outcome","textWithKeyword":"Then I should see validation errors for required fields","stepMatchArguments":[]}]},
]; // bdd-data-end