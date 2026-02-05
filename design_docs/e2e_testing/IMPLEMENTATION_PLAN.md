# E2E Testing Implementation Plan

## Overview

This document outlines the plan for implementing End-to-End (E2E) testing for RPG Wiki using Gherkin syntax (BDD - Behavior Driven Development).

**RPG Wiki** is a wiki-like information system for tabletop RPGs with a focus on **granular access control**. The core differentiator is the ability to have **restricted content blocks** within pages - allowing Game Masters to keep secret notes inline with public content, visible only to specific player groups.

---

## Product Understanding

### Core Concepts

1. **Pages** - Wiki pages with title, content (HTML/TipTap), path, and access controls
2. **Restricted Blocks** - Inline content blocks within pages that have their own access controls:
   - `usergroups` - Groups that can VIEW the content
   - `editgroups` - Groups that can EDIT the content
   - Content is filtered **server-side** - unauthorized users never receive the data
3. **Groups** - Permission groups that users belong to (e.g., "DM", "Players", "Party-A")
4. **Users** - Authenticated via Keycloak or password, assigned to groups
5. **Versions/History** - Every edit creates a new version; drafts vs published content

### Special Groups

| Group | Description |
|-------|-------------|
| `admin` | **Super-access group** - members can see ALL pages and ALL restricted blocks regardless of other permissions |
| `public` | **Universal group** - automatically assigned to ALL users, including unauthenticated guests. Used for truly public content |

### Key Security Properties

- Restricted block content **never leaves the server** for unauthorized users
- Users with page edit rights but without block edit rights see **placeholders** (not content)
- Server-side filtering via `server-content-filter.ts` ensures security
- Unauthenticated guests have `public` group, so they CAN view public pages and `public` restricted blocks

---

## Personas

### 🎭 Game Master (GM) - "Diana"
- **Role**: Campaign creator and administrator
- **Groups**: `admin`, `gm`, `players`, `public`
- **Capabilities**: 
  - Full access to ALL pages and ALL restricted blocks (via `admin` group)
  - Can create/edit/delete any content
  - Manages user groups
  - Views admin panel
- **Typical Tasks**:
  - Creates world-building pages with hidden GM notes
  - Writes NPC pages with secret motivations in restricted blocks
  - Prepares session notes with player-specific hints

### 🗡️ Player - "Alex"
- **Role**: Regular campaign participant  
- **Groups**: `players`, `party-alpha`, `public`
- **Capabilities**:
  - Can view pages allowed for their groups + public pages
  - Can see restricted blocks marked for `players`, `party-alpha`, or `public`
  - Can edit pages if granted edit permission
  - Cannot see GM-only or admin-only restricted blocks
- **Typical Tasks**:
  - Reads campaign lore
  - Views character sheets (public parts)
  - Takes session notes on editable pages

### 👁️ Observer - "Sam"
- **Role**: Limited access viewer (e.g., prospective player, archived member)
- **Groups**: `observers`, `public`
- **Capabilities**:
  - Can view public pages and observer-allowed pages
  - Can see restricted blocks marked for `observers` or `public`
  - Cannot edit anything
- **Typical Tasks**:
  - Browses public world information
  - Reads campaign overview

### 🚪 Guest (Unauthenticated) - "Unknown"
- **Role**: Not logged in
- **Groups**: `public` (implicit)
- **Capabilities**:
  - Can view pages with `view_groups` including `public`
  - Can see restricted blocks marked for `public`
  - Cannot edit anything
  - Cannot see any non-public content
- **Typical Tasks**:
  - Browses publicly available world lore
  - Views campaign landing page
  - Logs in to gain additional access

---

## High-Level User Journeys

### Journey 1: GM Creates Page with Restricted Content
```
Diana (GM) logs in
  → Creates new page "Ancient Dragon Lair"
  → Writes public description visible to all players
  → Adds restricted block [usergroups: gm] with "Dragon is actually friendly"
  → Adds restricted block [usergroups: party-alpha] with "Party-Alpha has map fragment"
  → Publishes page
  → Verifies: Alex (player) sees public content + party-alpha block
  → Verifies: Sam (observer) sees only public content
  → Verifies: Diana sees everything
```

