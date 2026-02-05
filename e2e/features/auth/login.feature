@auth
Feature: User Login

  As a user
  I want to log in to the wiki
  So that I can access content based on my group memberships

  Background:
    Given the standard personas are seeded

  Scenario: User can log in with valid credentials
    Given I am on the login page
    When I enter username "Diana"
    And I enter password "TestDiana123!"
    And I click the login button
    Then I should be redirected to the home page
    And I should see "Diana" in the header

  Scenario: User sees error with invalid credentials
    Given I am on the login page
    When I enter username "Diana"
    And I enter password "WrongPassword123!"
    And I click the login button
    Then I should see an error message
    And I should remain on the login page

  Scenario: User sees error with non-existent username
    Given I am on the login page
    When I enter username "nonexistent"
    And I enter password "SomePassword123!"
    And I click the login button
    Then I should see an error message
    And I should remain on the login page

  Scenario: Login form validates required fields
    Given I am on the login page
    When I click the login button without entering credentials
    Then I should see validation errors for required fields
