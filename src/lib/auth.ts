import { NextAuthOptions } from "next-auth";
import { prisma } from "./db/db";
import CredentialsProvider from "next-auth/providers/credentials";
import KeycloakProvider from "next-auth/providers/keycloak";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
      authorization: {
        params: {
          scope: "openid email profile groups"
        }
      },
      profile(profile: Record<string, unknown>) {
        return {
          id: profile.sub as string,
          name: (profile.name as string) ?? (profile.preferred_username as string),
          email: profile.email as string,
          username: profile.preferred_username as string,
          groups: (profile.groups as string[]) || [],
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username
          },
          include: {
            userGroups: {
              include: {
                group: true
              }
            }
          }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          groups: user.userGroups.map(ug => ug.group.name),
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Keycloak OIDC users, sync with our database
      if (account?.provider === "keycloak" && profile) {
        try {
          // Check if user exists in our database (first by ID, then by email)
          let dbUser = await prisma.user.findUnique({
            where: { id: user.id! },
            include: {
              userGroups: {
                include: {
                  group: true
                }
              }
            }
          });

          // If not found by ID, try email (for migration purposes)
          if (!dbUser && user.email) {
            dbUser = await prisma.user.findUnique({
              where: { email: user.email },
              include: {
                userGroups: {
                  include: {
                    group: true
                  }
                }
              }
            });
          }

          // If user doesn't exist, create them
          if (!dbUser) {
            // Map Keycloak groups to our groups
            const keycloakGroups = ((profile as Record<string, unknown>).groups as string[]) || [];
            const username = ((profile as Record<string, unknown>).preferred_username as string) || user.email!.split('@')[0];
            const defaultGroups = ["public"]; // Default group for new users
            
            // Include personal group (username) + Keycloak groups + default groups
            const groupsToAssign = [...new Set([username, ...defaultGroups])];

            dbUser = await prisma.user.create({
              data: {
                id: user.id!, // Use the Keycloak user ID
                name: user.name!,
                email: user.email!,
                username: username,
                // No password for OIDC users
                userGroups: {
                  create: groupsToAssign.map(groupName => ({
                    group: {
                      connectOrCreate: {
                        where: { name: groupName },
                        create: { name: groupName }
                      }
                    }
                  }))
                }
              },
              include: {
                userGroups: {
                  include: {
                    group: true
                  }
                }
              }
            });
          } else {
            // Update existing user with latest info from Keycloak
            // If we found the user by email but their ID doesn't match, we need to handle this carefully
            const updateData: any = {
              name: user.name!,
              username: ((profile as Record<string, unknown>).preferred_username as string) || dbUser.username,
            };

            // If the user was found by email but has a different ID, we need to update the ID
            // This handles migration from old user records
            if (dbUser.id !== user.id) {
              console.log(`Updating user ID from ${dbUser.id} to ${user.id} for ${user.email}`);
              // First check if the new ID is already taken
              const existingUserWithNewId = await prisma.user.findUnique({
                where: { id: user.id! }
              });
              
              if (!existingUserWithNewId) {
                updateData.id = user.id!;
              } else {
                console.warn(`Cannot update user ID - ID ${user.id} already exists`);
              }
            }

            await prisma.user.update({
              where: { id: dbUser.id },
              data: updateData
            });

            // Refresh the user object to get the updated data
            dbUser = await prisma.user.findUnique({
              where: { id: updateData.id || dbUser.id },
              include: {
                userGroups: {
                  include: {
                    group: true
                  }
                }
              }
            }) || dbUser;
          }

          // Update user object with groups for the session
          user.groups = dbUser.userGroups.map(ug => ug.group.name);
          user.username = dbUser.username;
          user.id = dbUser.id; // Ensure the session uses the correct user ID

          console.log(`Keycloak user synced: ${dbUser.id} (${dbUser.username})`);
          return true;
        } catch (error) {
          console.error("Error syncing Keycloak user:", error);
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // Store user info in the token for session callback
        token.username = user.username;
        token.groups = user.groups;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string || token.sub!;
        session.user.username = token.username as string;
        session.user.groups = token.groups as string[];
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
