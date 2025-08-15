# Changelog
## Version 20230815
- Added health check endpoints (/health and /ready).
- Fixed missing new page button in the header navigation for logged-in users.

## Version 20250813
- Fixed "Save Draft Now" to show notification when no changes are detected since last draft save.
- Fixed main "Save" button to compare changes against latest published version instead of latest draft version. This fixes the issue when after draft save, the page couldn't be saved properly if no changes were made since the last draft save.
- Added changelog page accessible to all users at `/admin/changelog` with link in header navigation.

## Version 20250804
- Added changelog.
- Refactored readme.
- Created dockerhub repo.
- Minor cleanups.