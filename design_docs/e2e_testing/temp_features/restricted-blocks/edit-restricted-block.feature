@restricted-blocks @critical
Feature: Edit Restricted Block

  As a user with edit permissions
  I want to edit restricted blocks based on my editgroup membership
  So that I can update sensitive content I'm authorized to modify

  Background:
    Given the standard personas are seeded
    And the page fixture "session-notes-with-edit-permissions" exists
    # Fixture contains:
    #   - Page edit_groups: ["players", "gm"]
    #   - Public content: "Session 1 recap - The party met at the tavern."
    #   - Restricted block [usergroups: gm, editgroups: gm, title: "GM Notes"]: "Secret plot twist coming next session."
    #   - Restricted block [usergroups: players, editgroups: players, title: "Player Notes"]: "We need to buy more potions."

  Scenario: GM can see and edit all restricted blocks
    Given I am logged in as "Diana" the Game Master
    When I open "Session Notes" for editing
    Then I should see the public content in the editor
    And I should see the "GM Notes" restricted block in the editor
    And I should see the "Player Notes" restricted block in the editor
    And I should be able to edit both restricted blocks

  Scenario: GM edits restricted block content
    Given I am logged in as "Diana" the Game Master
    When I open "Session Notes" for editing
    And I change the "GM Notes" content to "The villain is revealed next session"
    And I click the save button
    Then the page should be saved successfully
    And the "GM Notes" block should contain "The villain is revealed"

  Scenario: Player sees placeholder for blocks they cannot edit
    Given I am logged in as "Alex" the Player
    When I open "Session Notes" for editing
    Then I should see the public content in the editor
    And I should see a placeholder for the "GM Notes" restricted block
    And I should NOT see "Secret plot twist" in the editor
    And I should see the "Player Notes" restricted block content

  Scenario: Player can edit blocks in their editgroups
    Given I am logged in as "Alex" the Player
    When I open "Session Notes" for editing
    And I change the "Player Notes" content to "We bought healing potions"
    And I click the save button
    Then the page should be saved successfully
    And the "Player Notes" block should contain "We bought healing potions"

  @critical-security
  Scenario: Editing page preserves restricted blocks user cannot see
    Given I am logged in as "Alex" the Player
    When I open "Session Notes" for editing
    And I change the public content to "Session 1 - Updated recap"
    And I click the save button
    Then the public content should be "Session 1 - Updated recap"
    And the "GM Notes" block should still contain "Secret plot twist"
    # Verify server preserved the block Alex couldn't see

  @critical-security
  Scenario: Player cannot inject content into blocks they cannot edit
    Given I am logged in as "Alex" the Player
    When I open "Session Notes" for editing
    Then I should not be able to modify the GM Notes placeholder
    And attempting to inject HTML for a restricted block should fail

  Scenario: Restricted block editgroups can be modified by GM
    Given I am logged in as "Diana" the Game Master
    When I open "Session Notes" for editing
    And I change the "Player Notes" editgroups to ["gm"]
    And I click the save button
    Then players should no longer be able to edit that block
