# Debug Class Names — Implementation Plan

## Purpose

Add semantic, non-styling CSS class names to every significant JSX element across the whole application. These classes have **no visual effect** — they exist solely to make devtools inspection easier: you can look at any element in the browser's Elements panel and immediately know which component and which element role you are looking at, and grep for it in the source.

## Convention

```
ComponentName-elementRole
```

- `ComponentName` — PascalCase, matches the React component name exactly
- `elementRole` — camelCase, describes what the element *does or represents* in context

**Examples:**
```tsx
// Before
<button onClick={handleSave} className="bg-indigo-600 text-white ...">

// After
<button onClick={handleSave} className="PageEditor-saveBtn bg-indigo-600 text-white ...">
```

Debug classes are always the **first** class in the `className` string so they are instantly visible in devtools.

## Rules

1. Every element that is a meaningful UI piece gets a debug class. Pure layout wrappers with no semantic role (e.g. a `div` that only sets `flex flex-row`) can be skipped, but when in doubt, add one.
2. Modals get their own prefix even though they are rendered inside the parent component, e.g. `PageEditorDeleteModal-overlay`.
3. Repeated elements inside a `.map()` do not need unique names — the same debug class on every row is fine. The data content distinguishes rows.
4. Context providers that render no DOM (`{children}` only) are skipped entirely.
5. Do **not** use these classes in CSS selectors for styling. They are for devtools only.

---

## File-by-file class name assignments

### `app/layout.tsx` — `RootLayout`

| Element | Debug class |
|---|---|
| `<main>` content slot wrapper | `RootLayout-main` |

---

### `app/page.tsx` — `Page`

| Element | Debug class |
|---|---|
| Full-screen loading overlay div | `Page-loadingOverlay` |
| "Loading…" text | `Page-loadingText` |

---

### `app/pages/create/page.tsx` — `CreatePage`

| Element | Debug class |
|---|---|
| Redirect text div | `CreatePage-redirectText` |

---

### `app/pages/[id]/edit/page.tsx` — `EditPage`

| Element | Debug class |
|---|---|
| "Loading page…" text div | `EditPage-loadingText` |
| Error text div | `EditPage-errorText` |

---

### `app/auth/signin/page.tsx` — `SignIn`

| Element | Debug class |
|---|---|
| Full-screen centered wrapper | `SignIn-root` |
| Inner form card | `SignIn-card` |
| Heading | `SignIn-heading` |
| SSO section div | `SignIn-ssoSection` |
| Keycloak SSO button | `SignIn-keycloakBtn` |
| "Or continue with" divider | `SignIn-divider` |
| Credentials form | `SignIn-credentialsForm` |
| Input group wrapper | `SignIn-inputGroup` |
| Username input | `SignIn-usernameInput` |
| Password input | `SignIn-passwordInput` |
| Error message div | `SignIn-errorMessage` |
| Submit button | `SignIn-submitBtn` |

---

### `app/auth/signout/page.tsx` — `SignOut`

| Element | Debug class |
|---|---|
| Full-screen wrapper | `SignOut-root` |
| Inner content div | `SignOut-card` |
| Heading | `SignOut-heading` |
| Spinner div | `SignOut-spinner` |

---

### `app/admin/page.tsx` — `AdminPage` + `AdminSidebar`

#### `AdminSidebar`

| Element | Debug class |
|---|---|
| `<aside>` wrapper | `AdminSidebar-root` |
| "Admin Menu" heading | `AdminSidebar-heading` |
| Nav link container | `AdminSidebar-nav` |
| "User Management" link | `AdminSidebar-usersLink` |
| "Group Management" link | `AdminSidebar-groupsLink` |
| "Git Backup Settings" link | `AdminSidebar-backupLink` |
| "Site Settings" link | `AdminSidebar-settingsLink` |
| "Session Info" link | `AdminSidebar-sessionLink` |
| Bottom actions area | `AdminSidebar-actions` |
| "← Back to Wiki" link | `AdminSidebar-backBtn` |
| "Sign Out" button | `AdminSidebar-signOutBtn` |

#### `AdminPage`

