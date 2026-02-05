#You'll need to create a keycloak.json file in e2e/.auth with the following format:
#{
#  "username": " ",
#  "password": " ",
#  "displayName": " ",
#  "appUsername": " "
#}


@auth @keycloak
Feature: Keycloak SSO Login

  As a user
  I want to log in using Keycloak SSO
  So that I can access the wiki with my organization credentials

  Scenario: User can log in with Keycloak SSO
    Given I am on the login page
    When I click the "Sign in with Keycloak" button
    And I enter Keycloak credentials
    Then I should be redirected to the home page
    And I should see "Teszt Elek" in the header
