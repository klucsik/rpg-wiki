@auth @guest
Feature: Guest Access

  As a guest (unauthenticated user)
  I want to view public content
  So that I can browse the wiki without logging in

  Background:
    Given the standard personas are seeded

  # --- Public Page Access ---

  Scenario: Guest can view public pages
    Given I am not logged in
    And a page "Welcome to the Wiki" exists with view_groups ["public"]
    When I navigate to the "Welcome to the Wiki" page
    Then I should see the page content
    And I should see a login button in the header

  Scenario: Guest sees login option on public pages
    Given I am not logged in
    And a page "Public Lore" exists with view_groups ["public"]
    When I navigate to the "Public Lore" page
    Then I should see the page content
    And I should see a "Login" link or button

  # --- Restricted Page Access (via direct URL) ---

  Scenario: Guest cannot view restricted pages via direct URL
    Given I am not logged in
    And a page "GM Secret Plans" exists with view_groups ["gm"]
    When I navigate directly to the "GM Secret Plans" page
    Then I should see the page list
    And I should NOT see "GM Secret Plans" in the navigation

  # --- Navigation Visibility ---

  Scenario: Restricted pages do not appear in navigation for guest
    Given I am not logged in
    And a page "Public Welcome" exists with view_groups ["public"]
    And a page "GM Secrets" exists with view_groups ["gm"]
    When I view the page navigation or page list
    Then I should see "Public Welcome" in the navigation
    And I should NOT see "GM Secrets" in the navigation

  # --- Button Visibility ---

  Scenario: Guest does not see Create Page button
    Given I am not logged in
    And a page "Public Lore" exists with view_groups ["public"]
    When I navigate to the "Public Lore" page
    Then I should NOT see the "New Page" button

  Scenario: Guest does not see Edit button on pages
    Given I am not logged in
    And a page "Public Lore" exists with view_groups ["public"]
    When I navigate to the "Public Lore" page
    Then I should NOT see the "Edit" button

  # --- Direct URL Access to Forms ---

  Scenario: Guest cannot access create page form via direct URL
    Given I am not logged in
    When I navigate directly to URL "/pages/create"
    Then I should be redirected to the login page

  Scenario: Guest cannot access edit page form via direct URL
    Given I am not logged in
    And a page "Public Lore" exists with view_groups ["public"]
    When I navigate directly to edit the "Public Lore" page
    Then I should be redirected to the login page

  # --- Admin Panel ---

  Scenario: Guest cannot access the admin panel via direct URL
    Given I am not logged in
    When I navigate directly to URL "/admin"
    Then I should see "Unauthorized" on the page
    And I should see a link to login