| Element | Debug class |
|---|---|
| Loading/unauthorized full-screen wrapper | `AdminPage-stateOverlay` |
| Loading/unauthorized card | `AdminPage-stateCard` |
| State heading | `AdminPage-stateHeading` |
| Status message paragraph | `AdminPage-stateMessage` |
| "Go to Login" link button | `AdminPage-loginLink` |
| Authenticated layout wrapper | `AdminPage-root` |
| Main content area | `AdminPage-main` |
| "Admin Dashboard" heading | `AdminPage-heading` |
| Welcome paragraph | `AdminPage-welcome` |
| Users section | `AdminPage-usersSection` |
| Groups section | `AdminPage-groupsSection` |
| Backup section | `AdminPage-backupSection` |
| Settings section | `AdminPage-settingsSection` |
| Session info section | `AdminPage-sessionSection` |
| Session info content div | `AdminPage-sessionInfo` |

---

### `app/admin/changelog/page.tsx` — `ChangelogPage`

| Element | Debug class |
|---|---|
| Loading text div | `ChangelogPage-loadingText` |
| Page background wrapper | `ChangelogPage-root` |
| Content container | `ChangelogPage-container` |
| Max-width limiter | `ChangelogPage-inner` |
| Header row | `ChangelogPage-header` |
| "Changelog" heading | `ChangelogPage-heading` |
| "← Back to Admin" link | `ChangelogPage-backBtn` |
| Content card | `ChangelogPage-card` |
| Loading/error placeholder inside card | `ChangelogPage-placeholder` |
| Rendered markdown div | `ChangelogPage-content` |

---

### `app/users/UsersAdminPage.tsx` — `UsersAdminPage`

| Element | Debug class |
|---|---|
| Outer card wrapper | `UsersAdminPage-root` |
| "Manage Users" heading | `UsersAdminPage-heading` |
| Add-user form section | `UsersAdminPage-addForm` |
| Display name input | `UsersAdminPage-addDisplayNameInput` |
| Username input | `UsersAdminPage-addUsernameInput` |
| Password input | `UsersAdminPage-addPasswordInput` |
| Groups multi-select | `UsersAdminPage-addGroupsSelect` |
| "Add User" button | `UsersAdminPage-addBtn` |
| Users table | `UsersAdminPage-table` |
| Table header row | `UsersAdminPage-tableHead` |
| User row (per user) | `UsersAdminPage-userRow` |
| Inline edit name input | `UsersAdminPage-editDisplayNameInput` |
| Inline edit username input | `UsersAdminPage-editUsernameInput` |
| Inline edit password input | `UsersAdminPage-editPasswordInput` |
| Inline edit groups select | `UsersAdminPage-editGroupsSelect` |
| "Save" inline button | `UsersAdminPage-saveRowBtn` |
| "Cancel" inline button | `UsersAdminPage-cancelRowBtn` |
| "Edit" row trigger button | `UsersAdminPage-editRowBtn` |
| "Delete" row trigger button | `UsersAdminPage-deleteRowBtn` |
| Delete modal overlay | `UsersAdminPageDeleteModal-overlay` |
| Delete modal card | `UsersAdminPageDeleteModal-card` |
| Delete modal heading | `UsersAdminPageDeleteModal-heading` |
| "Yes, Delete" button | `UsersAdminPageDeleteModal-confirmBtn` |
| "Cancel" button | `UsersAdminPageDeleteModal-cancelBtn` |

---

### `app/groups/page.tsx` — `GroupsAdminPage`

| Element | Debug class |
|---|---|
| Outer card wrapper | `GroupsAdminPage-root` |
| "Manage Groups" heading | `GroupsAdminPage-heading` |
| Groups list | `GroupsAdminPage-list` |
| Group row (per group) | `GroupsAdminPage-groupRow` |
| Group name span | `GroupsAdminPage-groupName` |
| "Delete" group button | `GroupsAdminPage-deleteGroupBtn` |
| Delete modal overlay | `GroupsAdminPageDeleteModal-overlay` |
| Delete modal card | `GroupsAdminPageDeleteModal-card` |
| Delete modal heading | `GroupsAdminPageDeleteModal-heading` |
| "Yes, Delete" button | `GroupsAdminPageDeleteModal-confirmBtn` |
| "Cancel" button | `GroupsAdminPageDeleteModal-cancelBtn` |
| Add group form | `GroupsAdminPage-addForm` |
| New group name input | `GroupsAdminPage-addInput` |
| "Add Group" submit button | `GroupsAdminPage-addBtn` |

