@search
Feature: Search

  As a wiki user
  I want to search for content
  So that I can find pages quickly

  Background:
    Given the standard personas are seeded
    And a page "Dragon's Lair" exists with view_groups ["public"] and content "Home of the ancient fire dragon"
    And a page "Dungeon Map" exists with view_groups ["players"] and content "Map of the underground dungeon"
    And a page "Town Square" exists with view_groups ["public"] and content "The central plaza of the town"
    And a page "GM Secret Base" exists with view_groups ["gm"] and content "Hidden location for GM only"

  Scenario: Search finds page by title
    Given I am logged in as "Diana" the Game Master
    When I search for "Dragon"
    Then I should see "Dragon's Lair" in the search results

  Scenario: Search finds page by content
    Given I am logged in as "Diana" the Game Master
    When I search for "underground"
    Then I should see "Dungeon Map" in the search results

  Scenario: Search respects view permissions for Player
    Given I am logged in as "Alex" the Player
    When I search for "Secret"
    Then I should NOT see "GM Secret Base" in the search results

  Scenario: Search respects view permissions for Guest
    Given I am not logged in
    When I search for "Dungeon"
    Then I should NOT see "Dungeon Map" in the search results
    # Dungeon Map is players-only, guest only has public group

  Scenario: Guest can find public pages
    Given I am not logged in
    When I search for "Dragon"
    Then I should see "Dragon's Lair" in the search results

  Scenario: Admin can find all pages
    Given I am logged in as "Diana" the Game Master
    When I search for "Secret"
    Then I should see "GM Secret Base" in the search results
    # Admin group overrides all restrictions

  Scenario: Search returns no results for non-matching query
    Given I am logged in as "Diana" the Game Master
    When I search for "xyznonexistent123"
    Then I should see a "no results" message

  Scenario: Search is case-insensitive
    Given I am logged in as "Diana" the Game Master
    When I search for "dragon"
    Then I should see "Dragon's Lair" in the search results
    When I search for "DRAGON"
    Then I should see "Dragon's Lair" in the search results

  Scenario: Empty search shows appropriate message
    Given I am logged in as "Diana" the Game Master
    When I search for ""
    Then I should see an appropriate message or all pages

  @restricted-blocks
  Scenario: Search does not expose restricted block content to unauthorized users
    Given the page fixture "castle-with-gm-secret" exists
    # Fixture: page "Castle Info" with public content and GM-only restricted block containing "Hidden treasure location"
    When I am logged in as "Alex" the Player
    And I search for "treasure"
    Then I should NOT see "Castle Info" in the search results
    # Restricted content should not be searchable by unauthorized users
