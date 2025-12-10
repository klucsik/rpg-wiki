# Better Auth Migration Plan

**Date:** December 10, 2025  
**From:** NextAuth v4 (next-auth@4.24.13)  
**To:** Better Auth (latest)  
**Strategy:** Big Bang Migration with Downtime

---

## Current State Analysis

### Authentication Features to Preserve

1. **Keycloak OAuth Provider (SSO)**
   - Client ID/Secret configuration
   - Scope: `openid email profile`
   - Custom profile mapping (username, email)
   - User auto-provisioning on first sign-in
   - **Note**: Groups are managed internally, NOT synced from Keycloak

2. **Credentials Provider (Username/Password)**
   - bcrypt password hashing
   - Username-based login
   - Database validation

3. **Session Management**
   - JWT strategy
   - 24-hour session duration
   - User groups in session

4. **User Management**
   - **Auto-provisioning**: Create user in DB on first Keycloak/credentials login
   - User group membership (internal UserGroup table)
   - Personal groups (username-based, auto-created)
   - Default "public" group assignment
   - **Note**: All group management is internal, independent of Keycloak

5. **API Key Authentication**
   - **Use Case**: Wiki.js migration script only
   - Custom API key validation (via auth-utils.ts)
   - API user provisioning
   - Admin group assignment for API users
   - **Strategy**: Hide behind settings feature flag (disabled by default)

6. **Database Schema**
   - User model with custom fields (username, groups)
   - UserGroup many-to-many relationship
   - Group model
   - Account/Session models (NextAuth)

---

## Migration Phases

### Phase 1: Preparation & Setup (Estimated: 2-4 hours)

**Tasks:**
- [ ] Install Better Auth dependencies
- [ ] Review Better Auth documentation for:
  - Keycloak OAuth setup
  - Username/password authentication
  - Custom session data
  - Prisma adapter configuration
- [ ] Create backup of current database
- [ ] Document current environment variables
- [ ] Set up local testing environment

**Files to Review:**
- `package.json` - dependencies
- `.env.local` - environment variables
- `prisma/schema.prisma` - database schema

---

### Phase 2: Database Schema Migration (Estimated: 2-3 hours)

