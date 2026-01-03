import { NextRequest } from "next/server";
import { prisma } from "./db/db";
import { getSessionWithGroups } from "./better-auth";

export interface AuthResult {
  isAuthenticated: boolean;
  userGroups: string[];
  username: string;
  userId: string;
  isApiKey: boolean;
}

export async function getAuthFromRequest(req: NextRequest): Promise<AuthResult> {
  // Check for API key in Authorization header or X-API-Key header
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');
  
  let apiKey: string | null = null;
  
  if (authHeader?.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else if (apiKeyHeader) {
    apiKey = apiKeyHeader;
  }
  
  // Check if API imports are enabled via settings
  if (apiKey) {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "ENABLE_IMPORT_API" }
    });

    const isApiEnabled = setting?.value === "true";
    const validApiKey = process.env.IMPORT_API_KEY;
    
    if (isApiEnabled && validApiKey && apiKey === validApiKey) {
      // API key authentication - find or create API user
      let apiUser = await prisma.user.findUnique({
        where: { username: 'api-import-user' }
      });

      if (!apiUser) {
        // Create API user if it doesn't exist
        console.log('Creating API import user...');
        apiUser = await prisma.user.create({
          data: {
            username: 'api-import-user',
            name: 'API Import User',
            email: 'api@import.system',
          }
        });

        // Assign to admin group
        const adminGroup = await prisma.group.findUnique({
          where: { name: 'admin' }
        });

        if (adminGroup) {
          await prisma.userGroup.create({
            data: {
              userId: apiUser.id,
              groupId: adminGroup.id
            }
          });
        }
      }

      return {
        isAuthenticated: true,
        userGroups: ['admin', 'klucsik', 'public'],
        username: 'API Import User',
        userId: apiUser.id,
        isApiKey: true
      };
    } else if (apiKey && !isApiEnabled) {
      console.warn('API key provided but ENABLE_IMPORT_API is disabled');
    }
  }

  // Get Better Auth session
  const session = await getSessionWithGroups(req.headers);
  
  if (!session?.user) {
    return {
      isAuthenticated: false,
      userGroups: ['public'],
      username: 'Anonymous',
      userId: '',
      isApiKey: false
    };
  }

  return {
    isAuthenticated: true,
    userGroups: session.user.groups || [],
    username: session.user.username || session.user.name || 'Unknown',
    userId: session.user.id,
    isApiKey: false
  };
}

export function requireAuthentication(auth: AuthResult) {
  if (!auth.isAuthenticated) {
    return { error: 'Authentication required', status: 401 };
  }
  return null;
}

export function requireEditPermissions(auth: AuthResult, pageEditGroups: string[]) {
  const authError = requireAuthentication(auth);
  if (authError) return authError;
  
  // API keys have admin access
  if (auth.isApiKey) return null;
  
  const canEdit = auth.userGroups.some(g => pageEditGroups.includes(g));
  if (!canEdit) {
    return { error: 'Insufficient permissions to edit this page', status: 403 };
  }
  
  return null;
}
