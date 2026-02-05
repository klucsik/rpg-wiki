@pages @crud
Feature: Edit Wiki Page

  As a user with edit permissions
  I want to edit existing wiki pages
  So that I can update content

  Background:
    Given the standard personas are seeded

  Scenario: GM can edit an existing page
    Given I am logged in as "Diana" the Game Master
    And a page "Old Castle" exists with content "An ancient fortress"
    When I open the "Old Castle" page for editing
    And I change the content to "The castle is now in ruins after the dragon attack"
    And I click the save button
    Then I should see "The castle is now in ruins" in the content
    And a new version should be created

  Scenario: GM can edit page title
    Given I am logged in as "Diana" the Game Master
    And a page "Draft Location" exists
    When I open the "Draft Location" page for editing
    And I change the title to "The Haunted Forest"
    And I click the save button
    Then I should see the page with title "The Haunted Forest"

  Scenario: Player with edit rights can edit page
    Given I am logged in as "Alex" the Player
    And a page "Shared Notes" exists with edit_groups ["players"]
    When I open the "Shared Notes" page for editing
    And I add content "Alex was here"
    And I click the save button
    Then I should see "Alex was here" in the content

  Scenario: Player without edit rights cannot edit page
    Given I am logged in as "Alex" the Player
    And a page "GM Only Page" exists with edit_groups ["gm"]
    When I navigate to the "GM Only Page" page
    Then I should not see an edit button

  Scenario: Observer cannot edit any pages
    Given I am logged in as "Sam" the Observer
    And a page "Public Page" exists with view_groups ["public"] and edit_groups ["players"]
    When I navigate to the "Public Page" page
    Then I should not see an edit button

  Scenario: Editing creates a new version
    Given I am logged in as "Diana" the Game Master
    And a page "Versioned Page" exists with content "Version 1 content"
    When I open the "Versioned Page" page for editing
    And I change the content to "Version 2 content"
    And I click the save button
    Then the page should have 2 versions
    And the latest version should contain "Version 2 content"

  Scenario: Autosave creates draft
    Given I am logged in as "Diana" the Game Master
    And a page "Autosave Test" exists
    When I open the "Autosave Test" page for editing
    And I make changes to the content
    And I wait for autosave
    Then a draft version should be saved