---

### `components/layout/HeaderNav.tsx` — `HeaderNav`

| Element | Debug class |
|---|---|
| `<header>` | `HeaderNav-root` |
| Left `<nav>` | `HeaderNav-nav` |
| Mobile sidebar toggle button | `HeaderNav-sidebarToggleBtn` |
| Brand logo link | `HeaderNav-brandLink` |
| "Pages" nav link | `HeaderNav-pagesLink` |
| "Changelog" nav link | `HeaderNav-changelogLink` |
| "Admin" nav link | `HeaderNav-adminLink` |
| Search bar container | `HeaderNav-searchContainer` |
| Right user area | `HeaderNav-userArea` |

---

### `components/layout/UserMenu.tsx` — `UserMenu`

| Element | Debug class |
|---|---|
| Outer position anchor div | `UserMenu-root` |
| Authenticated toggle button | `UserMenu-toggleBtn` |
| User display name span | `UserMenu-displayName` |
| Groups badge pill span | `UserMenu-groupsBadge` |
| Chevron icon | `UserMenu-chevron` |
| Guest login link wrapper | `UserMenu-loginLink` |
| Guest "Login" button | `UserMenu-loginBtn` |
| Dropdown panel | `UserMenu-dropdown` |
| Dropdown header | `UserMenu-dropdownHeader` |
| User name in dropdown | `UserMenu-dropdownName` |
| Groups list in dropdown | `UserMenu-dropdownGroups` |
| "Logout" button | `UserMenu-logoutBtn` |

---

### `components/search/SearchBar.tsx` — `SearchBar`

| Element | Debug class |
|---|---|
| Outer wrapper div | `SearchBar-root` |
| Input + icon container | `SearchBar-inputWrapper` |
| Search text input | `SearchBar-input` |
| Search icon overlay | `SearchBar-searchIcon` |
| Loading spinner overlay | `SearchBar-spinner` |
| Results dropdown panel | `SearchBar-results` |
| Error state row | `SearchBar-errorRow` |
| Individual result item | `SearchBar-resultItem` |
| Result page title | `SearchBar-resultTitle` |
| Result path/context | `SearchBar-resultPath` |
| "No results" message | `SearchBar-emptyState` |

---

### `components/search/LinkSearchModal.tsx` — `LinkSearchModal`

| Element | Debug class |
|---|---|
| Full-screen backdrop | `LinkSearchModal-overlay` |
| Modal card | `LinkSearchModal-card` |
| Modal header area | `LinkSearchModal-header` |
| Header row | `LinkSearchModal-headerRow` |
| Modal title | `LinkSearchModal-title` |
| Close button | `LinkSearchModal-closeBtn` |
| Search input section | `LinkSearchModal-searchSection` |
| Input + icon container | `LinkSearchModal-inputWrapper` |
| Search query input | `LinkSearchModal-input` |
| Search icon overlay | `LinkSearchModal-searchIcon` |
| Loading spinner | `LinkSearchModal-spinner` |
| Results scrollable area | `LinkSearchModal-resultsList` |
| Error state | `LinkSearchModal-errorRow` |
| Results list container | `LinkSearchModal-resultsContainer` |
| "Recent Pages" section label | `LinkSearchModal-recentLabel` |
| Individual result row | `LinkSearchModal-resultItem` |
| Result page title | `LinkSearchModal-resultTitle` |
| Result path context | `LinkSearchModal-resultPath` |
| Empty / start-typing state | `LinkSearchModal-emptyState` |
| Modal footer | `LinkSearchModal-footer` |
| Keyboard hint area | `LinkSearchModal-keyboardHints` |
| Result count span | `LinkSearchModal-resultCount` |

---

### `components/editor/PageEditor.tsx` — `PageEditor`

#### Main layout

