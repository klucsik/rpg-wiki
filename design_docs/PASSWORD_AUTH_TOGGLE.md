# User Story: Disable Password Login

## Overview

RPG Wiki should support Keycloak-only authentication mode where username/password login is disabled, forcing all users to authenticate via Keycloak SSO.

## User Story

**As a** system administrator  
**I want to** disable username/password authentication  
**So that** all users are required to use Keycloak SSO for authentication

## Rationale

- **Security**: Centralized authentication via Keycloak provides better security controls
- **SSO Experience**: Most users are already authenticated via Keycloak
- **Password Management**: Eliminates need for password reset flows and local password storage
- **Admin Simplicity**: Reduces attack surface and simplifies authentication logic

## Use Cases

### Primary Use Case: Keycloak-Only Mode

Most deployments should use Keycloak-only mode where:
- All users authenticate via Keycloak SSO
- No username/password login form available
- No password storage in database
- Admin users also use Keycloak

### Exception: Admin Bootstrap Mode

Password login should ONLY be enabled for:
- Initial system setup (before Keycloak configured)
- Emergency admin access (if Keycloak is down)
- Development environments without Keycloak

## Implementation Design

### Environment Variable

```env
# .env
ENABLE_PASSWORD_AUTH=false  # Default: false (Keycloak-only)
# ENABLE_PASSWORD_AUTH=true  # Only for admin bootstrap or dev
```

### Better Auth Configuration

```typescript
// src/lib/better-auth.ts
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";

export const auth = betterAuth({
  // Email/password only enabled if explicitly set
  emailAndPassword: {
    enabled: process.env.ENABLE_PASSWORD_AUTH === "true",
    // Only allow admin signup when enabled
    requireEmailVerification: false,
  },
  
  socialProviders: {
    // Keycloak always enabled
    keycloak: {
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    },
  },
  
  plugins: [
    // Username plugin only if password auth enabled
    ...(process.env.ENABLE_PASSWORD_AUTH === "true" 
      ? [username()] 
      : []
    ),
  ],
});
```

### UI Behavior

**When `ENABLE_PASSWORD_AUTH=false`:**
- Login page shows only "Sign in with Keycloak" button
- No username/password form visible
- No "forgot password" link
- Sign-up disabled (Keycloak handles user provisioning)

**When `ENABLE_PASSWORD_AUTH=true`:**
- Login page shows both Keycloak button AND username/password form
- Admin can create local users
- Password reset available (admin-managed)

### Sign-In Page Component

```typescript
// src/app/auth/signin/page.tsx
export default function SignInPage() {
  const passwordAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_PASSWORD_AUTH === "true";
  
  return (
    <div>
      <h1>Sign In</h1>
      
      {/* Keycloak SSO - Always visible */}
      <button onClick={() => authClient.signIn.social({ provider: "keycloak" })}>
        Sign in with Keycloak
      </button>
      
      {/* Password login - Only if enabled */}
      {passwordAuthEnabled && (
        <form>
          <input name="username" placeholder="Username" />
          <input name="password" type="password" placeholder="Password" />
          <button type="submit">Sign in with Password</button>
        </form>
      )}
    </div>
  );
}
```

## Password Reset Flow (When Enabled)

Since password authentication is only for admin bootstrap:

### Admin-Managed Password Reset

1. **User reports password issue** → Contacts admin
2. **Admin resets password** → Uses admin panel to set new temporary password
3. **User logs in** → With temporary password
4. **User changes password** → Via profile settings (optional)

**OR** Admin directs user to use Keycloak instead.

### Admin Panel Password Reset

```typescript
// src/app/admin/users/reset-password/page.tsx
export async function resetUserPassword(userId: string, newPassword: string) {
  // Admin only - requires admin group
  const session = await auth.api.getSession();
  if (!session.groups.includes("admin")) {
    throw new Error("Unauthorized");
  }
  
  // Update password in Account table
  await prisma.account.updateMany({
    where: { 
      userId,
      providerId: "credentials"
    },
    data: {
      password: await hashPassword(newPassword)
    }
  });
}
```

## Migration Strategy

### Existing Deployments

For systems already using password authentication:

