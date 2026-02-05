@restricted-blocks @critical @security
Feature: Restricted Block Permission Security

  As a system
  I must ensure restricted content is never leaked to unauthorized users
  So that the wiki maintains proper access control

  Background:
    Given the standard personas are seeded
    And the page fixture "secrets-page-security-test" exists
    # Fixture contains:
    #   - Page view_groups: ["public"]
    #   - Public content: "Public content visible to all."
    #   - Restricted block [usergroups: gm, title: "Top Secret"]: "The treasure is under the old oak tree."
    #   - Restricted block [usergroups: party-alpha, title: "Alpha Hint"]: "Look for the hidden door."

  @critical-security
  Scenario: GM-restricted content never sent to Player's browser
    Given I am logged in as "Alex" the Player
    When I view the page "Secrets Page"
    Then the page HTML should NOT contain "The treasure is under the old oak tree"
    And the API response should NOT contain "The treasure is under the old oak tree"
    And browser DevTools should not show the restricted content

  @critical-security
  Scenario: GM-restricted content never sent to Guest's browser
    Given I am not logged in
    When I view the page "Secrets Page"
    Then the page HTML should NOT contain "The treasure is under the old oak tree"
    And the page HTML should NOT contain "Look for the hidden door"
    And the API response should NOT contain restricted content for non-public groups

  @critical-security
  Scenario: Cannot access restricted content via direct API call
    Given I am logged in as "Alex" the Player
    When I make a direct API request to get page "Secrets Page"
    Then the API response should contain public content
    And the API response should NOT contain "Top Secret" block content
    And the API response should contain "Alpha Hint" block for party-alpha

  @critical-security
  Scenario: Admin group overrides all view restrictions
    Given I am logged in as "Diana" the Game Master
    When I make a direct API request to get page "Secrets Page"
    Then the API response should contain ALL restricted block content
    # Admin group membership grants access to everything

  @critical-security
  Scenario: Editing as player does not expose hidden content in API
    Given I am logged in as "Alex" the Player
    And "Alex" has edit rights to page "Secrets Page"
    When I request the page for editing via API
    Then the edit response should contain placeholders for GM blocks
    And the edit response should NOT contain "The treasure is under the old oak tree"

  @critical-security
  Scenario: Saving as player preserves hidden restricted blocks
    Given I am logged in as "Alex" the Player
    And "Alex" has edit rights to page "Secrets Page"
    When I open "Secrets Page" for editing
    And I modify only the public content
    And I save the page
    Then I verify as GM that "The treasure is under the old oak tree" still exists
    And the GM block should be unchanged

  @critical-security
  Scenario: Player cannot forge restricted block permissions
    Given I am logged in as "Alex" the Player
    And "Alex" has edit rights to page "Secrets Page"
    When I attempt to save the page with modified GM block permissions
    Then the save should either fail or preserve original permissions
    And the GM block should remain protected

  Scenario: Public restricted blocks visible to all users
    Given the page fixture "page-with-public-block" exists
    # Fixture: page with a [usergroups: public] restricted block
    When I view the page as a guest
    Then I should see the public restricted block
    And I should be able to reveal its content

  Scenario: Multiple group memberships grant cumulative access
    Given I am logged in as "Alex" the Player
    And the page fixture "multi-group-blocks" exists
    # Fixture: page with blocks for players, party-alpha, public, and gm groups
    When I view the page
    Then I should see all blocks matching my groups
    And I should not see blocks for groups I'm not in

  Scenario: Empty usergroups means no one can see the block
    Given the page fixture "empty-usergroups-block" exists
    # Fixture: page with a restricted block with usergroups: []
    When I am logged in as "Diana" the Game Master
    And I view the page
    Then I should still see the block because admin overrides all
    When I am logged in as "Alex" the Player
    And I view the same page
    Then I should NOT see that restricted block