| Element | Debug class |
|---|---|
| Top-level layout wrapper | `PageEditor-root` |
| Shutdown save banner | `PageEditor-shutdownBanner` |
| Mobile sidebar overlay | `PageEditor-mobileOverlay` |

#### Left sidebar

| Element | Debug class |
|---|---|
| Settings sidebar panel | `PageEditor-sidebar` |
| Mobile close button | `PageEditor-sidebarCloseBtn` |
| Path field wrapper | `PageEditor-pathSection` |
| Path input (`PathAutocomplete`) | `PageEditor-pathInput` |
| Path validation error | `PageEditor-pathError` |
| Title field wrapper | `PageEditor-titleSection` |
| Title input | `PageEditor-titleInput` |
| Path+title uniqueness error | `PageEditor-titleError` |
| Change summary field wrapper | `PageEditor-changeSummarySection` |
| Change summary input | `PageEditor-changeSummaryInput` |
| "Who can edit?" section | `PageEditor-editGroupsSection` |
| Edit groups search input | `PageEditor-editGroupsSearch` |
| Edit group tag pills container | `PageEditor-editGroupsTags` |
| Individual edit group tag | `PageEditor-editGroupTag` |
| Edit group tag remove button | `PageEditor-editGroupTagRemoveBtn` |
| Available edit groups buttons container | `PageEditor-editGroupsAvailable` |
| Individual available edit group button | `PageEditor-editGroupAddBtn` |
| "Who can see?" section | `PageEditor-viewGroupsSection` |
| View groups search input | `PageEditor-viewGroupsSearch` |
| View group tag pills container | `PageEditor-viewGroupsTags` |
| Individual view group tag | `PageEditor-viewGroupTag` |
| View group tag remove button | `PageEditor-viewGroupTagRemoveBtn` |
| Available view groups buttons container | `PageEditor-viewGroupsAvailable` |
| Individual available view group button | `PageEditor-viewGroupAddBtn` |
| Edit lock badge area | `PageEditor-lockBadge` |
| Lock short ID span | `PageEditor-lockId` |
| Action buttons container | `PageEditor-actions` |
| Primary save / create button | `PageEditor-saveBtn` |
| "Save Draft Now" button | `PageEditor-saveDraftBtn` |
| "Delete Draft" button | `PageEditor-deleteDraftBtn` |
| "Cancel" button | `PageEditor-cancelBtn` |
| Autosave status message | `PageEditor-autosaveStatus` |
| Validation error message | `PageEditor-validationError` |
| Save/network error message | `PageEditor-saveError` |
| "Delete Page" button | `PageEditor-deletePageBtn` |

#### Delete page modal

| Element | Debug class |
|---|---|
| Modal overlay | `PageEditorDeleteModal-overlay` |
| Modal card | `PageEditorDeleteModal-card` |
| "Are you sure?" heading | `PageEditorDeleteModal-heading` |
| Button row | `PageEditorDeleteModal-actions` |
| "Yes, Delete" button | `PageEditorDeleteModal-confirmBtn` |
| "Cancel" button | `PageEditorDeleteModal-cancelBtn` |

#### Delete draft modal

| Element | Debug class |
|---|---|
| Modal overlay | `PageEditorDeleteDraftModal-overlay` |
| Modal card | `PageEditorDeleteDraftModal-card` |
| "Delete draft?" heading | `PageEditorDeleteDraftModal-heading` |
| Explanation paragraph | `PageEditorDeleteDraftModal-message` |
| Button row | `PageEditorDeleteDraftModal-actions` |
| "Yes, Delete Draft" button | `PageEditorDeleteDraftModal-confirmBtn` |
| "Cancel" button | `PageEditorDeleteDraftModal-cancelBtn` |

#### Right editor area

| Element | Debug class |
|---|---|
| Main editor area container | `PageEditor-editorArea` |
| Mobile sidebar open button | `PageEditor-sidebarOpenBtn` |
| Editor scroll container (`<main>`) | `PageEditor-editorMain` |
| TipTap inner wrapper | `PageEditor-editorInner` |

---

### `components/editor/TiptapEditor.tsx` — `TiptapEditor`

