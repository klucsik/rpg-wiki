import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username, genericOAuth, keycloak } from "better-auth/plugins";
import { prisma } from "./db/db";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  // Email verification - disable for now, can enable later if needed
  emailAndPassword: {
    enabled: true,
    autoSignUpEmailVerified: true,
  },

  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  
  // Base URL for the auth routes
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL,

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24, // 24 hours in seconds
    updateAge: 60 * 60 * 24, // 24 hours in seconds
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // Custom sign-in/sign-out pages
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "better-auth",
  },

  // Plugins
  plugins: [
    username({
      // Enable username-based authentication
      // This adds username field to User model and enables username login
    }),
    ...(process.env.KEYCLOAK_CLIENT_ID && process.env.KEYCLOAK_CLIENT_SECRET && process.env.KEYCLOAK_ISSUER
      ? [
          genericOAuth({
            config: [
              {
                ...keycloak({
                  clientId: process.env.KEYCLOAK_CLIENT_ID,
                  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
                  issuer: process.env.KEYCLOAK_ISSUER,
                  // Request additional scopes to get more user info
                  scopes: ["openid", "profile", "email"],
                }),
                mapProfileToUser: async (profile: any) => {
                  // Generate username from email prefix
                  let username = "";
                  if (profile.email) {
                    username = profile.email.split("@")[0].toLowerCase();
                  } else if (profile.name) {
                    username = profile.name.toLowerCase().replace(/\s+/g, ".");
                  } else {
                    username = profile.id.substring(0, 8);
                  }
                  
                  return {
                    email: profile.email,
                    emailVerified: profile.emailVerified ?? false,
                    name: profile.name,
                    image: profile.picture,
                    username,
                  };
                },
              },
            ],
          }),
        ]
      : []),
  ],

  // Credentials provider (username/password)
  account: {
    // Callback for account creation (auto-provisioning)
    async accountLinking(user, account) {
      // When a user signs in, check if we need to set up their groups
      return true; // Allow account linking
    },
  },
});

// Export types for client-side usage
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

// Helper function to ensure user has a username (for OAuth users)
export async function ensureUserHasUsername(userId: string, email?: string | null, name?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.username) {
    return user; // Already has username
  }

  // Generate username from email or name
  let baseUsername = email?.split("@")[0] || name?.toLowerCase().replace(/\s+/g, "") || "user";
  const sanitizedUsername = baseUsername.replace(/[^a-z0-9._-]/g, "").toLowerCase();

  // Check if username already exists, if so add a random suffix
  let username = sanitizedUsername;
  let counter = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${sanitizedUsername}${counter}`;
    counter++;
  }

  // Update user with generated username
  return prisma.user.update({
    where: { id: userId },
    data: { username },
  });
}

// Helper function to auto-provision groups for a user
export async function autoProvisionUserGroups(userId: string, identifier: string) {
  try {
    // Check if user already has groups
    const existingGroups = await prisma.userGroup.findMany({
      where: { userId },
    });

    if (existingGroups.length > 0) {
      console.log(`⏭️  User already has ${existingGroups.length} group(s), skipping auto-provisioning`);
      return;
    }

    
    // Use identifier (username or email) for personal group
    const defaultGroups = ["public", identifier];
    
    for (const groupName of defaultGroups) {
      // Create or find the group
      let group = await prisma.group.findUnique({
        where: { name: groupName },
      });

      if (!group) {
        group = await prisma.group.create({
          data: { name: groupName },
        });
      }

      // Add user to group (or skip if already exists)
      await prisma.userGroup.upsert({
        where: {
          userId_groupId: {
            userId,
            groupId: group.id,
          },
        },
        update: {},
        create: {
          userId,
          groupId: group.id,
        },
      });
    }

  } catch (error) {
    console.error("❌ Error auto-provisioning groups:", error);
  }
}

// Helper function to get session with groups
export async function getSessionWithGroups(headers: Headers) {
  // console.log('[getSessionWithGroups] Getting session from better-auth');
  // console.log('[getSessionWithGroups] Cookie header:', headers.get('cookie'));
  const session = await auth.api.getSession({ headers });
  // console.log('[getSessionWithGroups] Better-auth session:', session?.user?.id || 'null');
  // console.log('[getSessionWithGroups] Session data:', JSON.stringify(session, null, 2));
  
  if (!session?.user?.id) {
    return null;
  }


  // Fetch user groups from database
  const userGroups = await prisma.userGroup.findMany({
    where: { userId: session.user.id },
    include: { group: true },
  });

  const groups = userGroups.map((ug) => ug.group.name);

  // Auto-provision groups if user has none
  // Use username if available, otherwise fall back to email
  if (groups.length === 0) {
    const identifier = session.user.username || session.user.email || session.user.id;
    await autoProvisionUserGroups(session.user.id, identifier);
    
    // Re-fetch groups after provisioning
    const newUserGroups = await prisma.userGroup.findMany({
      where: { userId: session.user.id },
      include: { group: true },
    });
    
    const newGroups = newUserGroups.map((ug) => ug.group.name);
    
    return {
      ...session,
      user: {
        ...session.user,
        groups: newGroups,
      },
    };
  }

  
  return {
    ...session,
    user: {
      ...session.user,
      groups,
    },
  };
}

// Helper for server-side authentication check (for API routes)
export async function getServerAuth() {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  return getSessionWithGroups(headersList);
}

// Helper for credentials sign-in (username/password)
export async function signInWithCredentials(username: string, password: string) {
  console.log('[signInWithCredentials] Looking for username:', username);
  
  // Find user by username
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      accounts: {
        where: {
          providerId: "credential",
        },
      },
    },
  });

  console.log('[signInWithCredentials] Found user:', user?.id, 'accounts:', user?.accounts.length, 'has password:', !!user?.accounts[0]?.password);

  if (!user || user.accounts.length === 0 || !user.accounts[0].password) {
    console.log('[signInWithCredentials] Failed: No user or no account or no password');
    return null;
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.accounts[0].password);

  console.log('[signInWithCredentials] Password valid:', isValid);

  if (!isValid) {
    return null;
  }

  return user;
}

// Helper to create a credentials account with hashed password
export async function createCredentialsAccount(
  userId: string,
  username: string,
  password: string
) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return await prisma.account.create({
    data: {
      userId,
      accountId: username, // Use username as accountId
      providerId: "credential",
      password: hashedPassword,
    },
  });
}
