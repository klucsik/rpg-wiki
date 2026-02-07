# @page-editor @draw-io @features
# Feature: Draw.io Basic Functionality

#   As a wiki user
#   I want to verify draw.io works correctly
#   So that I can create diagrams in my wiki pages

#   Background:
#     Given the standard personas are seeded
#     And I am logged in as "diana"
#     And a page "Architecture" exists with edit_groups ["diana"]
#     And I navigate to edit the "Architecture" page


#   Scenario: Insert diagram from toolbar
#     When I click the "Insert Diagram" button in the toolbar
#     Then a full-screen diagram editor dialog should open
#     And the draw.io editor should be loaded
#     And the editor should show an empty canvas

  # Scenario: Can add shapes to diagram
  #   When I insert a new diagram
  #   And I open the diagram editor
  #   And I insert a rectangle shape
  #   And I save the diagram
  #   Then the diagram should contain the shape
  #   And the diagram should be visible in view mode

  # Scenario: Can edit existing diagram
  #   When I open the diagram editor on the first diagram
  #   And I modify the diagram
  #   And I save the diagram
  #   Then the changes should be saved
  #   And the updated diagram should display in view mode

  # Scenario: Cancel editing
  #   When I open the diagram editor on the first diagram
  #   And I make changes
  #   And I click "Cancel"
  #   Then the original diagram should remain unchanged

  # Scenario: Can insert diagram inside restricted block
  #   When I insert a restricted Block
  #   And I insert a new diagram inside the restricted block
  #   And I create a simple diagram
  #   And I save the diagram
  #   And I save the page
  #   And I navigate to view the page
  #   And I reveal the restricted block
  #   Then the diagram should be visible inside the restricted block

  # Scenario: Two diagramms on the same page
  #   When I insert a new diagram
  #   And I create a simple diagram
  #   And I save the diagram
  #   And I insert another new diagram
  #   And I create a different simple diagram
  #   And I save the second diagram
  #   Then both diagrams should be visible in view mode