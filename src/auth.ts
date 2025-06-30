import { NextRequest } from 'next/server';

interface AuthResult {
  isAuthenticated: boolean;
  userGroups: string[];
  username: string;
  isApiKey: boolean;
}

export function authenticateRequest(req: NextRequest): AuthResult {
  // Check for API key in Authorization header or X-API-Key header
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');
  
  let apiKey: string | null = null;
  
  if (authHeader?.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else if (apiKeyHeader) {
    apiKey = apiKeyHeader;
  }
  
  // Check against environment variable API key
  const validApiKey = process.env.IMPORT_API_KEY;
  
  if (apiKey && validApiKey && apiKey === validApiKey) {
    // API key authentication - grant admin privileges
    return {
      isAuthenticated: true,
      userGroups: ['admin', 'editor', 'viewer'],
      username: 'API Import User',
      isApiKey: true
    };
  }
  
  // Fall back to existing session-based authentication
  const userGroup = req.headers.get('x-user-group');
  const userGroupsHeader = req.headers.get('x-user-groups');
  const username = req.headers.get('x-user-name') || 'Unknown User';
  
  if (!userGroup || userGroup === 'public') {
    return {
      isAuthenticated: false,
      userGroups: ['public'],
      username: 'Anonymous',
      isApiKey: false
    };
  }
  
  const userGroups = userGroupsHeader?.split(',') || [userGroup];
  
  return {
    isAuthenticated: true,
    userGroups,
    username,
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