| Element | Debug class |
|---|---|
| Root editor container | `TiptapEditor-root` |
| Toolbar `<nav>` | `TiptapEditor-toolbar` |
| Block type dropdown | `TiptapEditor-blockTypeSelect` |
| Bold button | `TiptapEditor-boldBtn` |
| Italic button | `TiptapEditor-italicBtn` |
| Strikethrough button | `TiptapEditor-strikeBtn` |
| Underline button | `TiptapEditor-underlineBtn` |
| Font family dropdown | `TiptapEditor-fontFamilySelect` |
| Font size dropdown | `TiptapEditor-fontSizeSelect` |
| Font weight dropdown | `TiptapEditor-fontWeightSelect` |
| Text alignment dropdown | `TiptapEditor-alignSelect` |
| Bullet list button | `TiptapEditor-bulletListBtn` |
| Ordered list button | `TiptapEditor-orderedListBtn` |
| Horizontal rule button | `TiptapEditor-hrBtn` |
| Media upload button | `TiptapEditor-mediaBtn` |
| Hidden file input | `TiptapEditor-fileInput` |
| Link URL button | `TiptapEditor-linkBtn` |
| Link page button | `TiptapEditor-linkPageBtn` |
| Unlink button | `TiptapEditor-unlinkBtn` |
| Insert Mermaid button | `TiptapEditor-mermaidBtn` |
| Insert Draw.io button | `TiptapEditor-drawioBtn` |
| Table controls group | `TiptapEditor-tableControls` |
| Insert table button | `TiptapEditor-tableInsertBtn` |
| Add column before button | `TiptapEditor-tableAddColBeforeBtn` |
| Add column after button | `TiptapEditor-tableAddColAfterBtn` |
| Delete column button | `TiptapEditor-tableDeleteColBtn` |
| Add row before button | `TiptapEditor-tableAddRowBeforeBtn` |
| Add row after button | `TiptapEditor-tableAddRowAfterBtn` |
| Delete row button | `TiptapEditor-tableDeleteRowBtn` |
| Toggle header button | `TiptapEditor-tableToggleHeaderBtn` |
| Delete table button | `TiptapEditor-tableDeleteBtn` |
| Embed resize/wrap controls | `TiptapEditor-embedControls` |
| Width slider label+input | `TiptapEditor-embedWidthSlider` |
| Width numeric input | `TiptapEditor-embedWidthInput` |
| Wrap select | `TiptapEditor-embedWrapSelect` |
| Editor content offset wrapper | `TiptapEditor-editorOffset` |
| ProseMirror editor content area | `TiptapEditor-editor` |

#### Link modal (inside TiptapEditor)

| Element | Debug class |
|---|---|
| Modal overlay | `TiptapEditorLinkModal-overlay` |
| Modal card | `TiptapEditorLinkModal-card` |
| Modal title heading | `TiptapEditorLinkModal-title` |
| URL input | `TiptapEditorLinkModal-urlInput` |
| Link text input | `TiptapEditorLinkModal-textInput` |
| Link text hint | `TiptapEditorLinkModal-textHint` |
| Apply button | `TiptapEditorLinkModal-applyBtn` |
| Cancel button | `TiptapEditorLinkModal-cancelBtn` |

---

### `components/editor/EditLockWarning.tsx` — `EditLockWarning`

| Element | Debug class |
|---|---|
| Full-screen modal backdrop | `EditLockWarning-overlay` |
| Warning modal card | `EditLockWarning-card` |
| "Page Is Being Edited" heading | `EditLockWarning-heading` |
| Explanation paragraph | `EditLockWarning-message` |
| Lock list scroll container | `EditLockWarning-lockList` |
| "All locks cleared" message | `EditLockWarning-clearedMsg` |
| Individual lock row | `EditLockWarning-lockRow` |
| Lock short ID badge | `EditLockWarning-lockId` |
| Lock username | `EditLockWarning-lockUser` |
| Lock timestamp | `EditLockWarning-lockTime` |
| "Force Clear" button | `EditLockWarning-forceClearBtn` |
| Error message | `EditLockWarning-errorMsg` |
| Action button row | `EditLockWarning-actions` |
| "Go Back" button | `EditLockWarning-goBackBtn` |
| "Continue Editing" button | `EditLockWarning-continueBtn` |