### Journey 2: Player Views Page with Mixed Access
```
Alex (player) logs in
  → Navigates to "Ancient Dragon Lair"
  → Sees public page content ✓
  → Sees "Reveal" button on party-alpha restricted block ✓
  → Clicks reveal, sees secret content ✓
  → Does NOT see GM-only restricted block (not even placeholder) ✓
```

### Journey 3: Player with Edit Rights but Limited Block Access
```
Alex has page edit rights to "Session Notes"
  → Opens page for editing
  → Sees public content in editor ✓
  → Sees placeholder for GM-restricted block (cannot edit) ✓
  → Edits public content
  → Saves - GM block preserved unchanged ✓
```

### Journey 4: Guest Views Public Content
```
Guest (not logged in) opens wiki URL
  → Can see pages with view_groups including "public"
  → Can see restricted blocks with usergroups including "public"
  → Cannot see pages restricted to specific groups
  → Cannot see non-public restricted blocks
  → Sees "Login" button to gain additional access
```

### Journey 5: Admin Sees Everything
```
Diana (admin) logs in
  → Navigates to any page (even if not in view_groups)
  → Sees ALL restricted blocks regardless of usergroups
  → Admin group overrides all permission checks
```

---

## Framework Decision: Playwright + playwright-bdd

**Recommendation: Playwright with playwright-bdd**

### Rationale

| Criteria | Playwright | Cypress |
|----------|------------|---------|
| Speed | ✅ Faster, true parallelization | ❌ Slower, limited parallelization |
| Browser Support | ✅ Chromium, Firefox, WebKit native | ⚠️ Firefox/WebKit experimental |
| TypeScript | ✅ First-class support | ✅ Good support |
| Gherkin Integration | ✅ playwright-bdd (active, well-maintained) | ⚠️ cypress-cucumber-preprocessor (maintenance concerns) |
| Async/Await | ✅ Native async | ❌ Custom chaining |
| Network Interception | ✅ Powerful API mocking | ✅ Good |
| Multi-tab/Multi-browser | ✅ Supported | ❌ Not supported |

### Key Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "playwright-bdd": "^6.0.0",
    "@faker-js/faker": "^8.3.0"
  }
}
```

---

## Directory Structure

```
e2e/
├── features/                    # Gherkin feature files
│   ├── auth/
│   │   ├── login.feature
│   │   ├── logout.feature
│   │   └── guest-access.feature
│   ├── pages/
│   │   ├── create-page.feature
│   │   ├── edit-page.feature
│   │   ├── view-page.feature
│   │   └── delete-page.feature
│   ├── restricted-blocks/           # HIGH PRIORITY - Core feature
│   │   ├── create-restricted-block.feature
│   │   ├── view-restricted-block.feature
│   │   ├── edit-restricted-block.feature
│   │   └── restricted-block-permissions.feature
│   ├── editor/
│   │   ├── basic-editing.feature
│   │   └── formatting.feature
│   ├── search/
│   │   └── search.feature
│   ├── groups/
│   │   ├── manage-groups.feature
│   │   └── user-group-assignment.feature
│   └── admin/
│       └── settings.feature
├── steps/                       # Step definitions
│   ├── common.steps.ts          # Shared steps (Given I am logged in as...)
│   ├── auth.steps.ts
│   ├── pages.steps.ts
│   ├── restricted-blocks.steps.ts   # Critical feature steps
│   ├── editor.steps.ts
│   ├── search.steps.ts
│   ├── groups.steps.ts
│   └── admin.steps.ts
├── fixtures/                    # Test fixtures and page objects
│   ├── test-base.ts            # Extended test with personas
│   ├── personas.ts             # Pre-configured user personas
│   ├── pages/                  # Page Object Models
│   │   ├── login.page.ts
│   │   ├── wiki-page.page.ts
│   │   ├── editor.page.ts
│   │   ├── restricted-block.page.ts
│   │   └── admin.page.ts
│   └── data/                   # Test data factories
│       ├── users.ts
│       ├── pages.ts
│       ├── groups.ts
│       └── restricted-blocks.ts
├── support/
│   ├── hooks.ts                # Before/After hooks
│   ├── world.ts                # Shared test context
│   └── db/
│       ├── seed.ts             # Database seeding logic
│       ├── reset.ts            # Database reset logic
│       ├── prisma-helpers.ts   # Prisma test utilities
│       └── test-data.ts        # Seed data definitions
├── playwright.config.ts        # Playwright configuration
└── .features-gen/              # Auto-generated test files (gitignore)
```

---

## Test Database Strategy

### Approach: Transaction-Based Test Isolation

Each test runs within a database transaction that is rolled back after the test completes. This provides:
- ✅ Fast test execution (no full reset between tests)
- ✅ Complete isolation between tests
- ✅ Known state at the start of each test

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Before Suite   │────▶│  Reset Database  │────▶│  Seed Base Data │
│  (once)         │     │  (clean slate)   │     │  (personas)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
         ┌────────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Each Test:                                                     │
│  1. Begin Transaction                                           │
│  2. Create test-specific data (pages, restricted blocks)        │
│  3. Run test                                                    │
│  4. Rollback Transaction                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

1. **Docker Compose for Test Database**
   ```yaml
   # docker-compose.test.yml
   services:
     test-db:
       image: postgres:15
       environment:
         POSTGRES_DB: rpg_wiki_test
         POSTGRES_USER: test
         POSTGRES_PASSWORD: test
       ports:
         - "5433:5432"
   ```

2. **Base Seed Data (created once per test run)**
   - Persona users (Diana/GM, Alex/Player, Sam/Observer)
   - Groups:
     - `admin` - special super-access group
     - `public` - special universal group (all users have this)
     - `gm` - game master group
     - `players` - all players
     - `party-alpha` - specific party
     - `observers` - view-only users
   - User-group assignments (all users get `public` automatically)

3. **Per-Test Data (created within transaction)**
   - Test-specific pages
   - Restricted blocks with various permission configurations

---

## Personas Implementation

```typescript
// e2e/fixtures/personas.ts