**Current NextAuth Schema:**
```prisma
model User {
  id            String      @id @default(cuid())
  name          String?
  username      String      @unique
  email         String?     @unique
  emailVerified DateTime?
  password      String?
  image         String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  userGroups    UserGroup[]
  accounts      Account[]
  sessions      Session[]
  media         Media[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Required Changes:**
- [ ] Map NextAuth schema to Better Auth schema
- [ ] Preserve custom fields (username, userGroups)
- [ ] Handle session migration (may need to invalidate existing sessions)
- [ ] Create migration script for data transformation
- [ ] Test migration on copy of production data

**Questions for Better Auth Docs:**
- Does Better Auth support custom user fields natively?
- How to extend the default schema?
- Session storage format (JWT vs database)
- Account linking structure

---

### Phase 3: Auth Configuration (Estimated: 3-4 hours)

**Tasks:**
- [ ] Create Better Auth configuration file
- [ ] Configure Keycloak provider
- [ ] Configure credentials provider with bcrypt
- [ ] Set up custom session data (username, groups)
- [ ] Implement user auto-provisioning logic
- [ ] Configure group membership logic
- [ ] Set up JWT session with 24h expiry

**Files to Create/Modify:**
- `src/lib/auth.ts` → `src/lib/better-auth.ts`
- `src/lib/auth-client.ts` (new)
- Environment variables updates

**Key Features to Implement:**
1. Keycloak OAuth (SSO) with username/email mapping
2. Username/password with bcrypt validation
3. Auto-create users on first login (both Keycloak and credentials)
4. Auto-assign internal groups: [username, "public"]
5. Custom session data (groups array from UserGroup table)
6. Cookie cache with `compact` strategy (5min, signed)
7. Session expiry: 24 hours (matching current behavior)

---

### Phase 4: API Routes Migration (Estimated: 4-6 hours)

**Current NextAuth Route:**
- `src/app/api/auth/[...nextauth]/route.ts`

**Better Auth Routes:**
- Rename `/api/auth/[...nextauth]` to `/api/auth/[...all]`
- Update route handler to `export { GET, POST } = auth.handler`

**Routes Using Authentication:**
- [ ] `/api/admin/*` - Admin routes (7 files)
- [ ] `/api/pages/*` - Page routes
- [ ] `/api/users/*` - User management
- [ ] `/api/groups/*` - Group management
- [ ] `/api/images/*` - Image upload
- [ ] `/api/search/*` - Search routes

**Migration Strategy:**
- Replace `getServerSession(authOptions)` calls
- Update to Better Auth session retrieval
- Maintain API key authentication in `auth-utils.ts`
- Test each route independently

---

### Phase 5: Client-Side Updates (Estimated: 2-3 hours)

**Components Using Auth:**
- [ ] `src/components/layout/HeaderNav.tsx`
- [ ] `src/components/layout/UserMenu.tsx`
- [ ] `src/app/auth/signin/page.tsx`
- [ ] `src/app/pages/[id]/page.tsx`
- [ ] Any other components using `useSession()`

**Tasks:**
- [ ] Replace NextAuth client imports
- [ ] Update session hook usage
- [ ] Update sign-in/sign-out handlers
- [ ] Test all auth-dependent UI flows

---

### Phase 6: Custom Auth Utils (Estimated: 2 hours)

**File:** `src/lib/auth-utils.ts`

**Current Features:**
- API key validation
- Session extraction
- User group checking

**Tasks:**
- [ ] Adapt `getAuthFromRequest()` for Better Auth
- [ ] Maintain API key authentication logic
- [ ] Update return types
- [ ] Test API key flows

---

### Phase 7: Testing (Estimated: 4-6 hours)

**Test Scenarios:**

1. **Keycloak OAuth Login (SSO)**
   - [ ] New user auto-provisioning (first login)
   - [ ] Existing user login
   - [ ] Personal group auto-creation (username)
   - [ ] Default "public" group assignment
   - [ ] Session contains correct internal groups
   - [ ] Username/email mapping from Keycloak profile
   - [ ] SSO experience (pre-authenticated users redirect seamlessly)

2. **Credentials Login**
   - [ ] Username/password validation
   - [ ] Password hashing verification
   - [ ] Session creation
   - [ ] Group membership in session

3. **API Key Authentication (Feature Flag)**
   - [ ] Feature flag disabled: API key rejected
   - [ ] Feature flag enabled + valid key: accepted
   - [ ] Feature flag enabled + invalid key: rejected
   - [ ] API user provisioning
   - [ ] Admin group assignment for API user
   - [ ] Disable flag after Wiki.js migration complete

4. **Session Management**
   - [ ] Session persists across requests
   - [ ] Session expires after 24 hours
   - [ ] Sign out clears session
   - [ ] Protected routes block unauthenticated users

5. **Group-Based Access Control**
   - [ ] Admin routes require admin group
   - [ ] Page edit permissions work
   - [ ] Page view permissions work
   - [ ] User can see own groups

---

### Phase 8: Deployment (Estimated: 2 hours)

**Pre-Deployment Checklist:**
- [ ] All tests passing in staging
- [ ] Database migration script ready
- [ ] Rollback plan documented
- [ ] Environment variables updated
- [ ] Backup created

**Deployment Steps:**
1. [ ] Announce maintenance window
2. [ ] Take site offline (maintenance mode)
3. [ ] Backup production database
4. [ ] Run database migration
5. [ ] Deploy new code
6. [ ] Run smoke tests
7. [ ] Bring site online
8. [ ] Monitor for errors

**Post-Deployment:**
- [ ] Monitor error logs for 24 hours
- [ ] Verify Keycloak logins working
- [ ] Verify credentials logins working
- [ ] Verify API key authentication working
- [ ] Check session expiry behavior

---

## Environment Variables

**Current (NextAuth):**
```env
NEXTAUTH_URL=
NEXTAUTH_SECRET=
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
KEYCLOAK_ISSUER=
IMPORT_API_KEY=
```

**Better Auth:**
```env
# Better Auth base config
BETTER_AUTH_SECRET=  # replaces NEXTAUTH_SECRET
BETTER_AUTH_URL=     # replaces NEXTAUTH_URL

# OAuth providers (same as NextAuth)
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
KEYCLOAK_ISSUER=

# Database (if using Prisma)
DATABASE_URL=

# Custom (unchanged)
IMPORT_API_KEY=
```

---

## Risk Assessment

### High Risk Items
1. **Session invalidation** - All users will need to log in again
2. **Database schema changes** - Must be backwards compatible or require downtime
3. **API key authentication** - Critical for scripts/automation

### Medium Risk Items
1. **Group synchronization** - Logic must match current behavior exactly
2. **User auto-provisioning** - New users must get correct groups
3. **Password hashing** - Must remain compatible with bcrypt

### Low Risk Items
1. **UI updates** - Straightforward component changes
2. **Sign-in page** - Simple template update

---

## Rollback Plan

**If migration fails:**

1. **Immediate Actions:**
   - Restore database from backup
   - Revert code deployment
   - Clear any new sessions
   - Restart services

2. **Recovery Time:** ~15-30 minutes

3. **Data Loss Risk:** 
   - None if migration fails before completion
   - Minimal if caught early (users created during migration window)

---

## Success Criteria

- [ ] All existing users can log in
- [ ] Keycloak OAuth works identically
- [ ] Username/password auth works identically
- [ ] API key authentication unchanged
- [ ] All group memberships preserved
- [ ] No regression in page permissions
- [ ] Session duration matches (24h)
- [ ] No errors in production logs

---

## Timeline Estimate

**Total:** 21-28 hours (~3-4 days)

- Preparation: 2-4 hours
- Schema Migration: 2-3 hours
- Auth Config: 3-4 hours
- API Routes: 4-6 hours
- Client Updates: 2-3 hours
- Auth Utils: 2 hours
- Testing: 4-6 hours
- Deployment: 2 hours

---

## Cookie Cache Strategy Options

### Overview
Better Auth supports three encoding strategies for session cookie caching:

### 1. Compact (Default) ⭐ RECOMMENDED

**What it is**: Base64url encoding with HMAC-SHA256 signature

**Pros**:
- ✅ Smallest cookie size (best performance)
- ✅ Signed and tamper-proof
- ✅ Fast encryption/decryption
- ✅ No JWT spec overhead
- ✅ Best for internal use

**Cons**:
- ❌ Not JWT-compatible (can't verify with standard JWT tools)
- ❌ Readable if base64-decoded (but still tamper-proof)

**Use When**:
- Cookies only used internally by Better Auth
- Performance and size are priorities
- No need for third-party JWT verification

### 2. JWT

**What it is**: Standard JWT with HMAC-SHA256 (HS256)

**Pros**:
- ✅ Standard JWT format (RFC 7519)
- ✅ Signed and tamper-proof
- ✅ Can be verified by third-party tools
- ✅ Good for external integrations
- ✅ Readable (base64-encoded JSON)

**Cons**:
- ❌ Medium cookie size (larger than compact)
- ❌ Readable by anyone (just base64 decode)
- ❌ JWT spec overhead

**Use When**:
- Need JWT compatibility for external systems
- Want standard JWT tokens for debugging
- Integrating with other services that expect JWT

### 3. JWE

**What it is**: JSON Web Encryption with A256CBC-HS512 + HKDF

**Pros**:
- ✅ Fully encrypted (content hidden)
- ✅ Maximum security
- ✅ Cannot be read OR tampered with
- ✅ Best for sensitive data

**Cons**:
- ❌ Largest cookie size
- ❌ Slower encryption/decryption
- ❌ Overkill for most use cases

**Use When**:
- Storing sensitive data in cookies
- Compliance requirements (HIPAA, GDPR, etc.)
- Maximum security needed

### Recommendation for RPG Wiki

**Use `compact` strategy:**
- Session data is not sensitive (just user ID, groups)
- Internal use only (no external JWT verification needed)
- Performance is important (page loads)
- Smallest cookie size
- Still cryptographically secure (HMAC signed)

Configuration:
```typescript
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,  // 5 minutes
    strategy: "compact"  // Default, but explicit
  }
}
```

---

## Key Better Auth Features (from official migration guide)

### ✅ Native Support Confirmed

1. **Database Schema Migration**: Better Auth has compatible schema with NextAuth
   - User table: Similar structure, adds `username` field natively
   - Account table: Uses camelCase (refreshToken vs refresh_token)
   - Session table: Uses `token` instead of `sessionToken`, adds `ipAddress` and `userAgent`
   - All tables include `createdAt` and `updatedAt` timestamps

2. **Session Management**:
   - Cookie-based sessions (default: 7 days expiry)
   - JWT support via cookie cache
   - Configurable `expiresIn` and `updateAge`
   - Session freshness checks
   - Custom session data via `customSession` plugin

3. **Username/Password Auth**:
   - Native `username` plugin available
   - Built-in bcrypt support (password field in Account table)
   - Username normalization (lowercase by default)
   - Display username support

4. **OAuth Providers (SSO)**:
   - Keycloak supported (generic OAuth provider)
   - Custom profile mapping for username/email
   - Account linking handled automatically
   - **SSO**: Most users will be pre-authenticated via Keycloak
   - Groups are managed internally (not synced from Keycloak)

5. **Route Handler**:
   - Change from `/api/auth/[...nextauth]` to `/api/auth/[...all]`
   - Simple handler export: `auth.handler`

### Schema Comparison (NextAuth → Better Auth)

**User Table Changes:**
- ✅ `username` - Native support via username plugin
- ✅ `password` - Stored in Account table with built-in support
- ⚠️ `emailVerified` - Boolean instead of DateTime
- ➕ `createdAt`, `updatedAt` - Auto-added timestamps

**Session Table Changes:**
- `sessionToken` → `token`
- `expires` → `expiresAt`
- ➕ `ipAddress`, `userAgent` - Security tracking

**Account Table Changes:**
- Snake_case → camelCase (refresh_token → refreshToken)
- ➕ `accountId` - Distinguishes account ID from internal ID
- ➕ `accessTokenExpiresAt`, `refreshTokenExpiresAt` - Better token management
- ➕ `password` - For credentials provider
- ➕ `createdAt`, `updatedAt` - Timestamps

### Custom Features Strategy

**1. Groups in Session:**
Use `customSession` plugin to inject user groups:
```typescript
import { customSession } from "better-auth/plugins";
import { prisma } from "./db";

export const auth = betterAuth({
  plugins: [
    customSession(async ({ user, session }) => {
      // Fetch user groups from internal UserGroup table
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: session.userId },
        include: { group: true }
      });
      const groups = userGroups.map(ug => ug.group.name);
      
      return {
        user,
        session,
        groups  // Custom field for authorization
      };
    }),
  ],
});
```

**2. User Auto-Provisioning:**
On first Keycloak login, automatically:
- Create User record in database
- Create personal group (username)
- Assign to "public" group
- **Implementation**: Use Better Auth hooks/callbacks (see hooks documentation)

**3. API Key Authentication (Feature Flag):**
- Add `ENABLE_IMPORT_API` setting to SiteSetting table
- Default: `false` (disabled)
- Only enable during Wiki.js migration
- Custom middleware in `auth-utils.ts` checks setting before allowing API key auth

```typescript
// Simplified approach
async function getAuthFromRequest(req) {
  const apiKey = req.headers.get("X-API-Key");
  
  if (apiKey) {
    // Check if API imports are enabled
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "ENABLE_IMPORT_API" }
    });
    
    if (setting?.value === "true" && apiKey === process.env.IMPORT_API_KEY) {
      // Return API user session
      return { isApiKey: true, groups: ["admin"], ... };
    }
    throw new Error("API imports are disabled");
  }
  
  // Fall back to Better Auth session
  return await auth.api.getSession({ headers: req.headers });
}
```

## Next Steps

1. ✅ **Review Better Auth documentation** - COMPLETED
2. **Create detailed schema migration SQL**
3. **Install Better Auth dependencies**
4. **Create prototype auth configuration**
5. **Test Keycloak OAuth flow**
6. **Test username/password flow**
7. **Implement group sync logic**
8. **Execute migration**

---

## Remaining Questions

1. ✅ **Keycloak OAuth**: Only need username/email mapping (no groups)
2. ⏳ **User Provisioning**: What hooks/callbacks available for auto-creating users on first login?
3. ✅ **API Keys**: Feature flag in SiteSetting table, disabled by default
4. ✅ **Group Management**: Internal only (UserGroup table), no Keycloak sync needed
5. ✅ **Cookie Cache**: Use `compact` strategy for best performance
6. ⏳ **SSO Flow**: Ensure seamless Keycloak SSO experience for pre-authenticated users
7. ⏳ **Hooks/Callbacks**: Document lifecycle hooks for user creation, group assignment

---

## Files Requiring Changes

### Core Auth Files
- `src/lib/auth.ts` - Main auth configuration
- `src/lib/auth-utils.ts` - Custom auth utilities
- `src/app/api/auth/[...nextauth]/route.ts` - Auth route handler

### API Routes (17 files)
- `src/app/api/admin/settings/route.ts`
- `src/app/api/admin/changelog/route.ts`
- `src/app/api/admin/backup-settings/route.ts`
- `src/app/api/admin/backup-jobs/route.ts`
- `src/app/api/admin/import/route.ts`
- `src/app/api/admin/backup-settings/test/route.ts`
- `src/app/api/pages/route.ts`
- `src/app/api/pages/[id]/route.ts`
- ... (all API routes)

### Client Components
- `src/components/layout/HeaderNav.tsx`
- `src/components/layout/UserMenu.tsx`
- `src/app/auth/signin/page.tsx`
- `src/app/auth/signout/page.tsx`

### Configuration
- `package.json`
- `prisma/schema.prisma`
- `.env.local`

---

## Document History

- **2025-12-10**: Initial migration plan created
- **TBD**: Updated with Better Auth documentation findings
- **TBD**: Schema mapping finalized
- **TBD**: Migration executed