---

### `components/editor/DrawioView.tsx` — `DrawioView`

| Element | Debug class |
|---|---|
| Outer node wrapper | `DrawioView-root` |
| Control buttons overlay | `DrawioView-controls` |
| "Edit" button | `DrawioView-editBtn` |
| "Delete" button | `DrawioView-deleteBtn` |
| Loading state div | `DrawioView-loading` |
| Error state div | `DrawioView-error` |
| SVG preview area | `DrawioView-preview` |
| Empty state div | `DrawioView-emptyState` |

---

### `components/editor/DrawioEditorDialog.tsx` — `DrawioEditorDialog`

| Element | Debug class |
|---|---|
| Full-screen backdrop | `DrawioEditorDialog-overlay` |
| Header bar | `DrawioEditorDialog-header` |
| "Edit Diagram" heading | `DrawioEditorDialog-heading` |
| Header button group | `DrawioEditorDialog-headerActions` |
| "Save" button | `DrawioEditorDialog-saveBtn` |
| "Cancel" button | `DrawioEditorDialog-cancelBtn` |
| Draw.io editor iframe | `DrawioEditorDialog-iframe` |

---

### `components/editor/MermaidExtension.tsx` — `MermaidNodeView` (editing state)

| Element | Debug class |
|---|---|
| Edit mode card div | `MermaidEditor-root` |
| Code label | `MermaidEditor-label` |
| Code textarea | `MermaidEditor-textarea` |
| Button row | `MermaidEditor-actions` |
| "Save" button | `MermaidEditor-saveBtn` |
| "Cancel" button | `MermaidEditor-cancelBtn` |
| Error message area | `MermaidEditor-error` |

### `MermaidNodeView` (view state)

| Element | Debug class |
|---|---|
| Diagram preview container | `MermaidNode-preview` |
| Rendered SVG div | `MermaidNode-svg` |
| Error state div | `MermaidNode-error` |
| Rendering placeholder | `MermaidNode-loading` |
| Empty "click to add" placeholder | `MermaidNode-emptyState` |

---

### `components/editor/MermaidView.tsx` — `MermaidView`

| Element | Debug class |
|---|---|
| Loading state wrapper | `MermaidView-loading` |
| "Rendering…" text | `MermaidView-loadingText` |
| Error state wrapper | `MermaidView-error` |
| Error title | `MermaidView-errorTitle` |
| Error message | `MermaidView-errorMessage` |
| Success state wrapper | `MermaidView-root` |
| Rendered SVG div | `MermaidView-svg` |

---

### `components/editor/EmbedDragHandle.tsx` — `EmbedDragHandle`

| Element | Debug class |
|---|---|
| Drag grab handle div | `EmbedDragHandle-root` |
| Label span (optional) | `EmbedDragHandle-label` |

---

### `components/editor/RestrictedBlockEditorView.tsx` — `RestrictedBlockEditorView`

| Element | Debug class |
|---|---|
| Block wrapper | `RestrictedBlockEditor-root` |
| Header row | `RestrictedBlockEditor-header` |
| Title input | `RestrictedBlockEditor-titleInput` |
| Header controls area | `RestrictedBlockEditor-headerControls` |
| Groups editing panel | `RestrictedBlockEditor-groupsPanel` |
| View groups section | `RestrictedBlockEditor-viewGroupsSection` |
| View group checkbox row | `RestrictedBlockEditor-viewGroupRow` |
| Edit groups section | `RestrictedBlockEditor-editGroupsSection` |
| Edit group checkbox row | `RestrictedBlockEditor-editGroupRow` |
| "Save" groups button | `RestrictedBlockEditor-saveGroupsBtn` |
| Groups summary div | `RestrictedBlockEditor-groupsSummary` |
| "Edit Groups" toggle button | `RestrictedBlockEditor-editGroupsBtn` |
| "Remove restriction" button | `RestrictedBlockEditor-removeBtn` |
| Editable content area | `RestrictedBlockEditor-content` |

---

### `components/editor/RestrictedBlockView.tsx` — `RestrictedBlockView`

