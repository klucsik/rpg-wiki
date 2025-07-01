import { NextRequest } from 'next/server';
import { prisma } from '../../db';

export interface AuthenticatedUser {
  id: number;
  name: string;
  group: string;
  groups: string[];
}

/**
 * Simple authentication middleware that checks for user credentials in headers
 * This is a basic implementation - in production, use proper JWT tokens or sessions
 */
export async function authenticate(req: NextRequest): Promise<AuthenticatedUser | null> {
  // For now, we'll check for a simple auth header
  // In a real app, this would validate a JWT token or session
  const authHeader = req.headers.get('authorization');
  const userIdHeader = req.headers.get('x-user-id');
  
  if (!authHeader || !userIdHeader) {
    return null;
  }

  // This is a basic check - in production, verify JWT or session token
  try {
    const userId = parseInt(userIdHeader);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { groups: true },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      groups: user.groups?.map((g: any) => g.name) || [],
    };
  } catch {
    return null;
  }
}

/**
 * Check if user has edit permissions for a page
 */
export function canUserEditPage(user: AuthenticatedUser, page: { edit_groups: string[] }): boolean {
  return user.groups.some(g => page.edit_groups.includes(g));
}

/**
 * Check if user has view permissions for a page
 */
export function canUserViewPage(user: AuthenticatedUser, page: { view_groups: string[]; edit_groups: string[] }): boolean {
  return (
    user.groups.some(g => page.view_groups.includes(g)) ||
    user.groups.some(g => page.edit_groups.includes(g))
  );
}
