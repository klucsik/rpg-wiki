import { User } from "./userContext";

/**
 * Creates headers with authentication information for API requests
 * NextAuth automatically handles session cookies, so we only need API key support
 */
export function createAuthHeaders(user: User): HeadersInit {
  // For API operations, NextAuth session cookies are automatically included
  // We only need to handle special cases like API keys
  return {
    "Content-Type": "application/json",
  };
}

/**
 * Makes an authenticated fetch request
 * NextAuth automatically includes session cookies
 */
export async function authenticatedFetch(url: string, user: User, options: RequestInit = {}) {
  const headers = {
    ...createAuthHeaders(user),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // Include session cookies
  });
}