1. **Default Behavior**: Keep `ENABLE_PASSWORD_AUTH=true` initially
2. **Migration Path**: 
   - Ensure all users have Keycloak accounts
   - Test Keycloak login for all users
   - Set `ENABLE_PASSWORD_AUTH=false`
   - Users forced to use Keycloak on next login
3. **Rollback**: Set back to `true` if issues arise

### New Deployments

1. **Set `ENABLE_PASSWORD_AUTH=false`** from start
2. **Configure Keycloak** before first deployment
3. **All users use SSO** from day one

## Configuration Matrix

| Environment | ENABLE_PASSWORD_AUTH | Use Case |
|-------------|---------------------|----------|
| Production | `false` | Keycloak SSO only (recommended) |
| Staging | `false` | Mirror production |
| Development | `true` | Local dev without Keycloak |
| Bootstrap | `true` | Initial setup, emergency admin access |

## Security Considerations

### Why Default to Disabled

1. **Fewer Credentials**: Only Keycloak passwords to manage
2. **No Local Storage**: No password hashes in database (except admin bootstrap)
3. **Centralized Policy**: Keycloak enforces password policies, MFA, etc.
4. **Audit Trail**: Keycloak provides centralized audit logs

### Admin Bootstrap Security

When `ENABLE_PASSWORD_AUTH=true`:
- Only create ONE admin user with password
- Admin user should migrate to Keycloak as soon as possible
- Disable password auth after Keycloak setup complete
- Consider deleting admin password from database after migration

## Testing Scenarios

### Test Case 1: Keycloak-Only Mode
```bash
ENABLE_PASSWORD_AUTH=false npm run dev
```
- ✅ Login page shows only Keycloak button
- ✅ Direct POST to `/sign-in/username` returns error
- ✅ All users can authenticate via Keycloak
- ✅ No password fields in database

### Test Case 2: Password Enabled Mode
```bash
ENABLE_PASSWORD_AUTH=true npm run dev
```
- ✅ Login page shows Keycloak + password form
- ✅ Admin can create local users
- ✅ Username/password login works
- ✅ Password stored in Account table

### Test Case 3: Runtime Toggle
- ✅ Changing env var requires restart
- ✅ Existing sessions remain valid
- ✅ New logins respect updated setting

## Future Enhancements

1. **UI Toggle**: Admin panel setting to enable/disable password auth (stored in SiteSetting)
2. **User Migration**: Automatic prompt to link Keycloak account when password user logs in
3. **Account Linking**: Allow users to link Keycloak to existing password account
4. **Password Cleanup**: Admin tool to remove all password data from database

## Documentation Updates

### Environment Variables Docs

```markdown
## ENABLE_PASSWORD_AUTH

**Type**: Boolean (string "true" or "false")  
**Default**: `false`  
**Required**: No

Enables username/password authentication alongside Keycloak SSO.

- `false`: Keycloak-only mode (recommended for production)
- `true`: Allow local password authentication (dev/bootstrap only)

**Example:**
```env
ENABLE_PASSWORD_AUTH=false  # Production - SSO only
ENABLE_PASSWORD_AUTH=true   # Development
```
```

### Deployment Guide

Add section on Keycloak setup:
1. Configure Keycloak realm and client
2. Set `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ISSUER`
3. Ensure `ENABLE_PASSWORD_AUTH=false` in production
4. Test Keycloak login before going live

## Acceptance Criteria

- [ ] `ENABLE_PASSWORD_AUTH` environment variable controls password authentication
- [ ] Default value is `false` (Keycloak-only)
- [ ] Login UI adapts based on setting (hides/shows password form)
- [ ] Better Auth configuration respects the setting
- [ ] API endpoints reject password auth when disabled
- [ ] Admin can still reset passwords when enabled (for bootstrap)
- [ ] Documentation updated with env var and migration path
- [ ] Tests cover both modes (enabled/disabled)

## Dependencies

- Better Auth username plugin (conditional)
- Keycloak realm configuration
- Environment variable parsing

## Related Issues

- Migration from NextAuth to Better Auth
- Keycloak SSO integration
- User auto-provisioning on first login

---

**Status**: Design  
**Priority**: High  
**Effort**: Medium (1-2 days implementation)
