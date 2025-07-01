# Keycloak OIDC Setup for RPG Wiki

This document explains how to configure Keycloak for SSO with the RPG Wiki application.

## Keycloak Client Configuration

### 1. Create a new Client in Keycloak

1. Log into your Keycloak Admin Console
2. Navigate to your realm (or create a new one)
3. Go to **Clients** → **Create Client**
4. Set the following values:
   - **Client ID**: `rpg-wiki` (or your preferred client ID)
   - **Client Protocol**: `openid-connect`
   - **Root URL**: `http://localhost:3000` (adjust for your domain)

### 2. Client Settings

Configure the following settings in your client:

#### Access Settings
- **Valid Redirect URIs**: 
  - `http://localhost:3000/api/auth/callback/keycloak`
  - `https://your-domain.com/api/auth/callback/keycloak` (for production)
- **Valid Post Logout Redirect URIs**: 
  - `http://localhost:3000`
  - `https://your-domain.com` (for production)
- **Web Origins**: 
  - `http://localhost:3000`
  - `https://your-domain.com` (for production)

#### Authentication Flow
- **Standard Flow Enabled**: ON
- **Direct Access Grants Enabled**: OFF (for security)

### 3. Client Authentication

- **Client Authentication**: ON
- **Authentication Flow**: Standard flow, Direct access grants

### 4. Get Client Credentials

After creating the client:
1. Go to the **Credentials** tab
2. Copy the **Client Secret**

## Environment Variables

Update your `.env` file with the following values:

```bash
# Keycloak OIDC Configuration
KEYCLOAK_CLIENT_ID="rpg-wiki"
KEYCLOAK_CLIENT_SECRET="your-client-secret-from-keycloak"
KEYCLOAK_ISSUER="https://your-keycloak-domain.com/realms/your-realm-name"
```

### Example URLs:
- **Keycloak Server**: `https://auth.example.com`
- **Realm**: `myrealm`
- **Issuer URL**: `https://auth.example.com/realms/myrealm`

## Group Mapping

The application automatically maps Keycloak groups to local groups:

### Default Mapping:
- Users with Keycloak group `/admin` or `admin` → `admin` + `viewer` groups
- All other users → `viewer` group only

### Custom Group Mapping

You can customize the group mapping in `/src/lib/auth.ts` in the `signIn` callback:

```typescript
// Map Keycloak groups to our groups
const keycloakGroups = (profile as any).groups || [];
const defaultGroups = ["viewer"];

// Customize this logic based on your needs
let groupsToAssign = defaultGroups;
if (keycloakGroups.includes("/admin") || keycloakGroups.includes("admin")) {
  groupsToAssign = ["admin", "viewer"];
} else if (keycloakGroups.includes("/moderator")) {
  groupsToAssign = ["moderator", "viewer"];
}
```

## Keycloak User Attributes

The application uses these user attributes from Keycloak:
- `name` or `preferred_username` → Display name
- `email` → Email address (required)
- `preferred_username` → Username
- `groups` → Group memberships (optional, for authorization)

## Group Claims Configuration

To include group information in the OIDC token:

1. In Keycloak, go to **Client Scopes** → **roles** → **Mappers**
2. Create a new mapper:
   - **Name**: `groups`
   - **Mapper Type**: `Group Membership`
   - **Token Claim Name**: `groups`
   - **Full group path**: OFF (unless you want full paths like `/admin`)
   - **Add to ID token**: ON
   - **Add to access token**: ON
   - **Add to userinfo**: ON

## Testing

1. Start your application: `npm run dev`
2. Navigate to: `http://localhost:3000/auth/signin`
3. Click "Sign in with Keycloak" button
4. You should be redirected to Keycloak login
5. After successful login, you'll be redirected back to the RPG Wiki

## Troubleshooting

### Common Issues:

1. **Access Denied Error**: This is the most common issue. Check these items in order:
   
   **A. Redirect URI Configuration**
   - In Keycloak client settings, ensure "Valid Redirect URIs" includes EXACTLY:
     - `http://localhost:3000/api/auth/callback/keycloak` (for development)
     - `https://your-domain.com/api/auth/callback/keycloak` (for production)
   - The URL must be exact - no trailing slashes, correct protocol (http/https)
   
   **B. Client Authentication Settings**
   - Set "Client Authentication" to **ON**
   - Under "Authentication flow", enable "Standard flow"
   - Disable "Direct access grants" for security
   
   **C. Environment Variables**
   - Double-check your `.env` file has correct values:
     ```bash
     KEYCLOAK_CLIENT_ID="exact-client-id-from-keycloak"
     KEYCLOAK_CLIENT_SECRET="secret-from-credentials-tab"
     KEYCLOAK_ISSUER="https://your-keycloak.com/realms/your-realm"
     ```
   
   **D. Web Origins**
   - Add your application URL to "Web origins":
     - `http://localhost:3000` (development)
     - `https://your-domain.com` (production)

2. **Invalid Redirect URI**: Ensure the callback URL is exactly: `/api/auth/callback/keycloak`

3. **HTTPS Required**: In production, Keycloak requires HTTPS

4. **CORS Issues**: Make sure Web Origins are properly configured

5. **Group Mapping**: Check if groups are being included in the token claims

### Debug Steps:

1. **Check Configuration**: Visit `http://localhost:3000/debug/auth` to see provider configuration

2. **Verify Environment Variables**: Ensure all KEYCLOAK_* variables are set correctly

3. **Test Keycloak Endpoints**: Try accessing your Keycloak well-known configuration:
   ```
   https://your-keycloak.com/realms/your-realm/.well-known/openid_configuration
   ```

4. **Check Keycloak Logs**: Look at Keycloak server logs for more specific error messages

5. **Enable Debug Mode**: Add this to your `.env`:
   ```bash
   NEXTAUTH_DEBUG=true
   ```

### Step-by-Step Verification:

1. **Keycloak Client Settings**:
   - Go to your Keycloak client
   - Verify "Client ID" matches `KEYCLOAK_CLIENT_ID` in your `.env`
   - Check "Valid Redirect URIs" includes the exact callback URL
   - Ensure "Standard Flow Enabled" is ON
   - Verify "Client Authentication" is ON (for confidential clients)

2. **Environment File**:
   ```bash
   # These should match your Keycloak setup exactly
   KEYCLOAK_CLIENT_ID="rpg-wiki"
   KEYCLOAK_CLIENT_SECRET="abc123-your-secret-from-keycloak"
   KEYCLOAK_ISSUER="https://auth.example.com/realms/myrealm"
   ```

3. **Test the Flow**:
   - Visit `/auth/signin`
   - Click "Sign in with Keycloak"
   - If you get "Access Denied", check the browser developer console and server logs

### Debug Mode:

Add this to your `.env` for debugging:
```bash
NEXTAUTH_DEBUG=true
```

This will show detailed logs in the console during authentication.
