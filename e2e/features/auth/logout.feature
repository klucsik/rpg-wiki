@auth
Feature: User Logout

  As a logged-in user
  I want to log out of the wiki
  So that my session is ended securely

  Background:
    Given the standard personas are seeded

  Scenario: GM can log out
    Given I am logged in as "Diana" the Game Master
    When I click the logout button
    Then I should be redirected to the login page
    And I should not see my username in the header


  Scenario: After logout, admin page requires login
    Given I am logged in as "Diana" the Game Master
    When I click the logout button
    And I try to access the admin page
    Then I should see "Unauthorized" on the page
