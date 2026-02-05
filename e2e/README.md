# E2E Testing Guide

This directory contains end-to-end tests for the RPG Wiki application using Playwright with BDD (Behavior-Driven Development) via Cucumber-style feature files.

## Prerequisites

- Node.js and npm installed
- Docker and Docker Compose (for the test database)
- PostgreSQL test database running

## Quick Start

### 1. Start the Test Database

The test database runs in a Docker container on port **5433** (to avoid conflicts with your local development database on 5432).

```bash
# Start the test database
docker-compose -f docker-compose.test.yml up -d

# Check if the database is healthy
docker-compose -f docker-compose.test.yml ps
```

To stop the test database:
```bash
docker-compose -f docker-compose.test.yml down
```

To stop and remove the database volume (clean slate):
```bash
docker-compose -f docker-compose.test.yml down -v
```

### 1.1. Generate test files
```bash
npx bddgen
```

### 2. Run All Tests

```bash
# Run all tests (will start dev server automatically)
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npm run test:e2e
```

The test suite will:
- Automatically start the Next.js dev server on port 3000
- Connect to the test database
- Run database migrations
- Seed test data
- Execute all feature files
- Generate an HTML report

## Running Specific Tests

### Run Tests by Feature File

```bash
# Run only auth tests
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npx playwright test --grep "@auth"

# Run only login tests
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npx playwright test e2e/features/auth/login.feature

# Run Keycloak tests
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npx playwright test e2e/features/auth/keycloak-login.feature
```

### Run Tests by Tag

Feature files can be tagged (e.g., `@auth`, `@keycloak`):

```bash
# Run all tests with @auth tag
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npx playwright test --grep "@auth"

# Run all tests with @keycloak tag
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npx playwright test --grep "@keycloak"
```

### Run Tests by Scenario Name

```bash
# Run specific scenario by name
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npx playwright test --grep "User can log in with valid credentials"
```

### Run Tests in UI Mode (Interactive)

```bash
# Open Playwright UI for interactive debugging
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npm run test:e2e:ui
```

### Run Tests in Debug Mode

```bash
# Run with Playwright Inspector
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npm run test:e2e:debug
```

### Run Tests in Headed Mode (See Browser)

```bash
# Run tests with visible browser
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npm run test:e2e:headed

TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npx playwright test e2e/features/auth/keycloak-login.feature  --headed
```

## Project Structure

```
e2e/
├── .auth/                    # Test user credentials (NOT in git)
│   ├── alex.json            # Player persona auth state
│   ├── diana.json           # Game Master persona auth state
│   ├── sam.json             # Observer persona auth state
│   └── keycloak.json        # Keycloak test credentials
├── features/                 # BDD feature files (Gherkin syntax)
│   └── auth/
│       ├── guest-access.feature
│       ├── login.feature
│       ├── logout.feature
│       └── keycloak-login.feature
├── fixtures/                 # Test fixtures and page objects
│   ├── personas.ts          # Test user definitions
│   ├── test-base.ts         # Base test fixture
│   └── pages/               # Page Object Models
│       └── login.page.ts
├── steps/                    # Step definitions (implementation)
│   ├── auth.steps.ts
│   └── common.steps.ts
└── support/                  # Test utilities and setup
    ├── global-setup.ts      # Global test initialization
    └── db/
        ├── prisma-helpers.ts
        ├── seed.ts
        └── test-helpers.ts
```

## Test Personas

The test suite uses predefined personas representing different user roles:

- **Diana** (Game Master): Full admin access - `admin`, `gm`, `players`, `public` groups
- **Alex** (Player): Regular player - `players`, `party-alpha`, `public` groups  
- **Sam** (Observer): View-only access - `observers`, `public` groups
- **Keycloak User**: SSO user authenticated via Keycloak (test-foundry)

## Environment Variables

- `TEST_DATABASE_URL`: PostgreSQL connection string for test database (default: `postgresql://test:test@localhost:5433/rpg_wiki_test`)
- `TEST_BASE_URL`: Base URL for the application under test (default: `http://localhost:3000`)
- `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ISSUER`: Required for Keycloak SSO tests

## Writing New Tests

### 1. Create a Feature File

Create a new `.feature` file in `e2e/features/`:

```gherkin
@myfeature
Feature: My New Feature
  
  Scenario: Test something
    Given some precondition
    When I perform an action
    Then I should see the result
```

### 2. Implement Step Definitions

Add step implementations in `e2e/steps/`:

```typescript
Given('some precondition', async ({ page }) => {
  // Setup code
});

When('I perform an action', async ({ page }) => {
  // Action code
});

Then('I should see the result', async ({ page }) => {
  // Assertion code
});
```

### 3. Run Your Test

```bash
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npx playwright test e2e/features/myfeature.feature
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if test database is running
docker-compose -f docker-compose.test.yml ps

# Check database logs
docker-compose -f docker-compose.test.yml logs test-db

# Restart the database
docker-compose -f docker-compose.test.yml restart
```

### Port Already in Use

If port 3000 or 5433 is already in use:
- Stop other applications using these ports
- Or modify the ports in `playwright.config.ts` and `docker-compose.test.yml`

### Test Failures

```bash
# View test report
npx playwright show-report

# Run tests with trace on (more debugging info)
TEST_DATABASE_URL='postgresql://test:test@localhost:5433/rpg_wiki_test' npx playwright test --trace on
```

### Clean Test Database

```bash
# Remove database volume and start fresh
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
```

## Keycloak Tests

Keycloak tests require:
1. Keycloak credentials in `e2e/.auth/keycloak.json` (not in git)
2. Environment variables configured:
   - `KEYCLOAK_CLIENT_ID`
   - `KEYCLOAK_CLIENT_SECRET`
   - `KEYCLOAK_ISSUER`

The credentials file format:
```json
{
  "username": "test-foundry",
  "password": "********",
  "displayName": "Teszt Elek",
  "appUsername": "test-foundry"
}
```

## CI/CD Integration

In CI environments, set:
- `CI=true` (enables stricter settings)
- `TEST_DATABASE_URL` pointing to your CI database
- All required Keycloak environment variables

## Reports

After running tests:
- HTML report: `playwright-report/index.html`
- Test results: `test-results/`
- Screenshots (on failure): `test-results/*/screenshots/`
- Traces (on retry): `test-results/*/trace.zip`

View the HTML report:
```bash
npx playwright show-report
```
