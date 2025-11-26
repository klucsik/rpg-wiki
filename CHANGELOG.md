# Changelog
## Version 20251127
- Added default page option (and settings admin page)

## Version 20251126
- Reorganized soruce code into feature-based architecture for better maintainability.
- Only show changelog to admin users
- On page creation or edit: If path is left empty, it defaults to /
- Fix image resizer problems
- Fix editable area doesn't fill the available space
- Styling Improvements on the page view and editor

## Version 20250825
- Improved error handling for page creation and editing.
- Enhanced validation for path and title uniqueness.
- Added path search for page creation, allowing users to find existing paths.

## Version 20250815
- Added health check endpoints (/health and /ready).
- Fixed missing new page button in the header navigation for logged-in users.
- Added search functionality to the header navigation.
- Added Link Page button in editor toolbar to open a modal for searching and linking to existing pages.

## Version 20250813
- Fixed "Save Draft Now" to show notification when no changes are detected since last draft save.
- Fixed main "Save" button to compare changes against latest published version instead of latest draft version. This fixes the issue when after draft save, the page couldn't be saved properly if no changes were made since the last draft save.
- Added changelog page accessible to all users at `/admin/changelog` with link in header navigation.

## Version 20250804
- Added changelog.
- Refactored readme.
- Created dockerhub repo.
- Minor cleanups.