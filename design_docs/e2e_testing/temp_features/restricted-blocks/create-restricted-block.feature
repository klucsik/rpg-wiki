@restricted-blocks @critical
Feature: Create Restricted Block

  As a Game Master
  I want to create restricted content blocks within pages
  So that I can hide sensitive information from certain players

  Background:
    Given the standard personas are seeded

  Scenario: GM creates a page with a GM-only restricted block
    Given I am logged in as "Diana" the Game Master
    And I am on the create page form
    When I enter "NPC Profile: Lord Blackwood" as the title
    And I add public content "Lord Blackwood is a wealthy noble in the capital city."
    And I add a restricted block with:
      | title      | True Intentions          |
      | usergroups | ["gm"]                   |
      | content    | He is secretly a vampire |
    And I click the save button
    Then the page should be saved successfully
    And the page should contain a restricted block

  Scenario: GM creates a restricted block for specific party
    Given I am logged in as "Diana" the Game Master
    And I am editing a new page
    When I enter "Quest Hints" as the title
    And I add public content "The dungeon lies to the north."
    And I add a restricted block with:
      | title      | Party Alpha Hint                    |
      | usergroups | ["party-alpha"]                     |
      | content    | You found a map in the last session |
    And I click the save button
    Then the page should be saved successfully

  Scenario: GM creates multiple restricted blocks with different permissions
    Given I am logged in as "Diana" the Game Master
    And I am editing a new page
    When I enter "Multi-Secret Page" as the title
    And I add public content "This is visible to everyone."
    And I add a restricted block with:
      | title      | GM Secret                  |
      | usergroups | ["gm"]                     |
      | content    | Only the GM can see this   |
    And I add a restricted block with:
      | title      | Players Hint               |
      | usergroups | ["players"]                |
      | content    | All players can see this   |
    And I add a restricted block with:
      | title      | Public Info                |
      | usergroups | ["public"]                 |
      | content    | Even guests can see this   |
    And I click the save button
    Then the page should be saved with 3 restricted blocks

  Scenario: GM creates restricted block with edit permissions
    Given I am logged in as "Diana" the Game Master
    And I am editing a new page
    When I enter "Editable Secrets" as the title
    And I add a restricted block with:
      | title      | Shared Secret                       |
      | usergroups | ["players"]                         |
      | editgroups | ["gm"]                              |
      | content    | Players see but only GM can edit    |
    And I click the save button
    Then the page should be saved successfully
    And the restricted block should have editgroups ["gm"]

  Scenario: Restricted block title is visible before reveal
    Given I am logged in as "Diana" the Game Master
    And I am editing a new page
    When I add a restricted block with title "Dragon's Weakness"
    And I save the page
    Then the restricted block should show the title "Dragon's Weakness"
    And the content should be hidden until revealed
