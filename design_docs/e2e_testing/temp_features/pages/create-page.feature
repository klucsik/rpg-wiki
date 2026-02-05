@pages @crud
Feature: Create Wiki Page

  As a user with edit permissions
  I want to create new wiki pages
  So that I can add content to the wiki

  Background:
    Given the standard personas are seeded

  Scenario: GM creates a new wiki page
    Given I am logged in as "Diana" the Game Master
    And I am on the create page form
    When I enter "Dragon Lair" as the title
    And I enter "A dark cave in the mountains where an ancient dragon dwells." in the editor
    And I set the path to "/locations/dragon-lair"
    And I click the save button
    Then I should see the page with title "Dragon Lair"
    And I should see "A dark cave in the mountains" in the content
    And the page should be accessible at path "/locations/dragon-lair"

  Scenario: GM creates a page with custom view groups
    Given I am logged in as "Diana" the Game Master
    And I am on the create page form
    When I enter "Secret Dungeon" as the title
    And I enter "Only for players to see" in the editor
    And I set view_groups to ["players"]
    And I click the save button
    Then the page should be saved successfully
    And the page should have view_groups ["players"]

  Scenario: GM creates a page with custom edit groups
    Given I am logged in as "Diana" the Game Master
    And I am on the create page form
    When I enter "Collaborative Notes" as the title
    And I enter "Everyone can edit this" in the editor
    And I set edit_groups to ["players", "gm"]
    And I click the save button
    Then the page should be saved successfully

  Scenario: Page title is required
    Given I am logged in as "Diana" the Game Master
    And I am on the create page form
    When I enter content but no title
    And I try to save the page
    Then I should see a validation error for the title field

  Scenario: Path is required
    Given I am logged in as "Diana" the Game Master
    And I am on the create page form
    When I enter "Nameless Path" as the title
    And I enter "Content without a path" in the editor
    And I leave the path field empty
    And I try to save the page
    Then I should see a validation error for the path field

  Scenario: Path and Title combination must be unique
    Given I am logged in as "Diana" the Game Master
    And a page "Existing Page" exists with path "/existing-page"
    And I am on the create page form
    When I enter "Existing Page" as the title
    And I set the path to "/existing-page"
    And I enter "Some content" in the editor
    And I try to save the page
    Then I should see a validation error for the path field

