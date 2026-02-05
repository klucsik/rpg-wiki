@pages @view
Feature: View Wiki Page

  As a wiki user
  I want to view wiki pages
  So that I can read the content

  Background:
    Given the standard personas are seeded

  # --- Direct Page Access ---

  Scenario: GM can view any page
    Given I am logged in as "Diana" the Game Master
    And a page "Ancient Lore" exists with view_groups ["gm"]
    When I navigate to the "Ancient Lore" page
    Then I should see the page title "Ancient Lore"
    And I should see the page content

  Scenario: Player can view pages in their groups
    Given I am logged in as "Alex" the Player
    And a page "Party Quest Log" exists with view_groups ["players"]
    When I navigate to the "Party Quest Log" page
    Then I should see the page title "Party Quest Log"
    And I should see the page content

  Scenario: Player cannot view GM-only pages via direct URL
    Given I am logged in as "Alex" the Player
    And a page "GM Notes" exists with view_groups ["gm"] and id "50"
    When I navigate directly to URL "/pages/50"
    Then I should see an access denied message

  Scenario: Observer can view public pages
    Given I am logged in as "Sam" the Observer
    And a page "World History" exists with view_groups ["public"]
    When I navigate to the "World History" page
    Then I should see the page content

  Scenario: Observer cannot view players-only pages via direct URL
    Given I am logged in as "Sam" the Observer
    And a page "Party Secrets" exists with view_groups ["players"] and id "51"
    When I navigate directly to URL "/pages/51"
    Then I should see an access denied message

  Scenario: Admin can view all pages regardless of view_groups
    Given I am logged in as "Diana" the Game Master
    And a page "Very Restricted" exists with view_groups ["some-random-group"]
    When I navigate to the "Very Restricted" page
    Then I should see the page content
    # Diana is in admin group, which overrides all restrictions

  # --- Navigation Visibility ---

  Scenario: Player only sees permitted pages in navigation
    Given I am logged in as "Alex" the Player
    And the following pages exist:
      | title              | view_groups       |
      | Public Welcome     | ["public"]        |
      | Players Handbook   | ["players"]       |
      | GM Campaign Notes  | ["gm"]            |
      | Alpha Mission      | ["party-alpha"]   |
    When I view the page navigation or page list
    Then I should see "Public Welcome" in the navigation
    And I should see "Players Handbook" in the navigation
    And I should see "Alpha Mission" in the navigation
    And I should NOT see "GM Campaign Notes" in the navigation

  Scenario: Observer only sees public and observer pages in navigation
    Given I am logged in as "Sam" the Observer
    And the following pages exist:
      | title              | view_groups       |
      | Public Welcome     | ["public"]        |
      | Observer Briefing  | ["observers"]     |
      | Players Only       | ["players"]       |
    When I view the page navigation or page list
    Then I should see "Public Welcome" in the navigation
    And I should see "Observer Briefing" in the navigation
    And I should NOT see "Players Only" in the navigation

  Scenario: Admin sees all pages in navigation
    Given I am logged in as "Diana" the Game Master
    And the following pages exist:
      | title              | view_groups       |
      | Public Welcome     | ["public"]        |
      | GM Secrets         | ["gm"]            |
      | Random Group Page  | ["some-group"]    |
    When I view the page navigation or page list
    Then I should see "Public Welcome" in the navigation
    And I should see "GM Secrets" in the navigation
    And I should see "Random Group Page" in the navigation

  # --- Content Display ---

  Scenario: Page displays formatted content correctly
    Given I am logged in as "Diana" the Game Master
    And a page exists with formatted content including headings and lists
    When I view the page
    Then I should see the headings rendered correctly
    And I should see the lists rendered correctly