export interface Persona {
  name: string;
  email: string;
  password: string;
  groups: string[];
  storageStatePath: string;
}

export const PERSONAS = {
  // Game Master - full access via admin group
  diana: {
    name: 'Diana',
    email: 'diana@test.local',
    password: 'TestDiana123!',
    groups: ['admin', 'gm', 'players', 'public'], // admin = sees everything
    storageStatePath: 'e2e/.auth/diana.json'
  },
  
  // Regular player - limited access  
  alex: {
    name: 'Alex',
    email: 'alex@test.local', 
    password: 'TestAlex123!',
    groups: ['players', 'party-alpha', 'public'], // public = universal group
    storageStatePath: 'e2e/.auth/alex.json'
  },
  
  // Observer - view-only access
  sam: {
    name: 'Sam',
    email: 'sam@test.local',
    password: 'TestSam123!',
    groups: ['observers', 'public'], // public = universal group
    storageStatePath: 'e2e/.auth/sam.json'
  }
} as const;

// Guest (unauthenticated) implicitly has: ['public']

export type PersonaName = keyof typeof PERSONAS;
```

### Gherkin Usage with Personas

```gherkin
Given I am logged in as "Diana" the Game Master
Given I am logged in as "Alex" the Player
Given I am logged in as "Sam" the Observer
Given I am not logged in
```

---

## Authentication Strategy

### Pre-authenticated Personas

All persona users are authenticated once during global setup, with storage state saved:

```typescript
// e2e/support/global-setup.ts
async function globalSetup() {
  // 1. Reset and seed database with personas
  await resetDatabase();
  await seedPersonas();
  
  // 2. Authenticate each persona and save state
  for (const [name, persona] of Object.entries(PERSONAS)) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('/login');
    await page.fill('[name="email"]', persona.email);
    await page.fill('[name="password"]', persona.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.context().storageState({ path: persona.storageStatePath });
    await browser.close();
  }
}
```

### Test Fixture with Persona Support

```typescript
// e2e/fixtures/test-base.ts
import { test as base, Page } from '@playwright/test';
import { PERSONAS, PersonaName } from './personas';

type PersonaFixtures = {
  asGM: Page;      // Diana - full access
  asPlayer: Page;  // Alex - player access
  asObserver: Page; // Sam - view only
  asGuest: Page;   // Not authenticated
};