| Element | Debug class |
|---|---|
| Block wrapper | `RestrictedBlockView-root` |
| Title label | `RestrictedBlockView-title` |
| "Reveal" / "Hide" button | `RestrictedBlockView-revealBtn` |
| Content container | `RestrictedBlockView-content` |
| No-access placeholder | `RestrictedBlockView-noAccess` |

---

### `components/editor/RestrictedBlockPlaceholderView.tsx` — `RestrictedBlockPlaceholderView`

| Element | Debug class |
|---|---|
| Block wrapper | `RestrictedBlockPlaceholder-root` |
| Title div | `RestrictedBlockPlaceholder-title` |
| No-access message | `RestrictedBlockPlaceholder-noAccess` |
| Required groups hint | `RestrictedBlockPlaceholder-groupsHint` |
| "PLACEHOLDER" indicator | `RestrictedBlockPlaceholder-indicator` |

---

### `components/ui/PathAutocomplete.tsx` — `PathAutocomplete`

| Element | Debug class |
|---|---|
| Outer wrapper div | `PathAutocomplete-root` |
| Path text input | `PathAutocomplete-input` |
| Suggestions dropdown panel | `PathAutocomplete-dropdown` |
| Individual suggestion row | `PathAutocomplete-suggestionItem` |
| Suggestion path text | `PathAutocomplete-suggestionPath` |
| Suggestion page title | `PathAutocomplete-suggestionTitle` |

---

### `components/admin/SiteSettings.tsx` — `SiteSettingsPage`

| Element | Debug class |
|---|---|
| Loading state card | `SiteSettings-loading` |
| Main settings card | `SiteSettings-root` |
| "Site Settings" heading | `SiteSettings-heading` |
| Error banner | `SiteSettings-errorBanner` |
| Success banner | `SiteSettings-successBanner` |
| Settings fields container | `SiteSettings-fields` |
| Default page section | `SiteSettings-defaultPageSection` |
| Default page label | `SiteSettings-defaultPageLabel` |
| Default page dropdown | `SiteSettings-defaultPageSelect` |
| Action buttons row | `SiteSettings-actions` |
| "Save Settings" button | `SiteSettings-saveBtn` |
| "Clear Default Page" button | `SiteSettings-clearBtn` |

---

### `features/pages/PageList.tsx` — `PageList` + `TreeNodeComponent`

#### `TreeNodeComponent`

| Element | Debug class |
|---|---|
| List item `<li>` | `TreeNode-item` |
| Clickable row div | `TreeNode-row` |
| Icon span | `TreeNode-icon` |
| Name span | `TreeNode-name` |

#### `PageList`

| Element | Debug class |
|---|---|
| Sidebar `<aside>` | `PageList-root` |
| Header row | `PageList-header` |
| "Pages" heading | `PageList-heading` |
| "+ New" button | `PageList-newPageBtn` |
| Mobile close button | `PageList-closeBtn` |
| Tree nodes `<ul>` | `PageList-tree` |

---

### `features/pages/PagesView.tsx` — `PagesView`

| Element | Debug class |
|---|---|
| Full layout wrapper | `PagesView-root` |
| Mobile sidebar overlay | `PagesView-mobileOverlay` |
| Sidebar slide container | `PagesView-sidebarContainer` |
| Main content area | `PagesView-main` |
| Mobile hamburger open button | `PagesView-sidebarOpenBtn` |
| Content inner container | `PagesView-content` |
| Loading text | `PagesView-loadingText` |
| Error text | `PagesView-errorText` |
| Page content card (prose wrapper) | `PagesView-proseBox` |
| Page header row | `PagesView-pageHeader` |
| Left header content | `PagesView-pageHeaderLeft` |
| Path breadcrumb | `PagesView-pagePath` |
| Page title | `PagesView-pageTitle` |
| Draft available indicator | `PagesView-draftBanner` |
| Header actions (right side) | `PagesView-pageHeaderActions` |
| "View History" / "Hide History" button | `PagesView-historyBtn` |
| "Edit" button | `PagesView-editBtn` |
| Version history panel | `PagesView-versionHistory` |
| Page content area | `PagesView-pageContent` |
| "No content" fallback | `PagesView-noContent` |
| Page footer metadata | `PagesView-pageFooter` |
| No-access wrapper | `PagesView-noAccess` |
| No-access card | `PagesView-noAccessCard` |
| "No Access" heading | `PagesView-noAccessHeading` |
| Permission denied message | `PagesView-noAccessMessage` |

