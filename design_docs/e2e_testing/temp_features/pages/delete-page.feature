@pages @crud
Feature: Delete Wiki Page

  As a user with delete permissions
  I want to delete wiki pages
  So that I can remove outdated content

  Background:
    Given the standard personas are seeded

  Scenario: GM can delete a page
    Given I am logged in as "Diana" the Game Master
    And a page "Temporary Page" exists
    When I navigate to the "Temporary Page" page
    And I click the delete button
    And I confirm the deletion
    Then the page should no longer exist
    And I should be redirected to the pages list

  Scenario: Delete confirmation is required
    Given I am logged in as "Diana" the Game Master
    And a page "Important Page" exists
    When I navigate to the "Important Page" page
    And I click the delete button
    And I cancel the deletion
    Then the page should still exist

  Scenario: Player cannot delete pages they don't own
    Given I am logged in as "Alex" the Player
    And a page "GM Created Page" exists with edit_groups ["gm"]
    When I navigate to the "GM Created Page" page
    Then I should not see a delete button

  Scenario: Deleted page is not accessible
    Given I am logged in as "Diana" the Game Master
    And a page "To Be Deleted" exists
    And I remember the page URL
    When I delete the page "To Be Deleted"
    And I try to access the remembered URL
    Then I should see a page not found message