export const test = base.extend<PersonaFixtures>({
  asGM: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: PERSONAS.diana.storageStatePath
    });
    await use(await context.newPage());
    await context.close();
  },
  
  asPlayer: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: PERSONAS.alex.storageStatePath
    });
    await use(await context.newPage());
    await context.close();
  },
  
  asObserver: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: PERSONAS.sam.storageStatePath
    });
    await use(await context.newPage());
    await context.close();
  },
  
  asGuest: async ({ browser }, use) => {
    const context = await browser.newContext(); // No storage state
    await use(await context.newPage());
    await context.close();
  },
});
```

---

## Feature Priority & Phases

### Phase 1: Core Acceptance Tests (MVP)

High-level smoke tests ensuring the most critical functionality works from a user perspective.

#### 1.1 Authentication (Basic)
```gherkin
Feature: User Authentication

  Scenario: User can log in with valid credentials
    Given I am on the login page
    When I enter valid credentials for "Diana"
    And I click the login button
    Then I should be redirected to the home page
    And I should see "Diana" in the header

  Scenario: User can log out
    Given I am logged in as "Diana" the Game Master
    When I click the logout button
    Then I should be redirected to the login page

  Scenario: Guest can view public pages
    Given I am not logged in
    And a public page "Welcome" exists with view_groups ["public"]
    When I navigate to the "Welcome" page
    Then I should see the page content
    And I should see a login button

  Scenario: Guest cannot view restricted pages
    Given I am not logged in
    And a page "Secret Base" exists with view_groups ["gm"]
    When I try to access the "Secret Base" page
    Then I should see an access denied message
    And I should see a login prompt
```

#### 1.2 Wiki Pages - CRUD
```gherkin
Feature: Wiki Page Management

  Scenario: GM creates a new wiki page
    Given I am logged in as "Diana" the Game Master
    And I am on the create page form
    When I enter "Dragon Lair" as the title
    And I enter "A dark cave in the mountains" in the editor
    And I click the save button
    Then I should see the page with title "Dragon Lair"
    And I should see "A dark cave in the mountains" in the content

  Scenario: Player can view a page they have access to
    Given I am logged in as "Alex" the Player
    And a page exists with title "Public Tavern"
    When I navigate to that page
    Then I should see the page title "Public Tavern"

  Scenario: GM can edit an existing page
    Given I am logged in as "Diana" the Game Master
    And a page exists with title "Old Castle"
    When I open the page for editing
    And I change the content to "The castle is now ruins"
    And I click the save button
    Then I should see "The castle is now ruins" in the content

  Scenario: GM can delete a page
    Given I am logged in as "Diana" the Game Master
    And a page exists with title "Temporary Page"
    When I delete the page
    And I confirm the deletion
    Then the page should no longer exist
```

#### 1.3 🎯 RESTRICTED BLOCKS - Critical Feature
```gherkin
Feature: Restricted Block - Creation

  Background:
    Given the following groups exist: "gm", "players", "party-alpha"

  Scenario: GM creates a page with a restricted block
    Given I am logged in as "Diana" the Game Master
    And I am editing a new page
    When I add a restricted block with:
      | title      | GM Secret           |
      | usergroups | ["gm"]              |
      | content    | The dragon is tame  |
    And I add public content "The dragon appears fierce"
    And I save the page
    Then the page should be saved successfully

Feature: Restricted Block - Viewing Permissions

  Background:
    Given a page "Dragon Info" exists with view_groups ["public"] and:
      | Public content: "A mighty dragon lives here"                    |
      | Restricted block [usergroups: gm]: "Dragon is actually friendly" |
      | Restricted block [usergroups: party-alpha]: "You have the key"  |
      | Restricted block [usergroups: public]: "Dragons exist"          |

  Scenario: Admin sees all restricted blocks (admin override)
    Given I am logged in as "Diana" the Game Master
    # Diana is in "admin" group which sees everything
    When I view the page "Dragon Info"
    Then I should see the public content "A mighty dragon lives here"
    And I should see ALL restricted blocks including:
      | GM block with "Dragon is actually friendly" |
      | Party-alpha block with "You have the key"   |
      | Public block with "Dragons exist"           |

  Scenario: Player sees their groups' restricted blocks
    Given I am logged in as "Alex" the Player
    # Alex is in "players", "party-alpha", and "public" groups
    When I view the page "Dragon Info"
    Then I should see the public content "A mighty dragon lives here"
    And I should see restricted blocks for:
      | party-alpha: "You have the key" |
      | public: "Dragons exist"         |
    And I should NOT see the GM-only restricted block
    # Critical: GM content never reaches browser

  Scenario: Observer sees public restricted blocks only
    Given I am logged in as "Sam" the Observer
    # Sam is in "observers" and "public" groups
    When I view the page "Dragon Info"
    Then I should see the public content "A mighty dragon lives here"
    And I should see the public restricted block "Dragons exist"
    And I should NOT see party-alpha or GM blocks

  Scenario: Guest sees public restricted blocks
    Given I am not logged in
    # Guest implicitly has "public" group
    When I view the page "Dragon Info"
    Then I should see the public content "A mighty dragon lives here"
    And I should see the public restricted block "Dragons exist"
    And I should NOT see any non-public restricted blocks

