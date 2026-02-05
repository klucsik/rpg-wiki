// Generated from: e2e/features/auth/keycloak-login.feature
import { test } from "../../../../e2e/fixtures/test-base.ts";

test.describe('Keycloak SSO Login', () => {

  test('User can log in with Keycloak SSO', { tag: ['@auth', '@keycloak'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the login page', null, { page }); 
    await When('I click the "Sign in with Keycloak" button', null, { page }); 
    await And('I enter Keycloak credentials', null, { page }); 
    await Then('I should be redirected to the home page', null, { page }); 
    await And('I should see "Teszt Elek" in the header', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/auth/keycloak-login.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":17,"tags":["@auth","@keycloak"],"steps":[{"pwStepLine":7,"gherkinStepLine":18,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":19,"keywordType":"Action","textWithKeyword":"When I click the \"Sign in with Keycloak\" button","stepMatchArguments":[{"group":{"start":12,"value":"\"Sign in with Keycloak\"","children":[{"start":13,"value":"Sign in with Keycloak","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":20,"keywordType":"Action","textWithKeyword":"And I enter Keycloak credentials","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":21,"keywordType":"Outcome","textWithKeyword":"Then I should be redirected to the home page","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":22,"keywordType":"Outcome","textWithKeyword":"And I should see \"Teszt Elek\" in the header","stepMatchArguments":[{"group":{"start":13,"value":"\"Teszt Elek\"","children":[{"start":14,"value":"Teszt Elek","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end