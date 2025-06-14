// Utility functions for group-based access control
import { WikiPage } from "./types";

export function canUserViewPage(user: { group: string; groups?: string[] }, page: Partial<WikiPage>): boolean {
  const userGroups = user.groups || (user.group ? [user.group] : []);
  const viewGroups = page.view_groups || [];
  const editGroups = page.edit_groups || [];
  // Allow if user is in either view_groups or edit_groups
  return (
    userGroups.some((g) => viewGroups.includes(g)) ||
    userGroups.some((g) => editGroups.includes(g))
  );
}

export function canUserEditPage(user: { group: string; groups?: string[] }, page: Partial<WikiPage>): boolean {
  const userGroups = user.groups || (user.group ? [user.group] : []);
  const editGroups = page.edit_groups || [];
  return userGroups.some((g) => editGroups.includes(g));
}