Feature: Restricted Block - Edit Permissions

  Background:
    Given a page "Session Notes" exists with:
      | Public content: "Session 1 recap"                              |
      | Restricted block [editgroups: gm]: "Secret plot twist"         |

  Scenario: User with page edit rights but no block edit rights sees placeholder
    Given I am logged in as "Alex" the Player
    And "Alex" has edit rights to page "Session Notes"
    When I open "Session Notes" for editing
    Then I should see the public content in the editor
    And I should see a placeholder for the restricted block
    And I should NOT see "Secret plot twist" in the editor
    
  Scenario: GM can edit the restricted block content
    Given I am logged in as "Diana" the Game Master
    When I open "Session Notes" for editing
    Then I should see the restricted block content "Secret plot twist"
    And I should be able to edit the restricted block

  Scenario: Editing page preserves restricted blocks user cannot see
    Given I am logged in as "Alex" the Player
    And "Alex" has edit rights to page "Session Notes"
    When I open "Session Notes" for editing
    And I change the public content to "Session 1 - Updated recap"
    And I save the page
    Then the public content should be updated
    And the GM restricted block should still contain "Secret plot twist"
    # Verify server preserved the block Alex couldn't see

Feature: Restricted Block - Security Verification

  Scenario: Restricted content never sent to unauthorized user
    Given a page exists with GM-only restricted content
    When I am logged in as "Alex" the Player
    And I view the page
    Then the API response should NOT contain the restricted content
    # This tests server-side filtering

  Scenario: Cannot access restricted content via direct API
    Given a page exists with GM-only restricted content
    When I make an API request as "Alex" the Player
    Then the response should not include restricted block content
```

#### 1.4 Search
```gherkin
Feature: Search

  Scenario: Search finds page by title
    Given pages exist with titles "Dragon", "Dungeon", "Town"
    When I search for "Dragon"
    Then I should see "Dragon" in search results

  Scenario: Search respects permissions
    Given a page "Secret Base" with view_groups ["gm"] exists
    When I am logged in as "Alex" the Player
    And I search for "Secret Base"
    Then I should NOT see "Secret Base" in search results
```

### Phase 2: Extended Coverage

#### 2.1 Groups Management
```gherkin
Feature: Group Management

  Scenario: Admin can create a new group
    Given I am logged in as "Diana" the Game Master
    When I navigate to group management
    And I create a group named "party-beta"
    Then the group "party-beta" should exist

  Scenario: Admin can assign user to group
    Given I am logged in as "Diana" the Game Master
    And a user "newplayer@test.local" exists
    When I add "newplayer@test.local" to group "players"
    Then the user should be a member of "players"
```

#### 2.2 Version History
```gherkin
Feature: Page Version History

  Scenario: GM can view page history
    Given a page with multiple versions exists
    When I view the page history
    Then I should see a list of versions with timestamps

  Scenario: GM can restore previous version
    Given a page with version 1 and version 2 exists
    When I restore version 1
    Then the page content should match version 1
```

#### 2.3 Editor Features
```gherkin
Feature: TipTap Editor

  Scenario: Apply bold formatting
    Given I am editing a page
    When I select text "important"
    And I click the bold button
    Then the text should be bold

  Scenario: Create heading
    Given I am editing a page
    When I type "# Chapter One" and press Enter
    Then a heading element should be created
