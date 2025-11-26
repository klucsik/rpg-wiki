// Utility functions for group-based access control
import { WikiPage } from "./types";

export function isUserAuthenticated(user: { groups: string[] }): boolean {
  // A user is authenticated if they have groups other than just 'public'
  return user.groups.length > 0 && !(user.groups.length === 1 && user.groups[0] === 'public');
}

export function canUserViewPage(user: { groups: string[] }, page: Partial<WikiPage>): boolean {
  const viewGroups = page.view_groups || [];
  const editGroups = page.edit_groups || [];
  // Allow if user is in either view_groups or edit_groups
  return (
    user.groups.some((g) => viewGroups.includes(g)) ||
    user.groups.some((g) => editGroups.includes(g))
  );
}

export function canUserEditPage(user: { groups: string[] }, page: Partial<WikiPage>): boolean {
  const editGroups = page.edit_groups || [];
  return user.groups.some((g) => editGroups.includes(g));
}
