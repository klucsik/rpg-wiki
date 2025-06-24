import { User } from "./userContext";

/**
 * Creates headers with authentication information for API requests
 */
export function createAuthHeaders(user: User): HeadersInit {
  if (user.group === "public") {
    return { "Content-Type": "application/json" };
  }

  return {
    "Content-Type": "application/json",
    "x-user-group": user.group,
    "x-user-groups": (user.groups || [user.group]).join(","),
  };
}

/**
 * Makes an authenticated fetch request
 */
export async function authenticatedFetch(url: string, user: User, options: RequestInit = {}) {
  const headers = {
    ...createAuthHeaders(user),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