```

### Phase 3: Edge Cases & Error Handling

- Concurrent editing conflicts
- Network failure handling
- Very large page content
- Malformed restricted block data
- Session expiry during edit

---

## Configuration

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: 'e2e/steps/**/*.ts',
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    
    // Main tests - Chromium (current focus)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    
    // Future: Firefox
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   dependencies: ['setup'],
    // },
    
    // Future: WebKit (Safari/Opera uses Chromium now, but WebKit for macOS Safari)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   dependencies: ['setup'],
    // },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

---

## NPM Scripts

```json
{
  "scripts": {
    "test:e2e": "npm run test:e2e:prepare && playwright test",
    "test:e2e:prepare": "npm run test:e2e:db:reset && npm run test:e2e:generate",
    "test:e2e:db:reset": "tsx e2e/support/db/reset.ts",
    "test:e2e:generate": "bddgen",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

## Implementation Steps

### Step 1: Setup Infrastructure (Estimated: 2-3 hours)
- [ ] Install dependencies (`@playwright/test`, `playwright-bdd`, `@faker-js/faker`)
- [ ] Create `playwright.config.ts`
- [ ] Set up directory structure (`e2e/features`, `e2e/steps`, etc.)
- [ ] Create `docker-compose.test.yml` for test database
- [ ] Add npm scripts to `package.json`
- [ ] Add `e2e/.auth/` and `e2e/.features-gen/` to `.gitignore`

### Step 2: Database & Persona Infrastructure (Estimated: 3-4 hours)
- [ ] Create `e2e/support/db/reset.ts` - database reset script
- [ ] Create `e2e/support/db/prisma-helpers.ts` - Prisma test utilities
- [ ] Create `e2e/fixtures/personas.ts` - persona definitions
- [ ] Create `e2e/support/db/seed.ts` - seed personas and groups
- [ ] Create `e2e/support/global-setup.ts` - authenticate all personas

### Step 3: Page Objects & Common Steps (Estimated: 3-4 hours)
- [ ] Create `e2e/fixtures/test-base.ts` - extended test with persona fixtures
- [ ] Create `e2e/fixtures/pages/login.page.ts`
- [ ] Create `e2e/fixtures/pages/wiki-page.page.ts`
- [ ] Create `e2e/fixtures/pages/editor.page.ts`
- [ ] Create `e2e/fixtures/pages/restricted-block.page.ts`
- [ ] Create `e2e/steps/common.steps.ts` - shared step definitions

### Step 4: Phase 1 Features - Auth & Pages (Estimated: 3-4 hours)
- [ ] Write `e2e/features/auth/login.feature` + steps
- [ ] Write `e2e/features/auth/logout.feature` + steps
- [ ] Write `e2e/features/auth/guest-access.feature` + steps
- [ ] Write `e2e/features/pages/create-page.feature` + steps
- [ ] Write `e2e/features/pages/view-page.feature` + steps
- [ ] Write `e2e/features/pages/edit-page.feature` + steps

### Step 5: Phase 1 Features - Restricted Blocks (Estimated: 5-6 hours) ⭐ PRIORITY
- [ ] Write `e2e/features/restricted-blocks/create-restricted-block.feature` + steps
- [ ] Write `e2e/features/restricted-blocks/view-restricted-block.feature` + steps
- [ ] Write `e2e/features/restricted-blocks/edit-restricted-block.feature` + steps
- [ ] Write `e2e/features/restricted-blocks/restricted-block-permissions.feature` + steps
- [ ] Add API response verification for security tests

### Step 6: Phase 1 Features - Search (Estimated: 2 hours)
- [ ] Write `e2e/features/search/search.feature` + steps

### Step 7: Documentation & Cleanup (Estimated: 1-2 hours)
- [ ] Write `e2e/README.md` with running instructions
- [ ] Verify all tests pass
- [ ] Review and refactor common patterns

**Total Estimated Time: ~20-25 hours**

---

## Running Tests

### Prerequisites
```bash
# Start test database
docker compose -f docker-compose.test.yml up -d

# Install browsers (first time only)
npx playwright install chromium
```

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Feature
```bash
npm run test:e2e -- --grep "User Authentication"
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### UI Mode (interactive)
```bash
npm run test:e2e:ui
```

---

## Future Enhancements

1. **CI/CD Integration** - GitHub Actions workflow
2. **API Testing Layer** - Separate API-level tests for faster feedback
3. **Visual Regression** - Screenshot comparison tests
4. **Performance Metrics** - Capture Core Web Vitals during E2E
5. **Accessibility Testing** - axe-core integration
6. **Multi-browser** - Enable Firefox and WebKit projects

---

## Open Questions

1. ~~Should we use database transactions for test isolation, or full reset between features?~~ → **Transactions**
2. ~~Do we need to test email notifications (if any)?~~ → **No email functionality**
3. ~~Are there specific edge cases around the TipTap editor we should prioritize?~~ → **Restricted blocks are priority**
4. Should restricted block reveal state (expanded/collapsed) persist across page loads?
5. What should happen if a user's group membership changes while they have a page open?

---

## Appendix: Permission Matrix for Restricted Blocks

This matrix shows what each persona can see/do with a restricted block:

| Scenario | Diana (admin) | Alex (Player) | Sam (Observer) | Guest |
|----------|---------------|---------------|----------------|-------|
| **Groups** | admin, gm, players, public | players, party-alpha, public | observers, public | public (implicit) |
| **View public page** | ✅ | ✅ | ✅ | ✅ |
| **View restricted page [gm]** | ✅ (admin override) | ❌ | ❌ | ❌ |
| **See page public content** | ✅ | ✅ | ✅ | ✅ |
| **See block [usergroups: gm]** | ✅ Reveal (admin) | ❌ Not sent | ❌ Not sent | ❌ Not sent |
| **See block [usergroups: players]** | ✅ Reveal (admin) | ✅ Reveal | ❌ Not sent | ❌ Not sent |
| **See block [usergroups: party-alpha]** | ✅ Reveal (admin) | ✅ Reveal | ❌ Not sent | ❌ Not sent |
| **See block [usergroups: public]** | ✅ Reveal | ✅ Reveal | ✅ Reveal | ✅ Reveal |
| **Edit page (if allowed)** | ✅ | ⚠️ Conditional | ❌ | ❌ |
| **Edit block [editgroups: gm]** | ✅ | ❌ Placeholder | ❌ | ❌ |
| **Save preserves blocks user can't see** | N/A | ✅ Must work | N/A | N/A |

### Critical Security Tests

1. **Server-side filtering**: Verify restricted content is NOT in API response for unauthorized users
2. **Placeholder preservation**: When Alex saves, GM blocks are preserved unchanged
3. **No client-side leakage**: Restricted content never appears in browser DevTools for unauthorized users
4. **Admin override**: Verify admin group members can see ALL content regardless of specific group assignments
5. **Public group**: Verify guests (unauthenticated) can see `public` content but nothing else

---

## Appendix: Test Data Factories

```typescript
// e2e/fixtures/data/pages.ts

export function createPageWithRestrictedBlocks(options: {
  title: string;
  publicContent: string;
  restrictedBlocks: Array<{
    title: string;
    content: string;
    usergroups: string[];
    editgroups?: string[];
  }>;
}) {
  const blocksHtml = options.restrictedBlocks.map(block => `
    <div 
      data-block-type="restricted" 
      data-usergroups='${JSON.stringify(block.usergroups)}'
      data-editgroups='${JSON.stringify(block.editgroups || [])}'
      data-title="${block.title}"
      class="restricted-block-html"
    >
      <p>${block.content}</p>
    </div>
  `).join('\n');

  return {
    title: options.title,
    content: `<p>${options.publicContent}</p>\n${blocksHtml}`,
    path: `/${options.title.toLowerCase().replace(/\s+/g, '-')}`,
    edit_groups: ['admin', 'gm'],
    view_groups: ['admin', 'gm', 'players', 'observers'],
  };
}

// Usage in tests:
const dragonPage = createPageWithRestrictedBlocks({
  title: 'Dragon Info',
  publicContent: 'A mighty dragon lives here',
  restrictedBlocks: [
    { title: 'GM Secret', content: 'Dragon is friendly', usergroups: ['gm'] },
    { title: 'Party Hint', content: 'You have the key', usergroups: ['party-alpha'] },
  ],
});
```
