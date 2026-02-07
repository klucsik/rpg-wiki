// Generated from: e2e/features/page-editor/draw-io/diagram-features.feature
import { test } from "../../../../../e2e/fixtures/test-base.ts";

test.describe('Draw.io Basic Functionality', () => {

  test.beforeEach('Background', async ({ Given, And, page }, testInfo) => { if (testInfo.error) return;
    await Given('the standard personas are seeded', null, { page }); 
    await And('I am logged in as "diana"', null, { page }); 
    await And('a page "Architecture" exists with edit_groups ["diana"]', null, { page }); 
    await And('I navigate to edit the "Architecture" page', null, { page }); 
  });
  
  test('Insert diagram from toolbar', { tag: ['@page-editor', '@draw-io', '@features'] }, async ({ When, Then, And, page }) => { 
    await When('I click the "Insert Diagram" button in the toolbar', null, { page }); 
    await Then('a full-screen diagram editor dialog should open', null, { page }); 
    await And('the draw.io editor should be loaded', null, { page }); 
    await And('the editor should show an empty canvas', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/page-editor/draw-io/diagram-features.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":13,"pickleLine":15,"tags":["@page-editor","@draw-io","@features"],"steps":[{"pwStepLine":7,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given the standard personas are seeded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And I am logged in as \"diana\"","isBg":true,"stepMatchArguments":[{"group":{"start":18,"value":"\"diana\"","children":[{"start":19,"value":"diana","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And a page \"Architecture\" exists with edit_groups [\"diana\"]","isBg":true,"stepMatchArguments":[{"group":{"start":7,"value":"\"Architecture\"","children":[{"start":8,"value":"Architecture","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":47,"value":"\"diana\"","children":[{"start":48,"value":"diana","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And I navigate to edit the \"Architecture\" page","isBg":true,"stepMatchArguments":[{"group":{"start":23,"value":"\"Architecture\"","children":[{"start":24,"value":"Architecture","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":16,"keywordType":"Action","textWithKeyword":"When I click the \"Insert Diagram\" button in the toolbar","stepMatchArguments":[{"group":{"start":12,"value":"\"Insert Diagram\"","children":[{"start":13,"value":"Insert Diagram","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"Then a full-screen diagram editor dialog should open","stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":18,"keywordType":"Outcome","textWithKeyword":"And the draw.io editor should be loaded","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":19,"keywordType":"Outcome","textWithKeyword":"And the editor should show an empty canvas","stepMatchArguments":[]}]},
]; // bdd-data-end