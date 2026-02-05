@restricted-blocks @critical
Feature: View Restricted Block

  As a wiki user
  I want to see restricted blocks based on my group memberships
  So that I only see content I'm authorized to view

  Background:
    Given the standard personas are seeded
    And the page fixture "dragon-info-mixed-permissions" exists
    # Fixture contains:
    #   - Public content: "A mighty dragon lives here."
    #   - Restricted block [usergroups: gm, title: "GM Secret"]: "Dragon is actually friendly."
    #   - Restricted block [usergroups: party-alpha, title: "Party Hint"]: "You have the key."
    #   - Restricted block [usergroups: public, title: "Public Lore"]: "Dragons are ancient creatures."

  @admin-override
  Scenario: Admin sees all restricted blocks
    Given I am logged in as "Diana" the Game Master
    When I view the page "Dragon Info"
    Then I should see the public content "A mighty dragon lives here"
    And I should see a restricted block titled "GM Secret"
    And I should see a restricted block titled "Party Hint"
    And I should see a restricted block titled "Public Lore"
    And I should be able to reveal all restricted blocks

  Scenario: Admin can reveal GM-only content
    Given I am logged in as "Diana" the Game Master
    When I view the page "Dragon Info"
    And I click reveal on the "GM Secret" block
    Then I should see "Dragon is actually friendly"

  Scenario: Player sees their groups' restricted blocks
    Given I am logged in as "Alex" the Player
    When I view the page "Dragon Info"
    Then I should see the public content "A mighty dragon lives here"
    And I should see a restricted block titled "Party Hint"
    And I should see a restricted block titled "Public Lore"
    And I should NOT see a restricted block titled "GM Secret"

  Scenario: Player can reveal their permitted blocks
    Given I am logged in as "Alex" the Player
    When I view the page "Dragon Info"
    And I click reveal on the "Party Hint" block
    Then I should see "You have the key"

  Scenario: Observer sees only public restricted blocks
    Given I am logged in as "Sam" the Observer
    When I view the page "Dragon Info"
    Then I should see the public content "A mighty dragon lives here"
    And I should see a restricted block titled "Public Lore"
    And I should NOT see a restricted block titled "GM Secret"
    And I should NOT see a restricted block titled "Party Hint"

  Scenario: Guest sees only public restricted blocks
    Given I am not logged in
    When I view the page "Dragon Info"
    Then I should see the public content "A mighty dragon lives here"
    And I should see a restricted block titled "Public Lore"
    And I should be able to reveal "Dragons are ancient creatures"
    And I should NOT see any non-public restricted blocks

  Scenario: Restricted blocks have reveal/hide toggle
    Given I am logged in as "Diana" the Game Master
    When I view the page "Dragon Info"
    Then each restricted block should have a "Reveal" button
    When I click reveal on a block
    Then the button should change to "Hide"
    And the content should be visible
    When I click hide on the block
    Then the content should be hidden again