---

### `features/pages/VersionHistory.tsx` — `VersionHistory`

| Element | Debug class |
|---|---|
| Loading state card | `VersionHistory-loading` |
| Error state card | `VersionHistory-error` |
| Main panel card | `VersionHistory-root` |
| Panel header row | `VersionHistory-header` |
| "Version History" heading | `VersionHistory-heading` |
| Close button | `VersionHistory-closeBtn` |
| "No versions" empty state | `VersionHistory-emptyState` |
| Scrollable versions list | `VersionHistory-list` |
| Version row card | `VersionHistory-versionRow` |
| Version label span | `VersionHistory-versionLabel` |
| DRAFT badge | `VersionHistory-draftBadge` |
| Version metadata | `VersionHistory-versionMeta` |
| Content hash span | `VersionHistory-hash` |
| Change summary text | `VersionHistory-summary` |
| "View" button | `VersionHistory-viewBtn` |
| Preview panel | `VersionHistory-preview` |
| Preview header | `VersionHistory-previewHeader` |
| Preview heading | `VersionHistory-previewHeading` |
| Hash display | `VersionHistory-previewHash` |
| Close preview button | `VersionHistory-previewCloseBtn` |
| Preview scroll area | `VersionHistory-previewScroll` |
| Rendered preview content | `VersionHistory-previewContent` |

---

### `features/backup/BackupSettingsPage.tsx` — `BackupSettingsPage`

| Element | Debug class |
|---|---|
| Loading text | `BackupSettings-loadingText` |
| Main wrapper | `BackupSettings-root` |
| Status banner | `BackupSettings-statusBanner` |
| Git config card | `BackupSettings-configCard` |
| "Git Backup Configuration" heading | `BackupSettings-configHeading` |
| Git repo URL input | `BackupSettings-repoUrlInput` |
| SSH key path input | `BackupSettings-sshKeyInput` |
| Backup path input | `BackupSettings-backupPathInput` |
| Branch name input | `BackupSettings-branchInput` |
| Enable backups checkbox | `BackupSettings-enabledCheckbox` |
| Config actions row | `BackupSettings-configActions` |
| "Save Settings" button | `BackupSettings-saveBtn` |
| "Trigger Manual Backup" button | `BackupSettings-triggerBtn` |
| "Test Connection" button | `BackupSettings-testBtn` |
| "Smart Import" button | `BackupSettings-importBtn` |
| Jobs history card | `BackupSettings-jobsCard` |
| "Recent Backup Jobs" heading | `BackupSettings-jobsHeading` |
| "Refresh" button | `BackupSettings-refreshBtn` |
| "No jobs found" empty state | `BackupSettings-jobsEmpty` |
| Jobs table container | `BackupSettings-jobsTable` |
| Job row | `BackupSettings-jobRow` |
| Job status cell | `BackupSettings-jobStatus` |
| Job type badge | `BackupSettings-jobTypeBadge` |
| Setup instructions card | `BackupSettings-instructionsCard` |
| "Setup Instructions" heading | `BackupSettings-instructionsHeading` |
| Instructions content | `BackupSettings-instructions` |

---

## Implementation notes for the implementing agent

1. **Add the debug class as the first class** in every `className` string, before any Tailwind utilities.
2. When a `className` is built dynamically (e.g. with template literals or ternaries), prepend the debug class as a static string: `` className={`PageEditor-sidebar fixed lg:fixed ${sidebarOpen ? '...' : '...'}`} ``
3. When `styleTokens.*` values are used, the debug class still goes on the JSX element, not inside `styleTokens`.
4. Do **not** modify any styling. This is purely additive.
5. Do **not** add debug classes to invisible DOM nodes: context providers, `<>` fragments, SVG child elements (`<path>`, `<circle>`, etc.).
6. Do **not** add debug classes inside `.module.css` or `globals.css`.
7. After implementation, verify in browser devtools that the class names appear correctly on the intended elements.
